const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️', color: '#ef4444' },
  { name: 'Transport', icon: '🚗', color: '#f59e0b' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Bills & Utilities', icon: '📄', color: '#6366f1' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Health', icon: '💊', color: '#10b981' },
  { name: 'Education', icon: '📚', color: '#3b82f6' },
  { name: 'Rent', icon: '🏠', color: '#f97316' },
  { name: 'Travel', icon: '✈️', color: '#06b6d4' },
  { name: 'Other', icon: '📦', color: '#64748b' },
];

let currentUser = null;
let categories = [];
let expenses = [];
let budgets = [];
let userPlan = null;
let pieChart = null;
let lineChart = null;
let editingId = null;

const LANG = {
  en: {
    add: 'Add Expense', list: 'All Expenses', analytics: 'Analytics',
    budgets: 'Budgets', recurring: 'Recurring', profile: 'Profile',
    total: 'Total Expenses', thisMonth: 'This Month', avgDay: 'Avg/Day',
    topCat: 'Top Category', title: 'Title', amount: 'Amount', category: 'Category',
    date: 'Date', notes: 'Notes', save: 'Save', clear: 'Clear', search: 'Search...',
    noExpenses: 'No expenses found.', actions: 'Actions', edit: 'Edit', del: 'Delete',
    exportCSV: 'Export CSV', setBudget: 'Set Budget', upgrade: 'Upgrade Plan',
  },
  hi: {
    add: 'व्यय जोड़ें', list: 'सभी व्यय', analytics: 'विश्लेषण',
    budgets: 'बजट', recurring: 'आवर्ती', profile: 'प्रोफ़ाइल',
    total: 'कुल व्यय', thisMonth: 'इस महीने', avgDay: 'औसत/दिन',
    topCat: 'शीर्ष श्रेणी', title: 'शीर्षक', amount: 'राशि', category: 'श्रेणी',
    date: 'तारीख', notes: 'नोट्स', save: 'सहेजें', clear: 'साफ़ करें',
    search: 'खोजें...', noExpenses: 'कोई व्यय नहीं मिला।', actions: 'कार्रवाई',
    edit: 'संपादित करें', del: 'हटाएं', exportCSV: 'CSV निर्यात',
    setBudget: 'बजट सेट करें', upgrade: 'योजना अपग्रेड करें',
  }
};

function t(key) {
  const lang = document.getElementById('lang-select')?.value || 'en';
  return LANG[lang]?.[key] || LANG.en[key] || key;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// Auth
async function checkAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    currentUser = user;
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    document.getElementById('greeting').textContent = user.email;
    await initApp();
    document.getElementById('admin-link')?.addEventListener('click', (e) => {
      // Will be handled by admin.html separately
    });
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('login-error').textContent = error.message;
    document.getElementById('login-error').classList.remove('hidden');
    return;
  }
  document.getElementById('login-error').classList.add('hidden');
  checkAuth();
}

function showSignup() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) return alert('Enter email and password');
  sb.auth.signUp({ email, password }).then(() => {
    alert('Check your email to confirm signup!');
  });
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

// App Init
async function initApp() {
  await loadPrefs();
  await ensureDefaultCategories();
  await loadCategories();
  await loadPlan();
  await loadExpenses();
  await loadBudgets();
  populateCategorySelects();
  document.getElementById('exp-date').valueAsDate = new Date();
  showSection('list');
}

// Preferences
async function loadPrefs() {
  const { data } = await sb.from('et_user_prefs').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (data) {
    if (data.theme === 'dark') document.body.classList.add('dark');
    document.getElementById('lang-select').value = data.language || 'en';
    document.getElementById('profile-currency').value = data.currency || 'INR';
  }
}

async function savePrefs() {
  const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  const lang = document.getElementById('lang-select').value;
  const currency = document.getElementById('profile-currency').value;
  await sb.from('et_user_prefs').upsert({ user_id: currentUser.id, theme, language: lang, currency }, { onConflict: 'user_id' });
  updateUI();
}

// Theme
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  savePrefs();
});

// Language
document.getElementById('lang-select')?.addEventListener('change', updateUI);

// Categories
async function ensureDefaultCategories() {
  const { data: existing } = await sb.from('et_categories').select('id').eq('user_id', currentUser.id).limit(1);
  if (existing && existing.length > 0) return;
  for (const c of DEFAULT_CATEGORIES) {
    await sb.from('et_categories').insert({ name: c.name, icon: c.icon, color: c.color, user_id: currentUser.id }).maybeSingle();
  }
}

async function loadCategories() {
  const { data } = await sb.from('et_categories').select('*').eq('user_id', currentUser.id).order('name');
  categories = data || [];
}

function populateCategorySelects() {
  const selects = ['exp-category', 'filter-cat', 'budget-cat'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = id === 'exp-category' || id === 'budget-cat' ? '' : '<option value="">All Categories</option>';
    categories.forEach(c => {
      sel.innerHTML += `<option value="${c.id}" style="color:${c.color}">${c.icon} ${c.name}</option>`;
    });
    if (currentVal) sel.value = currentVal;
  });
}

// Expenses
async function saveExpense() {
  const title = document.getElementById('exp-title').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const category_id = parseInt(document.getElementById('exp-category').value);
  const expense_date = document.getElementById('exp-date').value;
  const notes = document.getElementById('exp-notes').value.trim();
  const is_recurring = document.getElementById('exp-recurring').checked;
  const recurring_type = is_recurring ? document.getElementById('exp-recurring-type').value : null;

  if (!title || !amount || !category_id) return showToast('Title, Amount & Category required', 'error');

  const data = { title, amount, category_id, expense_date, notes, is_recurring, recurring_type };
  data.user_id = currentUser.id;

  if (editingId) {
    const { error } = await sb.from('et_expenses').update(data).eq('id', editingId);
    if (error) return showToast(error.message, 'error');
    showToast('Expense updated');
    editingId = null;
  } else {
    const { error } = await sb.from('et_expenses').insert(data);
    if (error) return showToast(error.message, 'error');
    showToast('Expense added');
  }
  clearForm();
  await loadExpenses();
}

function editExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  editingId = id;
  document.getElementById('exp-title').value = exp.title;
  document.getElementById('exp-amount').value = exp.amount;
  document.getElementById('exp-category').value = exp.category_id;
  document.getElementById('exp-date').value = exp.expense_date;
  document.getElementById('exp-notes').value = exp.notes || '';
  document.getElementById('exp-recurring').checked = exp.is_recurring;
  document.getElementById('exp-recurring-type').value = exp.recurring_type || 'monthly';
  toggleRecurring();
  showSection('add');
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const { error } = await sb.from('et_expenses').delete().eq('id', id);
  if (error) return showToast(error.message, 'error');
  showToast('Expense deleted');
  await loadExpenses();
}

function toggleAll() {
  const checked = document.getElementById('select-all').checked;
  document.querySelectorAll('.exp-checkbox').forEach(cb => cb.checked = checked);
  updateDeleteBtn();
}

function updateDeleteBtn() {
  const count = document.querySelectorAll('.exp-checkbox:checked').length;
  const btn = document.getElementById('delete-selected-btn');
  if (count > 0) { btn.classList.remove('hidden'); btn.textContent = '🗑 Delete (' + count + ')'; }
  else btn.classList.add('hidden');
}

async function deleteSelected() {
  const ids = [...document.querySelectorAll('.exp-checkbox:checked')].map(cb => parseInt(cb.value));
  if (!ids.length) return;
  if (!confirm('Delete ' + ids.length + ' selected expenses?')) return;
  const { error } = await sb.from('et_expenses').delete().in('id', ids);
  if (error) return showToast(error.message, 'error');
  showToast(ids.length + ' expenses deleted');
  document.getElementById('select-all').checked = false;
  await loadExpenses();
}

function clearForm() {
  editingId = null;
  document.getElementById('exp-title').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-notes').value = '';
  document.getElementById('exp-recurring').checked = false;
  document.getElementById('exp-date').valueAsDate = new Date();
  toggleRecurring();
}

function toggleRecurring() {
  document.getElementById('exp-recurring-type').classList.toggle('hidden', !document.getElementById('exp-recurring').checked);
}

async function loadExpenses() {
  const search = document.getElementById('search-exp')?.value?.toLowerCase() || '';
  const catFilter = document.getElementById('filter-cat')?.value || '';
  const from = document.getElementById('filter-from')?.value || '';
  const to = document.getElementById('filter-to')?.value || '';

  let query = sb.from('et_expenses').select('*, et_categories!inner(name,icon,color)').eq('user_id', currentUser.id).order('expense_date', { ascending: false }).order('created_at', { ascending: false });

  if (catFilter) query = query.eq('category_id', parseInt(catFilter));
  if (from) query = query.gte('expense_date', from);
  if (to) query = query.lte('expense_date', to);

  const { data } = await query;
  expenses = (data || []).filter(e => !search || e.title.toLowerCase().includes(search) || (e.notes || '').toLowerCase().includes(search));

  renderExpenses();
  updateStats();
}

function renderExpenses() {
  const tbody = document.getElementById('expense-table-body');
  const empty = document.getElementById('expense-empty');
  if (!expenses.length) { tbody.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  tbody.innerHTML = expenses.map(e => {
    const cat = e.et_categories;
    const rec = e.is_recurring ? '🔄' : '';
    return `<tr class="border-b hover:bg-gray-50">
      <td class="p-3"><input type="checkbox" class="exp-checkbox" value="${e.id}" onchange="updateDeleteBtn()"></td>
      <td class="p-3 whitespace-nowrap text-xs">${e.expense_date}</td>
      <td class="p-3 font-medium">${escHtml(e.title)}</td>
      <td class="p-3"><span style="color:${cat?.color}">${cat?.icon || ''} ${cat?.name || 'Unknown'}</span></td>
      <td class="p-3 text-right font-semibold">₹${Number(e.amount).toLocaleString()}</td>
      <td class="p-3 text-center">${rec}</td>
      <td class="p-3 text-center">
        <button onclick="editExpense(${e.id})" class="text-blue-600 hover:underline text-xs mr-2">Edit</button>
        <button onclick="deleteExpense(${e.id})" class="text-red-600 hover:underline text-xs">Del</button>
      </td>
    </tr>`;
  }).join('');
}

function updateStats() {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const now = new Date();
  const monthStr = now.toISOString().substring(0, 7);
  const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(monthStr));
  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDay = monthTotal / daysInMonth;

  const catTotals = {};
  expenses.forEach(e => {
    const name = e.et_categories?.name || 'Other';
    catTotals[name] = (catTotals[name] || 0) + Number(e.amount);
  });
  const topCat = Object.entries(catTotals).sort(([, a], [, b]) => b - a)[0];

  document.getElementById('total-expenses').textContent = '₹' + total.toLocaleString();
  document.getElementById('month-total').textContent = '₹' + monthTotal.toLocaleString();
  document.getElementById('avg-day').textContent = '₹' + avgDay.toFixed(0);
  document.getElementById('top-cat').textContent = topCat ? `${topCat[0]}: ₹${topCat[1].toLocaleString()}` : '-';
}

// Analytics
function renderCharts() {
  // Pie chart by category
  const catData = {};
  expenses.forEach(e => {
    const name = e.et_categories?.name || 'Other';
    const color = e.et_categories?.color || '#64748b';
    if (!catData[name]) catData[name] = { total: 0, color };
    catData[name].total += Number(e.amount);
  });
  const labels = Object.keys(catData);
  const data = Object.values(catData).map(v => v.total);
  const colors = Object.values(catData).map(v => v.color);

  const pieCtx = document.getElementById('pie-chart')?.getContext('2d');
  if (pieCtx) {
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } }
    });
  }

  // Line chart monthly
  const monthData = {};
  expenses.forEach(e => {
    if (!e.expense_date) return;
    const m = e.expense_date.substring(0, 7);
    monthData[m] = (monthData[m] || 0) + Number(e.amount);
  });
  const sorted = Object.entries(monthData).sort(([a], [b]) => a.localeCompare(b));

  const lineCtx = document.getElementById('line-chart')?.getContext('2d');
  if (lineCtx) {
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: sorted.map(([m]) => m),
        datasets: [{ label: 'Monthly Spend', data: sorted.map(([, v]) => v), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.1)', fill: true, tension: .3 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }
}

// Budgets
async function loadBudgets() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { data } = await sb.from('et_budgets').select('*, et_categories!inner(name,icon,color)').eq('user_id', currentUser.id).eq('month', month).eq('year', year);
  budgets = data || [];
  renderBudgets();
}

function renderBudgets() {
  const list = document.getElementById('budget-list');
  if (!list) return;
  if (!budgets.length) { list.innerHTML = '<p class="text-gray-400">No budgets set for this month.</p>'; return; }
  list.innerHTML = budgets.map(b => {
    const spent = expenses.filter(e => e.et_categories?.id === b.category_id).reduce((s, e) => s + Number(e.amount), 0);
    const pct = Math.min(100, (spent / b.limit_amount) * 100);
    return `<div class="budget-card">
      <div class="flex justify-between items-center mb-2">
        <span>${b.et_categories?.icon || ''} <strong>${b.et_categories?.name || 'Unknown'}</strong></span>
        <span>₹${spent.toLocaleString()} / ₹${Number(b.limit_amount).toLocaleString()}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981'}"></div></div>
      ${pct >= 100 ? '<p class="text-red-600 text-xs mt-1">⚠ Budget exceeded!</p>' : ''}
    </div>`;
  }).join('');
}

async function saveBudget() {
  const category_id = parseInt(document.getElementById('budget-cat').value);
  const monthVal = document.getElementById('budget-month').value;
  const limit_amount = parseFloat(document.getElementById('budget-limit').value);
  if (!category_id || !monthVal || !limit_amount) return showToast('All fields required', 'error');
  const [year, month] = monthVal.split('-').map(Number);
  const { error } = await sb.from('et_budgets').upsert({ category_id, month, year, limit_amount, user_id: currentUser.id }, { onConflict: 'category_id,month,year,user_id' });
  if (error) return showToast(error.message, 'error');
  showToast('Budget saved');
  await loadBudgets();
}

// Plan
async function loadPlan() {
  const { data: up } = await sb.from('et_user_plans').select('plan_id,status').eq('user_id', currentUser.id).maybeSingle();
  if (up && up.status === 'active') {
    const { data: p } = await sb.from('et_plans').select('*').eq('id', up.plan_id).maybeSingle();
    userPlan = p;
  } else {
    const { data: p } = await sb.from('et_plans').select('*').eq('id', 1).single();
    userPlan = { ...p, id: 0 };
  }
  document.getElementById('profile-plan').textContent = userPlan?.name || 'Free';
  const { count } = await sb.from('et_expenses').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
  document.getElementById('profile-count').textContent = `${count || 0} / ${userPlan?.max_records || 100}`;
}

async function upgradePlan() {
  const { data: plans } = await sb.from('et_plans').select('*').eq('active', true).order('price');
  let html = '<h3 style="margin-bottom:12px;">Choose a Plan</h3>';
  html += '<div style="display:flex;flex-direction:column;gap:12px;">';
  for (const p of plans) {
    if (p.price === 0) continue;
    html += `<div style="border:1px solid #e0e0e0;border-radius:8px;padding:14px;cursor:pointer;" onclick="purchasePlan(${p.id})">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong style="font-size:16px;">${p.name}</strong>
        <div style="font-size:12px;color:#666;margin-top:4px;">${p.max_records >= 999999 ? '∞' : p.max_records} records · ${p.max_categories} categories · ${p.has_reports ? 'Reports ✓' : 'Reports ✗'} · ${p.has_export ? 'Export ✓' : 'Export ✗'}</div></div>
        <div style="font-size:18px;font-weight:700;color:#1a73e8;">₹${(p.price / 100).toFixed(2)}</div>
      </div></div>`;
  }
  html += '</div>';
  showModal(html);
}

async function purchasePlan(planId) {
  closeModal();
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/et-create-order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ plan_id: planId })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
    const order = await res.json();
    const rzp = new Razorpay({
      key: order.key_id, amount: order.amount, currency: order.currency || 'INR',
      name: 'Expense Tracker', description: order.plan_name + ' Plan',
      order_id: order.id, prefill: { email: currentUser.email },
      theme: { color: '#2563eb' },
      handler: async function(response) {
        const vRes = await fetch(`${SUPABASE_URL}/functions/v1/et-verify-purchase`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, plan_id: planId })
        });
        const vData = await vRes.json();
        showToast(vData.message || 'Plan upgraded!');
        await loadPlan();
      }
    });
    rzp.open();
  } catch (err) { showToast(err.message, 'error'); }
}

// Export CSV
function exportCSV() {
  let csv = 'Date,Title,Category,Amount,Notes\n';
  expenses.forEach(e => {
    const cat = e.et_categories?.name || '';
    csv += `"${e.expense_date}","${e.title}","${cat}",${e.amount},"${(e.notes || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'expenses.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Section switching
function showSection(name) {
  document.querySelectorAll('.section-panel').forEach(el => el.classList.add('hidden'));
  const panel = document.getElementById('section-' + name);
  if (panel) panel.classList.remove('hidden');
  if (name === 'analytics') renderCharts();
  if (name === 'budgets') loadBudgets();
}

// Modal
function showModal(html) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:2000;';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div style="background:white;border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;">${html}</div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}
function closeModal() {
  document.getElementById('modal-overlay')?.remove();
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updateUI() {
  // Update button texts based on language
  // For simplicity, this is a placeholder; actual dynamic labels are already handled
}

// Init
checkAuth();

// Listen for auth changes
sb.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN') checkAuth();
});
