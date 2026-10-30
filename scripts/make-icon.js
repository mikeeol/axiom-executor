'use strict';
const fs = require('node:fs');
const path = require('node:path');

const S = 256;
const px = Buffer.alloc(S * S * 4);

const distToSeg = (x, y, x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1;
  const len = dx * dx + dy * dy || 1;
  let t = ((x - x1) * dx + (y - y1) * dy) / len;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
};

const glyph = [
  [78, 196, 128, 62],
  [178, 196, 128, 62],
  [96, 150, 160, 150]
];

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const cx = Math.min(x, S - 1 - x), cy = Math.min(y, S - 1 - y);
    const r = 52;
    let alpha = 255;
    if (cx < r && cy < r) {
      const d = Math.hypot(r - cx, r - cy);
      alpha = d > r ? 0 : d > r - 1.5 ? Math.round((r - d) / 1.5 * 255) : 255;
    }

    const t = y / S;
    let R = Math.round(168 - 150 * t);
    let G = Math.round(85 - 78 * t);
    let B = Math.round(247 - 230 * t);

    let g = Infinity;
    for (const [x1, y1, x2, y2] of glyph) g = Math.min(g, distToSeg(x, y, x1, y1, x2, y2));
    if (g < 12) {
      const k = g < 9 ? 1 : 1 - (g - 9) / 3;
      R = Math.round(R + (255 - R) * k);
      G = Math.round(G + (255 - G) * k);
      B = Math.round(B + (255 - B) * k);
    }

    px[i] = B; px[i + 1] = G; px[i + 2] = R; px[i + 3] = alpha;
  }
}

const xor = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) px.copy(xor, (S - 1 - y) * S * 4, y * S * 4, (y + 1) * S * 4);

const andMask = Buffer.alloc((S / 8) * S);

const header = Buffer.alloc(40);
header.writeUInt32LE(40, 0);
header.writeInt32LE(S, 4);
header.writeInt32LE(S * 2, 8);
header.writeUInt16LE(1, 12);
header.writeUInt16LE(32, 14);
header.writeUInt32LE(xor.length + andMask.length, 20);

const image = Buffer.concat([header, xor, andMask]);

const ico = Buffer.alloc(6 + 16);
ico.writeUInt16LE(0, 0);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico[6] = 0; ico[7] = 0;
ico[8] = 0; ico[9] = 0;
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(image.length, 14);
ico.writeUInt32LE(22, 18);

const outDir = path.join(__dirname, '../build');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.ico'), Buffer.concat([ico, image]));
console.log('build/icon.ico written');
