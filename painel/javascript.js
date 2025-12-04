const KEY_PRODUCTS = 'inv_products_latest';
const KEY_CHECK = 'inv_checklist_v1';

function loadProducts(){ const s = localStorage.getItem(KEY_PRODUCTS); return s?JSON.parse(s).items:[]; }
function loadCheck(){ const s = localStorage.getItem(KEY_CHECK); return s?JSON.parse(s):{}; }

const tbody = document.querySelector('#table tbody');
const q = document.getElementById('q');
const view = document.getElementById('view');
const info = document.getElementById('info');

function buildUnified(){
  const prods = loadProducts();
  const check = loadCheck();
  const map = new Map();
  for(const p of prods) map.set(p.code, Object.assign({}, p, { missing: false }));
  for(const k of Object.keys(check)){
    if(!map.has(k)) map.set(k, { code: k, description: check[k].description || '(sem descrição)', saldo: 0, missing: true });
  }
  return { arr: Array.from(map.values()).sort((a,b)=>a.code.localeCompare(b.code)), check };
}

function render(){
  const { arr, check } = buildUnified();
  const term = (q.value||'').toLowerCase();
  const v = view.value;
  tbody.innerHTML = '';
  let visible = 0;
  for(const p of arr){
    const ck = check[p.code] || { exposed:false, inStock: p.saldo>0, obs: '' };
    if(term){
      if(!(p.code.toLowerCase().includes(term) || (p.description||'').toLowerCase().includes(term))) continue;
    }
    if(v === 'exposed' && !ck.exposed) continue;
    if(v === 'inStock' && !(p.saldo>0)) continue;
    if(v === 'zero' && (p.saldo>0)) continue;
    if(v === 'new' && check[p.code]) continue;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.code}</td>
      <td>${p.description || ''} ${p.missing?'<div class="muted" style="font-size:12px">(não na última carga)</div>':''}</td>
      <td>${p.saldo !== undefined ? p.saldo : ''}</td>
      <td>${ck.exposed?'<span class="badge" style="background:var(--ok);color:#042f3a">SIM</span>':'-'}</td>
      <td>${ck.inStock?'<span class="badge" style="background:#334155;color:#dfe9f5">SIM</span>':'-'}</td>
      <td>${(ck.obs||'')}</td>
    `;
    tbody.appendChild(tr);
    visible++;
  }
  const totalProds = loadProducts().length;
  const totalExposed = Object.values(loadCheck()).filter(c=>c.exposed).length;
  const totalWithStock = loadProducts().filter(p=>p.saldo>0).length;
  info.textContent = `Produtos na última carga: ${totalProds} · Marcados como expostos: ${totalExposed} · Com saldo>0: ${totalWithStock} · Visíveis: ${visible}`;
}

/* Exports */
document.getElementById('exportJson').addEventListener('click', ()=>{
  const { arr, check } = buildUnified();
  const merged = arr.map(p => {
    const ck = check[p.code] || {};
    return { code: p.code, description: p.description, saldo: p.saldo, exposed: !!ck.exposed, inStock: !!ck.inStock, obs: ck.obs || '' };
  });
  const blob = new Blob([JSON.stringify(merged, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'merged_inventory.json'; a.click(); URL.revokeObjectURL(url);
});

document.getElementById('exportCsv').addEventListener('click', ()=>{
  const { arr, check } = buildUnified();
  let csv = 'codigo;descricao;saldo;exposto;em_estoque;obs\n';
  for(const p of arr){
    const ck = check[p.code] || {};
    const line = [
      p.code,
      `"${(p.description||'').replace(/"/g,'""')}"`,
      p.saldo || 0,
      ck.exposed ? 1 : 0,
      ck.inStock ? 1 : 0,
      `"${(ck.obs||'').replace(/"/g,'""')}"`
    ].join(';');
    csv += line + '\n';
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'merged_inventory.csv'; a.click(); URL.revokeObjectURL(url);
});

/* bindings */
document.getElementById('refresh').addEventListener('click', render);
q.addEventListener('input', render);
view.addEventListener('change', render);

/* init */
render();

/* expose helpers for debug */
window._inv = { loadProducts, loadCheck, buildUnified, render };