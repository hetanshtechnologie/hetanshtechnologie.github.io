const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;

// ---------- Supabase Auth (email + password) ----------
let memorySession = null;
let sessionPersistent = false;

function getStoredSession() {
  if (memorySession) return Promise.resolve(memorySession);
  return new Promise(resolve => {
    chrome.storage.local.get('authSession', data => {
      const session = data.authSession || null;
      if (session) sessionPersistent = true;
      resolve(session);
    });
  });
}

function setStoredSession(session, remember) {
  memorySession = session;
  sessionPersistent = !!remember;
  if (remember) {
    return new Promise(resolve => {
      chrome.storage.local.set({ authSession: session }, resolve);
    });
  }
  return new Promise(resolve => {
    chrome.storage.local.remove('authSession', resolve);
  });
}

function clearStoredSession() {
  memorySession = null;
  sessionPersistent = false;
  return new Promise(resolve => {
    chrome.storage.local.remove('authSession', resolve);
  });
}

function extractSession(data) {
  const now = Date.now();
  const expiresAt = data.expires_at ? data.expires_at * 1000 : now + ((data.expires_in || 3600) * 1000);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    user: data.user || null
  };
}

async function refreshSession(session) {
  try {
    const resp = await fetch(`${SUPABASE_AUTH_URL}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify({
        refresh_token: session.refresh_token
      })
    });
    if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
    const data = await resp.json();
    const refreshed = extractSession(data);
    await setStoredSession(refreshed, sessionPersistent);
    return refreshed;
  } catch (err) {
    console.error('Session refresh error:', err);
    await clearStoredSession();
    return null;
  }
}

async function getValidSession() {
  const session = await getStoredSession();
  if (!session || !session.access_token) return null;
  if (session.expires_at && Date.now() > session.expires_at - 60000) {
    if (!session.refresh_token) {
      await clearStoredSession();
      return null;
    }
    return refreshSession(session);
  }
  return session;
}

async function signIn(email, password, remember) {
  const resp = await fetch(`${SUPABASE_AUTH_URL}/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY
    },
    body: JSON.stringify({ email, password })
  });
  if (!resp.ok) {
    let msg = `Login failed (${resp.status})`;
    try {
      const err = await resp.json();
      if (err.msg) msg = err.msg;
      if (err.error_description) msg = err.error_description;
    } catch (e) { /* ignore */ }
    throw new Error(msg);
  }

  const data = await resp.json();
  const session = extractSession(data);
  await setStoredSession(session, remember !== false);
  return session;
}

async function signOut() {
  const session = await getStoredSession();
  if (session && session.access_token) {
    try {
      await fetch(`${SUPABASE_AUTH_URL}/logout`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + session.access_token }
      });
    } catch (e) { /* ignore */ }
  }
  await clearStoredSession();
}

// ---------- Supabase REST ----------
async function getAuthHeaders(extraHeaders) {
  const session = await getValidSession();
  const headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  headers['Authorization'] = 'Bearer ' + (session ? session.access_token : SUPABASE_KEY);
  return headers;
}

async function supabaseGet(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const resp = await fetch(url, { headers: await getAuthHeaders() });
  if (!resp.ok) throw new Error(`Supabase GET error: ${resp.status}`);
  return resp.json();
}

async function supabasePost(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(`Supabase POST error: ${resp.status}`);
  return resp.json();
}

async function supabaseUpsert(table, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(`Supabase UPSERT error: ${resp.status}`);
  return resp.json();
}

async function supabaseUpdate(table, body, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: await getAuthHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(`Supabase PATCH error: ${resp.status}`);
  const text = await resp.text();
  return text ? JSON.parse(text) : [];
}

async function supabaseDelete(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });
  if (!resp.ok) throw new Error(`Supabase DELETE error: ${resp.status}`);
  return true;
}

function extractCompanyFromUrl(url) {
  const hostname = new URL(url).hostname.replace('www.', '');
  const domainMap = {
    'linkedin.com': 'LinkedIn',
    'indeed.com': 'Indeed',
    'glassdoor.com': 'Glassdoor',
    'naukri.com': 'Naukri',
    'wellfound.com': 'Wellfound',
    'angel.co': 'AngelList',
    'dice.com': 'Dice',
    'ziprecruiter.com': 'ZipRecruiter',
    'monster.com': 'Monster',
    'careerbuilder.com': 'CareerBuilder',
    'greenhouse.io': 'Greenhouse',
    'lever.co': 'Lever',
    'workday.com': 'Workday',
    'icims.com': 'iCIMS',
    'smartrecruiters.com': 'SmartRecruiters',
    'ashbyhq.com': 'Ashby',
    'bamboohr.com': 'BambooHR',
    'jazz.co': 'JazzHR',
    'successfactors.com': 'SuccessFactors',
    'myworkdayjobs.com': 'Workday'
  };
  for (const [domain, name] of Object.entries(domainMap)) {
    if (hostname.includes(domain)) return name;
  }
  const parts = hostname.split('.');
  return parts.length > 2 ? parts[parts.length - 2] : parts[0];
}

async function trackJobApplication(tabId, url, title, extra = {}) {
  try {
    const company = extra.company || extractCompanyFromUrl(url);
    const jobTitle = title || '';

    const existing = await supabaseGet('job_tracker', `job_url=eq.${encodeURIComponent(url)}&limit=1`);

    if (existing && existing.length > 0) {
      const row = existing[0];
      const updates = {};
      if (extra.company) updates.company_name = extra.company;
      if (jobTitle && (!row.job_title || jobTitle !== row.job_title)) updates.job_title = jobTitle;
      if (extra.location) updates.location = extra.location;
      if (extra.salary) updates.salary_expected = extra.salary;
      if (extra.jobType) updates.job_type = extra.jobType;

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabaseUpdate('job_tracker', updates, `job_url=eq.${encodeURIComponent(url)}`);
      }
      return { status: 'already_tracked', data: { ...row, ...updates } };
    }

    const session = await getValidSession();
    const result = await supabasePost('job_tracker', {
      company_name: company,
      job_title: jobTitle,
      job_url: url,
      user_id: session ? session.user.id : null,
      location: extra.location || '',
      salary_expected: extra.salary || '',
      job_type: extra.jobType || '',
      applied: false,
      status: 'visited',
      visited_at: new Date().toISOString()
    });

    return { status: 'tracked', data: result[0] };
  } catch (err) {
    console.error('Track job error:', err);
    return { status: 'error', message: err.message };
  }
}

async function updateJob(url, fields) {
  try {
    const existing = await supabaseGet('job_tracker', `job_url=eq.${encodeURIComponent(url)}&limit=1`);
    const allowed = ['company_name', 'job_title', 'location', 'salary_expected', 'job_type', 'notes', 'status', 'applied'];
    const body = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) body[key] = fields[key];
    }

    if (existing && existing.length > 0) {
      body.updated_at = new Date().toISOString();
      const result = await supabaseUpdate('job_tracker', body, `job_url=eq.${encodeURIComponent(url)}`);
      return { status: 'updated', data: result[0] };
    }

    const session = await getValidSession();
    const result = await supabasePost('job_tracker', {
      ...body,
      job_url: url,
      user_id: session ? session.user.id : null,
      applied: body.applied === undefined ? false : body.applied,
      status: body.status || 'visited',
      visited_at: new Date().toISOString()
    });
    return { status: 'saved', data: result[0] };
  } catch (err) {
    console.error('Update job error:', err);
    return { status: 'error', message: err.message };
  }
}

async function markApplied(url) {
  try {
    const result = await supabaseUpdate('job_tracker',
      { applied: true, status: 'applied', applied_at: new Date().toISOString() },
      `job_url=eq.${encodeURIComponent(url)}`
    );
    return { status: 'ok', data: result[0] };
  } catch (err) {
    console.error('Mark applied error:', err);
    return { status: 'error', message: err.message };
  }
}

async function setJobStatus(id, status) {
  try {
    const applied = status === 'applied';
    const body = { status: applied ? 'applied' : 'visited', applied };
    if (applied) body.applied_at = new Date().toISOString();
    const result = await supabaseUpdate('job_tracker', body, `id=eq.${id}`);
    return { status: 'ok', data: result[0] };
  } catch (err) {
    console.error('Set job status error:', err);
    return { status: 'error', message: err.message };
  }
}

async function deleteJob(id) {
  try {
    await supabaseDelete('job_tracker', `id=eq.${id}`);
    return { status: 'deleted' };
  } catch (err) {
    console.error('Delete job error:', err);
    return { status: 'error', message: err.message };
  }
}

async function getJobStatus(url) {
  try {
    const data = await supabaseGet('job_tracker', `job_url=eq.${encodeURIComponent(url)}&limit=1`);
    if (data && data.length > 0) {
      return { found: true, data: data[0] };
    }
    return { found: false };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

async function getAllApplications() {
  try {
    const data = await supabaseGet('job_tracker', 'order=visited_at.desc&limit=500');
    return data || [];
  } catch (err) {
    console.error('Get all applications error:', err);
    return [];
  }
}

async function getCompanyApplied(company) {
  try {
    if (!company) return { found: false };
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await supabaseGet('job_tracker',
      `company_name=ilike.${encodeURIComponent(company)}&applied=eq.true&status=eq.applied&visited_at=gte.${since}&limit=5`);
    return { found: !!(data && data.length > 0), data: data || [] };
  } catch (err) {
    console.error('Check company applied error:', err);
    return { found: false, error: err.message };
  }
}

async function getCompanyVisited(company) {
  try {
    if (!company) return { found: false };
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const data = await supabaseGet('job_tracker',
      `company_name=ilike.${encodeURIComponent(company)}&visited_at=gte.${since}&limit=5`);
    return { found: !!(data && data.length > 0), data: data || [] };
  } catch (err) {
    console.error('Check company visited error:', err);
    return { found: false, error: err.message };
  }
}

async function getProfileData() {
  try {
    const data = await supabaseGet('job_profile', 'limit=1');
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    return null;
  }
}

async function saveProfileData(profile) {
  try {
    const session = await getValidSession();
    if (!session) return { error: 'Please login first' };
    const existing = await getProfileData();
    const payload = {
      full_name: profile.fullName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      linked_in: profile.linkedIn || '',
      resume_url: profile.resumeUrl || '',
      website: profile.website || '',
      cover_letter: profile.coverLetter || '',
      user_id: session.user.id
    };
    if (existing) {
      return await supabaseUpdate('job_profile', payload, `id=eq.${existing.id}`);
    }
    return await supabasePost('job_profile', payload);
  } catch (err) {
    return { error: err.message };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'login') {
    signIn(request.email, request.password, request.remember !== false)
      .then(session => sendResponse({ status: 'ok', user: session.user }))
      .catch(err => sendResponse({ status: 'error', message: err.message }));
    return true;
  }

  if (request.action === 'logout') {
    signOut().then(() => sendResponse({ status: 'ok' }));
    return true;
  }

  if (request.action === 'getAuthStatus') {
    getValidSession()
      .then(session => sendResponse({
        status: session ? 'logged_in' : 'logged_out',
        user: session ? session.user : null
      }))
      .catch(() => sendResponse({ status: 'logged_out', user: null }));
    return true;
  }

  if (request.action === 'getPageInfo') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].id) {
        sendResponse({ error: 'no active tab', hasForm: false, url: null });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageInfo' }, response => {
        if (chrome.runtime.lastError || !response) {
          sendResponse({
            company: null,
            jobTitle: null,
            location: null,
            salary: null,
            jobType: null,
            hasForm: false,
            url: tabs[0].url
          });
        } else {
          sendResponse(response);
        }
      });
    });
    return true;
  }

  if (request.action === 'trackJob') {
    trackJobApplication(request.tabId, request.url, request.title, {
      company: request.company,
      location: request.location,
      salary: request.salary,
      jobType: request.jobType
    })
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'updateJob') {
    updateJob(request.url, request.fields || {})
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'markApplied') {
    markApplied(request.url)
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'setJobStatus') {
    setJobStatus(request.id, request.status)
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'deleteJob') {
    deleteJob(request.id)
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'getStatus') {
    getJobStatus(request.url)
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'getAllApplications') {
    getAllApplications()
      .then(data => sendResponse({ data }));
    return true;
  }

  if (request.action === 'checkCompanyApplied') {
    getCompanyApplied(request.company)
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'checkCompanyVisited') {
    getCompanyVisited(request.company)
      .then(result => sendResponse(result));
    return true;
  }

  if (request.action === 'getProfile') {
    getProfileData()
      .then(profile => sendResponse({ profile }));
    return true;
  }

  if (request.action === 'saveProfile') {
    saveProfileData(request.profile)
      .then(result => sendResponse({ result }));
    return true;
  }

  if (request.action === 'fillForm') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'autofill',
          profile: request.profile
        }, response => sendResponse(response));
      }
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const trackingSites = [
      'linkedin.com/jobs', 'indeed.com', 'glassdoor.com',
      'greenhouse.io', 'lever.co', 'workday.com', 'naukri.com',
      'ashbyhq.com', 'smartrecruiters.com', 'icims.com',
      'bamboohr.com', 'myworkdayjobs.com'
    ];

    if (trackingSites.some(site => tab.url.includes(site))) {
      trackJobApplication(tabId, tab.url, tab.title);
    }
  }
});
