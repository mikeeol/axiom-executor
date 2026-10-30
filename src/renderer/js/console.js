'use strict';
(() => {
  const box = document.getElementById('console');
  const form = document.getElementById('console-form');
  const input = document.getElementById('console-input');
  const wrap = document.getElementById('console-wrap');
  const history = [];
  let hIndex = -1;

  window.log = (text, cls) => {
    const line = document.createElement('div');
    line.className = 'l ' + (cls || '');
    line.textContent = text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  };

  window.clearConsole = () => { box.textContent = ''; };

  window.toggleConsole = (force) => {
    const collapsed = force !== undefined ? !force : !wrap.classList.contains('collapsed');
    wrap.classList.toggle('collapsed', collapsed);
  };

  document.getElementById('btn-console-toggle').onclick = () => toggleConsole();
  document.getElementById('btn-clearconsole').onclick = clearConsole;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value;
    if (!value.trim()) return;
    history.push(value);
    hIndex = history.length;
    log('> ' + value, 'in');
    input.value = '';
    if (window.handleConsoleCommand) window.handleConsoleCommand(value.trim());
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hIndex > 0) input.value = history[--hIndex] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIndex < history.length - 1) input.value = history[++hIndex] || '';
      else { hIndex = history.length; input.value = ''; }
    }
  });

  log('Axiom Executor v2.0 ready. Type /help for commands.', 'dim');
})();
