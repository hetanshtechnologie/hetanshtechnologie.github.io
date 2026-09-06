const supabaseClient = (() => {
  let client = null;
  function init(url, key) {
    if (!url || !key) return null;
    client = supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return client;
  }
  function getClient() { return client; }
  async function getCurrentUser() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;
    const { data: profile } = await client.from('profiles').select('*').eq('user_id', user.id).single();
    return { ...user, profile };
  }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (window.sitengSetUser) window.sitengSetUser(data.user?.email, data.user?.id);
    return data;
  }
  async function signUp(email, password, meta) {
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: meta }
    });
    if (error) throw error;
    return data;
  }
  async function signOut() {
    await client.auth.signOut();
    if (window.sitengSetUser) window.sitengSetUser(null);
    window.location.hash = '#login';
  }
  function requireRole(roles) {
    return async () => {
      const user = await getCurrentUser();
      if (!user) { window.location.hash = '#login'; return false; }
      if (roles && !roles.includes(user.profile?.role)) {
        window.location.hash = '#dashboard';
        return false;
      }
      return user;
    };
  }
  return { init, getClient, getCurrentUser, signIn, signUp, signOut, requireRole };
})();
