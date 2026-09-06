/* ============================================================================
   BillEase v2 - Compliance module (e-Way Bills & e-Invoices)
   Demo-mode e-Way bill tracking and GSTN IRP-style e-invoice generation with
   QR payload. Swap the generate functions for real GSTN API calls in production.
   ========================================================================== */

let compTab = 'eway';

// ---------- Tabs ----------
function setCompTab(tab) {
  compTab = tab;
  document.querySelectorAll('#comp-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('comp-eway-view').classList.toggle('hidden', tab !== 'eway');
  document.getElementById('comp-einvoice-view').classList.toggle('hidden', tab !== 'einvoice');
  renderCompliance();
}

function renderCompliance() {
  renderEWay();
  renderEInvoice();
}

// ---------- e-Way bills ----------
function renderEWay() {
  const list = ewayBills.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  document.getElementById('eway-body').innerHTML = list.map(e => {
    const inv = invoices.find(i => i.id === e.invoice_id);
    return '<tr>' +
      '<td><b>' + escHtml(e.eway_number) + '</b></td>' +
      '<td>' + escHtml(inv ? inv.invoice_number : '&mdash;') + '</td>' +
      '<td>' + escHtml(e.transporter_name || '&mdash;') + '</td>' +
      '<td>' + escHtml(e.vehicle_no || '&mdash;') + '</td>' +
      '<td>' + escHtml(e.from_state || '') + ' &rarr; ' + escHtml(e.to_state || '') +
        (e.distance_km ? ' <span style="color:var(--muted)">(' + e.distance_km + ' km)</span>' : '') + '</td>' +
      '<td>' + fmtMoney(e.value) + '</td>' +
      '<td><span class="badge badge-' + (e.status === 'cancelled' ? 'cancelled' : 'paid') + '">' + escHtml(e.status) + '</span></td>' +
      '<td class="actions">' +
        '<button class="btn btn-xs btn-secondary" onclick="editEWay(\'' + e.id + '\')">Edit</button>' +
        '<button class="btn btn-xs btn-danger" onclick="deleteEWay(\'' + e.id + '\')">Delete</button>' +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:30px;">No e-Way bills yet. Add one for inter-state or high-value movement.</td></tr>';
}

function resetEWayForm() {
  document.getElementById('eway-id').value = '';
  document.getElementById('eway-number').value = '';
  document.getElementById('eway-transporter').value = '';
  document.getElementById('eway-vehicle').value = '';
  document.getElementById('eway-vtype').value = '';
  document.getElementById('eway-from-state').value = currentBusiness && currentBusiness.state ? currentBusiness.state : '';
  document.getElementById('eway-to-state').value = '';
  document.getElementById('eway-from-pin').value = currentBusiness && currentBusiness.pincode ? currentBusiness.pincode : '';
  document.getElementById('eway-to-pin').value = '';
  document.getElementById('eway-distance').value = 0;
  document.getElementById('eway-value').value = 0;
  const sel = document.getElementById('eway-invoice');
  sel.innerHTML = '<option value="">-- Select invoice --</option>' +
    invoices.filter(i => isSale(i) && i.status !== 'cancelled').map(i =>
      '<option value="' + i.id + '">' + escHtml(i.invoice_number) + ' (' + fmtMoney(i.total) + ')</option>'
    ).join('');
}

function showEWayModal() {
  resetEWayForm();
  document.getElementById('eway-modal-title').textContent = 'New e-Way Bill';
  openModal('eway-modal');
}

function editEWay(id) {
  const e = ewayBills.find(x => x.id === id);
  if (!e) return;
  resetEWayForm();
  document.getElementById('eway-id').value = e.id;
  document.getElementById('eway-number').value = e.eway_number;
  document.getElementById('eway-transporter').value = e.transporter_name || '';
  document.getElementById('eway-vehicle').value = e.vehicle_no || '';
  document.getElementById('eway-vtype').value = e.vehicle_type || '';
  document.getElementById('eway-from-state').value = e.from_state || '';
  document.getElementById('eway-to-state').value = e.to_state || '';
  document.getElementById('eway-from-pin').value = e.from_pincode || '';
  document.getElementById('eway-to-pin').value = e.to_pincode || '';
  document.getElementById('eway-distance').value = e.distance_km || 0;
  document.getElementById('eway-value').value = e.value || 0;
  const sel = document.getElementById('eway-invoice');
  sel.innerHTML = '<option value="">-- Select invoice --</option>' +
    invoices.filter(i => isSale(i) && i.status !== 'cancelled').map(i =>
      '<option value="' + i.id + '"' + (i.id === e.invoice_id ? ' selected' : '') + '>' +
      escHtml(i.invoice_number) + ' (' + fmtMoney(i.total) + ')</option>'
    ).join('');
  document.getElementById('eway-modal-title').textContent = 'Edit e-Way Bill';
  openModal('eway-modal');
}

async function saveEWay() {
  const ewayNumber = document.getElementById('eway-number').value.trim();
  if (!ewayNumber) return showToast('Enter the e-Way number', 'error');
  const id = document.getElementById('eway-id').value;
  const payload = {
    invoice_id: document.getElementById('eway-invoice').value || null,
    eway_number: ewayNumber,
    transporter_name: document.getElementById('eway-transporter').value.trim(),
    vehicle_no: document.getElementById('eway-vehicle').value.trim(),
    vehicle_type: document.getElementById('eway-vtype').value.trim(),
    from_state: document.getElementById('eway-from-state').value.trim(),
    to_state: document.getElementById('eway-to-state').value.trim(),
    from_pincode: document.getElementById('eway-from-pin').value.trim(),
    to_pincode: document.getElementById('eway-to-pin').value.trim(),
    distance_km: Number(document.getElementById('eway-distance').value || 0),
    value: Number(document.getElementById('eway-value').value || 0),
    status: 'generated'
  };
  if (id) {
    const { error } = await sb.from('be_eway_bills').update(payload).eq('id', id);
    if (error) return showToast('Update failed: ' + error.message, 'error');
    Object.assign(ewayBills.find(x => x.id === id), payload);
    showToast('e-Way bill updated');
  } else {
    const { data, error } = await sb.from('be_eway_bills')
      .insert([{ ...payload, business_id: currentBusiness.id }]).select().single();
    if (error) return showToast('Save failed: ' + error.message, 'error');
    ewayBills.push(data);
    if (payload.invoice_id) {
      await sb.from('be_invoices').update({ eway_number: ewayNumber, eway_status: 'generated' }).eq('id', payload.invoice_id);
      const inv = invoices.find(i => i.id === payload.invoice_id);
      if (inv) { inv.eway_number = ewayNumber; inv.eway_status = 'generated'; }
    }
    showToast('e-Way bill saved');
  }
  closeModal('eway-modal');
  renderCompliance();
}

async function deleteEWay(id) {
  if (!confirm('Delete this e-Way bill?')) return;
  const { error } = await sb.from('be_eway_bills').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  ewayBills = ewayBills.filter(x => x.id !== id);
  showToast('e-Way bill deleted');
  renderCompliance();
}

// ---------- e-Invoices (demo IRP) ----------
function renderEInvoice() {
  const list = invoices.filter(i => i.type === 'sale' && i.status !== 'cancelled')
    .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date));
  document.getElementById('einvoice-body').innerHTML = list.map(i => {
    const p = parties.find(x => x.id === i.party_id);
    return '<tr>' +
      '<td><b>' + escHtml(i.invoice_number) + '</b></td>' +
      '<td>' + escHtml(p ? p.name : '&mdash;') + '</td>' +
      '<td>' + escHtml(p && p.gstin ? p.gstin : '&mdash;') + '</td>' +
      '<td>' + fmtMoney(i.total) + '</td>' +
      '<td style="max-width:180px;word-break:break-all;font-size:11px;">' + (i.irn ? escHtml(i.irn) : '<span style="color:var(--muted)">Not generated</span>') + '</td>' +
      '<td>' + escHtml(i.ack_no || '&mdash;') + '</td>' +
      '<td class="actions">' +
        (i.irn
          ? '<button class="btn btn-xs btn-secondary" onclick="viewEInvoice(\'' + i.id + '\')">View QR</button>'
          : '<button class="btn btn-xs btn-success" onclick="generateEInvoice(\'' + i.id + '\')">Generate</button>') +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">No sale invoices to e-invoice yet.</td></tr>';
}

// Build the IRP QR payload string (demo, mirrors the GSTN schema fields)
function eInvoiceQRPayload(inv, party) {
  const items = invoiceItems[inv.id] || [];
  const gstMap = {};
  items.forEach(it => {
    gstMap[Number(it.gst_rate) || 0] = (gstMap[Number(it.gst_rate) || 0] || 0) + Number(it.amount || 0);
  });
  const taxParts = Object.entries(gstMap).map(([rate, amt]) => {
    const cgst = round2(amt * Number(rate) / 200);
    return Number(rate) + '%:' + cgst.toFixed(2) + ':' + cgst.toFixed(2);
  });
  const buyer = party || {};
  return [
    inv.irn || '',
    String((buyer.gstin || '').slice(0, 2)),
    String((buyer.gstin || '').slice(2, 13)),
    String((buyer.gstin || '').slice(13, 15)),
    (buyer.billing_address || ''),
    '0',
    (currentBusiness && currentBusiness.name) || '',
    String(inv.invoice_number),
    String(inv.invoice_date),
    Number(inv.items_total || 0).toFixed(2),
    Number(inv.tax_amount || 0).toFixed(2),
    Number(inv.total || 0).toFixed(2),
    taxParts.join(',')
  ].join('|');
}

async function generateEInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  const party = parties.find(p => p.id === inv.party_id);
  if (!party || !party.gstin) return showToast('Add a GSTIN to the party before e-invoicing', 'error');

  const irn = 'IN' + Date.now().toString().slice(-15);
  const ackNo = 'AA' + Math.floor(100000 + Math.random() * 900000);
  const qrData = eInvoiceQRPayload(inv, party);
  const { error } = await sb.from('be_invoices')
    .update({ irn, ack_no: ackNo, ack_date: new Date().toISOString(), qr_data: qrData }).eq('id', id);
  if (error) return showToast('e-Invoice failed: ' + error.message, 'error');
  inv.irn = irn; inv.ack_no = ackNo; inv.ack_date = new Date().toISOString(); inv.qr_data = qrData;
  showToast('e-Invoice generated (demo)');
  renderCompliance();
  viewEInvoice(id);
}

function viewEInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  const party = parties.find(p => p.id === inv.party_id);
  const biz = currentBusiness || {};
  const items = invoiceItems[id] || [];

  const rows = [
    ['Invoice No.', inv.invoice_number],
    ['Invoice Date', fmtDate(inv.invoice_date)],
    ['Supplier', biz.name + (biz.gstin ? ' (GSTIN ' + biz.gstin + ')' : '')],
    ['Buyer', (party ? party.name : '') + (party && party.gstin ? ' (GSTIN ' + party.gstin + ')' : '')],
    ['Amount', fmtMoney(inv.total)],
    ['IRN', inv.irn || ''],
    ['Ack No.', inv.ack_no || ''],
    ['Ack Date', inv.ack_date || ''],
    ['Items', items.map(it => it.product_name + ' x' + it.qty).join(', ')]
  ];
  document.getElementById('einvoice-modal-no').textContent = inv.invoice_number;
  document.getElementById('einvoice-detail-body').innerHTML = rows.map(([k, v]) =>
    '<tr><td style="width:130px;color:var(--muted);"><b>' + escHtml(k) + '</b></td>' +
    '<td style="word-break:break-all;">' + escHtml(v || '&mdash;') + '</td></tr>'
  ).join('');
  document.getElementById('qr-payload').value = inv.qr_data || '';
  if (inv.qr_data && window.QRCode) {
    QRCode.toCanvas(document.getElementById('qr-canvas'), inv.qr_data, { width: 160 }, err => {
      if (err) console.warn('QR render failed', err);
    });
  }
  openModal('einvoice-modal');
}
