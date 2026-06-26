// ═══════════════════════════════════════════════
// FILE DATA — starts empty, populated by user
// ═══════════════════════════════════════════════
const files = {};

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
let activeFile = null;
let openTabs = [];
let sidebarOpen = true;
let panelOpen = true;
let activePanel = 'terminal';
let termHistory = [];
let termHistIdx = -1;
let aiOpen = false;
let aiHistory = [];
let userApiKey = '';
let userDeepseekKey = 'sk-d4813c9679ca45ec814e1d4949249ff2';
let selectedProvider = 'deepseek';
let keyModalProvider = 'claude';
let splitViewActive = false;
let splitDebounce = null;
let cursorLine = 1;
let wordWrap = false;
let editorFontSize = 13;
let findMatches = [];
let findCurrentIdx = -1;
let ctxTarget = null;
let cmdSelIdx = 0;
let cmdItems = [];

// ── Real-time git tracking ──
const gitChanges = { modified: new Set(), added: new Set(), deleted: new Set() };

// ═══════════════════════════════════════════════
// EDITOR EMPTY STATE
// ═══════════════════════════════════════════════
function showEditorEmpty(show) {
  const empty  = document.getElementById('editor-empty');
  const active = document.getElementById('editor-active');
  const toolbar = document.getElementById('editor-toolbar');
  if (empty)  empty.style.display  = show ? 'flex' : 'none';
  if (active) active.style.display = show ? 'none' : 'flex';
  if (toolbar) toolbar.style.display = show ? 'none' : '';
  if (show) updateStatusLang(null);
}

// ═══════════════════════════════════════════════
// REAL-TIME GIT PANEL
// ═══════════════════════════════════════════════
function updateGitPanel() {
  const list = document.getElementById('git-changes-list');
  if (!list) return;
  const total = gitChanges.modified.size + gitChanges.added.size + gitChanges.deleted.size;
  if (!total) {
    list.innerHTML = '<div style="color:var(--text3);font-size:11px;font-family:\'Inter\',sans-serif;padding:8px 4px">No changes</div>';
    return;
  }
  let html = '';
  gitChanges.added.forEach(f    => { html += `<div class="git-status-item"><span class="git-badge A">A</span><span style="font-size:11px;color:var(--text2)">${f}</span></div>`; });
  gitChanges.modified.forEach(f => { html += `<div class="git-status-item"><span class="git-badge M">M</span><span style="font-size:11px;color:var(--text2)">${f}</span></div>`; });
  gitChanges.deleted.forEach(f  => { html += `<div class="git-status-item"><span class="git-badge D">D</span><span style="font-size:11px;color:var(--text3)">${f}</span></div>`; });
  list.innerHTML = html;
}
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
  const ext = filename ? filename.split('.').pop().toLowerCase() : null;
  const iconMap  = {py:'file-code-2',js:'file-code-2',html:'globe',css:'palette',md:'file-text',txt:'file-text',env:'lock'};
  const labelMap = {py:'Python 3.11',js:'JavaScript',html:'HTML',css:'CSS',md:'Markdown',txt:'Text',env:'ENV'};
  const show = !!filename;
  ['status-lang','status-branch','cursor-pos','save-status',
   'status-sep-branch','status-sep-lang','status-sep-cur'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  });
  const el = document.getElementById('status-lang');
  if (!el || !ext) return;
  const icon  = iconMap[ext]  || 'file';
  const label = labelMap[ext] || ext.toUpperCase();
  el.innerHTML = `<i data-lucide="${icon}" style="width:12px;height:12px"></i>${label}`;
  refreshIcons();
}

function handleInput() {
  const codeEl = document.getElementById('code-content');
  const text = codeEl.innerText;
  files[activeFile] = text;
  const tab = document.getElementById(`tab-${activeFile}`);
  if (tab && !tab.classList.contains('modified')) tab.classList.add('modified');
  updateLineNumbers(text);
  const saveEl = document.getElementById('save-status');
  if (saveEl) { saveEl.innerHTML = '<i data-lucide="circle-dotted" style="width:12px;height:12px"></i>Unsaved'; refreshIcons(); }
  // real-time git tracking
  if (!gitChanges.added.has(activeFile)) gitChanges.modified.add(activeFile);
  updateGitPanel();
  clearTimeout(window._saveTimer);
  window._saveTimer = setTimeout(() => {
    const se = document.getElementById('save-status');
    if (se) { se.innerHTML = '<i data-lucide="check-circle" style="width:12px;height:12px"></i>Saved'; refreshIcons(); }
    if (tab) tab.classList.remove('modified');
  }, 1200);
  // Live split preview (debounced 600ms)
  clearTimeout(splitDebounce);
  splitDebounce = setTimeout(updateSplitPreview, 600);
}

function handleKeyDown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertText', false, '    ');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('save-status').innerHTML = '<i data-lucide="check-circle" style="width:12px;height:12px"></i>Saved'; refreshIcons();
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
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = `tab-${filename}`;
    tab.onclick = () => switchTab(filename);
    tab.innerHTML = `<span class="tab-icon ${fileIconClass(filename)}">${fileIconSvg(filename,12)}</span>${filename}<span class="tab-close" onclick="closeTab(event,'${filename}')"><i data-lucide="x" style="width:10px;height:10px"></i></span>`;
    document.getElementById('tabs-bar').appendChild(tab);
    refreshIcons();
  }
  showEditorEmpty(false);
  switchTab(filename);
}

function closeTab(e, filename) {
  e.stopPropagation();
  const idx = openTabs.indexOf(filename);
  openTabs.splice(idx, 1);
  const tab = document.getElementById(`tab-${filename}`);
  if (tab) tab.remove();
  if (activeFile === filename) {
    if (openTabs.length > 0) {
      switchTab(openTabs[Math.max(0, idx - 1)]);
    } else {
      activeFile = null;
      document.getElementById('code-content').innerHTML = '';
      document.getElementById('bc-file').textContent = '';
      showEditorEmpty(true);
    }
  }
}

function deleteFile(e, filename) {
  e.stopPropagation();
  if (!confirm(`Delete "${filename}"?`)) return;
  delete files[filename];
  const treeItem = document.querySelector(`[data-file="${filename}"]`);
  if (treeItem) treeItem.remove();
  // update tree empty state
  if (!Object.keys(files).length) document.getElementById('tree-empty').style.display = '';
  // git tracking
  gitChanges.added.delete(filename);
  gitChanges.modified.delete(filename);
  if (!gitChanges.added.has(filename)) gitChanges.deleted.add(filename);
  updateGitPanel();
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
  item.querySelector('.file-icon').className = 'file-icon ' + fileIconClass(newName);
  item.querySelector('.file-icon').innerHTML = fileIconSvg(newName, 14);
  const nameEl = document.createElement('span');
  nameEl.className = 'file-name';
  nameEl.textContent = newName;
  input.replaceWith(nameEl);
  // update actions
  item.querySelector('.file-actions').innerHTML = `<span class="file-action-btn" onclick="startRename(event,'${newName}')" title="Rename"><i data-lucide="pencil" style="width:11px;height:11px"></i></span><span class="file-action-btn" onclick="deleteFile(event,'${newName}')" title="Delete"><i data-lucide="trash-2" style="width:11px;height:11px"></i></span>`;
  // update tab if open
  const tabIdx = openTabs.indexOf(oldName);
  if (tabIdx !== -1) {
    openTabs[tabIdx] = newName;
    const oldTab = document.getElementById(`tab-${oldName}`);
    if (oldTab) { oldTab.id = `tab-${newName}`; oldTab.innerHTML = `<span class="tab-icon ${fileIconClass(newName)}">${fileIconSvg(newName,12)}</span>${newName}<span class="tab-close" onclick="closeTab(event,'${newName}')"><i data-lucide="x" style="width:10px;height:10px"></i></span>`; oldTab.onclick = () => switchTab(newName); refreshIcons(); }
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
  { label: 'Run Code',         icon: 'play',               tag: 'action', kbd: 'Ctrl+Enter', fn: runCode },
  { label: 'Toggle Sidebar',   icon: 'panel-left',         tag: 'action', kbd: 'Ctrl+B',     fn: toggleSidebar },
  { label: 'AI Assistant',     icon: 'sparkles',           tag: 'action', kbd: 'Ctrl+I',     fn: toggleAI },
  { label: 'Find in File',     icon: 'search',             tag: 'action', kbd: 'Ctrl+F',     fn: openFindBar },
  { label: 'New File',         icon: 'file-plus',          tag: 'action',                    fn: openNewFileModal },
  { label: 'Toggle Word Wrap', icon: 'wrap-text',          tag: 'action', kbd: 'Alt+Z',      fn: toggleWordWrap },
  { label: 'Deploy to Render', icon: 'cloud',              tag: 'deploy',                    fn: () => deployTo('Render') },
  { label: 'Deploy to Railway',icon: 'train-front',        tag: 'deploy',                    fn: () => deployTo('Railway') },
  { label: 'Git Push',         icon: 'arrow-up-from-line', tag: 'git',                       fn: () => gitAction('push') },
  { label: 'Git Pull',         icon: 'arrow-down-from-line',tag:'git',                       fn: () => gitAction('pull') },
  { label: 'New Branch',       icon: 'git-branch',         tag: 'git',                       fn: () => gitAction('branch') },
  { label: 'Focus Terminal',   icon: 'terminal',           tag: 'action', kbd: 'Ctrl+`',     fn: focusTerminal },
  { label: 'Clear Terminal',   icon: 'trash-2',            tag: 'action',                    fn: clearTerminal },
  { label: 'Run Preview',      icon: 'monitor',            tag: 'action',                    fn: () => { switchPanel('preview', document.getElementById('ptab-preview')); showPreview(); } },
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
      html += `<div class="cmd-item${cmdItems.length-1===0?' sel':''}" onclick="runCmd(${cmdItems.length-1})"><span class="cmd-icon">${fileIconSvg(item.label,14)}</span><span class="cmd-label">${item.label}</span><span class="cmd-tag">${item.tag}</span></div>`;
    });
  }

  if (cmdItems2.length) {
    html += `<div class="cmd-section">Commands</div>`;
    cmdItems2.forEach(item => {
      cmdItems.push(item);
      html += `<div class="cmd-item" onclick="runCmd(${cmdItems.length-1})"><span class="cmd-icon"><i data-lucide="${item.icon}" style="width:14px;height:14px"></i></span><span class="cmd-label">${item.label}</span>${item.kbd ? `<span class="cmd-kbd">${item.kbd}</span>` : `<span class="cmd-tag">${item.tag}</span>`}</div>`;
    });
  }

  if (!html) html = `<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">No results</div>`;
  resultsEl.innerHTML = html;
  refreshIcons();
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
  const ext = f.split('.').pop().toLowerCase();
  return {py:'file-code-2',js:'file-code-2',html:'globe',css:'palette',md:'file-text',txt:'file-text',env:'lock',txt:'list'}[ext] || 'file';
}
function fileIconClass(f) {
  const ext = f.split('.').pop().toLowerCase();
  return {py:'fi-py',js:'fi-js',html:'fi-html',css:'fi-css',md:'fi-md',env:'fi-env'}[ext] || '';
}
function fileIconSvg(f, size=14) {
  const name = getFileIcon(f);
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
}
function refreshIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
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
  document.querySelector('.panel-toggle').innerHTML = panelOpen ? '<i data-lucide="chevron-down" style="width:14px;height:14px"></i>' : '<i data-lucide="chevron-up" style="width:14px;height:14px"></i>'; refreshIcons();
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
    document.querySelector('.panel-toggle').innerHTML = '<i data-lucide="chevron-down" style="width:14px;height:14px"></i>'; refreshIcons();
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

async function processCommand(cmd) {
  const lower = cmd.toLowerCase().trim();

  // Local-only commands
  if (termCommands[lower]) { termCommands[lower](); return; }

  // Send to real backend terminal
  addTermOutput('Running...', 'info');
  try {
    const res = await fetch('/terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd, files })
    });
    const data = await res.json();
    const lines = (data.output || '').split('\n');
    lines.forEach(line => { if (line !== '') addTermOutput(line, data.error ? 'err' : 'out'); });
  } catch (e) {
    addTermOutput('Network error: could not reach server', 'err');
  }
}

async function runCode() {
  if (!activeFile) { notify('No file open', 'error'); return; }
  const code = files[activeFile] || '';
  const ext = activeFile.split('.').pop().toLowerCase();
  switchPanel('terminal', document.getElementById('ptab-terminal'));
  addTermLine(`run ${activeFile}`);
  addTermOutput('Executing...', 'info');
  try {
    const res = await fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, lang: ext, filename: activeFile })
    });
    const data = await res.json();
    if (data.preview) { showPreview(); addTermOutput(data.output, 'info'); return; }
    const lines = (data.output || '').split('\n');
    lines.forEach(line => { if (line !== '') addTermOutput(line, data.error ? 'err' : 'out'); });
    if (!data.error) notify(`✓ ${activeFile} ran successfully`, 'success');
  } catch (e) {
    addTermOutput('Network error: could not reach server', 'err');
  }
}

function showPreview() {
  const placeholder = document.getElementById('preview-placeholder');
  const frame = document.getElementById('preview-frame');
  if (placeholder) placeholder.style.display = 'none';
  if (frame) {
    frame.style.display = 'block';
    const activeExt = (activeFile || '').split('.').pop().toLowerCase();
    let htmlContent = null;
    if (activeExt === 'html') {
      htmlContent = files[activeFile];
    } else {
      const htmlFile = Object.keys(files).find(f => f.toLowerCase().endsWith('.html'));
      if (htmlFile) htmlContent = files[htmlFile];
    }
    frame.srcdoc = htmlContent || '<h1>No HTML file found</h1>';
  }
  notify('Preview ready', 'success');
}

function refreshPreview() { showPreview(); notify('Preview refreshed', 'success'); }


// ═══════════════════════════════════════════════
// SPLIT VIEW
// ═══════════════════════════════════════════════
function toggleSplitView() {
  splitViewActive = !splitViewActive;
  const editorArea = document.querySelector('.editor-area');
  const splitPane  = document.getElementById('split-preview');
  const splitRes   = document.getElementById('split-v-resize');
  const btn        = document.getElementById('split-view-btn');

  if (splitViewActive) {
    editorArea.classList.add('split-view');
    splitPane.style.display  = 'flex';
    splitRes.style.display   = 'block';
    if (btn) btn.style.color = 'var(--accent)';
    updateSplitPreview();
    initSplitResize();
  } else {
    editorArea.classList.remove('split-view');
    splitPane.style.display  = 'none';
    splitRes.style.display   = 'none';
    if (btn) btn.style.color = '';
  }
  refreshIcons();
}

function updateSplitPreview() {
  if (!splitViewActive) return;
  const frame = document.getElementById('split-preview-frame');
  if (!frame) return;
  let htmlContent = null;
  const activeExt = (activeFile || '').split('.').pop().toLowerCase();
  if (activeExt === 'html') {
    htmlContent = files[activeFile];
  } else {
    const htmlFile = Object.keys(files).find(f => f.toLowerCase().endsWith('.html'));
    if (htmlFile) htmlContent = files[htmlFile];
  }
  frame.srcdoc = htmlContent || '<div style="font-family:sans-serif;padding:20px;color:#888">No HTML file found</div>';
}

function refreshSplitPreview() {
  updateSplitPreview();
  notify('Preview refreshed', 'success');
}

function initSplitResize() {
  const handle = document.getElementById('split-v-resize');
  if (handle._init) return;
  handle._init = true;
  let startX, startLeft, startRight;
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const area = document.querySelector('.editor-area');
    const pane = document.getElementById('editor-pane');
    const preview = document.getElementById('split-preview');
    startX = e.clientX;
    startLeft = pane.offsetWidth;
    startRight = preview.offsetWidth;
    handle.classList.add('dragging');
    const onMove = ev => {
      const dx = ev.clientX - startX;
      const total = startLeft + startRight;
      const newLeft = Math.max(150, Math.min(total - 150, startLeft + dx));
      pane.style.flex = 'none';
      pane.style.width = newLeft + 'px';
      preview.style.flex = '1';
    };
    const onUp = () => {
      handle.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ═══════════════════════════════════════════════
// GIT ACTIONS
// ═══════════════════════════════════════════════
function gitCommit() {
  const msg = document.getElementById('commit-msg').value.trim();
  if (!msg) { notify('Enter a commit message', 'error'); return; }
  switchPanel('terminal', document.getElementById('ptab-terminal'));
  addTermLine(`git commit -m "${msg}"`);
  addTermOutput(`[main ${Math.random().toString(16).slice(2,9)}] ${msg}`, 'success');
  addTermOutput(` ${gitChanges.modified.size + gitChanges.added.size} file(s) changed`, 'out');
  document.getElementById('commit-msg').value = '';
  // clear git tracking after commit
  gitChanges.modified.clear();
  gitChanges.added.clear();
  gitChanges.deleted.clear();
  updateGitPanel();
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

  const treeItem = document.createElement('div');
  treeItem.className = 'tree-item';
  treeItem.setAttribute('data-file', name);
  treeItem.onclick = () => openFile(name);
  treeItem.setAttribute('oncontextmenu', `showCtxMenu(event,'${name}')`);
  treeItem.innerHTML = `<span class="file-icon ${fileIconClass(name)}">${fileIconSvg(name)}</span><span class="file-name">${name}</span><div class="file-actions"><span class="file-action-btn" onclick="startRename(event,'${name}')" title="Rename"><i data-lucide="pencil" style="width:11px;height:11px"></i></span><span class="file-action-btn" onclick="deleteFile(event,'${name}')" title="Delete"><i data-lucide="trash-2" style="width:11px;height:11px"></i></span></div>`;
  document.getElementById('tab-explorer').querySelector('#tree-items').appendChild(treeItem);
  refreshIcons();
  // update tree empty state
  document.getElementById('tree-empty').style.display = 'none';
  // track as new file in git
  gitChanges.added.add(name);
  gitChanges.modified.delete(name);
  updateGitPanel();

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
      <div style="color:var(--text2);font-size:12px;display:flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace"><span class="${fileIconClass(f)}" style="display:flex">${fileIconSvg(f,12)}</span>${f}</div>
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
  msgs.innerHTML = `<div class="ai-msg-wrap bot"><div class="ai-msg bot">Chat cleared. কিছু জিজ্ঞেস করুন!</div></div>
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
  const userWrap = document.createElement('div');
  userWrap.className = 'ai-msg-wrap user';
  userWrap.innerHTML = `<div class="ai-msg user">${msg.replace(/</g,'&lt;')}</div>`;
  messages.appendChild(userWrap);

  const thinkDiv = document.createElement('div');
  thinkDiv.className = 'ai-thinking';
  thinkDiv.innerHTML = '<div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div>';
  messages.appendChild(thinkDiv);
  messages.scrollTop = messages.scrollHeight;

  aiHistory.push({ role: 'user', content: msg });

  const currentCode = files[activeFile] || '';
  const systemPrompt = `You are the AI coding assistant inside Exomnia DevKit, a mobile-first developer environment. Help the user concisely and practically. Current file: ${activeFile}\n\nFile content (first 1000 chars):\n${currentCode.slice(0, 1000)}\n\nRespond in a mix of English and Bengali when appropriate. Keep answers focused and actionable. Use \`backticks\` for code.`;

  try {
    let text = '';
    if (selectedProvider === 'deepseek') {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userDeepseekKey}` },
        body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 1000, messages: [{ role: 'system', content: systemPrompt }, ...aiHistory] })
      });
      const data = await resp.json();
      thinkDiv.remove();
      if (data.error) {
        const e = document.createElement('div'); e.className = 'ai-msg-wrap bot';
        e.innerHTML = `<div class="ai-msg bot" style="border-color:var(--red)">⚠ DeepSeek Error: ${data.error.message || 'Unknown'}</div>`;
        messages.appendChild(e); aiHistory.pop(); messages.scrollTop = messages.scrollHeight; return;
      }
      text = data.choices?.[0]?.message?.content || 'দুঃখিত, response পাওয়া যায়নি।';
    } else {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'x-api-key': userApiKey },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, system: systemPrompt, messages: aiHistory })
      });
      const data = await resp.json();
      thinkDiv.remove();
      if (data.error) {
        const e = document.createElement('div'); e.className = 'ai-msg-wrap bot';
        e.innerHTML = `<div class="ai-msg bot" style="border-color:var(--red)">⚠ Claude Error: ${data.error.message}</div>`;
        messages.appendChild(e); aiHistory.pop(); messages.scrollTop = messages.scrollHeight; return;
      }
      text = data.content?.[0]?.text || 'দুঃখিত, response পাওয়া যায়নি।';
    }
    aiHistory.push({ role: 'assistant', content: text });
    const botWrap = document.createElement('div');
    botWrap.className = 'ai-msg-wrap bot';
    const rendered = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');
    botWrap.innerHTML = `<div class="ai-msg bot">${rendered}</div><div class="ai-msg-actions"><button class="ai-act-btn" onclick="copyAIMsg(this)"><i data-lucide="copy" style="width:11px;height:11px"></i>Copy</button><button class="ai-act-btn" onclick="insertToEditor(this)"><i data-lucide="corner-down-left" style="width:11px;height:11px"></i>Insert</button></div>`;
    botWrap.dataset.raw = text;
    messages.appendChild(botWrap);
    refreshIcons();
  } catch (err) {
    thinkDiv.remove();
    const e = document.createElement('div'); e.className = 'ai-msg-wrap bot';
    e.innerHTML = `<div class="ai-msg bot" style="border-color:var(--red)">⚠ Connection error: ${err.message}</div>`;
    messages.appendChild(e); aiHistory.pop();
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
  if (btnClaude) btnClaude.className = 'ai-prov-btn' + (p === 'claude' ? ' active-claude' : '');
  if (btnDeep)   btnDeep.className   = 'ai-prov-btn' + (p === 'deepseek' ? ' active-deepseek' : '');
  const pulse = document.querySelector('.ai-pulse');
  if (pulse) pulse.className = p === 'deepseek' ? 'ai-pulse deepseek' : 'ai-pulse';
  const title = document.querySelector('.ai-title');
  if (title) title.textContent = p === 'deepseek' ? 'DeepSeek AI' : 'AI Assistant';
  updateKeyBtn();
}

function updateKeyBtn() {
  const keyBtn = document.getElementById('key-btn');
  if (keyBtn) keyBtn.style.display = 'none';
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
    if (tabC) tabC.className = 'prov-tab active-claude';
    if (tabD) tabD.className = 'prov-tab';
    if (sub)  sub.textContent = 'Anthropic API key দিয়ে Claude চালান। Key শুধু এই session-এ থাকবে।';
    if (inp)  { inp.placeholder = 'sk-ant-api03-...'; inp.value = userApiKey || ''; }
    if (link) link.innerHTML = 'Key নিন: <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color:var(--blue)">console.anthropic.com</a>';
  } else {
    if (tabC) tabC.className = 'prov-tab';
    if (tabD) tabD.className = 'prov-tab active-deepseek';
    if (sub)  sub.textContent = 'DeepSeek API key দিয়ে DeepSeek-V3 চালান। Key শুধু এই session-এ থাকবে।';
    if (inp)  { inp.placeholder = 'sk-...'; inp.value = userDeepseekKey || ''; }
    if (link) link.innerHTML = 'Key নিন: <a href="https://platform.deepseek.com/api-keys" target="_blank" style="color:var(--blue)">platform.deepseek.com</a>';
  }
  validateKeyInput();
}

function validateKeyInput() {
  const val = document.getElementById('key-input').value.trim();
  const btn = document.getElementById('key-save-btn');
  const valid = keyModalProvider === 'claude' ? val.startsWith('sk-ant-') : (val.startsWith('sk-') && val.length > 10);
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
  notify(`${name} API Key সেট হয়েছে! AI ready.`, 'success');
}

function copyAIMsg(btn) {
  const wrap = btn.closest('.ai-msg-wrap');
  const text = wrap?.dataset.raw || wrap?.querySelector('.ai-msg')?.innerText || '';
  navigator.clipboard.writeText(text).then(() => { btn.innerHTML = '<i data-lucide="check" style="width:11px;height:11px"></i>Copied'; refreshIcons(); setTimeout(() => { btn.innerHTML = '<i data-lucide="copy" style="width:11px;height:11px"></i>Copy'; refreshIcons(); }, 1500); });
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
  const iconNames = {info:'info',success:'check-circle-2',error:'x-circle'};
  notif.innerHTML = `<i data-lucide="${iconNames[type]||'info'}" style="width:14px;height:14px"></i>${msg}`;
  notif.onclick = () => notif.remove();
  container.appendChild(notif);
  refreshIcons();
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
  // Start with empty editor
  showEditorEmpty(true);

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  refreshIcons();
});
