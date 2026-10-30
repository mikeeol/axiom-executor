'use strict';
(() => {
  const glow = document.getElementById('glow');
  const ring = document.getElementById('ring');
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  let gx = tx, gy = ty;

  addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    ring.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
  }, { passive: true });

  addEventListener('mousedown', () => { ring.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(.7)'; });
  addEventListener('mouseup', () => { ring.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)'; });
  addEventListener('mouseleave', () => document.body.classList.add('no-glow'));
  addEventListener('mouseenter', () => document.body.classList.remove('no-glow'));

  (function loop() {
    gx += (tx - gx) * 0.14;
    gy += (ty - gy) * 0.14;
    glow.style.transform = 'translate(' + gx + 'px, ' + gy + 'px)';
    requestAnimationFrame(loop);
  })();

  window.setCursorGlow = (on) => document.body.classList.toggle('no-glow', !on);
})();
