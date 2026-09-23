// auth.js — registration/login flows + page guards for role-based access.
function baseUrl() {
  return window.location.href.replace(/[^/]*$/, '');
}

function initAuthUI() {
  const form = el('auth-form');
  const modeInput = el('auth-mode');
  const title = el('auth-title');
  const submit = el('auth-submit');
  const switchLink = el('auth-switch');
  const switchText = el('auth-switch-text');
  const errorBox = el('auth-error');
  const successBox = el('auth-success');
  const tenantNote = el('tenant-note');
  const googleBtn = el('google-btn');

  let mode = 'login';

  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: baseUrl() + 'index.html' }
      });
      if (error) {
        errorBox.textContent = error.message;
        googleBtn.disabled = false;
      }
    });
  }

  function setMode(next) {
    mode = next;
    modeInput.value = next;
    title.textContent = next === 'login' ? 'Sign in' : 'Create your account';
    submit.textContent = next === 'login' ? 'Sign in' : 'Sign up';
    switchText.textContent = next === 'login' ? "Don't have an account?" : 'Already have an account?';
    switchLink.textContent = next === 'login' ? 'Sign up' : 'Sign in';
    errorBox.textContent = '';
    successBox.textContent = '';
    tenantNote.style.display = next === 'signup' ? 'block' : 'none';
  }

  switchLink.addEventListener('click', (e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('auth-email').value.trim();
    const password = el('auth-password').value;
    errorBox.textContent = '';
    successBox.textContent = '';

    if (!email || !password) { errorBox.textContent = 'Enter your email and password.'; return; }

    if (mode === 'signup') {
      if (password.length < 6) { errorBox.textContent = 'Password must be at least 6 characters.'; return; }
      const { error } = await sb.auth.signUp({
        email, password,
        options: { emailRedirectTo: baseUrl() + 'index.html' }
      });
      if (error) { errorBox.textContent = error.message; return; }
      successBox.textContent = 'Check your email to confirm your account, then sign in.';
      setMode('login');
      return;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { errorBox.textContent = error.message.includes('Invalid login') ? 'Invalid email or password.' : error.message; return; }

    const profile = await ensureProfile();
    redirect(profile && profile.role === 'admin' ? 'admin.html' : 'dashboard.html');
  });

  el('auth-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') form.requestSubmit();
  });
}

async function ensureProfile() {
  let profile = await db.getProfile();
  if (profile) return profile;
  const { error } = await sb.rpc('ensure_user_profile');
  if (error) return null;
  return await db.getProfile();
}

async function guardPage(requireRole) {
  const user = await currentSessionUser();
  if (!user) { redirect('index.html'); return null; }

  const profile = await ensureProfile();
  if (!profile) { redirect('index.html'); return null; }

  if (requireRole === 'admin' && profile.role !== 'admin') { redirect('dashboard.html'); return null; }

  initTopbar(profile);
  return { user, profile };
}

function initTopbar(profile) {
  const emailEl = el('user-email');
  if (emailEl) emailEl.textContent = profile.email;
  const roleEl = el('role-badge');
  if (roleEl) {
    roleEl.textContent = profile.role;
    roleEl.classList.toggle('admin', profile.role === 'admin');
  }
  const adminLink = el('admin-link');
  if (adminLink && profile.role === 'admin') adminLink.classList.remove('hidden');
  const dashLink = el('dash-link');
  if (dashLink) dashLink.classList.remove('hidden');
  const logoutBtn = el('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut();
      redirect('index.html');
    });
  }
}

async function handleExistingSession() {
  const user = await currentSessionUser();
  if (!user) return;
  const profile = await ensureProfile();
  if (!profile) {
    const errorBox = el('auth-error');
    if (errorBox) errorBox.textContent = 'Your workspace could not be created. Apply the database schema (supabase/schema.sql) to your Supabase project, then sign out and in again.';
    return;
  }
  redirect(profile.role === 'admin' ? 'admin.html' : 'dashboard.html');
}

if (el('auth-form')) {
  initAuthUI();
  handleExistingSession();
}