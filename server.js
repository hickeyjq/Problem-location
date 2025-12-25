const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.resolve(__dirname, 'db.json');

function loadDB(){
  try{
    if(!fs.existsSync(DB_FILE)){
      fs.writeFileSync(DB_FILE, JSON.stringify({ bugs: [] }, null, 2), 'utf8');
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    // 规范化每条记录，补齐可能缺失的字段，便于前端显示一致的数据结构
    if(!db || typeof db !== 'object') {
      const fresh = { bugs: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(fresh, null, 2), 'utf8');
      return fresh;
    }
    if(!Array.isArray(db.bugs)) db.bugs = [];
    let changed = false;
    db.bugs = db.bugs.map(b => {
      if(!b || typeof b !== 'object') {
        changed = true;
        return { id: '', symptom: '', category: '未分类', solution: '', link: '', tags: [] };
      }
      if(!('id' in b)) { b.id = ''; changed = true; }
      if(!('symptom' in b)) { b.symptom = ''; changed = true; }
      if(!('category' in b)) { b.category = '未分类'; changed = true; }
      if(!('solution' in b)) { b.solution = ''; changed = true; }
      if(!('link' in b)) { b.link = ''; changed = true; }
      if(!Array.isArray(b.tags)) { b.tags = []; changed = true; }
      return b;
    });
    if(changed) {
      try{ fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); }catch(e){ console.error('failed to write normalized db', e); }
    }
    return db;
  }catch(e){
    console.error('loadDB error', e);
    return { bugs: [] };
  }
}

function saveDB(db){
  try{
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  }catch(e){
    console.error('saveDB error', e);
  }
}

let store = loadDB();


const app = express();
app.use(cors());
app.use(express.json());
// 提供静态文件服务，支持直接访问 index.html、app.js、styles.css
app.use(express.static(__dirname));

// GET /api/bugs  支持 ?q=  ?category=
// 支持分页参数 ?page=1&pageSize=9，默认每页9条
app.get('/api/bugs', (req, res) => {
  // 每次请求都重新读取 db.json，保证数据实时
  const store = loadDB();
  const q = (req.query.q || '').toLowerCase().trim();
  const category = req.query.category;
  let items = Array.from(store.bugs || []);
  if(q){
    items = items.filter(it => (it.id||'').toLowerCase().includes(q) || (it.symptom||'').toLowerCase().includes(q));
  }
  if(category){
    items = items.filter(it => it.category === category);
  }
  res.json(items);
});

app.get('/api/bugs/:id', (req, res) => {
  const store = loadDB();
  const id = req.params.id;
  const it = (store.bugs || []).find(b => b.id === id);
  if(!it) return res.status(404).json({ error: 'not found' });
  res.json(it);
});

app.post('/api/bugs', (req, res) => {
  const store = loadDB();
  const { id, symptom, category, solution, link, tags } = req.body;
  if(!symptom || !String(symptom).trim()) return res.status(400).json({ error: 'symptom required' });
  let finalId = id && String(id).trim();
  if(finalId && (store.bugs || []).find(b => b.id === finalId)){
    return res.status(409).json({ error: 'id exists' });
  }
  if(!finalId) finalId = generateId(store);
  let normTags = [];
  if(Array.isArray(tags)){
    normTags = tags.map(t => String(t).trim()).filter(Boolean);
  }
  const item = {
    id: finalId,
    symptom,
    category: category || '未分类',
    solution: solution || '',
    link: link || '',
    tags: normTags
  };
  store.bugs.unshift(item);
  saveDB(store);
  res.status(201).json(item);
});

app.put('/api/bugs/:id', (req, res) => {
  const store = loadDB();
  const id = req.params.id;
  const { symptom, category, solution, link, tags } = req.body;
  const idx = (store.bugs || []).findIndex(b => b.id === id);
  if(idx === -1) return res.status(404).json({ error: 'not found' });
  store.bugs[idx].symptom = symptom !== undefined ? symptom : (store.bugs[idx].symptom || '');
  store.bugs[idx].category = category !== undefined ? category : (store.bugs[idx].category || '未分类');
  store.bugs[idx].solution = solution !== undefined ? solution : (store.bugs[idx].solution || '');
  store.bugs[idx].link = link !== undefined ? link : (store.bugs[idx].link || '');
  if(tags !== undefined){
    if(Array.isArray(tags)){
      store.bugs[idx].tags = tags.map(t => String(t).trim()).filter(Boolean);
    }else{
      store.bugs[idx].tags = [];
    }
  }else if(!Array.isArray(store.bugs[idx].tags)){
    store.bugs[idx].tags = [];
  }
  saveDB(store);
  res.json(store.bugs[idx]);
});

app.delete('/api/bugs/:id', (req, res) => {
  const store = loadDB();
  const id = req.params.id;
  const idx = (store.bugs || []).findIndex(b => b.id === id);
  if(idx === -1) return res.status(404).json({ error: 'not found' });
  store.bugs.splice(idx, 1);
  saveDB(store);
  res.status(204).end();
});

function generateId(store){
  const nums = (store.bugs || []).map(d => {
    const m = (d.id||'').match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return 'BUG-' + String(max + 1).padStart(3, '0');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bug API (json) running on http://localhost:${PORT}`));
