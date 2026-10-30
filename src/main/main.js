'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const engine = require('./engine');
const store = require('./store');

const isDev = process.argv.includes('--dev');

/** @type {BrowserWindow|null} */
let win = null;

app.setAppUserModelId('ai.axiom.executor');
nativeTheme.themeSource = 'dark';
app.disableHardwareAcceleration === undefined || app.commandLine.appendSwitch('enable-features', 'MonacoEditor');

// Single instance
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 620,
    show: false,
    frame: false,
    backgroundColor: '#07060b',
    title: 'Axiom Executor',
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: true
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  win.once('ready-to-show', () => {
    win.show();
    if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  });

  // Harden navigation
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  win.on('maximize', () => win.webContents.send('win:state', true));
  win.on('unmaximize', () => win.webContents.send('win:state', false));
  win.on('closed', () => { win = null; });
}

/* ---------- IPC: window ---------- */
ipcMain.handle('win:minimize', () => win?.minimize());
ipcMain.handle('win:maximize', () => {
  if (!win) return false;
  win.isMaximized() ? win.unmaximize() : win.maximize();
  return win.isMaximized();
});
ipcMain.handle('win:close', () => win?.close());

/* ---------- IPC: files ---------- */
ipcMain.handle('file:open', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Open script',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Lua script', extensions: ['lua', 'luau', 'txt'] }, { name: 'All files', extensions: ['*'] }]
  });
  if (res.canceled) return [];
  const out = [];
  for (const p of res.filePaths) {
    try {
      const stat = await fs.stat(p);
      if (stat.size > 4 * 1024 * 1024) continue;
      out.push({ path: p, name: path.basename(p), code: await fs.readFile(p, 'utf8') });
    } catch { /* ignore */ }
  }
  return out;
});

ipcMain.handle('file:openFolder', async () => {
  const res = await dialog.showOpenDialog(win, { title: 'Open script folder', properties: ['openDirectory'] });
  if (res.canceled) return null;
  const root = res.filePaths[0];

  async function walk(dir, depth) {
    if (depth > 4) return [];
    let entries = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
    const nodes = [];
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) nodes.push({ type: 'dir', name: e.name, path: full, children: await walk(full, depth + 1) });
      else if (/\.(lua|luau|txt)$/i.test(e.name)) nodes.push({ type: 'file', name: e.name, path: full });
    }
    return nodes;
  }
  return { root, name: path.basename(root), children: await walk(root, 0) };
});

ipcMain.handle('file:read', async (_e, p) => {
  if (typeof p !== 'string') throw new Error('bad path');
  const stat = await fs.stat(p);
  if (stat.size > 4 * 1024 * 1024) throw new Error('File too large (4 MB max)');
  return fs.readFile(p, 'utf8');
});

ipcMain.handle('file:save', async (_e, p, code) => {
  if (typeof code !== 'string') throw new Error('bad code');
  if (p) { await fs.writeFile(p, code, 'utf8'); return p; }
  const res = await dialog.showSaveDialog(win, {
    title: 'Save script',
    defaultPath: 'script.lua',
    filters: [{ name: 'Lua script', extensions: ['lua'] }, { name: 'All files', extensions: ['*'] }]
  });
  if (res.canceled || !res.filePath) return null;
  await fs.writeFile(res.filePath, code, 'utf8');
  return res.filePath;
});

/* ---------- IPC: engine ---------- */
ipcMain.handle('engine:status', async () => ({
  roblox: await engine.robloxProcesses(),
  injected: engine.isInjected(),
  pipe: engine.activePipe()
}));

ipcMain.handle('engine:inject', async () => engine.inject());

ipcMain.handle('engine:detach', async () => engine.detach());

ipcMain.handle('engine:execute', async (_e, source) => {
  if (typeof source !== 'string') throw new Error('bad script');
  if (source.length > 8 * 1024 * 1024) throw new Error('Script exceeds 8 MB');
  return engine.execute(source);
});

/* ---------- IPC: store ---------- */
ipcMain.handle('store:get', (_e, key) => store.get(key));
ipcMain.handle('store:set', (_e, key, value) => store.set(key, value));
ipcMain.handle('store:all', () => store.all());

/* ---------- hidden menu (accelerators) ---------- */
function buildMenu() {
  const send = (ch) => win?.webContents.send('menu', ch);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: 'Open', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { label: 'Open Folder', accelerator: 'CmdOrCtrl+Shift+O', click: () => send('openFolder') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Save As', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', role: 'quit' }
      ]
    },
    {
      label: 'Run',
      submenu: [
        { label: 'Execute', accelerator: 'F5', click: () => send('execute') },
        { label: 'Inject', accelerator: 'F6', click: () => send('inject') },
        { label: 'Custom Script', accelerator: 'F7', click: () => send('custom') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Console', accelerator: 'CmdOrCtrl+`', click: () => send('console') },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+K', click: () => send('palette') },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => win?.reload() }
      ]
    }
  ]));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
