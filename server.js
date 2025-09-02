const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const DATA_FILE = './data.json';

// serve static first
app.use(express.static(path.join(__dirname, 'public')));

// read/write helpers
function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Failed to read/parse data.json:', err);
    return [];
  }
}
function writeAll(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));
}

// add person
app.post('/people', (req, res) => {
  const { name, age } = req.body || {};
  const nameStr = typeof name === 'string' ? name.trim() : '';
  const ageNum = Number(age);
  if (!nameStr) return res.status(400).json({ error: 'name required' });
  if (!Number.isFinite(ageNum) || ageNum < 0) return res.status(400).json({ error: 'age must be a non-negative number' });
  const list = readAll();
  list.push({ name: nameStr, age: ageNum });
  writeAll(list);
  res.status(201).json({ ok: true });
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
