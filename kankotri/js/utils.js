export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const on = (el, event, handler, opts) => el && el.addEventListener(event, handler, opts);

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce(fn, wait = 250) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?';
}

export function truncate(value, length = 32) {
  const text = String(value ?? '');
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

export function toast(message, type = 'success', duration = 3200) {
  const root = document.getElementById('toasts');
  if (!root) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.innerHTML = `<svg class="icon" style="width:16px;height:16px;margin-top:1px"><use href="#ic-${type === 'error' ? 'close' : type === 'warning' ? 'generate' : 'check'}"></use></svg><span>${escapeHtml(message)}</span>`;
  root.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transform = 'translateX(20px)';
    node.style.transition = 'all .2s ease';
    setTimeout(() => node.remove(), 220);
  }, duration);
}

export function openModal({ title = '', subtitle = '', body = '', footer = '', size = '', onMount = null, closable = true } = {}) {
  const root = document.getElementById('modal-root');
  if (!root) return () => {};
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');
  root.innerHTML = `
    <div class="modal ${size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : ''}" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
      <div class="modal-head">
        <div>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
        </div>
        ${closable ? `<button type="button" class="icon-btn" data-modal-close aria-label="Close"><svg class="icon"><use href="#ic-close"></use></svg></button>` : ''}
      </div>
      <div class="modal-body" data-modal-body></div>
      ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
    </div>`;
  const bodyEl = root.querySelector('[data-modal-body]');
  if (bodyEl) {
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof Node) bodyEl.appendChild(body);
  }

  const close = () => {
    root.classList.add('hidden');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '';
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (event) => {
    if (event.key === 'Escape' && closable) close();
  };

  if (closable) {
    root.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', close));
    root.addEventListener('click', (event) => {
      if (event.target === root) close();
    });
    document.addEventListener('keydown', onKey);
  }

  if (typeof onMount === 'function') onMount(root, close);
  return close;
}

export function confirmDialog(message, { title = 'Please confirm', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
  return new Promise(resolve => {
    const close = openModal({
      title,
      size: 'sm',
      body: `<p style="font-size:13px;line-height:1.65;color:var(--muted)">${escapeHtml(message)}</p>`,
      footer: `<button type="button" class="btn btn-outline" data-cancel>${escapeHtml(cancelText)}</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(confirmText)}</button>`,
      closable: true,
      onMount(root, closeFn) {
        root.querySelector('[data-cancel]').addEventListener('click', () => { closeFn(); resolve(false); });
        root.querySelector('[data-confirm]').addEventListener('click', () => { closeFn(); resolve(true); });
      }
    });
    const root = document.getElementById('modal-root');
    if (root) {
      const observer = new MutationObserver(() => {
        if (root.classList.contains('hidden')) {
          observer.disconnect();
          resolve(false);
        }
      });
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    }
    void close;
  });
}

export function formatDate(value, lang = 'en') {
  if (!value) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(lang === 'gu' ? 'gu-IN' : 'en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatDateTime(value, lang = 'en') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(lang === 'gu' ? 'gu-IN' : 'en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatCurrency(amount, lang = 'en') {
  try {
    return new Intl.NumberFormat(lang === 'gu' ? 'gu-IN' : 'en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(Number(amount || 0));
  } catch {
    return `₹${Number(amount || 0)}`;
  }
}

export function todayStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fileNameForGuest(name, index = 0) {
  const base = String(name || 'Guest')
    .normalize('NFKD')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return base ? `${base}.png` : `Guest_${index + 1}.png`;
}

export function safeName(name) {
  return String(name || 'Guest').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim() || 'Guest';
}

export function randomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to load image'));
    img.src = src;
  });
}

export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

export function canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')), type, quality);
    } else {
      try {
        const dataUrl = canvas.toDataURL(type, quality);
        resolve(dataUrlToBlob(dataUrl));
      } catch (err) {
        reject(err);
      }
    }
  });
}

export function dataURLToBlob(dataUrl) {
  const [head, data] = String(dataUrl).split(',');
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/png';
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const dataUrlToBlob = dataURLToBlob;

export function downloadBlob(blob, filename) {
  if (typeof window.saveAs === 'function') {
    window.saveAs(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function bytesLabel(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function setHtml(el, html) {
  if (el) el.innerHTML = html;
  return el;
}

export function loadingBlock(label = 'Loading…') {
  return `<div class="loading-block"><span class="spinner"></span><span>${escapeHtml(label)}</span></div>`;
}

export function emptyState({ title, copy, action = '', mark = 'કં' }) {
  return `<div class="empty">
    <div class="e-mark">${escapeHtml(mark)}</div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(copy)}</p>
    ${action}
  </div>`;
}

export function badge(text, variant = '') {
  return `<span class="badge ${variant ? `badge-${variant}` : ''}">${escapeHtml(text)}</span>`;
}

export function avatarHtml(profile, cls = '') {
  const name = profile?.full_name || profile?.email || 'Guest';
  if (profile?.avatar_url) {
    return `<span class="avatar ${cls}"><img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(name)}"></span>`;
  }
  return `<span class="avatar ${cls}">${escapeHtml(initials(name))}</span>`;
}

export function statusBadge(status) {
  const map = {
    completed: ['Completed', 'success'],
    processing: ['Processing', 'info'],
    failed: ['Failed', 'danger'],
    cancelled: ['Cancelled', 'danger'],
    active: ['Active', 'success'],
    expired: ['Expired', 'danger'],
    suspended: ['Suspended', 'danger'],
    free: ['Free', ''],
    pending: ['Pending', 'gold'],
    success: ['Paid', 'success'],
    refunded: ['Refunded', 'info'],
    failed_payment: ['Failed', 'danger']
  };
  const [label, variant] = map[status] || [status || '—', ''];
  return badge(label, variant);
}

export function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function triggerDownloadText(text, filename, type = 'text/csv;charset=utf-8') {
  downloadBlob(new Blob([text], { type }), filename);
}

export function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function parseNumeric(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function sortByDateDesc(items, field = 'created_at') {
  return [...items].sort((a, b) => new Date(b[field] || 0) - new Date(a[field] || 0));
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isMobile(value) {
  return /^[+]?[\d\s-]{7,18}$/.test(String(value || '').trim());
}

export function canonicalMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits : `91${digits.slice(-10)}`;
}

export function whatsappLink(mobile, text) {
  const number = canonicalMobile(mobile);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email, subject, body) {
  return `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
}

export async function withTimeout(promise, ms = 20000, message = 'Request timed out') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
