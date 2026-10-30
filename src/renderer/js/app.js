'use strict';
(() => {
  const api = window.axiom;
  const LICENSE_CODE = 'AXIOM-2026';

  const state = { enabled: false, injected: false, roblox: [] };
  const $ = (id) => document.getElementById(id);

  function paintStatus() {
    const rb = $('pill-roblox');
    rb.classList.toggle('on', state.roblox.length > 0);
    rb.querySelector('span').textContent = state.roblox.length ? 'Roblox (' + state.roblox.length + ')' : 'Roblox';

    const inj = $('pill-inject');
    inj.classList.toggle('on', state.injected);
    inj.querySelector('span').textContent = state.injected ? 'Injected' : 'Detached';

    const lic = $('pill-license');
    lic.classList.toggle('on', state.enabled);
    lic.classList.toggle('warn', !state.enabled);
    lic.querySelector('span').textContent = state.enabled ? 'Unlocked' : 'Locked';
  }

  async function refreshStatus() {
    const s = await api.engine.status();
    state.roblox = s.roblox;
    state.injected = s.injected;
    paintStatus();
    return s;
  }

  setInterval(refreshStatus, 3000);

  window.Tabs.onChange(() => {
    const tab = window.Tabs.active();
    if (!tab) { if (window.Editor) window.Editor.setValue(''); return; }
    if (window.Editor) { window.Editor.setValue(tab.code); window.Editor.focus(); }
  });

  addEventListener('editor-ready', () => {
    if (!window.Tabs.all().length) window.Tabs.create({ name: 'untitled.lua' });
  });

  async function openFiles() {
    const files = await api.file.open();
    for (const f of files) {
      const tab = window.Tabs.create({ name: f.name, code: f.code, path: f.path });
      if (window.Editor) window.Editor.setValue(tab.code);
    }
    if (files.length) window.notify('Opened', files.length + ' file(s)');
  }

  async function saveFile(as) {
    const tab = window.Tabs.active();
    if (!tab) return;
    const target = as ? null : tab.path;
    const saved = await api.file.save(target, window.Editor.value());
    if (!saved) return;
    window.Tabs.setName(tab.id, saved.split(/[\\/]/).pop(), saved);
    window.notify('Saved', saved);
  }

  async function openFolder() {
    const tree = await api.file.openFolder();
    if (!tree) return;
    renderTree(tree, $('tree'));
  }

  function renderTree(node, host) {
    host.textContent = '';
    const walk = (children, parent, level) => {
      for (const child of children) {
        const el = document.createElement('button');
        el.className = 'node' + (child.type === 'dir' ? ' dir' : '');
        el.textContent = (child.type === 'dir' ? '\u{1F4C1} ' : '\u{1F4C4} ') + child.name;
        el.style.paddingLeft = (8 + level * 12) + 'px';
        el.onclick = async () => {
          if (child.type === 'dir') {
            if (child.open) { child.open = false; if (el.nextElementSibling) el.nextElementSibling.remove(); return; }
            child.open = true;
            const box = document.createElement('div');
            el.after(box);
            walk(child.children || [], box, level + 1);
            return;
          }
          const code = await api.file.read(child.path);
          const tab = window.Tabs.create({ name: child.name, code: code, path: child.path });
          if (window.Editor) window.Editor.setValue(tab.code);
        };
        parent.appendChild(el);
      }
    };
    walk(node.children || [], host, 0);
  }

  async function ensureReady() {
    if (!state.enabled) {
      window.log('Locked. Type /enablecode AXIOM-2026', 'err');
      window.notify('Executor locked', 'Type /enablecode AXIOM-2026 in the console.');
      return false;
    }
    await refreshStatus();
    if (!state.roblox.length) {
      window.notify('Injection failed', 'Roblox is not running.', 'bad');
      return false;
    }
    return true;
  }

  async function inject(quiet) {
    if (!state.enabled) {
      if (!quiet) await ensureReady();
      else return false;
    }
    const btn = $('btn-inject');
    btn.disabled = true;
    btn.textContent = 'Injecting...';
    try {
      const res = await api.engine.inject();
      state.injected = !!res.ok;
      paintStatus();
      if (res.ok) {
        window.log('Attached via ' + res.pipe + ' (pid ' + res.pid + ')', 'ok');
        window.notify('Injection succeeded', 'DLL attached and pipe is live.', 'ok');
        return true;
      }
      window.log('Inject failed: ' + res.error, 'err');
      window.notifyInjection(false, res.error);
      return false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Inject';
    }
  }

  async function runSource(source, label) {
    label = label || 'script';
    if (!source.trim()) { window.notify('Nothing to run', 'The editor is empty.'); return; }
    if (!(await ensureReady())) return;

    if (!state.injected) {
      const ok = await inject(true);
      if (!ok) return;
    }

    const res = await api.engine.execute(source);
    if (res.ok) {
      window.notifyInjection(true);
      window.log('Executed ' + label, 'ok');
      if (res.output) window.log(res.output, 'dim');
    } else {
      window.notifyInjection(false, res.error);
      window.log(res.stage + ': ' + res.error, 'err');
      state.injected = false;
      paintStatus();
    }
  }

  window.executeActive = () => {
    const tab = window.Tabs.active();
    if (!tab) { window.notify('No tab', 'Open or create a script first.'); return; }
    runSource(window.Editor.value(), tab.name);
  };

  const modal = $('modal');
  const modalCode = $('modal-code');
  const modalNote = $('modal-note');

  function openModal() {
    modal.hidden = false;
    modalNote.textContent = 'Runs instantly in the attached client.';
    modalNote.classList.remove('bad');
    modalCode.focus();
  }
  function closeModal() { modal.hidden = true; }

  $('modal-close').onclick = closeModal;
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) closeModal(); });

  $('modal-paste').onclick = async () => {
    try {
      modalCode.value = await navigator.clipboard.readText();
    } catch {
      modalNote.textContent = 'Clipboard unavailable - paste manually.';
      modalNote.classList.add('bad');
    }
  };

  $('modal-inject').onclick = async () => {
    const code = modalCode.value;
    if (!code.trim()) {
      modalNote.textContent = 'Type a script first.';
      modalNote.classList.add('bad');
      return;
    }
    const btn = $('modal-inject');
    btn.disabled = true;
    btn.textContent = 'Injecting...';
    modalNote.textContent = 'Attaching...';
    modalNote.classList.remove('bad');

    const ready = await ensureReady();
    if (!ready) {
      btn.disabled = false;
      btn.textContent = 'Inject';
      modalNote.textContent = 'Not ready - see console.';
      modalNote.classList.add('bad');
      return;
    }

    if (!state.injected) {
      const ok = await inject(true);
      if (!ok) {
        btn.disabled = false;
        btn.textContent = 'Inject';
        modalNote.textContent = 'Injection failed - see console.';
        modalNote.classList.add('bad');
        return;
      }
    }

    const res = await api.engine.execute(code);
    btn.disabled = false;
    btn.textContent = 'Inject';

    if (res.ok) {
      window.notifyInjection(true);
      modalNote.textContent = 'Injection succeeded.';
      modalNote.classList.remove('bad');
      window.log('Custom script executed', 'ok');
      setTimeout(closeModal, 900);
    } else {
      window.notifyInjection(false, res.error);
      modalNote.textContent = 'Injection failed: ' + res.error;
      modalNote.classList.add('bad');
      window.log('Custom script failed: ' + res.error, 'err');
      state.injected = false;
      paintStatus();
    }
  };

  window.handleConsoleCommand = async (raw) => {
    const parts = raw.split(/\s+/);
    const cmd = parts[0];
    const arg = parts.slice(1).join(' ');

    switch (cmd.toLowerCase()) {
      case '/help':
        window.log('/enablecode <code>  unlock the executor', 'dim');
        window.log('/attach             inject manually', 'dim');
        window.log('/detach             detach the DLL', 'dim');
        window.log('/status             print status', 'dim');
        window.log('/run <lua>          run inline lua', 'dim');
        window.log('/clear              clear console', 'dim');
        break;

      case '/enablecode':
        if (arg.trim().toUpperCase() === LICENSE_CODE) {
          state.enabled = true;
          paintStatus();
          window.log('Executor unlocked. Axiom online.', 'ok');
          window.notify('Unlocked', 'Axiom is ready. Inject to begin.', 'ok');
        } else {
          window.log('Invalid code. Try /enablecode AXIOM-2026', 'err');
        }
        break;

      case '/attach': await inject(); break;
      case '/detach':
        await api.engine.detach();
        state.injected = false;
        paintStatus();
        window.log('Detached', 'dim');
        break;
      case '/status':
        await refreshStatus();
        window.log('roblox=' + state.roblox.length + ' injected=' + state.injected + ' unlocked=' + state.enabled, 'dim');
        break;
      case '/run': await runSource(arg, 'inline'); break;
      case '/clear': window.clearConsole(); break;

      default:
        if (raw.charAt(0) === '/') window.log('Unknown command ' + cmd, 'err');
        else await runSource(raw, 'inline');
    }
  };

  async function applySettings() {
    const s = await api.store.all();
    document.documentElement.style.setProperty('--accent', s.accent);
    $('set-font').value = s.fontSize;
    $('set-wrap').checked = s.wordWrap;
    $('set-minimap').checked = s.minimap;
    $('set-autoattach').checked = s.autoAttach;
    $('set-glow').checked = s.cursorGlow;
    $('set-anim').checked = s.animations;
    $('set-accent').value = s.accent;
    document.body.classList.toggle('no-anim', !s.animations);
    if (window.setCursorGlow) window.setCursorGlow(s.cursorGlow);
    if (window.Editor) window.Editor.options({ fontSize: s.fontSize, wordWrap: s.wordWrap ? 'on' : 'off', minimap: { enabled: s.minimap } });
  }

  const bind = (id, key, cast, after) => {
    $(id).addEventListener('input', async (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : (cast ? cast(e.target.value) : e.target.value);
      await api.store.set(key, value);
      if (after) after(value);
    });
  };

  bind('set-font', 'fontSize', Number, (v) => { if (window.Editor) window.Editor.options({ fontSize: v }); });
  bind('set-wrap', 'wordWrap', null, (v) => { if (window.Editor) window.Editor.options({ wordWrap: v ? 'on' : 'off' }); });
  bind('set-minimap', 'minimap', null, (v) => { if (window.Editor) window.Editor.options({ minimap: { enabled: v } }); });
  bind('set-autoattach', 'autoAttach');
  bind('set-glow', 'cursorGlow', null, (v) => { if (window.setCursorGlow) window.setCursorGlow(v); });
  bind('set-anim', 'animations', null, (v) => document.body.classList.toggle('no-anim', !v));
  bind('set-accent', 'accent', (v) => v, (v) => document.documentElement.style.setProperty('--accent', v));

  $('btn-detach').onclick = async () => {
    await api.engine.detach();
    state.injected = false;
    paintStatus();
    window.log('Detached', 'dim');
  };

  $('btn-inject').onclick = () => inject();
  $('btn-exec').onclick = () => window.executeActive();
  $('btn-newfile').onclick = () => { const t = window.Tabs.create(); if (window.Editor) window.Editor.setValue(t.code); };
  $('btn-openfolder').onclick = openFolder;
  $('win-min').onclick = () => api.win.minimize();
  $('win-max').onclick = () => api.win.maximize();
  $('win-close').onclick = () => api.win.close();

  document.querySelectorAll('.navbtn').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('.navbtn').forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + btn.dataset.panel));
    };
  });

  api.onMenu((ch) => {
    const map = {
      new: () => { const t = window.Tabs.create(); if (window.Editor) window.Editor.setValue(t.code); },
      open: openFiles,
      openFolder: openFolder,
      save: () => saveFile(false),
      saveAs: () => saveFile(true),
      execute: () => window.executeActive(),
      inject: () => inject(),
      custom: openModal,
      console: () => window.toggleConsole(),
      palette: () => openModal()
    };
    if (map[ch]) map[ch]();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  applySettings();
  refreshStatus();
  paintStatus();
})();
