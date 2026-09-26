// Auth helpers: session, profile, role/status guards.

/**
 * Redirect loop breaker.
 *
 * index.html forwards signed-in visitors to the app, and the app sends
 * signed-out visitors to index.html. A single hop between them is normal and
 * must always be allowed - only a genuine A -> B -> A ping-pong is a fault, so
 * the record has to say *where* the visitor came from and *when*, otherwise a
 * single ordinary redirect poisons the tab and the next page load reports a
 * phantom loop.
 */
const BOUNCE_KEY = 'pr:bounce';
const BOUNCE_WINDOW_MS = 15000;

/** File name of the current page, e.g. 'dashboard.html'. */
function currentPage() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] || 'index.html';
}

/** Record that we have just sent the visitor to the login page. */
function noteBounce(from) {
  try {
    sessionStorage.setItem(BOUNCE_KEY, JSON.stringify({ from, at: Date.now() }));
  } catch { /* private mode: breaker is best-effort only */ }
}

/** True if we arrived here from `page` within the last few seconds. */
function bouncedFrom(page) {
  try {
    const raw = sessionStorage.getItem(BOUNCE_KEY);
    if (!raw) return false;
    const rec = JSON.parse(raw);
    return rec.from === page && Date.now() - rec.at < BOUNCE_WINDOW_MS;
  } catch {
    return false;
  }
}

function clearBounce() {
  try { sessionStorage.removeItem(BOUNCE_KEY); } catch { /* ignore */ }
}

/**
 * Replace the page content with a blocking error. Used when the app cannot
 * continue but redirecting would only start a loop.
 */
function showFatal(title, detail) {
  clearBounce();
  const box = document.createElement('div');
  box.className = 'wrap';
  box.style.padding = '3rem 1rem';
  box.innerHTML = `
    <div class="card" style="max-width:34rem;margin:0 auto;text-align:center">
      <h2 style="margin-bottom:.75rem">${escapeHtml(title)}</h2>
      <p class="muted" style="margin-bottom:1.25rem">${escapeHtml(detail)}</p>
      <button class="btn ghost" type="button" id="fatal-signout">Sign out</button>
    </div>`;
  const main = document.querySelector('main') || document.body;
  main.replaceChildren(box);
  document.getElementById('fatal-signout')?.addEventListener('click', async () => {
    clearBounce();
    await sb.auth.signOut();
    window.location.replace('index.html');
  });
}

/**
 * Resolves once the auth client has finished initialising.
 *
 * Supabase processes the OAuth callback (the #access_token fragment) during
 * startup, which finishes *after* the page's first script runs. Without waiting
 * for that, a guard sees "no session" on the page Google redirected back to and
 * shows the sign-in form to someone who is already signed in.
 */
function authReady() {
  return new Promise((resolve) => {
    let settled = false;
    let subscription = null;
    const done = () => {
      if (settled) return;
      settled = true;
      try { subscription?.unsubscribe(); } catch { /* ignore */ }
      resolve();
    };

    const { data } = sb.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION fires once startup (including URL detection) is finished.
      if (event === 'INITIAL_SESSION' || session) done();
    });
    // Assigned after registering, and read defensively in done(), because the
    // callback can fire synchronously for an already-restored session.
    subscription = data?.subscription ?? null;

    // Never hang the page if the event never arrives.
    setTimeout(done, 3000);
  });
}

/** Current Supabase user, or null. */
async function currentUser() {
  // getSession() reads the locally held session. getUser() makes a network call
  // to the auth server, so a flaky connection or a token refresh still in
  // flight reads as "signed out" and bounces the visitor to the login page for
  // no reason. Authorisation is re-checked server-side in the Edge Functions
  // against the JWT, so the local session is the correct signal for a UI guard.
  const { data, error } = await sb.auth.getSession();
  if (error) return null;
  return data?.session?.user ?? null;
}

/**
 * Load the pr_users row for the signed-in account.
 *
 * Returns a discriminated result rather than null so callers can tell "no
 * session" from "the backend could not answer" - conflating the two is what
 * makes a page redirect to the login screen, and the login screen redirect
 * straight back.
 *
 *   { ok: true,  profile }
 *   { ok: false, reason: 'signed_out' | 'no_profile' | 'error', error }
 */
async function fetchProfile() {
  const user = await currentUser();
  if (!user) return { ok: false, reason: 'signed_out' };

  const { data, error } = await sb
    .from('pr_users')
    .select('id, email, role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return { ok: false, reason: 'error', error };
  if (data) return { ok: true, profile: data };

  // The signup trigger covers every new account; this repairs older ones.
  const { data: healed, error: healErr } = await sb.rpc('pr_ensure_user_profile');
  if (healErr) return { ok: false, reason: 'error', error: healErr };
  if (!healed) return { ok: false, reason: 'no_profile' };
  return { ok: true, profile: healed };
}

/**
 * Load the profile for the signed-in account, or null.
 * Thin wrapper kept for callers that only need the row.
 */
async function loadProfile() {
  const res = await fetchProfile();
  return res.ok ? res.profile : null;
}

async function signOut() {
  clearBounce();
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

/**
 * Page guard. Redirects to index.html when signed out, and to dashboard.html
 * when the account is blocked or lacks the required role.
 *
 * Returns the profile, or null when the page is being torn down.
 */
async function guardPage(requiredRole) {
  const res = await fetchProfile();

  if (!res.ok) {
    if (res.reason === 'signed_out') {
      // A single hop to the login page is normal - record where we came from so
      // the login page can tell a real ping-pong from an ordinary redirect.
      noteBounce(currentPage());
      window.location.replace('index.html');
      return null;
    }

    // Signed in, but pr_users is unreachable. Redirecting to the login page
    // would only bounce straight back, so stop and say why.
    const missing = res.reason === 'no_profile';
    showFatal(
      missing ? 'No profile for this account' : 'Cannot reach the database',
      missing
        ? 'Your account is signed in but has no row in pr_users. Sign out, then run supabase/schema.sql to create it.'
        : 'The pr_users table could not be read. If you have not deployed the app yet, run supabase/schema.sql first.',
    );
    return null;
  }

  const profile = res.profile;
  // A guarded page that loads cleanly proves the session is good, so any
  // pending loop concern is settled and the hop record can go.
  clearBounce();

  if (profile.status === 'blocked') {
    await sb.auth.signOut();
    window.location.replace('index.html?blocked=1');
    return null;
  }

  if (requiredRole === 'admin' && profile.role !== 'admin') {
    window.location.replace('dashboard.html');
    return null;
  }

  return profile;
}

function renderTopbar(profile, active) {
  const bar = document.getElementById('topbar');
  if (!bar) return;

  const links = [
    { href: 'dashboard.html', label: 'Unlock PDF', key: 'dashboard' },
    ...(profile?.role === 'admin' ? [{ href: 'admin.html', label: 'Admin', key: 'admin' }] : []),
  ];

  const email = (profile?.email || '').slice(0, 26);
  bar.innerHTML = `
    <div class="wrap">
      <a class="brand" href="${profile?.role === 'admin' ? 'admin.html' : 'dashboard.html'}">
        <span class="logo">&#128274;</span>
        <span>${CONFIG.APP_NAME}</span>
      </a>
      <nav class="nav">
        ${links.map((l) => `<a href="${l.href}" class="${l.key === active ? 'active' : ''}">${l.label}</a>`).join('')}
        <div class="nav-user">
          <span class="mono" title="${profile?.email || ''}">${escapeHtml(email)}</span>
          <button class="btn ghost sm" id="signout-btn" type="button">Sign out</button>
        </div>
      </nav>
    </div>`;

  document.getElementById('signout-btn')?.addEventListener('click', signOut);
}
