/* ============================================================================
   BillEase v2 - Kitchen Display System (KDS) module
   Shows kitchen orders (sent / ready / served), with 20s auto-refresh and
   status progression buttons. Best used on a kitchen tablet / TV.
   ========================================================================== */

let kdsFilter = 'active';
let kdsTimer = null;

// ---------- Filter ----------
function setKDSFilter(f) {
  kdsFilter = f;
  document.querySelectorAll('#kds-status .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.st === f));
  renderKDS();
}

// ---------- Main render ----------
function renderKDS() {
  if (!currentBusiness) return;
  const orders = invoices
    .filter(i => i.type === 'pos' && i.sent_to_kitchen && ['sent', 'ready', 'served'].includes(i.status))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const activeOrders = orders.filter(i => i.status !== 'served');

  const show = kdsFilter === 'active' ? activeOrders : orders;
  document.getElementById('kds-count').textContent = activeOrders.length + ' active orders';

  const grid = document.getElementById('kds-grid');
  grid.innerHTML = show.map(i => {
    const table = i.table_id ? tableName(i.table_id) : '';
    const isReady = i.status === 'ready';
    const isServed = i.status === 'served';
    const items = (invoiceItems[i.id] || []).map(it =>
      '<div class="kds-item"><span><b>' + Number(it.qty) + 'x</b> ' + escHtml(it.product_name) +
      (it.special_notes ? ' <span class="kds-note">(' + escHtml(it.special_notes) + ')</span>' : '') + '</span>' +
      '<span style="color:var(--muted);font-size:11px;">' + escHtml(it.unit) + '</span></div>'
    ).join('');

    const timeAgo = kdsTimeAgo(i.created_at);
    const actions = isServed
      ? '<span class="badge badge-paid">Served</span>'
      : '<button class="btn btn-xs ' + (isReady ? 'btn-success' : 'btn-primary') + '" onclick="kdsMark(\'' + i.id + '\',\'' + (isReady ? 'served' : 'ready') + '\')">' +
        (isReady ? 'Mark Served' : 'Mark Ready') + '</button>';

    return '<div class="kds-card' + (isReady ? ' ready' : '') + '">' +
      '<div class="kds-card-head"><b>' + escHtml(i.invoice_number) + '</b>' +
      '<span class="badge badge-' + escHtml(i.status) + '">' + escHtml(statusLabel(i.status)) + '</span></div>' +
      '<div class="kds-meta">' +
        escHtml(i.dine_type || '') + (table ? ' / Table ' + escHtml(table) : '') +
        (i.waiter ? ' / Waiter: ' + escHtml(i.waiter) : '') +
        ' &bull; ' + timeAgo + '</div>' +
      '<div class="kds-items">' + items + '</div>' +
      '<div class="kds-actions">' + actions + '</div>' +
    '</div>';
  }).join('') || '<div class="kds-empty">No orders in the kitchen right now.</div>';
}

function kdsTimeAgo(ts) {
  if (!ts) return '';
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return Math.max(0, secs) + 's ago';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  return hrs + 'h ago';
}

// ---------- Status progression ----------
async function kdsMark(id, status) {
  const { error } = await sb.from('be_invoices').update({ status }).eq('id', id);
  if (error) return showToast('Update failed: ' + error.message, 'error');
  const inv = invoices.find(i => i.id === id);
  if (inv) inv.status = status;
  showToast('Marked ' + status);
  renderKDS();
  refreshBadges();
}

// ---------- Auto-refresh (lightweight: re-fetch orders only) ----------
async function refreshKDS() {
  if (!currentBusiness) return;
  const panel = document.getElementById('panel-kds');
  if (!panel || !panel.classList.contains('active')) return;
  const { data, error } = await sb.from('be_invoices')
    .select('*')
    .eq('business_id', currentBusiness.id)
    .eq('type', 'pos')
    .in('status', ['sent', 'ready', 'served']);
  if (!error && data) {
    data.forEach(upd => {
      const idx = invoices.findIndex(i => i.id === upd.id);
      if (idx >= 0) invoices[idx] = upd;
    });
    renderKDS();
    refreshBadges();
  }
}

function startKDSPolling() {
  if (kdsTimer) clearInterval(kdsTimer);
  kdsTimer = setInterval(refreshKDS, 20000);
}

startKDSPolling();
