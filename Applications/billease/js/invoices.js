/* ============================================================================
   BillEase v2 - Invoices module
   GST invoice creation (sale / quotation / purchase), listing, payment
   tracking, quotation -> invoice conversion, print, PDF and sharing.
   ========================================================================== */

let editingInvoiceId = null;   // set when editing an existing invoice

// ---------- Editor init ----------
function initInvoiceEditor() {
  editingInvoiceId = null;
  document.getElementById('inv-items-body').innerHTML = '';
  document.getElementById('inv-number').value = nextInvoiceNumber();
  document.getElementById('inv-date').value = todayStr();
  document.getElementById('inv-due').value = '';
  document.getElementById('inv-place').value = currentBusiness && currentBusiness.state ? currentBusiness.state : '';
  document.getElementById('inv-type').value = 'sale';
  document.getElementById('inv-dine-type').value = 'dine_in';
  document.getElementById('inv-table').innerHTML =
    '<option value="">-- None --</option>' +
    tables.map(t => '<option value="' + t.id + '">' + escHtml(t.name) + '</option>').join('');
  document.getElementById('inv-waiter').value = '';
  document.getElementById('inv-platform').value = '';
  document.getElementById('inv-platform-fee').value = 0;
  document.getElementById('inv-notes-short').value = '';
  document.getElementById('inv-discount').value = 0;
  document.getElementById('inv-shipping').value = 0;
  document.getElementById('inv-notes').value = '';
  refreshPartySelects();
  document.getElementById('invoice-editor-title').textContent = 'New Invoice';
  document.getElementById('inv-save-btn').textContent = 'Save Invoice';
  addInvoiceRow();
  computeInvoiceTotals();
}

function addInvoiceRow(product) {
  const tbody = document.getElementById('inv-items-body');
  const tr = document.createElement('tr');
  const n = tbody.children.length + 1;
  tr.innerHTML =
    '<td>' + n + '</td>' +
    '<td><input type="text" class="ii-name" placeholder="Item name" value="' + (product ? escHtml(product.name) : '') + '"></td>' +
    '<td><input type="text" class="ii-hsn" value="' + (product ? escHtml(product.hsn || '') : '') + '"></td>' +
    '<td><input type="number" class="ii-qty" value="' + (product ? product.qty || 1 : 1) + '" min="1"></td>' +
    '<td><input type="text" class="ii-unit" value="' + (product ? escHtml(product.unit) : 'pcs') + '"></td>' +
    '<td><input type="number" class="ii-rate" value="' + (product ? Number(product.selling_price || 0) : 0) + '" step="0.01" min="0"></td>' +
    '<td><select class="ii-gst">' + gstOptions(product ? product.gst_rate : (currentBusiness && currentBusiness.gst_enabled === false ? 0 : 18)) + '</select></td>' +
    '<td class="ii-amount">&#8377;0.00</td>' +
    '<td><input type="text" class="ii-notes" placeholder="e.g. less spicy"></td>' +
    '<td><button class="btn btn-xs btn-danger" onclick="removeInvoiceRow(this)">&#10005;</button></td>';
  if (product) tr.setAttribute('data-product-id', product.id || '');
  tbody.appendChild(tr);
  bindItemRow(tr);
  computeInvoiceTotals();
}

function removeInvoiceRow(btn) {
  btn.closest('tr').remove();
  computeInvoiceTotals();
}

function gstOptions(selected) {
  const rates = [0, 5, 12, 18, 28];
  return rates.map(r =>
    '<option value="' + r + '"' + (Number(selected) === r ? ' selected' : '') + '>' + r + '%</option>'
  ).join('');
}

function bindItemRow(tr) {
  tr.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', computeInvoiceTotals);
  });
}

// Recalculate subtotal, tax, total for the editor
function computeInvoiceTotals() {
  const rows = [...document.querySelectorAll('#inv-items-body tr')];
  let subtotal = 0;
  rows.forEach(tr => {
    const qty = Number(tr.querySelector('.ii-qty').value || 0);
    const rate = Number(tr.querySelector('.ii-rate').value || 0);
    const amount = round2(qty * rate);
    tr.querySelector('.ii-amount').textContent = fmtMoney(amount);
    subtotal += amount;
  });
  const discount = Number(document.getElementById('inv-discount').value || 0);
  const shipping = Number(document.getElementById('inv-shipping').value || 0);
  let tax = 0;
  rows.forEach(tr => {
    const qty = Number(tr.querySelector('.ii-qty').value || 0);
    const rate = Number(tr.querySelector('.ii-rate').value || 0);
    const gst = Number(tr.querySelector('.ii-gst').value || 0);
    tax += round2(qty * rate * gst / 100);
  });
  const taxable = subtotal - discount;
  const total = round2(taxable + tax + shipping);

  document.getElementById('inv-subtotal').textContent = fmtMoney(subtotal);
  document.getElementById('inv-tax').textContent = fmtMoney(tax);
  document.getElementById('inv-total').textContent = fmtMoney(total);
}

// ---------- Product picker ----------
function pickProducts() {
  renderPicker();
  document.getElementById('picker-search').value = '';
  openModal('picker-modal');
}

function renderPicker() {
  const q = (document.getElementById('picker-search').value || '').toLowerCase();
  const list = products.filter(p => !p.is_ingredient && (!q || p.name.toLowerCase().includes(q)));
  document.getElementById('picker-list').innerHTML = list.map(p =>
    '<label class="picker-item"><span class="pick-check">' +
    '<input type="checkbox" class="pick-box" value="' + p.id + '">' +
    '<span><b>' + escHtml(p.name) + '</b> <span style="color:var(--muted)">(' + escHtml(p.unit) + ')</span></span>' +
    '</span><span style="color:var(--muted)">' + fmtMoney(p.selling_price) + ' / ' + escHtml(p.hsn || '') + '</span></label>'
  ).join('') || '<p style="color:var(--muted)">No products found. Add products in the Products tab first.</p>';
}

function applyPicker() {
  const checked = [...document.querySelectorAll('.pick-box:checked')];
  checked.forEach(box => {
    const p = products.find(x => x.id === box.value);
    if (p) addInvoiceRow(p);
  });
  closeModal('picker-modal');
}

// ---------- Save / create invoice ----------
async function saveInvoice() {
  const partyId = document.getElementById('inv-party').value;
  const rows = [...document.querySelectorAll('#inv-items-body tr')];
  const items = rows.map(tr => ({
    product_id: tr.getAttribute('data-product-id') || null,
    product_name: tr.querySelector('.ii-name').value,
    hsn: tr.querySelector('.ii-hsn').value,
    qty: Number(tr.querySelector('.ii-qty').value || 0),
    unit: tr.querySelector('.ii-unit').value,
    rate: Number(tr.querySelector('.ii-rate').value || 0),
    gst_rate: Number(tr.querySelector('.ii-gst').value || 0),
    special_notes: tr.querySelector('.ii-notes').value,
    amount: round2(Number(tr.querySelector('.ii-qty').value || 0) * Number(tr.querySelector('.ii-rate').value || 0))
  })).filter(it => it.product_name && it.qty > 0);

  if (!partyId) return showToast('Select a customer / vendor', 'error');
  if (!items.length) return showToast('Add at least one item', 'error');

  const subtotal = round2(items.reduce((s, it) => s + it.amount, 0));
  const discount = Number(document.getElementById('inv-discount').value || 0);
  const shipping = Number(document.getElementById('inv-shipping').value || 0);
  const tax = round2(items.reduce((s, it) => s + (it.amount * it.gst_rate / 100), 0));
  const total = round2(subtotal - discount + tax + shipping);
  const type = document.getElementById('inv-type').value;
  const tableId = document.getElementById('inv-table').value || null;
  let number = document.getElementById('inv-number').value.trim() || nextInvoiceNumber();

  const payload = {
    business_id: currentBusiness.id,
    party_id: partyId,
    table_id: tableId,
    waiter: document.getElementById('inv-waiter').value,
    type,
    dine_type: document.getElementById('inv-dine-type').value,
    platform: document.getElementById('inv-platform').value,
    platform_fee: Number(document.getElementById('inv-platform-fee').value || 0),
    invoice_date: document.getElementById('inv-date').value,
    due_date: document.getElementById('inv-due').value || null,
    place_of_supply: document.getElementById('inv-place').value,
    items_total: subtotal,
    discount_amount: discount,
    tax_amount: tax,
    shipping_charges: shipping,
    total,
    notes: document.getElementById('inv-notes').value + (document.getElementById('inv-notes-short').value ? (document.getElementById('inv-notes').value ? ' ' : '') + document.getElementById('inv-notes-short').value : ''),
    status: 'draft'
  };

  let invoiceId;
  if (editingInvoiceId) {
    payload.status = (invoices.find(i => i.id === editingInvoiceId) || {}).status || 'draft';
    const { error } = await sb.from('be_invoices').update(payload).eq('id', editingInvoiceId);
    if (error) return showToast('Update failed: ' + error.message, 'error');
    invoiceId = editingInvoiceId;
  } else {
    for (let attempt = 0; attempt < 5; attempt++) {
      payload.invoice_number = number;
      const { data, error } = await sb.from('be_invoices').insert([payload]).select().single();
      if (!error) { invoiceId = data.id; break; }
      if (error.code === '23505') { number = nextInvoiceNumber(); continue; }
      return showToast('Save failed: ' + error.message, 'error');
    }
    if (!invoiceId) return;
  }

  await sb.from('be_invoice_items').delete().eq('invoice_id', invoiceId);
  await sb.from('be_invoice_items').insert(items.map(it => ({ ...it, business_id: currentBusiness.id, invoice_id: invoiceId })));

  if (type === 'sale') await adjustStock(items, -1);
  if (type === 'purchase') await adjustStock(items, 1);

  if (!editingInvoiceId) await bumpSeq('invoice_seq');

  showToast(editingInvoiceId ? 'Invoice updated' : 'Invoice ' + number + ' created');
  await loadAllData();
  showView('invoices');
}

// Adjust stock (dish -> ingredients via recipe, else product directly).
// dir: -1 to deduct, +1 to add back.
async function adjustStock(items, dir) {
  for (const it of items) {
    if (!it.product_id) continue;
    const prod = products.find(p => p.id === it.product_id);
    if (!prod || prod.is_service) continue;
    const recipeParts = recipes.filter(r => r.product_id === it.product_id);
    if (recipeParts.length) {
      for (const r of recipeParts) {
        const ing = products.find(p => p.id === r.ingredient_id);
        if (!ing || ing.is_service) continue;
        const qty = round2(Number(r.qty) * Number(it.qty));
        const newStock = Math.max(0, round2(Number(ing.stock || 0) + dir * qty));
        await sb.from('be_products').update({ stock: newStock }).eq('id', ing.id);
        ing.stock = newStock;
      }
    } else {
      const newStock = Math.max(0, round2(Number(prod.stock || 0) + dir * it.qty));
      await sb.from('be_products').update({ stock: newStock }).eq('id', prod.id);
      prod.stock = newStock;
    }
  }
}

// ---------- List ----------
function renderInvoices() {
  const fType = document.getElementById('inv-filter-type').value;
  const fStatus = document.getElementById('inv-filter-status').value;
  const q = (document.getElementById('inv-search').value || '').toLowerCase();

  let list = invoices.slice();
  if (fType !== 'all') list = list.filter(i => i.type === fType);
  if (fStatus !== 'all') list = list.filter(i => i.status === fStatus);
  if (q) list = list.filter(i => {
    const party = parties.find(p => p.id === i.party_id);
    return i.invoice_number.toLowerCase().includes(q) || (party && party.name.toLowerCase().includes(q));
  });
  list.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date));

  document.getElementById('invoices-body').innerHTML = list.map(i => {
    const party = parties.find(p => p.id === i.party_id);
    const table = i.table_id ? tableName(i.table_id) : '';
    const dineCell = (i.dine_type || '') + (table ? ' / ' + table : '');
    return '<tr>' +
      '<td><b>' + escHtml(i.invoice_number) + '</b></td>' +
      '<td>' + escHtml(party ? party.name : '&mdash;') + '</td>' +
      '<td>' + fmtDate(i.invoice_date) + '</td>' +
      '<td>' + escHtml(i.type) + '</td>' +
      '<td>' + escHtml(dineCell || '&mdash;') + '</td>' +
      '<td>' + fmtMoney(i.total) + '</td>' +
      '<td>' + fmtMoney(i.paid_amount) + '</td>' +
      '<td><span class="badge badge-' + escHtml(i.status) + '">' + escHtml(statusLabel(i.status)) + '</span></td>' +
      '<td class="actions">' +
        '<button class="btn btn-xs btn-secondary" onclick="viewInvoice(\'' + i.id + '\')">View</button>' +
        '<button class="btn btn-xs btn-secondary" onclick="editInvoice(\'' + i.id + '\')">Edit</button>' +
        '<button class="btn btn-xs btn-danger" onclick="deleteInvoice(\'' + i.id + '\')">Delete</button>' +
      '</td></tr>';
  }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px;">No invoices found</td></tr>';
}

function editInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  editingInvoiceId = id;
  document.getElementById('inv-number').value = inv.invoice_number;
  document.getElementById('inv-date').value = inv.invoice_date;
  document.getElementById('inv-due').value = inv.due_date || '';
  document.getElementById('inv-place').value = inv.place_of_supply || '';
  document.getElementById('inv-type').value = inv.type;
  document.getElementById('inv-dine-type').value = inv.dine_type || 'dine_in';
  document.getElementById('inv-table').innerHTML =
    '<option value="">-- None --</option>' +
    tables.map(t => '<option value="' + t.id + '"' + (t.id === inv.table_id ? ' selected' : '') + '>' + escHtml(t.name) + '</option>').join('');
  document.getElementById('inv-waiter').value = inv.waiter || '';
  document.getElementById('inv-platform').value = inv.platform || '';
  document.getElementById('inv-platform-fee').value = inv.platform_fee || 0;
  document.getElementById('inv-discount').value = inv.discount_amount;
  document.getElementById('inv-shipping').value = inv.shipping_charges;
  document.getElementById('inv-notes').value = inv.notes || '';
  document.getElementById('inv-party').innerHTML =
    '<option value="">-- Select party --</option>' +
    parties.map(p => '<option value="' + p.id + '"' + (p.id === inv.party_id ? ' selected' : '') + '>' + escHtml(p.name) + '</option>').join('');
  document.getElementById('inv-items-body').innerHTML = '';
  const items = invoiceItems[id] || [];
  if (!items.length) addInvoiceRow();
  items.forEach(it => {
    addInvoiceRow({
      id: it.product_id || undefined,
      name: it.product_name,
      hsn: it.hsn,
      unit: it.unit,
      selling_price: it.rate,
      gst_rate: it.gst_rate,
      qty: it.qty
    });
    const lastTr = document.querySelector('#inv-items-body tr:last-child');
    if (lastTr) lastTr.querySelector('.ii-notes').value = it.special_notes || '';
  });
  document.getElementById('invoice-editor-title').textContent = 'Edit ' + inv.invoice_number;
  document.getElementById('inv-save-btn').textContent = 'Update Invoice';
  computeInvoiceTotals();
  showView('invoice-create');
}

async function deleteInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  if (!confirm('Delete invoice ' + inv.invoice_number + '? This cannot be undone.')) return;
  if (inv.type === 'sale' || inv.type === 'pos') await adjustStock(invoiceItems[id] || [], 1);
  if (inv.type === 'purchase') await adjustStock(invoiceItems[id] || [], -1);
  await sb.from('be_invoice_items').delete().eq('invoice_id', id);
  await sb.from('be_payments').delete().eq('invoice_id', id);
  await sb.from('be_invoices').delete().eq('id', id);
  showToast('Invoice deleted');
  await loadAllData();
  renderInvoices();
}

// ---------- Quotation -> Invoice ----------
async function convertQuotation(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv || inv.type !== 'quotation') return;
  if (!confirm('Convert quotation ' + inv.invoice_number + ' into a sale invoice?')) return;
  const items = invoiceItems[id] || [];
  const number = nextInvoiceNumber();
  const payload = {
    business_id: currentBusiness.id,
    invoice_number: number,
    party_id: inv.party_id,
    type: 'sale',
    dine_type: inv.dine_type || 'delivery',
    status: 'draft',
    invoice_date: todayStr(),
    place_of_supply: inv.place_of_supply,
    items_total: inv.items_total,
    discount_amount: inv.discount_amount,
    tax_amount: inv.tax_amount,
    shipping_charges: inv.shipping_charges,
    total: inv.total,
    notes: inv.notes
  };
  let invoiceId = null;
  for (let attempt = 0; attempt < 5 && !invoiceId; attempt++) {
    payload.invoice_number = number;
    const { data, error } = await sb.from('be_invoices').insert([payload]).select().single();
    if (!error) invoiceId = data.id;
    else if (error.code === '23505') { /* retry with same next number */ }
    else return showToast('Conversion failed: ' + error.message, 'error');
  }
  if (!invoiceId) return;
  await sb.from('be_invoice_items').insert(items.map(it => ({
    business_id: currentBusiness.id,
    invoice_id: invoiceId,
    product_id: it.product_id,
    product_name: it.product_name,
    hsn: it.hsn,
    qty: it.qty,
    unit: it.unit,
    rate: it.rate,
    gst_rate: it.gst_rate,
    amount: it.amount,
    special_notes: it.special_notes
  })));
  await adjustStock(items, -1);
  await bumpSeq('invoice_seq');
  showToast('Quotation converted to ' + number);
  await loadAllData();
  renderInvoices();
}

// ---------- View / actions ----------
function viewInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  const party = parties.find(p => p.id === inv.party_id);
  const items = invoiceItems[id] || [];
  const invPayments = payments.filter(p => p.invoice_id === id);
  const remaining = round2(Number(inv.total) - Number(inv.paid_amount));
  const table = inv.table_id ? tableName(inv.table_id) : '';
  const isQuotation = inv.type === 'quotation';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'view-invoice-modal';
  modal.innerHTML =
    '<div class="modal modal-lg">' +
      '<div class="row-between"><h3 style="margin:0;">' + escHtml(inv.invoice_number) +
      ' <span class="badge badge-' + escHtml(inv.status) + '">' + escHtml(statusLabel(inv.status)) + '</span></h3>' +
      '<button class="btn btn-xs btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">&#10005;</button></div>' +
      '<div class="grid-2">' +
        '<div><b>' + escHtml(party ? party.name : 'Unknown') + '</b><br>' +
          '<span style="color:var(--muted)">' + escHtml(party ? party.phone + (party.gstin ? ' &bull; GSTIN: ' + party.gstin : '') : '') + '</span></div>' +
        '<div style="text-align:right"><span style="color:var(--muted)">' + escHtml(inv.type) + ' dated ' + fmtDate(inv.invoice_date) +
          (inv.due_date ? '<br>Due: ' + fmtDate(inv.due_date) : '') +
          (inv.dine_type ? '<br>Dine: ' + escHtml(inv.dine_type) + (table ? ' / ' + escHtml(table) : '') : '') +
          (inv.waiter ? '<br>Waiter: ' + escHtml(inv.waiter) : '') +
          (inv.platform ? '<br>Platform: ' + escHtml(inv.platform) + (inv.platform_fee ? ' (fee ' + fmtMoney(inv.platform_fee) + ')' : '') : '') +
          (inv.place_of_supply ? '<br>Place of Supply: ' + escHtml(inv.place_of_supply) : '') +
        '</span></div>' +
      '</div>' +
      '<div class="table-wrap"><table class="table">' +
        '<thead><tr><th>Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th><th>Notes</th></tr></thead>' +
        '<tbody>' + items.map(it =>
          '<tr><td>' + escHtml(it.product_name) + '</td><td>' + escHtml(it.hsn) + '</td><td>' + Number(it.qty) + ' ' + escHtml(it.unit) +
          '</td><td>' + fmtMoney(it.rate) + '</td><td>' + Number(it.gst_rate) + '%</td><td>' + fmtMoney(it.amount) + '</td>' +
          '<td style="color:var(--warning);font-size:12px;">' + escHtml(it.special_notes || '') + '</td></tr>'
        ).join('') + '</tbody></table></div>' +
      '<div class="invoice-summary">' +
        '<div class="sum-row"><span>Subtotal</span><span>' + fmtMoney(inv.items_total) + '</span></div>' +
        (inv.discount_amount ? '<div class="sum-row"><span>Discount</span><span>- ' + fmtMoney(inv.discount_amount) + '</span></div>' : '') +
        '<div class="sum-row"><span>Tax</span><span>' + fmtMoney(inv.tax_amount) + '</span></div>' +
        (inv.shipping_charges ? '<div class="sum-row"><span>Shipping</span><span>' + fmtMoney(inv.shipping_charges) + '</span></div>' : '') +
        (inv.platform_fee ? '<div class="sum-row"><span>Platform fee</span><span>- ' + fmtMoney(inv.platform_fee) + '</span></div>' : '') +
        '<div class="sum-row total"><span>Total</span><span>' + fmtMoney(inv.total) + '</span></div>' +
        '<div class="sum-row"><span>Paid</span><span>' + fmtMoney(inv.paid_amount) + '</span></div>' +
        '<div class="sum-row"><span>Balance</span><span>' + fmtMoney(remaining) + '</span></div>' +
      '</div>' +
      (inv.notes ? '<p style="color:var(--muted);font-size:13px;">' + escHtml(inv.notes) + '</p>' : '') +
      (inv.eway_number ? '<p style="font-size:12px;">e-Way: <b>' + escHtml(inv.eway_number) + '</b></p>' : '') +
      (inv.irn ? '<p style="font-size:12px;">IRN: <span style="word-break:break-all;">' + escHtml(inv.irn) + '</span> &bull; Ack: ' + escHtml(inv.ack_no || '') + '</p>' : '') +
      (invPayments.length ? '<div class="card-body" style="padding-left:0"><b>Payments</b>' + invPayments.map(p =>
        '<div class="ledger-item"><span>' + fmtDate(p.payment_date) + ' &mdash; ' + escHtml(p.method) + (p.notes ? ' (' + escHtml(p.notes) + ')' : '') + '</span>' +
        '<b>' + (p.direction === 'paid' ? '- ' : '+ ') + fmtMoney(p.amount) + '</b></div>'
      ).join('') + '</div>' : '') +
      '<div class="modal-actions" style="flex-wrap:wrap;">' +
        '<button class="btn btn-secondary btn-sm" onclick="downloadInvoicePDF(\'' + inv.id + '\')">&#8595; PDF</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="printInvoice(\'' + inv.id + '\')">&#128424; Print</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="shareInvoice(\'' + inv.id + '\')">&#10145; Share</button>' +
        (isQuotation ? '<button class="btn btn-success btn-sm" onclick="convertQuotation(\'' + inv.id + '\')">&#10132; Convert to Invoice</button>' : '') +
        (remaining > 0 && isSale(inv) ? '<button class="btn btn-success btn-sm" onclick="openPaymentModal(\'' + inv.id + '\')">+ Record Payment</button>' : '') +
        '<button class="btn btn-secondary btn-sm" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ---------- Payments ----------
function openPaymentModal(invId) {
  const inv = invoices.find(i => i.id === invId);
  const remaining = round2(Number(inv.total) - Number(inv.paid_amount));
  document.getElementById('payment-invoice-id').value = invId;
  document.getElementById('payment-amount').value = remaining;
  document.getElementById('payment-date').value = todayStr();
  document.getElementById('payment-method').value = 'cash';
  document.getElementById('payment-notes').value = '';
  openModal('payment-modal');
}

async function savePayment() {
  const invoiceId = document.getElementById('payment-invoice-id').value;
  const inv = invoices.find(i => i.id === invoiceId);
  const amount = Number(document.getElementById('payment-amount').value || 0);
  const remaining = round2(Number(inv.total) - Number(inv.paid_amount));
  if (amount <= 0) return showToast('Enter a valid amount', 'error');
  if (amount > remaining + 0.01) return showToast('Amount exceeds balance due', 'error');

  const { error } = await sb.from('be_payments').insert([{
    business_id: currentBusiness.id,
    invoice_id: invoiceId,
    party_id: inv.party_id,
    direction: inv.type === 'purchase' ? 'paid' : 'received',
    amount: round2(amount),
    method: document.getElementById('payment-method').value,
    payment_date: document.getElementById('payment-date').value,
    notes: document.getElementById('payment-notes').value
  }]);
  if (error) return showToast('Payment failed: ' + error.message, 'error');
  showToast('Payment recorded');
  closeModal('payment-modal');
  await loadAllData();
  const old = document.getElementById('view-invoice-modal');
  if (old) old.remove();
  viewInvoice(invoiceId);
}

// ---------- Print / PDF / Share ----------
function invoicePrintData(id) {
  const inv = invoices.find(i => i.id === id);
  const party = parties.find(p => p.id === inv.party_id);
  const items = invoiceItems[id] || [];
  const biz = currentBusiness || { name: 'My Business', gst_enabled: true, currency: 'INR' };
  return { inv, party, items, biz };
}

function buildInvoiceHTML(data) {
  const { inv, party, items, biz } = data;
  const remaining = round2(Number(inv.total) - Number(inv.paid_amount));
  const rows = items.map((it, idx) =>
    '<tr><td>' + (idx + 1) + '</td><td>' + escHtml(it.product_name) + '</td><td>' + escHtml(it.hsn) + '</td>' +
    '<td>' + Number(it.qty) + ' ' + escHtml(it.unit) + '</td><td>' + fmtMoney(it.rate) + '</td>' +
    '<td>' + Number(it.gst_rate) + '%</td><td>' + fmtMoney(it.amount) + '</td></tr>'
  ).join('');

  return '<html><head><meta charset="utf-8"><title>' + escHtml(inv.invoice_number) + '</title>' +
    '<style>' +
    'body{font-family:Arial,sans-serif;color:#0f172a;margin:24px;} ' +
    '.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0d9488;padding-bottom:14px;} ' +
    '.hdr .left b{font-size:22px;color:#0d9488;} .hdr .small{color:#64748b;font-size:12px;} ' +
    'h2{color:#0d9488;} table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px;} ' +
    'th{background:#f0fdfa;text-align:left;padding:8px;border:1px solid #e2e8f0;} ' +
    'td{padding:8px;border:1px solid #e2e8f0;} ' +
    '.sum{width:280px;margin-left:auto;margin-top:16px;} .sum div{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;} ' +
    '.sum .t{font-weight:bold;border-top:2px solid #0d9488;font-size:15px;} ' +
    '.foot{margin-top:30px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px;text-align:center;} ' +
    '</style></head><body>' +
    '<div class="hdr">' +
      '<div class="left"><b>' + escHtml(biz.name) + '</b>' +
        '<div class="small">' + escHtml(biz.address + (biz.city ? ', ' + biz.city : '') + (biz.state ? ', ' + biz.state : '') + (biz.pincode ? ' - ' + biz.pincode : '')) + '<br>' +
        (biz.gstin ? 'GSTIN: ' + escHtml(biz.gstin) + '<br>' : '') +
        (biz.fssai ? 'FSSAI: ' + escHtml(biz.fssai) + '<br>' : '') +
        'Phone: ' + escHtml(biz.phone) + ' &nbsp; Email: ' + escHtml(biz.email) + '</div></div>' +
      '<div class="right"><h2 style="margin:0;">' + (inv.type === 'quotation' ? 'QUOTATION' : inv.type === 'purchase' ? 'PURCHASE BILL' : 'TAX INVOICE') + '</h2>' +
        '<div class="small">No: <b>' + escHtml(inv.invoice_number) + '</b><br>Date: ' + fmtDate(inv.invoice_date) +
        (inv.due_date ? '<br>Due: ' + fmtDate(inv.due_date) : '') +
        (inv.dine_type ? '<br>Dine: ' + escHtml(inv.dine_type) : '') +
        (inv.place_of_supply ? '<br>Place of Supply: ' + escHtml(inv.place_of_supply) : '') + '</div></div>' +
    '</div>' +
    '<table style="margin-top:16px;width:60%;border:none;"><tr><td style="border:none;padding-left:0;"><b>Bill To</b><br>' +
      escHtml(party ? party.name : '') + (party && party.company ? '<br>' + escHtml(party.company) : '') +
      (party && party.billing_address ? '<br>' + escHtml(party.billing_address) : '') +
      (party && party.gstin ? '<br>GSTIN: ' + escHtml(party.gstin) : '') +
      '</td></tr></table>' +
    '<table><thead><tr><th>#</th><th>Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>' +
    '<div class="sum">' +
      '<div><span>Subtotal</span><span>' + fmtMoney(inv.items_total) + '</span></div>' +
      (inv.discount_amount ? '<div><span>Discount</span><span>- ' + fmtMoney(inv.discount_amount) + '</span></div>' : '') +
      '<div><span>Tax (GST)</span><span>' + fmtMoney(inv.tax_amount) + '</span></div>' +
      (inv.shipping_charges ? '<div><span>Shipping</span><span>' + fmtMoney(inv.shipping_charges) + '</span></div>' : '') +
      '<div class="t"><span>Total</span><span>' + fmtMoney(inv.total) + '</span></div>' +
      '<div><span>Paid</span><span>' + fmtMoney(inv.paid_amount) + '</span></div>' +
      '<div><span>Balance Due</span><span>' + fmtMoney(remaining) + '</span></div>' +
    '</div>' +
    (inv.notes ? '<p style="margin-top:16px;font-size:13px;">' + escHtml(inv.notes) + '</p>' : '') +
    '<div class="foot">Generated with BillEase &bull; Amount in ' + ((biz.currency) || 'INR') + ' &bull; ' +
      (biz.gst_enabled === false ? 'Non-GST document' : 'This is a computer generated document.') + '</div>' +
    '</body></html>';
}

function printInvoice(id) {
  const frame = document.getElementById('print-frame');
  frame.onload = () => {
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(buildInvoiceHTML(invoicePrintData(id)));
    doc.close();
    setTimeout(() => frame.contentWindow.print(), 250);
  };
  frame.src = 'about:blank';
}

function downloadInvoicePDF(id) {
  const { inv, party, items, biz } = invoicePrintData(id);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.text(biz.name || 'My Business', 14, 17);
  doc.setFontSize(9);
  doc.text('Phone: ' + (biz.phone || '') + '  Email: ' + (biz.email || ''), 14, 26);

  doc.setTextColor(13, 148, 136);
  doc.setFontSize(14);
  const label = inv.type === 'quotation' ? 'QUOTATION' : inv.type === 'purchase' ? 'PURCHASE BILL' : 'TAX INVOICE';
  doc.text(label, pageW - 14, 16, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text('No: ' + inv.invoice_number, pageW - 14, 23, { align: 'right' });
  doc.text('Date: ' + fmtDate(inv.invoice_date), pageW - 14, 29, { align: 'right' });

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text('Bill To:', 14, 44);
  doc.text(party ? (party.name || '') : 'Unknown', 14, 50);
  if (party && party.company) doc.text(party.company, 14, 56);
  if (party && party.gstin) doc.text('GSTIN: ' + party.gstin, 14, 62);

  const head = [['#', 'Item', 'HSN', 'Qty', 'Rate', 'GST', 'Amount']];
  const body = items.map((it, i) => [
    String(i + 1), it.product_name, it.hsn || '-', Number(it.qty) + ' ' + it.unit,
    fmtMoney(it.rate), it.gst_rate + '%', fmtMoney(it.amount)
  ]);
  doc.autoTable({
    startY: 70,
    head,
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [13, 148, 136] },
    margin: { left: 14, right: 14 }
  });
  const y = doc.lastAutoTable.finalY + 8;
  const summary = [
    ['Subtotal', fmtMoney(inv.items_total)],
    ...(inv.discount_amount ? [['Discount', '- ' + fmtMoney(inv.discount_amount)]] : []),
    ['Tax (GST)', fmtMoney(inv.tax_amount)],
    ...(inv.shipping_charges ? [['Shipping', fmtMoney(inv.shipping_charges)]] : []),
    ['Total', fmtMoney(inv.total)],
    ['Paid', fmtMoney(inv.paid_amount)],
    ['Balance Due', fmtMoney(round2(inv.total - inv.paid_amount))]
  ];
  doc.autoTable({
    startY: y,
    body: summary,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold' } },
    margin: { left: pageW - 100, right: 14 }
  });
  if (inv.notes) doc.text(inv.notes, 14, doc.lastAutoTable.finalY + 12);
  doc.save(inv.invoice_number + '.pdf');
}

async function shareInvoice(id) {
  const { inv } = invoicePrintData(id);
  const shareData = { title: 'Invoice ' + inv.invoice_number, text: 'Invoice ' + inv.invoice_number + ' from BillEase' };
  if (navigator.share) {
    try { await navigator.share(shareData); return; } catch (e) { /* fall through to copy */ }
  }
  const url = window.location.origin + window.location.pathname + '?invoice=' + inv.id;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Invoice link copied to clipboard', 'info');
  } catch (e) {
    showToast('Sharing not supported in this browser', 'info');
  }
}

// ---------- Filters ----------
document.getElementById('inv-filter-type').addEventListener('change', renderInvoices);
document.getElementById('inv-filter-status').addEventListener('change', renderInvoices);
document.getElementById('inv-search').addEventListener('input', renderInvoices);
