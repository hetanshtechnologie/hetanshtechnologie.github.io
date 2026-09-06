// GarShop Admin app
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const adminEmail = document.getElementById('adminEmail');
const loginError = document.getElementById('loginError');
const viewTitle = document.getElementById('viewTitle');
const navToggle = document.getElementById('navToggle');
const sidebar = document.querySelector('.sidebar');

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  garages: 'Manage Garages',
  users: 'All Users',
  'garage-users': 'Garage ↔ Users',
  appointments: 'Appointments',
  issues: 'Car Issues & Repair Status',
  reminders: 'Service Reminders'
};

let currentUser = null;
let currentAdminRole = false;

// ---------- Auth ----------
async function onLogin(e) {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = error.message;
    return;
  }
  currentUser = data.user;
  await verifyAdmin();
}

async function verifyAdmin() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('gs_profiles')
    .select('role, full_name')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error || !data || data.role !== 'admin') {
    await sb.auth.signOut();
    loginError.textContent = 'Access denied: not an admin account.';
    currentUser = null;
    return;
  }
  currentAdminRole = true;
  adminEmail.textContent = currentUser.email;
  loginScreen.hidden = true;
  appScreen.hidden = false;
  await loadView('dashboard');
}

function onLogout() {
  sb.auth.signOut().then(() => {
    currentUser = null;
    appScreen.hidden = true;
    loginScreen.hidden = false;
    document.getElementById('loginForm').reset();
  });
}

// ---------- Routing ----------
async function loadView(view) {
  viewTitle.textContent = VIEW_TITLES[view] || 'Dashboard';
  document.querySelectorAll('.side-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.view').forEach(s => (s.hidden = s.id !== 'view-' + view));

  try {
    if (view === 'dashboard') await loadDashboard();
    if (view === 'garages') await loadGarages();
    if (view === 'users') await loadUsers();
    if (view === 'garage-users') await loadGarageUsers();
    if (view === 'appointments') await loadAppointments();
    if (view === 'issues') await loadIssues();
    if (view === 'reminders') await loadReminders();
  } catch (err) {
    console.error(err);
  }
  sidebar.classList.remove('open');
}

// ---------- Dashboard ----------
async function loadDashboard() {
  const { data: res } = await sb.rpc('gs_analytics');
  const a = Array.isArray(res) ? res[0] : res;
  const stats = [
    { label: 'Total Garages', value: a?.total_garages ?? 0 },
    { label: 'Approved Garages', value: a?.approved_garages ?? 0, cls: 'alt' },
    { label: 'Pending Approval', value: a?.pending_garages ?? 0, cls: 'warn' },
    { label: 'Total Users', value: a?.total_users ?? 0 },
    { label: 'Garage Owners', value: a?.total_owners ?? 0, cls: 'alt' },
    { label: 'Appointments', value: a?.total_appointments ?? 0 },
    { label: 'Issues In Progress', value: a?.issues_in_progress ?? 0, cls: 'warn' },
    { label: 'Issues Completed', value: a?.issues_completed ?? 0, cls: 'alt' },
    { label: 'Reminders Sent', value: a?.total_reminders ?? 0 },
  ];

  document.getElementById('statGrid').innerHTML = stats.map(s =>
    `<div class="stat-card ${s.cls || ''}"><h4>${s.value}</h4><p>${s.label}</p></div>`).join('');

  const { data: recent } = await sb.from('gs_appointments')
    .select('id, scheduled_at, status, notes, gs_cars!inner(brand, model), gs_garages!inner(name)')
    .order('created_at', { ascending: false }).limit(8);

  renderRecentAppointments(recent || []);
}

function renderRecentAppointments(rows) {
  const t = document.getElementById('recentAppointments');
  if (!rows.length) {
    t.innerHTML = '<tr><td class="empty" colspan="4">No appointments yet.</td></tr>';
    return;
  }
  t.innerHTML = `
    <thead><tr><th>Car</th><th>Garage</th><th>Scheduled</th><th>Status</th></tr></thead>
    <tbody>
      ${rows.map(r => `
        <tr>
          <td>${r.gs_cars.brand} ${r.gs_cars.model}</td>
          <td>${r.gs_garages.name}</td>
          <td>${new Date(r.scheduled_at).toLocaleString()}</td>
          <td><span class="badge badge-${r.status}">${r.status}</span></td>
        </tr>`).join('')}
    </tbody>`;
}

// ---------- Garages ----------
async function loadGarages() {
  const { data } = await sb.from('gs_garages')
    .select('*')
    .order('created_at', { ascending: false });
  const { data: profiles } = await sb.from('gs_profiles').select('user_id, full_name, phone');
  const ownerMap = new Map((profiles || []).map(p => [p.user_id, p]));
  const t = document.getElementById('garagesTable');

  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="6">No garages registered.</td></tr>';
    return;
  }
  t.innerHTML = `
    <thead><tr><th>Name</th><th>Owner</th><th>Location</th><th>Services</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      ${data.map(g => {
        const owner = ownerMap.get(g.owner_id) || {};
        return `
        <tr>
          <td><strong>${g.name}</strong><br><small style="color:#8aa0b8">${g.phone || ''}</small><br><a href="../garage.html?id=${g.id}" target="_blank">Public page ↗</a></td>
          <td>${owner.full_name || '—'}<br><small style="color:#8aa0b8">${owner.phone || ''}</small></td>
          <td>${g.location}<br><small style="color:#8aa0b8">${g.city || ''}</small></td>
          <td style="max-width:220px">${g.services_offered || '—'}</td>
          <td><span class="badge badge-${g.status}">${g.status}</span></td>
          <td><div class="actions">
            ${g.status !== 'approved' ? `<button class="btn btn-xs btn-success" onclick="garageAction(${g.id},'approved')">Approve</button>` : ''}
            ${g.status !== 'suspended' ? `<button class="btn btn-xs btn-warn" onclick="garageAction(${g.id},'suspended')">Suspend</button>` : ''}
            <button class="btn btn-xs btn-danger" onclick="garageAction(${g.id},'deleted')">Delete</button>
          </div></td>
        </tr>`;
      }).join('')}
    </tbody>`;
}

async function garageAction(id, status) {
  if (status === 'deleted' && !confirm('Delete this garage permanently?')) return;
  const { error } = await sb.from('gs_garages').update({ status }).eq('id', id);
  if (!error) loadGarages();
  else alert(error.message);
}

// ---------- Add Garage (admin) ----------
let allAdminUsers = [];

async function loadAdminUsers() {
  const { data } = await sb.rpc('gs_admin_users');
  allAdminUsers = data || [];
  return allAdminUsers;
}

async function openGarageModal() {
  document.getElementById('garageModalError').textContent = '';
  document.getElementById('garageModalForm').reset();
  document.getElementById('gmNewOwner').checked = false;
  toggleNewOwner();
  await loadAdminUsers();
  const sel = document.getElementById('gmOwner');
  sel.innerHTML = allAdminUsers
    .filter(u => u.role !== 'admin')
    .map(u => `<option value="${u.user_id}">${u.full_name || '—'} (${u.email || u.user_id})</option>`)
    .join('');
  if (currentUser) sel.value = currentUser.id;
  document.getElementById('garageModal').hidden = false;
}

function toggleNewOwner() {
  const isNew = document.getElementById('gmNewOwner').checked;
  document.getElementById('newOwnerFields').hidden = !isNew;
  document.getElementById('existingOwnerField').hidden = isNew;
}

function closeGarageModal() {
  document.getElementById('garageModal').hidden = true;
}

async function submitGarageModal(e) {
  e.preventDefault();
  const err = document.getElementById('garageModalError');
  err.textContent = '';

  let ownerId = document.getElementById('gmOwner').value;
  let createdOwnerEmail = '';

  if (document.getElementById('gmNewOwner').checked) {
    const name = document.getElementById('gmOwnerName').value.trim();
    const email = document.getElementById('gmOwnerEmail').value.trim();
    const phone = document.getElementById('gmOwnerPhone').value.trim();
    const password = document.getElementById('gmOwnerPassword').value;
    if (!name || !email || !password) {
      err.textContent = 'Owner name, email and password are required to create a new owner.';
      return;
    }
    const { data, error } = await sb.rpc('gs_admin_create_owner', {
      p_email: email,
      p_password: password,
      p_full_name: name,
      p_phone: phone
    });
    if (error) { err.textContent = error.message; return; }
    ownerId = data;
    createdOwnerEmail = email;
  }

  const obj = {
    name: document.getElementById('gmName').value.trim(),
    location: document.getElementById('gmLocation').value.trim(),
    city: document.getElementById('gmCity').value.trim(),
    phone: document.getElementById('gmPhone').value.trim(),
    description: document.getElementById('gmDescription').value.trim(),
    services_offered: document.getElementById('gmServices').value.trim(),
    owner_id: ownerId,
    status: document.getElementById('gmStatus').value
  };
  if (!obj.name || !obj.location) { err.textContent = 'Garage name and location are required.'; return; }
  if (!obj.owner_id) { err.textContent = 'Select an owner for this garage.'; return; }
  const { error } = await sb.from('gs_garages').insert(obj);
  if (error) { err.textContent = error.message; return; }
  closeGarageModal();
  if (createdOwnerEmail) alert('New owner account created for ' + createdOwnerEmail);
  await loadGarages();
}

document.getElementById('garageModalForm').addEventListener('submit', submitGarageModal);

// ---------- Add User (admin) ----------
function openUserModal() {
  document.getElementById('userModalError').textContent = '';
  document.getElementById('userModalForm').reset();
  document.getElementById('umRole').value = 'user';
  document.getElementById('userModal').hidden = false;
}

function closeUserModal() {
  document.getElementById('userModal').hidden = true;
}

async function submitUserModal(e) {
  e.preventDefault();
  const err = document.getElementById('userModalError');
  err.textContent = '';
  const name = document.getElementById('umName').value.trim();
  const email = document.getElementById('umEmail').value.trim();
  const phone = document.getElementById('umPhone').value.trim();
  const role = document.getElementById('umRole').value;
  const password = document.getElementById('umPassword').value;
  if (!name || !email || !password) { err.textContent = 'Name, email and password are required.'; return; }

  const { data, error } = await sb.rpc('gs_admin_create_user', {
    p_email: email,
    p_password: password,
    p_full_name: name,
    p_phone: phone,
    p_role: role
  });
  if (error) { err.textContent = error.message; return; }
  closeUserModal();
  alert('User account created for ' + email + ' (' + role + ')');
  await loadUsers();
}

document.getElementById('userModalForm').addEventListener('submit', submitUserModal);

// ---------- Users ----------
async function loadUsers() {
  const { data } = await sb.rpc('gs_admin_users');
  const t = document.getElementById('usersTable');
  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="4">No users registered.</td></tr>';
    return;
  }
  t.innerHTML = `
    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
    <tbody>
      ${data.map(u => `
        <tr>
          <td><strong>${u.full_name || '—'}</strong></td>
          <td>${u.email || '—'}</td>
          <td>${u.phone || '—'}</td>
          <td><span class="badge badge-${u.role === 'admin' ? 'confirmed' : u.role === 'owner' ? 'in_progress' : 'scheduled'}">${u.role}</span></td>
        </tr>`).join('')}
    </tbody>`;
}

// ---------- Garage Users ----------
let bindGarages = [];
let bindUsers = [];

async function populateBindGarages() {
  const { data } = await sb.from('gs_garages')
    .select('id, name, status')
    .order('name');
  bindGarages = data || [];
  const sel = document.getElementById('bindGarageSelect');
  const prev = sel.value;
  sel.innerHTML = bindGarages.map(g =>
    `<option value="${g.id}">${g.name} (${g.status})</option>`).join('');
  if (prev) sel.value = prev;
  await populateBindUsers();
}

async function populateBindUsers() {
  const { data: users } = await sb.rpc('gs_admin_users');
  bindUsers = (users || []).filter(u => u.role !== 'admin');
  const sel = document.getElementById('bindUserSelect');
  const gid = Number(document.getElementById('bindGarageSelect').value);

  const { data: bound } = await sb.rpc('gs_admin_garage_users');
  const boundIds = new Set((bound || [])
    .filter(r => r.garage_id === gid)
    .map(r => r.user_id));

  sel.innerHTML = bindUsers
    .filter(u => !boundIds.has(u.user_id))
    .map(u => `<option value="${u.user_id}">${u.full_name || '—'} (${u.email || u.user_id})</option>`)
    .join('');
}

async function bindUserToGarage() {
  const garageId = Number(document.getElementById('bindGarageSelect').value);
  const userId = document.getElementById('bindUserSelect').value;
  if (!garageId || !userId) { alert('Select a garage and a user.'); return; }
  const { error } = await sb.from('gs_garage_users').insert({ garage_id: garageId, user_id: userId });
  if (error) { alert(error.message); return; }
  await Promise.all([loadGarageUsers(), populateBindUsers()]);
}

async function unbindUser(garageId, userId) {
  if (!confirm('Remove this user from this garage?')) return;
  const { error } = await sb.from('gs_garage_users')
    .delete()
    .eq('garage_id', garageId)
    .eq('user_id', userId);
  if (error) { alert(error.message); return; }
  await Promise.all([loadGarageUsers(), populateBindUsers()]);
}

async function loadGarageUsers() {
  await populateBindGarages();
  const { data } = await sb.rpc('gs_admin_garage_users');
  const t = document.getElementById('garageUsersTable');

  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="6">No users connected to any garage yet. Add a user from the dropdown above, or when a user installs the app from a garage\u2019s page they appear here.</td></tr>';
    return;
  }

  const byGarage = new Map();
  data.forEach(r => {
    if (!byGarage.has(r.garage_id)) byGarage.set(r.garage_id, []);
    byGarage.get(r.garage_id).push(r);
  });

  t.innerHTML = `
    <thead><tr><th>Garage</th><th>Connected Users</th><th>Phone</th><th>Email</th><th>Connected on</th><th></th></tr></thead>
    <tbody>
      ${[...byGarage.entries()].map(([gid, rows]) => {
        const name = rows[0].garage_name;
        return rows.map((r, idx) => `
          <tr>
            ${idx === 0 ? `<td rowspan="${rows.length}"><strong>${name}</strong><br><small style="color:#8aa0b8">Garage #${gid}</small><br><a href="../garage.html?id=${gid}" target="_blank">Public page ↗</a></td>` : ''}
            <td>${r.full_name || '—'}<br><small style="color:#8aa0b8">${r.user_id}</small></td>
            <td>${r.phone || '—'}</td>
            <td>${r.email || '—'}</td>
            <td>${new Date(r.bound_at).toLocaleString()}</td>
            <td><button class="btn btn-xs btn-danger" onclick="unbindUser(${r.garage_id},'${r.user_id}')">Remove</button></td>
          </tr>`).join('');
      }).join('')}
    </tbody>`;
}

// ---------- Appointments ----------
async function loadAppointments() {
  const { data } = await sb.from('gs_appointments')
    .select('*, gs_cars!inner(brand, model), gs_garages!inner(name)')
    .order('scheduled_at', { ascending: false });
  const names = await profileNameMap();
  const t = document.getElementById('appointmentsTable');

  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="5">No appointments.</td></tr>';
    return;
  }
  t.innerHTML = `
    <thead><tr><th>User</th><th>Garage</th><th>Car</th><th>Scheduled</th><th>Status</th></tr></thead>
    <tbody>
      ${data.map(a => `
        <tr>
          <td>${names.get(a.user_id) || '—'}</td>
          <td>${a.gs_garages.name}</td>
          <td>${a.gs_cars.brand} ${a.gs_cars.model}</td>
          <td>${new Date(a.scheduled_at).toLocaleString()}</td>
          <td><span class="badge badge-${a.status}">${a.status}</span></td>
        </tr>`).join('')}
    </tbody>`;
}

// ---------- Issues ----------
async function loadIssues() {
  const { data } = await sb.from('gs_issues')
    .select('*, gs_cars!inner(brand, model), gs_garages(name)')
    .order('created_at', { ascending: false });
  const names = await profileNameMap();
  const t = document.getElementById('issuesTable');

  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="6">No issues reported.</td></tr>';
    return;
  }
  t.innerHTML = `
    <thead><tr><th>User</th><th>Car</th><th>Issue</th><th>Garage</th><th>Status</th><th>Reported</th></tr></thead>
    <tbody>
      ${data.map(i => `
        <tr>
          <td>${names.get(i.user_id) || '—'}</td>
          <td>${i.gs_cars.brand} ${i.gs_cars.model}</td>
          <td><strong>${i.title}</strong><br><small style="color:#8aa0b8">${i.description || ''}</small></td>
          <td>${i.gs_garages?.name || '—'}</td>
          <td><span class="badge badge-${i.status}">${i.status}</span></td>
          <td>${new Date(i.created_at).toLocaleDateString()}</td>
        </tr>`).join('')}
    </tbody>`;
}

// ---------- Reminders ----------
async function loadReminders() {
  const { data } = await sb.from('gs_reminders')
    .select('*, gs_garages(name)')
    .order('created_at', { ascending: false });
  const names = await profileNameMap();
  const t = document.getElementById('remindersTable');

  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="6">No reminders created.</td></tr>';
    return;
  }
  t.innerHTML = `
    <thead><tr><th>User</th><th>Title</th><th>Message</th><th>Garage</th><th>Due</th><th>Status</th></tr></thead>
    <tbody>
      ${data.map(r => `
        <tr>
          <td>${names.get(r.user_id) || '—'}</td>
          <td><strong>${r.title}</strong></td>
          <td style="max-width:260px">${r.message || ''}</td>
          <td>${r.gs_garages?.name || '—'}</td>
          <td>${r.due_date || '—'}</td>
          <td><span class="badge badge-${r.status}">${r.status}</span></td>
        </tr>`).join('')}
    </tbody>`;
}

async function profileNameMap() {
  const { data } = await sb.from('gs_profiles').select('user_id, full_name');
  const map = new Map();
  (data || []).forEach(p => map.set(p.user_id, p.full_name));
  return map;
}

// ---------- Wire up ----------
document.getElementById('loginForm').addEventListener('submit', onLogin);
document.getElementById('logoutBtn').addEventListener('click', onLogout);
navToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.side-nav a').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); loadView(a.dataset.view); }));
document.querySelectorAll('.go-view').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); loadView(a.dataset.view); }));

// Restore session
sb.auth.getSession().then(({ data }) => {
  if (data.session) {
    currentUser = data.session.user;
    verifyAdmin();
  }
});
