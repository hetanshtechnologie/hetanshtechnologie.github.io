/* ============================================================================
   BillEase v2 - Customers & Vendors module
   Party management with credit tracking, loyalty points and ledger history.
   ========================================================================== */

let partyFilterType = 'customer';

// ---------- List ----------
function setPartyType(type) {
  partyFilterType = type;
  document.querySelectorAll('#party-type-seg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  renderParties();
}

function renderParties() {
  const q = (document.getElementById('party-search').value || '').toLowerCase();
  const list = parties.filter(p => p.type === partyFilterType &&
    (!q || p.name.toLowerCase().includes(q) || (p.company || '').toLowerCase().includes(q)));
  list.sort((a, b) => a.name.localeCompare(b.name));

  document.getElementById('parties-body').innerHTML = list.map(p => {
    const outstanding = partyOutstanding(p);
    return '<tr>' +
      '<td><b>' + escHtml(p.name) + '</b></td>' +
      '<td>' + escHtml(p.company || '&mdash;') + '</td>' +
      '<td>' + escHtml(p.phone || '&mdash;') + '</td>' +
      '<td>' + escHtml(p.gstin || '&mdash;') + '</td>' +
      '<td class="' + (outstanding > 0 ? 'stock-low' : 'stock-ok') + '">' + fmtMoney(outstanding) + '</td>' +
      '<td>' + (p.type === 'customer'
        ? '<span class="loyalty-chip">' + Number(p.loyalty_points || 0) + ' pts</span>'
        : '<span style="color:var(--muted)">&mdash;</span>') + '</td>' +
      '<td class="actions">' +
        '<button class="btn btn-xs btn-secondary" onclick="showLedger(\'' + p.id + '\')">Ledger</button>' +
        '<button class="btn btn-xs btn-secondary" onclick="editParty(\'' + p.id + '\')">Edit</button>' +
        '<button class="btn btn-xs btn-danger" onclick="deleteParty(\'' + p.id + '\')">Delete</button>' +
      '</td></tr>';
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">No ' + partyFilterType + 's found</td></tr>';
}

// Outstanding balance for a party
// - customer: what they owe us (opening + unpaid sale invoices)
// - vendor: what we owe them (opening + unpaid purchase bills)
function partyOutstanding(p) {
  const scope = invoices.filter(i => i.party_id === p.id && i.status !== 'cancelled');
  const unpaid = scope
    .filter(i => p.type === 'vendor' ? i.type === 'purchase' : isSale(i))
    .reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0);
  return round2(Number(p.opening_balance || 0) + unpaid);
}

// ---------- Modal ----------
function resetPartyForm() {
  document.getElementById('party-id').value = '';
  document.getElementById('party-name').value = '';
  document.getElementById('party-company').value = '';
  document.getElementById('party-phone').value = '';
  document.getElementById('party-email').value = '';
  document.getElementById('party-gstin').value = '';
  document.getElementById('party-type').value = partyFilterType;
  document.getElementById('party-address').value = '';
  document.getElementById('party-credit').value = 0;
  document.getElementById('party-opening').value = 0;
}

function showPartyModal() {
  resetPartyForm();
  document.getElementById('party-modal-title').textContent = 'Add Party';
  openModal('party-modal');
}

// Used from the invoice editor / POS for quick party creation
function quickAddParty() {
  resetPartyForm();
  document.getElementById('party-modal-title').textContent = 'Quick Add Party';
  openModal('party-modal');
}

function editParty(id) {
  const p = parties.find(x => x.id === id);
  if (!p) return;
  document.getElementById('party-id').value = p.id;
  document.getElementById('party-name').value = p.name;
  document.getElementById('party-company').value = p.company || '';
  document.getElementById('party-phone').value = p.phone || '';
  document.getElementById('party-email').value = p.email || '';
  document.getElementById('party-gstin').value = p.gstin || '';
  document.getElementById('party-type').value = p.type;
  document.getElementById('party-address').value = p.billing_address || '';
  document.getElementById('party-credit').value = p.credit_limit;
  document.getElementById('party-opening').value = p.opening_balance;
  document.getElementById('party-modal-title').textContent = 'Edit Party';
  openModal('party-modal');
}

async function saveParty() {
  const name = document.getElementById('party-name').value.trim();
  if (!name) return showToast('Enter a party name', 'error');
  const id = document.getElementById('party-id').value;
  const payload = {
    name,
    company: document.getElementById('party-company').value.trim(),
    phone: document.getElementById('party-phone').value.trim(),
    email: document.getElementById('party-email').value.trim(),
    gstin: document.getElementById('party-gstin').value.trim(),
    type: document.getElementById('party-type').value,
    billing_address: document.getElementById('party-address').value.trim(),
    credit_limit: Number(document.getElementById('party-credit').value || 0),
    opening_balance: Number(document.getElementById('party-opening').value || 0)
  };

  if (id) {
    const { error } = await sb.from('be_parties').update(payload).eq('id', id);
    if (error) return showToast('Update failed: ' + error.message, 'error');
    Object.assign(parties.find(p => p.id === id), payload);
    showToast('Party updated');
  } else {
    const { data, error } = await sb.from('be_parties')
      .insert([{ ...payload, business_id: currentBusiness.id }]).select().single();
    if (error) return showToast('Save failed: ' + error.message, 'error');
    parties.push(data);
    showToast('Party added');
  }
  closeModal('party-modal');
  refreshPartySelects();
  renderParties();
}

// Refresh the party dropdowns in the invoice editor and POS
function refreshPartySelects() {
  const options = parties.map(p => '<option value="' + p.id + '">' + escHtml(p.name) + '</option>').join('');
  const invSel = document.getElementById('inv-party');
  if (invSel) {
    invSel.innerHTML = '<option value="">-- Select party --</option>' + options;
  }
  const posSel = document.getElementById('pos-customer');
  if (posSel) {
    posSel.innerHTML = '<option value="">Walk-in customer</option>' + options;
  }
}

async function deleteParty(id) {
  const p = parties.find(x => x.id === id);
  if (!confirm('Delete "' + p.name + '"? Invoices linked to this party will keep history but lose the name link.')) return;
  const { error } = await sb.from('be_parties').delete().eq('id', id);
  if (error) return showToast('Delete failed: ' + error.message, 'error');
  parties = parties.filter(x => x.id !== id);
  showToast('Party deleted');
  renderParties();
}

// ---------- Ledger ----------
function showLedger(id) {
  const p = parties.find(x => x.id === id);
  if (!p) return;
  const partyInvoices = invoices.filter(i => i.party_id === id && i.status !== 'cancelled');
  const partyPayments = payments.filter(pa => pa.party_id === id);

  const isVendor = p.type === 'vendor';
  const entries = [];
  if (Number(p.opening_balance) !== 0) {
    entries.push({ date: p.created_at, desc: 'Opening balance', amount: Number(p.opening_balance), kind: 'balance' });
  }
  partyInvoices.forEach(i => {
    const relevant = isVendor ? i.type === 'purchase' : isSale(i);
    if (!relevant) return;
    const label = isVendor
      ? 'Purchase bill ' + i.invoice_number
      : (i.type === 'sale' ? 'Invoice ' : 'POS ') + i.invoice_number;
    entries.push({ date: i.invoice_date, desc: label, amount: Number(i.total), kind: 'invoice' });
  });
  partyPayments.forEach(pa => {
    if (isVendor && pa.direction !== 'paid') return;
    if (!isVendor && pa.direction !== 'received') return;
    const inv = invoices.find(i => i.id === pa.invoice_id);
    entries.push({
      date: pa.payment_date,
      desc: (isVendor ? 'Payment made - ' : 'Payment received - ') + (inv ? inv.invoice_number : pa.method),
      amount: -Number(pa.amount),
      kind: 'payment'
    });
  });
  entries.sort((a, b) => new Date(a.date) - new Date(b.date) || (a.kind === 'balance' ? -1 : 0));

  let running = 0;
  const rows = entries.map(e => {
    running = round2(running + e.amount);
    return '<div class="ledger-item">' +
      '<span><span class="l-date">' + fmtDate(e.date) + '</span> &mdash; ' + escHtml(e.desc) + '</span>' +
      '<span><b>' + (e.amount > 0 ? '+' : '') + fmtMoney(e.amount) + '</b> &nbsp; <span class="l-date">bal ' + fmtMoney(running) + '</span></span>' +
      '</div>';
  }).join('');

  document.getElementById('ledger-title').textContent = 'Ledger - ' + p.name;
  document.getElementById('ledger-content').innerHTML =
    '<p style="color:var(--muted);margin-bottom:8px;">Phone: ' + escHtml(p.phone || '&mdash;') +
    ' &bull; Balance: <b style="color:' + (running > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtMoney(running) + '</b>' +
    ' &bull; Credit limit: ' + fmtMoney(p.credit_limit) +
    (p.type === 'customer' ? ' &bull; Loyalty: <b>' + Number(p.loyalty_points || 0) + '</b> pts' : '') + '</p>' +
    (rows || '<p style="color:var(--muted)">No transactions yet</p>');
  openModal('ledger-modal');
}

// ---------- Filters ----------
document.getElementById('party-search').addEventListener('input', renderParties);
