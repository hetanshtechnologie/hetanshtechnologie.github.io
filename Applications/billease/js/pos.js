/* ============================================================================
   BillEase v2 - Point of Sale module
   Item-first billing with category grid, multi-bill holds, kitchen send,
   quick payment (with loyalty redemption), thermal receipt printing and
   keyboard shortcuts.
   ========================================================================== */

let posCart = [];        // cart lines: { key, product_id, name, unit, rate, gst_rate, qty }
let posCurrent = null;   // invoice id being worked on (null = new bill)
let posActiveCat = 'All';

// ---------- Main render ----------
function renderPOS() {
  const sel = document.getElementById('pos-table');
  sel.innerHTML = '<option value="">Select table</option>' +
    tables.map(t => '<option value="' + t.id + '">' + escHtml(t.name) + '</option>').join('');
  refreshPartySelects();
  renderPosCats();
  renderPosItems();
  renderPosCart();
  renderPosHolds();
  document.getElementById('pos-order-no').textContent = posOrderLabel();
  setPosDineType();
}

function posOrderLabel() {
  if (posCurrent) {
    const inv = invoices.find(i => i.id === posCurrent);
    if (inv) return inv.invoice_number;
  }
  return nextPOSNumber();
}

// ---------- Category chips ----------
function renderPosCats() {
  const cats = ['All'].concat([...new Set(products.filter(p => !p.is_ingredient && p.category).map(p => p.category))].sort());
  document.getElementById('pos-cats').innerHTML = cats.map(c =>
    '<button class="pos-cat' + (posActiveCat === c ? ' active' : '') + '" onclick="posSetCat(\'' + escHtml(c).replace(/'/g, '&#39;') + '\')">' + escHtml(c) + '</button>'
  ).join('');
}

function posSetCat(cat) {
  posActiveCat = cat;
  renderPosCats();
  renderPosItems();
}

// ---------- Item grid ----------
function renderPosItems() {
  const q = (document.getElementById('pos-search').value || '').toLowerCase();
  let list = products.filter(p => !p.is_ingredient);
  if (posActiveCat !== 'All') list = list.filter(p => p.category === posActiveCat);
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
  list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  document.getElementById('pos-items').innerHTML = list.map(p =>
    '<div class="pos-item' + (p.available === false ? ' sold-out' : '') + '" onclick="posAdd(\'' + p.id + '\')">' +
      (p.available === false ? '<span class="pi-soldout">Sold out</span>' : '') +
      '<span class="pi-gst">' + Number(p.gst_rate) + '% GST</span>' +
      '<div class="pi-name">' + escHtml(p.name) + '</div>' +
      '<div class="pi-price">' + fmtMoney(p.selling_price) + '</div>' +
    '</div>'
  ).join('') || '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:30px;">No items match. Add products in the Products tab.</p>';
}

function posAdd(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (p.available === false) return showToast(p.name + ' is sold out', 'error');
  const line = posCart.find(l => l.key === id);
  if (line) line.qty++;
  else posCart.push({
    key: id,
    product_id: id,
    name: p.name,
    unit: p.unit,
    rate: Number(p.selling_price || 0),
    gst_rate: Number(p.gst_rate || 0),
    qty: 1
  });
  renderPosCart();
}

function posInc(key) { const l = posCart.find(x => x.key === key); if (l) { l.qty++; renderPosCart(); } }
function posDec(key) {
  const l = posCart.find(x => x.key === key);
  if (!l) return;
  l.qty--;
  if (l.qty <= 0) posCart = posCart.filter(x => x.key !== key);
  renderPosCart();
}
function posRemoveLine(key) { posCart = posCart.filter(x => x.key !== key); renderPosCart(); }

// ---------- Cart & totals ----------
function posTotals() {
  let subtotal = 0, tax = 0;
  posCart.forEach(l => {
    const amt = round2(l.qty * l.rate);
    subtotal += amt;
    tax += round2(amt * l.gst_rate / 100);
  });
  subtotal = round2(subtotal);
  tax = round2(tax);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

function renderPosCart() {
  const t = posTotals();
  const body = document.getElementById('pos-cart-body');
  body.innerHTML = posCart.map(l =>
    '<div class="cart-line">' +
      '<span class="cl-name">' + escHtml(l.name) + '</span>' +
      '<span class="cl-qty">' +
        '<button onclick="posDec(\'' + l.key + '\')">-</button>' +
        '<span>' + l.qty + '</span>' +
        '<button onclick="posInc(\'' + l.key + '\')">+</button>' +
      '</span>' +
      '<span class="cl-rate">' + fmtMoney(l.rate) + '</span>' +
      '<span class="cl-amt">' + fmtMoney(round2(l.qty * l.rate)) + '</span>' +
      '<button class="cl-del" onclick="posRemoveLine(\'' + l.key + '\')">&#10005;</button>' +
    '</div>'
  ).join('') || '<p style="color:var(--muted);text-align:center;padding:14px 0;">Tap items to add them.</p>';

  document.getElementById('pos-subtotal').textContent = fmtMoney(t.subtotal);
  document.getElementById('pos-tax').textContent = fmtMoney(t.tax);
  document.getElementById('pos-total').textContent = fmtMoney(t.total);
  document.getElementById('pos-pay-btn').textContent = 'Charge ' + fmtMoney(t.total);
}

// ---------- New bill ----------
function posNewBill() {
  posCart = [];
  posCurrent = null;
  posActiveCat = 'All';
  document.getElementById('pos-search').value = '';
  document.getElementById('pos-waiter').value = '';
  document.getElementById('pos-customer').value = '';
  if (document.getElementById('pos-table')) document.getElementById('pos-table').value = '';
  renderPOS();
}

// ---------- Dine type visibility ----------
function setPosDineType() {
  const dt = document.getElementById('pos-dine-type').value;
  document.getElementById('pos-table-wrap').classList.toggle('pos-hide', dt !== 'dine_in');
  document.getElementById('pos-platform-wrap').classList.toggle('pos-hide', dt !== 'delivery' && dt !== 'online');
}

// ---------- Persist (create/update) the POS order ----------
async function posSave(status, discountAmount, sentToKitchen) {
  if (!posCart.length) { showToast('Bill is empty', 'error'); return null; }
  const t = posTotals();
  const total = round2(t.total - (Number(discountAmount) || 0));
  const items = posCart.map(l => ({
    product_id: l.product_id || null,
    product_name: l.name,
    hsn: (products.find(p => p.id === l.product_id) || {}).hsn || '',
    qty: l.qty,
    unit: l.unit,
    rate: l.rate,
    gst_rate: l.gst_rate,
    amount: round2(l.qty * l.rate),
    special_notes: ''
  }));
  const partyId = document.getElementById('pos-customer').value || null;
  const payload = {
    business_id: currentBusiness.id,
    party_id: partyId,
    table_id: document.getElementById('pos-table').value || null,
    waiter: document.getElementById('pos-waiter').value,
    type: 'pos',
    dine_type: document.getElementById('pos-dine-type').value,
    platform: document.getElementById('pos-platform').value,
    platform_fee: 0,
    status,
    sent_to_kitchen: !!sentToKitchen,
    invoice_date: todayStr(),
    due_date: null,
    place_of_supply: currentBusiness.state || '',
    items_total: t.subtotal,
    discount_amount: Number(discountAmount) || 0,
    tax_amount: t.tax,
    shipping_charges: 0,
    total,
    notes: ''
  };

  let invoiceId = posCurrent;
  if (invoiceId) {
    const { error } = await sb.from('be_invoices').update(payload).eq('id', invoiceId);
    if (error) return showToast('Update failed: ' + error.message, 'error');
  } else {
    let inserted = null;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      payload.invoice_number = nextPOSNumber();
      const { data, error } = await sb.from('be_invoices').insert([payload]).select().single();
      if (!error) inserted = data;
      else if (error.code === '23505') { /* retry with next number */ }
      else return showToast('Save failed: ' + error.message, 'error');
    }
    if (!inserted) return null;
    invoiceId = inserted.id;
    await bumpSeq('pos_seq');
  }

  await sb.from('be_invoice_items').delete().eq('invoice_id', invoiceId);
  await sb.from('be_invoice_items').insert(items.map(it => ({ ...it, business_id: currentBusiness.id, invoice_id: invoiceId })));
  return invoiceId;
}

// ---------- Hold ----------
async function posHold() {
  if (!posCart.length) return showToast('Bill is empty', 'error');
  const id = await posSave('open', 0, false);
  if (!id) return;
  showToast('Bill saved & held');
  posCart = [];
  posCurrent = null;
  await loadAllData();
  renderPOS();
}

// ---------- Resume a held / kitchen order ----------
function posResume(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  posCart = (invoiceItems[id] || []).map(it => ({
    key: it.id || it.product_id || ('x' + it.product_name + it.rate),
    product_id: it.product_id || null,
    name: it.product_name,
    unit: it.unit,
    rate: Number(it.rate),
    gst_rate: Number(it.gst_rate || 0),
    qty: Number(it.qty || 1)
  }));
  posCurrent = id;
  if (document.getElementById('pos-dine-type')) document.getElementById('pos-dine-type').value = inv.dine_type || 'dine_in';
  if (document.getElementById('pos-table')) document.getElementById('pos-table').value = inv.table_id || '';
  if (document.getElementById('pos-platform')) document.getElementById('pos-platform').value = inv.platform || '';
  if (document.getElementById('pos-waiter')) document.getElementById('pos-waiter').value = inv.waiter || '';
  if (document.getElementById('pos-customer')) document.getElementById('pos-customer').value = inv.party_id || '';
  renderPOS();
  window.scrollTo(0, 0);
}

// ---------- Send to kitchen ----------
async function posSendKitchen() {
  if (!posCart.length) return showToast('Bill is empty', 'error');
  const id = await posSave('sent', 0, true);
  if (!id) return;
  showToast('Sent to kitchen');
  posCart = [];
  posCurrent = null;
  await loadAllData();
  renderPOS();
  refreshBadges();
}

// ---------- Held bills / open tables list ----------
function renderPosHolds() {
  const el = document.getElementById('pos-holds');
  const list = invoices
    .filter(i => i.type === 'pos' && ['open', 'sent', 'ready', 'served'].includes(i.status) && Number(i.paid_amount) < Number(i.total))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  el.innerHTML = list.map(i => {
    const table = i.table_id ? tableName(i.table_id) : '';
    return '<div class="pos-holds-item">' +
      '<span><span class="ph-num">' + escHtml(i.invoice_number) + '</span>' +
      ' <span class="ph-tag">' + escHtml(i.dine_type || '') + (table ? ' / ' + escHtml(table) : '') + (i.waiter ? ' / ' + escHtml(i.waiter) : '') + ' &mdash; ' + fmtMoney(i.total) + '</span></span>' +
      '<button class="btn btn-xs btn-secondary" onclick="posResume(\'' + i.id + '\')">Resume</button>' +
    '</div>';
  }).join('') || '<p style="color:var(--muted);text-align:center;padding:10px 4px;">No held bills or open tables.</p>';
}

// ---------- Quick pay ----------
function quickPay() {
  if (!posCart.length) return showToast('Bill is empty', 'error');
  const t = posTotals();
  document.getElementById('quickpay-invoice-id').value = posCurrent || '';
  document.getElementById('quickpay-order-label').textContent = posOrderLabel();
  document.getElementById('quickpay-total').textContent = fmtMoney(t.total);
  document.getElementById('quickpay-amount').value = t.total;
  document.getElementById('quickpay-method').value = 'cash';
  document.getElementById('quickpay-notes').value = '';
  document.getElementById('quickpay-redeem').checked = false;
  document.getElementById('quickpay-redeem-pts').value = 0;

  const partyId = document.getElementById('pos-customer').value;
  const party = parties.find(p => p.id === partyId);
  const loyaltyEnabled = currentBusiness && currentBusiness.loyalty_enabled === true && party;
  document.getElementById('quickpay-loyalty-row').classList.toggle('hidden', !loyaltyEnabled);
  if (loyaltyEnabled) document.getElementById('quickpay-points').textContent = Number(party.loyalty_points || 0);

  quickpayCalcChange();
  openModal('quickpay-modal');
}

function quickpayCalcChange() {
  const t = posTotals();
  const redeemChecked = document.getElementById('quickpay-redeem').checked;
  let redeemValue = 0;
  if (redeemChecked) {
    const pts = Math.floor(Number(document.getElementById('quickpay-redeem-pts').value || 0));
    redeemValue = round2(Math.min(pts * 0.5, t.total));
  }
  const received = Number(document.getElementById('quickpay-amount').value || 0);
  const change = round2(received - (t.total - redeemValue));
  document.getElementById('quickpay-change').value = (change >= 0 ? '₹' : '-₹') + Math.abs(change).toFixed(2);
}

async function confirmQuickPay() {
  if (!posCart.length) return showToast('Bill is empty', 'error');
  const t = posTotals();
  const partyId = document.getElementById('pos-customer').value || null;
  const party = parties.find(p => p.id === partyId);
  const redeemChecked = document.getElementById('quickpay-redeem').checked;

  let redeemPts = 0;
  if (redeemChecked && party) {
    const avail = Number(party.loyalty_points || 0);
    const maxUsable = Math.floor(t.total / 0.5);
    redeemPts = Math.min(Math.floor(Number(document.getElementById('quickpay-redeem-pts').value || 0)), avail, maxUsable);
    if (redeemPts > 0) showToast(redeemPts + ' points redeemed', 'info');
  }
  const redeemValue = round2(redeemPts * 0.5);
  const finalTotal = round2(t.total - redeemValue);
  const received = Number(document.getElementById('quickpay-amount').value || 0);
  if (received < finalTotal - 0.01) return showToast('Amount received is less than the bill total', 'error');

  const id = await posSave('sent', redeemValue, true);
  if (!id) return;
  await adjustStock(posCart.map(l => ({
    product_id: l.product_id, qty: l.qty, amount: round2(l.qty * l.rate)
  })), -1);

  const { error: payErr } = await sb.from('be_payments').insert([{
    business_id: currentBusiness.id,
    invoice_id: id,
    party_id: partyId,
    direction: 'received',
    amount: finalTotal,
    method: document.getElementById('quickpay-method').value,
    payment_date: todayStr(),
    notes: document.getElementById('quickpay-notes').value
  }]);
  if (payErr) return showToast('Payment failed: ' + payErr.message, 'error');

  if (party && currentBusiness.loyalty_enabled === true) {
    const earned = Math.floor(t.total / 10);
    const rows = [];
    if (earned > 0) rows.push({ points: earned, reason: 'Earned on bill ' + posOrderLabel() });
    if (redeemPts > 0) rows.push({ points: -redeemPts, reason: 'Redeemed on bill ' + posOrderLabel() });
    for (const r of rows) {
      await sb.from('be_loyalty_ledger').insert([{
        business_id: currentBusiness.id,
        party_id: party.id,
        invoice_id: id,
        points: r.points,
        reason: r.reason
      }]);
    }
    const newPts = Math.max(0, Number(party.loyalty_points || 0) + earned - redeemPts);
    await sb.from('be_parties').update({ loyalty_points: newPts }).eq('id', party.id);
    party.loyalty_points = newPts;
  }

  closeModal('quickpay-modal');
  showToast('Payment received - ' + posOrderLabel());
  posCart = [];
  posCurrent = null;
  await loadAllData();
  renderPOS();
  refreshBadges();
}

// ---------- Receipt printing (from current cart) ----------
function printReceipt() {
  if (!posCart.length) return showToast('Bill is empty', 'error');
  const t = posTotals();
  const party = parties.find(p => p.id === (document.getElementById('pos-customer').value || null));
  const data = {
    inv: {
      invoice_number: posOrderLabel(),
      invoice_date: todayStr(),
      type: 'pos',
      status: 'open',
      items_total: t.subtotal,
      discount_amount: 0,
      tax_amount: t.tax,
      shipping_charges: 0,
      total: t.total,
      paid_amount: 0,
      dine_type: document.getElementById('pos-dine-type').value,
      place_of_supply: currentBusiness.state || ''
    },
    party,
    items: posCart.map(l => ({
      product_name: l.name,
      hsn: (products.find(p => p.id === l.product_id) || {}).hsn || '',
      qty: l.qty,
      unit: l.unit,
      rate: l.rate,
      gst_rate: l.gst_rate,
      amount: round2(l.qty * l.rate)
    })),
    biz: currentBusiness
  };
  const frame = document.getElementById('print-frame');
  frame.onload = () => {
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(buildInvoiceHTML(data));
    doc.close();
    setTimeout(() => frame.contentWindow.print(), 250);
  };
  frame.src = 'about:blank';
}

// ---------- Keyboard shortcuts ----------
document.addEventListener('keydown', e => {
  const panel = document.getElementById('panel-pos');
  if (!panel || !panel.classList.contains('active')) return;
  if (document.querySelector('.modal-overlay.open')) return;
  const tag = (e.target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.key === '/') { e.preventDefault(); document.getElementById('pos-search').focus(); }
  else if (e.key === 'F4') { e.preventDefault(); posHold(); }
  else if (e.key === 'F8') { e.preventDefault(); quickPay(); }
  else if (e.key === 'F9') { e.preventDefault(); posSendKitchen(); }
  else if (e.key === 'F10') { e.preventDefault(); printReceipt(); }
  else if (e.key === 'Escape') { e.preventDefault(); posNewBill(); }
});

// ---------- Events ----------
document.getElementById('pos-dine-type').addEventListener('change', setPosDineType);
document.getElementById('pos-search').addEventListener('input', renderPosItems);
document.getElementById('quickpay-amount').addEventListener('input', quickpayCalcChange);
document.getElementById('quickpay-redeem').addEventListener('change', quickpayCalcChange);
document.getElementById('quickpay-redeem-pts').addEventListener('input', quickpayCalcChange);
