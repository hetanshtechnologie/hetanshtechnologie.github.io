let currentPageInfo = null;
let allApplications = [];
let statsData = [];
let statsBase = [];
let statsDailyChart = null;
let statsPlatformChart = null;

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${name}"]`).classList.add('active');
  document.getElementById(`panel-${name}`).classList.add('active');

  if (name === 'history') loadHistory();
  if (name === 'stats') loadStats();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function sendMessage(msg, timeoutMs = 15000) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    chrome.runtime.sendMessage(msg, response => {
      if (chrome.runtime.lastError) { finish(undefined); return; }
      finish(response);
    });
    setTimeout(() => finish(undefined), timeoutMs);
  });
}

function getInitials(str) {
  if (!str) return '?';
  return str.split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

async function loadCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      document.getElementById('page-loading').style.display = 'none';
      document.getElementById('page-no-job').style.display = 'block';
      return;
    }

    let pageInfo;
    try {
      pageInfo = await sendMessage({ action: 'getPageInfo' });
    } catch (e) {
      pageInfo = {
        company: new URL(tab.url).hostname.replace('www.', ''),
        jobTitle: tab.title,
        hasForm: false,
        url: tab.url
      };
    }

    if (!pageInfo) pageInfo = {};
    pageInfo.url = pageInfo.url || tab.url;

    currentPageInfo = pageInfo;

    const statusResult = await sendMessage({ action: 'getStatus', url: tab.url });
    const jobData = statusResult && statusResult.found ? statusResult.data : null;

    document.getElementById('page-loading').style.display = 'none';

    const isJobPage = jobData || pageInfo.hasForm ||
      /job|career|apply|hiring|position|vacancy/i.test(tab.title + ' ' + tab.url);

    if (isJobPage) {
      document.getElementById('page-info').style.display = 'block';
      document.getElementById('company-name').textContent = pageInfo.company || jobData?.company_name || '-';
      document.getElementById('job-title').textContent = pageInfo.jobTitle || jobData?.job_title || '-';
      document.getElementById('job-location').textContent = pageInfo.location || jobData?.location || '-';
      document.getElementById('job-salary').textContent = pageInfo.salary || jobData?.salary_expected || '-';

      const alertEl = document.getElementById('company-alert');
      if (alertEl) { alertEl.style.display = 'none'; alertEl.className = ''; }
      const company = pageInfo.company || jobData?.company_name || '';
      if (company && alertEl) {
        const check = await sendMessage({ action: 'checkCompanyApplied', company });
        if (check && check.found) {
          const prev = (check.data && check.data[0]) || null;
          if (prev && (prev.applied === true || prev.status === 'applied')) {
            const when = prev.visited_at
              ? ' on ' + new Date(prev.visited_at).toLocaleDateString() : '';
            alertEl.textContent = `You already applied to ${company} within the last month${when}.`;
            alertEl.className = 'alert-applied';
            alertEl.style.display = 'block';
          }
        }
        if (alertEl.style.display === 'none') {
          const vCheck = await sendMessage({ action: 'checkCompanyVisited', company });
          if (vCheck && vCheck.found) {
            const prev = (vCheck.data && vCheck.data[0]) || null;
            if (prev && !(prev.applied === true || prev.status === 'applied')) {
              const when = prev.visited_at
                ? ' on ' + new Date(prev.visited_at).toLocaleDateString() : '';
              alertEl.textContent = `You already visited ${company} within the last month${when}.`;
              alertEl.className = 'alert-visited';
              alertEl.style.display = 'block';
            }
          }
        }
      }

      const details = {
        company: pageInfo.company || jobData?.company_name || '',
        jobTitle: pageInfo.jobTitle || jobData?.job_title || '',
        location: pageInfo.location || jobData?.location || '',
        salary: pageInfo.salary || jobData?.salary_expected || '',
        jobType: pageInfo.jobType || jobData?.job_type || '',
        notes: jobData?.notes || ''
      };
      populateDetailsForm(details);
      document.getElementById('btn-edit-details').style.display = 'block';

      const statusEl = document.getElementById('app-status');
      if (jobData) {
        if (jobData.applied) {
          statusEl.innerHTML = '<span class="badge badge-applied">Applied</span>';
          document.getElementById('btn-mark-applied').style.display = 'none';
        } else {
          statusEl.innerHTML = '<span class="badge badge-visited">Visited</span>';
          document.getElementById('btn-mark-applied').style.display = 'block';
        }
      } else {
        statusEl.innerHTML = '<span class="badge badge-error">Not Tracked</span>';
        document.getElementById('btn-add-manual').style.display = 'block';
        document.getElementById('btn-mark-applied').style.display = 'none';
      }

      document.getElementById('form-detected').textContent = pageInfo.hasForm ? 'Yes' : 'No';

      if (pageInfo.hasForm || jobData) {
        document.getElementById('btn-fill').style.display = 'block';
        document.getElementById('btn-highlight').style.display = 'block';
      }
    } else {
      document.getElementById('page-no-job').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('page-loading').innerHTML =
      `<p style="color:#991b1b;">Error: ${err.message}</p>`;
  }
}

async function markApplied() {
  if (!currentPageInfo) return;
  if (!(await requireLogin())) return;
  const btn = document.getElementById('btn-mark-applied');
  btn.disabled = true;
  btn.textContent = 'Marking...';
  try {
    const result = await sendMessage({ action: 'markApplied', url: currentPageInfo.url });
    if (result && result.status === 'ok') {
      if (result.data) {
        showToast('Marked as applied!');
      } else {
        showToast('Job not found in tracker — track it first');
      }
      await loadCurrentPage();
      const alertEl = document.getElementById('company-alert');
      if (alertEl) alertEl.style.display = 'none';
    } else {
      showToast('Error marking as applied: ' + ((result && result.message) || 'no response'));
    }
  } catch (err) {
    showToast('Error marking as applied: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Mark as Applied';
  }
}

async function fillForm() {
  if (!(await requireLogin())) return;
  const profile = await getStoredProfile();
  if (!profile) {
    showToast('Please save your profile first');
    switchTab('profile');
    return;
  }

  const mapProfile = {
    firstName: profile.fullName ? profile.fullName.split(' ')[0] : '',
    lastName: profile.fullName ? profile.fullName.split(' ').slice(1).join(' ') : '',
    fullName: profile.fullName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    linkedIn: profile.linkedIn || '',
    resumeUrl: profile.resumeUrl || '',
    coverLetter: profile.coverLetter || '',
    website: profile.website || ''
  };

  const result = await sendMessage({ action: 'fillForm', profile: mapProfile });
  if (result && result.success) {
    showToast(`Filled ${result.filledCount} fields`);
  } else {
    showToast('No matching fields found on this page');
  }
}

async function highlightFields() {
  const result = await sendMessage({ action: 'highlight' });
  if (result && result.success) {
    showToast(`Found ${result.fieldCount} fillable fields`);
  } else {
    showToast('No matching fields found');
  }
}

async function addManualEntry() {
  if (!currentPageInfo) return;
  if (!(await requireLogin())) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await sendMessage({
    action: 'trackJob',
    url: currentPageInfo.url,
    title: currentPageInfo.jobTitle || tab.title
  });

  if (result && (result.status === 'tracked' || result.status === 'already_tracked')) {
    showToast('Page added to tracking');
    loadCurrentPage();
  } else {
    showToast('Error adding page');
  }
}

async function loadHistory() {
  document.getElementById('history-loading').style.display = 'block';
  const auth = await sendMessage({ action: 'getAuthStatus' });
  document.getElementById('history-loading').style.display = 'none';

  if (!auth || auth.status !== 'logged_in') {
    document.getElementById('history-list').innerHTML =
      '<div class="empty-state"><p>Login to view your tracked applications.</p></div>';
    return;
  }

  const result = await sendMessage({ action: 'getAllApplications' });
  allApplications = (result && result.data) || [];

  const list = document.getElementById('history-list');
  if (allApplications.length === 0) {
    document.getElementById('history-count').textContent = '0';
    list.innerHTML = '<div class="empty-state"><p>No tracked applications yet.</p></div>';
    return;
  }

  // Group by company (case-insensitive); allApplications is newest-first.
  const groups = new Map();
  for (const app of allApplications) {
    const key = (app.company_name || 'Unknown').toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(app);
  }

  document.getElementById('history-count').textContent = groups.size;

  let html = '<div class="history-toolbar">'
    + '<label class="sel-all-label"><input type="checkbox" id="history-select-all"> Select all</label>'
    + '<button id="btn-delete-selected" class="btn-delete-selected" disabled>Delete Selected (0)</button>'
    + '</div>';

  groups.forEach(group => {
    html += renderCompanyGroup(group);
  });

  list.innerHTML = html;
}

function renderCompanyGroup(group) {
  const company = group[0].company_name || 'Unknown';
  const initials = getInitials(company);
  const anyApplied = group.some(a => a.applied);
  const latest = group[0];
  const latestTitle = latest.job_title || 'Tracked job';
  const sub = group.length + ' job' + (group.length > 1 ? 's' : '') + ' \u00B7 ' + latestTitle;

  let h = '<div class="company-item">';
  h += '<div class="company-header">'
    + '<input type="checkbox" class="company-check" title="Select all entries for this company">'
    + '<div class="list-icon">' + escapeHtml(initials) + '</div>'
    + '<div class="list-info">'
    + '<div class="list-company">' + escapeHtml(company) + '</div>'
    + '<div class="list-url">' + escapeHtml(sub) + '</div>'
    + '</div>'
    + '<span class="badge ' + (anyApplied ? 'badge-applied' : 'badge-visited') + ' list-badge">' + (anyApplied ? 'Applied' : 'Visited') + '</span>'
    + '<button class="btn-toggle" title="Show entries">\u25BE</button>'
    + '</div>';

  h += '<div class="company-details" style="display:none;">';
  group.forEach(app => {
    h += renderDetailRow(app);
  });
  h += '</div></div>';
  return h;
}

function renderDetailRow(app) {
  const title = app.job_title || 'Tracked job';
  const date = new Date(app.visited_at).toLocaleDateString();
  const applied = !!app.applied;
  return '<div class="detail-row" data-id="' + app.id + '">'
    + '<input type="checkbox" class="entry-check" data-id="' + app.id + '">'
    + '<div class="list-info">'
    + '<a href="#" class="detail-title" data-url="' + escapeAttr(app.job_url) + '">' + escapeHtml(title) + '</a>'
    + '<div class="list-url">' + date + '</div>'
    + '</div>'
    + '<button class="btn-status ' + (!applied ? 'active-visited' : '') + '" data-status="visited" title="Mark as visited">Visited</button>'
    + '<button class="btn-status ' + (applied ? 'active-applied' : '') + '" data-status="applied" title="Mark as applied">Applied</button>'
    + '<button class="btn-delete" data-id="' + app.id + '" title="Delete entry">&times;</button>'
    + '</div>';
}

async function markJobStatus(id, status) {
  const result = await sendMessage({ action: 'setJobStatus', id: Number(id), status });
  if (result && result.status === 'ok') {
    showToast('Marked as ' + status);
    loadHistory();
  } else {
    showToast('Error: ' + ((result && result.message) || 'failed'));
  }
}

function updateHistorySelection() {
  const checks = document.querySelectorAll('#history-list .entry-check');
  const checked = document.querySelectorAll('#history-list .entry-check:checked');
  const btn = document.getElementById('btn-delete-selected');
  const selAll = document.getElementById('history-select-all');
  if (btn) {
    btn.disabled = checked.length === 0;
    btn.textContent = 'Delete Selected (' + checked.length + ')';
  }
  if (selAll) {
    selAll.checked = checks.length > 0 && checked.length === checks.length;
    selAll.indeterminate = checked.length > 0 && checked.length < checks.length;
  }
}

async function deleteSelected() {
  const checks = document.querySelectorAll('#history-list .entry-check:checked');
  if (!checks.length) return;
  if (!confirm('Delete ' + checks.length + ' selected entr' + (checks.length > 1 ? 'ies' : 'y') + '?')) return;
  let ok = 0;
  for (const check of checks) {
    const res = await sendMessage({ action: 'deleteJob', id: Number(check.getAttribute('data-id')) });
    if (res && res.status === 'deleted') ok++;
  }
  showToast('Deleted ' + ok + ' entr' + (ok === 1 ? 'y' : 'ies'));
  loadHistory();
}

function openUrl(url) {
  chrome.tabs.create({ url });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function getStoredProfile() {
  return new Promise(resolve => {
    chrome.storage.local.get('jobProfile', data => {
      resolve(data.jobProfile || null);
    });
  });
}

function setStoredProfile(profile) {
  return new Promise(resolve => {
    chrome.storage.local.set({ jobProfile: profile }, resolve);
  });
}

async function loadProfile() {
  const profile = await getStoredProfile();
  if (profile) {
    document.getElementById('pf-fullName').value = profile.fullName || '';
    document.getElementById('pf-email').value = profile.email || '';
    document.getElementById('pf-phone').value = profile.phone || '';
    document.getElementById('pf-linkedIn').value = profile.linkedIn || '';
    document.getElementById('pf-resumeUrl').value = profile.resumeUrl || '';
    document.getElementById('pf-website').value = profile.website || '';
    document.getElementById('pf-coverLetter').value = profile.coverLetter || '';
  }
}

async function saveProfile() {
  if (!(await requireLogin())) return;
  const profile = {
    fullName: document.getElementById('pf-fullName').value.trim(),
    email: document.getElementById('pf-email').value.trim(),
    phone: document.getElementById('pf-phone').value.trim(),
    linkedIn: document.getElementById('pf-linkedIn').value.trim(),
    resumeUrl: document.getElementById('pf-resumeUrl').value.trim(),
    website: document.getElementById('pf-website').value.trim(),
    coverLetter: document.getElementById('pf-coverLetter').value.trim()
  };

  await setStoredProfile(profile);
  const resp = await sendMessage({ action: 'saveProfile', profile });

  const status = document.getElementById('profile-status');
  if (resp && resp.result && resp.result.error) {
    status.textContent = 'Save failed: ' + resp.result.error;
    status.className = 'show error';
    setTimeout(() => status.className = '', 4000);
    return;
  }
  status.textContent = 'Profile saved!';
  status.className = 'show success';
  setTimeout(() => status.className = '', 3000);
  showToast('Profile saved');
}

async function testAutofill() {
  await fillForm();
}

function populateDetailsForm(details) {
  document.getElementById('df-company').value = details.company || '';
  document.getElementById('df-title').value = details.jobTitle || '';
  document.getElementById('df-location').value = details.location || '';
  document.getElementById('df-salary').value = details.salary || '';
  document.getElementById('df-type').value = details.jobType || '';
  document.getElementById('df-notes').value = details.notes || '';
}

function toggleDetailsForm() {
  const form = document.getElementById('details-form');
  const show = form.style.display === 'none';
  form.style.display = show ? 'block' : 'none';
}

async function saveJobDetails() {
  if (!currentPageInfo) return;
  if (!(await requireLogin())) return;
  const fields = {
    company_name: document.getElementById('df-company').value.trim(),
    job_title: document.getElementById('df-title').value.trim(),
    location: document.getElementById('df-location').value.trim(),
    salary_expected: document.getElementById('df-salary').value.trim(),
    job_type: document.getElementById('df-type').value.trim(),
    notes: document.getElementById('df-notes').value.trim()
  };

  const result = await sendMessage({ action: 'updateJob', url: currentPageInfo.url, fields });
  if (result && (result.status === 'updated' || result.status === 'saved')) {
    showToast('Job details saved');
    document.getElementById('company-name').textContent = fields.company_name || '-';
    document.getElementById('job-title').textContent = fields.job_title || '-';
    document.getElementById('job-location').textContent = fields.location || '-';
    document.getElementById('job-salary').textContent = fields.salary_expected || '-';
    document.getElementById('details-form').style.display = 'none';
    loadCurrentPage();
  } else {
    showToast('Error saving details: ' + ((result && result.message) || 'unknown'));
  }
}

async function requireLogin() {
  const result = await sendMessage({ action: 'getAuthStatus' });
  if (result && result.status === 'logged_in') return true;
  showToast('Please login first');
  return false;
}

async function updateAuthUI() {
  const result = await sendMessage({ action: 'getAuthStatus' });
  const loggedIn = !!(result && result.status === 'logged_in');
  const user = result && result.user;
  const displayName = user ? (user.email || (user.user_metadata && user.user_metadata.full_name) || 'Signed in') : '';
  document.getElementById('auth-user').textContent = displayName;
  document.getElementById('auth-user').style.display = loggedIn ? 'block' : 'none';
  document.getElementById('login-form').classList.toggle('show', !loggedIn);
  document.getElementById('btn-logout').style.display = loggedIn ? 'block' : 'none';
  if (!loggedIn) {
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  }
  return loggedIn;
}

async function loginWithPassword() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showToast('Enter email and password');
    return;
  }
  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  const rememberEl = document.getElementById('remember-me');
  const remember = rememberEl ? rememberEl.checked : true;
  const result = await sendMessage({ action: 'login', email, password, remember });
  btn.disabled = false;
  btn.textContent = 'Sign in';
  if (result && result.status === 'ok') {
    showToast('Logged in');
    await updateAuthUI();
    loadCurrentPage();
    loadProfile();
  } else {
    showToast('Login failed: ' + (result ? result.message : 'Please enable email auth in Supabase'));
  }
}

async function logout() {
  await sendMessage({ action: 'logout' });
  await updateAuthUI();
  loadCurrentPage();
}

async function refreshPageInfo() {
  const btn = document.getElementById('btn-refresh-page');
  if (btn) { btn.disabled = true; btn.textContent = '\u21BB Scanning...'; }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'rescan' }).catch(() => {});
    }
    await loadCurrentPage();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\u21BB Refresh'; }
  }
}

async function applyKeywordSettings() {
  const enabled = document.getElementById('kw-enabled').checked;
  const keywords = document.getElementById('kw-list').value.split(',').map(s => s.trim()).filter(Boolean);
  const finalKeywords = keywords.length ? keywords : ['Remote', 'Ahmedabad'];
  await new Promise(resolve => chrome.storage.local.set({
    jtHighlightEnabled: enabled,
    jtKeywords: finalKeywords
  }, resolve));
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'setKeywordHighlight', enabled, keywords: finalKeywords }).catch(() => {});
  }
  showToast(enabled ? 'Highlighting: ' + finalKeywords.join(', ') : 'Keyword highlighting off');
}

function initKeywordUI() {
  chrome.storage.local.get({ jtHighlightEnabled: true, jtKeywords: ['Remote', 'Ahmedabad'] }, data => {
    const enabledEl = document.getElementById('kw-enabled');
    const listEl = document.getElementById('kw-list');
    if (enabledEl) enabledEl.checked = data.jtHighlightEnabled !== false;
    if (listEl) listEl.value = (data.jtKeywords && data.jtKeywords.length ? data.jtKeywords : ['Remote', 'Ahmedabad']).join(', ');
  });
}

function statsLocalDateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function statsAppliedDate(r) {
  if (!r.applied) return null;
  return r.applied_at ? new Date(r.applied_at) : new Date(r.visited_at);
}

function statsPlatformFromUrl(url) {
  try {
    const host = new URL(url || '').hostname.replace(/^www\./, '').toLowerCase();
    const map = [
      ['linkedin', 'LinkedIn'], ['naukri', 'Naukri'], ['indeed', 'Indeed'],
      ['glassdoor', 'Glassdoor'], ['wellfound', 'Wellfound'], ['angellist', 'AngelList'],
      ['dice', 'Dice'], ['ziprecruiter', 'ZipRecruiter'], ['monster', 'Monster'],
      ['greenhouse', 'Greenhouse'], ['lever', 'Lever'], ['workday', 'Workday'],
      ['icims', 'iCIMS'], ['smartrecruiters', 'SmartRecruiters'], ['ashby', 'Ashby'],
      ['jazzhr', 'JazzHR'], ['bamboohr', 'BambooHR'], ['successfactors', 'SAP SuccessFactors'],
      ['hirewith', 'Hirewith'], ['join', 'Join'], ['instahyre', 'Instahyre'], ['cutshort', 'Cutshort']
    ];
    for (const [key, label] of map) if (host.includes(key)) return label;
    return host || 'Other';
  } catch (e) {
    return 'Other';
  }
}

async function loadStats() {
  const result = await sendMessage({ action: 'getAllApplications' });
  statsData = (result && result.data && Array.isArray(result.data)) ? result.data : [];
  populateStatsPlatform();
  applyStatsFilters();
}

function populateStatsPlatform() {
  const sel = document.getElementById('st-platform');
  if (!sel) return;
  const platforms = new Set();
  statsData.forEach(r => platforms.add(statsPlatformFromUrl(r.job_url)));
  const current = sel.value;
  sel.innerHTML = '<option value="all">All Platforms</option>' +
    Array.from(platforms).sort().map(p =>
      '<option value="' + escapeAttr(p) + '">' + escapeAttr(p) + '</option>').join('');
  sel.value = platforms.has(current) ? current : 'all';
}

function applyStatsFilters() {
  const status = document.getElementById('st-status').value;
  const platform = document.getElementById('st-platform').value;
  const dateField = document.getElementById('st-date-field').value;
  const from = document.getElementById('st-from').value;
  const to = document.getElementById('st-to').value;
  const search = document.getElementById('st-search').value.toLowerCase();

  statsBase = statsData.filter(r => {
    if (status !== 'all' && r.status !== status) return false;
    if (platform !== 'all' && statsPlatformFromUrl(r.job_url) !== platform) return false;
    if (search) {
      const hay = ((r.company_name || '') + ' ' + (r.job_title || '')).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (from || to) {
      const d = dateField === 'applied' ? statsAppliedDate(r) : (r.visited_at ? new Date(r.visited_at) : null);
      if (!d) return false;
      const t = d.getTime();
      if (from && t < new Date(from + 'T00:00:00').getTime()) return false;
      if (to && t > new Date(to + 'T23:59:59.999').getTime()) return false;
    }
    return true;
  });
  renderStatsChips();
  renderStatsDailyChart();
  renderStatsPlatformChart();
}

function resetStatsFilters() {
  document.getElementById('st-status').value = 'all';
  document.getElementById('st-platform').value = 'all';
  document.getElementById('st-date-field').value = 'visited';
  document.getElementById('st-from').value = '';
  document.getElementById('st-to').value = '';
  document.getElementById('st-search').value = '';
  applyStatsFilters();
}

function renderStatsChips() {
  const counts = { total: statsBase.length, visited: 0, applied: 0, interview: 0, offered: 0, accepted: 0, rejected: 0 };
  statsBase.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
  const order = [
    ['total', 'Total', '#2563eb'], ['visited', 'Visited', '#f59e0b'],
    ['applied', 'Applied', '#16a34a'], ['interview', 'Interview', '#6366f1'],
    ['offered', 'Offered', '#10b981'], ['accepted', 'Accepted', '#0d9488'],
    ['rejected', 'Rejected', '#ef4444']
  ];
  document.getElementById('st-chips').innerHTML = order.map(([k, lbl, color]) =>
    '<div class="stat-chip"><div class="num" style="color:' + color + '">' + counts[k] +
    '</div><div class="lbl">' + lbl + '</div></div>').join('');
}

function renderStatsDailyChart() {
  const ctx = document.getElementById('chart-daily');
  if (!ctx || typeof Chart === 'undefined') return;
  if (statsDailyChart) { statsDailyChart.destroy(); statsDailyChart = null; }
  const now = new Date();
  const days = [];
  const idx = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = statsLocalDateKey(d);
    days.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: 0 });
    idx[key] = days.length - 1;
  }
  statsBase.forEach(r => {
    const d = statsAppliedDate(r);
    if (!d) return;
    const key = statsLocalDateKey(d);
    if (idx[key] !== undefined) days[idx[key]].count++;
  });
  statsDailyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days.map(d => d.label),
      datasets: [{ label: 'Applied', data: days.map(d => d.count), backgroundColor: '#16a34a', borderRadius: 3 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

function renderStatsPlatformChart() {
  const ctx = document.getElementById('chart-platform');
  if (!ctx || typeof Chart === 'undefined') return;
  if (statsPlatformChart) { statsPlatformChart.destroy(); statsPlatformChart = null; }
  const counts = {};
  statsBase.forEach(r => {
    if (!statsAppliedDate(r)) return;
    const p = statsPlatformFromUrl(r.job_url);
    counts[p] = (counts[p] || 0) + 1;
  });
  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const palette = ['#2563eb', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#94a3b8'];
  const hasData = labels.length > 0;
  statsPlatformChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: hasData ? labels : ['No applied jobs'],
      datasets: [{
        data: hasData ? labels.map(l => counts[l]) : [1],
        backgroundColor: hasData ? labels.map((l, i) => palette[i % palette.length]) : ['#e2e8f0'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
    }
  });
}

function setupEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('btn-mark-applied').addEventListener('click', markApplied);
  document.getElementById('btn-fill').addEventListener('click', fillForm);
  document.getElementById('btn-highlight').addEventListener('click', highlightFields);
  document.getElementById('btn-add-manual').addEventListener('click', addManualEntry);
  document.getElementById('btn-edit-details').addEventListener('click', toggleDetailsForm);
  document.getElementById('btn-save-details').addEventListener('click', saveJobDetails);
  const refreshBtn = document.getElementById('btn-refresh-page');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshPageInfo);
  const kwBtn = document.getElementById('btn-apply-kw');
  if (kwBtn) kwBtn.addEventListener('click', applyKeywordSettings);
  const kwChk = document.getElementById('kw-enabled');
  if (kwChk) kwChk.addEventListener('change', applyKeywordSettings);
  document.getElementById('btn-save-profile').addEventListener('click', saveProfile);
  document.getElementById('btn-test-autofill').addEventListener('click', testAutofill);
  document.getElementById('btn-track-manual').addEventListener('click', addManualEntry);

  const statsResetBtn = document.getElementById('btn-stats-reset');
  if (statsResetBtn) statsResetBtn.addEventListener('click', resetStatsFilters);
  ['st-status', 'st-platform', 'st-date-field', 'st-from', 'st-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyStatsFilters);
  });
  const stSearch = document.getElementById('st-search');
  if (stSearch) stSearch.addEventListener('input', applyStatsFilters);
  document.getElementById('btn-login').addEventListener('click', loginWithPassword);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') loginWithPassword();
  });
  document.getElementById('login-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') loginWithPassword();
  });
  document.getElementById('btn-logout').addEventListener('click', logout);

  const openPanelBtn = document.getElementById('btn-open-panel');
  if (openPanelBtn) {
    openPanelBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && chrome.sidePanel) {
        await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
        window.close();
      }
    });
  }

  document.getElementById('history-list').addEventListener('click', async (e) => {
    const bulkBtn = e.target.closest('#btn-delete-selected');
    if (bulkBtn) {
      deleteSelected();
      return;
    }

    const delBtn = e.target.closest('.btn-delete');
    if (delBtn) {
      e.stopPropagation();
      e.preventDefault();
      const id = delBtn.getAttribute('data-id');
      if (!id) return;
      const result = await sendMessage({ action: 'deleteJob', id: Number(id) });
      if (result && result.status === 'deleted') {
        showToast('Entry deleted');
        loadHistory();
      } else {
        showToast('Error deleting entry');
      }
      return;
    }

    const statusBtn = e.target.closest('.btn-status');
    if (statusBtn) {
      e.stopPropagation();
      e.preventDefault();
      const row = statusBtn.closest('.detail-row');
      if (!row) return;
      await markJobStatus(row.getAttribute('data-id'), statusBtn.getAttribute('data-status'));
      return;
    }

    const header = e.target.closest('.company-header');
    if (header) {
      if (e.target.closest('.company-check')) return;
      const details = header.parentElement.querySelector('.company-details');
      if (details) {
        const open = details.style.display !== 'none';
        details.style.display = open ? 'none' : 'block';
        const toggle = header.querySelector('.btn-toggle');
        if (toggle) toggle.textContent = open ? '\u25BE' : '\u25B4';
      }
      return;
    }

    const link = e.target.closest('.detail-title');
    if (link) {
      e.preventDefault();
      if (link.getAttribute('data-url')) openUrl(link.getAttribute('data-url'));
    }
  });

  document.getElementById('history-list').addEventListener('change', (e) => {
    if (e.target.id === 'history-select-all') {
      document.querySelectorAll('#history-list .entry-check').forEach(c => { c.checked = e.target.checked; });
      updateHistorySelection();
      return;
    }
    const companyCheck = e.target.closest('.company-check');
    if (companyCheck) {
      const group = companyCheck.closest('.company-item');
      if (group) {
        group.querySelectorAll('.entry-check').forEach(c => { c.checked = companyCheck.checked; });
      }
      updateHistorySelection();
      return;
    }
    if (e.target.closest('.entry-check')) {
      updateHistorySelection();
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.action === 'pageInfo') loadCurrentPage();
});

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  loadCurrentPage();
  loadProfile();
  updateAuthUI();
  initKeywordUI();
});
