const KEY_PRODUCTS = 'inv_products_latest';
const KEY_CHECK = 'inv_checklist_v1';

function loadProducts(){ const s = localStorage.getItem(KEY_PRODUCTS); return s?JSON.parse(s).items:[]; }
function loadCheck(){ const s = localStorage.getItem(KEY_CHECK); return s?JSON.parse(s):{}; }
function saveCheck(obj){ localStorage.setItem(KEY_CHECK, JSON.stringify(obj)); }

const listEl = document.getElementById('list');
const q = document.getElementById('q');
const filter = document.getElementById('filter');

function buildCombined(){
  const prods = loadProducts();
  const check = loadCheck();
  const map = new Map();
  for(const p of prods) map.set(p.code, Object.assign({}, p, { missing: false }));
  // ensure keys from check are present
  for(const k of Object.keys(check)){
    if(!map.has(k)) map.set(k, { code: k, description: (check[k].description || '(sem descrição)'), saldo: 0, missing: true });
  }
  return { arr: Array.from(map.values()).sort((a,b)=>a.code.localeCompare(b.code)), check };
}

function render(){
  const { arr, check } = buildCombined();
  const term = (q.value||'').toLowerCase();
  const f = filter.value;
  listEl.innerHTML = '';
  for(const p of arr){
    const ck = check[p.code] || { exposed: false, inStock: p.saldo>0, obs: '' };
    if(term){
      if(!(p.code.toLowerCase().includes(term) || (p.description||'').toLowerCase().includes(term))) continue;
    }
    if(f === 'missing' && !p.missing) continue;
    if(f === 'zero' && (p.saldo||0) > 0) continue;
    if(f === 'exposed' && !ck.exposed) continue;

    const div = document.createElement('div'); div.className='rowItem';
    const left = document.createElement('div'); left.className='rowLeft';
    left.innerHTML = `<div style="font-weight:700">${p.code}</div><div class="muted" style="font-size:12px">${p.saldo!==undefined?('Saldo: '+p.saldo):''}</div>`;
    const desc = document.createElement('div'); desc.className='desc'; desc.innerHTML = `<div>${p.description||''}</div>${p.missing?'<div class="muted" style="font-size:12px">(não na última carga)</div>':''}`;
    const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='8px'; controls.style.alignItems='center';
    // exposed checkbox
    const cbEx = document.createElement('input'); cbEx.type='checkbox'; cbEx.checked = !!ck.exposed; cbEx.title='Exposto';
    // inStock checkbox
    const cbIn = document.createElement('input'); cbIn.type='checkbox'; cbIn.checked = !!ck.inStock; cbIn.title='Em estoque';
    // obs input
    const inp = document.createElement('input'); inp.type='text'; inp.className='obs'; inp.value = ck.obs||''; inp.placeholder='Observação';
    controls.appendChild(cbEx); controls.appendChild(cbIn); controls.appendChild(inp);

    // events
    cbEx.addEventListener('change', ()=>{ updateCheck(p.code, { exposed: cbEx.checked, inStock: cbIn.checked, obs: inp.value, description: p.description }); });
    cbIn.addEventListener('change', ()=>{ updateCheck(p.code, { exposed: cbEx.checked, inStock: cbIn.checked, obs: inp.value, description: p.description }); });
    inp.addEventListener('change', ()=>{ updateCheck(p.code, { exposed: cbEx.checked, inStock: cbIn.checked, obs: inp.value, description: p.description }); });

    div.appendChild(left); div.appendChild(desc); div.appendChild(controls);
    listEl.appendChild(div);
  }
}

function updateCheck(code, {exposed, inStock, obs, description}){
  const check = loadCheck();
  if(!check[code]) check[code] = {};
  check[code].exposed = !!exposed;
  check[code].inStock = !!inStock;
  check[code].obs = obs || '';
  if(description) check[code].description = description;
  check[code].lastEdited = Date.now();
  saveCheck(check);
}

q.addEventListener('input', render);
filter.addEventListener('change', render);

document.getElementById('selectAll').addEventListener('click', ()=>{
  const { arr } = buildCombined();
  const check = loadCheck();
  for(const p of arr){
    check[p.code] = check[p.code] || {};
    check[p.code].exposed = true;
    check[p.code].inStock = p.saldo>0;
    check[p.code].obs = check[p.code].obs || '';
    check[p.code].lastEdited = Date.now();
  }
  saveCheck(check); render();
});

document.getElementById('clearChecks').addEventListener('click', ()=>{
  if(!confirm('Remover todas as marcações do checklist?')) return;
  localStorage.removeItem(KEY_CHECK);
  render();
});

/* export/import */
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const data = loadCheck();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'checklist.json'; a.click(); URL.revokeObjectURL(url);
});
document.getElementById('importBtn').addEventListener('click', ()=> document.getElementById('fileImport').click());
document.getElementById('fileImport').addEventListener('change', (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev=>{
    try{
      const obj = JSON.parse(ev.target.result);
      saveCheck(obj);
      alert('Checklist importado com sucesso.');
      render();
    } catch(err){ alert('JSON inválido'); }
  };
  r.readAsText(f);
});

/* init */
render();