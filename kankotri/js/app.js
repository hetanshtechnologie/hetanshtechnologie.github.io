const ROUTES = {
  dashboard: { title: 'dashboard.title', subtitle: 'dashboard.subtitle', page: { render: renderDashboard } },
  templates: { title: 'templates.title', subtitle: 'templates.subtitle', page: { render: renderTemplates } },
  'upload-guests': { title: 'guests.title', subtitle: 'guests.subtitle', page: { render: renderGuests } },
  customize: { title: 'customize.title', subtitle: 'customize.subtitle', page: { render: renderCustomize } },
  generate: { title: 'generate.title', subtitle: 'generate.subtitle', page: { render: renderGenerate } },
  history: { title: 'history.title', subtitle: 'history.subtitle', page: { render: renderHistory } },
  pricing: { title: 'pricing.title', subtitle: 'pricing.subtitle', page: { render: renderPricing } },
  profile: { title: 'profile.title', subtitle: 'profile.subtitle', page: { render: renderProfile } },
  admin: { title: 'admin.title', subtitle: 'admin.subtitle', page: { render: renderAdmin }, adminOnly: true }
};

const DEFAULT_ROUTE = 'dashboard';
let authBound = false;
let recoveryMode = false;
let authTab = 'signin';
let navigating = false;
let renderToken = 0;

const $ = (id) => document.getElementById(id);

/* ------------------------------- chrome -------------------------------- */
function hideBoot() {
  const boot = $('boot-screen');
  if (boot) {
    boot.style.transition = 'opacity .3s ease';
    boot.style.opacity = '0';
    setTimeout(() => boot.remove(), 320);
  }
}

function showAuth() {
  $('auth-screen')?.classList.remove('hidden');
  $('app-shell')?.classList.add('hidden');
  hideBoot();
}

function showApp() {
  $('auth-screen')?.classList.add('hidden');
  $('app-shell')?.classList.remove('hidden');
  hideBoot();
  updateChrome();
}

function updateChrome() {
  const profile = state.profile || {};
  const user = state.user || {};
  const name = profile.full_name || user.email || 'Guest';
  const email = profile.email || user.email || '';
  const plan = currentPlan();
  const paid = Number(plan.price || 0) > 0;

  const sidebarAvatar = $('sidebar-avatar');
  if (sidebarAvatar) {
    sidebarAvatar.innerHTML = profile.avatar_url
      ? `<img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(name)}">`
      : escapeHtml(initials(name));
  }
  const topAvatar = $('topbar-avatar');
  if (topAvatar) {
    topAvatar.innerHTML = profile.avatar_url
      ? `<img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(name)}">`
      : escapeHtml(initials(name));
  }
  const sidebarName = $('sidebar-name');
  if (sidebarName) sidebarName.textContent = name;
  const sidebarEmail = $('sidebar-email');
  if (sidebarEmail) sidebarEmail.textContent = email;

  const pill = $('plan-pill');
  if (pill) {
    pill.textContent = plan.name || 'Free';
    pill.classList.toggle('paid', paid);
  }

  const planBox = $('sidebar-plan');
  if (planBox) {
    const limit = inviteLimit();
    const total = state.guestBatches.reduce((sum, b) => sum + Number(b.guest_count || 0), 0);
    const pct = Math.min(100, Math.round((total / Math.max(1, limit)) * 100));
    planBox.innerHTML = `
      <div class="row" style="justify-content:space-between;gap:8px">
        <strong>${escapeHtml(plan.name || 'Free')} plan</strong>
        <a href="#/pricing" style="font-size:10.5px;color:var(--primary-deep);font-weight:600">${paid ? 'Manage' : 'Upgrade'}</a>
      </div>
      <div class="progress mt-2" style="height:5px"><span style="width:${pct}%"></span></div>
      <div class="small muted mt-1">${total} / ${limit >= 999999 ? '∞' : limit} ${escapeHtml(t('common.guests'))}</div>`;
  }

  const adminNav = $('nav-admin');
  if (adminNav) adminNav.classList.toggle('hidden', !isAdmin());

  const langSelect = $('lang-select');
  if (langSelect) langSelect.value = getLang();

  const themeBtn = $('theme-btn');
  if (themeBtn) {
    const use = themeBtn.querySelector('use');
    if (use) use.setAttribute('href', getTheme() === 'dark' ? '#ic-sun' : '#ic-moon');
  }
}

function setActiveNav(route) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === route);
  });
}

function setTitles(route) {
  const meta = ROUTES[route];
  const title = $('page-title');
  const subtitle = $('page-subtitle');
  if (title) title.textContent = meta ? t(meta.title) : 'Kankotri';
  if (subtitle) subtitle.textContent = meta ? t(meta.subtitle) : '';
}

/* -------------------------------- router -------------------------------- */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const route = (path || DEFAULT_ROUTE).replace(/\/+$/, '') || DEFAULT_ROUTE;
  return { route, params: new URLSearchParams(query || '') };
}

async function renderRoute() {
  if (!state.user) return;
  const { route } = parseHash();
  if (route === 'reset-password') {
    recoveryMode = true;
    showResetForm();
    return;
  }
  let target = ROUTES[route] ? route : DEFAULT_ROUTE;
  if (!ROUTES[route]) {
    location.replace(`#/${DEFAULT_ROUTE}`);
  }
  if (ROUTES[target]?.adminOnly && !isAdmin()) {
    toast('Admin access only.', 'warning');
    target = DEFAULT_ROUTE;
    location.replace(`#/${DEFAULT_ROUTE}`);
  }
  const meta = ROUTES[target];
  const view = $('view');
  if (!view || !meta) return;
  const token = ++renderToken;
  setActiveNav(target);
  setTitles(target);
  updateChrome();
  closeSidebar();
  view.innerHTML = loadingBlock(t('common.loading'));
  try {
    await meta.page.render(view);
  } catch (error) {
    if (token !== renderToken) return;
    console.error(error);
    view.innerHTML = `<div class="alert alert-danger"><span>${escapeHtml(error.message || t('common.error'))}</span></div>`;
  }
  if (token === renderToken) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------- bootstrap ------------------------------ */
async function bootstrapUser(user) {
  if (!user) return;
  state.user = user;
  try {
    await loadProfile(user);
  } catch (error) {
    console.error(error);
    toast('Could not load your profile. Run the Supabase schema, then refresh.', 'error');
  }
  try {
    await Promise.all([
      loadPlan(),
      loadTemplates(),
      loadGuestBatches(true)
    ]);
  } catch (error) {
    console.error(error);
  }
  await restoreCustomFont().catch(() => null);
  await loadLatestInvitation().catch(() => null);
  showApp();
  if (!location.hash || location.hash === '#/' || location.hash === '#') {
    location.replace('#/dashboard');
  }
  if (isSuspended()) {
    openModal({
      title: 'Account suspended',
      subtitle: 'Access to the invitation studio is paused',
      size: 'sm',
      closable: false,
      body: `<div class="alert alert-danger"><span>Your account has been suspended by an administrator. Contact <strong>hetanshtechnologie@gmail.com</strong> if you believe this is a mistake.</span></div>`,
      footer: `<button type="button" class="btn btn-outline" data-suspend-out>${escapeHtml(t('profile.signout'))}</button>`,
      onMount(root) {
        root.querySelector('[data-suspend-out]').addEventListener('click', async () => {
          await signOut();
          location.reload();
        });
      }
    });
    return;
  }
  await renderRoute();
}

function resetState() {
  state.user = null;
  state.profile = null;
  state.plan = null;
  state.templates = [];
  state.templatesLoaded = false;
  state.guestBatches = [];
  state.guestBatchesLoaded = false;
  state.guests = [];
  state.invitation = null;
  state.jobs = [];
  state.customFont = null;
}

/* --------------------------------- auth --------------------------------- */
function setAuthTab(tab) {
  authTab = tab === 'signup' ? 'signup' : 'signin';
  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.authTab === authTab);
  });
  $('auth-name-field')?.classList.toggle('hidden', authTab !== 'signup');
  const submit = $('auth-submit');
  if (submit) submit.textContent = authTab === 'signup' ? t('auth.signUp') : t('auth.signIn');
  const pass = $('auth-password');
  if (pass) pass.autocomplete = authTab === 'signup' ? 'new-password' : 'current-password';
}

function authError(message = '', info = '') {
  const err = $('auth-error');
  const inf = $('auth-info');
  if (err) {
    err.textContent = message;
    err.classList.toggle('hidden', !message);
  }
  if (inf) {
    inf.textContent = info;
    inf.classList.toggle('hidden', !info);
  }
}

function showResetForm() {
  showAuth();
  document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.classList.add('hidden'));
  $('auth-form')?.classList.add('hidden');
  $('reset-form')?.classList.remove('hidden');
  const google = $('google-btn');
  if (google) google.classList.add('hidden');
  const divider = document.querySelector('.auth-divider');
  if (divider) divider.classList.add('hidden');
  $('auth-error')?.classList.add('hidden');
  const info = $('auth-info');
  if (info) {
    info.textContent = t('auth.resetSent');
    info.classList.add('hidden');
  }
  applyTranslations(document);
  $('reset-password')?.focus();
}

function showLoginForm() {
  showAuth();
  recoveryMode = false;
  document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.classList.remove('hidden'));
  $('auth-form')?.classList.remove('hidden');
  $('reset-form')?.classList.add('hidden');
  $('google-btn')?.classList.remove('hidden');
  document.querySelector('.auth-divider')?.classList.remove('hidden');
  setAuthTab('signin');
  authError();
}

function setupAuth() {
  if (authBound) return;
  authBound = true;

  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      authError();
      setAuthTab(btn.dataset.authTab);
    });
  });

  $('auth-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('auth-email')?.value.trim() || '';
    const password = $('auth-password')?.value || '';
    const fullName = $('auth-name')?.value.trim() || '';
    if (!isEmail(email)) {
      authError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      authError('Password must be at least 6 characters.');
      return;
    }
    if (authTab === 'signup' && !fullName) {
      authError('Please enter your full name.');
      return;
    }
    const submit = $('auth-submit');
    if (submit) {
      submit.disabled = true;
      submit.textContent = authTab === 'signup' ? 'Creating account…' : 'Signing in…';
    }
    authError();
    try {
      if (authTab === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${location.origin}${location.pathname}`
          }
        });
        if (error) throw error;
        if (!data.session) {
          authError('', t('auth.checkEmail'));
        } else {
          await handleSignedIn(data.session.user);
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session?.user) await handleSignedIn(data.session.user);
      }
    } catch (error) {
      authError(error.message || t('common.error'));
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = authTab === 'signup' ? t('auth.signUp') : t('auth.signIn');
      }
    }
  });

  $('google-btn')?.addEventListener('click', async () => {
    try {
      authError();
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}${location.pathname}`,
          queryParams: { prompt: 'select_account' }
        }
      });
      if (error) throw error;
    } catch (error) {
      authError(error.message || t('common.error'));
    }
  });

  $('forgot-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    const emailInput = $('auth-email');
    const email = emailInput?.value.trim() || '';
    openModal({
      title: t('auth.forgot'),
      size: 'sm',
      body: `
        <div class="field">
          <label for="forgot-email">${escapeHtml(t('auth.email'))}</label>
          <input id="forgot-email" type="email" value="${escapeAttr(email)}" placeholder="you@example.com">
        </div>
        <p class="help mt-2">We will email a secure link to reset your password.</p>`,
      footer: `<button type="button" class="btn btn-outline" data-modal-close>${escapeHtml(t('common.cancel'))}</button><button type="button" class="btn btn-primary" data-send-reset>Send link</button>`,
      onMount(root, close) {
        root.querySelector('[data-send-reset]').addEventListener('click', async () => {
          const target = root.querySelector('#forgot-email').value.trim();
          if (!isEmail(target)) {
            toast('Enter a valid email address.', 'warning');
            return;
          }
          try {
            const { error } = await sb.auth.resetPasswordForEmail(target, {
              redirectTo: `${location.origin}${location.pathname}#/reset-password`
            });
            if (error) throw error;
            close();
            authError('', t('auth.resetSent'));
          } catch (error) {
            toast(error.message || t('common.error'), 'error');
          }
        });
      }
    });
  });

  $('reset-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = $('reset-password')?.value || '';
    const confirm = $('reset-confirm')?.value || '';
    const errorEl = $('reset-error');
    const showError = (message) => {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.toggle('hidden', !message);
    };
    showError('');
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      showError('Passwords do not match.');
      return;
    }
    try {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      recoveryMode = false;
      $('reset-form').reset();
      toast('Password updated. Welcome back!', 'success');
      history.replaceState(null, '', `${location.pathname}#/dashboard`);
      if (state.user) {
        showApp();
        await renderRoute();
      } else {
        const { data } = await sb.auth.getSession();
        if (data.session?.user) await handleSignedIn(data.session.user);
        else showLoginForm();
      }
    } catch (error) {
      showError(error.message || t('common.error'));
    }
  });

  window.addEventListener('hashchange', async () => {
    if (!state.user) {
      if (parseHash().route === 'reset-password') {
        const { data } = await sb.auth.getSession();
        if (data.session) {
          recoveryMode = true;
          showResetForm();
          return;
        }
      }
      showAuth();
      if (!recoveryMode) showLoginForm();
      return;
    }
    await renderRoute();
  });

  $('logout-btn')?.addEventListener('click', async () => {
    await signOut();
  });
  $('topbar-avatar')?.addEventListener('click', () => { location.hash = '#/profile'; });
  $('menu-btn')?.addEventListener('click', openSidebar);
  $('sidebar-overlay')?.addEventListener('click', closeSidebar);

  $('theme-btn')?.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    updateChrome();
    dispatchRefresh();
  });

  $('lang-select')?.addEventListener('change', (event) => {
    setLang(event.target.value);
    setTitles(parseHash().route);
    updateChrome();
    dispatchRefresh();
  });

  window.addEventListener('kankotri:refresh', () => {
    if (state.user) renderRoute();
  });
  window.addEventListener('kankotri:profile', async () => {
    if (!state.user) return;
    await loadProfile(state.user).catch(() => null);
    updateChrome();
  });
  window.addEventListener('kankotri:theme', () => {
    updateChrome();
  });
  window.addEventListener('kankotri:lang', () => {
    applyTranslations(document);
    setTitles(parseHash().route);
    updateChrome();
  });

  window.addEventListener('error', (event) => {
    if (event.message && /Script error/i.test(event.message)) return;
  });
}

function dispatchRefresh() {
  window.dispatchEvent(new CustomEvent('kankotri:refresh'));
}

function openSidebar() {
  $('sidebar')?.classList.add('open');
  $('sidebar-overlay')?.classList.add('open');
}

function closeSidebar() {
  $('sidebar')?.classList.remove('open');
  $('sidebar-overlay')?.classList.remove('open');
}

async function handleSignedIn(user) {
  if (!user) return;
  if (state.user?.id === user.id) {
    showApp();
    return;
  }
  if (recoveryMode) {
    showResetForm();
    return;
  }
  await bootstrapUser(user);
}

function setupAuthListener() {
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      setTimeout(() => showResetForm(), 0);
      return;
    }
    if (event === 'SIGNED_OUT') {
      setTimeout(() => {
        resetState();
        showLoginForm();
      }, 0);
      return;
    }
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      if (recoveryMode) return;
      setTimeout(() => handleSignedIn(session.user), 0);
    }
    if (event === 'TOKEN_REFRESHED' && session?.user) {
      state.user = session.user;
    }
  });
}

async function init() {
  initPreferences();
  setupAuth();
  setupAuthListener();

  const hash = location.hash || '';
  if (/type=recovery/.test(hash)) recoveryMode = true;

  try {
    const { data } = await sb.auth.getSession();
    if (data.session?.user) {
      state.user = data.session.user;
      if (recoveryMode) showResetForm();
      else await bootstrapUser(data.session.user);
    } else {
      hideBoot();
      showAuth();
      if (recoveryMode) showResetForm();
      else showLoginForm();
    }
  } catch (error) {
    console.error(error);
    hideBoot();
    showAuth();
    showLoginForm();
    authError('Could not reach the authentication service. Check your connection.');
  }
}

document.addEventListener('DOMContentLoaded', init);
