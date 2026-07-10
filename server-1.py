
import os, subprocess, tempfile, json, traceback
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder='.')
CORS(app)

COMPILED_LANGS = {'c', 'cpp', 'java', 'rs', 'cs', 'kt', 'swift', 'scala', 'hs'}

LANG_CONFIG = {
    # ── Interpreted / directly runnable ──
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
    # ── Preview-only (rendered, not executed) ──
    'html':   {'cmd': None, 'ext': '.html'},
    'css':    {'cmd': None, 'ext': '.css'},
    'scss':   {'cmd': None, 'ext': '.scss'},
    # ── Compiled (see run_compiled) ──
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

def run_compiled(lang, code, tmpdir):
    if lang == 'c':
        src = os.path.join(tmpdir, 'main.c')
        out = os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['gcc', src, '-o', out], capture_output=True, text=True, timeout=15)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run([out], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'cpp':
        src = os.path.join(tmpdir, 'main.cpp')
        out = os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['g++', src, '-o', out], capture_output=True, text=True, timeout=15)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run([out], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'java':
        # Extract class name
        import re
        match = re.search(r'public\s+class\s+(\w+)', code)
        classname = match.group(1) if match else 'Main'
        src = os.path.join(tmpdir, classname + '.java')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['javac', src], capture_output=True, text=True, timeout=15, cwd=tmpdir)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run(['java', '-cp', tmpdir, classname], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'rs':
        src = os.path.join(tmpdir, 'main.rs')
        out = os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['rustc', src, '-o', out], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run([out], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'cs':
        # C# — compile with mcs (Mono) and run with mono
        src = os.path.join(tmpdir, 'main.cs')
        out = os.path.join(tmpdir, 'main.exe')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['mcs', '-out:' + out, src], capture_output=True, text=True, timeout=20)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run(['mono', out], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'kt':
        src = os.path.join(tmpdir, 'main.kt')
        jar = os.path.join(tmpdir, 'main.jar')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['kotlinc', src, '-include-runtime', '-d', jar], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run(['java', '-jar', jar], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'swift':
        src = os.path.join(tmpdir, 'main.swift')
        out = os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['swiftc', src, '-o', out], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run([out], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'scala':
        src = os.path.join(tmpdir, 'main.scala')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['scalac', src, '-d', tmpdir], capture_output=True, text=True, timeout=45, cwd=tmpdir)
        if r.returncode != 0:
            return r.stderr, True
        import re
        match = re.search(r'object\s+(\w+)', code)
        objname = match.group(1) if match else 'Main'
        r2 = subprocess.run(['scala', '-cp', tmpdir, objname], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    elif lang == 'hs':
        src = os.path.join(tmpdir, 'main.hs')
        out = os.path.join(tmpdir, 'main')
        with open(src, 'w') as f: f.write(code)
        r = subprocess.run(['ghc', '-o', out, src], capture_output=True, text=True, timeout=30, cwd=tmpdir)
        if r.returncode != 0:
            return r.stderr, True
        r2 = subprocess.run([out], capture_output=True, text=True, timeout=10)
        return (r2.stdout + r2.stderr), r2.returncode != 0

    return f'Unsupported language "{lang}"', True


@app.route('/run', methods=['POST'])
def run_code():
    data = request.get_json()
    code = data.get('code', '')
    lang = data.get('lang', 'py').lower()
    filename = data.get('filename', 'main')

    if not code.strip():
        return jsonify({'output': '', 'error': False})

    # HTML/CSS/SCSS — return as preview signal
    if lang in ('html', 'css', 'scss'):
        return jsonify({'output': '[PREVIEW] Rendered in Preview tab.', 'error': False, 'preview': True})

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if lang in COMPILED_LANGS:
                output, is_error = run_compiled(lang, code, tmpdir)
                return jsonify({'output': output or '(no output)', 'error': is_error})

            cfg = LANG_CONFIG.get(lang)
            if not cfg or not cfg.get('cmd'):
                return jsonify({'output': f'Language "{lang}" not supported yet. Ask your admin to install the matching runtime/compiler on the server.', 'error': True})

            ext = cfg['ext']
            src = os.path.join(tmpdir, 'main' + ext)
            with open(src, 'w') as f:
                f.write(code)

            cmd = [c.replace('{file}', src) for c in cfg['cmd']]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=15,
                cwd=tmpdir,
                env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
            )
            output = result.stdout
            if result.stderr:
                output += ('\n' if output else '') + result.stderr
            return jsonify({'output': output or '(no output)', 'error': result.returncode != 0})

    except subprocess.TimeoutExpired:
        return jsonify({'output': 'Error: Execution timed out (15s limit)', 'error': True})
    except FileNotFoundError as e:
        return jsonify({'output': f'Runtime not found: {e}', 'error': True})
    except Exception as e:
        return jsonify({'output': traceback.format_exc(), 'error': True})


@app.route('/terminal', methods=['POST'])
def terminal_cmd():
    data = request.get_json()
    cmd = data.get('cmd', '').strip()

    BLOCKED = ['rm -rf /', 'mkfs', 'dd if=', ':(){:|:&};:']
    if any(b in cmd for b in BLOCKED):
        return jsonify({'output': 'Permission denied: dangerous command blocked', 'error': True})

    # Special: python <file.py> with code payload
    files_payload = data.get('files', {})

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write all editor files into tmpdir
            for fname, fcontent in files_payload.items():
                fpath = os.path.join(tmpdir, fname)
                with open(fpath, 'w') as f:
                    f.write(fcontent)

            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=15,
                cwd=tmpdir,
                env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'}
            )
            output = result.stdout
            if result.stderr:
                output += ('\n' if output else '') + result.stderr
            return jsonify({'output': output or '(no output)', 'error': result.returncode != 0})

    except subprocess.TimeoutExpired:
        return jsonify({'output': 'Timed out (15s limit)', 'error': True})
    except Exception as e:
        return jsonify({'output': str(e), 'error': True})


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
