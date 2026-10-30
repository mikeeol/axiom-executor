'use strict';
(() => {
  const host = document.getElementById('toasts');

  window.notify = (title, body, kind, ms) => {
    kind = kind || 'info';
    ms = ms || 4200;
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = '<strong></strong><span></span>';
    el.querySelector('strong').textContent = title;
    el.querySelector('span').textContent = body || '';
    host.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
    const t = setTimeout(kill, ms);
    el.addEventListener('click', () => { clearTimeout(t); kill(); });
    return el;
  };

  window.notifyInjection = (ok, detail) => ok
    ? notify('Injection succeeded', 'Script executed in the attached client.', 'ok')
    : notify('Injection failed', detail || 'Unknown error', 'bad', 8000);
})();
