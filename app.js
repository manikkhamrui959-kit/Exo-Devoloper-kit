// ═══════════════════════════════════════════════
// FILE DATA
// ═══════════════════════════════════════════════
const files = {
  'app.py': `from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_PATH = 'data.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS scores
                 (id INTEGER PRIMARY KEY,
                  player TEXT NOT NULL,
                  score INTEGER NOT NULL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

@app.route('/api/ping')
def ping():
    return jsonify({'status': 'ok', 'msg': 'Exomnia API running'})

@app.route('/api/leaderboard')
def leaderboard():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT player, score FROM scores ORDER BY score DESC LIMIT 10')
    rows = c.fetchall()
    conn.close()
    return jsonify([{'player': r[0], 'score': r[1]} for r in rows])

@app.route('/api/player', methods=['POST'])
def save_score():
    data = request.json
    player = data.get('player', 'Anonymous')
    score = data.get('score', 0)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO scores (player, score) VALUES (?, ?)', (player, score))
    conn.commit()
    conn.close()
    return jsonify({'status': 'saved', 'player': player, 'score': score})

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)`,

  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>🚀 Hello from Exomnia!</h1>
    <p>Edit this file and see live preview.</p>
    <button onclick="fetchData()">Load Data</button>
    <div id="output"></div>
  </div>
  <script src="main.js"><\/script>
</body>
</html>`,

  'main.js': `// Exomnia DevKit — main.js
const API_BASE = 'http://localhost:5000';

async function fetchData() {
  try {
    const res = await fetch(\`\${API_BASE}/api/leaderboard\`);
    const data = await res.json();
    renderLeaderboard(data);
  } catch (err) {
    console.error('API Error:', err);
  }
}

function renderLeaderboard(scores) {
  const output = document.getElementById('output');
  output.innerHTML = scores.map((s, i) =>
    \`<div class="score-item">
      <span class="rank">#\${i + 1}</span>
      <span class="player">\${s.player}</span>
      <span class="score">\${s.score.toLocaleString()}</span>
    </div>\`
  ).join('');
}

// Auto-refresh every 30 seconds
setInterval(fetchData, 30000);
fetchData();`,

  'style.css': `/* Exomnia App Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'JetBrains Mono', monospace;
  background: #080c10;
  color: #e6edf3;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  max-width: 600px;
  width: 90%;
  padding: 40px;
  background: #0d1117;
  border-radius: 16px;
  border: 1px solid #21262d;
}

h1 { font-size: 28px; color: #00d4aa; margin-bottom: 12px; }

button {
  padding: 10px 20px;
  background: #00d4aa;
  color: #080c10;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  margin-top: 16px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #21262d;
  font-size: 14px;
}

.rank { color: #f59e0b; font-weight: 700; }
.player { flex: 1; }
.score { color: #00d4aa; font-weight: 700; }`,

  'README.md': `# Exomnia DevKit Project

## Setup
\`\`\`bash
pip install -r requirements.txt
python app.py
\`\`\`

## API Endpoints
- GET  /api/ping
- GET  /api/leaderboard
- POST /api/player

## Deploy
See the Deploy panel in DevKit.

## Keyboard Shortcuts
- Ctrl+P — Command Palette
- Ctrl+F — Find & Replace
- Ctrl+B — Toggle Sidebar
- Ctrl+I — AI Assistant
- Ctrl+Enter — Run Code
- Ctrl+S — Save
- Ctrl+/ — Comment Line
- Ctrl+\` — Focus Terminal`,

  'requirements.txt': `flask==3.0.0
flask-cors==4.0.0
gunicorn==21.2.0`,

  '.env': `FLASK_ENV=development
PORT=5000
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///data.db`
};

// File templates for new file creation
const fileTemplates = {
  'app.py': `from flask import Flask, jsonify, request\nfrom flask_cors import CORS\n\napp = Flask(__name__)\nCORS(app)\n\n@app.route('/')\ndef index():\n    return jsonify({'status': 'ok'})\n\nif __name__ == '__main__':\n    app.run(debug=True)`,
  'index.html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My App</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>`,
  'main.js': `// Main JavaScript\n\ndocument.addEventListener('DOMContentLoaded', () => {\n  console.log('App ready');\n});\n`,
  'style.css': `/* Styles */\n* { margin: 0; padding: 0; box-sizing: border-box; }\n\nbody {\n  font-family: sans-serif;\n}\n`,
  'README.md': `# Project Name\n\n## Setup\n\n\`\`\`bash\n# Install dependencies\nnpm install\n\`\`\`\n\n## Usage\n\nDescribe how to use your project here.\n`
};

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let activeFile = 'app.py';
let openTabs = ['app.py', 'index.html'];
let sidebarOpen = true;
let panelOpen = true;
let activePanel = 'terminal';
let termHistory = [];
let termHistIdx = -1;
let aiOpen = false;
let aiHistory = [];  // multi-turn conversation history
let userApiKey = '';       // Anthropic Claude API key
let userDeepseekKey = '';  // DeepSeek API key
let selectedProvider = 'claude';   // 'claude' | 'deepseek'
let keyModalProvider = 'claude';   // which provider is active in key modal
let cursorLine = 1;
let wordWrap = false;
let editorFontSize = 13;
let findMatches = [];
let findCurrentIdx = -1;
let ctxTarget = null;
let cmdSelIdx = 0;
let cmdItems = [];

// ═══════════════════════════════════════════════
// SYNTAX HIGHLIGHTING
// ═══════════════════════════════════════════════
function highlight(code, filename) {
  const ext = (filename || '').split('.').pop();
  let escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (ext === 'py') return highlightPython(escaped);
  if (ext === 'js') return highlightJS(escaped);
  if (ext === 'html') return highlightHTML(escaped);
  if (ext === 'css') return highlightCSS(escaped);
  return escaped;
}

function highlightPython(code) {
  const kws = ['from','import','def','class','return','if','elif','else','for','while','in','not','and','or','is','try','except','with','as','pass','None','True','False','lambda','yield','async','await','raise','finally','global','nonlocal','del','assert','break','continue'];
  let r = code;
  r = r.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g,'<span class="str">$1</span>');
  r = r.replace(/(#[^\n]*)/g,'<span class="cm">$1</span>');
  r = r.replace(/\b(\d+\.?\d*)\b/g,'<span class="num">$1</span>');
  r = r.replace(/(@\w+)/g,'<span class="dec">$1</span>');
  kws.forEach(kw => { r = r.replace(new RegExp(`\\b(${kw})\\b`,'g'),'<span class="kw">$1</span>'); });
  r = r.replace(/\b(\w+)(?=\s*\()/g, (m, fn) => m.includes('<span') ? m : `<span class="fn">${fn}</span>`);
  return r;
}

function highlightJS(code) {
  const kws = ['const','let','var','function','return','if','else','for','while','class','new','this','async','await','try','catch','import','export','default','from','of','in','typeof','instanceof','true','false','null','undefined','switch','case','break','continue','throw'];
  let r = code;
  r = r.replace(/(`[^`]*`|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g,'<span class="str">$1</span>');
  r = r.replace(/(\/\/[^\n]*)/g,'<span class="cm">$1</span>');
  r = r.replace(/\b(\d+\.?\d*)\b/g,'<span class="num">$1</span>');
  kws.forEach(kw => { r = r.replace(new RegExp(`\\b(${kw})\\b`,'g'),'<span class="kw">$1</span>'); });
  r = r.replace(/\b(\w+)(?=\s*\()/g, m => `<span class="fn">${m}</span>`);
  return r;
}

function highlightHTML(code) {
  let r = code;
  r = r.replace(/(&lt;!--[\s\S]*?--&gt;)/g,'<span class="cm">$1</span>');
  r = r.replace(/(&lt;\/?)([\w-]+)/g,'$1<span class="kw">$2</span>');
  r = r.replace(/([\w-]+)(=)(".*?")/g,'<span class="prop">$1</span>$2<span class="str">$3</span>');
  return r;
}

function highlightCSS(code) {
  let r = code;
  r = r.replace(/(\/\*[\s\S]*?\*\/)/g,'<span class="cm">$1</span>');
  r = r.replace(/([.#]?[\w-]+)(?=\s*\{)/g,'<span class="cls">$1</span>');
  r = r.replace(/([\w-]+)(?=\s*:)/g,'<span class="prop">$1</span>');
  r = r.replace(/:\s*([^;{]+)/g,(m,v)=>`: <span class="str">${v}</span>`);
  return r;
}

// ═══════════════════════════════════════════════
// EDITOR
// ═══════════════════════════════════════════════
function loadFile(filename) {
  const content = files[filename] || '';
  const codeEl = document.getElementById('code-content');
  codeEl.innerHTML = highlight(content, filename);
  updateLineNumbers(content);
  updateBreadcrumb(filename);
  updateStatusLang(filename);
}

function updateLineNumbers(content) {
  const lines = content.split('\n').length;
  const lnEl = document.getElementById('line-numbers');
  lnEl.innerHTML = Array.from({length: lines}, (_,i) =>
    `<div class="line-num${i+1 === cursorLine ? ' active' : ''}">${i+1}</div>`
  ).join('');
}

function updateBreadcrumb(filename) {
  document.getElementById('bc-file').textContent = filename;
}

function updateStatusLang(filename) {
  const ext = filename.split('.').pop();
  const langs = {py:'🐍 Python 3.11', js:'📜 JavaScript', html:'🌐 HTML', css:'🎨 CSS', md:'📄 Markdown', txt:'📄 Text', env:'🔒 ENV'};
  const el = document.getElementById('status-lang');
  if (el) el.textContent = langs[ext] || `📄 ${ext.toUpperCase()}`;
}

function handleInput() {
  const codeEl = document.getElementById('code-content');
  const text = codeEl.innerText;
  files[activeFile] = text;
  const tab = document.getElementById(`tab-${activeFile}`);
  if (tab && !tab.classList.contains('modified')) tab.classList.add('modified');
  updateLineNumbers(text);
  document.getElementById('save-status').textContent = '● Unsaved';
  clearTimeout(window._saveTimer);
  window._saveTimer = setTimeout(() => {
    document.getElementById('save-status').textContent = '● Saved';
  }, 1500);
}

function handleKeyDown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertText', false, '    ');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('save-status').textContent = '● Saved';
    notify('Saved', 'success');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    commentLine();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
  if (e.key === 'Escape') closeFindBar();
  updateCursorPos();
}

function updateCursorPos() {
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(document.getElementById('code-content'));
    pre.setEnd(range.endContainer, range.endOffset);
    const text = pre.toString();
    const lines = text.split('\n');
    cursorLine = lines.length;
    const col = lines[lines.length-1].length + 1;
    document.getElementById('cursor-pos').textContent = `Ln ${cursorLine}, Col ${col}`;
    updateLineNumbers(files[activeFile] || '');
  }, 0);
}

function commentLine() {
  const ext = activeFile.split('.').pop();
  const prefix = (ext === 'py' || ext === 'sh') ? '# ' : '// ';
  document.execCommand('insertText', false, prefix);
}

function syncScroll(el) {
  document.getElementById('line-numbers').scrollTop = el.scrollTop;
}

function copyAllCode() {
  const text = files[activeFile] || '';
  navigator.clipboard.writeText(text).then(() => notify('Copied to clipboard', 'success'));
}

function toggleWordWrap() {
  wordWrap = !wordWrap;
  const el = document.getElementById('code-content');
  const btn = document.getElementById('wrap-btn');
  el.classList.toggle('wrap', wordWrap);
  btn.classList.toggle('active', wordWrap);
  notify('Word wrap ' + (wordWrap ? 'on' : 'off'));
}

function changeFontSize(delta) {
  editorFontSize = Math.min(20, Math.max(10, editorFontSize + delta));
  document.documentElement.style.setProperty('--editor-font', editorFontSize + 'px');
  notify(`Font size: ${editorFontSize}px`);
}

// ═══════════════════════════════════════════════
// FIND & REPLACE (NEW)
// ═══════════════════════════════════════════════
function openFindBar() {
  document.getElementById('find-bar').style.display = 'flex';
  setTimeout(() => document.getElementById('find-input').focus(), 50);
  if (document.getElementById('find-input').value) doFind(document.getElementById('find-input').value);
}

function closeFindBar() {
  document.getElementById('find-bar').style.display = 'none';
  // Remove highlights
  const codeEl = document.getElementById('code-content');
  codeEl.querySelectorAll('mark.fh').forEach(m => {
    const txt = document.createTextNode(m.textContent);
    m.replaceWith(txt);
  });
  findMatches = [];
  findCurrentIdx = -1;
  document.getElementById('find-count').textContent = '';
}

function doFind(query) {
  const codeEl = document.getElementById('code-content');
  // Restore plain text first
  if (findMatches.length || codeEl.querySelectorAll('mark.fh').length) {
    const rawText = codeEl.innerText;
    files[activeFile] = rawText;
    codeEl.innerHTML = highlight(rawText, activeFile);
  }
  findMatches = [];
  findCurrentIdx = -1;
  if (!query) { document.getElementById('find-count').textContent = ''; return; }

  // Use TreeWalker to find text nodes and wrap matches
  const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  const q = query.toLowerCase();
  nodes.forEach(n => {
    const text = n.textContent;
    const lower = text.toLowerCase();
    let idx = 0;
    const parts = [];
    while ((idx = lower.indexOf(q, idx)) !== -1) {
      parts.push([idx, idx + q.length]);
      idx += q.length;
    }
    if (!parts.length) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    parts.forEach(([s, e]) => {
      if (s > last) frag.appendChild(document.createTextNode(text.slice(last, s)));
      const mark = document.createElement('mark');
      mark.className = 'fh';
      mark.textContent = text.slice(s, e);
      frag.appendChild(mark);
      findMatches.push(mark);
      last = e;
    });
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    n.replaceWith(frag);
  });

  if (findMatches.length) {
    findCurrentIdx = 0;
    findMatches[0].classList.add('cur');
    findMatches[0].scrollIntoView({block:'nearest'});
  }
  document.getElementById('find-count').textContent = findMatches.length ? `${findMatches.length > 0 ? findCurrentIdx+1 : 0}/${findMatches.length}` : 'No results';
}

function findNext() {
  if (!findMatches.length) return;
  findMatches[findCurrentIdx]?.classList.remove('cur');
  findCurrentIdx = (findCurrentIdx + 1) % findMatches.length;
  findMatches[findCurrentIdx].classList.add('cur');
  findMatches[findCurrentIdx].scrollIntoView({block:'nearest'});
  document.getElementById('find-count').textContent = `${findCurrentIdx+1}/${findMatches.length}`;
}

function findPrev() {
  if (!findMatches.length) return;
  findMatches[findCurrentIdx]?.classList.remove('cur');
  findCurrentIdx = (findCurrentIdx - 1 + findMatches.length) % findMatches.length;
  findMatches[findCurrentIdx].classList.add('cur');
  findMatches[findCurrentIdx].scrollIntoView({block:'nearest'});
  document.getElementById('find-count').textContent = `${findCurrentIdx+1}/${findMatches.length}`;
}

function doReplaceNext() {
  const repl = document.getElementById('replace-input').value;
  if (!findMatches.length || findCurrentIdx < 0) return;
  const mark = findMatches[findCurrentIdx];
  mark.replaceWith(document.createTextNode(repl));
  findMatches.splice(findCurrentIdx, 1);
  if (findCurrentIdx >= findMatches.length) findCurrentIdx = 0;
  files[activeFile] = document.getElementById('code-content').innerText;
  if (findMatches.length) { findMatches[findCurrentIdx]?.classList.add('cur'); }
  document.getElementById('find-count').textContent = findMatches.length ? `${findCurrentIdx+1}/${findMatches.length}` : 'Done';
  notify('Replaced 1 occurrence');
}

function doReplaceAll() {
  const repl = document.getElementById('replace-input').value;
  const count = findMatches.length;
  findMatches.forEach(m => m.replaceWith(document.createTextNode(repl)));
  findMatches = [];
  findCurrentIdx = -1;
  files[activeFile] = document.getElementById('code-content').innerText;
  document.getElementById('find-count').textContent = 'Done';
  notify(`Replaced ${count} occurrences`, 'success');
}

function handleFindKey(e) {
  if (e.key === 'Enter') { e.shiftKey ? findPrev() : findNext(); }
  if (e.key === 'Escape') closeFindBar();
}

// ═══════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════
function switchTab(filename) {
  activeFile = filename;
  closeFindBar();
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(`tab-${filename}`);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('.tree-item').forEach(t => t.classList.remove('active'));
  const treeItem = document.querySelector(`[data-file="${filename}"]`);
  if (treeItem) treeItem.classList.add('active');
  loadFile(filename);
}

function openFile(filename) {
  if (!openTabs.includes(filename)) {
    openTabs.push(filename);
    const ext = filename.split('.').pop();
    const icons = {py:'🐍',js:'📜',html:'🌐',css:'🎨',md:'📄',txt:'📋',env:'🔒'};
    const icon = icons[ext] || '📄';
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = `tab-${filename}`;
    tab.onclick = () => switchTab(filename);
    tab.innerHTML = `<span class="tab-icon">${icon}</span>${filename}<span class="tab-close" onclick="closeTab(event,'${filename}')">×</span>`;
    document.getElementById('tabs-bar').appendChild(tab);
  }
  switchTab(filename);
}

function closeTab(e, filename) {
  e.stopPropagation();
  const idx = openTabs.indexOf(filename);
  openTabs.splice(idx, 1);
  const tab = document.getElementById(`tab-${filename}`);
  if (tab) tab.remove();
  if (activeFile === filename) {
    if (openTabs.length > 0) switchTab(openTabs[Math.max(0, idx-1)]);
    else { document.getElementById('code-content').innerHTML = ''; document.getElementById('bc-file').textContent = ''; }
  }
}

function deleteFile(e, filename) {
  e.stopPropagation();
  if (!confirm(`Delete ${filename}?`)) return;
  delete files[filename];
  const treeItem = document.querySelector(`[data-file="${filename}"]`);
  if (treeItem) treeItem.remove();
  closeTab({stopPropagation:()=>{}}, filename);
  notify(`Deleted ${filename}`, 'error');
}

function jumpToLine(file, line) {
  openFile(file);
  notify(`Jumped to line ${line}`, 'info');
}

// ═══════════════════════════════════════════════
// FILE RENAME (NEW)
// ═══════════════════════════════════════════════
function startRename(e, filename) {
  e.stopPropagation();
  const item = document.querySelector(`[data-file="${filename}"]`);
  const nameEl = item.querySelector('.file-name');
  const oldName = nameEl.textContent;
  const input = document.createElement('input');
  input.className = 'tree-rename';
  input.value = oldName;
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  const finish = () => {
    const newName = input.value.trim();
    if (newName && newName !== oldName) {
      renameFile(oldName, newName, item, input);
    } else {
      input.replaceWith(nameEl);
    }
  };
  input.onblur = finish;
  input.onkeydown = e2 => { if (e2.key === 'Enter') finish(); if (e2.key === 'Escape') input.replaceWith(nameEl); e2.stopPropagation(); };
}

function renameFile(oldName, newName, item, input) {
  if (files[newName]) { notify('File already exists', 'error'); const nameEl = document.createElement('span'); nameEl.className = 'file-name'; nameEl.textContent = oldName; input.replaceWith(nameEl); return; }
  files[newName] = files[oldName];
  delete files[oldName];
  item.setAttribute('data-file', newName);
  item.onclick = () => openFile(newName);
  const ext = newName.split('.').pop();
  const icons = {py:'🐍',js:'📜',html:'🌐',css:'🎨',md:'📄',txt:'📋',env:'🔒'};
  item.querySelector('.file-icon').textContent = icons[ext] || '📄';
  const nameEl = document.createElement('span');
  nameEl.className = 'file-name';
  nameEl.textContent = newName;
  input.replaceWith(nameEl);
  // update actions
  item.querySelector('.file-actions').innerHTML = `<span class="file-action-btn" onclick="startRename(event,'${newName}')" title="Rename">✎</span><span class="file-action-btn" onclick="deleteFile(event,'${newName}')" title="Delete">✕</span>`;
  // update tab if open
  const tabIdx = openTabs.indexOf(oldName);
  if (tabIdx !== -1) {
    openTabs[tabIdx] = newName;
    const oldTab = document.getElementById(`tab-${oldName}`);
    if (oldTab) { oldTab.id = `tab-${newName}`; oldTab.querySelector('.tab-close').setAttribute('onclick', `closeTab(event,'${newName}')`); oldTab.innerHTML = `<span class="tab-icon">${icons[ext]||'📄'}</span>${newName}<span class="tab-close" onclick="closeTab(event,'${newName}')">×</span>`; oldTab.onclick = () => switchTab(newName); }
    if (activeFile === oldName) { activeFile = newName; updateBreadcrumb(newName); updateStatusLang(newName); }
  }
  notify(`Renamed to ${newName}`, 'success');
}

// ═══════════════════════════════════════════════
// CONTEXT MENU (NEW)
// ═══════════════════════════════════════════════
function showCtxMenu(e, filename) {
  e.preventDefault();
  e.stopPropagation();
  ctxTarget = filename;
  const menu = document.getElementById('ctx-menu');
  document.getElementById('ctx-filename').textContent = filename;
  menu.classList.add('open');
  const x = Math.min(e.clientX, window.innerWidth - 170);
  const y = Math.min(e.clientY, window.innerHeight - 160);
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function ctxAction(action) {
  const menu = document.getElementById('ctx-menu');
  menu.classList.remove('open');
  if (!ctxTarget) return;
  if (action === 'open') openFile(ctxTarget);
  if (action === 'rename') {
    const item = document.querySelector(`[data-file="${ctxTarget}"]`);
    if (item) { const fakeE = {stopPropagation:()=>{}}; startRename(fakeE, ctxTarget); }
  }
  if (action === 'copy-path') {
    navigator.clipboard.writeText('/project/' + ctxTarget).then(() => notify('Path copied', 'success'));
  }
  if (action === 'delete') {
    if (confirm(`Delete ${ctxTarget}?`)) { deleteFile({stopPropagation:()=>{}}, ctxTarget); }
  }
  ctxTarget = null;
}

document.addEventListener('click', () => document.getElementById('ctx-menu').classList.remove('open'));

// ═══════════════════════════════════════════════
// COMMAND PALETTE (NEW)
// ═══════════════════════════════════════════════
const cmdCommands = [
  { label: 'Run Code', icon: '▶', tag: 'action', kbd: 'Ctrl+Enter', fn: runCode },
  { label: 'Toggle Sidebar', icon: '☰', tag: 'action', kbd: 'Ctrl+B', fn: toggleSidebar },
  { label: 'AI Assistant', icon: '✦', tag: 'action', kbd: 'Ctrl+I', fn: toggleAI },
  { label: 'Find in File', icon: '🔍', tag: 'action', kbd: 'Ctrl+F', fn: openFindBar },
  { label: 'New File', icon: '+', tag: 'action', fn: openNewFileModal },
  { label: 'Toggle Word Wrap', icon: '↩', tag: 'action', kbd: 'Alt+Z', fn: toggleWordWrap },
  { label: 'Deploy to Render', icon: '☁️', tag: 'deploy', fn: () => deployTo('Render') },
  { label: 'Deploy to Railway', icon: '🚂', tag: 'deploy', fn: () => deployTo('Railway') },
  { label: 'Git Push', icon: '↑', tag: 'git', fn: () => gitAction('push') },
  { label: 'Git Pull', icon: '↓', tag: 'git', fn: () => gitAction('pull') },
  { label: 'New Branch', icon: '⎇', tag: 'git', fn: () => gitAction('branch') },
  { label: 'Focus Terminal', icon: '⚡', tag: 'action', kbd: 'Ctrl+`', fn: focusTerminal },
  { label: 'Clear Terminal', icon: '✕', tag: 'action', fn: clearTerminal },
  { label: 'Run Preview', icon: '🌐', tag: 'action', fn: () => { switchPanel('preview', document.getElementById('ptab-preview')); showPreview(); } },
];

function openCmdPalette() {
  const overlay = document.getElementById('cmd-overlay');
  overlay.classList.add('open');
  const input = document.getElementById('cmd-input');
  input.value = '';
  setTimeout(() => input.focus(), 50);
  filterCmd('');
}

function closeCmdPalette(e) {
  if (e && e.target !== document.getElementById('cmd-overlay')) return;
  document.getElementById('cmd-overlay').classList.remove('open');
}

function filterCmd(query) {
  const resultsEl = document.getElementById('cmd-results');
  const q = query.toLowerCase();

  const fileItems = Object.keys(files)
    .filter(f => !q || f.toLowerCase().includes(q))
    .map(f => ({ label: f, icon: getFileIcon(f), tag: 'file', fn: () => openFile(f) }));

  const cmdItems2 = cmdCommands.filter(c => !q || c.label.toLowerCase().includes(q));

  cmdItems = [];
  let html = '';

  if (fileItems.length) {
    html += `<div class="cmd-section">Files</div>`;
    fileItems.forEach((item, i) => {
      cmdItems.push(item);
      html += `<div class="cmd-item${cmdItems.length-1===0?' sel':''}" onclick="runCmd(${cmdItems.length-1})"><span class="cmd-icon">${item.icon}</span><span class="cmd-label">${item.label}</span><span class="cmd-tag">${item.tag}</span></div>`;
    });
  }

  if (cmdItems2.length) {
    html += `<div class="cmd-section">Commands</div>`;
    cmdItems2.forEach(item => {
      cmdItems.push(item);
      html += `<div class="cmd-item" onclick="runCmd(${cmdItems.length-1})"><span class="cmd-icon">${item.icon}</span><span class="cmd-label">${item.label}</span>${item.kbd ? `<span class="cmd-kbd">${item.kbd}</span>` : `<span class="cmd-tag">${item.tag}</span>`}</div>`;
    });
  }

  if (!html) html = `<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">No results</div>`;
  resultsEl.innerHTML = html;
  cmdSelIdx = 0;
  updateCmdSel();
}

function handleCmdKey(e) {
  const items = document.querySelectorAll('.cmd-item');
  if (e.key === 'ArrowDown') { e.preventDefault(); cmdSelIdx = (cmdSelIdx + 1) % items.length; updateCmdSel(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); cmdSelIdx = (cmdSelIdx - 1 + items.length) % items.length; updateCmdSel(); }
  if (e.key === 'Enter') { e.preventDefault(); runCmd(cmdSelIdx); }
  if (e.key === 'Escape') document.getElementById('cmd-overlay').classList.remove('open');
}

function updateCmdSel() {
  document.querySelectorAll('.cmd-item').forEach((el, i) => el.classList.toggle('sel', i === cmdSelIdx));
  const sel = document.querySelectorAll('.cmd-item')[cmdSelIdx];
  if (sel) sel.scrollIntoView({block:'nearest'});
}

function runCmd(idx) {
  if (cmdItems[idx]) {
    document.getElementById('cmd-overlay').classList.remove('open');
    cmdItems[idx].fn();
  }
}

function getFileIcon(f) {
  const ext = f.split('.').pop();
  return {py:'🐍',js:'📜',html:'🌐',css:'🎨',md:'📄',txt:'📋',env:'🔒'}[ext] || '📄';
}

// ═══════════════════════════════════════════════
// SIDEBAR / PANELS
// ═══════════════════════════════════════════════
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
}

function switchSidebarTab(tab, el) {
  document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['explorer','search','git'].forEach(t => {
    const el2 = document.getElementById(`tab-${t}`);
    if (el2) el2.style.display = t === tab ? '' : 'none';
  });
}

function togglePanel() {
  panelOpen = !panelOpen;
  document.getElementById('bottom-panel').classList.toggle('collapsed', !panelOpen);
  document.querySelector('.panel-toggle').textContent = panelOpen ? '▼' : '▲';
}

function switchPanel(panel, el) {
  activePanel = panel;
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  ['terminal','preview','problems','deploy-panel'].forEach(p => {
    const pel = document.getElementById(`panel-${p}`);
    if (pel) pel.style.display = p === panel ? '' : 'none';
  });
  if (!panelOpen) {
    panelOpen = true;
    document.getElementById('bottom-panel').classList.remove('collapsed');
    document.querySelector('.panel-toggle').textContent = '▼';
  }
}

function switchView(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`nav-${view}`).classList.add('active');
  notify(`Switched to ${view} view`);
}

// ═══════════════════════════════════════════════
// PANEL RESIZE (NEW)
// ═══════════════════════════════════════════════
(function initResize() {
  const handle = document.getElementById('panel-resize');
  const panel = document.getElementById('bottom-panel');
  let dragging = false, startY = 0, startH = 0;

  handle.addEventListener('mousedown', e => {
    dragging = true;
    startY = e.clientY;
    startH = panel.offsetHeight;
    handle.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = startY - e.clientY;
    const newH = Math.min(500, Math.max(36, startH + delta));
    document.documentElement.style.setProperty('--panel-h', newH + 'px');
    panel.style.height = newH + 'px';
    if (newH <= 36) { panelOpen = false; panel.classList.add('collapsed'); }
    else { panelOpen = true; panel.classList.remove('collapsed'); }
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();

// ═══════════════════════════════════════════════
// TERMINAL
// ═══════════════════════════════════════════════
const termCommands = {
  'python --version': () => addTermOutput('Python 3.11.4', 'out'),
  'node --version': () => addTermOutput('v20.11.0', 'out'),
  'git --version': () => addTermOutput('git version 2.43.0', 'out'),
  'ls': () => addTermOutput(Object.keys(files).join('  '), 'out'),
  'clear': clearTerminal,
  'pwd': () => addTermOutput('/home/user/project', 'out'),
  'whoami': () => addTermOutput('exomnia-user', 'out'),
  'date': () => addTermOutput(new Date().toString(), 'out'),
  'help': () => addTermOutput('Commands: python, node, git, ls, clear, pwd, pip, npm, help\nShortcut: Ctrl+P = Command Palette, Ctrl+F = Find, Ctrl+B = Sidebar', 'out'),
};

function focusTerminal() {
  switchPanel('terminal', document.getElementById('ptab-terminal'));
  if (!panelOpen) { panelOpen = true; document.getElementById('bottom-panel').classList.remove('collapsed'); }
  setTimeout(() => document.getElementById('term-input').focus(), 100);
}

function clearTerminal() {
  document.getElementById('term-output').innerHTML = '';
  document.getElementById('term-body').querySelectorAll('.term-line:not(#term-output)').forEach(el => {
    if (el.id !== 'term-input-row') {} // keep input row
  });
  notify('Terminal cleared');
}

function copyTerminal() {
  const text = document.getElementById('term-body').innerText;
  navigator.clipboard.writeText(text).then(() => notify('Terminal output copied', 'success'));
}

function handleTermInput(e) {
  const input = e.target;
  if (e.key === 'Enter') {
    const cmd = input.value.trim();
    if (!cmd) return;
    termHistory.unshift(cmd);
    termHistIdx = -1;
    addTermLine(cmd);
    processCommand(cmd);
    input.value = '';
  }
  if (e.key === 'ArrowUp') { termHistIdx = Math.min(termHistIdx+1, termHistory.length-1); input.value = termHistory[termHistIdx] || ''; }
  if (e.key === 'ArrowDown') { termHistIdx = Math.max(termHistIdx-1, -1); input.value = termHistIdx >= 0 ? termHistory[termHistIdx] : ''; }
}

function addTermLine(cmd) {
  const out = document.getElementById('term-output');
  out.innerHTML += `<div class="term-line"><span class="term-prompt">~/project</span><span class="term-path">$</span><span class="term-cmd">${cmd}</span></div>`;
  scrollTerminal();
}

function addTermOutput(text, type='out') {
  const out = document.getElementById('term-output');
  const cls = {out:'term-out',err:'term-err',success:'term-success',info:'term-info'}[type] || 'term-out';
  text.split('\n').forEach(line => {
    out.innerHTML += `<div class="term-line"><span class="${cls}">${line}</span></div>`;
  });
  scrollTerminal();
}

function scrollTerminal() {
  const body = document.getElementById('term-body');
  setTimeout(() => body.scrollTop = body.scrollHeight, 50);
}

function processCommand(cmd) {
  const lower = cmd.toLowerCase().trim();
  if (termCommands[lower]) { termCommands[lower](); return; }
  if (lower.startsWith('pip install ')) {
    const pkg = cmd.slice(12).trim();
    addTermOutput(`Collecting ${pkg}...`, 'info');
    setTimeout(() => addTermOutput(`✓ Successfully installed ${pkg}`, 'success'), 800);
    return;
  }
  if (lower.startsWith('npm install')) {
    addTermOutput('npm: fetching packages...', 'info');
    setTimeout(() => addTermOutput('✓ added packages in 2.1s', 'success'), 800);
    return;
  }
  if (lower === 'python app.py' || lower === 'flask run') {
    addTermOutput(' * Serving Flask app "app"', 'info');
    addTermOutput(' * Debug mode: on', 'info');
    setTimeout(() => { addTermOutput(' * Running on http://127.0.0.1:5000', 'success'); showPreview(); }, 600);
    return;
  }
  if (lower.startsWith('git ')) {
    const sub = lower.slice(4);
    if (sub === 'status') addTermOutput('On branch main\nModified: app.py\nNew file: main.js', 'out');
    else if (sub.startsWith('commit')) addTermOutput('[main a3f8c2d] ' + (cmd.match(/"(.+)"/) || ['','Update'])[1], 'success');
    else if (sub === 'push') { addTermOutput('Pushing to origin/main...', 'info'); setTimeout(() => addTermOutput('✓ Branch main pushed to GitHub', 'success'), 700); }
    else if (sub === 'pull') { addTermOutput('Pulling from origin/main...', 'info'); setTimeout(() => addTermOutput('✓ Already up to date.', 'success'), 500); }
    else addTermOutput(`git: '${sub}' executed`, 'out');
    return;
  }
  if (lower.startsWith('node ')) {
    addTermOutput('Running ' + cmd.slice(5) + '...', 'info');
    setTimeout(() => addTermOutput('Server started on port 3000', 'success'), 400);
    return;
  }
  addTermOutput(`bash: ${cmd}: command not found`, 'err');
}

function runCode() {
  switchPanel('terminal', document.getElementById('ptab-terminal'));
  addTermLine('python app.py');
  processCommand('python app.py');
}

function showPreview() {
  const placeholder = document.getElementById('preview-placeholder');
  const frame = document.getElementById('preview-frame');
  if (placeholder) placeholder.style.display = 'none';
  if (frame) {
    frame.style.display = 'block';
    frame.srcdoc = files['index.html'] || '<h1>Hello!</h1>';
  }
  notify('Preview ready at localhost:8080', 'success');
}

function refreshPreview() { showPreview(); notify('Preview refreshed', 'success'); }

// ═══════════════════════════════════════════════
// GIT ACTIONS
// ═══════════════════════════════════════════════
function gitCommit() {
  const msg = document.getElementById('commit-msg').value.trim();
  if (!msg) { notify('Enter a commit message', 'error'); return; }
  switchPanel('terminal', document.getElementById('ptab-terminal'));
  addTermLine(`git commit -m "${msg}"`);
  addTermOutput(`[main a3f8c2d] ${msg}`, 'success');
  document.getElementById('commit-msg').value = '';
  notify('Committed: ' + msg, 'success');
}

function gitAction(action) {
  switchPanel('terminal', document.getElementById('ptab-terminal'));
  if (action === 'push') { addTermLine('git push origin main'); processCommand('git push'); }
  if (action === 'pull') { addTermLine('git pull'); processCommand('git pull'); }
  if (action === 'branch') {
    const name = prompt('Branch name:');
    if (name) { addTermLine(`git checkout -b ${name}`); addTermOutput(`Switched to new branch '${name}'`, 'success'); }
  }
}

// ═══════════════════════════════════════════════
// DEPLOY
// ═══════════════════════════════════════════════
function deployTo(platform) {
  notify(`Deploying to ${platform}...`, 'info');
  switchPanel('terminal', document.getElementById('ptab-terminal'));
  addTermLine(`deploy --platform=${platform.toLowerCase()}`);
  addTermOutput(`Connecting to ${platform}...`, 'info');
  setTimeout(() => {
    addTermOutput(`Building project...`, 'info');
    setTimeout(() => {
      addTermOutput(`✓ Deployed to ${platform}!`, 'success');
      addTermOutput(`🌐 https://exomnia-app.${platform.toLowerCase()}.app`, 'success');
      notify(`✓ Live on ${platform}!`, 'success');
    }, 1500);
  }, 800);
}

// ═══════════════════════════════════════════════
// FILE MANAGER / MODAL
// ═══════════════════════════════════════════════
function openNewFileModal() {
  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('new-file-input').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('new-file-input').value = '';
}

function setTpl(name) {
  document.getElementById('new-file-input').value = name;
  document.getElementById('new-file-input').focus();
}

function createNewFile() {
  const name = document.getElementById('new-file-input').value.trim();
  if (!name) return;
  if (files[name]) { notify('File already exists', 'error'); return; }
  // Auto-populate template based on extension or matching template name
  const baseName = name.split('/').pop();
  const templateContent = fileTemplates[baseName] || fileTemplates[name] || `# ${name}\n`;
  files[name] = templateContent;

  const ext = name.split('.').pop();
  const icons = {py:'🐍',js:'📜',html:'🌐',css:'🎨',md:'📄',txt:'📋',env:'🔒'};
  const icon = icons[ext] || '📄';

  const treeItem = document.createElement('div');
  treeItem.className = 'tree-item';
  treeItem.setAttribute('data-file', name);
  treeItem.onclick = () => openFile(name);
  treeItem.setAttribute('oncontextmenu', `showCtxMenu(event,'${name}')`);
  treeItem.innerHTML = `<span class="file-icon">${icon}</span><span class="file-name">${name}</span><div class="file-actions"><span class="file-action-btn" onclick="startRename(event,'${name}')" title="Rename">✎</span><span class="file-action-btn" onclick="deleteFile(event,'${name}')" title="Delete">✕</span></div>`;
  document.getElementById('tab-explorer').querySelector('.file-tree').appendChild(treeItem);

  closeModal();
  openFile(name);
  notify(`Created ${name}`, 'success');
}

function searchFiles(query) {
  const results = document.getElementById('search-results');
  if (!query) { results.textContent = 'Type to search...'; return; }
  const matches = Object.keys(files).filter(f => f.includes(query) || (files[f] && files[f].toLowerCase().includes(query.toLowerCase())));
  if (!matches.length) { results.innerHTML = '<span style="color:var(--text3)">No results</span>'; return; }
  results.innerHTML = matches.map(f => {
    const content = files[f] || '';
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    const preview = idx !== -1 ? '…' + content.slice(Math.max(0,idx-20), idx+40).replace(/\n/g,' ') + '…' : '';
    return `<div style="padding:5px 6px;border-radius:4px;cursor:pointer;margin-bottom:2px" onclick="openFile('${f}')" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
      <div style="color:var(--text2);font-size:12px">${getFileIcon(f)} ${f}</div>
      ${preview ? `<div style="color:var(--text3);font-size:10px;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${preview}</div>` : ''}
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
// AI ASSISTANT — multi-turn with history
// ═══════════════════════════════════════════════
function toggleAI() {
  aiOpen = !aiOpen;
  document.getElementById('ai-overlay').classList.toggle('open', aiOpen);
  if (aiOpen) setTimeout(() => document.getElementById('ai-input').focus(), 300);
}

function clearAI() {
  aiHistory = [];
  const msgs = document.getElementById('ai-messages');
  msgs.innerHTML = `<div class="ai-msg-wrap bot"><div class="ai-msg bot">Chat cleared. কিছু জিজ্ঞেস করুন! 🚀</div></div>
  <div class="ai-chips">
    <span class="ai-chip" onclick="aiPrompt('Write a Flask REST API endpoint for this')">Flask API</span>
    <span class="ai-chip" onclick="aiPrompt('Find and fix bugs in my current file')">Fix Bugs</span>
    <span class="ai-chip" onclick="aiPrompt('Explain this code line by line')">Explain</span>
    <span class="ai-chip" onclick="aiPrompt('Optimize this code for performance')">Optimize</span>
  </div>`;
}

function aiPrompt(text) {
  document.getElementById('ai-input').value = text;
  sendAI();
}

async function sendAI() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  autoResize(input);

  const messages = document.getElementById('ai-messages');

  // User message
  const userWrap = document.createElement('div');
  userWrap.className = 'ai-msg-wrap user';
  userWrap.innerHTML = `<div class="ai-msg user">${msg.replace(/</g,'&lt;')}</div>`;
  messages.appendChild(userWrap);

  // Thinking indicator
  const thinkDiv = document.createElement('div');
  thinkDiv.className = 'ai-thinking';
  thinkDiv.innerHTML = '<div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div>';
  messages.appendChild(thinkDiv);
  messages.scrollTop = messages.scrollHeight;

  // Add to history
  aiHistory.push({ role: 'user', content: msg });

  try {
    const currentCode = files[activeFile] || '';
    const systemPrompt = `You are the AI coding assistant inside Exomnia DevKit, a mobile-first developer environment. Help the user concisely and practically. Current file: ${activeFile}\n\nFile content (first 1000 chars):\n${currentCode.slice(0, 1000)}\n\nRespond in a mix of English and Bengali when appropriate. Keep answers focused and actionable. Use \`backticks\` for code.`;

    let text = '';

    if (selectedProvider === 'deepseek') {
      // ── DeepSeek API (OpenAI-compatible) ──────────────────────
      if (!userDeepseekKey) {
        thinkDiv.remove();
        const errWrap = document.createElement('div');
        errWrap.className = 'ai-msg-wrap bot';
        errWrap.innerHTML = `<div class="ai-msg bot" style="border-color:var(--accent3)">🤖 DeepSeek API key দরকার।<br><span style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="openKeyModal()">🔑 Key সেট করুন</span></div>`;
        messages.appendChild(errWrap);
        aiHistory.pop();
        messages.scrollTop = messages.scrollHeight;
        return;
      }
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userDeepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          max_tokens: 1000,
          messages: [
            { role: 'system', content: systemPrompt },
            ...aiHistory
          ]
        })
      });
      const data = await resp.json();
      thinkDiv.remove();
      if (data.error) {
        const errWrap = document.createElement('div');
        errWrap.className = 'ai-msg-wrap bot';
        errWrap.innerHTML = `<div class="ai-msg bot" style="border-color:var(--red)">⚠ DeepSeek Error: ${data.error.message || 'Unknown error'}<br><span style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="openKeyModal()">Key চেক করুন</span></div>`;
        messages.appendChild(errWrap);
        aiHistory.pop();
        messages.scrollTop = messages.scrollHeight;
        return;
      }
      text = data.choices?.[0]?.message?.content || 'দুঃখিত, response পাওয়া যায়নি।';

    } else {
      // ── Claude / Anthropic API ─────────────────────────────────
      const hdrs = { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' };
      if (userApiKey) hdrs['x-api-key'] = userApiKey;

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: aiHistory
        })
      });
      const data = await resp.json();
      thinkDiv.remove();
      if (data.error) {
        const errWrap = document.createElement('div');
        errWrap.className = 'ai-msg-wrap bot';
        if (data.error.type === 'authentication_error') {
          errWrap.innerHTML = `<div class="ai-msg bot" style="border-color:var(--red)">🔑 Claude API Key ভুল বা মেয়াদ শেষ। <span style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="openKeyModal()">Key আপডেট করুন</span></div>`;
        } else {
          errWrap.innerHTML = `<div class="ai-msg bot" style="border-color:var(--red)">⚠ Error: ${data.error.message}</div>`;
        }
        messages.appendChild(errWrap);
        aiHistory.pop();
        messages.scrollTop = messages.scrollHeight;
        return;
      }
      text = data.content?.[0]?.text || 'দুঃখিত, response পাওয়া যায়নি।';
    }

    // Add assistant response to history
    aiHistory.push({ role: 'assistant', content: text });

    // Render bot message
    const botWrap = document.createElement('div');
    botWrap.className = 'ai-msg-wrap bot';
    const rendered = text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\n/g,'<br>');
    botWrap.innerHTML = `<div class="ai-msg bot">${rendered}</div>
      <div class="ai-msg-actions">
        <button class="ai-act-btn" onclick="copyAIMsg(this)">⎘ Copy</button>
        <button class="ai-act-btn" onclick="insertToEditor(this)">↙ Insert</button>
      </div>`;
    botWrap.dataset.raw = text;
    messages.appendChild(botWrap);

  } catch (err) {
    thinkDiv.remove();
    const errWrap = document.createElement('div');
    errWrap.className = 'ai-msg-wrap bot';
    const isCors = err.message?.includes('fetch') || err.name === 'TypeError';
    const hasKey = selectedProvider === 'claude' ? !!userApiKey : !!userDeepseekKey;
    if (isCors && !hasKey) {
      errWrap.innerHTML = `<div class="ai-msg bot" style="border-color:var(--accent3)">📱 Standalone mode — API key দরকার।<br><span style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="openKeyModal()">🔑 Key সেট করুন</span></div>`;
    } else {
      errWrap.innerHTML = `<div class="ai-msg bot" style="border-color:var(--red)">⚠ AI সংযোগে সমস্যা। আবার চেষ্টা করুন।</div>`;
    }
    messages.appendChild(errWrap);
    aiHistory.pop();
  }
  messages.scrollTop = messages.scrollHeight;
}


// ═══════════════════════════════════════════════
// PROVIDER SWITCHING
// ═══════════════════════════════════════════════
function switchProvider(p) {
  selectedProvider = p;
  const btnClaude = document.getElementById('prov-claude');
  const btnDeep   = document.getElementById('prov-deepseek');
  if (btnClaude) {
    btnClaude.style.background = p === 'claude' ? 'var(--accent)' : 'transparent';
    btnClaude.style.color      = p === 'claude' ? '#000' : 'var(--text3)';
    btnClaude.style.fontWeight = p === 'claude' ? '600' : '400';
  }
  if (btnDeep) {
    btnDeep.style.background = p === 'deepseek' ? 'var(--blue)' : 'transparent';
    btnDeep.style.color      = p === 'deepseek' ? '#fff' : 'var(--text3)';
    btnDeep.style.fontWeight = p === 'deepseek' ? '600' : '400';
  }
  const title = document.querySelector('.ai-title');
  if (title) title.textContent = p === 'deepseek' ? '🤖 DeepSeek AI' : '✦ AI Assistant';
  updateKeyBtn();
}

function updateKeyBtn() {
  const keyBtn = document.getElementById('key-btn');
  if (!keyBtn) return;
  const hasKey = selectedProvider === 'claude' ? !!userApiKey : !!userDeepseekKey;
  if (hasKey) {
    keyBtn.textContent = '🔑 Connected';
    keyBtn.style.background = 'rgba(63,185,80,0.15)';
    keyBtn.style.color = 'var(--green)';
    keyBtn.style.borderColor = 'rgba(63,185,80,0.3)';
  } else {
    keyBtn.textContent = '🔑 Key';
    keyBtn.style.background = 'rgba(245,158,11,0.15)';
    keyBtn.style.color = 'var(--accent3)';
    keyBtn.style.borderColor = 'rgba(245,158,11,0.3)';
  }
}

// ═══════════════════════════════════════════════
// API KEY MANAGEMENT
// ═══════════════════════════════════════════════
function openKeyModal() {
  document.getElementById('key-modal').classList.add('open');
  switchKeyProvider(selectedProvider);
  setTimeout(() => document.getElementById('key-input').focus(), 200);
}

function closeKeyModal() {
  document.getElementById('key-modal').classList.remove('open');
}

function switchKeyProvider(p) {
  keyModalProvider = p;
  const tabC = document.getElementById('prov-tab-claude');
  const tabD = document.getElementById('prov-tab-deepseek');
  const sub  = document.getElementById('key-modal-sub');
  const inp  = document.getElementById('key-input');
  const link = document.getElementById('key-link-div');

  if (p === 'claude') {
    if (tabC) { tabC.className = 'git-btn primary'; }
    if (tabD) { tabD.className = 'git-btn'; }
    if (sub)  sub.textContent = 'Anthropic API key দিয়ে Claude চালান। Key শুধু এই session-এ থাকবে।';
    if (inp)  { inp.placeholder = 'sk-ant-api03-...'; inp.value = userApiKey || ''; }
    if (link) link.innerHTML = '🔗 Key নিন: <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:var(--blue)">console.anthropic.com</a>';
  } else {
    if (tabC) { tabC.className = 'git-btn'; }
    if (tabD) { tabD.className = 'git-btn primary'; }
    if (sub)  sub.textContent = 'DeepSeek API key দিয়ে DeepSeek-V3 চালান। Key শুধু এই session-এ থাকবে।';
    if (inp)  { inp.placeholder = 'sk-...'; inp.value = userDeepseekKey || ''; }
    if (link) link.innerHTML = '🔗 Key নিন: <a href="https://platform.deepseek.com/api-keys" target="_blank" style="color:var(--blue)">platform.deepseek.com</a>';
  }
  validateKeyInput();
}

function validateKeyInput() {
  const val = document.getElementById('key-input').value.trim();
  const btn = document.getElementById('key-save-btn');
  let valid = false;
  if (keyModalProvider === 'claude') {
    valid = val.startsWith('sk-ant-');
  } else {
    valid = val.startsWith('sk-') && val.length > 10;
  }
  btn.disabled = !valid;
  btn.style.opacity = btn.disabled ? '0.5' : '1';
}

function saveApiKey() {
  const val = document.getElementById('key-input').value.trim();
  if (keyModalProvider === 'claude') {
    if (!val.startsWith('sk-ant-')) return;
    userApiKey = val;
  } else {
    if (!val.startsWith('sk-') || val.length <= 10) return;
    userDeepseekKey = val;
  }
  switchProvider(keyModalProvider);
  closeKeyModal();
  const name = keyModalProvider === 'claude' ? 'Claude' : 'DeepSeek';
  showNotif(`✓ ${name} API Key সেট হয়েছে! AI ready.`, 'success');
}

function copyAIMsg(btn) {
  const wrap = btn.closest('.ai-msg-wrap');
  const text = wrap?.dataset.raw || wrap?.querySelector('.ai-msg')?.innerText || '';
  navigator.clipboard.writeText(text).then(() => { btn.textContent = '✓ Copied'; setTimeout(() => btn.textContent = '⎘ Copy', 1500); });
}

function insertToEditor(btn) {
  const wrap = btn.closest('.ai-msg-wrap');
  const text = wrap?.dataset.raw || '';
  // Extract code blocks if present, otherwise use full text
  const codeMatch = text.match(/```[\w]*\n?([\s\S]+?)```/);
  const toInsert = codeMatch ? codeMatch[1].trim() : text;
  document.getElementById('code-content').focus();
  document.execCommand('insertText', false, '\n' + toInsert);
  files[activeFile] = document.getElementById('code-content').innerText;
  notify('Code inserted into editor', 'success');
}

function handleAIInput(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 80) + 'px';
}

// ═══════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════
function notify(msg, type = 'info') {
  const container = document.getElementById('notif-container');
  const notif = document.createElement('div');
  notif.className = `notif ${type}`;
  const icons = {info:'ℹ', success:'✓', error:'✕'};
  notif.innerHTML = `<span>${icons[type] || 'ℹ'}</span>${msg}`;
  notif.onclick = () => notif.remove();
  container.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transform = 'translateX(20px)';
    notif.style.transition = 'all 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 2500);
}

// ═══════════════════════════════════════════════
// GLOBAL KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════
document.addEventListener('keydown', e => {
  const activeEl = document.activeElement;
  const inEditor = activeEl === document.getElementById('code-content');
  const inTerm = activeEl === document.getElementById('term-input');
  const inAI = activeEl === document.getElementById('ai-input');

  // Ctrl+P — Command Palette
  if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !inTerm && !inAI) {
    e.preventDefault();
    openCmdPalette();
  }
  // Ctrl+B — Toggle Sidebar
  if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !inAI) {
    e.preventDefault();
    toggleSidebar();
  }
  // Ctrl+F — Find
  if ((e.ctrlKey || e.metaKey) && e.key === 'f' && (inEditor || !activeEl || activeEl === document.body)) {
    e.preventDefault();
    openFindBar();
  }
  // Ctrl+I — AI
  if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !inTerm) {
    e.preventDefault();
    toggleAI();
  }
  // Ctrl+` — Focus terminal
  if ((e.ctrlKey || e.metaKey) && e.key === '`') {
    e.preventDefault();
    focusTerminal();
  }
  // Escape — close any open overlay
  if (e.key === 'Escape') {
    if (document.getElementById('cmd-overlay').classList.contains('open')) document.getElementById('cmd-overlay').classList.remove('open');
    else if (document.getElementById('modal-overlay').classList.contains('open')) closeModal();
    else if (document.getElementById('find-bar').style.display !== 'none') closeFindBar();
    else if (aiOpen) toggleAI();
  }
});

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
window.addEventListener('load', () => {
  loadFile('app.py');

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Mobile: close cmd palette on overlay click already handled inline
  notify('DevKit ready — Ctrl+P for commands', 'success');
});
