// db.js — direct Supabase REST access. RLS scopes every read/write server-side.
const db = {
  async getProfile() {
    const user = await currentSessionUser();
    if (!user) return null;
    const { data } = await sb.from('users')
      .select('id, tenant_id, email, role, created_at')
      .eq('id', user.id)
      .maybeSingle();
    return data || null;
  },

  async requireProfile() {
    const profile = await this.getProfile();
    if (!profile) throw new Error('No workspace found for this account.');
    return profile;
  },

  // ---------- Links ----------
  async listLinks() {
    const { data } = await sb.from('links')
      .select('id, tenant_id, user_id, category_id, url, title, watched, created_at, categories(name)')
      .order('created_at', { ascending: false });
    return (data || []).map(l => ({ ...l, category: l.categories?.name || '' }));
  },

  async listTenantLinks() {
    const { data } = await sb.from('links')
      .select('id, tenant_id, user_id, category_id, url, title, watched, created_at, users(email), categories(name)')
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

  // ---------- Tenant users (admin) ----------
  async listTenantUsers() {
    const { data } = await sb.from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: true });
    return data || [];
  },

  async setUserRole(id, role) {
    const { error } = await sb.from('users').update({ role }).eq('id', id);
    if (error) throw new Error(error.message);
  }
};