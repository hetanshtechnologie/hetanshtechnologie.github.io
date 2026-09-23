const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

async function currentSessionUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user || null;
}

function onAuthChange(cb) {
  sb.auth.onAuthStateChange((_event, session) => cb(session?.user || null));
}

async function signOut() {
  await sb.auth.signOut();
}

function redirect(to) {
  window.location.href = to;
}