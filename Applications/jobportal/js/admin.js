const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let editingPlanId = null;

function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function escHtml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(paise) {
  if (!paise) return 'Free';
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function statusBadge(status) { return `<span class="status-badge st-${status}">${status.toUpperCase()}</span>`; }

async function checkAdmin() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  currentUser = user;
  const { data: profile } = await sb.from('jp_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    document.getElementById('auth-error').textContent = 'Access denied. This account is not an admin.';
    document.getElementById('auth-error').style.display = 'block';
    return;
  }
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('topbar').classList.remove('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email || '';
  loadAdminDashboard();
}

async function handleAdminLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  await checkAdmin();
}

async function handleGoogleLogin() {
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  const callback = window.location.origin + window.location.pathname.replace(/\/Applications\/jobportal\/admin\.html.*$/, '/blog/index.html') + '?app=jobportal-admin';
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback }
  });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; }
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

function switchAdminTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
  const loaders = {
    companies: loadCompanies,
    seekers: loadSeekers,
    jobs: loadAdminJobs,
    reviews: loadReviews,
    cvs: loadCvs,
    plans: loadAdminPlans
  };
  if (loaders[tab]) loaders[tab]();
}

async function loadAdminDashboard() {
  await Promise.all([
    loadStats(), loadCompanies(), loadSeekers(), loadAdminJobs(), loadReviews(), loadCvs(), loadAdminPlans()
  ]);
}

async function loadStats() {
  const [c, s, j, a, r] = await Promise.all([
    sb.from('jp_companies').select('*'),
    sb.from('jp_profiles').select('role'),
    sb.from('jp_jobs').select('id'),
    sb.from('jp_applications').select('id'),
    sb.from('jp_reviews').select('id')
  ]);
  const companies = c.data || [];
  const seekers = (s.data || []).filter(p => p.role === 'seeker');
  const pending = companies.filter(x => x.status === 'pending').length;
  const stats = [
    ['Companies', companies.length, '🏢'],
    ['Pending Approval', pending, '⏳'],
    ['Job Seekers', seekers.length, '🧑‍💻'],
    ['Jobs', (j.data || []).length, '💼'],
    ['Applications', (a.data || []).length, '📄'],
    ['Reviews', (r.data || []).length, '⭐']
  ];
  document.getElementById('admin-stats').innerHTML = stats.map(([label, val, icon]) =>
    `<div class="stat-card"><div class="stat-label">${icon} ${label}</div><div class="stat-value">${val}</div></div>`).join('');
}

// ======= Companies =======
async function loadCompanies() {
  const [cRes, jRes] = await Promise.all([
    sb.from('jp_companies').select('*').order('created_at', { ascending: false }),
    sb.from('jp_jobs').select('company_id, id')
  ]);
  const data = cRes.data || [];
  const counts = {};
  (jRes.data || []).forEach(j => { counts[j.company_id] = (counts[j.company_id] || 0) + 1; });
  const el = document.getElementById('companies-table');
  document.getElementById('company-count').textContent = data.length + ' total';
  if (!data.length) { el.innerHTML = '<div class="empty">No companies registered yet.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Company</th><th>Industry</th><th>Plan</th><th>Status</th><th>Jobs</th><th>Actions</th></tr></thead><tbody>
  ${data.map(c => `<tr>
    <td><strong>${escHtml(c.name)}</strong><br><span style="font-size:12px;color:var(--gray-500);">${escHtml(c.location || '')}${c.website ? ' · <a href="' + escHtml(c.website) + '" target="_blank" rel="noopener">website</a>' : ''}</span></td>
    <td>${escHtml(c.industry || '-')}</td>
    <td>${escHtml(c.plan || 'free').toUpperCase()}</td>
    <td>${statusBadge(c.status)}</td>
    <td>${counts[c.id] || 0}</td>
    <td style="white-space:nowrap;">
      ${c.status !== 'approved' ? `<button class="btn btn-sm btn-success" onclick="setCompanyStatus(${c.id},'approved')">✓ Approve</button>` : ''}
      ${c.status !== 'rejected' ? `<button class="btn btn-sm btn-danger" onclick="setCompanyStatus(${c.id},'rejected')">✕ Reject</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="setCompanyStatus(${c.id},'pending')">Reset</button>
    </td>
  </tr>`).join('')}</tbody></table>`;
}

async function setCompanyStatus(companyId, status) {
  const { error } = await sb.from('jp_companies').update({ status }).eq('id', companyId);
  if (error) return showToast(error.message, 'error');
  showToast('Company marked as ' + status);
  loadStats();
  loadCompanies();
}

// ======= Seekers =======
async function loadSeekers() {
  const { data } = await sb.from('jp_profiles').select('*').eq('role', 'seeker').order('created_at', { ascending: false });
  const el = document.getElementById('seekers-table');
  document.getElementById('seeker-count').textContent = (data || []).length + ' total';
  if (!data || !data.length) { el.innerHTML = '<div class="empty">No job seekers yet.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Seeker</th><th>Location</th><th>Experience</th><th>Expected CTC</th><th>Skills</th><th>Resume</th></tr></thead><tbody>
  ${data.map(p => `<tr>
    <td><strong>${escHtml(p.full_name || p.email || 'Seeker')}</strong><br><span style="font-size:12px;color:var(--gray-500);">${escHtml(p.email || '')}</span></td>
    <td>${escHtml(p.location || '-')}</td>
    <td>${p.experience_years || 0} yrs</td>
    <td>${escHtml(p.expected_ctc || '-')}</td>
    <td>${(p.skills || []).slice(0, 3).map(s => `<span class="chip skill">${escHtml(s)}</span>`).join(' ')}</td>
    <td>${p.resume_url ? `<a href="${escHtml(p.resume_url)}" target="_blank" rel="noopener">View</a>` : '-'}</td>
  </tr>`).join('')}</tbody></table>`;
}

// ======= Jobs =======
async function loadAdminJobs() {
  const { data } = await sb.from('jp_jobs').select('*, jp_companies(id,name)').order('created_at', { ascending: false });
  const el = document.getElementById('jobs-table');
  if (!data || !data.length) { el.innerHTML = '<div class="empty">No jobs posted.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Job</th><th>Company</th><th>Location</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${data.map(j => `<tr>
    <td><strong>${escHtml(j.title)}</strong>${j.is_highlighted ? ' <span class="chip highlight">★</span>' : ''}</td>
    <td>${escHtml(j.jp_companies?.name || '-')}</td>
    <td>${escHtml(j.location || '-')}</td>
    <td>${escHtml(j.type || '-')}</td>
    <td>${statusBadge(j.status)}</td>
    <td style="white-space:nowrap;">
      <button class="btn btn-sm btn-secondary" onclick="adminToggleJob(${j.id})">${j.status === 'active' ? 'Pause' : 'Activate'}</button>
      <button class="btn btn-sm btn-danger" onclick="adminDeleteJob(${j.id})">Delete</button>
    </td>
  </tr>`).join('')}</tbody></table>`;
}

async function adminToggleJob(jobId) {
  const { data: job } = await sb.from('jp_jobs').select('status').eq('id', jobId).single();
  const next = job?.status === 'active' ? 'paused' : 'active';
  const { error } = await sb.from('jp_jobs').update({ status: next }).eq('id', jobId);
  if (error) return showToast(error.message, 'error');
  showToast('Job ' + next);
  loadAdminJobs();
}

async function adminDeleteJob(jobId) {
  if (!confirm('Delete this job permanently?')) return;
  const { error } = await sb.from('jp_jobs').delete().eq('id', jobId);
  if (error) return showToast(error.message, 'error');
  showToast('Job deleted');
  loadStats();
  loadAdminJobs();
}

// ======= Reviews =======
async function loadReviews() {
  const { data } = await sb.from('jp_reviews').select('*, jp_companies(id,name), jp_profiles(full_name,email)').order('created_at', { ascending: false });
  const el = document.getElementById('reviews-table');
  if (!data || !data.length) { el.innerHTML = '<div class="empty">No reviews yet.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Company</th><th>Seeker</th><th>Rating</th><th>Title</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${data.map(r => `<tr>
    <td>${escHtml(r.jp_companies?.name || '-')}</td>
    <td>${escHtml(r.jp_profiles?.full_name || r.jp_profiles?.email || 'Seeker')}</td>
    <td>${'★'.repeat(r.rating)}</td>
    <td>${escHtml(r.title || '')}</td>
    <td>${statusBadge(r.status)}</td>
    <td style="white-space:nowrap;">
      <button class="btn btn-sm btn-secondary" onclick="toggleReviewStatus(${r.id})">${r.status === 'published' ? 'Hide' : 'Publish'}</button>
      <button class="btn btn-sm btn-danger" onclick="deleteReview(${r.id})">Delete</button>
    </td>
  </tr>`).join('')}</tbody></table>`;
}

async function toggleReviewStatus(reviewId) {
  const { data: r } = await sb.from('jp_reviews').select('status').eq('id', reviewId).single();
  const next = r?.status === 'published' ? 'hidden' : 'published';
  const { error } = await sb.from('jp_reviews').update({ status: next }).eq('id', reviewId);
  if (error) return showToast(error.message, 'error');
  showToast('Review ' + next);
  loadReviews();
}

async function deleteReview(reviewId) {
  if (!confirm('Delete this review?')) return;
  const { error } = await sb.from('jp_reviews').delete().eq('id', reviewId);
  if (error) return showToast(error.message, 'error');
  showToast('Review deleted');
  loadStats();
  loadReviews();
}

// ======= CVs =======
async function loadCvs() {
  const { data } = await sb.from('jp_cvs').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('cvs-table');
  if (!data || !data.length) { el.innerHTML = '<div class="empty">No CVs yet. Seed some sample CVs to get started.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Name</th><th>Email</th><th>Experience</th><th>Skills</th><th>Resume</th><th>Actions</th></tr></thead><tbody>
  ${data.map(c => `<tr>
    <td><strong>${escHtml(c.full_name)}</strong></td>
    <td>${escHtml(c.email)}${c.phone ? '<br><span style="font-size:12px;color:var(--gray-500);">' + escHtml(c.phone) + '</span>' : ''}</td>
    <td>${c.experience_years || 0} yrs</td>
    <td>${(c.skills || []).slice(0, 3).map(s => `<span class="chip skill">${escHtml(s)}</span>`).join(' ')}</td>
    <td>${c.file_url ? `<a href="${escHtml(c.file_url)}" target="_blank" rel="noopener">View</a>` : '-'}</td>
    <td><button class="btn btn-sm btn-danger" onclick="deleteCv(${c.id})">Delete</button></td>
  </tr>`).join('')}</tbody></table>`;
}

function openCvModal() {
  document.getElementById('cv-name').value = '';
  document.getElementById('cv-email').value = '';
  document.getElementById('cv-phone').value = '';
  document.getElementById('cv-exp').value = 0;
  document.getElementById('cv-skills').value = '';
  document.getElementById('cv-url').value = '';
  document.getElementById('cv-summary').value = '';
  document.getElementById('cv-modal').classList.remove('hidden');
}

async function saveCv() {
  const payload = {
    full_name: document.getElementById('cv-name').value.trim(),
    email: document.getElementById('cv-email').value.trim(),
    phone: document.getElementById('cv-phone').value.trim(),
    experience_years: Number(document.getElementById('cv-exp').value) || 0,
    skills: document.getElementById('cv-skills').value.split(',').map(s => s.trim()).filter(Boolean),
    file_url: document.getElementById('cv-url').value.trim(),
    summary: document.getElementById('cv-summary').value.trim()
  };
  if (!payload.full_name || !payload.email) return showToast('Name and email are required', 'error');
  const { error } = await sb.from('jp_cvs').insert(payload);
  if (error) return showToast(error.message, 'error');
  closeModal('cv-modal');
  showToast('CV seeded!');
  loadStats();
  loadCvs();
}

async function deleteCv(cvId) {
  if (!confirm('Delete this CV?')) return;
  const { error } = await sb.from('jp_cvs').delete().eq('id', cvId);
  if (error) return showToast(error.message, 'error');
  showToast('CV deleted');
  loadCvs();
}

// ======= Plans =======
async function loadAdminPlans() {
  const { data } = await sb.from('jp_plans').select('*').order('target').order('id');
  const el = document.getElementById('plans-table');
  if (!data || !data.length) { el.innerHTML = '<div class="empty">No plans defined.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Plan</th><th>Target</th><th>Price</th><th>Duration</th><th>Job Limit</th><th>Highlight</th><th>Active</th><th>Actions</th></tr></thead><tbody>
  ${data.map(p => `<tr>
    <td><strong>${escHtml(p.name)}</strong></td>
    <td>${escHtml(p.target)}</td>
    <td>${inr(p.price)}</td>
    <td>${p.duration_days ? p.duration_days + ' days' : 'Lifetime'}</td>
    <td>${p.job_limit}</td>
    <td>${p.highlight_jobs}</td>
    <td>${p.is_active ? '<span class="badge-pill st-approved">ON</span>' : '<span class="badge-pill st-rejected">OFF</span>'}</td>
    <td style="white-space:nowrap;">
      <button class="btn btn-sm btn-secondary" onclick="openPlanModal(${p.id})">✏️</button>
      <button class="btn btn-sm btn-secondary" onclick="togglePlan(${p.id})">${p.is_active ? 'Disable' : 'Enable'}</button>
      <button class="btn btn-sm btn-danger" onclick="deletePlan(${p.id})">🗑</button>
    </td>
  </tr>`).join('')}</tbody></table>`;
}

async function openPlanModal(planId) {
  editingPlanId = planId;
  document.getElementById('plan-modal-title').textContent = planId ? 'Edit Plan' : 'New Plan';
  const f = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  if (planId) {
    const { data: p } = await sb.from('jp_plans').select('*').eq('id', planId).single();
    if (p) {
      f('plan-id', planId); f('plan-name', p.name); f('plan-target', p.target);
      f('plan-price', p.price); f('plan-duration', p.duration_days);
      f('plan-jobs', p.job_limit); f('plan-highlight', p.highlight_jobs);
      f('plan-resume-views', p.resume_views); f('plan-features', (p.features || []).join(', '));
      document.getElementById('plan-premium').checked = !!p.premium_visibility;
      document.getElementById('plan-support').checked = !!p.priority_support;
    }
  } else {
    f('plan-id', ''); f('plan-name', ''); f('plan-target', 'company'); f('plan-price', 0);
    f('plan-duration', 0); f('plan-jobs', 2); f('plan-highlight', 0); f('plan-resume-views', 0); f('plan-features', '');
    document.getElementById('plan-premium').checked = false;
    document.getElementById('plan-support').checked = false;
  }
  document.getElementById('plan-modal').classList.remove('hidden');
}

async function savePlan() {
  const payload = {
    name: document.getElementById('plan-name').value.trim(),
    target: document.getElementById('plan-target').value,
    price: Number(document.getElementById('plan-price').value) || 0,
    duration_days: Number(document.getElementById('plan-duration').value) || 0,
    job_limit: Number(document.getElementById('plan-jobs').value) || 0,
    highlight_jobs: Number(document.getElementById('plan-highlight').value) || 0,
    resume_views: Number(document.getElementById('plan-resume-views').value) || 0,
    premium_visibility: document.getElementById('plan-premium').checked,
    priority_support: document.getElementById('plan-support').checked,
    features: document.getElementById('plan-features').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  if (!payload.name) return showToast('Plan name is required', 'error');
  if (editingPlanId) {
    const { error } = await sb.from('jp_plans').update(payload).eq('id', editingPlanId);
    if (error) return showToast(error.message, 'error');
    showToast('Plan updated!');
  } else {
    const { error } = await sb.from('jp_plans').insert(payload);
    if (error) return showToast(error.message, 'error');
    showToast('Plan created!');
  }
  closeModal('plan-modal');
  loadAdminPlans();
}

async function togglePlan(planId) {
  const { data: p } = await sb.from('jp_plans').select('is_active').eq('id', planId).single();
  const { error } = await sb.from('jp_plans').update({ is_active: !p?.is_active }).eq('id', planId);
  if (error) return showToast(error.message, 'error');
  showToast('Plan ' + (p?.is_active ? 'disabled' : 'enabled'));
  loadAdminPlans();
}

async function deletePlan(planId) {
  if (!confirm('Delete this plan?')) return;
  const { error } = await sb.from('jp_plans').delete().eq('id', planId);
  if (error) return showToast(error.message, 'error');
  showToast('Plan deleted');
  loadAdminPlans();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.addEventListener('DOMContentLoaded', checkAdmin);
