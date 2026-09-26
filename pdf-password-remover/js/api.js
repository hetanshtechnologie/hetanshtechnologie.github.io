// Small shared utilities: escaping, formatting, messages, edge-function calls.

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(value) {
  if (!value) return '-';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '-';
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
}

const ICONS = { ok: '&#10003;', err: '&#33;', warn: '&#9888;', info: '&#8505;' };

/** Show a status message. `kind` is one of ok | err | warn | info. */
function showMessage(el, kind, text) {
  if (!el) return;
  el.className = `msg ${kind}`;
  el.innerHTML = `<span class="msg-icon">${ICONS[kind] || ICONS.info}</span><span>${escapeHtml(text)}</span>`;
  el.hidden = false;
}

function hideMessage(el) {
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
}

/** POST to a Supabase Edge Function with the caller's bearer token. */
async function callFunction(name, body) {
  const { data } = await sb.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) {
    const err = new Error('You must be signed in.');
    err.code = 'unauthenticated';
    throw err;
  }

  const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok) {
    const err = new Error(payload.error || `Request failed (${res.status})`);
    err.code = payload.code || 'server_error';
    err.status = res.status;
    throw err;
  }
  return payload;
}
