// db.js — direct Supabase REST access. RLS scopes every read/write server-side.
const db = {
  async getProfile() {
    const user = await currentSessionUser();
    if (!user) return null;
    const { data } = await sb.from('users')
      .select('id, tenant_id, email, role, parent_id, plan, plan_expires_at, created_at')
      .eq('id', user.id)
      .maybeSingle();
    return data || null;
  },

  async requireProfile() {
    const profile = await this.getProfile();
    if (!profile) throw new Error('No workspace found for this account.');
    return profile;
  },

  async parentProfile(parentId) {
    const { data } = await sb.from('users')
      .select('id, email, role, plan')
      .eq('id', parentId)
      .maybeSingle();
    return data || null;
  },

  // ---------- Links ----------
  async listLinks() {
    const { data } = await sb.from('links')
      .select('id, tenant_id, user_id, category_id, url, title, watched, sort_order, created_at, categories(name)')
      .order('created_at', { ascending: false });
    return (data || []).map(l => ({ ...l, category: l.categories?.name || '' }));
  },

  async listTenantLinks() {
    const { data } = await sb.from('links')
      .select('id, tenant_id, user_id, category_id, url, title, watched, sort_order, created_at, users(email), categories(name)')
      .order('created_at', { ascending: false });
    return (data || []).map(l => ({
      ...l,
      owner_email: l.users?.email || null,
      category: l.categories?.name || ''
    }));
  },

  async addLink({ url, title, category_id }) {
    const profile = await this.requireProfile();
    const { data, error } = await sb.from('links')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: profile.id,
        url,
        title: title || null,
        category_id: category_id || null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateLink(id, patch) {
    const { data, error } = await sb.from('links').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteLink(id) {
    const { error } = await sb.from('links').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async setWatched(id, watched) {
    return this.updateLink(id, { watched: !!watched });
  },

  // ---------- Per-child progress ----------
  async listMyProgress() {
    const { data } = await sb.from('link_progress')
      .select('link_id, child_id, watched, updated_at')
      .eq('child_id', (await this.requireProfile()).id);
    return data || [];
  },

  async setProgress(linkId, watched) {
    const profile = await this.requireProfile();
    const { data, error } = await sb.from('link_progress')
      .upsert(
        { link_id: linkId, child_id: profile.id, watched: !!watched, updated_at: new Date().toISOString() },
        { onConflict: 'link_id,child_id' }
      )
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async familyProgress() {
    const { data } = await sb.from('link_progress')
      .select('link_id, child_id, watched, child:users(email)')
      .order('updated_at', { ascending: false });
    return (data || []).map(p => ({ ...p, child_email: p.child?.email || '' }));
  },

  // ---------- Categories ----------
  async listCategories() {
    const { data } = await sb.from('categories')
      .select('id, tenant_id, parent_id, name, created_at')
      .order('name', { ascending: true });
    return data || [];
  },

  async createCategory({ name, parent_id }) {
    const profile = await this.requireProfile();
    const { data, error } = await sb.from('categories')
      .insert({ tenant_id: profile.tenant_id, parent_id: parent_id || null, name })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateCategory(id, patch) {
    const { data, error } = await sb.from('categories').update(patch).eq('id', id).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteCategory(id) {
    const { error } = await sb.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ---------- Plans ----------
  async listPlans() {
    const { data } = await sb.from('yt_plans')
      .select('id, name, price, max_videos, max_children, active')
      .eq('active', true)
      .order('price', { ascending: true });
    return data || [];
  },

  // ---------- Children (parent invites) ----------
  async listChildren(parentId) {
    const { data, error } = await sb.rpc('list_children', { p_parent_id: parentId || null });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createChild({ name, email, pin, parent_id }) {
    const profile = await this.requireProfile();
    const { data, error } = await sb.rpc('create_child', {
      p_parent_id: parent_id || profile.id,
      p_name: name,
      p_email: email,
      p_pin: pin,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async updateChild(childId, { name, email, pin }) {
    const { error } = await sb.rpc('update_child', {
      p_child_id: childId, p_name: name, p_email: email, p_pin: pin,
    });
    if (error) throw new Error(error.message);
  },

  async unlinkChild(childId) {
    const { error } = await sb.rpc('unlink_child', { p_child_id: childId });
    if (error) throw new Error(error.message);
  },

  async linkChild({ email, pin }) {
    const { data, error } = await sb.rpc('link_child', { p_email: email || null, p_pin: pin });
    if (error) throw new Error(error.message);
    return !!data;
  },

  // ---------- Tenant users (admin) ----------
  async listTenantUsers() {
    const { data } = await sb.from('users')
      .select('id, email, role, parent_id, plan, plan_expires_at, created_at')
      .order('created_at', { ascending: true });
    return data || [];
  },

  async setUserRole(id, role) {
    const { error } = await sb.from('users').update({ role }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async setPlan(id, plan, expiresAt) {
    const { error } = await sb.from('users')
      .update({ plan, plan_expires_at: expiresAt || null })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async deleteUser(id) {
    const { error } = await sb.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ---------- Admin across all tenants (role=admin) ----------
  async adminListChildren() {
    const { data, error } = await sb.rpc('admin_list_children');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async adminSetUser(id, patch) {
    const plan = patch.plan;
    const { error } = await sb.rpc('admin_set_user', {
      p_user_id: id,
      p_role: patch.role || null,
      p_parent_id: patch.parent_id || null,
      p_plan: plan || null,
      p_plan_expires_at: plan && plan !== 'free'
        ? (patch.plan_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        : null,
    });
    if (error) throw new Error(error.message);
  },

  async adminDeleteUser(id) {
    const { error } = await sb.rpc('admin_delete_user', { p_user_id: id });
    if (error) throw new Error(error.message);
  },
};

// Call a Supabase Edge Function with the signed-in user's token.
async function callFunction(name, body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('You must be signed in.');
  const res = await fetch(CONFIG.SUPABASE_URL + '/functions/v1/' + name, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + session.access_token,
    },
    body: JSON.stringify(body || {}),
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok || (data && data.error)) {
    throw new Error((data && data.error) || ('Request failed (HTTP ' + res.status + ')'));
  }
  return data;
}