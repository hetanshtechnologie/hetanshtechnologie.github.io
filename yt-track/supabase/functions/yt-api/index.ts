// yt-api — Edge Function for YT Track.
// Enforces tenant isolation + role checks, and ingests YouTube playlists
// via the YouTube Data API v3. Requires the YOUTUBE_API_KEY secret.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-route',
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function fail(status: number, message: string): Response {
  return json({ error: message }, status);
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function parsePlaylistId(url: string): string | null {
  const m = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{10,}$/.test(url.trim())) return url.trim();
  return null;
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (+d || 0) * 86400 + (+h || 0) * 3600 + (+min || 0) * 60 + (+s || 0);
}

function formatDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function ytGet(path: string): Promise<any> {
  const url = `https://www.googleapis.com/youtube/v3/${path}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    const reason = data?.error?.message || `YouTube API HTTP ${res.status}`;
    throw new HttpError(502, 'YouTube API error: ' + reason);
  }
  return data;
}

async function fetchPlaylistTitle(playlistId: string): Promise<string | null> {
  const data = await ytGet(`playlists?part=snippet&id=${encodeURIComponent(playlistId)}`);
  return data?.items?.[0]?.snippet?.title || null;
}

async function fetchPlaylistVideos(playlistId: string): Promise<any[]> {
  let pageToken = '';
  const rows: any[] = [];

  do {
    const data = await ytGet(
      `playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50${pageToken ? '&pageToken=' + pageToken : ''}`
    );
    for (const item of data?.items || []) {
      const vid = item?.contentDetails?.videoId;
      const title = item?.snippet?.title;
      if (!vid || !title) continue;
      rows.push({
        youtube_video_id: vid,
        title,
        position: typeof item?.snippet?.position === 'number' ? item.snippet.position : rows.length,
        youtube_url: 'https://www.youtube.com/watch?v=' + encodeURIComponent(vid),
        duration_seconds: 0,
        duration: '--:--',
      });
    }
    pageToken = data?.nextPageToken || '';
  } while (pageToken);

  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const ids = chunk.map((r) => r.youtube_video_id).join(',');
    const data = await ytGet(`videos?part=contentDetails&id=${encodeURIComponent(ids)}`);
    const durMap = new Map((data?.items || []).map((v: any) => [v.id, v?.contentDetails?.duration]));
    for (const r of chunk) {
      const iso = durMap.get(r.youtube_video_id);
      const seconds = iso ? parseIsoDuration(iso) : 0;
      r.duration_seconds = seconds;
      r.duration = seconds ? formatDuration(seconds) : '--:--';
    }
  }

  return rows;
}

async function getOwnedPlaylist(service: any, profile: any, playlistId: string): Promise<any | null> {
  const { data: pl } = await service
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .maybeSingle();
  if (!pl) return null;
  if (pl.tenant_id !== profile.tenant_id || (pl.user_id !== profile.id && profile.role !== 'admin')) return null;
  return pl;
}

function requireAdmin(profile: any): void {
  if (profile.role !== 'admin') throw new HttpError(403, 'Admin access required');
}

async function syncVideos(service: any, playlistId: string, tenantId: string, videos: any[]): Promise<void> {
  if (!videos.length) return;
  const { error } = await service.rpc('upsert_videos', {
    p_playlist_id: playlistId,
    p_tenant_id: tenantId,
    p_videos: videos,
  });
  if (error) throw new Error(error.message);
}

async function createPlaylist(service: any, profile: any, rawUrl: string) {
  if (!rawUrl || typeof rawUrl !== 'string') throw new HttpError(400, 'A playlist URL is required.');
  const pid = parsePlaylistId(rawUrl);
  if (!pid) throw new HttpError(400, 'No YouTube playlist id found in that URL.');

  let { data: pl } = await service
    .from('playlists')
    .select('*')
    .eq('youtube_playlist_id', pid)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (!pl) {
    const { data: ins, error } = await service
      .from('playlists')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: profile.id,
        url: rawUrl.trim(),
        youtube_playlist_id: pid,
        title: null,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    pl = ins;
  }

  if (!pl.title) {
    const title = await fetchPlaylistTitle(pid);
    if (title) {
      await service.from('playlists').update({ title }).eq('id', pl.id);
      pl.title = title;
    }
  }
  pl.title = pl.title || 'Untitled playlist';

  const videos = await fetchPlaylistVideos(pid);
  await syncVideos(service, pl.id, profile.tenant_id, videos);

  return json({ playlist: pl, videos });
}

async function refreshPlaylist(service: any, profile: any, playlistId: string) {
  const pl = await getOwnedPlaylist(service, profile, playlistId);
  if (!pl) throw new HttpError(404, 'Playlist not found');
  const videos = await fetchPlaylistVideos(pl.youtube_playlist_id);
  await syncVideos(service, pl.id, pl.tenant_id, videos);
  return json({ playlist: pl, videos });
}

async function getPlaylistVideos(service: any, profile: any, playlistId: string) {
  const pl = await getOwnedPlaylist(service, profile, playlistId);
  if (!pl) throw new HttpError(404, 'Playlist not found');
  const { data: videos } = await service
    .from('videos')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  return { playlist: pl, videos: videos || [] };
}

async function setVideoStatus(service: any, profile: any, videoId: string, status: unknown) {
  if (status !== 'watched' && status !== 'unwatched') throw new HttpError(400, 'Status must be "watched" or "unwatched".');
  const { data: v } = await service
    .from('videos')
    .select('id, playlist_id')
    .eq('id', videoId)
    .maybeSingle();
  if (!v) throw new HttpError(404, 'Video not found');
  const pl = await getOwnedPlaylist(service, profile, String(v.playlist_id));
  if (!pl) throw new HttpError(403, 'Not allowed to edit this video');
  const { error } = await service.from('videos').update({ status }).eq('id', videoId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function listUsers(service: any, profile: any) {
  requireAdmin(profile);
  const { data } = await service
    .from('users')
    .select('id, email, role, created_at')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: true });
  return { users: data || [] };
}

async function setUserRole(service: any, profile: any, userId: string, role: unknown) {
  requireAdmin(profile);
  if (role !== 'admin' && role !== 'user') throw new HttpError(400, 'Invalid role');
  const { data: target } = await service
    .from('users')
    .select('id, tenant_id')
    .eq('id', userId)
    .maybeSingle();
  if (!target || target.tenant_id !== profile.tenant_id) throw new HttpError(404, 'User not found');
  const { error } = await service.from('users').update({ role }).eq('id', userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function adminPlaylists(service: any, profile: any) {
  requireAdmin(profile);
  const { data } = await service
    .from('playlists')
    .select('id, tenant_id, user_id, url, title, youtube_playlist_id, created_at, users(email), videos(status)')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false });
  const playlists = (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    url: p.url,
    youtube_playlist_id: p.youtube_playlist_id,
    user_id: p.user_id,
    owner_email: p.users?.email || null,
    created_at: p.created_at,
    videoCount: (p.videos || []).length,
    watchedCount: (p.videos || []).filter((v: any) => v.status === 'watched').length,
  }));
  return { playlists };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_KEY) return fail(500, 'Server misconfigured');
  if (!YOUTUBE_API_KEY) return fail(500, 'YouTube API key not configured');

  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  const user = authData?.user;
  if (authError || !user) return fail(401, 'Unauthorized');

  const service = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: profile } = await service
    .from('users')
    .select('id, tenant_id, role, email')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return fail(403, 'No workspace profile for this account');

  const route = req.headers.get('x-route') || '';
  const method = req.method;

  try {
    if (route === '/playlists' && method === 'POST') {
      const { url } = await readBody(req);
      return await createPlaylist(service, profile, String(url || ''));
    }
    if (route.startsWith('/playlists/') && route.endsWith('/refresh') && method === 'POST') {
      const id = route.slice('/playlists/'.length, -'/refresh'.length);
      return await refreshPlaylist(service, profile, id);
    }
    if (route.startsWith('/playlists/') && route.endsWith('/videos') && method === 'GET') {
      const id = route.slice('/playlists/'.length, -'/videos'.length);
      return json(await getPlaylistVideos(service, profile, id));
    }
    if (route.startsWith('/videos/') && route.endsWith('/status') && method === 'PATCH') {
      const id = route.slice('/videos/'.length, -'/status'.length);
      const { status } = await readBody(req);
      return json(await setVideoStatus(service, profile, id, status));
    }
    if (route === '/users' && method === 'GET') return json(await listUsers(service, profile));
    if (route.startsWith('/users/') && route.endsWith('/role') && method === 'PATCH') {
      const id = route.slice('/users/'.length, -'/role'.length);
      const { role } = await readBody(req);
      return json(await setUserRole(service, profile, id, role));
    }
    if (route === '/admin/playlists' && method === 'GET') return json(await adminPlaylists(service, profile));
    return fail(404, 'Not found');
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    return fail(status, msg);
  }
});