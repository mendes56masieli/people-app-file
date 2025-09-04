const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
app.use(express.json());
console.log('[startup]', { file: __filename, cwd: process.cwd() });

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

// --- Simple gallery storage ---
const ITEMS_FILE = './items.json';
function readItems() {
  if (!fs.existsSync(ITEMS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ITEMS_FILE, 'utf8') || '[]'); }
  catch { return []; }
}
function writeItems(arr) { fs.writeFileSync(ITEMS_FILE, JSON.stringify(arr, null, 2)); }

// ensure upload dir
const uploadDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `${id}${ext || '.jpg'}`);
  }
});
const upload = multer({ storage });

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

// --- Gallery routes ---
// Add item with photo (multipart/form-data: title, photo)
app.post('/items', upload.single('photo'), (req, res) => {
  console.log('POST /items received');
  const title = (req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title required' });
  if (!req.file) return res.status(400).json({ error: 'photo file required' });
  const url = '/uploads/' + req.file.filename;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const items = readItems();
  const item = { id, title, url, createdAt: new Date().toISOString() };
  items.push(item);
  writeItems(items);
  console.log('Saved item:', item);
  res.status(201).json(item);
});

// List all items
app.get('/items', (_req, res) => {
  res.json(readItems());
});

// Search by title (q=)
app.get('/items/search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const items = readItems();
  res.json(items.filter(it => it.title.toLowerCase().includes(q)));
});

// Debug: list uploaded filenames
app.get('/debug/uploads', (_req, res) => {
  try {
    const files = fs.readdirSync(uploadDir).sort();
    res.json({ dir: '/uploads', count: files.length, files });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
// Debug route: list registered routes
app.get('/__routes', (_req, res) => {
  const routes = [];
  const stack = app._router && app._router.stack || [];
  for (const layer of stack) {
    if (layer.route) {
      routes.push({ path: layer.route.path, methods: Object.keys(layer.route.methods) });
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      for (const l of layer.handle.stack) {
        if (l.route) routes.push({ path: l.route.path, methods: Object.keys(l.route.methods) });
      }
    }
  }
  res.json(routes);
});

app.listen(PORT, HOST, () => {
  const hostShown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`File server on http://${hostShown}:${PORT} (bound to ${HOST})`);
  try {
    const res = [];
    const stack = app._router && app._router.stack || [];
    for (const layer of stack) {
      if (layer.route) res.push(layer.route.path);
    }
    console.log('Routes:', res.join(', '));
  } catch {}
});
