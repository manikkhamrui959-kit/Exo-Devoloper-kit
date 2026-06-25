import os, subprocess, tempfile, json, traceback
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

app = Flask(__name__, static_folder='.')
CORS(app)

LANG_CONFIG = {
    'py':   {'cmd': ['python3', '{file}'], 'ext': '.py'},
    'js':   {'cmd': ['node', '{file}'],    'ext': '.js'},
    'ts':   {'cmd': ['npx', 'ts-node', '{file}'], 'ext': '.ts'},
    'sh':   {'cmd': ['bash', '{file}'],   'ext': '.sh'},
    'rb':   {'cmd': ['ruby', '{file}'],   'ext': '.rb'},
    'php':  {'cmd': ['php', '{file}'],    'ext': '.php'},
    'go':   {'cmd': ['go', 'run', '{file}'], 'ext': '.go'},
    'java': {'cmd': None, 'ext': '.java'},  # special handling
    'c':    {'cmd': None, 'ext': '.c'},     # special handling
    'cpp':  {'cmd': None, 'ext': '.cpp'},   # special handling
    'rs':   {'cmd': None, 'ext': '.rs'},    # special handling
    'html': {'cmd': None, 'ext': '.html'},  # preview only
    'css':  {'cmd': None, 'ext': '.css'},   # preview only
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

    return 'Unsupported language', True


@app.route('/run', methods=['POST'])
def run_code():
    data = request.get_json()
    code = data.get('code', '')
    lang = data.get('lang', 'py').lower()
    filename = data.get('filename', 'main')

    if not code.strip():
        return jsonify({'output': '', 'error': False})

    # HTML/CSS — return as preview signal
    if lang in ('html', 'css'):
        return jsonify({'output': '[PREVIEW] HTML/CSS rendered in Preview tab.', 'error': False, 'preview': True})

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if lang in ('c', 'cpp', 'java', 'rs'):
                output, is_error = run_compiled(lang, code, tmpdir)
                return jsonify({'output': output or '(no output)', 'error': is_error})

            cfg = LANG_CONFIG.get(lang)
            if not cfg:
                return jsonify({'output': f'Language "{lang}" not supported.', 'error': True})

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
