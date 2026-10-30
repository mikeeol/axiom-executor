'use strict';
(() => {
  const strip = document.getElementById('tabstrip');
  const state = { tabs: [], active: null, seq: 0 };
  let onChange = () => {};

  const find = (id) => state.tabs.find((t) => t.id === id);

  window.Tabs = {
    all: () => state.tabs,
    active: () => (state.active ? find(state.active) : null),
    onChange(fn) { onChange = fn; },

    create(opts) {
      opts = opts || {};
      const tab = { id: ++state.seq, name: opts.name || 'untitled.lua', code: opts.code || '', path: opts.path || null, dirty: false };
      state.tabs.push(tab);
      window.Tabs.activate(tab.id);
      return tab;
    },

    activate(id) {
      if (!find(id)) return;
      state.active = id;
      render();
      onChange();
    },

    close(id) {
      const i = state.tabs.findIndex((t) => t.id === id);
      if (i === -1) return;
      state.tabs.splice(i, 1);
      if (state.active === id) {
        const next = state.tabs[Math.min(i, state.tabs.length - 1)];
        state.active = next ? next.id : null;
      }
      render();
      onChange();
    },

    setCode(id, code) {
      const t = find(id);
      if (!t) return;
      t.code = code;
      if (!t.dirty) { t.dirty = true; render(); }
    },

    setName(id, name, p) {
      const t = find(id);
      if (!t) return;
      t.name = name;
      if (p !== undefined) t.path = p;
      t.dirty = false;
      render();
    }
  };

  function render() {
    strip.textContent = '';
    for (const t of state.tabs) {
      const el = document.createElement('div');
      el.className = 'tab' + (t.id === state.active ? ' active' : '') + (t.dirty ? ' dirty' : '');
      el.innerHTML = '<span class="dot"></span><span class="label"></span><button class="x">&#10005;</button>';
      el.querySelector('.label').textContent = t.name;
      el.title = t.path || t.name;
      el.onclick = (e) => { if (!e.target.classList.contains('x')) window.Tabs.activate(t.id); };
      el.querySelector('.x').onclick = (e) => { e.stopPropagation(); window.Tabs.close(t.id); };
      strip.appendChild(el);
    }
  }

  render();
})();
