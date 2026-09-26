// Login / signup page.
let mode = 'login';

const GOOGLE_LABEL =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2z"/>' +
  '<path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.5c-.9.6-2 1-3.5 1a6.1 6.1 0 0 1-5.7-4.2H3.1v2.6A10 10 0 0 0 12 22z"/>' +
  '<path fill="#FBBC05" d="M6.3 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/>' +
  '<path fill="#4285F4" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.2 2.6A6.1 6.1 0 0 1 12 5.9z"/>' +
  '</svg> Continue with Google';

const els = {
  form: document.getElementById('auth-form'),
  msg: document.getElementById('auth-msg'),
  submit: document.getElementById('auth-submit'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  name: document.getElementById('name'),
  nameField: document.getElementById('name-field'),
  tabLogin: document.getElementById('tab-login'),
  tabSignup: document.getElementById('tab-signup'),
  toggle: document.getElementById('pw-toggle'),
  blocked: document.getElementById('blocked-note'),
  google: document.getElementById('google-btn'),
};

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';

  els.tabLogin.classList.toggle('active', !signup);
  els.tabSignup.classList.toggle('active', signup);
  els.nameField.hidden = !signup;
  els.submit.textContent = signup ? 'Create account' : 'Sign in';
  els.password.autocomplete = signup ? 'new-password' : 'current-password';
  els.password.placeholder = signup ? 'At least 6 characters' : 'Your password';
  hideMessage(els.msg);
}

els.tabLogin.addEventListener('click', () => setMode('login'));
els.tabSignup.addEventListener('click', () => setMode('signup'));

els.toggle.addEventListener('click', () => {
  const showing = els.password.type === 'text';
  els.password.type = showing ? 'password' : 'text';
  els.toggle.textContent = showing ? 'Show' : 'Hide';
});

/**
 * Blocked view: hide every way in, so a blocked account cannot simply retry
 * with Google.
 */
function showBlocked() {
  els.blocked.hidden = false;
  els.form.hidden = true;
  els.google.hidden = true;
  const divider = document.querySelector('.or');
  if (divider) divider.hidden = true;
}

/**
 * Send an already-signed-in visitor to the right page, or leave the form up.
 *
 * A single redirect in either direction is normal, so it is always allowed. The
 * only fault worth reporting is a real ping-pong: a guarded page sent us here
 * moments ago, and we still cannot read the profile it could not read either.
 * Forwarding at that point would bounce, so stop and name the actual cause.
 */
async function redirectIfSignedIn() {
  // Google sends the browser back here with the session in the URL fragment,
  // which Supabase only exchanges after startup. Wait for that first.
  await authReady();

  const res = await fetchProfile();
  if (!res.ok) {
    // Genuinely signed out: leave the sign-in form up, as normal.
    if (res.reason === 'signed_out') return;

    // Signed in, but the database cannot answer. Presenting a login form to
    // someone who already has a session is confusing, so explain instead - but
    // escalate to a blocking message only when a guarded page just sent us here,
    // because forwarding now would bounce.
    if (bouncedFrom('dashboard.html') || bouncedFrom('admin.html')) {
      showFatal(
        'Cannot read your account',
        res.reason === 'no_profile'
          ? 'Your account is signed in but has no row in pr_users. Run supabase/schema.sql, then reload.'
          : 'The pr_users table could not be read. If the app is not deployed yet, run supabase/schema.sql first.',
      );
      return;
    }

    showMessage(
      els.msg,
      'err',
      'You are signed in, but the app cannot read your account. If the app is not deployed yet, run supabase/schema.sql, then reload this page.',
    );
    return;
  }

  clearBounce();
  const profile = res.profile;

  if (profile.status === 'blocked') {
    showBlocked();
    await sb.auth.signOut();
    return;
  }
  window.location.replace(profile.role === 'admin' ? 'admin.html' : 'dashboard.html');
}

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage(els.msg);

  const email = els.email.value.trim();
  const password = els.password.value;
  const name = els.name.value.trim();

  if (!email || !password) {
    showMessage(els.msg, 'err', 'Enter your email and password.');
    return;
  }
  if (password.length < 6) {
    showMessage(els.msg, 'err', 'Passwords must be at least 6 characters.');
    return;
  }

  els.submit.disabled = true;
  els.submit.innerHTML = '<span class="spinner"></span> Please wait';

  try {
    if (mode === 'signup') {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;

      if (!data.session) {
        showMessage(els.msg, 'ok', 'Account created. Check your email to confirm, then sign in.');
        els.submit.disabled = false;
        els.submit.textContent = 'Sign in';
        setMode('login');
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }

    // Confirm the account is actually usable before leaving the page.
    const profile = await loadProfile();
    if (!profile) {
      showMessage(els.msg, 'err', 'Signed in, but no profile could be loaded. Run schema.sql first.');
      els.submit.disabled = false;
      els.submit.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
      return;
    }
    if (profile.status === 'blocked') {
      showBlocked();
      await sb.auth.signOut();
      return;
    }

    window.location.href = profile.role === 'admin' ? 'admin.html' : 'dashboard.html';
  } catch (err) {
    showMessage(els.msg, 'err', friendlyAuthError(err));
    els.submit.disabled = false;
    els.submit.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
  }
});

function friendlyAuthError(err) {
  const msg = String(err?.message || '');
  if (/Invalid login credentials/i.test(msg)) return 'That email and password combination is not recognised.';
  if (/User already registered/i.test(msg)) return 'An account with that email already exists. Try signing in.';
  if (/Password should be at least/i.test(msg)) return 'Passwords must be at least 6 characters.';
  if (/Email not confirmed/i.test(msg)) return 'Confirm your email address before signing in.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a moment and try again.';
  return msg || 'Something went wrong. Please try again.';
}

/**
 * Sign in with Google.
 *
 * Supabase redirects the whole browser to Google and back, so there is nothing
 * to await here - the page is unloaded. The redirect target must be listed
 * under Auth -> URL Configuration -> Redirect URLs in the Supabase dashboard,
 * or Google comes back to a URL that is rejected.
 */
async function signInWithGoogle() {
  hideMessage(els.msg);
  els.google.disabled = true;
  els.google.innerHTML = '<span class="spinner"></span> Redirecting to Google&hellip;';

  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    // Only reached when the redirect could not be started at all.
    if (error) throw error;
  } catch (err) {
    els.google.disabled = false;
    els.google.innerHTML = GOOGLE_LABEL;
    showMessage(els.msg, 'err', friendlyAuthError(err));
  }
}

els.google.addEventListener('click', signInWithGoogle);

/**
 * Translate the error codes Supabase appends to the URL when an OAuth round
 * trip fails. Without this the visitor just lands back on a clean login form
 * with no idea what went wrong.
 */
function reportOAuthError() {
  const q = new URLSearchParams(window.location.search);
  const code = q.get('error_code') || '';
  const desc = q.get('error_description') || q.get('error') || '';
  if (!code && !desc) return;

  const text = /oauth_provider_not_enabled|provider is not enabled/i.test(`${code} ${desc}`)
    ? 'Google sign-in is not enabled for this project yet. An administrator needs to finish the setup.'
    : /access_denied/i.test(`${code} ${desc}`)
      ? 'Google sign-in was cancelled.'
      : /otp_expired|token_expired/i.test(`${code} ${desc}`)
        ? 'That sign-in link expired. Please try again.'
        : 'Google sign-in failed.';

  showMessage(els.msg, 'err', text);

  // Clean the URL so a refresh does not repeat the message.
  window.history.replaceState({}, document.title, window.location.pathname);
}

if (new URLSearchParams(window.location.search).get('blocked') === '1') {
  els.blocked.hidden = false;
}

setMode('login');
reportOAuthError();
redirectIfSignedIn();
