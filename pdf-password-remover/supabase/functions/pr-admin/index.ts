// pr-admin — admin dashboard API (analytics, user management, usage logs).
//
// Every action re-checks the caller's role against pr_users, so a stale
// client-side flag can never grant access. Read paths delegate to the
// SECURITY DEFINER RPCs in schema.sql, which are themselves admin-guarded.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
// Needed for exactly two things: reading back a stored PDF password and minting
// a download link for a file belonging to another user. Both are reached only
// after the caller's admin role has been re-checked, and neither accepts a
// caller-supplied storage path.
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PASSWORD_SECRET = Deno.env.get('PDF_PASSWORD_SECRET') ?? '';
const BUCKET = 'pr_pdfs';
// Short, because an admin link is a hand-off to a browser download.
const ADMIN_LINK_TTL = 300;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Must list every header the browser actually sends, or the preflight fails
  // and the caller sees only "Failed to fetch". apikey and x-client-info come
  // from this app and from supabase-js respectively.
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version',
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Must mirror encryptQuietly() in pr-unlock exactly, or the ciphertext will not
// decrypt: base64url of <version>.<iv>.<ciphertext>, AES-256-GCM, key = SHA-256
// of PDF_PASSWORD_SECRET.
const b64u = {
  encode(bytes: Uint8Array): string {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(text: string): Uint8Array {
    const pad = '='.repeat((4 - (text.length % 4)) % 4);
    const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

async function decryptPassword(blob: string): Promise<string> {
  if (!PASSWORD_SECRET) {
    throw new HttpError(
      500,
      'server_error',
      'PDF_PASSWORD_SECRET is not set, so stored passwords cannot be read back.',
    );
  }
  const [version, ivPart, ctPart] = (blob || '').split('.');
  if (version !== 'v1' || !ivPart || !ctPart) throw new Error('Unrecognised ciphertext format');

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(PASSWORD_SECRET));
  const key = await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64u.decode(ivPart) },
    key,
    b64u.decode(ctPart),
  );
  return new TextDecoder().decode(plain);
}

serve((req) =>
  // Safety net, so a throw outside the inner try still returns CORS headers
  // instead of surfacing in the browser as a bare "Failed to fetch".
  handle(req).catch((err) => {
    console.error('pr-admin unhandled:', err);
    return json({ error: 'Unexpected server error.' }, 500);
  }),
);

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!SUPABASE_URL || !ANON_KEY) return json({ error: 'Server misconfigured' }, 500);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'Sign in to continue.');

    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    const user = userData?.user;
    if (userErr || !user) throw new HttpError(401, 'Sign in to continue.');

    // The admin RPCs are SECURITY DEFINER and authorise themselves with
    // auth.uid(). Under the service role there is no user claim, so every call
    // would fail its own check. They MUST be issued as the signed-in admin,
    // which is also why they are safe to expose: they grant nothing on their own.
    const { data: profile } = await asUser
      .from('pr_users')
      .select('id, email, role, status')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) throw new HttpError(403, 'No profile exists for this account.');
    if (profile.status === 'blocked') {
      throw new HttpError(403, 'Your account has been blocked. Contact support.');
    }
    if (profile.role !== 'admin') throw new HttpError(403, 'Administrator access required.');

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : '';

    const rpc = async <T,>(name: string, args: Record<string, unknown>): Promise<T> => {
      const { data, error } = await asUser.rpc(name, args);
      if (error) throw new HttpError(400, error.message);
      return (data ?? []) as T;
    };

    switch (action) {
      case 'stats': {
        const rows = await rpc<Record<string, number>[]>('pr_admin_stats', {});
        return json({ stats: rows[0] ?? {} });
      }

      case 'users': {
        const users = await rpc('pr_admin_list_users', {});
        return json({ users });
      }

      case 'leaderboard': {
        const limit = Number.isFinite(body?.limit) ? Number(body.limit) : 10;
        const rows = await rpc('pr_admin_user_leaderboard', { p_limit: limit });
        return json({ leaderboard: rows });
      }

      case 'daily_volume': {
        const rows = await rpc('pr_admin_daily_volume', {});
        return json({ daily: rows });
      }

      case 'logs': {
        const rows = await rpc('pr_admin_list_logs', {
          p_limit: Number.isFinite(body?.limit) ? Number(body.limit) : 100,
          p_offset: Number.isFinite(body?.offset) ? Number(body.offset) : 0,
          p_user: typeof body?.userId === 'string' && UUID_RE.test(body.userId) ? body.userId : null,
          p_status: body?.status === 'success' || body?.status === 'failure' ? body.status : null,
        });
        return json({ logs: rows });
      }

      case 'set_status': {
        const userId = typeof body?.userId === 'string' ? body.userId : '';
        if (!UUID_RE.test(userId)) throw new HttpError(400, 'A valid user id is required.');
        if (typeof body?.blocked !== 'boolean') throw new HttpError(400, 'blocked must be a boolean.');
        await rpc('pr_admin_set_user_status', { p_user_id: userId, p_blocked: body.blocked });
        return json({ ok: true, status: body.blocked ? 'blocked' : 'active' });
      }

      case 'set_role': {
        const userId = typeof body?.userId === 'string' ? body.userId : '';
        if (!UUID_RE.test(userId)) throw new HttpError(400, 'A valid user id is required.');
        if (body?.role !== 'admin' && body?.role !== 'user') {
          throw new HttpError(400, 'role must be admin or user.');
        }
        await rpc('pr_admin_set_user_role', { p_user_id: userId, p_role: body.role });
        return json({ ok: true, role: body.role });
      }

      // ---- run detail: who, what password, which files ----
      case 'log_detail': {
        const logId = typeof body?.logId === 'string' ? body.logId : '';
        if (!UUID_RE.test(logId)) throw new HttpError(400, 'A valid run id is required.');

        const { data: rows, error } = await asUser.rpc('pr_admin_get_log', { p_log_id: logId });
        if (error) throw new HttpError(400, error.message);
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) throw new HttpError(404, 'No such run.');

        // Decrypt here rather than in SQL: the key never enters the database.
        let password: string | null = null;
        if (row.password_cipher) {
          try {
            password = await decryptPassword(row.password_cipher);
          } catch (err) {
            console.error('pr-admin: decrypt failed:', err);
            throw new HttpError(
              500,
              'server_error',
              'The stored password could not be decrypted. If PDF_PASSWORD_SECRET was ' +
                'changed or removed, previously saved passwords are unrecoverable.',
            );
          }
        }

        return json({
          log: { ...row, password_cipher: undefined },
          password,
          hasPassword: Boolean(row.password_cipher),
        });
      }

      // ---- download a stored file for any user ----
      case 'download': {
        const logId = typeof body?.logId === 'string' ? body.logId : '';
        if (!UUID_RE.test(logId)) throw new HttpError(400, 'A valid run id is required.');
        if (body?.which !== 'input' && body?.which !== 'output') {
          throw new HttpError(400, "which must be 'input' or 'output'.");
        }

        // The path is looked up from the run, never taken from the request. If
        // the client could name a path, this would become an arbitrary read of
        // the whole bucket via the service role.
        const { data: rows, error } = await asUser.rpc('pr_admin_get_log', { p_log_id: logId });
        if (error) throw new HttpError(400, error.message);
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) throw new HttpError(404, 'No such run.');

        const path = body.which === 'input' ? row.input_path : row.output_path;
        if (!path) {
          throw new HttpError(404, `That run has no ${body.which} file stored.`);
        }
        // Defence in depth: the value came from the database, but confirm it
        // really is an object in our bucket before signing it.
        if (typeof path !== 'string' || path.startsWith('/') || path.includes('..')) {
          throw new HttpError(400, 'Invalid stored path.');
        }

        if (!SERVICE_KEY) throw new HttpError(500, 'Server misconfigured');
        const service = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: signed, error: signErr } = await service.storage
          .from(BUCKET)
          .createSignedUrl(path, ADMIN_LINK_TTL);
        if (signErr || !signed?.signedUrl) {
          // Almost always the retention sweep already removed it.
          throw new HttpError(404, 'That file is no longer stored.');
        }

        return json({
          downloadUrl: signed.signedUrl,
          filename: path.split('/').pop() || 'file.pdf',
          expiresInSeconds: ADMIN_LINK_TTL,
        });
      }

      // ---- keep or release a run's files ----
      case 'retain': {
        const logId = typeof body?.logId === 'string' ? body.logId : '';
        if (!UUID_RE.test(logId)) throw new HttpError(400, 'A valid run id is required.');
        const hours = body?.retainHours === null ? null : Number(body?.retainHours);
        if (hours !== null && !Number.isFinite(hours)) {
          throw new HttpError(400, 'retainHours must be a number or null.');
        }
        const { data, error } = await asUser.rpc('pr_admin_set_retain', {
          p_log_id: logId,
          p_retain_hours: hours,
        });
        if (error) throw new HttpError(400, error.message);
        return json({ ok: true, retainUntil: data ?? null });
      }

      default:
        throw new HttpError(400, 'Unknown action.');
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('pr-admin failed:', err);
    return json({ error: 'Unexpected error.' }, 500);
  }
}
