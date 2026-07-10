import os, subprocess, tempfile, re, signal, threading, logging, traceback
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

# ─────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder='.')

# Lock CORS down to specific origins in production via env var, e.g.
#   ALLOWED_ORIGINS=https://exomnia.onrender.com,https://exomnia-devkit.onrender.com
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')
CORS(app, origins=ALLOWED_ORIGINS.split(',') if ALLOWED_ORIGINS != '*' else '*')

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('devkit')

# Reject oversized requests outright (was: unlimited -> a giant paste could hang/crash a worker)
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2 MB

MAX_CODE_CHARS = 200_000     # guard against pasting huge files that blow up compile time/memory
MAX_OUTPUT_CHARS = 20_000    # guard against runaway prints freezing the frontend terminal
RUN_TIMEOUT = 15
COMPILE_TIMEOUT = 25

# Only N heavy executions run at once. Without this, five people compiling Kotlin/Scala/Haskell
# at the same time can starve the box and every request starts timing out / "glitching".
MAX_CONCURRENT_RUNS = int(os.environ.get('MAX_CONCURRENT_RUNS', 3))
_run_semaphore = threading.Semaphore(MAX_CONCURRENT_RUNS)

COMPILED_LANGS = {'c', 'cpp', 'java', 'rs', 'cs', 'kt', 'swift', 'scala', 'hs'}

LANG_CONFIG = {
    'py':     {'cmd': ['python3', '{file}'],           'ext': '.py'},
    'py2':    {'cmd': ['python2', '{file}'],           'ext': '.py'},
    'js':     {'cmd': ['node', '{file}'],              'ext': '.js'},
    'mjs':    {'cmd': ['node', '{file}'],              'ext': '.mjs'},
    'cjs':    {'cmd': ['node', '{file}'],              'ext': '.cjs'},
    'jsx':    {'cmd': ['node', '{file}'],              'ext': '.jsx'},
    'ts':     {'cmd': ['npx', '--yes', 'ts-node', '{file}'], 'ext': '.ts'},
    'tsx':    {'cmd': ['npx', '--yes', 'ts-node', '{file}'], 'ext': '.tsx'},
    'sh':     {'cmd': ['bash', '{file}'],              'ext': '.sh'},
    'bash':   {'cmd': ['bash', '{file}'],              'ext': '.sh'},
    'zsh':    {'cmd': ['zsh', '{file}'],               'ext': '.zsh'},
    'ps1':    {'cmd': ['pwsh', '-File', '{file}'],     'ext': '.ps1'},
    'rb':     {'cmd': ['ruby', '{file}'],              'ext': '.rb'},
    'php':    {'cmd': ['php', '{file}'],               'ext': '.php'},
    'go':     {'cmd': ['go', 'run', '{file}'],         'ext': '.go'},
    'lua':    {'cmd': ['lua', '{file}'],                'ext': '.lua'},
    'pl':     {'cmd': ['perl', '{file}'],               'ext': '.pl'},
    'r':      {'cmd': ['Rscript', '{file}'],            'ext': '.r'},
    'jl':     {'cmd': ['julia', '{file}'],              'ext': '.jl'},
    'dart':   {'cmd': ['dart', 'run', '{file}'],        'ext': '.dart'},
    'ex':     {'cmd': ['elixir', '{file}'],             'ext': '.exs'},
    'exs':    {'cmd': ['elixir', '{file}'],             'ext': '.exs'},
    'groovy': {'cmd': ['groovy', '{file}'],             'ext': '.groovy'},
    'coffee': {'cmd': ['npx', '--yes', 'coffeescript', '{file}'], 'ext': '.coffee'},
    'fsx':    {'cmd': ['dotnet', 'fsi', '{file}'],      'ext': '.fsx'},
    'sql':    {'cmd': ['sqlite3', ':memory:', '-init', '{file}', '.quit'], 'ext': '.sql'},
    'nim':    {'cmd': ['nim', 'r', '--verbosity:0', '{file}'], 'ext': '.nim'},
    'v':      {'cmd': ['v', 'run', '{file}'],           'ext': '.v'},
    'zig':    {'cmd': ['zig', 'run', '{file}'],         'ext': '.zig'},
    'html':   {'cmd': None, 'ext': '.html'},
    'css':    {'cmd': None, 'ext': '.css'},
    'scss':   {'cmd': None, 'ext': '.scss'},
    'java':   {'cmd': None, 'ext': '.java'},
    'c':      {'cmd': None, 'ext': '.c'},
    'cpp':    {'cmd': None, 'ext': '.cpp'},
    'rs':     {'cmd': None, 'ext': '.rs'},
    'cs':     {'cmd': None, 'ext': '.cs'},
    'kt':     {'cmd': None, 'ext': '.kt'},
    'swift':  {'cmd': None, 'ext': '.swift'},
    'scala':  {'cmd': None, 'ext': '.scala'},
    'hs':     {'cmd': None, 'ext': '.hs'},
}


# ─────────────────────────────────────────────────────────────
# Core process runner — this is the main reliability fix.
# Old code used subprocess.run(..., timeout=N). That only kills the
# direct child. Anything that spawns children (node, npx, java, go run)
# left orphaned grandchild processes running forever on timeout, which
# is exactly the kind of thing that slowly chokes a Render instance
# and causes random unrelated requests to start failing ("glitches").
# ─────────────────────────────────────────────────────────────
def _limit_resources():
    """Runs in the child process before exec. Caps CPU, memory, processes
    and file size so one submission can't fork-bomb or OOM the box."""
    import resource
    os.setsid()  # new process group so we can kill the whole tree on timeout
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (20, 20))               # 20s CPU time
        resource.setrlimit(resource.RLIMIT_AS, (768 * 1024 * 1024,) * 2)  # 768MB address space
        resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))              # no fork bombs
        resource.setrlimit(resource.RLIMIT_FSIZE, (10 * 1024 * 1024,) * 2)  # 10MB max file writes
    except Exception:
        pass  # best-effort; some sandboxes (e.g. certain containers) disallow setrlimit


def run_with_timeout(cmd, cwd, timeout, shell=False):
    """Runs cmd, kills the *entire process group* on timeout, and always
    returns (output, is_error, timed_out) instead of raising."""
    try:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            shell=shell,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=_limit_resources,
            env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'CI': 'true'},
        )
    except FileNotFoundError as e:
        return f'Runtime not found: {e}', True, False
    except Exception as e:
        log.exception('failed to start process')
        return f'Failed to start process: {e}', True, False

    try:
        out, err = proc.communicate(timeout=timeout)
        combined = out + (('\n' if out else '') + err if err else '')
        return combined, proc.returncode != 0, False
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            proc.communicate(timeout=2)
        except Exception:
            pass
        return f'Execution timed out ({timeout}s limit)', True, True
    except Exception as e:
        log.exception('error while waiting on process')
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            pass
        return f'Runtime error: {e}', True, False


def _truncate(output):
    if len(output) > MAX_OUTPUT_CHARS:
        return output[:MAX_OUTPUT_CHARS] + '\n\n[...output truncated...]'
    return output


def run_compiled(lang, code, tmpdir):
    def compile_and_run(compile_cmd, run_cmd, compile_timeout=COMPILE_TIMEOUT, run_timeout=RUN_TIMEOUT):
        out, is_err, _ = run_with_timeout(compile_cmd, tmpdir, compile_timeout)
        if is_err:
            return out, True
        return run_with_timeout(run_cmd, tmpdir, run_timeout)[:2]

    if lang == 'c':
        src, out = os.path.join(tmpdir, 'main.c'), os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['gcc', src, '-o', out], [out])

    elif lang == 'cpp':
        src, out = os.path.join(tmpdir, 'main.cpp'), os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['g++', src, '-o', out], [out])

    elif lang == 'java':
        match = re.search(r'\bclass\s+(\w+)', code)
        classname = match.group(1) if match else 'Main'
        src = os.path.join(tmpdir, classname + '.java')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['javac', src], ['java', '-cp', tmpdir, classname])

    elif lang == 'rs':
        src, out = os.path.join(tmpdir, 'main.rs'), os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['rustc', src, '-o', out], [out], compile_timeout=30)

    elif lang == 'cs':
        src, out = os.path.join(tmpdir, 'main.cs'), os.path.join(tmpdir, 'main.exe')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['mcs', '-out:' + out, src], ['mono', out])

    elif lang == 'kt':
        src, jar = os.path.join(tmpdir, 'main.kt'), os.path.join(tmpdir, 'main.jar')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['kotlinc', src, '-include-runtime', '-d', jar],
                                ['java', '-jar', jar], compile_timeout=60)

    elif lang == 'swift':
        src, out = os.path.join(tmpdir, 'main.swift'), os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['swiftc', src, '-o', out], [out], compile_timeout=30)

    elif lang == 'scala':
        src = os.path.join(tmpdir, 'main.scala')
        with open(src, 'w') as f: f.write(code)
        out, is_err, _ = run_with_timeout(['scalac', src, '-d', tmpdir], tmpdir, 45)
        if is_err:
            return out, True
        match = re.search(r'object\s+(\w+)', code)
        objname = match.group(1) if match else 'Main'
        return run_with_timeout(['scala', '-cp', tmpdir, objname], tmpdir, RUN_TIMEOUT)[:2]

    elif lang == 'hs':
        src, out = os.path.join(tmpdir, 'main.hs'), os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        return compile_and_run(['ghc', '-o', out, src], [out], compile_timeout=30)

    return f'Unsupported language "{lang}"', True


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@app.route('/run', methods=['POST'])
def run_code():
    data = request.get_json(silent=True) or {}
    code = data.get('code', '')
    lang = str(data.get('lang', 'py')).lower()

    if not code.strip():
        return jsonify({'output': '', 'error': False})

    if len(code) > MAX_CODE_CHARS:
        return jsonify({'output': f'File too large to run (max {MAX_CODE_CHARS:,} characters).', 'error': True})

    if lang in ('html', 'css', 'scss'):
        return jsonify({'output': '[PREVIEW] Rendered in Preview tab.', 'error': False, 'preview': True})

    cfg = LANG_CONFIG.get(lang)
    if not cfg:
        return jsonify({'output': f'Language "{lang}" not supported yet.', 'error': True})

    acquired = _run_semaphore.acquire(timeout=20)
    if not acquired:
        return jsonify({'output': 'Server is busy running other code right now — try again in a few seconds.', 'error': True})

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if lang in COMPILED_LANGS:
                output, is_error = run_compiled(lang, code, tmpdir)
                return jsonify({'output': _truncate(output) or '(no output)', 'error': is_error})

            if not cfg.get('cmd'):
                return jsonify({'output': f'Language "{lang}" not supported yet. Ask your admin to install the matching runtime/compiler on the server.', 'error': True})

            ext = cfg['ext']
            src = os.path.join(tmpdir, 'main' + ext)
            with open(src, 'w') as f:
                f.write(code)

            cmd = [c.replace('{file}', src) for c in cfg['cmd']]
            output, is_error, _ = run_with_timeout(cmd, tmpdir, RUN_TIMEOUT)
            return jsonify({'output': _truncate(output) or '(no output)', 'error': is_error})

    except Exception:
        log.exception('unexpected error in /run')
        return jsonify({'output': 'Internal error while running your code. This has been logged.', 'error': True})
    finally:
        _run_semaphore.release()


def _safe_join(tmpdir, fname):
    """Prevents path traversal (e.g. '../../etc/passwd') when writing
    editor files into the sandbox temp dir before a terminal command runs."""
    fname = fname.replace('\\', '/')
    # strip any leading slashes / drive letters, collapse '..'
    candidate = os.path.normpath(os.path.join(tmpdir, fname.lstrip('/')))
    if not candidate.startswith(os.path.abspath(tmpdir) + os.sep):
        return None
    return candidate


@app.route('/terminal', methods=['POST'])
def terminal_cmd():
    data = request.get_json(silent=True) or {}
    cmd = str(data.get('cmd', '')).strip()
    files_payload = data.get('files', {}) or {}

    if not cmd:
        return jsonify({'output': '', 'error': False})

    BLOCKED = ['rm -rf /', 'mkfs', 'dd if=', ':(){:|:&};:', '> /dev/sda', 'chmod -R 777 /', 'sudo ']
    if any(b in cmd for b in BLOCKED):
        return jsonify({'output': 'Permission denied: dangerous command blocked', 'error': True})

    acquired = _run_semaphore.acquire(timeout=20)
    if not acquired:
        return jsonify({'output': 'Server is busy — try again in a few seconds.', 'error': True})

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            for fname, fcontent in files_payload.items():
                fpath = _safe_join(tmpdir, fname)
                if fpath is None:
                    return jsonify({'output': f'Invalid file path: {fname}', 'error': True})
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                with open(fpath, 'w') as f:
                    f.write(fcontent if isinstance(fcontent, str) else str(fcontent))

            output, is_error, _ = run_with_timeout(cmd, tmpdir, RUN_TIMEOUT, shell=True)
            return jsonify({'output': _truncate(output) or '(no output)', 'error': is_error})

    except Exception:
        log.exception('unexpected error in /terminal')
        return jsonify({'output': 'Internal error while running that command. This has been logged.', 'error': True})
    finally:
        _run_semaphore.release()


@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # threaded=True so one person's slow compile doesn't block everyone else's requests
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
