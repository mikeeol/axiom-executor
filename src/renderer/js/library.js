'use strict';
(() => {
  const list = document.getElementById('lib-list');
  const search = document.getElementById('lib-search');
  let data = [];

  async function load() {
    const res = await fetch('data/library.json');
    data = await res.json();
    render(data);
  }

  function render(items) {
    list.textContent = '';
    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'No matches.';
      list.appendChild(p);
      return;
    }
    for (const item of items) {
      const b = document.createElement('button');
      b.className = 'libcard';
      b.innerHTML = '<strong></strong><span></span>';
      b.querySelector('strong').textContent = item.title;
      b.querySelector('span').textContent = item.tags.join(' · ');
      b.onclick = () => {
        const tab = window.Tabs.create({ name: item.slug + '.lua', code: item.code });
        if (window.Editor) window.Editor.setValue(tab.code);
        window.notify('Loaded from library', item.title);
      };
      list.appendChild(b);
    }
  }

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    if (!q) return render(data);
    render(data.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      i.tags.some((t) => t.includes(q)) ||
      i.code.toLowerCase().includes(q)
    ));
  });

  load();
})();
