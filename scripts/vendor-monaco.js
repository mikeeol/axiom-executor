'use strict';
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '../node_modules/monaco-editor/min/vs');
const dest = path.join(__dirname, '../src/renderer/vendor/vs');

if (!fs.existsSync(src)) {
  console.error('monaco-editor not installed. Run npm install first.');
  process.exit(1);
}
fs.rmSync(path.dirname(dest), { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('monaco vendored ->', dest);
