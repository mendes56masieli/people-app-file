const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

const DATA_FILE = './data.json';

// read/write helpers
function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]');
}
function writeAll(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));
}

// add person
app.post('/people', (req, res) => {
  const { name, age } = req.body || {};
  if (!name || !age) return res.status(400).json({ error: 'name and age required' });
  const list = readAll();
  list.push({ name, age: String(age) });
  writeAll(list);
  res.json({ ok: true });
});

// list all
app.get('/people', (_req, res) => {
  res.json(readAll());
});

// search by name or age (q=)
app.get('/people/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const list = readAll();
  const out = list.filter(p =>
    p.name.toLowerCase().includes(q) || String(p.age).includes(q)
  );
  res.json(out);
});

app.listen(3000, () => console.log('File server on http://localhost:3000'));
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

