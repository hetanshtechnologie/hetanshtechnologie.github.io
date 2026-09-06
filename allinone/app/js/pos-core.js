const INDUSTRIES = {
  retail:      { name:'Retail',      icon:'&#128722;', color:'#059669', gst:12, cat:['Electronics','Accessories','Furniture','Stationery'], unit:'nos' },
  pharmacy:    { name:'Pharmacy',    icon:'&#9851;',   color:'#2563eb', gst:12, cat:['Tablets','Syrups','Injections','Surgical','Ayurvedic','Vitamins'], unit:'nos', batch:true, expiry:true, license:'Drug License: DL-12345' },
  fmcg:        { name:'FMCG',        icon:'&#127963;', color:'#dc2626', gst:5,  cat:['Beverages','Snacks','Dairy','Bakery','Frozen','Personal Care'], unit:'nos' },
  auto_parts:  { name:'Auto Parts',  icon:'&#128663;', color:'#1e40af', gst:18, cat:['Engine','Brakes','Suspension','Electrical','Body Parts','Tyres','Filters'], unit:'nos' },
  food_beverage:{name:'Food & Bev',  icon:'&#127860;', color:'#ea580c', gst:5,  cat:['Bakery','Beverages','Dairy','Snacks','Ready-to-Eat','Sauces'], unit:'nos', batch:true, expiry:true, license:'FSSAI: 12345678901234' },
  chemical:    { name:'Chemical',    icon:'&#129514;', color:'#9333ea', gst:18, cat:['Acids','Solvents','Catalysts','Lab Reagents','Cleaning Agents','Pigments'], unit:'kg', batch:true, expiry:true },
  hardware:    { name:'Computer HW', icon:'&#128187;', color:'#0891b2', gst:18, cat:['Laptops','Desktops','RAM','Storage','GPUs','Monitors','Peripherals','Networking'], unit:'nos', serial:true },
  furniture:   { name:'Furniture',   icon:'&#128084;', color:'#92400e', gst:5,  cat:['Sofa','Bed','Table','Chair','Wardrobe','Bookshelf','Mattress'], unit:'nos' },
  book:        { name:'Book Pub',    icon:'&#128218;', color:'#be123c', gst:0,  cat:['Textbooks','Novels','Magazines','Children','Academic','Religious'], unit:'nos', isbn:true },
  travel:      { name:'Travel',      icon:'&#9992;',   color:'#0369a1', gst:5,  cat:['Domestic Pkg','International Pkg','Hotel','Flight','Bus','Cruise','Insurance'], unit:'pax' },
  electrical:  { name:'Electrical',  icon:'&#128161;', color:'#ca8a04', gst:18, cat:['Wires','Switches','MCBs','Lights','Fans','Motors','Cables'], unit:'nos' },
  paper_mill:  { name:'Paper Mill',  icon:'&#128195;', color:'#65a30d', gst:12, cat:['Writing Paper','Printing Paper','Packaging','Kraft','Board','Specialty'], unit:'kg' },
  paint:       { name:'Paint',       icon:'&#127912;', color:'#db2777', gst:18, cat:['Emulsion','Enamel','Primer','Varnish','Thinner','Brush','Roller'], unit:'ltr' },
  mobile:      { name:'Mobile Store',icon:'&#128241;', color:'#0f172a', gst:18, cat:['Smartphones','Feature Phones','Tablets','Accessories','Chargers','Cases','Screen Guards'], unit:'nos', serial:true, imei:true },
  garments:    { name:'Garments',    icon:'&#128087;', color:'#86198f', gst:5,  cat:['Men','Women','Kids','Ethnic','Western','Sportswear','Innerwear'], unit:'nos' },
  jewellery:   { name:'Jewellery',   icon:'&#128142;', color:'#b45309', gst:3,  cat:['Gold','Silver','Diamond','Platinum','Gemstone','Coins'], unit:'g', weight:true, purity:true },
  agriculture: { name:'Agriculture', icon:'&#127793;', color:'#15803d', gst:0,  cat:['Seeds','Fertilizers','Pesticides','Tools','Irrigation','Feed'], unit:'kg', batch:true },
  stationery:  { name:'Stationery',  icon:'&#128221;', color:'#4f46e5', gst:0,  cat:['Pens','Notebooks','Files','Art Supplies','Office Supplies','Paper'], unit:'nos' },
  electronics: { name:'Electronics', icon:'&#128268;', color:'#0d9488', gst:18, cat:['TVs','Audio','Home Appliances','Cameras','Gaming','Wearables'], unit:'nos', serial:true },
  real_estate: { name:'Real Estate', icon:'&#127968;', color:'#7c3aed', gst:5,  cat:['Apartment','Villa','Plot','Commercial','Penthouse','Farmhouse'], unit:'sqft' },
  grocery:     { name:'Grocery',     icon:'&#127838;', color:'#16a34a', gst:5,  cat:['Pulses','Rice','Spices','Oil','Dairy','Beverages','Biscuits'], unit:'kg', batch:true, expiry:true },
  ecommerce:   { name:'E-Commerce',  icon:'&#128640;', color:'#ea580c', gst:18, cat:['Electronics','Fashion','Home','Books','Beauty','Toys','Sports'], unit:'nos' }
};

const INDUSTRY_LIST = Object.keys(INDUSTRIES);

function getIndustryConfig(slug) { return INDUSTRIES[slug] || INDUSTRIES.retail; }

let POS = { orgId:null, products:[], variants:{}, cart:[], currentIndustry:'retail', config:null, lastReceipt:null };

async function initPOS(industrySlug) {
  POS.currentIndustry = industrySlug || 'retail';
  POS.config = getIndustryConfig(POS.currentIndustry);
  const user = await requireLogin(); if (!user) return false;
  POS.orgId = await getOrgId(); if (!POS.orgId) return false;
  await loadPOSProducts();
  await loadPOSCustomers();
  return true;
}

async function loadPOSProducts() {
  const { data } = await erp.from('products').select('*').eq('org_id', POS.orgId).eq('is_active', true).order('name');
  POS.products = data || [];
  const { data: vars } = await erp.from('product_variants').select('*').eq('is_active', true).order('sort_order').order('name');
  POS.variants = {};
  (vars || []).forEach(v => {
    if (!POS.variants[v.product_id]) POS.variants[v.product_id] = [];
    POS.variants[v.product_id].push(v);
  });
}

async function loadPOSCustomers() {
  const sel = document.getElementById('pos-customer');
  if (!sel) return;
  sel.innerHTML = '<option value="">Walk-in Customer</option>';
  const { data } = await erp.from('parties').select('id, name').eq('org_id', POS.orgId).in('type',['customer','both']).eq('is_active', true).order('name');
  (data || []).forEach(p => {
    const o = document.createElement('option'); o.value = p.id; o.textContent = p.name;
    sel.appendChild(o);
  });
}

function getIndustryProducts() {
  const cfg = POS.config;
  if (!cfg || !cfg.cat || !cfg.cat.length) return POS.products;
  return POS.products.filter(p => p.category && cfg.cat.includes(p.category));
}

function filterPOSProducts() {
  const q = (document.getElementById('pos-search')?.value || '').trim().toLowerCase();
  const grid = document.getElementById('pos-grid');
  if (!grid) return;
  let filtered = getIndustryProducts();
  const activeCat = document.querySelector('.cat-pill.active')?.dataset?.cat || '';
  if (activeCat) filtered = filtered.filter(p => p.category === activeCat);
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  if (!filtered.length) { grid.innerHTML = '<div class="text-gray-400 text-sm col-span-full text-center py-8">No products found.</div>'; return; }
  grid.innerHTML = filtered.map(p => `<div class="product-card" onclick="posAddToCart(${p.id})">
    <div class="price">${formatCurrency(p.selling_price || 0)}</div>
    <div class="name">${escapeHtml(p.name)}</div>
    <div class="sku">${escapeHtml(p.sku || '')}${p.gst_rate ? ' | GST '+p.gst_rate+'%' : ''}</div>
  </div>`).join('');
}

function renderCatPills() {
  const div = document.getElementById('pos-categories');
  if (!div) return;
  const cfg = POS.config;
  const cats = cfg && cfg.cat ? cfg.cat.filter(c => POS.products.some(p => p.category === c)) : [...new Set(POS.products.map(p => p.category).filter(Boolean))].sort();
  div.innerHTML = '<button class="cat-pill active" data-cat="" onclick="posFilterCat(this,\'\')">All</button>' +
    cats.map(c => `<button class="cat-pill" data-cat="${escapeHtml(c)}" onclick="posFilterCat(this,'${escapeHtml(c)}')">${escapeHtml(c)}</button>`).join('');
}

function posFilterCat(el, cat) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filterPOSProducts();
}

function posAddToCart(pid, variantId) {
  const p = POS.products.find(x => x.id === pid);
  if (!p) return;
  if (!variantId && POS.variants[pid] && POS.variants[pid].length) {
    showVariantModal(pid);
    return;
  }
  let name = p.name;
  let sku = p.sku;
  let rate = Number(p.selling_price || 0);
  if (variantId) {
    const v = POS.variants[pid]?.find(x => x.id === variantId);
    if (v) {
      name = p.name + ' — ' + v.name;
      sku = (p.sku || '') + (v.sku_suffix || '');
      rate = Number(v.selling_price || p.selling_price || 0);
    }
  }
  const key = p.id + '_' + (variantId || '');
  const existing = POS.cart.find(c => c._key === key);
  if (existing) { existing.qty += 1; }
  else { POS.cart.push({ _key:key, product_id:p.id, variant_id:variantId||null, name, sku, rate, gst_rate:Number(p.gst_rate||0), qty:1 }); }
  renderPOSCart();
  showPOSToast(name + ' added', 'success');
}

function showVariantModal(pid) {
  const p = POS.products.find(x => x.id === pid);
  if (!p) return;
  const vars = POS.variants[pid] || [];
  document.getElementById('variant-modal-title').textContent = 'Select ' + escapeHtml(p.name) + ' Variant';
  document.getElementById('variant-list').innerHTML = vars.map(v => `<div onclick="posAddToCart(${pid},${v.id});closeVariantModal();" style="cursor:pointer;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;transition:all .12s;" onmouseover="this.style.borderColor='#3b82f6';this.style.background='#f8fafc'" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='white'">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div style="font-weight:600;font-size:.95rem;">${escapeHtml(v.name)}</div>
      <div style="font-weight:700;font-size:1rem;color:#059669;">${formatCurrency(v.selling_price)}</div>
    </div>
    ${v.description ? '<div style="font-size:.78rem;color:#64748b;margin-top:4px;">'+escapeHtml(v.description)+'</div>' : ''}
    ${v.features && v.features.length ? '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">'+v.features.slice(0,4).map(f => '<span style="font-size:.65rem;background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:12px;">'+escapeHtml(f)+'</span>').join('')+(v.features.length > 4 ? '<span style="font-size:.65rem;color:#94a3b8;">+'+(v.features.length-4)+' more</span>' : '')+'</div>' : ''}
    ${v.mrp && Number(v.mrp) > Number(v.selling_price) ? '<div style="font-size:.7rem;color:#94a3b8;margin-top:4px;"><s>MRP: '+formatCurrency(v.mrp)+'</s></div>' : ''}
  </div>`).join('');
  document.getElementById('variant-modal').style.display = 'flex';
}

function closeVariantModal() {
  document.getElementById('variant-modal').style.display = 'none';
}

function posUpdateQty(key, delta) {
  const item = POS.cart.find(c => c._key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) POS.cart = POS.cart.filter(c => c._key !== key);
  renderPOSCart();
}

function posRemoveItem(key) {
  POS.cart = POS.cart.filter(c => c._key !== key);
  renderPOSCart();
}

function renderPOSCart() {
  const div = document.getElementById('pos-cart');
  if (!div) return;
  if (!POS.cart.length) {
    div.innerHTML = '<div class="text-gray-400 text-sm text-center py-8">Cart is empty.</div>';
    updatePOSTotals(); return;
  }
  div.innerHTML = POS.cart.map(i => {
    const lt = i.qty * i.rate;
    return `<div class="cart-item">
      <div><div class="font-medium">${escapeHtml(i.name)}</div><div class="text-xs text-gray-400">${escapeHtml(i.sku||'')} @ ${formatCurrency(i.rate)}</div></div>
      <div class="qty-controls">
        <button onclick="posUpdateQty('${i._key}',-1)">&minus;</button>
        <span>${i.qty}</span>
        <button onclick="posUpdateQty('${i._key}',1)">+</button>
      </div>
      <div class="line-total">${formatCurrency(lt)}</div>
      <div class="remove-btn" onclick="posRemoveItem('${i._key}')">&times;</div>
    </div>`;
  }).join('');
  updatePOSTotals();
}

function updatePOSTotals() {
  const subtotal = POS.cart.reduce((s,i) => s + i.qty*i.rate, 0);
  const gst = POS.cart.reduce((s,i) => s + (i.qty*i.rate*i.gst_rate/100), 0);
  const total = subtotal + gst;
  const count = POS.cart.reduce((s,i) => s + i.qty, 0);
  ['item-count','pos-item-count'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = count;
  });
  ['subtotal','pos-subtotal'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = formatCurrency(subtotal);
  });
  ['gst-total','pos-gst-total'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = formatCurrency(gst);
  });
  ['grand-total','pos-grand-total'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = formatCurrency(total);
  });
  ['cash-amount'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = Math.ceil(total); });
}

function posClearCart() { POS.cart = []; renderPOSCart(); }

async function posCompleteSale(mode) {
  if (!POS.cart.length) return showPOSToast('Cart is empty!','error');
  const btn = document.getElementById('btn-'+mode);
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }
  try {
    const customerId = document.getElementById('pos-customer')?.value || null;
    const subtotal = POS.cart.reduce((s,i) => s + i.qty*i.rate, 0);
    const totalGst = POS.cart.reduce((s,i) => s + (i.qty*i.rate*i.gst_rate/100), 0);
    const total = subtotal + totalGst;
    const invNo = POS.currentIndustry.toUpperCase().slice(0,4) + '-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + Date.now().toString(36).slice(-4).toUpperCase();
    const userId = (await erp.auth.getUser()).data?.user?.id;

    const { data: inv, error: invErr } = await erp.from('invoices').insert({
      org_id: POS.orgId, invoice_no: invNo, invoice_date: new Date().toISOString().slice(0,10),
      customer_id: customerId, invoice_type: 'regular', status: 'paid',
      subtotal, taxable_amt: subtotal, cgst_amt: totalGst/2, sgst_amt: totalGst/2, total,
      created_by: userId
    }).select().single();
    if (invErr) throw invErr;

    const lines = POS.cart.map(i => ({
      invoice_id: inv.id, product_id: i.product_id, description: i.name,
      quantity: i.qty, unit: 'nos', rate: i.rate,
      taxable_amt: i.qty*i.rate, gst_rate: i.gst_rate,
      cgst_amt: (i.qty*i.rate*i.gst_rate/100)/2,
      sgst_amt: (i.qty*i.rate*i.gst_rate/100)/2,
      total: i.qty*i.rate + (i.qty*i.rate*i.gst_rate/100)
    }));
    const { error: liErr } = await erp.from('invoice_lines').insert(lines);
    if (liErr) throw liErr;

    const { error: pmtErr } = await erp.from('payments').insert({
      org_id: POS.orgId, invoice_id: inv.id, party_id: customerId,
      amount: total, mode, payment_date: new Date().toISOString().slice(0,10), created_by: userId
    });
    if (pmtErr) throw pmtErr;

    POS.lastReceipt = { inv, lines, config: POS.config };
    showPOSReceipt(inv, lines);
    POS.cart = []; renderPOSCart();
  } catch (err) { showPOSToast(err.message, 'error'); }
  if (btn) { btn.disabled = false; btn.textContent = mode === 'cash' ? 'Cash Pay' : 'UPI / Card'; }
}

function showPOSReceipt(inv, lines) {
  const cfg = POS.config;
  document.getElementById('receipt-store').textContent = cfg.name + ' - Hetansh Technologie';
  document.getElementById('receipt-gst').textContent = 'GST: 27AABCS1234E1Z5' + (cfg.license ? ' | ' + cfg.license : '');
  document.getElementById('receipt-addr').textContent = '42, Tech Park, Andheri East, Mumbai - 400001';
  document.getElementById('receipt-invoice').textContent = inv.invoice_no;
  document.getElementById('receipt-date').textContent = formatDateTime(inv.created_at);
  document.getElementById('receipt-items').innerHTML = `<table>
    <thead><tr><th class="text-left">Item</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Amt</th></tr></thead>
    <tbody>${lines.map(l => `<tr><td class="r-desc">${escapeHtml(l.description)}</td><td class="text-right">${l.quantity}</td><td class="text-right">${formatCurrency(l.rate)}</td><td class="text-right">${formatCurrency(l.total)}</td></tr>`).join('')}</tbody>
  </table>`;
  const subtotal = lines.reduce((s,l) => s + l.taxable_amt, 0);
  const gst = lines.reduce((s,l) => s + (l.cgst_amt||0) + (l.sgst_amt||0), 0);
  document.getElementById('receipt-summary').innerHTML = `
    <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="row"><span>CGST</span><span>${formatCurrency(gst/2)}</span></div>
    <div class="row"><span>SGST</span><span>${formatCurrency(gst/2)}</span></div>
    <div class="row grand-total"><span>Total</span><span>${formatCurrency(inv.total)}</span></div>`;
  document.getElementById('receipt-modal').classList.add('show');
}

function closePOSReceipt() {
  document.getElementById('receipt-modal').classList.remove('show');
}

function printPOSReceipt() {
  const store = document.getElementById('receipt-store').textContent;
  const gst = document.getElementById('receipt-gst').textContent;
  const addr = document.getElementById('receipt-addr').textContent;
  const inv = document.getElementById('receipt-invoice').textContent;
  const date = document.getElementById('receipt-date').textContent;
  const itemsHtml = document.getElementById('receipt-items').innerHTML;
  const summaryHtml = document.getElementById('receipt-summary').innerHTML;
  const w = window.open('','','width=400,height=600');
  w.document.write(`<!DOCTYPE html><html><head><title>Print Receipt</title>
<style>body{font-family:'Courier New',monospace;font-size:12px;margin:0;padding:16px;width:58mm;}
h2{font-size:14px;text-align:center;margin:0 0 4px;}
.header{text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;font-size:11px;}
table{width:100%;border-collapse:collapse;font-size:11px;}
td{padding:3px 0;}th{text-align:left;border-bottom:1px solid #000;padding:3px 0;}
.r-desc{font-weight:600;}.text-right{text-align:right;}
.summary{border-top:1px dashed #000;margin-top:8px;padding-top:6px;font-size:11px;}
.summary .row{display:flex;justify-content:space-between;padding:2px 0;}
.grand-total{font-weight:700;font-size:13px;border-top:2px solid #000;padding-top:4px;margin-top:2px;}
.footer{text-align:center;font-size:10px;margin-top:12px;border-top:1px dashed #000;padding-top:8px;}
@media print{@page{margin:0;}body{margin:8px;}}</style></head><body>
<div class="header"><h2>${store}</h2><div>${gst}</div><div>${addr}</div><div style="margin-top:4px;">${inv}</div><div>${date}</div></div>
<div>${itemsHtml}</div>
<div class="summary">${summaryHtml}</div>
<div class="footer">Thank you! Visit again.</div>
<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
  w.document.close();
}

function showPOSToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;color:white;font-weight:600;font-size:.9rem;z-index:999;background:'+(type==='error'?'#ef4444':'#059669');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
