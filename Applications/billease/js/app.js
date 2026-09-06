/* ============================================================================
   BillEase v2 - core app logic
   Multi-tenant: auth, business bootstrap & switcher, shared helpers,
   dashboard, settings, team members, in-app notifications.
   ========================================================================== */

// ---------- Shared state ----------
let currentUser = null;
let currentBusiness = null;   // be_businesses row (the active tenant)
let currentMember = null;     // be_members row of this user in currentBusiness
let businesses = [];          // businesses the user belongs to
let products = [];            // be_products
let recipes = [];             // be_recipe_items
let tables = [];              // be_tables
let parties = [];             // be_parties
let invoices = [];            // be_invoices
let invoiceItems = {};        // invoice_id -> [items]
let payments = [];            // be_payments
let expenses = [];            // be_expenses
let ewayBills = [];           // be_eway_bills
let campaigns = [];           // be_campaigns
let loyaltyLedger = [];       // be_loyalty_ledger
let notifications = [];       // be_notifications
let charts = {};              // canvasId -> Chart instance

// ---------- Small helpers ----------
function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.getElementById('toast-wrap').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtMoney(n) {
  const val = Number(n || 0);
  const cur = (currentBusiness && currentBusiness.currency) || 'INR';
  try {
    return val.toLocaleString('en-IN', { style: 'currency', currency: cur });
  } catch (e) {
    return '₹' + val.toFixed(2);
  }
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function monthStr(d) { return (d || new Date()).toISOString().slice(0, 7); }

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

// A "sale" in reports = invoice (sale) or POS order
function isSale(inv) { return inv && (inv.type === 'sale' || inv.type === 'pos'); }

function partyName(id) {
  const p = parties.find(x => x.id === id);
  return p ? p.name : '';
}

function tableName(id) {
  const t = tables.find(x => x.id === id);
  return t ? t.name : '';
}

function statusLabel(s) { return String(s || '').replace(/_/g, ' '); }

// ---------- Theme ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('theme-toggle').checked = theme === 'dark';
  localStorage.setItem('billease-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('billease-theme');
  applyTheme(saved === 'dark' ? 'dark' : 'light');
}

// ---------- Navigation ----------
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

function showView(view) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + view);
  if (panel) panel.classList.add('active');
  const nav = document.querySelector('.nav-item[data-view="' + view + '"]');
  if (nav) nav.classList.add('active');
  window.scrollTo(0, 0);
  if (!currentBusiness) return;
  if (view === 'dashboard') loadDashboard();
  if (view === 'pos') renderPOS();
  if (view === 'kds') renderKDS();
  if (view === 'invoice-create') initInvoiceEditor();
  if (view === 'invoices') renderInvoices();
  if (view === 'products') renderProducts();
  if (view === 'parties') renderParties();
  if (view === 'expenses') renderExpenses();
  if (view === 'marketing') renderMarketing();
  if (view === 'compliance') renderCompliance();
  if (view === 'reports') loadReports();
  if (view === 'settings') loadSettingsForm();
}

// ---------- Modal helpers ----------
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

// ---------- Chart helper ----------
function upsertChart(id, config) {
  if (charts[id]) charts[id].destroy();
  const el = document.getElementById(id);
  if (!el) return;
  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).color } } },
    scales: { x: { ticks: { color: '#94a3b8' } }, y: { ticks: { color: '#94a3b8' } } }
  };
  charts[id] = new Chart(el, { ...config, options: { ...defaults, ...(config.options || {}) } });
}

// ---------- Auth ----------
async function checkAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  currentUser = user;
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email;
  const tablesOk = await checkTables();
  if (!tablesOk) {
    showToast('Please run supabase/schema.sql in your Supabase SQL Editor first.', 'error');
    return;
  }
  await loadBusinesses();
  ensureBusiness();
  if (!currentBusiness) return; // business modal is shown
  await loadAllData();
  showView('dashboard');
  loadNotifications();
}

async function checkTables() {
  try {
    const { error } = await sb.from('be_businesses').select('id').limit(1);
    if (error && (error.code === '42P01' || /does not exist/.test(error.message))) return false;
    return true;
  } catch (e) { return false; }
}

// Load all businesses this user belongs to (via memberships)
async function loadBusinesses() {
  const { data, error } = await sb.from('be_members')
    .select('id, role, can_bill, business:be_businesses(*)')
    .eq('user_id', currentUser.id);
  if (error) { showToast('Could not load your businesses', 'error'); return; }
  businesses = (data || []).map(m => ({
    ...m.business,
    _role: m.role,
    _member_id: m.id
  })).filter(b => b && b.id);
}

// Pick the active business: previously stored, else the first one
function ensureBusiness() {
  if (!businesses.length) {
    currentBusiness = null;
    currentMember = null;
    renderBizSwitcher();
    openModal('biz-modal');
    return;
  }
  const stored = localStorage.getItem('billease-biz-' + currentUser.id);
  const pick = businesses.find(b => b.id === stored) || businesses[0];
  setCurrentBusiness(pick);
}

function setCurrentBusiness(biz) {
  currentBusiness = biz;
  currentMember = { role: biz._role, id: biz._member_id };
  localStorage.setItem('billease-biz-' + currentUser.id, biz.id);
  renderBizSwitcher();
  refreshBadges();
}

function renderBizSwitcher() {
  const sel = document.getElementById('biz-select');
  sel.innerHTML = businesses.map(b =>
    '<option value="' + b.id + '"' + (currentBusiness && b.id === currentBusiness.id ? ' selected' : '') + '>' +
    escHtml(b.name) + '</option>').join('') ||
    '<option value="">No business yet</option>';
}

async function switchBusiness(id) {
  const biz = businesses.find(b => b.id === id);
  if (!biz || (currentBusiness && biz.id === currentBusiness.id)) return;
  setCurrentBusiness(biz);
  await loadAllData();
  posNewBill();
  showView('dashboard');
  loadNotifications();
  showToast('Switched to ' + biz.name);
}

// ---------- Business creation ----------
function showBizModal() {
  document.getElementById('biz-name').value = '';
  document.getElementById('biz-type').value = 'cafe';
  document.getElementById('biz-currency').value = 'INR';
  document.getElementById('biz-gst-enabled').checked = true;
  document.getElementById('biz-loyalty-enabled').checked = false;
  openModal('biz-modal');
}

async function saveBusiness() {
  const name = document.getElementById('biz-name').value.trim();
  if (!name) return showToast('Enter a business name', 'error');
  const payload = {
    owner_id: currentUser.id,
    name,
    business_type: document.getElementById('biz-type').value,
    currency: document.getElementById('biz-currency').value,
    gst_enabled: document.getElementById('biz-gst-enabled').checked,
    loyalty_enabled: document.getElementById('biz-loyalty-enabled').checked
  };
  const { data, error } = await sb.from('be_businesses').insert([payload]).select().single();
  if (error) return showToast('Create failed: ' + error.message, 'error');
  const { error: memErr } = await sb.from('be_members')
    .insert([{ business_id: data.id, user_id: currentUser.id, role: 'owner', can_bill: true }]);
  if (memErr) return showToast('Business created but membership failed: ' + memErr.message, 'error');
  closeModal('biz-modal');
  showToast('Business "' + name + '" created');
  await loadBusinesses();
  ensureBusiness();
  await loadAllData();
  showView('dashboard');
}

// ---------- Data loading (scoped by business_id) ----------
async function loadAllData() {
  if (!currentBusiness) return;
  const bizId = currentBusiness.id;
  const q = (t) => sb.from(t).select('*').eq('business_id', bizId);

  const [prod, recip, tabl, part, inv, pay, exp, eway, camp, loy, notif] = await Promise.all([
    q('be_products'), q('be_recipe_items'), q('be_tables'), q('be_parties'),
    q('be_invoices'), q('be_payments'), q('be_expenses'), q('be_eway_bills'),
    q('be_campaigns'), q('be_loyalty_ledger'),
    sb.from('be_notifications').select('*').eq('business_id', bizId).eq('user_id', currentUser.id)
  ]);

  products = (prod.data || []).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  recipes = recip.data || [];
  tables = (tabl.data || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  parties = part.data || [];
  invoices = inv.data || [];
  payments = pay.data || [];
  expenses = exp.data || [];
  ewayBills = eway.data || [];
  campaigns = camp.data || [];
  loyaltyLedger = loy.data || [];
  notifications = notif.data || [];

  const { data: items } = await q('be_invoice_items');
  invoiceItems = {};
  (items || []).forEach(it => {
    (invoiceItems[it.invoice_id] = invoiceItems[it.invoice_id] || []).push(it);
  });

  refreshBadges();
}

function refreshBadges() {
  const active = invoices.filter(i => ['open', 'sent', 'ready'].includes(i.status)).length;
  const overdue = invoices.filter(i => isSale(i) && i.status !== 'paid' &&
    i.status !== 'cancelled' && i.due_date && i.due_date < todayStr()).length;
  document.getElementById('nav-open-badge').textContent = active || '';
  document.getElementById('nav-inv-badge').textContent = overdue || '';
}

// Advance a business sequence counter (invoice_seq / pos_seq)
async function bumpSeq(field) {
  const next = Number(currentBusiness[field] || 0) + 1;
  await sb.from('be_businesses').update({ [field]: next }).eq('id', currentBusiness.id);
  currentBusiness[field] = next;
  return next;
}

function nextInvoiceNumber() {
  return (currentBusiness.invoice_prefix || 'BE') + '-' + String((currentBusiness.invoice_seq || 0) + 1).padStart(4, '0');
}

function nextPOSNumber() {
  return (currentBusiness.pos_prefix || 'POS') + '-' + String((currentBusiness.pos_seq || 0) + 1).padStart(4, '0');
}

// ---------- Login / signup ----------
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Enter email and password'; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; return; }
  await checkAuth();
}

async function handleSignup() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; return; }
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) { errEl.textContent = error.message; return; }
  if (data.user) {
    showToast('Account created! Check your email to verify.', 'info');
    showLoginForm();
  }
}

async function handleGoogleLogin() {
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) errEl.textContent = error.message;
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

function showLoginForm() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('signup-form').classList.add('hidden');
}

function showSignupForm() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('signup-form').classList.remove('hidden');
}

// ---------- Settings ----------
function loadSettingsForm() {
  if (!currentBusiness) return;
  const b = currentBusiness;
  document.getElementById('set-name').value = b.name || '';
  document.getElementById('set-type').value = b.business_type || 'retail';
  document.getElementById('set-gstin').value = b.gstin || '';
  document.getElementById('set-fssai').value = b.fssai || '';
  document.getElementById('set-phone').value = b.phone || '';
  document.getElementById('set-email').value = b.email || '';
  document.getElementById('set-address').value = b.address || '';
  document.getElementById('set-city').value = b.city || '';
  document.getElementById('set-state').value = b.state || '';
  document.getElementById('set-pincode').value = b.pincode || '';
  document.getElementById('set-currency').value = b.currency || 'INR';
  document.getElementById('set-prefix').value = b.invoice_prefix || 'BE';
  document.getElementById('set-pos-prefix').value = b.pos_prefix || 'POS';
  document.getElementById('set-opening-cash').value = b.opening_cash || 0;
  document.getElementById('set-gst-enabled').checked = b.gst_enabled !== false;
  document.getElementById('set-loyalty-enabled').checked = b.loyalty_enabled === true;
  renderMembers();
}

async function saveSettings() {
  const updates = {
    name: document.getElementById('set-name').value,
    business_type: document.getElementById('set-type').value,
    gstin: document.getElementById('set-gstin').value,
    fssai: document.getElementById('set-fssai').value,
    phone: document.getElementById('set-phone').value,
    email: document.getElementById('set-email').value,
    address: document.getElementById('set-address').value,
    city: document.getElementById('set-city').value,
    state: document.getElementById('set-state').value,
    pincode: document.getElementById('set-pincode').value,
    currency: document.getElementById('set-currency').value,
    invoice_prefix: document.getElementById('set-prefix').value || 'BE',
    pos_prefix: document.getElementById('set-pos-prefix').value || 'POS',
    opening_cash: Number(document.getElementById('set-opening-cash').value || 0),
    gst_enabled: document.getElementById('set-gst-enabled').checked,
    loyalty_enabled: document.getElementById('set-loyalty-enabled').checked
  };
  const { error } = await sb.from('be_businesses').update(updates).eq('id', currentBusiness.id);
  if (error) return showToast('Save failed: ' + error.message, 'error');
  currentBusiness = { ...currentBusiness, ...updates };
  const bizInList = businesses.find(b => b.id === currentBusiness.id);
  if (bizInList) Object.assign(bizInList, updates);
  renderBizSwitcher();
  showToast('Settings saved');
}

// ---------- Team members ----------
async function renderMembers() {
  const el = document.getElementById('members-body');
  if (!el) return;
  const { data, error } = await sb.rpc('be_list_members', { biz: currentBusiness.id });
  if (error || !data) {
    el.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;">Could not load members</td></tr>';
    return;
  }
  const canManage = currentMember && ['owner', 'admin'].includes(currentMember.role);
  el.innerHTML = data.map(m =>
    '<tr><td>' + escHtml(m.email) + '</td>' +
    '<td><span class="badge ' + (m.role === 'owner' ? 'badge-paid' : 'badge-sent') + '">' + escHtml(m.role) + '</span></td>' +
    '<td>' + (m.can_bill ? 'Yes' : 'No') + '</td>' +
    '<td class="actions">' + (canManage && m.role !== 'owner' && m.user_id !== currentUser.id
      ? '<button class="btn btn-xs btn-danger" onclick="removeMember(\'' + m.member_id + '\',\'' + escHtml(m.email) + '\')">Remove</button>'
      : '<span style="color:var(--muted)">&mdash;</span>') + '</td></tr>'
  ).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:16px;">No members yet</td></tr>';
}

async function addMember() {
  const email = document.getElementById('member-email').value.trim();
  const role = document.getElementById('member-role').value;
  if (!email) return showToast('Enter the member email', 'error');
  const { data, error } = await sb.rpc('be_invite_member', { biz: currentBusiness.id, email, role });
  if (error) return showToast('Add failed: ' + error.message, 'error');
  if (!data) return showToast('No account found for ' + email + '. Ask them to sign up first.', 'error');
  document.getElementById('member-email').value = '';
  showToast('Member added');
  renderMembers();
}

async function removeMember(id, email) {
  if (!confirm('Remove ' + email + ' from this business?')) return;
  const { error } = await sb.from('be_members').delete().eq('id', id);
  if (error) return showToast('Remove failed: ' + error.message, 'error');
  showToast('Member removed');
  renderMembers();
}

// ---------- Dashboard ----------
function loadDashboard() {
  const now = new Date();
  const thisMonth = monthStr(now);
  const today = todayStr();

  const salesInvoices = invoices.filter(i => isSale(i) && i.status !== 'cancelled');
  const todaySales = salesInvoices
    .filter(i => i.invoice_date === today)
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const openTables = tables.filter(t =>
    invoices.some(i => i.table_id === t.id && i.dine_type === 'dine_in' &&
      ['open', 'sent', 'ready', 'served'].includes(i.status))
  ).length;
  const openOrders = invoices.filter(i => ['open', 'sent', 'ready'].includes(i.status)).length;
  const monthExpense = expenses
    .filter(e => monthStr(e.expense_date) === thisMonth)
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const lowStock = products.filter(p => !p.is_service && p.low_stock_at > 0 && p.stock <= p.low_stock_at);

  document.getElementById('stat-today-sales').textContent = fmtMoney(todaySales);
  document.getElementById('stat-open-tables').textContent = openTables;
  document.getElementById('stat-open-orders').textContent = openOrders;
  document.getElementById('stat-month-expense').textContent = fmtMoney(monthExpense);
  document.getElementById('stat-lowstock').textContent = lowStock.length;

  const hr = now.getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = greet + ', ' +
    ((currentBusiness && currentBusiness.name) || 'here is your business overview');

  renderDashSalesTrend();
  renderDashTopProducts();
  renderDashRecentInvoices();
  renderDashLowStock(lowStock);
  renderDashNotifications();
}

function last6Months() {
  const arr = [];
  const d = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    arr.push({ key: m.toISOString().slice(0, 7), label: m.toLocaleDateString('en-IN', { month: 'short' }) });
  }
  return arr;
}

function renderDashSalesTrend() {
  const months = last6Months();
  const data = months.map(m => invoices
    .filter(i => isSale(i) && i.status !== 'cancelled' && monthStr(i.invoice_date) === m.key)
    .reduce((s, i) => s + Number(i.total || 0), 0));
  upsertChart('chart-sales-trend', {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'Sales',
        data,
        backgroundColor: '#14b8a6',
        borderRadius: 6
      }]
    }
  });
}

function renderDashTopProducts() {
  const map = {};
  invoices.filter(i => isSale(i) && i.status !== 'cancelled').forEach(i => {
    (invoiceItems[i.id] || []).forEach(it => {
      map[it.product_name] = (map[it.product_name] || 0) + Number(it.amount || 0);
    });
  });
  const top = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  upsertChart('chart-top-products', {
    type: 'doughnut',
    data: {
      labels: top.map(t => t[0]),
      datasets: [{
        data: top.map(t => t[1]),
        backgroundColor: ['#0d9488', '#14b8a6', '#2dd4bf', '#0f766e', '#99f6e4'],
        borderWidth: 0
      }]
    }
  });
}

function renderDashRecentInvoices() {
  const recent = invoices.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
  document.getElementById('dash-invoices').innerHTML =
    '<thead><tr><th>Invoice</th><th>Party</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>' +
    '<tbody>' + recent.map(i => {
      const party = partyName(i.party_id);
      return '<tr>' +
        '<td>' + escHtml(i.invoice_number) + '</td>' +
        '<td>' + escHtml(party || '&mdash;') + '</td>' +
        '<td>' + fmtDate(i.invoice_date) + '</td>' +
        '<td>' + fmtMoney(i.total) + '</td>' +
        '<td><span class="badge badge-' + escHtml(i.status) + '">' + escHtml(statusLabel(i.status)) + '</span></td>' +
        '</tr>';
    }).join('') + '</tbody>';
}

function renderDashLowStock(lowStock) {
  const el = document.getElementById('dash-lowstock');
  if (!lowStock.length) { el.innerHTML = '<p style="color:var(--muted)">All stock levels are healthy.</p>'; return; }
  el.innerHTML = lowStock.slice(0, 10).map(p =>
    '<div class="ledger-item"><span><b>' + escHtml(p.name) + '</b> &mdash; ' + escHtml(p.category || '') + '</span>' +
    '<span class="stock-low">' + Number(p.stock) + ' ' + escHtml(p.unit) + ' left</span></div>'
  ).join('') || '<p style="color:var(--muted)">None</p>';
}

function renderDashNotifications() {
  const el = document.getElementById('dash-notifications');
  const list = notifications.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
  if (!list.length) { el.innerHTML = '<p style="color:var(--muted)">No notifications.</p>'; return; }
  el.innerHTML = list.map(n =>
    '<div class="ledger-item"><span><span class="badge badge-' + escHtml(n.type) + '">' + escHtml(n.type) + '</span> ' +
    '<b>' + escHtml(n.title) + '</b> &mdash; ' + escHtml(n.message || '') + '</span>' +
    '<span style="color:var(--muted);font-size:12px;">' + fmtDate(n.created_at) + '</span></div>'
  ).join('');
}

// ---------- In-app notifications ----------
function loadNotifications() {
  const overdue = invoices.filter(i => isSale(i) && i.status !== 'paid' &&
    i.status !== 'cancelled' && i.due_date && i.due_date < todayStr());
  const lowStock = products.filter(p => !p.is_service && p.low_stock_at > 0 && p.stock <= p.low_stock_at);
  if (overdue.length) showToast(overdue.length + ' invoice(s) overdue', 'error');
  if (lowStock.length) showToast(lowStock.length + ' product(s) low on stock', 'info');
}

// ---------- Wire up events ----------
function initEvents() {
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('signup-btn').addEventListener('click', handleSignup);
  document.getElementById('google-login-btn').addEventListener('click', handleGoogleLogin);
  document.getElementById('show-signup').addEventListener('click', showSignupForm);
  document.getElementById('show-login').addEventListener('click', showLoginForm);
  document.getElementById('logout-link').addEventListener('click', logout);
  document.getElementById('theme-toggle').addEventListener('change', e => applyTheme(e.target.checked ? 'dark' : 'light'));
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => showView(n.dataset.view)));
  document.getElementById('biz-select').addEventListener('change', e => switchBusiness(e.target.value));
  document.getElementById('biz-add-btn').addEventListener('click', showBizModal);

  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('signup-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });
}

// ---------- Boot ----------
initTheme();
initEvents();
checkAuth();

