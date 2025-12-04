/* keys */
const KEY_PRODUCTS = 'inv_products_latest';
const KEY_CHECK = 'inv_checklist_v1';

/* helpers: save/load */
function saveProducts(obj){ localStorage.setItem(KEY_PRODUCTS, JSON.stringify({ts:Date.now(), items: obj})); }
function loadProducts(){ const s = localStorage.getItem(KEY_PRODUCTS); return s?JSON.parse(s):{ts:0, items:[]}; }
function loadCheck(){ const s = localStorage.getItem(KEY_CHECK); return s?JSON.parse(s):{}; }
function saveCheck(obj){ localStorage.setItem(KEY_CHECK, JSON.stringify(obj)); }

/* parser robusto */
function parseTxtContent(text){
  const lines = text.split(/\r?\n/);
  const items = [];
  for(let line of lines){
    if(!/^\s*\*/.test(line)) continue; // somente linhas com '*'
    const clean = line.replace(/\u00A0/g,' ').trim();
    if(clean.length < 4) continue;
    const tokens = clean.split(/\s+/);
    // localizar código -> primeiro token com 3+ dígitos
    let codeIdx = -1;
    for(let i=0;i<tokens.length;i++){
      if(/^\d{3,}$/.test(tokens[i].replace(/[.,]/g,''))){ codeIdx = i; break; }
    }
    if(codeIdx < 0) continue;
    const code = tokens[codeIdx].replace(/[.,]/g,'');
    // localizar saldo -> último token que seja número (com vírgula/ ponto)
    let saldoIdx = -1;
    for(let i=tokens.length-1;i>codeIdx;i--){
      if(/^\d+([.,]\d+)?$/.test(tokens[i])){ saldoIdx = i; break; }
    }
    let saldo = 0;
    if(saldoIdx !== -1){
      saldo = parseFloat(tokens[saldoIdx].replace(',','.')) || 0;
    } else {
      // fallback: tentar identificar penúltimo token numérico
      saldo = 0;
    }
    // descrição = tokens entre codeIdx+1 and saldoIdx-1 (ou até end if not found)
    const descEnd = saldoIdx !== -1 ? saldoIdx : tokens.length;
    const descTokens = tokens.slice(codeIdx+1, descEnd);
    const description = descTokens.join(' ').replace(/\s{2,}/g,' ').trim();
    items.push({ code, description, saldo, rawLine: line });
  }
  return items;
}

/* merge: mantém checklist existente e atualiza lastSeen/inStock */
function mergeProducts(newItems){
  const check = loadCheck();
  const newCheck = Object.assign({}, check);
  for(const p of newItems){
    if(!newCheck[p.code]){
      newCheck[p.code] = { exposed: false, inStock: p.saldo > 0, obs: '', lastSeen: Date.now() };
    } else {
      // atualiza info relevante
      newCheck[p.code].inStock = p.saldo > 0;
      newCheck[p.code].lastSeen = Date.now();
    }
  }
  saveProducts(newItems);
  saveCheck(newCheck);
  return { products: newItems, check: newCheck };
}

/* UI bindings */
const fileInput = document.getElementById('fileInput');
const parseBtn = document.getElementById('parseBtn');
const preview = document.getElementById('preview');
const clearBtn = document.getElementById('clearProducts');
const downloadRaw = document.getElementById('downloadRaw');
const loadExample = document.getElementById('loadExample');

parseBtn.addEventListener('click', ()=>{
  const f = fileInput.files[0];
  if(!f){ preview.textContent = 'Selecione um arquivo .txt antes.'; return; }
  const reader = new FileReader();
  reader.onload = e=>{
    const text = e.target.result;
    const items = parseTxtContent(text);
    if(items.length === 0){ preview.textContent = 'Nenhum produto detectado. Verifique o formato do TXT.'; return; }
    mergeProducts(items);
    preview.textContent = items.slice(0,50).map(x=>`${x.code} | ${x.description} | saldo: ${x.saldo}`).join('\n');
    alert('Arquivo processado: '+items.length+' produtos. Checklist preservado/mesclado.');
  };
  // muitos relatórios em Latin1
  reader.readAsText(f, 'ISO-8859-1');
});

clearBtn.addEventListener('click', ()=>{
  if(!confirm('Limpar produtos atuais? (Checklist NÃO será apagado)')) return;
  localStorage.removeItem(KEY_PRODUCTS);
  preview.textContent = 'Produtos removidos. Faça novo upload.';
});

downloadRaw.addEventListener('click', ()=>{
  const p = loadProducts();
  const blob = new Blob([JSON.stringify(p, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'products_latest.json'; a.click(); URL.revokeObjectURL(url);
});

/* exemplo simples para testar sem upload (apenas demo) */
loadExample.addEventListener('click', ()=>{
  const demoTxt = `
*   190938   11 VERMELHO             ASP. B&D A6-B2 PO FILTRO HEPA 2000W 2,2L 220V       1.00
*   184235   50 PRETO/AZUL           ASP. ELECTROLUX AWD01 AG/PO 5L 1250/1400W 220       2.00
*   199189   38 INOX                 ASP. WAP GTW INOX 20I AGUA/PO 20L 1900W 220V        1.00
  `;
  const items = parseTxtContent(demoTxt);
  mergeProducts(items);
  preview.textContent = items.map(x=>`${x.code} | ${x.description} | saldo: ${x.saldo}`).join('\n');
  alert('Exemplo carregado ('+items.length+' produtos).');
});

/* show existing on load */
(function(){
  const p = loadProducts();
  if(p.items && p.items.length) preview.textContent = p.items.slice(0,50).map(x=>`${x.code} | ${x.description} | saldo: ${x.saldo}`).join('\n');
})();