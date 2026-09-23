// api.js — HTTP API layer. All calls go to the yt-api edge function,
// which enforces tenant isolation, role checks, and YouTube ingestion.
const api = {
  async call(method, route, body) {
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token || '';
    const res = await fetch(CONFIG.SUPABASE_URL + '/functions/v1/' + CONFIG.EDGE_FUNCTION, {
      method,
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        'x-route': route,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON body */ }
    if (!res.ok) {
      const message = data && data.error ? data.error : ('Request failed (' + res.status + ')');
      throw new Error(message);
    }
    return data;
  },

  createPlaylist(url) {
    return this.call('POST', 'playlists', { url });
  },

  refreshPlaylist(id) {
    return this.call('POST', 'playlists/' + id + '/refresh');
  },

  getPlaylistVideos(id) {
    return this.call('GET', 'playlists/' + id + '/videos');
  },

  setVideoStatus(id, status) {
    return this.call('PATCH', 'videos/' + id + '/status', { status });
  },

  listUsers() {
    return this.call('GET', 'users');
  },

  setUserRole(id, role) {
    return this.call('PATCH', 'users/' + id + '/role', { role });
  },

  adminPlaylists() {
    return this.call('GET', 'admin/playlists');
  }
};