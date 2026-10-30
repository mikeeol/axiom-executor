
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const filePath = path.join(app.getPath('userData'), 'settings.json');
let data = {};

try {
  data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch {
  data = {};
}

function save() {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function get(key) {
  return data[key];
}

function set(key, value) {
  if (typeof key !== 'string') throw new Error('Invalid key');
  data[key] = value;
  save();
  return value;
}

function all() {
  return { ...data };
}

module.exports = { get, set, all };
