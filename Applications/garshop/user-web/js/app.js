// GarShop User web app
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const userEmail = document.getElementById('userEmail');
const authError = document.getElementById('authError');
const authToggle = document.getElementById('authToggle');
const viewTitle = document.getElementById('viewTitle');
const navToggle = document.getElementById('navToggle');
const sidebar = document.querySelector('.sidebar');

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  cars: 'My Cars',
  issue: 'Report a Problem',
  services: 'Services & Prices',
  checklist: 'Service Checklist',
  book: 'Book Appointment',
  notifications: 'Notifications',
  history: 'Service History'
};

const CHECKLIST_ITEMS = [
  'Engine oil level', 'Engine oil leak', 'Brake pads', 'Brake fluid',
  'Coolant level', 'Battery & terminals', 'Air filter', 'AC cooling',
  'Tyre pressure', 'Tyre tread', 'Headlights & indicators', 'Wiper blades',
  'Suspension / shocks', 'Spark plugs', 'Horn', 'Exhaust smoke'
];

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let currentUser = null;
let profile = null;
let boundGarage = null; // { id, name, ... }
let pendingBindId = null;

// ---------- Pending binding from deep link (?bind_garage_id=N) ----------
const urlParams = new URLSearchParams(location.search);
pendingBindId = urlParams.get('bind_garage_id');
if (pendingBindId) {
  localStorage.setItem('gs_pending_bind', pendingBindId);
}
pendingBindId = pendingBindId || localStorage.getItem('gs_pending_bind');

if (pendingBindId) {
  const note = document.getElementById('pendingBindNote');
  note.hidden = false;
  note.textContent = 'You are about to connect to garage #' + pendingBindId +
    '. Log in or register to confirm the connection.';
}

// ---------- Auth ----------
async function onLogin(e) {
  e.preventDefault();
  authError.textContent = '';
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!email || !password) { authError.textContent = 'Enter email and password'; return; }
  const submitBtn = document.getElementById('authSubmit');
  submitBtn.disabled = true;

  const isRegister = !document.getElementById('nameField').hidden;
  try {
    if (isRegister) {
      const name = document.getElementById('authName').value.trim();
      const phone = document.getElementById('authPhone').value.trim();
      if (!name) throw new Error('Enter your name');
      const { error: signUpError } = await sb.auth.signUp({ email, password });
      if (signUpError) throw new Error(signUpError.message);
      const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(signInError.message);
      const { data: { user } } = await sb.auth.getUser();
      const { error: profError } = await sb.from('gs_profiles').insert({
        user_id: user.id, full_name: name, phone, role: 'user'
      });
      if (profError) throw new Error(profError.message);
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    }
    const { data: { user } } = await sb.auth.getUser();
    if (user) currentUser = user;
    await applyPendingBinding();
    await enterApp();
  } catch (err) {
    authError.textContent = err.message || 'Auth failed';
    submitBtn.disabled = false;
  }
}

async function applyPendingBinding() {
  if (!pendingBindId || !currentUser) return;
  try {
    const gid = Number(pendingBindId);
    const { data: existing } = await sb.from('gs_garage_users')
      .select('garage_id').eq('user_id', currentUser.id).eq('garage_id', gid).maybeSingle();
    if (!existing) {
      await sb.from('gs_garage_users').insert({ user_id: currentUser.id, garage_id: gid });
    }
    localStorage.removeItem('gs_pending_bind');
    pendingBindId = null;
  } catch (err) { console.warn('bind failed', err.message); }
}

async function enterApp() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  currentUser = user;
  userEmail.textContent = user.email;
  loginScreen.hidden = true;
  appScreen.hidden = false;
  await loadView('dashboard');
}

async function loadSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) { currentUser = user; return true; }
  }
  return false;
}

class SessionExpiredError extends Error {
  constructor() {
    super('Session expired. Please log in again.');
    this.name = 'SessionExpiredError';
  }
}

async function ensureSession() {
  const { data: { session } } = await sb.auth.getSession();
  console.log('[ensureSession] session?', !!session, session && { uid: session.user && session.user.id, exp: session.expires_at, ttl: (session.expires_at || 0) - Math.floor(Date.now() / 1000) }, 'currentUser=', currentUser && currentUser.id);
  if (!session) {
    const res = await sb.auth.getUser();
    console.log('[ensureSession] no session; getUser?', res.data && res.data.user && res.data.user.id, res.error && res.error.message);
    if (!res.error && res.data.user && res.data.user.id) { currentUser = res.data.user; return; }
    throw new SessionExpiredError();
  }
  const ttl = (session.expires_at || 0) - Math.floor(Date.now() / 1000);
  if (ttl < 60) {
    const { error } = await sb.auth.refreshSession();
    console.log('[ensureSession] refresh error?', error && error.message);
    if (error) throw new SessionExpiredError();
  }
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  console.log('[ensureSession] getUser?', user && user.id, userErr && userErr.message);
  if (userErr || !user || !user.id) throw new SessionExpiredError();
  currentUser = user;
}

async function handleSubmitError(err) {
  const msg = String((err && err.message) || err || '');
  console.error('[submit] error:', err);
  if (err && err.name === 'SessionExpiredError') {
    forceLogout('Session expired. Please log in again.');
    return;
  }
  if (/row-level security/i.test(msg)) {
    const { data: { session } } = await sb.auth.getSession();
    let userOk = !!(session && session.user);
    if (userOk) {
      const { data: { user }, error: ue } = await sb.auth.getUser();
      userOk = !ue && !!user;
    }
    if (!userOk) { forceLogout('Session expired. Please log in again.'); return; }
  }
  alert('Failed: ' + msg);
}

function forceLogout(msg) {
  currentUser = null; profile = null; boundGarage = null;
  appScreen.hidden = true;
  loginScreen.hidden = false;
  document.getElementById('authForm').reset();
  if (msg) alert(msg);
}

async function getProfile() {
  if (profile && profile.user_id === currentUser.id) return profile;
  const { data, error } = await sb.from('gs_profiles')
    .select('*').eq('user_id', currentUser.id).maybeSingle();
  if (!error && data) profile = data;
  return profile;
}

async function getBoundGarage(force) {
  if (boundGarage && !force) return boundGarage;
  const { data: bindRow } = await sb.from('gs_garage_users')
    .select('garage_id').eq('user_id', currentUser.id).limit(1).maybeSingle();
  if (!bindRow) { boundGarage = null; return null; }
  const { data: g, error } = await sb.from('gs_garages')
    .select('id,name,location,city,phone,description,services_offered,status')
    .eq('id', bindRow.garage_id).maybeSingle();
  if (error || !g) { boundGarage = null; return null; }
  boundGarage = g;
  return g;
}

function onLogout() {
  sb.auth.signOut().then(forceLogout).catch(forceLogout);
}

sb.auth.onAuthStateChange((event) => {
  console.log('[auth event]', event);
  if (event === 'SIGNED_OUT' && currentUser) forceLogout('Session expired. Please log in again.');
});

// ---------- Routing ----------
async function loadView(view) {
  viewTitle.textContent = VIEW_TITLES[view] || 'Dashboard';
  document.querySelectorAll('.side-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.view').forEach(s => (s.hidden = s.id !== 'view-' + view));
  try {
    if (view === 'dashboard') await loadDashboard();
    if (view === 'cars') await loadCars();
    if (view === 'issue') await loadIssue();
    if (view === 'services') await loadServices();
    if (view === 'checklist') await loadChecklist();
    if (view === 'book') await loadBook();
    if (view === 'notifications') await loadNotifications();
    if (view === 'history') await loadHistory();
  } catch (err) { console.error(err); }
  sidebar.classList.remove('open');
}

// ---------- Dashboard ----------
async function loadDashboard() {
  const g = await getBoundGarage(true);
  const card = document.getElementById('garageCard');
  if (g) {
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h3 style="font-size:1.5rem">${g.name}</h3>
          <p style="color:var(--gray-600)">${[g.location, g.city].filter(Boolean).join(', ')}${g.phone ? ' · ' + g.phone : ''}</p>
        </div>
        <span class="badge badge-approved">Connected</span>
      </div>
      <p style="margin-top:10px;color:var(--gray-600)">Your requests, bookings and checklists go to this garage only.</p>`;
  } else {
    card.innerHTML = `
      <h3 style="font-size:1.4rem">Connect to a garage</h3>
      <p style="color:var(--gray-600);margin:8px 0 14px">Enter the garage ID from your garage's page (or open the connect link after installing the app).</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input id="bindInput" type="number" placeholder="Garage ID" style="padding:12px 14px;border:1.5px solid #dbe3ee;border-radius:10px;font-size:1rem;min-width:180px">
        <button class="btn btn-primary" id="bindBtn">Connect</button>
      </div>`;
    document.getElementById('bindBtn').onclick = async () => {
      const gid = document.getElementById('bindInput').value.trim();
      if (!gid) return;
      try {
        const { data: existing } = await sb.from('gs_garage_users')
          .select('garage_id').eq('user_id', currentUser.id).eq('garage_id', gid).maybeSingle();
        if (!existing) {
          await sb.from('gs_garage_users').insert({ user_id: currentUser.id, garage_id: Number(gid) });
        }
        await loadDashboard();
      } catch (err) { alert('Could not connect: ' + err.message); }
    };
  }

  const statGrid = document.getElementById('statGrid');
  try {
    const [cars, issues, checklists, notifs] = await Promise.all([
      sb.from('gs_cars').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id),
      sb.from('gs_issues').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id),
      sb.from('gs_checklists').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id),
      sb.from('gs_notifications').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id).eq('read', false)
    ]);
    statGrid.innerHTML = `
      <div class="stat-card"><h4>${cars.count || 0}</h4><p>My Cars</p></div>
      <div class="stat-card alt"><h4>${issues.count || 0}</h4><p>Issues Reported</p></div>
      <div class="stat-card"><h4>${checklists.count || 0}</h4><p>Checklists</p></div>
      <div class="stat-card warn"><h4>${notifs.count || 0}</h4><p>Unread Notifications</p></div>`;
  } catch (err) { statGrid.innerHTML = ''; }

  const recent = document.getElementById('recentChecklists');
  try {
    const { data } = await sb.from('gs_checklists')
      .select('id,title,status,created_at,gs_checklist_items(item,user_checked,owner_fixed)')
      .eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(5);
    if (!data || data.length === 0) {
      recent.innerHTML = '<tr><td class="empty" colspan="4">No checklists submitted yet.</td></tr>';
      return;
    }
    recent.innerHTML = '<tr><th>#</th><th>Title</th><th>Flagged / Fixed</th><th>Status</th></tr>' + data.map(c => {
      const items = c.gs_checklist_items || [];
      const flagged = items.filter(i => i.user_checked).length;
      const fixed = items.filter(i => i.owner_fixed).length;
      return `<tr>
        <td>#${c.id}</td><td>${c.title}</td>
        <td>${flagged} / ${fixed}</td>
        <td><span class="badge badge-${c.status}">${c.status}</span></td>
      </tr>`;
    }).join('');
  } catch (err) { recent.innerHTML = '<tr><td class="empty" colspan="4">Could not load.</td></tr>'; }
}

// ---------- Cars ----------
async function loadCars() {
  document.getElementById('carForm').onsubmit = async (e) => {
    e.preventDefault();
    const brand = document.getElementById('cBrand').value.trim();
    const model = document.getElementById('cModel').value.trim();
    if (!brand || !model) return;
    try {
      await ensureSession();
      await sb.from('gs_cars').insert({
        user_id: currentUser.id, brand, model,
        year: Number(document.getElementById('cYear').value) || 0
      });
      document.getElementById('carForm').reset();
      await renderCarsTable();
    } catch (err) { handleSubmitError(err); }
  };
  await renderCarsTable();
}

async function renderCarsTable() {
  const table = document.getElementById('carsTable');
  const { data, error } = await sb.from('gs_cars')
    .select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  if (error) { table.innerHTML = '<tr><td class="empty">' + error.message + '</td></tr>'; return; }
  if (!data || data.length === 0) {
    table.innerHTML = '<tr><td class="empty">No cars added yet.</td></tr>';
    return;
  }
  table.innerHTML = '<tr><th>ID</th><th>Car</th><th>Year</th></tr>' + data.map(c =>
    `<tr><td>${c.id}</td><td>${c.brand} ${c.model}</td><td>${c.year || '—'}</td></tr>`
  ).join('');
}

async function renderCarOptions(selectId, selectedId) {
  const { data } = await sb.from('gs_cars')
    .select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  const sel = document.getElementById(selectId);
  if (!data || data.length === 0) {
    sel.innerHTML = '<option value="">No cars yet — add one in My Cars</option>';
    return;
  }
  sel.innerHTML = data.map(c =>
    `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${c.brand} ${c.model} (${c.year || '—'}) · ID ${c.id}</option>`
  ).join('');
}

// ---------- Issue ----------
function getIssueLocation() {
  const map = document.getElementById('iLocMap');
  const hint = document.getElementById('iLocHint');
  const clearBtn = document.getElementById('iLocClear');
  const btn = document.getElementById('iLocBtn');
  btn.disabled = true;
  hint.textContent = 'Getting your location…';

  if (!navigator.geolocation) {
    hint.textContent = 'Location not supported on this device — enter coordinates manually below.';
    btn.disabled = false;
    document.getElementById('iLocManual').hidden = false;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      document.getElementById('iLat').value = lat;
      document.getElementById('iLng').value = lng;
      map.innerHTML = `<iframe src="https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed" loading="lazy" allowfullscreen></iframe>`;
      map.hidden = false;
      clearBtn.hidden = false;
      hint.textContent = `Location set: ${lat}, ${lng}`;
      btn.textContent = '📍 Update Location';
      btn.disabled = false;
    },
    (err) => {
      hint.textContent = 'Could not get location (' + err.message + ') — enter coordinates manually below.';
      document.getElementById('iLocManual').hidden = false;
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function clearIssueLocation() {
  document.getElementById('iLat').value = '';
  document.getElementById('iLng').value = '';
  document.getElementById('iLocMap').hidden = true;
  document.getElementById('iLocMap').innerHTML = '';
  document.getElementById('iLocClear').hidden = true;
  document.getElementById('iLocManual').hidden = true;
  const btn = document.getElementById('iLocBtn');
  btn.textContent = '📍 Send My Location';
  btn.disabled = false;
  document.getElementById('iLocHint').textContent = 'Optional — helps the garage reach you.';
}

document.getElementById('iPhoto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('iPhotoPreview');
  const clearBtn = document.getElementById('iPhotoClear');
  const btn = document.getElementById('iPhotoBtn');
  if (!file) { preview.hidden = true; clearBtn.hidden = true; btn.textContent = '📷 Take / Choose Photo'; return; }
  const reader = new FileReader();
  reader.onload = (ev) => { preview.src = ev.target.result; preview.hidden = false; };
  reader.readAsDataURL(file);
  clearBtn.hidden = false;
  btn.textContent = '📷 Change Photo';
});

function clearIssuePhoto() {
  const input = document.getElementById('iPhoto');
  input.value = '';
  document.getElementById('iPhotoPreview').hidden = true;
  document.getElementById('iPhotoClear').hidden = true;
  document.getElementById('iPhotoBtn').textContent = '📷 Take / Choose Photo';
}

async function loadIssue() {
  const g = await getBoundGarage(true);
  await renderCarOptions('iCar');

  const garageSel = document.getElementById('iGarage');
  if (g) {
    garageSel.innerHTML = `<option value="${g.id}">${g.name} (connected)</option>`;
    document.getElementById('iGarageHint').textContent = 'Locked to your connected garage.';
  } else {
    garageSel.innerHTML = '<option value="">No garage connected</option>';
    document.getElementById('iGarageHint').textContent = 'Connect to a garage to send the problem there.';
  }

  document.getElementById('issueForm').onsubmit = async (e) => {
    e.preventDefault();
    const carId = document.getElementById('iCar').value;
    const title = document.getElementById('iTitle').value.trim();
    if (!carId || !title) return;
    const garageId = document.getElementById('iGarage').value;
    const desc = document.getElementById('iDesc').value.trim();
    const photoFile = document.getElementById('iPhoto').files[0];
    const lat = parseFloat(document.getElementById('iLat').value);
    const lng = parseFloat(document.getElementById('iLng').value);

    try {
      await ensureSession();
      let photoUrl = '';
      if (photoFile) {
        const ext = (photoFile.name.match(/\.([a-zA-Z0-9]+)$/) || [])[1] || 'jpg';
        const path = `${currentUser.id}/${Date.now()}-photo.${ext}`;
        const { error: upErr } = await sb.storage.from('gs_images').upload(path, photoFile, {
          contentType: photoFile.type || 'image/jpeg'
        });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = sb.storage.from('gs_images').getPublicUrl(path);
        photoUrl = pub.publicUrl;
      }
      const payload = {
        user_id: currentUser.id, car_id: Number(carId), title, description: desc,
        photo_url: photoUrl,
        latitude: isFinite(lat) ? lat : null,
        longitude: isFinite(lng) ? lng : null
      };
      if (garageId) payload.garage_id = Number(garageId);
      const { error } = await sb.from('gs_issues').insert(payload);
      if (error) throw new Error(error.message);

      if (garageId && (await sb.from('gs_garages').select('owner_id').eq('id', garageId)).data?.length) {
        const ownerId = (await sb.from('gs_garages').select('owner_id').eq('id', garageId)).data[0].owner_id;
        await sb.from('gs_notifications').insert({
          user_id: ownerId, title: 'New issue reported',
          message: `A user reported: ${title}`, type: 'info'
        });
      }
      document.getElementById('issueForm').reset();
      clearIssuePhoto();
      clearIssueLocation();
      alert('Issue submitted!');
      await renderMyIssues();
    } catch (err) { handleSubmitError(err); }
  };
  await renderMyIssues();
}

async function renderMyIssues() {
  const table = document.getElementById('myIssuesTable');
  const { data, error } = await sb.from('gs_issues')
    .select('id,title,status,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(20);
  if (error) { table.innerHTML = '<tr><td class="empty">' + error.message + '</td></tr>'; return; }
  if (!data || data.length === 0) {
    table.innerHTML = '<tr><td class="empty">No issues reported yet.</td></tr>';
    return;
  }
  table.innerHTML = '<tr><th>ID</th><th>Title</th><th>Status</th><th>Date</th></tr>' + data.map(i =>
    `<tr><td>#${i.id}</td><td>${i.title}</td>
     <td><span class="badge badge-${i.status}">${i.status}</span></td>
     <td>${(i.created_at || '').substring(0, 10)}</td></tr>`
  ).join('');
}

// ---------- Services ----------
async function loadServices() {
  const g = await getBoundGarage(true);
  const intro = document.getElementById('servicesIntro');
  let query = sb.from('gs_garage_services').select('id,name,description,price,category');
  if (g) {
    query = query.eq('garage_id', g.id);
    intro.textContent = `Services & prices at ${g.name}.`;
  } else {
    intro.textContent = 'Services offered by approved garages. Connect to a garage to see its own menu.';
  }
  const { data, error } = await query.order('category');
  const table = document.getElementById('servicesTable');
  if (error) { table.innerHTML = '<tr><td class="empty">' + error.message + '</td></tr>'; return; }
  if (!data || data.length === 0) {
    table.innerHTML = '<tr><td class="empty">No services listed yet. Contact the garage or check back later.</td></tr>';
    return;
  }
  table.innerHTML = '<tr><th>Service</th><th>Category</th><th>Price</th><th></th></tr>' + data.map(s =>
    `<tr><td>${s.name}</td><td>${s.category}</td><td>₹${Number(s.price)}</td>
     <td><button class="btn btn-primary btn-xs" onclick="bookService(${s.id}, '${s.name.replace(/'/g, "\\'")}')">Book</button></td></tr>`
  ).join('');
}

async function bookService(serviceId, serviceName) {
  const g = await getBoundGarage();
  if (!g) { alert('Connect to a garage first to book.'); return; }
  await loadView('book');
  const sel = document.getElementById('bService');
  if (sel.querySelector(`option[value="${serviceId}"]`)) sel.value = serviceId;
  sel.setAttribute('data-preselect', serviceId);
  alert(`Booking ${serviceName} — pick date & time below.`);
}

// ---------- Checklist ----------
async function loadChecklist() {
  const g = await getBoundGarage(true);
  if (!g) {
    document.getElementById('checklistForm').innerHTML = '<p class="hint">Connect to a garage first. Your checklist goes to your garage.</p>';
    document.getElementById('checklistsContainer').innerHTML = '<div class="hint">—</div>';
    await renderChecklistHistory();
    return;
  }
  await renderCarOptions('kCar');

  const container = document.getElementById('checklistItems');
  const { data: catalog } = await sb.from('gs_garage_services')
    .select('id, name')
    .eq('garage_id', g.id)
    .order('name');
  const items = (catalog && catalog.length)
    ? catalog
    : CHECKLIST_ITEMS.map(name => ({ id: null, name }));
  container.innerHTML = items.map(s =>
    `<label class="check-item"><input type="checkbox" data-sid="${s.id || ''}" value="${escapeHtml(s.name)}"> <span>${escapeHtml(s.name)}</span></label>`
  ).join('');

  document.getElementById('checklistForm').onsubmit = async (e) => {
    e.preventDefault();
    const carId = document.getElementById('kCar').value;
    if (!carId) { alert('Select your car first'); return; }
    try { await ensureSession(); } catch (err) { forceLogout(err.message); return; }
    const items = Array.from(container.querySelectorAll('input[type=checkbox]')).map(cb => ({
      item: cb.value, checked: cb.checked, service_id: cb.dataset.sid || null
    }));
    const notes = document.getElementById('kNotes').value.trim();
    const { data, error } = await sb.rpc('gs_submit_checklist', {
      p_garage_id: g.id, p_car_id: Number(carId), p_title: 'Pre-Service Checklist',
      p_items: items, p_notes: notes
    });
    if (error) { handleSubmitError(error); return; }
    alert('Checklist submitted to your garage!');
    container.querySelectorAll('input[type=checkbox]').forEach(cb => (cb.checked = false));
    document.getElementById('kNotes').value = '';
    await renderChecklistHistory();
    await loadDashboard();
  };
  await renderChecklistHistory();
}

async function renderChecklistHistory() {
  const container = document.getElementById('checklistsContainer');
  const { data, error } = await sb.from('gs_checklists')
    .select('id,title,status,created_at,gs_checklist_items(item,user_checked,owner_fixed)')
    .eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(30);
  if (error) { container.innerHTML = '<p class="hint">Could not load.</p>'; return; }
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="hint">No checklists submitted yet.</p>';
    return;
  }
  container.innerHTML = data.map(c => {
    const items = c.gs_checklist_items || [];
    const flagged = items.filter(i => i.user_checked).length;
    const fixed = items.filter(i => i.owner_fixed).length;
    return `
      <div class="panel" style="padding:16px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <strong>#${c.id} · ${c.title}</strong>
          <span class="badge badge-${c.status}">${c.status}</span>
        </div>
        <p class="hint" style="margin-top:6px">Submitted ${(c.created_at || '').substring(0, 10)} · Flagged ${flagged} item(s) · Fixed ${fixed} by garage</p>
      </div>`;
  }).join('');
}

// ---------- Book ----------
async function loadBook() {
  const g = await getBoundGarage(true);
  await renderCarOptions('bCar');
  const garageSel = document.getElementById('bGarage');
  if (g) {
    garageSel.innerHTML = `<option value="${g.id}">${g.name} (connected)</option>`;
  } else {
    garageSel.innerHTML = '<option value="">No garage connected</option>';
  }

  const svcSel = document.getElementById('bService');
  document.getElementById('bDate').min = new Date().toISOString().substring(0, 10);
  const { data: services } = await sb.from('gs_garage_services')
    .select('id,name,price').eq('garage_id', g ? g.id : 0);
  svcSel.innerHTML = '<option value="">— Any —</option>' + (services || []).map(s =>
    `<option value="${s.id}">${s.name} (₹${Number(s.price)})</option>`).join('');
  const preselect = svcSel.getAttribute('data-preselect');
  if (preselect && svcSel.querySelector(`option[value="${preselect}"]`)) {
    svcSel.value = preselect;
    svcSel.removeAttribute('data-preselect');
  }

  document.getElementById('bookForm').onsubmit = async (e) => {
    e.preventDefault();
    const garageId = garageSel.value;
    const carId = document.getElementById('bCar').value;
    const date = document.getElementById('bDate').value;
    const time = document.getElementById('bTime').value;
    if (!garageId || !carId || !date || !time) { alert('Garage, car and date/time required'); return; }
    const scheduledAt = `${date}T${time}:00`;
    try {
      await ensureSession();
      const payload = {
        user_id: currentUser.id, garage_id: Number(garageId), car_id: Number(carId),
        scheduled_at: scheduledAt, notes: document.getElementById('bNotes').value.trim()
      };
      const serviceId = document.getElementById('bService').value;
      if (serviceId) payload.service_id = Number(serviceId);
      const { error } = await sb.from('gs_appointments').insert(payload);
      if (error) throw new Error(error.message);

      const { data: gInfo } = await sb.from('gs_garages').select('owner_id').eq('id', garageId).maybeSingle();
      if (gInfo) {
        await sb.from('gs_notifications').insert({
          user_id: gInfo.owner_id, title: 'New appointment',
          message: 'A user booked an appointment at your garage.', type: 'info'
        });
      }
      document.getElementById('bookForm').reset();
      document.getElementById('bGarage').innerHTML = garageSel.innerHTML;
      alert('Appointment booked!');
      await loadBook();
    } catch (err) { handleSubmitError(err); }
  };
}

// ---------- Notifications ----------
async function loadNotifications() {
  const container = document.getElementById('notificationsContainer');
  const { data, error } = await sb.from('gs_notifications')
    .select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50);
  if (error) { container.innerHTML = '<p class="hint">Could not load.</p>'; return; }
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="hint">No notifications.</p>';
    return;
  }
  container.innerHTML = data.map(n => `
    <div class="panel" style="padding:16px;margin-bottom:12px;border-left:4px solid ${
      n.type === 'success' ? 'var(--green)' : n.type === 'warning' ? 'var(--amber)' : 'var(--blue)'
    }">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <strong>${n.title}</strong><span class="hint">${(n.created_at || '').substring(0, 10)}</span>
      </div>
      <p style="margin-top:6px;color:var(--gray-600)">${n.message}</p>
    </div>`).join('');
  await sb.from('gs_notifications').update({ read: true }).eq('user_id', currentUser.id).eq('read', false);
}

// ---------- History ----------
async function loadHistory() {
  const container = document.getElementById('historyContainer');
  const [issues, appts, checklists] = await Promise.all([
    sb.from('gs_issues').select('id,title,status,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
    sb.from('gs_appointments').select('id,scheduled_at,status').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
    sb.from('gs_checklists').select('id,title,status,created_at,gs_checklist_items(owner_fixed)').eq('user_id', currentUser.id).order('created_at', { ascending: false })
  ]);
  let html = '<h3 style="margin-bottom:10px">Reported Issues</h3>';
  if (!issues.data || issues.data.length === 0) html += '<p class="hint">No issues reported.</p>';
  else html += issues.data.map(i => `<div class="panel" style="padding:14px;margin-bottom:10px"><strong>${i.title}</strong> <span class="badge badge-${i.status}" style="margin-left:8px">${i.status}</span><p class="hint" style="margin-top:4px">${(i.created_at || '').substring(0, 10)}</p></div>`).join('');

  html += '<h3 style="margin:24px 0 10px">Appointments</h3>';
  if (!appts.data || appts.data.length === 0) html += '<p class="hint">No appointments.</p>';
  else html += appts.data.map(a => `<div class="panel" style="padding:14px;margin-bottom:10px"><strong>Appointment</strong> <span class="badge badge-${a.status}" style="margin-left:8px">${a.status}</span><p class="hint" style="margin-top:4px">${(a.scheduled_at || '').replace('T', ' ')}</p></div>`).join('');

  html += '<h3 style="margin:24px 0 10px">Checklists</h3>';
  if (!checklists.data || checklists.data.length === 0) html += '<p class="hint">No checklists.</p>';
  else html += checklists.data.map(c => {
    const fixed = (c.gs_checklist_items || []).filter(i => i.owner_fixed).length;
    return `<div class="panel" style="padding:14px;margin-bottom:10px"><strong>#${c.id} ${c.title}</strong> <span class="badge badge-${c.status}" style="margin-left:8px">${c.status}</span><p class="hint" style="margin-top:4px">${(c.created_at || '').substring(0, 10)} · ${fixed} fixed by garage</p></div>`;
  }).join('');

  container.innerHTML = html;
}

// ---------- Init ----------
async function init() {
  if (await loadSession()) {
    await applyPendingBinding();
    await enterApp();
  }
}

document.getElementById('authForm').addEventListener('submit', onLogin);
document.getElementById('authToggle').addEventListener('click', () => {
  const isRegister = document.getElementById('nameField').hidden;
  document.getElementById('nameField').hidden = isRegister;
  document.getElementById('phoneField').hidden = isRegister;
  document.getElementById('authSubmit').textContent = isRegister ? 'Register' : 'Login';
  authToggle.textContent = isRegister ? 'Already have an account? Login' : 'New user? Register';
});
document.getElementById('logoutBtn').addEventListener('click', onLogout);
navToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.side-nav a').forEach(a =>
  a.addEventListener('click', (e) => { e.preventDefault(); loadView(a.dataset.view); }));

init();
