// pr-unlock — removes PDF password protection.
//
// Flow: the browser uploads the PDF straight to the private pr_pdfs bucket
// (so the file never passes through this function), then calls this endpoint
// with { path, password }. We authorise, decrypt, write the unlocked copy back
// to the same bucket, log the attempt, and return a short-lived signed URL.
//
// Decryption engine: @cantoo/pdf-lib (see README for why the alternatives were
// rejected). Verified against AES-256 (V5/R6), AES-128 (V4/R4), RC4-128 and
// RC4-40, with both the user and the owner password.
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  PDFDocument,
  PDFInvalidObject,
  PDFDict,
  PDFName,
  PDFRawStream,
  PDFStream,
} from 'npm:@cantoo/pdf-lib@2.11.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Kept so an admin can review the password a user submitted. It is a real
// security decision, so it is never stored in the clear: the value below is
// encrypted with AES-GCM under PDF_PASSWORD_SECRET and only pr-admin can read
// it back. Remove the secret and the stored values become permanently
// unreadable, which is the intended way to drop this feature.
const PASSWORD_SECRET = Deno.env.get('PDF_PASSWORD_SECRET') ?? '';
const BUCKET = 'pr_pdfs';
const MAX_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL = 3600;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // apikey and x-client-info are sent by this app and by supabase-js itself.
  // Leaving either out makes the browser reject the preflight and the request
  // fails with a bare "Failed to fetch", with nothing in the console to explain
  // it - the response never reaches JS.
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version',
};

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---------- password encryption (AES-256-GCM) ----------
// Wire format, base64url:  <version>.<iv>.<ciphertext>
// A fresh 12-byte IV per call, so the same password never produces the same
// stored string twice. The key is derived from PDF_PASSWORD_SECRET with
// SHA-256, which accepts a secret of any length.
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

async function secretKeyMaterial(): Promise<CryptoKey> {
  if (!PASSWORD_SECRET) {
    throw new HttpError(
      500,
      'server_error',
      'PDF_PASSWORD_SECRET is not set, so the submitted password cannot be recorded.',
    );
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(PASSWORD_SECRET));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptPassword(plain: string): Promise<string> {
  const key = await secretKeyMaterial();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)),
  );
  return `v1.${b64u.encode(iv)}.${b64u.encode(ct)}`;
}

// Recording the password is a convenience, not the point of the request. If the
// secret is missing the unlock must still succeed, so a failure here is logged
// and the run is stored without a password rather than turning into a 500.
async function encryptQuietly(plain: string): Promise<string | null> {
  if (!plain) return null; // nothing worth storing
  try {
    return await encryptPassword(plain);
  } catch (err) {
    console.error('pr-unlock: could not record the password:', err);
    return null;
  }
}

async function decryptPassword(blob: string): Promise<string> {
  const [version, ivPart, ctPart] = blob.split('.');
  if (version !== 'v1' || !ivPart || !ctPart) throw new Error('Unrecognised ciphertext format');
  const key = await secretKeyMaterial();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64u.decode(ivPart) },
    key,
    b64u.decode(ctPart),
  );
  return new TextDecoder().decode(plain);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

/** Locate a byte sequence without pulling in Buffer/node APIs. */
function indexOfBytes(haystack: Uint8Array, needle: string): number {
  const n = new TextEncoder().encode(needle);
  if (n.length === 0 || haystack.length < n.length) return -1;
  outer: for (let i = 0; i <= haystack.length - n.length; i++) {
    for (let j = 0; j < n.length; j++) {
      if (haystack[i + j] !== n[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * After a successful decrypt, pdf-lib still carries the *source* document's
 * xref/trailer stream as an unparseable PDFInvalidObject, and that leftover
 * still contains "/Encrypt". It is unreferenced in the output, but strict
 * readers see it and refuse the file. Drop only those specific leftovers;
 * every other object is left untouched.
 */
function stripEncryptionArtifacts(doc: PDFDocument): number {
  const ctx = (doc as unknown as { context: any }).context;
  const doomed: unknown[] = [];

  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFInvalidObject) {
      // `data` holds the object's serialised bytes. It is marked private in the
      // type definitions, so reach for it through a narrow cast and read it
      // defensively rather than assuming it is always present.
      const data = (obj as unknown as { data?: Uint8Array }).data;
      if (data instanceof Uint8Array && indexOfBytes(data, '/Encrypt') !== -1) doomed.push(ref);
      continue;
    }
    const dict =
      obj instanceof PDFRawStream || obj instanceof PDFStream
        ? obj.dict
        : obj instanceof PDFDict
        ? obj
        : null;
    if (dict && dict.get(PDFName.of('Encrypt')) !== undefined) doomed.push(ref);
  }

  for (const ref of doomed) ctx.delete(ref);
  return doomed.length;
}

type UnlockOutcome =
  | { kind: 'not_encrypted'; bytes: Uint8Array }
  | { kind: 'unlocked'; bytes: Uint8Array };

/**
 * Decrypt `bytes`. An empty password is legitimate: PDFs protected only by an
 * owner (permissions) password open with a blank user password.
 */
async function unlockPdf(bytes: Uint8Array, password: string): Promise<UnlockOutcome> {
  // A document that loads with no password at all is not encrypted. Return the
  // original bytes untouched rather than re-encoding it.
  try {
    await PDFDocument.load(bytes, { updateMetadata: false });
    return { kind: 'not_encrypted', bytes };
  } catch (err) {
    if (!(err instanceof Error) || !/encrypted/i.test(err.message)) throw err;
    // fall through: it is encrypted
  }

  const doc = await PDFDocument.load(bytes, { password, updateMetadata: false });
  stripEncryptionArtifacts(doc);
  const out = await doc.save({ useObjectStreams: false });
  return { kind: 'unlocked', bytes: new Uint8Array(out) };
}

/** Map library errors onto HTTP responses the UI can act on. */
function translateError(err: unknown): HttpError {
  const message = err instanceof Error ? err.message : String(err);

  if (/Password incorrect/i.test(message)) {
    return new HttpError(401, 'wrong_password', 'That password is not correct for this PDF.');
  }
  if (/NEEDS PASSWORD/i.test(message)) {
    return new HttpError(400, 'password_required', 'This PDF is password protected. Enter the password.');
  }
  if (/is encrypted/i.test(message)) {
    return new HttpError(400, 'password_required', 'This PDF is password protected. Enter the password.');
  }
  if (/unsupported encryption algorithm|unknown encryption method|invalid key length|Adobe\.PubSec|unsupported security handler/i.test(message)) {
    return new HttpError(415, 'unsupported', 'This PDF uses an encryption type that cannot be removed.');
  }
  if (/Invalid PDF|Invalid PDFDocument|parse|SyntaxError|stream must have|endobj|Invalid xref/i.test(message)) {
    return new HttpError(400, 'corrupt_pdf', 'This file could not be read as a valid PDF.');
  }
  return new HttpError(500, 'server_error', 'Could not process this PDF.');
}

const safeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120) || 'document.pdf';

serve((req) =>
  // Safety net. Without this, anything thrown before the inner try - a failed
  // esm.sh import at module scope, for instance - escapes as a bare 500 with no
  // CORS headers, and the browser reports "Failed to fetch" with no detail.
  handle(req).catch((err) => {
    console.error('pr-unlock unhandled:', err);
    return json({ error: 'Unexpected server error.', code: 'server_error' }, 500);
  }),
);

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server misconfigured' }, 500);

  try {
    // ---- authenticate ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');

    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asUser.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    const user = userData?.user;
    if (userErr || !user) throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');

    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: profile, error: profileErr } = await service
      .from('pr_users')
      .select('id, email, role, status')
      .eq('id', user.id)
      .maybeSingle();
    if (profileErr) throw new HttpError(500, 'server_error', 'Could not load your profile.');
    if (!profile) throw new HttpError(403, 'no_profile', 'No profile exists for this account.');
    if (profile.status === 'blocked') {
      throw new HttpError(403, 'blocked', 'Your account has been blocked. Contact support.');
    }

    // ---- validate input ----
    const body = await req.json().catch(() => ({}));
    const path = typeof body?.path === 'string' ? body.path.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const originalName = typeof body?.filename === 'string' ? body.filename : 'document.pdf';

    if (!path) throw new HttpError(400, 'bad_request', 'A file path is required.');

    // Ownership: every key must live in the caller's own folder.
    const owner = path.split('/')[0];
    if (owner !== user.id) {
      throw new HttpError(403, 'forbidden', 'You can only process your own uploads.');
    }
    if (path.includes('..')) throw new HttpError(400, 'bad_request', 'Invalid file path.');
    if (password.length > 512) throw new HttpError(400, 'bad_request', 'Password is too long.');

    // ---- fetch ----
    const { data: file, error: dlErr } = await service.storage.from(BUCKET).download(path);
    if (dlErr || !file) {
      throw new HttpError(404, 'not_found', 'That upload could not be found. Please upload the PDF again.');
    }

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    const size = inputBytes.byteLength;

    if (size === 0) throw new HttpError(400, 'empty_file', 'That file is empty.');
    if (size > MAX_BYTES) {
      throw new HttpError(413, 'too_large', 'PDFs are limited to 25 MB.');
    }
    if (indexOfBytes(inputBytes, '%PDF-') === -1) {
      throw new HttpError(400, 'not_a_pdf', 'That file is not a PDF.');
    }

    const logRow = (status: 'success' | 'failure', errorMessage: string | null, extra: Record<string, unknown> = {}) => ({
      user_id: user.id,
      filename: safeName(originalName),
      status,
      error_message: errorMessage,
      file_size_bytes: size,
      ...extra,
    });

    // ---- decrypt ----
    let outcome: UnlockOutcome;
    try {
      outcome = await unlockPdf(inputBytes, password);
    } catch (err) {
      const mapped = translateError(err);
      await service.from('pr_pdf_logs').insert(
        logRow('failure', mapped.message, {
          was_encrypted: mapped.code !== 'corrupt_pdf' ? true : null,
          input_path: path,
          // A wrong attempt is still the attempt someone will ask about later.
          password_cipher: await encryptQuietly(password),
        }),
      );
      throw mapped;
    }

    // ---- store the unlocked copy ----
    const base = safeName(originalName).replace(/\.pdf$/i, '');
    const outputPath = `${user.id}/${crypto.randomUUID()}-${base}-unlocked.pdf`;

    const { error: upErr } = await service.storage
      .from(BUCKET)
      .upload(outputPath, outcome.bytes, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw new HttpError(500, 'server_error', 'Could not save the unlocked PDF.');

    // The original is kept, not deleted: an admin reviewing a run needs to see
    // what was uploaded as well as what came out. Both objects are governed by
    // the row's retain_until window and swept by pr_cleanup_expired_pdfs().

    const wasEncrypted = outcome.kind === 'unlocked';
    await service.from('pr_pdf_logs').insert(
      logRow('success', null, {
        was_encrypted: wasEncrypted,
        password_removed: wasEncrypted,
        input_path: path,
        output_path: outputPath,
        password_cipher: await encryptQuietly(password),
      }),
    );

    const { data: signed, error: signErr } = await service.storage
      .from(BUCKET)
      .createSignedUrl(outputPath, SIGNED_URL_TTL);
    if (signErr || !signed?.signedUrl) {
      throw new HttpError(500, 'server_error', 'Could not create a download link.');
    }

    return json({
      ok: true,
      wasEncrypted,
      // A file with no password is still returned so the user gets a result,
      // but the UI says plainly that nothing needed removing.
      message: wasEncrypted
        ? 'Password removed. The PDF below opens without a password.'
        : 'This PDF was not password protected. A copy is ready to download.',
      downloadUrl: signed.signedUrl,
      filename: `${base}-unlocked.pdf`,
      sizeBytes: outcome.bytes.byteLength,
      expiresInSeconds: SIGNED_URL_TTL,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return json({ error: err.message, code: err.code }, err.status);
    }
    console.error('pr-unlock failed:', err);
    return json({ error: 'Unexpected error while processing the PDF.', code: 'server_error' }, 500);
  }
}
