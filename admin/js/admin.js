const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const _admin = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_EMAIL = 'hetanshtechnologie@gmail.com';

async function requireAdmin() {
  const { data: { user }, error } = await _admin.auth.getUser();
  if (error || !user || user.email !== ADMIN_EMAIL) {
    window.location.href = '../';
    return null;
  }
  return user;
}

function escapeHtml(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

async function socialLogin(provider) {
  const { data, error } = await _admin.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
  });
  if (error) throw error;
}

async function handleSocialLogin() {
  const btn = document.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Redirecting...';
  try {
    await socialLogin('google');
  } catch (err) {
    document.getElementById('alert').innerHTML = '<div class="bg-red-100 text-red-700 p-2 rounded text-sm mb-4">' + err.message + '</div>';
    btn.disabled = false;
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg> Sign in with Google';
  }
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  if (!el) return;
  el.innerHTML = '<div class="bg-' + (type==='error' ? 'red' : 'green') + '-100 text-' + (type==='error' ? 'red' : 'green') + '-700 p-3 rounded text-sm">' + msg + '</div>';
  setTimeout(() => el.innerHTML = '', 5000);
}

async function signOut() {
  await _admin.auth.signOut();
  if (window.sitengSetUser) window.sitengSetUser(null);
  window.location.href = '../';
}

// Blog admin helpers
async function getAllArticles() {
  const { data, error } = await _admin.from('blog_articles').select('*, blog_topics(name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function updateArticle(id, fields) {
  const { error } = await _admin.from('blog_articles').update(fields).eq('id', id);
  if (error) throw error;
}

async function deleteArticle(id) {
  const { error } = await _admin.from('blog_articles').delete().eq('id', id);
  if (error) throw error;
}

async function getBlogTopics() {
  const { data, error } = await _admin.from('blog_topics').select('*').order('name');
  if (error) throw error;
  return data;
}
