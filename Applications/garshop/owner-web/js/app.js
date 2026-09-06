// GarShop Owner web dashboard
const loginScreen = document.getElementById('loginScreen');
const appScreen = document.getElementById('appScreen');
const ownerEmail = document.getElementById('ownerEmail');
const loginError = document.getElementById('loginError');
const viewTitle = document.getElementById('viewTitle');
const navToggle = document.getElementById('navToggle');
const sidebar = document.querySelector('.sidebar');

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  garage: 'My Garage',
  requests: 'Service Requests',
  appointments: 'Appointments',
  checklists: 'Customer Checklists',
  services: 'Services Catalog',
  users: 'Connected Users',
  reminders: 'Send Reminders'
};

let currentUser = null;
let garage = null; // { id, name, status, ... }

// ---------- Auth ----------
async function onLogin(e) {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { loginError.textContent = error.message; return; }
  currentUser = data.user;
  await verifyOwner();
}

async function verifyOwner() {
  if (!currentUser) return;
  const { data, error } = await sb.from('gs_profiles')
    .select('role, full_name, phone')
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (error || !data || data.role !== 'owner') {
    await sb.auth.signOut();
    loginError.textContent = 'Access denied: not an owner account.';
    currentUser = null;
    return;
  }
  ownerEmail.textContent = currentUser.email;
  loginScreen.hidden = true;
  appScreen.hidden = false;
  await loadView('dashboard');
}

function onLogout() {
  sb.auth.signOut().then(() => {
    currentUser = null;
    garage = null;
    appScreen.hidden = true;
    loginScreen.hidden = false;
    document.getElementById('loginForm').reset();
  });
}

// ---------- Garage helper ----------
async function getGarage(force) {
  if (garage && !force) return garage;
  const { data, error } = await sb.from('gs_garages')
    .select('*')
    .eq('owner_id', currentUser.id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  garage = data || null;
  return garage;
}

// ---------- Routing ----------
async function loadView(view) {
  viewTitle.textContent = VIEW_TITLES[view] || 'Dashboard';
  document.querySelectorAll('.side-nav a').forEach(a =>
    a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('.view').forEach(s => (s.hidden = s.id !== 'view-' + view));

  try {
    if (view === 'dashboard') await loadDashboard();
    if (view === 'garage') await loadGarageForm();
    if (view === 'requests') await loadRequests();
    if (view === 'appointments') await loadAppointments();
    if (view === 'checklists') await loadChecklists();
    if (view === 'services') await loadServices();
    if (view === 'users') await loadUsers();
    if (view === 'reminders') await loadReminders();
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes('garage')) {
      viewTitle.textContent = 'Register your garage first';
    }
  }
  sidebar.classList.remove('open');
}

// ---------- Dashboard ----------
async function loadDashboard() {
  const g = await getGarage();
  const card = document.getElementById('garageStatusCard');
  if (!g) {
    card.innerHTML = `<p style="color:var(--gray-600)">No garage registered yet. Go to <a href="#" onclick="loadView('garage')">My Garage</a> to register.</p>`;
    document.getElementById('statGrid').innerHTML = '';
    document.getElementById('recentRequests').innerHTML = '<tr><td class="empty" colspan="3">Register your garage to start.</td></tr>';
    return;
  }
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div>
        <h3 style="font-size:1.5rem">${g.name}</h3>
        <p style="color:var(--gray-600)">${[g.location, g.city].filter(Boolean).join(', ')}${g.phone ? ' · ' + g.phone : ''}</p>
      </div>
      <span class="badge badge-${g.status}">${g.status}</span>
    </div>
    <p style="margin-top:12px;font-size:.92rem;color:var(--gray-600)">${g.description || ''}</p>
    <div style="margin-top:14px">
      <a href="../garage.html?id=${g.id}" target="_blank" class="btn btn-sm btn-primary">View my public page ↗</a>
      <a href="../downloads/GarShop-User.apk" download class="btn btn-sm btn-outline">Download User App</a>
    </div>`;

  const [boundUsers, issues, appointments] = await Promise.all([
    sb.rpc('gs_owner_garage_users', { p_garage_id: g.id }),
    sb.from('gs_issues').select('id,status').eq('garage_id', g.id),
    sb.from('gs_appointments').select('id,status').eq('garage_id', g.id)
  ]);
  const issuesArr = issues.data || [];
  const apptArr = appointments.data || [];
  const stats = [
    { label: 'Connected Users', value: (boundUsers.data || []).length },
    { label: 'Open Requests', value: issuesArr.filter(i => i.status !== 'completed').length, cls: 'warn' },
    { label: 'Total Requests', value: issuesArr.length },
    { label: 'Upcoming / Pending Appointments', value: apptArr.filter(a => a.status === 'pending' || a.status === 'confirmed').length, cls: 'alt' },
    { label: 'Total Appointments', value: apptArr.length }
  ];
  document.getElementById('statGrid').innerHTML = stats.map(s =>
    `<div class="stat-card ${s.cls || ''}"><h4>${s.value}</h4><p>${s.label}</p></div>`).join('');

  await renderRecentRequests();
}

async function renderRecentRequests() {
  const g = await getGarage();
  const t = document.getElementById('recentRequests');
  if (!g) return;
  const { data } = await sb.from('gs_issues')
    .select('id,title,status,created_at')
    .eq('garage_id', g.id)
    .order('created_at', { ascending: false })
    .limit(6);
  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="3">No service requests yet.</td></tr>';
    return;
  }
  t.innerHTML = `<thead><tr><th>Issue</th><th>Status</th><th>Reported</th></tr></thead><tbody>
    ${data.map(i => `<tr>
      <td>${i.title}</td>
      <td><span class="badge badge-${i.status}">${i.status}</span></td>
      <td>${new Date(i.created_at).toLocaleDateString()}</td>
    </tr>`).join('')}</tbody>`;
}

// ---------- Garage form ----------
async function loadGarageForm() {
  const g = await getGarage();
  const f = document.getElementById('garageForm');
  f.reset();
  const badge = document.getElementById('garageStatusBadge');
  if (g) {
    document.getElementById('gName').value = g.name || '';
    document.getElementById('gLocation').value = g.location || '';
    document.getElementById('gCity').value = g.city || '';
    document.getElementById('gPhone').value = g.phone || '';
    document.getElementById('gDescription').value = g.description || '';
    document.getElementById('gServices').value = g.services_offered || '';
    badge.innerHTML = `<span class="badge badge-${g.status}">${g.status}</span>`;
  } else {
    badge.textContent = '';
  }
}

document.getElementById('garageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('gSaveBtn');
  btn.disabled = true;
  try {
    const obj = {
      name: document.getElementById('gName').value.trim(),
      location: document.getElementById('gLocation').value.trim(),
      city: document.getElementById('gCity').value.trim(),
      phone: document.getElementById('gPhone').value.trim(),
      description: document.getElementById('gDescription').value.trim(),
      services_offered: document.getElementById('gServices').value.trim()
    };
    if (!obj.name || !obj.location) { alert('Garage name and location are required.'); btn.disabled = false; return; }
    const g = await getGarage();
    if (g) {
      await sb.from('gs_garages').update({ ...obj, status: 'pending' }).eq('id', g.id);
      garage = null; await getGarage(true);
      alert('Garage updated (pending approval).');
    } else {
      await sb.from('gs_garages').insert({ ...obj, owner_id: currentUser.id, status: 'pending' });
      garage = null; await getGarage(true);
      alert('Garage submitted for admin approval.');
    }
    await loadView('garage');
  } catch (err) {
    alert(err.message || 'Save failed');
  } finally {
    btn.disabled = false;
  }
});

// ---------- Requests ----------
async function loadRequests() {
  const g = await getGarage();
  const t = document.getElementById('requestsTable');
  if (!g) { t.innerHTML = '<tr><td class="empty" colspan="4">Register your garage first.</td></tr>'; return; }
  const { data } = await sb.from('gs_issues')
    .select('id,title,description,status,user_id,created_at,photo_url,latitude,longitude')
    .eq('garage_id', g.id)
    .order('created_at', { ascending: false });
  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="4">No service requests yet.</td></tr>';
    return;
  }
  const users = await userIdNameMap();
  t.innerHTML = `<thead><tr><th>User</th><th>Issue</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${data.map(i => `<tr>
      <td>${users.get(i.user_id) || '—'}</td>
      <td>
        <strong>${i.title}</strong><br>
        <small style="color:#8aa0b8">${i.description || ''}</small>
        ${i.photo_url ? `<br><a href="${i.photo_url}" target="_blank"><img src="${i.photo_url}" class="issue-photo" alt="issue photo"></a>` : ''}
        ${i.latitude ? `<br><a class="btn btn-xs btn-success" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${i.latitude},${i.longitude}">🧭 Navigate</a>` : ''}
      </td>
      <td><span class="badge badge-${i.status}">${i.status}</span></td>
      <td>${i.status !== 'completed' ? `
        <div class="actions">
          <button class="btn btn-xs btn-warn" onclick="setIssueStatus(${i.id},'${i.status === 'pending' ? 'in_progress' : 'completed'}')">${i.status === 'pending' ? 'Start' : 'Complete'}</button>
        </div>` : '<span class="badge badge-completed">done</span>'}</td>
    </tr>`).join('')}</tbody>`;
}

async function setIssueStatus(id, status) {
  const { error } = await sb.from('gs_issues').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) alert(error.message); else loadRequests();
}

// ---------- Appointments ----------
async function loadAppointments() {
  const g = await getGarage();
  const t = document.getElementById('appointmentsTable');
  if (!g) { t.innerHTML = '<tr><td class="empty" colspan="5">Register your garage first.</td></tr>'; return; }
  const { data } = await sb.from('gs_appointments')
    .select('id,user_id,scheduled_at,status,notes')
    .eq('garage_id', g.id)
    .order('scheduled_at', { ascending: true });
  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="5">No appointments.</td></tr>';
    return;
  }
  const users = await userIdNameMap();
  t.innerHTML = `<thead><tr><th>User</th><th>Scheduled</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
    ${data.map(a => `<tr>
      <td>${users.get(a.user_id) || a.user_id.slice(0, 8)}</td>
      <td>${new Date(a.scheduled_at).toLocaleString()}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td>${a.notes || ''}</td>
      <td>${a.status === 'pending' ? `<button class="btn btn-xs btn-success" onclick="setApptStatus(${a.id},'confirmed')">Confirm</button>`
          : a.status === 'confirmed' ? `<button class="btn btn-xs btn-success" onclick="setApptStatus(${a.id},'completed')">Complete</button>`
          : `<button class="btn btn-xs btn-outline" onclick="setApptStatus(${a.id},'cancelled')">Cancel</button>`}</td>
    </tr>`).join('')}</tbody>`;
}

async function setApptStatus(id, status) {
  const { error } = await sb.from('gs_appointments').update({ status }).eq('id', id);
  if (error) alert(error.message); else loadAppointments();
}

// ---------- Services ----------
async function loadServices() {
  const g = await getGarage();
  const t = document.getElementById('servicesTable');
  document.getElementById('serviceForm').reset();
  if (!g) { t.innerHTML = '<tr><td class="empty" colspan="4">Register your garage first.</td></tr>'; return; }
  const { data } = await sb.from('gs_garage_services')
    .select('*')
    .eq('garage_id', g.id)
    .order('created_at', { ascending: true });
  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="4">No services yet. Add one above.</td></tr>';
    return;
  }
  t.innerHTML = `<thead><tr><th>Service</th><th>Category</th><th>Price</th><th>Actions</th></tr></thead><tbody>
    ${data.map(s => `<tr>
      <td><strong>${s.name}</strong><br><small style="color:#8aa0b8">${s.description || ''}</small></td>
      <td><span class="badge badge-scheduled">${s.category}</span></td>
      <td>₹${s.price}</td>
      <td><button class="btn btn-xs btn-danger" onclick="deleteService(${s.id})">Delete</button></td>
    </tr>`).join('')}</tbody>`;
}

document.getElementById('serviceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const g = await getGarage();
    if (!g) { alert('Register your garage first.'); return; }
    const name = document.getElementById('sName').value.trim();
    if (!name) { alert('Service name required'); return; }
    const { error } = await sb.from('gs_garage_services').insert({
      garage_id: g.id,
      name,
      description: document.getElementById('sDesc').value.trim(),
      price: parseFloat(document.getElementById('sPrice').value) || 0,
      category: document.getElementById('sCategory').value
    });
    if (error) throw error;
    await loadServices();
  } catch (err) { alert(err.message || 'Add failed'); }
});

async function deleteService(id) {
  if (!confirm('Delete this service?')) return;
  const { error } = await sb.from('gs_garage_services').delete().eq('id', id);
  if (error) alert(error.message); else loadServices();
}

// ---------- Checklists ----------
async function loadChecklists() {
  const g = await getGarage();
  const c = document.getElementById('checklistsContainer');
  if (!g) { c.innerHTML = '<p style="color:var(--gray-600)">Register your garage first.</p>'; return; }
  const { data, error } = await sb.rpc('gs_owner_checklists', { p_garage_id: g.id });
  if (error) { c.innerHTML = '<p style="color:var(--red)">' + error.message + '</p>'; return; }
  if (!data || !data.length) {
    c.innerHTML = '<p style="color:var(--gray-600)">No checklists yet. Ask connected users to submit a checklist from the app.</p>';
    return;
  }
  c.innerHTML = data.map(cl => {
    const items = cl.items || [];
    const flagged = items.filter(i => i.checked).length;
    const fixedCount = items.filter(i => i.fixed).length;
    return `
    <div class="panel" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center">
        <div>
          <strong>${cl.user_name || 'Unknown user'}</strong>
          ${cl.phone ? '<span style="color:var(--gray-600);margin-left:8px">' + cl.phone + '</span>' : ''}
          <span style="color:var(--gray-600);margin-left:8px">· ${cl.car || '—'} · ${new Date(cl.created_at).toLocaleString()}</span>
        </div>
        <span class="badge badge-${cl.status}">${cl.status}</span>
      </div>
      <h4 style="margin:10px 0 4px">${cl.title}</h4>
      <p style="color:var(--gray-600);font-size:.85rem;margin-bottom:10px">
        Flagged ${flagged} of ${items.length} · Fixed ${fixedCount}
        ${cl.notes ? '· Notes: ' + cl.notes : ''}
      </p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Item</th><th>Flagged by user</th><th>Fixed</th><th>Fix note</th></tr></thead>
        <tbody>
          ${items.map(it => `
            <tr>
              <td>${it.item}</td>
              <td>${it.checked ? '<span class="badge badge-pending">yes</span>' : '—'}</td>
              <td><input type="checkbox" ${it.fixed ? 'checked' : ''} onchange="setItemFixed(${it.id}, this.checked, ${cl.id})"></td>
              <td><input class="fixed-note" data-item="${it.id}" style="width:100%;padding:6px 8px;border:1px solid #dbe3ee;border-radius:8px"
                         placeholder="Note (e.g. replaced pads)" value="${(it.note || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"
                         onchange="setItemFixed(${it.id}, true, ${cl.id})"></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
      ${cl.status !== 'completed'
        ? `<div style="margin-top:10px"><button class="btn btn-sm btn-success" onclick="completeChecklist(${cl.id})">Mark all fixed &amp; completed</button></div>`
        : '<p style="color:var(--green);margin-top:10px;font-weight:600">Completed — user has been notified.</p>'}
    </div>`;
  }).join('');
}

async function setItemFixed(itemId, fixed, checklistId) {
  const noteEl = document.querySelector('.fixed-note[data-item="' + itemId + '"]');
  const { error } = await sb.from('gs_checklist_items').update({
    owner_fixed: fixed,
    fixed_note: noteEl ? noteEl.value.trim() : ''
  }).eq('id', itemId);
  if (error) { alert(error.message); return; }
  if (fixed) {
    const { data: rows } = await sb.from('gs_checklist_items').select('id,owner_fixed').eq('checklist_id', checklistId);
    if ((rows || []).some(r => r.owner_fixed)) {
      await sb.from('gs_checklists').update({ status: 'in_progress' }).eq('id', checklistId).eq('status', 'pending');
    }
  }
  loadChecklists();
}

async function completeChecklist(id) {
  const g = await getGarage();
  if (!g) return;
  const { data: list } = await sb.rpc('gs_owner_checklists', { p_garage_id: g.id });
  const cur = (list || []).find(c => c.id === id);
  if (!cur) return;
  if (!confirm('Mark all items as fixed and complete this checklist?')) return;
  const e1 = await sb.from('gs_checklist_items').update({ owner_fixed: true }).eq('checklist_id', id);
  const e2 = await sb.from('gs_checklists').update({ status: 'completed' }).eq('id', id);
  if (e1.error || e2.error) { alert((e1.error || e2.error).message); return; }
  await sb.from('gs_notifications').insert({
    user_id: cur.user_id,
    title: 'Checklist completed',
    message: 'Your service checklist "' + (cur.title || 'Service Checklist') + '" is completed — the flagged items have been fixed.',
    type: 'success'
  });
  alert('Checklist marked as completed. User notified.');
  loadChecklists();
}

// ---------- Users ----------
async function loadUsers() {
  const g = await getGarage();
  const t = document.getElementById('usersTable');
  if (!g) { t.innerHTML = '<tr><td class="empty" colspan="4">Register your garage first.</td></tr>'; return; }
  document.getElementById('sharePageLink').href = `../garage.html?id=${g.id}`;
  const { data } = await sb.rpc('gs_owner_garage_users', { p_garage_id: g.id });
  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="4">No users connected yet. Share your garage page so users can download &amp; connect.</td></tr>';
    return;
  }
  t.innerHTML = `<thead><tr><th>User</th><th>Phone</th><th>Connected on</th><th>Actions</th></tr></thead><tbody>
    ${data.map(u => `<tr>
      <td><strong>${u.full_name || 'Unknown user'}</strong><br><small style="color:#8aa0b8">${u.user_id}</small></td>
      <td>${u.phone || '—'}</td>
      <td>${new Date(u.bound_at).toLocaleDateString()}</td>
      <td><button class="btn btn-xs btn-danger" onclick="unbindUser('${u.user_id}')">Remove</button></td>
    </tr>`).join('')}</tbody>`;
}

async function unbindUser(userId) {
  const g = await getGarage();
  if (!confirm('Remove this user from your garage? They can no longer submit to you.')) return;
  const { error } = await sb.from('gs_garage_users').delete()
    .eq('garage_id', g.id).eq('user_id', userId);
  if (error) alert(error.message); else loadUsers();
}

// ---------- Reminders ----------
async function loadReminders() {
  const g = await getGarage();
  const sel = document.getElementById('rUserId');
  sel.innerHTML = '<option value="">— Select user —</option>';
  document.getElementById('reminderForm').reset();
  if (!g) {
    document.getElementById('remindersTable').innerHTML = '<tr><td class="empty" colspan="5">Register your garage first.</td></tr>';
    return;
  }
  const { data: bound } = await sb.rpc('gs_owner_garage_users', { p_garage_id: g.id });
  (bound || []).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.user_id;
    opt.textContent = (u.full_name || 'Unknown user') + (u.phone ? ' (' + u.phone + ')' : '');
    sel.appendChild(opt);
  });
  if (!bound || !bound.length) {
    sel.innerHTML = '<option value="">No connected users yet</option>';
  }

  const { data } = await sb.from('gs_reminders')
    .select('*')
    .eq('garage_id', g.id)
    .order('created_at', { ascending: false });
  const t = document.getElementById('remindersTable');
  if (!data || !data.length) {
    t.innerHTML = '<tr><td class="empty" colspan="5">No reminders sent.</td></tr>';
    return;
  }
  const users = await userIdNameMap();
  t.innerHTML = `<thead><tr><th>User</th><th>Title</th><th>Message</th><th>Due</th><th>Status</th></tr></thead><tbody>
    ${data.map(r => `<tr>
      <td>${users.get(r.user_id) || '—'}</td>
      <td><strong>${r.title}</strong></td>
      <td style="max-width:280px">${r.message || ''}</td>
      <td>${r.due_date || '—'}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
    </tr>`).join('')}</tbody>`;
}

document.getElementById('reminderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const g = await getGarage();
    const userId = document.getElementById('rUserId').value;
    const title = document.getElementById('rTitle').value.trim();
    if (!g || !userId || !title) { alert('Select a user and enter a title.'); return; }
    const message = document.getElementById('rMessage').value.trim();
    const due = document.getElementById('rDue').value;
    const carId = document.getElementById('rCarId').value;
    const obj = {
      user_id: userId,
      garage_id: g.id,
      title,
      message,
      status: 'scheduled'
    };
    if (due) obj.due_date = due;
    if (carId) obj.car_id = parseInt(carId, 10);
    const { error } = await sb.from('gs_reminders').insert(obj);
    if (error) throw error;
    await sb.from('gs_notifications').insert({
      user_id: userId,
      title,
      message,
      type: 'reminder'
    });
    await loadReminders();
    alert('Reminder sent.');
  } catch (err) { alert(err.message || 'Send failed'); }
});

// ---------- Helpers ----------
async function userIdNameMap() {
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

sb.auth.getSession().then(({ data }) => {
  if (data.session) {
    currentUser = data.session.user;
    verifyOwner();
  }
});
