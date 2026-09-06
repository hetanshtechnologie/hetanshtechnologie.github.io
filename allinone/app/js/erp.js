const ERP_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const ERP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const erp = window.supabase.createClient(ERP_URL, ERP_KEY);

function escapeHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN');
}

async function requireLogin() {
  const { data: { user }, error } = await erp.auth.getUser();
  if (error || !user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

async function requireAdmin() {
  const user = await requireLogin();
  if (!user) return null;
  const { data: profile } = await erp.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    window.location.href = 'dashboard.html';
    return null;
  }
  return user;
}

async function getUserProfile() {
  const { data: { user } } = await erp.auth.getUser();
  if (!user) return null;
  const { data } = await erp.from('user_profiles').select('*, organizations(*)').eq('id', user.id).maybeSingle();
  return data || null;
}

async function signOut() {
  await erp.auth.signOut();
  window.location.href = 'index.html';
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  if (!el) return;
  const bg = type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  el.innerHTML = '<div class="' + bg + ' p-3 rounded text-sm mb-4">' + msg + '</div>';
  setTimeout(() => el.innerHTML = '', 4000);
}

async function createAuditLog(action, tableName, recordId, oldData, newData) {
  try {
    const { data: { user } } = await erp.auth.getUser();
    if (!user) return;
    const profile = await getUserProfile();
    await erp.from('audit_log').insert({
      org_id: profile?.org_id,
      user_id: user.id,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData
    });
  } catch (e) {
    console.warn('Audit log failed:', e);
  }
}

async function getOrgId() {
  const profile = await getUserProfile();
  return profile?.org_id;
}
