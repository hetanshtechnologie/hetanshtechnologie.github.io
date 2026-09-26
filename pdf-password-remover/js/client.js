// Single Supabase client for the app.
const MSG_SELECTOR = '#auth-msg, #unlock-msg, #admin-msg';

// The client library is loaded from a CDN, so it can be missing on an offline
// machine, behind a restrictive proxy, or when an ad blocker filters the host.
// Without a guard every later script dies with "cannot read property of
// undefined", which says nothing about the real cause.
function requireSupabase() {
  const lib = window.supabase;
  if (lib && typeof lib.createClient === 'function') return lib;

  const hint =
    'The Supabase library could not be loaded, so this page cannot run. It needs ' +
    'access to cdn.jsdelivr.net - check your connection, proxy, or ad blocker, ' +
    'then reload the page.';

  const box = document.querySelector(MSG_SELECTOR);
  if (box) {
    box.hidden = false;
    box.classList.add('err');
    box.textContent = hint;
  } else {
    const main = document.querySelector('main') || document.body;
    const p = document.createElement('p');
    p.className = 'msg err';
    p.textContent = hint;
    main.prepend(p);
  }
  throw new Error('supabase-js failed to load from cdn.jsdelivr.net');
}

const sb = requireSupabase().createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
);
