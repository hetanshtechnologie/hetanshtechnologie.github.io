const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const EDGE_FUNCTION_URL = SUPABASE_URL + '/functions/v1';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let myProfile = null;
let myCompany = null;
let role = 'seeker';
let loginRole = 'seeker';
let loginRoleTouched = false;
let plans = [];
let userPlan = null;
let companiesMap = {};
let selectedJobId = null;

// ======= Utilities =======
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

function todayStr() { return new Date().toISOString().split('T')[0]; }

function initials(name) {
  name = name || '?';
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatSalary(min, max) {
  if (!min && !max) return 'Not disclosed';
  if (min && max) return '₹' + Number(min).toFixed(0) + ' - ₹' + Number(max).toFixed(0) + ' LPA';
  if (min) return '₹' + Number(min).toFixed(0) + ' LPA+';
  return 'Upto ₹' + Number(max).toFixed(0) + ' LPA';
}

function debounce(fn, ms) {
  let t;
  return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms || 350); };
}
const debouncedSearch = debounce(loadJobs, 400);

function inr(paise) {
  if (!paise) return 'Free';
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

// ======= Auth =======
async function checkAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  currentUser = user;
  const storedRole = sessionStorage.getItem('jp_login_role') || null;
  sessionStorage.removeItem('jp_login_role');
  myProfile = await loadProfileRow(user.id);
  if (!myProfile) {
    const newRole = storedRole || 'seeker';
    myProfile = { user_id: user.id, role: newRole, email: user.email || '', full_name: user.email?.split('@')[0] || 'User' };
    try {
      await sb.from('jp_profiles').insert({ user_id: user.id, role: newRole, email: myProfile.email, full_name: myProfile.full_name });
    } catch (_) {}
    if (newRole === 'company') {
      const companyName = user.email?.split('@')[0] || 'My Company';
      await sb.from('jp_companies').insert({ user_id: user.id, name: companyName, status: 'pending', plan: 'free' }).catch(() => {});
    }
  } else if (!myProfile.email && user.email) {
    await sb.from('jp_profiles').update({ email: user.email }).eq('user_id', user.id).catch(() => {});
    myProfile.email = user.email;
  }
  if (storedRole && (storedRole === 'company' || storedRole === 'seeker') && myProfile.role !== storedRole) {
    await sb.from('jp_profiles').update({ role: storedRole }).eq('user_id', user.id).catch(() => {});
    myProfile.role = storedRole;
  }
  role = myProfile.role || 'seeker';
  if (role === 'company') {
    myCompany = await loadCompanyRow(user.id);
    if (!myCompany) {
      const companyName = myProfile.full_name || user.email?.split('@')[0] || 'My Company';
      await sb.from('jp_companies').insert({ user_id: user.id, name: companyName, status: 'pending', plan: 'free' }).catch(() => {});
      myCompany = await loadCompanyRow(user.id);
    }
  }
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('topbar').classList.remove('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email || '';
  document.getElementById('user-avatar').textContent = initials(myProfile.full_name || user.email);
  renderSidebar();
  showView(role === 'company' ? 'company-dash' : 'dashboard');
}

async function loadProfileRow(userId) {
  const { data } = await sb.from('jp_profiles').select('*').eq('user_id', userId).maybeSingle();
  return data || null;
}

async function loadCompanyRow(userId) {
  const { data } = await sb.from('jp_companies').select('*').eq('user_id', userId).maybeSingle();
  return data || null;
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Enter email and password'; errEl.style.display = 'block'; return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  const { data: prof } = await sb.from('jp_profiles').select('role').eq('user_id', data.user.id).maybeSingle();
  const acctRole = prof?.role || 'seeker';
  if (acctRole !== loginRole) {
    await sb.auth.signOut();
    const labels = { company: 'Company', seeker: 'Job Seeker', admin: 'Admin' };
    const label = labels[acctRole] || 'Job Seeker';
    errEl.textContent = 'This account is registered as a ' + label + '. Please select "' + label + '" above and sign in again.';
    errEl.style.display = 'block';
    return;
  }
  await checkAuth();
}

function selectLoginRole(r) {
  loginRole = r;
  loginRoleTouched = true;
  document.getElementById('login-role-seeker').classList.toggle('selected', r === 'seeker');
  document.getElementById('login-role-company').classList.toggle('selected', r === 'company');
}

function selectRole(r) {
  role = r;
  document.getElementById('role-seeker').classList.toggle('selected', r === 'seeker');
  document.getElementById('role-company').classList.toggle('selected', r === 'company');
  document.getElementById('signup-name').placeholder = r === 'company' ? 'Company name' : 'Full name';
}

function switchAuthMode(mode) {
  const login = mode === 'login';
  document.getElementById('auth-login').classList.toggle('hidden', !login);
  document.getElementById('auth-signup').classList.toggle('hidden', login);
  document.getElementById('auth-tab-login').classList.toggle('active', login);
  document.getElementById('auth-tab-signup').classList.toggle('active', !login);
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
}

async function handleSignup() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const name = document.getElementById('signup-name').value.trim();
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  if (!email || !password || !name) { errEl.textContent = 'Please fill in all fields'; errEl.style.display = 'block'; return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.style.display = 'block'; return; }
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  if (data.user) {
    const profile = { user_id: data.user.id, role: role, email: email, full_name: name };
    try {
      await sb.from('jp_profiles').insert(profile);
      if (role === 'company') {
        await sb.from('jp_companies').insert({ user_id: data.user.id, name: name, status: 'pending', plan: 'free' });
      }
    } catch (_) {}
    if (data.session) {
      showToast(role === 'company' ? 'Welcome! Your company profile is under review.' : 'Welcome to JobPortal!');
      await checkAuth();
    } else {
      showToast('Account created! Please verify your email before signing in.');
      switchAuthMode('login');
    }
  }
}

async function handleGoogleLogin() {
  const errEl = document.getElementById('auth-error');
  errEl.style.display = 'none';
  if (loginRoleTouched) sessionStorage.setItem('jp_login_role', loginRole);
  const callback = window.location.origin + window.location.pathname.replace(/\/Applications\/jobportal\/index\.html.*$/, '/blog/index.html') + '?app=jobportal';
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

// ======= Navigation =======
function renderSidebar() {
  const items = role === 'company' ? [
    ['company-dash', '📊', 'Dashboard'],
    ['my-jobs', '💼', 'My Jobs'],
    ['company-apps', '👥', 'Applications'],
    ['company-reviews', '⭐', 'Reviews'],
    ['company-profile', '🏢', 'Company Profile'],
    ['plans', '💳', 'Plans']
  ] : [
    ['dashboard', '📊', 'Dashboard'],
    ['jobs', '🔍', 'Find Jobs'],
    ['applications', '📄', 'My Applications'],
    ['reviews', '⭐', 'Reviews'],
    ['profile', '👤', 'My Profile'],
    ['plans', '💳', 'Plans']
  ];
  let html = `<a class="nav-item home-link" href="../../index.html"><span>🏠</span><span>Home</span></a>`;
  for (const [id, icon, label] of items) {
    html += `<div class="nav-item" data-view="${id}" onclick="showView('${id}')"><span>${icon}</span><span>${label}</span></div>`;
  }
  document.getElementById('sidebar').innerHTML = html;
  const roleBadge = document.getElementById('role-' + role + '-badge');
  if (roleBadge) roleBadge.classList.remove('hidden');
  const adminLink = document.getElementById('admin-link');
  if (role === 'admin') {
    adminLink.style.display = '';
    document.getElementById('role-admin-badge').classList.remove('hidden');
  }
}

function showView(view) {
  const panels = document.querySelectorAll('.panel');
  panels.forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + view);
  if (!panel) return;
  panel.classList.add('active');
  document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  const loaders = {
    dashboard: loadDashboard,
    jobs: loadJobs,
    applications: loadMyApplications,
    reviews: loadMyReviews,
    profile: loadProfile,
    plans: loadPlans,
    'company-dash': loadCompanyDash,
    'my-jobs': loadMyJobs,
    'company-apps': loadCompanyApplications,
    'company-reviews': loadCompanyReviews,
    'company-profile': loadCompanyProfile,
  };
  if (loaders[view]) loaders[view]();
}

// ======= Shared data =======
async function loadCompaniesMap() {
  const { data } = await sb.from('jp_companies').select('id, name, logo_url, location, rating, industry');
  companiesMap = {};
  (data || []).forEach(c => companiesMap[c.id] = c);
  const fComp = document.getElementById('f-company');
  if (fComp) {
    fComp.innerHTML = '<option value="">All Companies</option>' + (data || [])
      .map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  }
  return data || [];
}

function getCompany(id) { return companiesMap[id] || { name: 'Unknown', logo_url: '', location: '' }; }

async function getAppliedJobIds() {
  if (role !== 'seeker') return new Set();
  const { data } = await sb.from('jp_applications').select('job_id');
  return new Set((data || []).map(a => a.job_id));
}

// ======= Jobs (public + seeker) =======
async function loadJobs() {
  const q = document.getElementById('f-search')?.value.trim().toLowerCase() || '';
  const loc = document.getElementById('f-location')?.value.trim().toLowerCase() || '';
  const sal = Number(document.getElementById('f-salary')?.value) || 0;
  const exp = Number(document.getElementById('f-exp')?.value) || 0;
  const type = document.getElementById('f-type')?.value || '';
  const compId = document.getElementById('f-company')?.value || '';

  const { data } = await sb.from('jp_jobs').select('*, jp_companies(id,name,logo_url,location)')
    .eq('status', 'active').order('is_highlighted', { ascending: false }).order('created_at', { ascending: false });
  if (!data) return;
  let jobs = data;
  if (q) jobs = jobs.filter(j => (j.title + ' ' + (j.skills || []).join(' ') + ' ' + (j.jp_companies?.name || '')).toLowerCase().includes(q));
  if (loc) jobs = jobs.filter(j => (j.location || '').toLowerCase().includes(loc) || (j.jp_companies?.location || '').toLowerCase().includes(loc));
  if (sal) jobs = jobs.filter(j => (j.salary_max || j.salary_min || 0) >= sal);
  if (exp) jobs = jobs.filter(j => (j.experience_min || 0) <= exp);
  if (type) jobs = jobs.filter(j => j.type === type);
  if (compId) jobs = jobs.filter(j => String(j.company_id) === compId);

  const applied = await getAppliedJobIds();
  allJobsCache = jobs;
  const grid = document.getElementById('jobs-grid');
  const empty = document.getElementById('jobs-empty');
  if (!jobs.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = jobs.map(j => jobCardHtml(j, applied.has(j.id))).join('');
}

function jobCardHtml(j, applied) {
  const c = j.jp_companies || getCompany(j.company_id);
  const companyName = c?.name || 'Company';
  const logo = c?.logo_url
    ? `<img src="${escHtml(c.logo_url)}" alt="" style="width:48px;height:48px;border-radius:10px;object-fit:cover;">`
    : `<div class="job-logo">${escHtml(initials(companyName))}</div>`;
  const skills = (j.skills || []).slice(0, 4).map(s => `<span class="chip skill">${escHtml(s)}</span>`).join('');
  return `
  <div class="card job-card">
    ${j.is_highlighted ? '<span class="job-flag">★ PREMIUM</span>' : ''}
    <div class="job-top">
      ${logo}
      <div style="flex:1;min-width:0;">
        <h3 style="cursor:pointer;" onclick="showJobDetail(${j.id})">${escHtml(j.title)}</h3>
        <div class="company">${escHtml(companyName)}</div>
      </div>
    </div>
    <div class="meta">
      <span class="chip">📍 ${escHtml(j.location || 'Remote')}</span>
      <span class="chip">🕒 ${escHtml(j.type || 'Full-time')}</span>
      <span class="chip">🎓 ${j.experience_min || 0}-${j.experience_max || '∞'} yrs</span>
      ${j.is_highlighted ? '<span class="chip highlight">⭐ Highlighted</span>' : ''}
    </div>
    <div class="salary">💰 ${formatSalary(j.salary_min, j.salary_max)}</div>
    <p class="desc">${escHtml((j.description || '').split('\n')[0])}</p>
    ${skills ? `<div class="meta">${skills}</div>` : ''}
    <div class="foot">
      <span style="font-size:12px;color:var(--gray-400);">Posted ${formatDate(j.created_at)}</span>
      ${applied
        ? '<span class="badge-pill st-shortlisted" style="background:var(--primary-light);color:var(--primary-dark);">✓ Applied</span>'
        : (role === 'seeker' ? `<button class="btn btn-primary btn-sm" onclick="openApplyModal(${j.id})">Apply Now</button>` : '')}
    </div>
  </div>`;
}

function showJobDetail(jobId) {
  const job = allJobsCache.find(j => j.id === jobId);
  if (!job) return;
  const c = job.jp_companies || getCompany(job.company_id);
  showModal(`
    <h3>${escHtml(job.title)}</h3>
    <p style="color:var(--primary);font-weight:500;">${escHtml(c?.name || 'Company')}</p>
    <div class="meta" style="margin:10px 0;">
      <span class="chip">📍 ${escHtml(job.location || 'Remote')}</span>
      <span class="chip">🕒 ${escHtml(job.type || 'Full-time')}</span>
      <span class="chip">🎓 ${job.experience_min || 0}-${job.experience_max || '∞'} yrs</span>
    </div>
    <div style="font-weight:600;color:var(--success);margin-bottom:10px;">💰 ${formatSalary(job.salary_min, job.salary_max)}</div>
    <h4 style="margin:8px 0 4px;">Description</h4>
    <p style="white-space:pre-line;color:var(--gray-600);font-size:14px;">${escHtml(job.description || 'No description provided.')}</p>
    ${job.skills?.length ? '<h4 style="margin:12px 0 4px;">Skills</h4><div class="skill-tags">' + job.skills.map(s => `<span class="skill-tag">${escHtml(s)}</span>`).join('') + '</div>' : ''}
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal('modal-root')">Close</button>
      ${role === 'seeker' ? `<button class="btn btn-primary" onclick="closeModal('modal-root');openApplyModal(${job.id});">Apply Now</button>` : ''}
    </div>
  `);
}

let allJobsCache = [];

async function fetchJob(jobId) {
  const { data } = await sb.from('jp_jobs').select('*').eq('id', jobId).single();
  return data || {};
}

function showModal(html) {
  const root = document.createElement('div');
  root.id = 'modal-root';
  root.className = 'modal-overlay';
  root.onclick = (e) => { if (e.target === root) root.remove(); };
  root.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(root);
}

function closeModal(id) {
  if (id === 'modal-root') {
    const el = document.getElementById('modal-root');
    if (el) el.remove();
    return;
  }
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// ======= Apply =======
function openApplyModal(jobId) {
  if (role === 'seeker' && !myProfile) return showToast('Please complete your profile first', 'error');
  selectedJobId = jobId;
  const job = allJobsCache.find(j => j.id === jobId);
  document.getElementById('apply-job-title').textContent = job ? job.title : '';
  if (myProfile) {
    document.getElementById('ap-ctc').value = myProfile.current_ctc || '';
    document.getElementById('ap-expctc').value = myProfile.expected_ctc || '';
    document.getElementById('ap-notice').value = myProfile.notice_period || '30 days';
    document.getElementById('ap-resume').value = myProfile.resume_url || '';
  }
  document.getElementById('apply-modal').classList.remove('hidden');
}

async function submitApplication() {
  if (!selectedJobId) return;
  const payload = {
    job_id: selectedJobId,
    seeker_id: currentUser.id,
    current_ctc: document.getElementById('ap-ctc').value.trim(),
    expected_ctc: document.getElementById('ap-expctc').value.trim(),
    notice_period: document.getElementById('ap-notice').value,
    cover_letter: document.getElementById('ap-cover').value.trim(),
    resume_url: document.getElementById('ap-resume').value.trim() || myProfile?.resume_url || ''
  };
  if (!payload.resume_url) return showToast('Please add a resume URL in your profile or the form', 'error');
  const { error } = await sb.from('jp_applications').insert(payload);
  if (error) return showToast('Apply failed: ' + error.message, 'error');
  closeModal('apply-modal');
  document.getElementById('ap-cover').value = '';
  showToast('Application submitted successfully!');
  loadJobs();
}

// ======= Dashboard (seeker) =======
async function loadDashboard() {
  const [appliedData, recentData] = await Promise.all([
    sb.from('jp_applications').select('*'),
    sb.from('jp_jobs').select('*, jp_companies(id,name,logo_url,location)').eq('status', 'active')
      .order('is_highlighted', { ascending: false }).order('created_at', { ascending: false }).limit(6)
  ]);
  const applied = appliedData.data || [];
  const shortlisted = applied.filter(a => a.status === 'shortlisted' || a.status === 'hired');
  const saved = new Set(applied.map(a => a.job_id)).size;
  const reviewsData = await sb.from('jp_reviews').select('id').eq('seeker_id', currentUser.id);
  document.getElementById('st-applied').textContent = applied.length;
  document.getElementById('st-shortlisted').textContent = shortlisted.length;
  document.getElementById('st-reviews').textContent = (reviewsData.data || []).length;
  document.getElementById('st-saved').textContent = saved;
  allJobsCache = recentData.data || [];
  const appliedSet = new Set(applied.map(a => a.job_id));
  const grid = document.getElementById('dash-recent-jobs');
  grid.innerHTML = (recentData.data || []).map(j => jobCardHtml(j, appliedSet.has(j.id))).join('')
    || '<div class="empty" style="grid-column:1/-1;">No jobs available right now.</div>';
}

// ======= My Applications (seeker) =======
async function loadMyApplications() {
  const { data } = await sb.from('jp_applications').select('*, jp_jobs(id,title,location,type,company_id,status)')
    .eq('seeker_id', currentUser.id).order('created_at', { ascending: false });
  if (!data || !data.length) {
    document.getElementById('applications-table').innerHTML = '';
    document.getElementById('applications-empty').classList.remove('hidden');
    return;
  }
  document.getElementById('applications-empty').classList.add('hidden');
  const rows = data.map(a => {
    const j = a.jp_jobs;
    const c = j ? getCompany(j.company_id) : {};
    const statusClass = 'st-' + a.status;
    return `<tr>
      <td><strong>${escHtml(j?.title || 'Job removed')}</strong><br><span style="font-size:12px;color:var(--gray-500);">${escHtml(c.name || '')}</span></td>
      <td>${escHtml(j?.location || '-')}</td>
      <td>${escHtml(j?.type || '-')}</td>
      <td><span class="status-badge ${statusClass}">${a.status.toUpperCase()}</span></td>
      <td style="font-size:12px;color:var(--gray-500);">${formatDate(a.created_at)}</td>
    </tr>`;
  }).join('');
  document.getElementById('applications-table').innerHTML = `<table><thead><tr><th>Job</th><th>Location</th><th>Type</th><th>Status</th><th>Applied On</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ======= Reviews =======
async function loadCompanyFilter() {
  const data = await loadCompaniesMap();
  const f = document.getElementById('rv-company-filter');
  f.innerHTML = '<option value="">All Companies</option>' + (data || [])
    .map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
}

async function loadMyReviews() {
  await loadCompanyFilter();
  const compId = document.getElementById('rv-company-filter').value;
  let query = sb.from('jp_reviews').select('*, jp_companies(id,name)').eq('seeker_id', currentUser.id).order('created_at', { ascending: false });
  if (compId) query = query.eq('company_id', compId);
  const { data } = await query;
  const el = document.getElementById('my-reviews');
  if (!data || !data.length) {
    el.innerHTML = '';
    document.getElementById('reviews-empty').classList.remove('hidden');
    return;
  }
  document.getElementById('reviews-empty').classList.add('hidden');
  el.innerHTML = data.map(r => `
    <div class="card review-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div><strong>${escHtml(r.jp_companies?.name || 'Company')}</strong>
          <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          <span class="rating-num">${r.rating}/5</span>
        </div>
        <span style="font-size:12px;color:var(--gray-400);">${formatDate(r.created_at)}</span>
      </div>
      ${r.title ? `<div style="font-weight:600;margin-top:6px;">${escHtml(r.title)}</div>` : ''}
      ${r.interview_exp ? `<p style="margin-top:6px;color:var(--gray-600);font-size:13px;"><strong>Interview:</strong> ${escHtml(r.interview_exp)}</p>` : ''}
      ${r.culture ? `<p style="color:var(--gray-600);font-size:13px;"><strong>Culture:</strong> ${escHtml(r.culture)}</p>` : ''}
      ${r.environment ? `<p style="color:var(--gray-600);font-size:13px;"><strong>Environment:</strong> ${escHtml(r.environment)}</p>` : ''}
      ${r.status === 'hidden' ? '<div><span class="badge-pill st-paused">Hidden by admin</span></div>' : ''}
    </div>`).join('');
}

async function openReviewModal() {
  const { data: companies } = await sb.from('jp_companies').select('id, name').eq('status', 'approved');
  const sel = document.getElementById('rv-company');
  sel.innerHTML = (companies || []).map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  if (!(companies || []).length) return showToast('No companies available to review yet', 'error');
  document.getElementById('review-modal').classList.remove('hidden');
}

async function submitReview() {
  const payload = {
    company_id: Number(document.getElementById('rv-company').value),
    seeker_id: currentUser.id,
    rating: Number(document.getElementById('rv-rating').value),
    title: document.getElementById('rv-title').value.trim(),
    interview_exp: document.getElementById('rv-interview').value.trim(),
    culture: document.getElementById('rv-culture').value.trim(),
    environment: document.getElementById('rv-environment').value.trim()
  };
  if (!payload.company_id || !payload.rating) return showToast('Select a company and rating', 'error');
  const { error } = await sb.from('jp_reviews').insert(payload);
  if (error) return showToast('Failed to submit review: ' + error.message, 'error');
  closeModal('review-modal');
  document.getElementById('rv-title').value = '';
  document.getElementById('rv-interview').value = '';
  document.getElementById('rv-culture').value = '';
  document.getElementById('rv-environment').value = '';
  showToast('Review published! Thank you for sharing.');
  loadMyReviews();
}

// ======= Profile =======
async function loadProfile() {
  if (!myProfile) return;
  const p = myProfile;
  document.getElementById('profile-avatar').textContent = initials(p.full_name || currentUser.email);
  document.getElementById('profile-name').textContent = p.full_name || currentUser.email;
  document.getElementById('profile-headline').textContent = p.headline || (p.role === 'company' ? 'Company Account' : 'Job Seeker');
  document.getElementById('profile-sub').textContent = p.role === 'company'
    ? 'Manage your company account details' : 'Complete your profile to get noticed by recruiters';
  document.getElementById('p-name').value = p.full_name || '';
  document.getElementById('p-phone').value = p.phone || '';
  document.getElementById('p-headline').value = p.headline || '';
  document.getElementById('p-location').value = p.location || '';
  document.getElementById('p-ctc').value = p.current_ctc || '';
  document.getElementById('p-expctc').value = p.expected_ctc || '';
  document.getElementById('p-experience').value = p.experience_years || 0;
  document.getElementById('p-notice').value = p.notice_period || '';
  document.getElementById('p-skills').value = (p.skills || []).join(', ');
  document.getElementById('p-resume').value = p.resume_url || '';
}

async function uploadResume(file) {
  const ext = (file.name.match(/\.(\w+)$/) || [])[1] || 'pdf';
  const path = 'resumes/' + currentUser.id + '-' + Date.now() + '.' + ext;
  const { error } = await sb.storage.from('resumes').upload(path, file, { contentType: file.type });
  if (error) throw new Error('Upload failed: ' + error.message);
  const { data: { publicUrl } } = sb.storage.from('resumes').getPublicUrl(path);
  return publicUrl;
}

async function saveProfile() {
  const file = document.getElementById('p-resume-file').files[0];
  let resumeUrl = document.getElementById('p-resume').value.trim();
  if (file) {
    try { resumeUrl = await uploadResume(file); }
    catch (e) { return showToast(e.message, 'error'); }
  }
  const payload = {
    full_name: document.getElementById('p-name').value.trim(),
    phone: document.getElementById('p-phone').value.trim(),
    headline: document.getElementById('p-headline').value.trim(),
    location: document.getElementById('p-location').value.trim(),
    current_ctc: document.getElementById('p-ctc').value.trim(),
    expected_ctc: document.getElementById('p-expctc').value.trim(),
    experience_years: Number(document.getElementById('p-experience').value) || 0,
    notice_period: document.getElementById('p-notice').value,
    skills: document.getElementById('p-skills').value.split(',').map(s => s.trim()).filter(Boolean),
    resume_url: resumeUrl,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('jp_profiles').update(payload).eq('user_id', currentUser.id);
  if (error) return showToast('Save failed: ' + error.message, 'error');
  myProfile = { ...myProfile, ...payload };
  document.getElementById('user-avatar').textContent = initials(payload.full_name);
  showToast('Profile saved!');
}

// ======= Plans & Payments =======
async function loadPlans() {
  const target = role === 'company' ? 'company' : 'seeker';
  document.getElementById('plans-title').textContent = role === 'company' ? 'Company Plans' : 'Job Seeker Plans';
  const { data } = await sb.from('jp_plans').select('*').eq('target', target).eq('is_active', true);
  plans = data || [];
  let current = null;
  const { data: subs } = await sb.from('jp_subscriptions').select('*, jp_plans(*)').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  if (subs && subs.length && subs[0].status === 'active' && (!subs[0].ends_at || new Date(subs[0].ends_at) > new Date())) {
    current = subs[0].jp_plans || subs[0];
    userPlan = subs[0];
  } else {
    userPlan = null;
  }
  const planBadge = document.getElementById('plan-badge');
  planBadge.classList.remove('hidden');
  if (role === 'company') {
    planBadge.textContent = 'Plan: ' + (myCompany?.plan || 'free').toUpperCase();
  } else if (current) {
    planBadge.textContent = 'Plan: ' + current.name.toUpperCase();
  } else {
    planBadge.classList.add('hidden');
  }
  const grid = document.getElementById('plans-grid');
  grid.innerHTML = plans.map(p => {
    const isCurrent = current && current.id === p.id;
    return `<div class="plan-card ${p.id === (plans.find(x => x.price > 0)?.id) ? 'featured' : ''}">
      <div class="plan-name">${escHtml(p.name)} ${isCurrent ? '<span class="badge-pill st-approved">Active</span>' : ''}</div>
      <div class="plan-price">${inr(p.price)}<small>${p.price > 0 ? ' / ' + p.duration_days + ' days' : ' forever'}</small></div>
      <ul>
        ${p.features && p.features.length ? p.features.map(f => `<li>${escHtml(f)}</li>`).join('') : ''}
        ${p.job_limit > 0 ? `<li>${p.job_limit} active job posts</li>` : ''}
        ${p.highlight_jobs > 0 ? `<li>${p.highlight_jobs} highlighted postings</li>` : ''}
        ${p.resume_views > 0 ? `<li>${p.resume_views} resume views</li>` : ''}
      </ul>
      <button class="btn btn-block ${isCurrent ? 'btn-secondary' : 'btn-primary'}" ${isCurrent ? 'disabled' : ''} onclick="purchasePlan(${p.id})">${isCurrent ? 'Current Plan' : (p.price > 0 ? 'Subscribe Now' : 'Free Plan')}</button>
    </div>`;
  }).join('');
}

async function purchasePlan(planId) {
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;
  if (plan.price <= 0) {
    if (confirm('Activate the Free plan?')) {
      await activateFreePlan(plan.id);
    }
    return;
  }
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return showToast('Please login again', 'error');
  try {
    const res = await fetch(EDGE_FUNCTION_URL + '/jp-create-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ plan_id: planId })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Order failed'); }
    const order = await res.json();
    const rzp = new Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'Hetansh Technologie',
      description: order.plan_name + ' Plan',
      order_id: order.id,
      prefill: { name: order.user_name, email: order.user_email, contact: '919974031480' },
      theme: { color: '#2563eb' },
      handler: async function (response) {
        try {
          const vRes = await fetch(EDGE_FUNCTION_URL + '/jp-verify-purchase', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId
            })
          });
          const vData = await vRes.json();
          if (!vRes.ok) throw new Error(vData.error || 'Verification failed');
          if (role === 'company' && vData.plan_name && myCompany) {
            const planKey = vData.plan_name.toLowerCase().includes('enterprise') ? 'enterprise'
              : vData.plan_name.toLowerCase().includes('premium') ? 'premium' : 'free';
            await sb.from('jp_companies').update({ plan: planKey }).eq('id', myCompany.id);
            myCompany.plan = planKey;
          }
          showToast(vData.plan_name + ' plan activated!');
          loadPlans();
        } catch (e) { showToast('Payment verification failed: ' + e.message, 'error'); }
      },
      modal: { ondismiss: function () { } }
    });
    rzp.open();
  } catch (e) { showToast('Payment failed: ' + e.message, 'error'); }
}

async function activateFreePlan(planId) {
  const { error } = await sb.from('jp_subscriptions').insert({
    user_id: currentUser.id, plan_id: planId, status: 'active'
  });
  if (error) return showToast(error.message, 'error');
  showToast('Free plan activated');
  loadPlans();
}

// ======= Company =======
function getPlanLimits() {
  const key = myCompany?.plan || 'free';
  const limits = { free: { jobs: 2, highlight: 0 }, premium: { jobs: 20, highlight: 5 }, enterprise: { jobs: 100, highlight: 999 } };
  return limits[key] || limits.free;
}

async function loadCompanyDash() {
  const myJobs = await loadMyJobsData();
  const activeJobs = myJobs.filter(j => j.status === 'active');
  const { data: apps } = await sb.from('jp_applications').select('*, jp_jobs!inner(id,title,company_id), jp_profiles(full_name,email)')
    .in('job_id', myJobs.map(j => j.id).length ? myJobs.map(j => j.id) : [-1]);
  const appsList = apps || [];
  const shortlisted = appsList.filter(a => a.status === 'shortlisted' || a.status === 'hired');
  const { data: reviews } = await sb.from('jp_reviews').select('rating').eq('company_id', myCompany?.id).eq('status', 'published');
  const avg = reviews && reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '-';
  document.getElementById('cst-jobs').textContent = activeJobs.length;
  document.getElementById('cst-applications').textContent = appsList.length;
  document.getElementById('cst-shortlisted').textContent = shortlisted.length;
  document.getElementById('cst-rating').textContent = avg;
  const statusCard = document.getElementById('company-status-card');
  if (myCompany) {
    const planName = myCompany.plan.toUpperCase();
    statusCard.innerHTML = `
      <div class="card-header">Account Status</div>
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
        <div><span class="badge-pill ${myCompany.status === 'approved' ? 'st-approved' : myCompany.status === 'rejected' ? 'st-rejected' : 'st-pending'}">${myCompany.status.toUpperCase()}</span></div>
        <div>Plan: <strong>${planName}</strong> &middot; Active jobs ${activeJobs.length}/${getPlanLimits().jobs}</div>
        ${myCompany.status !== 'approved' ? '<div style="color:var(--warning);font-size:13px;">Your company is awaiting admin approval. Jobs can only be viewed publicly after approval.</div>' : ''}
      </div>`;
  }
  const recent = appsList.slice(0, 5);
  document.getElementById('company-recent-apps').innerHTML = recent.length ? `<table>
    <thead><tr><th>Job</th><th>Seeker</th><th>Status</th><th>Date</th></tr></thead><tbody>
    ${recent.map(a => {
      const p = a.jp_profiles || {};
      return `<tr><td>${escHtml(a.jp_jobs?.title || '-')}</td><td>${escHtml(p.full_name || 'Seeker')}</td>
        <td><span class="status-badge st-${a.status}">${a.status.toUpperCase()}</span></td>
        <td style="font-size:12px;color:var(--gray-500);">${formatDate(a.created_at)}</td></tr>`;
    }).join('')}</tbody></table>` : '<div class="empty">No applications yet.</div>';
}

async function loadMyJobsData() {
  const { data } = await sb.from('jp_jobs').select('*').eq('company_id', myCompany?.id).order('created_at', { ascending: false });
  allJobsCache = data || [];
  return data || [];
}

async function loadMyJobs() {
  const jobs = await loadMyJobsData();
  const el = document.getElementById('my-jobs-table');
  const empty = document.getElementById('myjobs-empty');
  if (!jobs.length) { el.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const appliedCounts = {};
  const ids = jobs.map(j => j.id);
  if (ids.length) {
    const { data: apps } = await sb.from('jp_applications').select('job_id, id').in('job_id', ids);
    (apps || []).forEach(a => { appliedCounts[a.job_id] = (appliedCounts[a.job_id] || 0) + 1; });
  }
  el.innerHTML = `<table><thead><tr><th>Job</th><th>Applications</th><th>Type</th><th>Status</th><th>Highlight</th><th>Actions</th></tr></thead><tbody>
  ${jobs.map(j => `<tr>
    <td><strong>${escHtml(j.title)}</strong><br><span style="font-size:12px;color:var(--gray-500);">${escHtml(j.location)} · ${formatSalary(j.salary_min, j.salary_max)}</span></td>
    <td>${appliedCounts[j.id] || 0}</td>
    <td>${escHtml(j.type)}</td>
    <td><span class="status-badge st-${j.status}">${j.status.toUpperCase()}</span></td>
    <td>${j.is_highlighted ? '⭐ Yes' : '-'}</td>
    <td style="white-space:nowrap;">
      <button class="btn btn-sm btn-secondary" onclick="openJobModal(${j.id})">✏️</button>
      <button class="btn btn-sm btn-secondary" onclick="toggleJobStatus(${j.id})">${j.status === 'active' ? '⏸' : '▶️'}</button>
      <button class="btn btn-sm btn-danger" onclick="deleteJob(${j.id})">🗑</button>
    </td>
  </tr>`).join('')}</tbody></table>`;
}

async function openJobModal(jobId) {
  editingJobId = jobId;
  document.getElementById('job-modal-title').textContent = jobId ? 'Edit Job' : 'Post a Job';
  const f = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  if (jobId) {
    const job = allJobsCache.find(j => j.id === jobId) || await fetchJob(jobId);
    f('job-id', jobId);
    f('job-title', job.title || '');
    f('job-desc', job.description || '');
    f('job-type', job.type || 'Full-time');
    f('job-location', job.location || '');
    f('job-exp-min', job.experience_min || 0);
    f('job-exp-max', job.experience_max || 10);
    f('job-salary-min', job.salary_min || 0);
    f('job-salary-max', job.salary_max || 20);
    f('job-skills', (job.skills || []).join(', '));
    document.getElementById('job-highlighted').checked = !!job.is_highlighted;
  } else {
    f('job-id', ''); f('job-title', ''); f('job-desc', ''); f('job-type', 'Full-time');
    f('job-location', ''); f('job-exp-min', 0); f('job-exp-max', 10);
    f('job-salary-min', 0); f('job-salary-max', 20); f('job-skills', '');
    document.getElementById('job-highlighted').checked = false;
  }
  document.getElementById('job-modal').classList.remove('hidden');
}

async function saveJob() {
  const title = document.getElementById('job-title').value.trim();
  if (!title) return showToast('Job title is required', 'error');
  const payload = {
    title,
    description: document.getElementById('job-desc').value.trim(),
    type: document.getElementById('job-type').value,
    location: document.getElementById('job-location').value.trim() || 'Remote',
    experience_min: Number(document.getElementById('job-exp-min').value) || 0,
    experience_max: Number(document.getElementById('job-exp-max').value) || 10,
    salary_min: Number(document.getElementById('job-salary-min').value) || 0,
    salary_max: Number(document.getElementById('job-salary-max').value) || 0,
    skills: document.getElementById('job-skills').value.split(',').map(s => s.trim()).filter(Boolean),
    is_highlighted: document.getElementById('job-highlighted').checked
  };
  if (payload.is_highlighted && getPlanLimits().highlight <= 0 && role !== 'admin') {
    const ok = confirm('Highlighting requires a Premium/Enterprise plan. Subscribe on the Plans page?');
    if (ok) showView('plans');
    return;
  }
  if (editingJobId) {
    const { error } = await sb.from('jp_jobs').update(payload).eq('id', editingJobId);
    if (error) return showToast('Update failed: ' + error.message, 'error');
  } else {
    const activeCount = (await loadMyJobsData()).filter(j => j.status === 'active').length;
    if (activeCount >= getPlanLimits().jobs && role !== 'admin') {
      const ok = confirm('You have reached your active job limit on the ' + (myCompany?.plan || 'free') + ' plan. Upgrade?');
      if (ok) showView('plans');
      return;
    }
    const { error } = await sb.from('jp_jobs').insert({ ...payload, company_id: myCompany?.id });
    if (error) return showToast('Post failed: ' + error.message, 'error');
  }
  closeModal('job-modal');
  showToast(editingJobId ? 'Job updated!' : 'Job posted!');
  loadMyJobs();
}

async function toggleJobStatus(jobId) {
  const job = await fetchJob(jobId);
  const next = job.status === 'active' ? 'paused' : 'active';
  const { error } = await sb.from('jp_jobs').update({ status: next }).eq('id', jobId);
  if (error) return showToast(error.message, 'error');
  showToast(next === 'active' ? 'Job activated' : 'Job paused');
  loadMyJobs();
}

async function deleteJob(jobId) {
  if (!confirm('Delete this job and all its applications?')) return;
  const { error } = await sb.from('jp_jobs').delete().eq('id', jobId);
  if (error) return showToast(error.message, 'error');
  showToast('Job deleted');
  loadMyJobs();
}

async function loadCompanyApplications() {
  const myJobs = await loadMyJobsData();
  const ids = myJobs.map(j => j.id);
  const jobFilter = document.getElementById('ca-job-filter');
  jobFilter.innerHTML = '<option value="">All Jobs</option>' + myJobs.map(j => `<option value="${j.id}">${escHtml(j.title)}</option>`).join('');
  if (!ids.length) {
    document.getElementById('company-apps-table').innerHTML = '';
    document.getElementById('company-apps-empty').classList.remove('hidden');
    return;
  }
  let query = sb.from('jp_applications').select('*, jp_jobs!inner(id,title,company_id), jp_profiles(full_name,email,phone,skills,current_ctc,expected_ctc,notice_period,resume_url)')
    .in('job_id', ids).order('created_at', { ascending: false });
  if (jobFilter.value) query = query.eq('job_id', jobFilter.value);
  const { data } = await query;
  const el = document.getElementById('company-apps-table');
  if (!data || !data.length) { el.innerHTML = ''; document.getElementById('company-apps-empty').classList.remove('hidden'); return; }
  document.getElementById('company-apps-empty').classList.add('hidden');
  el.innerHTML = `<table><thead><tr><th>Candidate</th><th>Job</th><th>CTC</th><th>Resume</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${data.map(a => {
    const p = a.jp_profiles || {};
    const skills = (p.skills || []).slice(0, 3).map(s => `<span class="chip skill">${escHtml(s)}</span>`).join('');
    return `<tr>
      <td><strong>${escHtml(p.full_name || 'Seeker')}</strong><br><span style="font-size:12px;color:var(--gray-500);">${escHtml(p.email || '')}${p.phone ? ' · ' + escHtml(p.phone) : ''}</span><br><span style="font-size:12px;">${skills}</span></td>
      <td>${escHtml(a.jp_jobs?.title || '-')}</td>
      <td style="font-size:12px;">Cur: ${escHtml(a.current_ctc || p.current_ctc || '-')}<br>Exp: ${escHtml(a.expected_ctc || p.expected_ctc || '-')}</td>
      <td>${a.resume_url ? `<a href="${escHtml(a.resume_url)}" target="_blank" rel="noopener">View</a>` : '-'}</td>
      <td><span class="status-badge st-${a.status}">${a.status.toUpperCase()}</span></td>
      <td style="white-space:nowrap;">
        <select class="app-status" style="width:auto;" onchange="setApplicationStatus(${a.id}, this.value)">
          <option value="applied" ${a.status === 'applied' ? 'selected' : ''}>Applied</option>
          <option value="reviewed" ${a.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
          <option value="shortlisted" ${a.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
          <option value="rejected" ${a.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          <option value="hired" ${a.status === 'hired' ? 'selected' : ''}>Hired</option>
        </select>
      </td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

async function setApplicationStatus(appId, status) {
  const { error } = await sb.from('jp_applications').update({ status }).eq('id', appId);
  if (error) return showToast(error.message, 'error');
  showToast('Status updated to ' + status);
}

async function loadCompanyReviews() {
  if (!myCompany) return;
  const { data } = await sb.from('jp_reviews').select('*, jp_profiles(full_name)').eq('company_id', myCompany.id)
    .eq('status', 'published').order('created_at', { ascending: false });
  const el = document.getElementById('company-reviews');
  if (!data || !data.length) { el.innerHTML = ''; document.getElementById('company-reviews-empty').classList.remove('hidden'); return; }
  document.getElementById('company-reviews-empty').classList.add('hidden');
  el.innerHTML = data.map(r => `
    <div class="card review-card">
      <div style="display:flex;justify-content:space-between;">
        <div><span class="avatar-sm">${escHtml(initials(r.jp_profiles?.full_name || 'S'))}</span><strong>${escHtml(r.jp_profiles?.full_name || 'Anonymous')}</strong>
          <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span><span class="rating-num">${r.rating}/5</span></div>
        <span style="font-size:12px;color:var(--gray-400);">${formatDate(r.created_at)}</span>
      </div>
      ${r.title ? `<div style="font-weight:600;margin-top:6px;">${escHtml(r.title)}</div>` : ''}
      ${r.interview_exp ? `<p style="margin-top:6px;color:var(--gray-600);font-size:13px;"><strong>Interview:</strong> ${escHtml(r.interview_exp)}</p>` : ''}
      ${r.culture ? `<p style="color:var(--gray-600);font-size:13px;"><strong>Culture:</strong> ${escHtml(r.culture)}</p>` : ''}
      ${r.environment ? `<p style="color:var(--gray-600);font-size:13px;"><strong>Environment:</strong> ${escHtml(r.environment)}</p>` : ''}
    </div>`).join('');
}

async function loadCompanyProfile() {
  if (!myCompany) return;
  document.getElementById('cp-name').value = myCompany.name || '';
  document.getElementById('cp-industry').value = myCompany.industry || '';
  document.getElementById('cp-location').value = myCompany.location || '';
  document.getElementById('cp-website').value = myCompany.website || '';
  document.getElementById('cp-size').value = myCompany.size || '11-50';
  document.getElementById('cp-logo').value = myCompany.logo_url || '';
  document.getElementById('cp-desc').value = myCompany.description || '';
}

async function saveCompanyProfile() {
  const payload = {
    name: document.getElementById('cp-name').value.trim(),
    industry: document.getElementById('cp-industry').value.trim(),
    location: document.getElementById('cp-location').value.trim(),
    website: document.getElementById('cp-website').value.trim(),
    size: document.getElementById('cp-size').value,
    logo_url: document.getElementById('cp-logo').value.trim(),
    description: document.getElementById('cp-desc').value.trim()
  };
  if (!payload.name) return showToast('Company name is required', 'error');
  const { error } = await sb.from('jp_companies').update(payload).eq('id', myCompany.id);
  if (error) return showToast('Save failed: ' + error.message, 'error');
  myCompany = { ...myCompany, ...payload };
  showToast('Company profile saved!');
}

// ======= Init =======
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
});
