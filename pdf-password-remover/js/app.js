// Dashboard: pick a PDF, upload it, remove the password, download the result.
let selectedFile = null;
let uploadedPath = null;
let busy = false;

const dz = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const passwordInput = document.getElementById('pdf-password');
const pwToggle = document.getElementById('pdf-pw-toggle');
const unlockBtn = document.getElementById('unlock-btn');
const msg = document.getElementById('unlock-msg');
const result = document.getElementById('result');
const historyBody = document.getElementById('history-body');
const statsRow = document.getElementById('stats-row');

// ---------- file selection ----------
function isPdf(file) {
  return !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
}

function setFile(file) {
  hideMessage(msg);
  result.hidden = true;

  if (!file) {
    selectedFile = null;
    uploadedPath = null;
    dz.classList.remove('has-file');
    document.getElementById('dz-icon').textContent = '\u{1F4C4}';
    document.getElementById('dz-title').textContent = 'Drop your PDF here';
    document.getElementById('dz-sub').textContent = 'or click to choose a file';
    unlockBtn.disabled = true;
    return;
  }

  if (!isPdf(file)) {
    showMessage(msg, 'err', `"${file.name}" is not a PDF.`);
    return;
  }
  if (file.size === 0) {
    showMessage(msg, 'err', 'That file is empty.');
    return;
  }
  if (file.size > CONFIG.MAX_FILE_BYTES) {
    showMessage(msg, 'err', `That file is ${formatBytes(file.size)}. The limit is 25 MB.`);
    return;
  }

  selectedFile = file;
  uploadedPath = null;
  dz.classList.add('has-file');
  document.getElementById('dz-icon').textContent = '\u{1F5CE}';
  document.getElementById('dz-title').textContent = file.name;
  document.getElementById('dz-sub').textContent = formatBytes(file.size);
  unlockBtn.disabled = false;
}

dz.addEventListener('click', () => fileInput.click());
dz.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

['dragenter', 'dragover'].forEach((ev) =>
  dz.addEventListener(ev, (e) => {
    e.preventDefault();
    dz.classList.add('dragging');
  }),
);
['dragleave', 'drop'].forEach((ev) =>
  dz.addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragleave' && dz.contains(e.relatedTarget)) return;
    dz.classList.remove('dragging');
  }),
);
dz.addEventListener('drop', (e) => setFile(e.dataTransfer?.files?.[0] ?? null));

// Whole-window drop guard: dropping outside the zone should not navigate away.
['dragover', 'drop'].forEach((ev) =>
  window.addEventListener(ev, (e) => {
    if (!dz.contains(e.target)) e.preventDefault();
  }),
);

pwToggle.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  pwToggle.textContent = showing ? 'Show' : 'Hide';
});

document.getElementById('start-over').addEventListener('click', () => {
  fileInput.value = '';
  passwordInput.value = '';
  setFile(null);
});

// ---------- unlock ----------
function setBusy(next, label) {
  busy = next;
  unlockBtn.disabled = next || !selectedFile;
  unlockBtn.innerHTML = next ? `<span class="spinner"></span> ${label}` : 'Remove password';
}

async function uploadToStorage(file, userId) {
  // Keys always live under "<uid>/" so the storage RLS policies scope writes.
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80) || 'document.pdf';
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await sb.storage
    .from(CONFIG.BUCKET)
    .upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;
  return path;
}

unlockBtn.addEventListener('click', async () => {
  if (busy || !selectedFile) return;

  hideMessage(msg);
  result.hidden = true;
  setBusy(true, 'Uploading\u2026');

  try {
    const user = await currentUser();
    if (!user) {
      window.location.replace('index.html');
      return;
    }

    if (!uploadedPath) {
      try {
        uploadedPath = await uploadToStorage(selectedFile, user.id);
      } catch (err) {
        showMessage(msg, 'err', `Upload failed: ${err.message || 'storage rejected the file'}`);
        return;
      }
    }

    setBusy(true, 'Removing password\u2026');
    const data = await callFunction(CONFIG.UNLOCK_FUNCTION, {
      path: uploadedPath,
      password: passwordInput.value,
      filename: selectedFile.name,
    });

    result.hidden = false;
    document.getElementById('result-title').textContent = data.wasEncrypted
      ? 'Password removed'
      : 'No password found';
    document.getElementById('result-meta').textContent =
      `${data.filename} \u00b7 ${formatBytes(data.sizeBytes)}`;

    const link = document.getElementById('download-link');
    link.href = data.downloadUrl;
    link.setAttribute('download', data.filename);

    showMessage(msg, data.wasEncrypted ? 'ok' : 'warn', data.message);
  } catch (err) {
    result.hidden = true;
    showMessage(msg, 'err', unlockErrorMessage(err));
  } finally {
    setBusy(false);
    passwordInput.value = '';
  }
});

function unlockErrorMessage(err) {
  switch (err.code) {
    case 'wrong_password':
      return 'That password is not correct. Check it and try again.';
    case 'password_required':
      return 'This PDF is password protected. Enter the password first.';
    case 'unsupported':
      return 'This PDF uses certificate-based encryption, which cannot be unlocked with a password.';
    case 'corrupt_pdf':
      return 'This file could not be read as a valid PDF.';
    case 'not_a_pdf':
      return 'That file is not a PDF.';
    case 'too_large':
      return 'That PDF is larger than the 25 MB limit.';
    case 'not_found':
      return 'The upload expired. Please choose the file again.';
    case 'blocked':
      return 'Your account has been blocked. Contact support.';
    case 'unauthenticated':
      return 'Your session expired. Please sign in again.';
    default:
      return err.message || 'Something went wrong. Please try again.';
  }
}

// ---------- history ----------
async function loadHistory() {
  const { data, error } = await sb
    .from('pr_pdf_logs')
    .select('filename, status, password_removed, created_at')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    historyBody.innerHTML = '<tr><td colspan="3" class="small muted">Could not load your history.</td></tr>';
    return;
  }

  const rows = data || [];
  const success = rows.filter((r) => r.status === 'success').length;
  const removed = rows.filter((r) => r.password_removed).length;

  statsRow.innerHTML = `
    <div class="card stat"><div class="label">Recent runs</div><div class="value">${rows.length}</div></div>
    <div class="card stat"><div class="label">Succeeded</div><div class="value">${success}</div></div>
    <div class="card stat"><div class="label">Passwords removed</div><div class="value">${removed}</div></div>
    <div class="card stat"><div class="label">Last run</div><div class="value" style="font-size:1.05rem;padding-top:.45rem">${escapeHtml(timeAgo(rows[0]?.created_at))}</div></div>`;

  if (!rows.length) {
    historyBody.innerHTML = '<tr><td colspan="3" class="small muted">No uploads yet.</td></tr>';
    return;
  }

  historyBody.innerHTML = rows
    .map((r) => {
      const badge = r.status === 'success'
        ? `<span class="badge success">${r.password_removed ? 'unlocked' : 'no password'}</span>`
        : '<span class="badge failure">failed</span>';
      return `<tr>
        <td class="wrap-any">${escapeHtml(r.filename)}</td>
        <td>${badge}</td>
        <td title="${escapeHtml(formatDate(r.created_at))}">${escapeHtml(timeAgo(r.created_at))}</td>
      </tr>`;
    })
    .join('');
}

// ---------- boot ----------
(async function init() {
  const profile = await guardPage();
  if (!profile) return;

  renderTopbar(profile, 'dashboard');
  await loadHistory();
})();
