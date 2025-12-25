const API_BASE = 'http://localhost:3000/api/bugs';
let lastQuery = { q: '', category: '' };
let data = [];

const categoryMap = {
  'UI': 'badge-ui',
  '后端': 'badge-backend',
  '性能': 'badge-perf',
  '安全': 'badge-security',
  '兼容性': 'badge-compat'
};


const $list = document.getElementById('list');
const $filter = document.getElementById('filter');
const $search = document.getElementById('search');
const $counts = document.getElementById('counts');
const $empty = document.getElementById('empty');
const $reset = document.getElementById('reset');
// 移除分页控件


async function init(){
  bindEvents();
  await fetchAndRender();
}

async function populateFilter(){
  // 拉取所有 bug 分类
  try {
    const res = await fetch(API_BASE);
    const arr = await res.json();
    const cats = Array.from(new Set((arr||[]).map(d=>d.category)));
    $filter.innerHTML = '<option value="">全部层面</option>';
    cats.forEach(c=>{
      if(!c) return;
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      $filter.appendChild(opt);
    });
  } catch(e) {}
}

function bindEvents(){
  $filter.addEventListener('change', fetchAndRender);
  $search.addEventListener('input', debounce(fetchAndRender, 180));
  $reset.addEventListener('click', ()=>{
    $filter.value = '';
    $search.value = '';
    fetchAndRender();
  });
}

// 拉取后端全部数据并渲染
async function fetchAndRender(){
  const q = $search.value.trim();
  const category = $filter.value;
  lastQuery = { q, category };
  let url = API_BASE;
  if(q) url += `?q=${encodeURIComponent(q)}`;
  if(category) url += (q ? '&' : '?') + `category=${encodeURIComponent(category)}`;
  try {
    const res = await fetch(url);
    data = await res.json();
    render(data);
    await populateFilter();
  } catch(e) {
    $list.innerHTML = '<div class="text-red-500">加载数据失败</div>';
    $counts.textContent = '';
    $empty.classList.add('hidden');
  }
}


function render(list){
  $list.innerHTML = '';
  if(list.length === 0){
    $empty.classList.remove('hidden');
    $counts.textContent = '';
    return;
  }
  $empty.classList.add('hidden');
  $counts.textContent = `共 ${list.length} 个结果`;
  list.forEach(item=>{
    const el = document.createElement('div');
    el.className = 'bg-white rounded-xl p-5 shadow-sm card-hover fade-in';
    el.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-sm text-gray-500">ID</div>
          <div class="text-lg font-semibold mt-1">${item.id}</div>
        </div>
        <div class="text-right">
          <div class="inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryMap[item.category] || 'bg-gray-200'}">${item.category}</div>
        </div>
      </div>
      <div class="mt-4 text-gray-700">${escapeHtml(item.symptom)}</div>
      <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div>Bug 记录</div>
        <div class="flex items-center gap-2">
          <button class="copy-btn px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md">复制 ID</button>
        </div>
      </div>
    `;
    const copyBtn = el.querySelector('.copy-btn');
    copyBtn.addEventListener('click', ()=>{
      navigator.clipboard?.writeText(item.id).then(()=>{
        copyBtn.textContent = '已复制';
        setTimeout(()=>copyBtn.textContent = '复制 ID', 1200);
      }).catch(()=>{
        copyBtn.textContent = '复制失败';
        setTimeout(()=>copyBtn.textContent = '复制 ID', 1200);
      });
    });
    $list.appendChild(el);
  });
}

// 已移除分页控件

function debounce(fn, wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(this,args), wait);
  }
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

init();
