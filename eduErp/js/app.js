/* ============================================================
   EduERP - Main Application
   ============================================================ */

let erpUser = null;
let erpProfile = null;
let erpOrg = null;
let currentPage = 'dashboard';

const NAV = {
  super_admin: {
    sections: [
      { label: 'Main', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'schools', icon: '🏫', label: 'Schools' },
        { id: 'enrollments', icon: '📝', label: 'Enrollments' },
        { id: 'plans', icon: '📋', label: 'Plans' },
      ]},
      { label: 'Finance', items: [
        { id: 'revenue', icon: '💰', label: 'Revenue' },
        { id: 'payments', icon: '💳', label: 'Payments' },
      ]},
    ]
  },
  school_admin: {
    sections: [
      { label: 'Main', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'students', icon: '👨‍🎓', label: 'Students' },
        { id: 'teachers', icon: '👩‍🏫', label: 'Teachers' },
        { id: 'classes', icon: '📚', label: 'Classes' },
      ]},
      { label: 'Academics', items: [
        { id: 'subjects', icon: '📖', label: 'Subjects' },
        { id: 'timetable', icon: '🗓️', label: 'Timetable' },
        { id: 'library', icon: '📚', label: 'Library' },
        { id: 'syllabus', icon: '📄', label: 'Syllabus' },
        { id: 'attendance', icon: '✅', label: 'Attendance' },
        { id: 'smart-attendance', icon: '📷', label: 'Smart Attendance' },
        { id: 'attendance-analytics', icon: '📊', label: 'Attendance Insights' },
        { id: 'prizes', icon: '🎁', label: 'Prize Draws' },
        { id: 'exams', icon: '📝', label: 'Exams' },
      ]},
      { label: 'Finance', items: [
        { id: 'fees', icon: '💵', label: 'Fees' },
        { id: 'donations', icon: '🎁', label: 'Donations' },
        { id: 'expenses', icon: '📉', label: 'Expenses' },
      ]},
      { label: 'Other', items: [
        { id: 'parent-manage', icon: '👨‍👩‍👧‍👦', label: 'Parents' },
        { id: 'calendar', icon: '📅', label: 'Calendar' },
        { id: 'reports', icon: '📈', label: 'Reports' },
      ]},
    ]
  },
  teacher: {
    sections: [
      { label: 'Main', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'my-classes', icon: '📚', label: 'My Classes' },
        { id: 'my-timetable', icon: '🗓️', label: 'My Schedule' },
        { id: 'take-attendance', icon: '✅', label: 'Attendance' },
        { id: 'smart-attendance', icon: '📷', label: 'Smart Attendance' },
        { id: 'attendance-analytics', icon: '📊', label: 'Insights' },
        { id: 'prizes', icon: '🎁', label: 'Prize Draws' },
        { id: 'assignments', icon: '📝', label: 'Assignments' },
        { id: 'exams', icon: '📋', label: 'Exams' },
        { id: 'syllabus', icon: '📄', label: 'Syllabus' },
        { id: 'notes', icon: '📝', label: 'My Notes' },
        { id: 'library', icon: '📚', label: 'Library' },
        { id: 'teacher-parent-comm', icon: '👨‍👩‍👧‍👦', label: 'Contact Parents' },
      ]},
    ]
  },
  student: {
    sections: [
      { label: 'Main', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'my-attendance', icon: '✅', label: 'Attendance' },
        { id: 'my-schedule', icon: '🗓️', label: 'Schedule' },
        { id: 'my-assignments', icon: '📝', label: 'Assignments' },
        { id: 'my-exams', icon: '📋', label: 'Exams' },
        { id: 'attendance-analytics', icon: '📊', label: 'Weekly Leaderboard' },
        { id: 'prizes', icon: '🎁', label: 'Prize Draws' },
        { id: 'my-fees', icon: '💵', label: 'Fees' },
        { id: 'my-notes', icon: '📝', label: 'My Notes' },
        { id: 'my-library', icon: '📚', label: 'Library' },
        { id: 'calendar', icon: '📅', label: 'Calendar' },
      ]},
    ]
  },
  librarian: {
    sections: [
      { label: 'Main', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'library', icon: '📚', label: 'Library Management' },
        { id: 'my-library', icon: '📖', label: 'My Books' },
      ]},
    ]
  },
  parent: {
    sections: [
      { label: 'Main', items: [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'my-children', icon: '👨‍👩‍👧‍👦', label: 'My Children' },
        { id: 'attendance-analytics', icon: '📊', label: 'Attendance' },
        { id: 'prizes', icon: '🎁', label: 'Prize Draws' },
        { id: 'my-notes', icon: '📝', label: 'Messages' },
      ]},
    ]
  }
};

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Listen for password recovery flow (user clicked reset link from email)
  erp.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      showLogin();
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('login-desc').style.display = 'none';
      document.getElementById('reset-form').style.display = 'block';
    }
  });
  await checkAuth();
  setupMobileToggle();
});

async function checkAuth() {
  const { data: { user } } = await erp.auth.getUser();
  if (!user) { showLogin(); return; }
  erpUser = user;
  const { data: profile } = await erp.from('profiles').select('*, organizations(*)').eq('user_id', user.id).single();
  if (!profile) { showLogin(); return; }
  erpProfile = profile;
  erpOrg = profile.organizations;
  if (erpProfile.role === 'super_admin' && !erpOrg) {
    erpOrg = { id: 0, name: 'Super Admin', subscription_plan: 'premium', status: 'active' };
  }
  if (!erpOrg && erpProfile.role !== 'super_admin') {
    showLogin();
    document.getElementById('login-error').textContent = 'No school is linked to your account. Please contact the admin or enroll again.';
    document.getElementById('login-error').style.display = 'block';
    return;
  }
  showApp();
}

/* ============================================================
   AUTH
   ============================================================ */

async function erpLogin(email, password) {
  const { data, error } = await erp.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (window.sitengSetUser) window.sitengSetUser(data.user?.email, data.user?.id);
  await checkAuth();
}

async function erpLogout() {
  await erp.auth.signOut();
  if (window.sitengSetUser) window.sitengSetUser(null);
  erpUser = null; erpProfile = null; erpOrg = null;
  showLogin();
}

async function erpRegister(data) {
  const { data: authData, error: authError } = await erp.auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { full_name: data.full_name } }
  });
  if (authError) throw authError;
  await erp.from('profiles').update({
    full_name: data.full_name, phone: data.phone || '',
    role: data.role || 'school_admin', org_id: data.org_id || null
  }).eq('user_id', authData.user.id);
  return authData;
}

/* ============================================================
   UI HELPERS
   ============================================================ */

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function el(id) { return document.getElementById(id); }

function modal(title, contentHtml, onConfirm) {
  el('modal-title').textContent = title;
  el('modal-body').innerHTML = contentHtml;
  el('modal-confirm').onclick = onConfirm || null;
  el('modal-confirm').style.display = onConfirm ? '' : 'none';
  el('modal-overlay').classList.add('open');
}

function closeModal() { el('modal-overlay').classList.remove('open'); }

function openSlideModal(title, contentHtml) {
  el('slide-modal-title').textContent = title;
  el('slide-modal-body').innerHTML = contentHtml;
  el('slide-modal-overlay').classList.add('open');
}

function closeSlideModal() { el('slide-modal-overlay').classList.remove('open'); }

async function deleteRecord(table, id, label) {
  if (!confirm(`Delete ${label}?`)) return;
  try {
    await erp.from(table).delete().eq('id', id);
    showToast(`${label} deleted`, 'success');
    navigate(currentPage);
  } catch (e) {
    showToast(`Cannot delete: ${e.message}`, 'error');
  }
}

function filterTable(data, entity) {
  const search = (document.getElementById(`fs-${entity}`)?.value || '').toLowerCase();
  const filters = {};
  document.querySelectorAll(`[data-ff="${entity}"]`).forEach(el => {
    const v = el.value;
    if (v) filters[el.dataset.fk] = v;
  });
  return data.filter(r => {
    for (const [k, v] of Object.entries(filters)) {
      if (String(r[k] ?? '') !== v) return false;
    }
    if (!search) return true;
    const raw = document.getElementById(`fs-${entity}`)?.dataset.fields;
    const searchFields = raw ? raw.split(',') : [];
    if (!searchFields.length || (searchFields.length === 1 && !searchFields[0])) {
      return Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search));
    }
    return searchFields.some(f => String(r[f] ?? '').toLowerCase().includes(search));
  });
}

function filterBar(entity, config) {
  const searchField = config.find(c => c.type === 'search');
  const searchHtml = searchField
    ? `<input class="filter-input" id="fs-${entity}" data-fields="${searchField.fields.join(',')}" placeholder="${searchField.placeholder}" oninput="reRenderTable('${entity}')">`
    : '';
  const selectsHtml = (config.filter(c => c.type === 'select') || []).map(c =>
    `<select data-ff="${entity}" data-fk="${c.key}" onchange="reRenderTable('${entity}')">
      <option value="">${c.label}</option>
      ${c.options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
    </select>`
  ).join('');
  return `<div class="filter-bar">${searchHtml}${selectsHtml}</div>`;
}

function getFormData(formId) {
  const fd = new FormData(el(formId));
  const data = {};
  for (const [k, v] of fd) data[k] = v;
  return data;
}

function renderTable(headers, rows, actions) {
  if (!rows.length) return '<div class="empty-state"><div class="icon">📭</div><p>No data found.</p></div>';
  const h = headers.map(h => `<th>${h}</th>`).join('');
  const actionsTh = actions ? '<th>Actions</th>' : '';
  const r = rows.map(row => {
    const cells = headers.map(h => `<td>${row[h] ?? ''}</td>`).join('');
    return `<tr>${cells}${actions ? `<td>${actions(row)}</td>` : ''}</tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr>${h}${actionsTh}</tr></thead><tbody>${r}</tbody></table></div>`;
}

const _TC = {};
window._TD = {};
function regTable(entity, headers, mapper, actions, filterConfig) {
  _TC[entity] = { headers, mapper, actions, filterConfig };
}
function reRenderTable(entity) {
  const cfg = _TC[entity];
  if (!cfg) return;
  const data = window._TD[entity] || [];
  const filtered = filterTable(data, entity);
  const c = document.getElementById(`tbl-${entity}`);
  if (c) c.innerHTML = renderTable(cfg.headers, filtered.map(cfg.mapper), cfg.actions);
}
function renderFilteredTable(entity, container, filters, title, headerButtons) {
  const cfg = _TC[entity];
  const data = window._TD[entity] || [];
  const filtered = filterTable(data, entity);
  container.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>${title}</h3>${headerButtons || ''}</div>
      <div class="card-body">${filterBar(entity, filters)}<div id="tbl-${entity}">${renderTable(cfg.headers, filtered.map(cfg.mapper), cfg.actions)}</div></div>
    </div>`;
}

/* ============================================================
   APP SHELL
   ============================================================ */

function showLogin() {
  el('login-page').style.display = 'flex';
  el('app-shell').style.display = 'none';
  el('login-error').style.display = 'none';
}

function showApp() {
  el('login-page').style.display = 'none';
  el('app-shell').style.display = 'flex';
  el('sidebar-user-name').textContent = erpProfile.full_name;
  el('sidebar-user-role').textContent = erpProfile.role.replace('_', ' ').toUpperCase();
  el('sidebar-org-name').textContent = erpOrg ? erpOrg.name : '';
  renderSidebar();
  navigate('dashboard');
}

function renderSidebar() {
  const nav = NAV[erpProfile.role];
  if (!nav) return;
  let html = '';
  for (const section of nav.sections) {
    html += `<div class="nav-section">${section.label}</div>`;
    for (const item of section.items) {
      html += `<a href="#" data-page="${item.id}" onclick="navigate('${item.id}')">${item.icon} ${item.label}</a>`;
    }
  }
  el('sidebar-nav').innerHTML = html;
}

function setupMobileToggle() {
  document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });
}

/* ============================================================
   NAVIGATION
   ============================================================ */

async function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('active');
  el('sidebar').classList.remove('open');
  el('page-title').textContent = activeLink ? activeLink.textContent.trim() : page;
  el('content-area').innerHTML = '<div class="loading">Loading...</div>';

  try {
    const pages = {
      'dashboard': renderDashboard,
      'schools': renderSchools,
      'enrollments': renderEnrollments,
      'plans': renderPlans,
      'revenue': renderRevenue,
      'payments': renderPayments,
      'students': renderStudents,
      'teachers': renderTeachers,
      'classes': renderClasses,
      'subjects': renderSubjects,
      'syllabus': renderSyllabus,
      'attendance': renderAttendance,
      'smart-attendance': renderSmartAttendance,
      'attendance-analytics': renderAttendanceAnalytics,
      'prizes': renderPrizes,
      'exams': renderExams,
      'fees': renderFees,
      'donations': renderDonations,
      'expenses': renderExpenses,
      'calendar': renderCalendar,
      'reports': renderReports,
      'my-classes': renderMyClasses,
      'take-attendance': renderTakeAttendance,
      'timetable': renderTimetable,
      'my-timetable': renderTeacherSchedule,
      'my-schedule': renderMySchedule,
      'my-notes': renderStudentNotes,
      'my-library': renderMyLibrary,
      'notes': renderTeacherNotes,
      'library': renderLibrary,
      'assignments': renderTeacherAssignments,
      'my-assignments': renderStudentAssignments,
      'my-attendance': renderMyAttendance,
      'my-exams': renderMyExams,
      'my-fees': renderMyFees,
      'my-children': renderMyChildren,
      'parent-communications': renderParentCommunications,
      'parent-manage': renderParentManage,
      'teacher-parent-comm': renderTeacherParentComm,
    };
    const renderer = pages[page];
    if (renderer) await renderer();
    else el('content-area').innerHTML = '<div class="empty-state"><p>Page under construction.</p></div>';
  } catch (e) {
    el('content-area').innerHTML = `<div class="empty-state"><p class="text-center" style="color:var(--danger)">Error: ${e.message}</p></div>`;
    showToast(e.message, 'error');
  }
}

/* ============================================================
   DASHBOARD
   ============================================================ */

async function renderDashboard() {
  const role = erpProfile.role;
  if (role === 'super_admin') return renderSuperAdminDashboard();
  if (role === 'school_admin') return renderSchoolAdminDashboard();
  if (role === 'teacher') return renderTeacherDashboard();
  if (role === 'student') return renderStudentDashboard();
  if (role === 'librarian') return renderLibrarianDashboard();
  if (role === 'parent') return renderParentDashboard();
}

async function renderSuperAdminDashboard() {
  const [orgs, plans, payments] = await Promise.all([
    erp.from('organizations').select('*'),
    erp.from('plans').select('*').eq('is_active', true),
    erp.from('payments').select('*').eq('status', 'completed'),
  ]);
  const totalOrgs = orgs.data?.length || 0;
  const activeOrgs = orgs.data?.filter(o => o.status === 'active').length || 0;
  const pendingOrgs = orgs.data?.filter(o => o.status === 'pending').length || 0;
  const totalRevenue = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;

  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Schools</div><div class="value">${totalOrgs}</div></div>
      <div class="stat-card"><div class="label">Active Schools</div><div class="value">${activeOrgs}</div></div>
      <div class="stat-card"><div class="label">Pending Approvals</div><div class="value" style="color:var(--warning)">${pendingOrgs}</div></div>
      <div class="stat-card"><div class="label">Total Revenue</div><div class="value">₹${totalRevenue.toLocaleString()}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Recent Organizations</h3></div>
      <div class="card-body">${renderTable(
        ['Name','Plan','Status','Created'],
        (orgs.data || []).slice(0,5).map(o => ({'Name': o.name, 'Plan': o.subscription_plan, 'Status': `<span class="badge badge-${o.status === 'active' ? 'success' : o.status === 'pending' ? 'warning' : 'danger'}">${o.status}</span>`, 'Created': new Date(o.created_at).toLocaleDateString()})),
        row => `<button class="btn btn-sm btn-outline" onclick="navigate('schools')">View</button>`
      )}</div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Plans Overview</h3></div>
      <div class="card-body">${renderTable(
        ['Plan','Price','Billing','Max Students','Max Teachers'],
        (plans.data || []).map(p => ({'Plan': p.name, 'Price': `₹${p.price}`, 'Billing': p.billing_cycle, 'Max Students': String(p.max_students), 'Max Teachers': String(p.max_teachers)}))
      )}</div>
    </div>`;
}

async function renderSchoolAdminDashboard() {
  const orgId = erpOrg.id;
  const [students, teachers, classes, fees, exams] = await Promise.all([
    erp.from('students').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    erp.from('teachers').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    erp.from('classes').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    erp.from('fees').select('amount').eq('org_id', orgId).eq('status', 'paid'),
    erp.from('exams').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'published'),
  ]);
  const totalFees = fees.data?.reduce((s, f) => s + Number(f.amount), 0) || 0;

  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Active Students</div><div class="value">${students.count || 0}</div></div>
      <div class="stat-card"><div class="label">Active Teachers</div><div class="value">${teachers.count || 0}</div></div>
      <div class="stat-card"><div class="label">Classes</div><div class="value">${classes.count || 0}</div></div>
      <div class="stat-card"><div class="label">Total Fees Collected</div><div class="value">₹${totalFees.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Published Exams</div><div class="value">${exams.count || 0}</div></div>
      <div class="stat-card"><div class="label">Plan</div><div class="value" style="font-size:1rem;text-transform:capitalize">${erpOrg.subscription_plan || 'N/A'}</div><div class="sub">
        <span class="badge badge-${erpOrg.status === 'active' ? 'success' : 'warning'}">${erpOrg.status}</span>
      </div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Quick Actions</h3></div>
      <div class="card-body flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigate('students')">Manage Students</button>
        <button class="btn btn-primary" onclick="navigate('teachers')">Manage Teachers</button>
        <button class="btn btn-primary" onclick="navigate('classes')">Manage Classes</button>
        <button class="btn btn-success" onclick="navigate('attendance')">Attendance</button>
        <button class="btn btn-warning" onclick="navigate('exams')">Exams</button>
      </div>
    </div>`;
}

async function renderTeacherDashboard() {
  const profId = erpProfile.id;
  const teacherData = await erp.from('teachers').select('*').eq('profile_id', profId).single();
  if (!teacherData.data) { el('content-area').innerHTML = '<div class="empty-state"><p>Teacher profile not found.</p></div>'; return; }
  const teacher = teacherData.data;
  const [classes, subjects, exams, assignments] = await Promise.all([
    erp.from('classes').select('*', { count: 'exact', head: true }).eq('teacher_id', teacher.id),
    erp.from('subjects').select('*, classes(*)').eq('teacher_id', teacher.id),
    erp.from('exams').select('*').eq('created_by', teacher.id),
    erp.from('assignments').select('*', { count: 'exact', head: true }).eq('teacher_id', teacher.id).eq('status', 'active'),
  ]);
  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">My Classes</div><div class="value">${classes.count || 0}</div></div>
      <div class="stat-card"><div class="label">My Subjects</div><div class="value">${subjects.data?.length || 0}</div></div>
      <div class="stat-card"><div class="label">Active Assignments</div><div class="value">${assignments.count || 0}</div></div>
      <div class="stat-card"><div class="label">Exams</div><div class="value">${exams.data?.length || 0}</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Quick Actions</h3></div>
      <div class="card-body flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigate('my-classes')">View Classes</button>
        <button class="btn btn-primary" onclick="navigate('take-attendance')">Take Attendance</button>
        <button class="btn btn-success" onclick="navigate('assignments')">Assignments</button>
        <button class="btn btn-warning" onclick="navigate('exams')">Exams</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>My Subjects</h3></div>
      <div class="card-body">${renderTable(
        ['Subject','Code','Class'],
        (subjects.data || []).map(s => ({'Subject': s.name, 'Code': s.code || '-', 'Class': s.classes?.name || '-'}))
      )}</div>
    </div>`;
}

async function renderStudentDashboard() {
  const profId = erpProfile.id;
  const studentData = await erp.from('students').select('*, classes(name)').eq('profile_id', profId).single();
  if (!studentData.data) { el('content-area').innerHTML = '<div class="empty-state"><p>Student profile not found.</p></div>'; return; }
  const student = studentData.data;
  const [attendance, results, assignments] = await Promise.all([
    erp.from('attendance').select('*').eq('student_id', student.id),
    erp.from('exam_results').select('*, exams(*)').eq('student_id', student.id),
    erp.from('assignments').select('*', { count: 'exact', head: true }).eq('class_id', student.class_id).eq('status', 'active'),
  ]);
  const total = attendance.data?.length || 0;
  const present = attendance.data?.filter(a => a.status === 'present').length || 0;
  const pct = total ? Math.round(present / total * 100) : 0;
  const avgScore = results.data?.length ? Math.round(results.data.reduce((s, r) => s + Number(r.percentage), 0) / results.data.length) : 0;
  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">My Class</div><div class="value" style="font-size:1.1rem">${student.classes?.name || 'Not assigned'}</div></div>
      <div class="stat-card"><div class="label">Attendance</div><div class="value">${pct}%</div><div class="sub">${present}/${total} days</div></div>
      <div class="stat-card"><div class="label">Pending Assignments</div><div class="value">${assignments.count || 0}</div></div>
      <div class="stat-card"><div class="label">Average Score</div><div class="value">${avgScore}%</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Quick Links</h3></div>
      <div class="card-body flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigate('my-attendance')">Attendance</button>
        <button class="btn btn-success" onclick="navigate('my-assignments')">Assignments</button>
        <button class="btn btn-warning" onclick="navigate('my-exams')">Exams</button>
        <button class="btn btn-info" onclick="navigate('my-fees')">Fees</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Recent Exam Results</h3></div>
      <div class="card-body">${renderTable(
        ['Exam','Score','Percentage','Status'],
        (results.data || []).slice(0,5).map(r => ({
          'Exam': r.exams?.title || '-',
          'Score': `${r.marks_obtained}/${r.total_marks}`,
          'Percentage': `${r.percentage}%`,
          'Status': `<span class="badge badge-${r.status === 'passed' ? 'success' : 'danger'}">${r.status}</span>`
        }))
      )}</div>
    </div>`;
}

/* ============================================================
   LIBRARIAN DASHBOARD
   ============================================================ */

async function renderLibrarianDashboard() {
  const orgId = erpOrg.id;
  const [books, members, txns, fines] = await Promise.all([
    erp.from('library_books').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    erp.from('library_members').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    erp.from('library_transactions').select('*', { count: 'exact', head: true }).eq('org_id', orgId).in('status', ['borrowed','overdue']),
    erp.from('library_fines').select('*').eq('org_id', orgId).eq('paid', false),
  ]);
  const totalFines = (fines.data || []).reduce((s, f) => s + parseFloat(f.amount), 0);
  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Books</div><div class="value">${books.count || 0}</div></div>
      <div class="stat-card"><div class="label">Active Members</div><div class="value">${members.count || 0}</div></div>
      <div class="stat-card"><div class="label">Active Borrows</div><div class="value">${txns.count || 0}</div></div>
      <div class="stat-card"><div class="label">Unpaid Fines</div><div class="value" style="color:var(--danger)">₹${totalFines.toFixed(2)}</div></div>
    </div>
    <div class="card mt-2">
      <div class="card-header"><h3>Quick Actions</h3></div>
      <div class="card-body flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary" onclick="navigate('library')">Manage Library</button>
        <button class="btn btn-success" onclick="navigate('my-library')">My Borrowed Books</button>
      </div>
    </div>`;
}

/* ============================================================
   PARENT DASHBOARD
   ============================================================ */

async function renderParentDashboard() {
  const profId = erpProfile.id;
  const { data: links } = await erp.from('parent_students').select('*, students(id,first_name,last_name,class_id,roll_number,classes(name))').eq('profile_id', profId);
  const children = links || [];
  if (!children.length) { el('content-area').innerHTML = '<div class="card"><div class="card-body"><div class="empty-state">No children linked to your account. Contact the school admin.</div></div></div>'; return; }
  let html = '<div class="card"><div class="card-header"><h3>My Children</h3></div><div class="card-body">';
  for (const link of children) {
    const s = link.students;
    if (!s) continue;
    const [att, exams, fees, msgs] = await Promise.all([
      erp.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', s.id),
      erp.from('exam_results').select('*, exams(title)').eq('student_id', s.id).order('created_at', { ascending: false }).limit(5),
      erp.from('fees').select('*').eq('student_id', s.id).eq('status', 'pending'),
      erp.from('parent_communications').select('*').eq('student_id', s.id).eq('priority', 'urgent').limit(3),
    ]);
    const totalAtt = att.count || 0;
    html += `<div class="card mt-2" style="border-left:4px solid var(--primary)">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap">
        <h3>${s.first_name} ${s.last_name} <span style="font-weight:normal;font-size:.85rem;color:var(--gray-500)">${s.classes?.name || 'No class'} | Roll: ${s.roll_number || '-'}</span></h3>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="navigate('my-attendance')" data-sid="${s.id}">Attendance</button>
          <button class="btn btn-sm btn-outline" onclick="navigate('my-exams')" data-sid="${s.id}">Results</button>
          <button class="btn btn-sm btn-outline" onclick="navigate('my-fees')" data-sid="${s.id}">Fees</button>
        </div>
      </div>
      <div class="card-body">
        <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
          <div class="stat-card" style="padding:8px"><div class="label" style="font-size:.75rem">Attendance</div><div class="value" style="font-size:1rem">${totalAtt} days</div></div>
          <div class="stat-card" style="padding:8px"><div class="label" style="font-size:.75rem">Pending Fees</div><div class="value" style="font-size:1rem;color:${(fees.data||[]).length ? 'var(--danger)' : 'var(--success)'}">${(fees.data||[]).length}</div></div>
          <div class="stat-card" style="padding:8px"><div class="label" style="font-size:.75rem">Recent Exams</div><div class="value" style="font-size:1rem">${(exams.data||[]).length}</div></div>
          <div class="stat-card" style="padding:8px"><div class="label" style="font-size:.75rem">Urgent Messages</div><div class="value" style="font-size:1rem;color:${(msgs.data||[]).length ? 'var(--danger)' : 'var(--success)'}">${(msgs.data||[]).length}</div></div>
        </div>`;
    if (exams.data && exams.data.length) {
      html += `<div style="margin-top:8px"><strong style="font-size:.85rem">Recent Exam Results</strong>${renderTable(['Exam','Score','Percentage','Status'], exams.data.map(r => ({'Exam': r.exams?.title || '-','Score': `${r.marks_obtained}/${r.total_marks}`,'Percentage': `${r.percentage}%`,'Status': `<span class="badge badge-${r.status === 'passed' ? 'success' : 'danger'}">${r.status}</span>`})))}</div>`;
    }
    html += `</div></div>`;
  }
  html += `<div class="mt-2" style="text-align:center"><button class="btn btn-primary" onclick="navigate('my-children')">View All Details</button></div></div></div>`;
  el('content-area').innerHTML = html;
}

async function renderMyChildren() {
  const profId = erpProfile.id;
  const { data: links } = await erp.from('parent_students').select('*, students(id,first_name,last_name,class_id,roll_number,guardian_name,guardian_phone,classes(name))').eq('profile_id', profId);
  const children = links || [];
  if (!children.length) { el('content-area').innerHTML = '<div class="card"><div class="card-body"><div class="empty-state">No children linked to your account.</div></div></div>'; return; }
  const childList = children.filter(c => c.students).map(c => c.students);
  let html = `<div class="card"><div class="card-header"><h3>My Children</h3></div><div class="card-body">`;
  html += renderTable(['Name','Class','Roll No','Guardian','Guardian Phone'],
    childList.map(s => ({
      'Name': `<a href="#" onclick="event.preventDefault();viewChildDetail(${s.id})" style="font-weight:600">${s.first_name} ${s.last_name}</a>`,
      'Class': s.classes?.name || '-',
      'Roll No': s.roll_number || '-',
      'Guardian': s.guardian_name || '-',
      'Guardian Phone': s.guardian_phone || '-',
    }))
  );
  html += `</div></div><div class="card mt-2"><div class="card-header"><h3>Quick View</h3></div><div class="card-body"><div id="child-detail"></div></div></div>`;
  el('content-area').innerHTML = html;
  if (childList.length) viewChildDetail(childList[0].id);
}

async function viewChildDetail(studentId) {
  const [att, results, fees, schedule, msgs] = await Promise.all([
    erp.from('attendance').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(20),
    erp.from('exam_results').select('*, exams(title,subject_id,subjects(name))').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
    erp.from('fees').select('*').eq('student_id', studentId).order('due_date', { ascending: false }).limit(10),
    erp.from('class_schedules').select('*, subjects(name)').eq('class_id', (await erp.from('students').select('class_id').eq('id', studentId).single()).data?.class_id || 0).order('day_of_week').order('period_number'),
    erp.from('parent_communications').select('*, profiles(full_name)').eq('student_id', studentId).order('sent_at', { ascending: false }).limit(20),
  ]);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const html = `
    <div class="tabs" style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn btn-sm btn-primary" onclick="el('child-panel').innerHTML=document.getElementById('cp-att').innerHTML">Attendance</button>
      <button class="btn btn-sm btn-outline" onclick="el('child-panel').innerHTML=document.getElementById('cp-exam').innerHTML">Exams</button>
      <button class="btn btn-sm btn-outline" onclick="el('child-panel').innerHTML=document.getElementById('cp-fees').innerHTML">Fees</button>
      <button class="btn btn-sm btn-outline" onclick="el('child-panel').innerHTML=document.getElementById('cp-schedule').innerHTML">Schedule</button>
      <button class="btn btn-sm btn-outline" onclick="el('child-panel').innerHTML=document.getElementById('cp-msgs').innerHTML">Messages</button>
    </div>
    <div id="child-panel">
    </div>
    <div id="cp-att" style="display:none">${renderTable(['Date','Status'], (att.data||[]).map(a => ({'Date': new Date(a.date).toLocaleDateString(),'Status': `<span class="badge badge-${a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'}">${a.status}</span>`})))}</div>
    <div id="cp-exam" style="display:none">${renderTable(['Exam','Subject','Score','Percentage','Status'], (results.data||[]).map(r => ({'Exam': r.exams?.title || '-','Subject': r.exams?.subjects?.name || '-','Score': `${r.marks_obtained}/${r.total_marks}`,'Percentage': `${r.percentage}%`,'Status': `<span class="badge badge-${r.status === 'passed' ? 'success' : 'danger'}">${r.status}</span>`})))}</div>
    <div id="cp-fees" style="display:none">${renderTable(['Type','Amount','Due Date','Paid Date','Status'], (fees.data||[]).map(f => ({'Type': f.type,'Amount': `₹${f.amount}`,'Due Date': new Date(f.due_date).toLocaleDateString(),'Paid Date': f.paid_date ? new Date(f.paid_date).toLocaleDateString() : '-','Status': `<span class="badge badge-${f.status === 'paid' ? 'success' : f.status === 'overdue' ? 'danger' : 'warning'}">${f.status}</span>`})))}</div>
    <div id="cp-schedule" style="display:none">${renderTable(['Day','Period','Subject','Time'], (schedule.data||[]).map(s => ({'Day': days[s.day_of_week],'Period': `P${s.period_number}`,'Subject': s.subjects?.name || '-','Time': `${s.start_time?.slice(0,5)||''}-${s.end_time?.slice(0,5)||''}`})))}</div>
    <div id="cp-msgs" style="display:none">${(msgs.data||[]).length ? renderTable(['Date','From','Title','Message','Priority'], msgs.data.map(m => ({'Date': new Date(m.sent_at).toLocaleDateString(),'From': m.profiles?.full_name || '-','Title': m.title,'Message': m.message.length > 60 ? m.message.slice(0,60)+'...' : m.message,'Priority': `<span class="badge badge-${m.priority === 'urgent' ? 'danger' : m.priority === 'important' ? 'warning' : 'info'}">${m.priority}</span>`}))) : '<div class="empty-state">No messages.</div>'}</div>
  `;
  el('child-detail').innerHTML = html;
  el('child-panel').innerHTML = document.getElementById('cp-att').innerHTML;
}

async function renderParentCommunications() {
  const profId = erpProfile.id;
  const { data: links } = await erp.from('parent_students').select('*, students(first_name,last_name)').eq('profile_id', profId);
  const childIds = (links || []).filter(l => l.students).map(l => l.students.id);
  if (!childIds.length) { el('content-area').innerHTML = '<div class="empty-state">No children linked.</div>'; return; }
  const { data: msgs } = await erp.from('parent_communications').select('*, profiles(full_name), students(first_name,last_name)').in('student_id', childIds).order('sent_at', { ascending: false }).limit(50);
  let html = `<div class="card"><div class="card-header"><h3>Messages from School</h3></div><div class="card-body">`;
  if (!msgs || !msgs.length) { html += '<div class="empty-state">No messages yet.</div>'; }
  else {
    const priorityBadge = { normal: 'info', important: 'warning', urgent: 'danger' };
    msgs.forEach(m => {
      html += `<div class="card mt-1" style="padding:12px;border-left:4px solid ${m.priority === 'urgent' ? 'var(--danger)' : m.priority === 'important' ? 'var(--warning)' : 'var(--primary)'}">
        <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--gray-500)">
          <span>From: ${m.profiles?.full_name || 'School'} → ${m.students?.first_name || ''} ${m.students?.last_name || ''}</span>
          <span>${new Date(m.sent_at).toLocaleString()}</span>
        </div>
        <div style="font-weight:600;margin-top:4px">${m.title} <span class="badge badge-${priorityBadge[m.priority]}" style="font-size:.7rem">${m.priority}</span></div>
        <div style="margin-top:4px;font-size:.9rem;white-space:pre-wrap">${m.message}</div>
      </div>`;
    });
  }
  html += `</div></div>`;
  el('content-area').innerHTML = html;
}

/* ============================================================
   ADMIN: PARENT MANAGEMENT
   ============================================================ */

async function renderParentManage() {
  const orgId = erpOrg.id;
  // Get all parent profiles linked to this org via parent_students
  const { data: links } = await erp.from('parent_students').select('*, profiles(id,email,full_name,phone), students(id,first_name,last_name,roll_number,classes(name))').eq('org_id', orgId);
  const { data: allStudents } = await erp.from('students').select('*, classes(name)').eq('org_id', orgId).eq('status', 'active');
  const { data: parentProfiles } = await erp.from('profiles').select('*').eq('org_id', orgId).eq('role', 'parent');
  const parentMap = {};
  (links || []).forEach(l => {
    if (!parentMap[l.profile_id]) parentMap[l.profile_id] = { profile: l.profiles, students: [] };
    if (l.students) parentMap[l.profile_id].students.push(l.students);
  });
  let html = `<div class="card"><div class="card-header"><h3>Parent Management</h3></div><div class="card-body">
    <div style="margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="showAddParent()">+ Add Parent</button>
      <button class="btn btn-outline btn-sm" onclick="showLinkParent()">Link to Student</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Parent</th><th>Email</th><th>Phone</th><th>Linked Children</th><th></th></tr></thead><tbody>`;
  const entries = Object.values(parentMap);
  if (!entries.length) { html += `<tr><td colspan="5" class="empty-state">No parents registered yet.</td></tr>`; }
  else {
    entries.forEach(e => {
      const p = e.profile;
      html += `<tr>
        <td><strong>${p?.full_name || 'Unknown'}</strong></td>
        <td style="font-size:.8rem">${p?.email || '-'}</td>
        <td>${p?.phone || '-'}</td>
        <td>${e.students.map(s => `${s.first_name} ${s.last_name} (${s.classes?.name || '-'})`).join(', ') || '-'}</td>
        <td><button class="btn btn-sm btn-outline" onclick="showLinkParent(${p?.id})">Link</button></td>
      </tr>`;
    });
  }
  html += `</tbody></table></div></div></div>`;
  window._allStudents = allStudents || [];
  window._parentProfiles = parentProfiles || [];
  el('content-area').innerHTML = html;
}

function showAddParent() {
  openSlideModal('Register Parent', `
    <form id="add-parent-form">
      <div class="form-group"><label>Full Name *</label><input name="full_name" required></div>
      <div class="form-group"><label>Email *</label><input type="email" name="email" required></div>
      <div class="form-group"><label>Phone</label><input name="phone"></div>
      <div class="form-group"><label>Password *</label><input type="password" name="password" required minlength="6"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Parent Account</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    document.getElementById('add-parent-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = getFormData('add-parent-form');
      try {
        const { data: authData, error: authErr } = await erp.auth.signUp({ email: fd.email, password: fd.password });
        if (authErr) throw authErr;
        // The trigger will create a profile with school_admin role, so update it
        await new Promise(r => setTimeout(r, 1000));
        await erp.from('profiles').update({ role: 'parent', org_id: erpOrg.id, full_name: fd.full_name, phone: fd.phone || null }).eq('user_id', authData.user.id);
        showToast('Parent account created!', 'success');
        closeSlideModal();
        renderParentManage();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }, 50);
}

function showLinkParent(profileId) {
  const students = window._allStudents || [];
  const profiles = window._parentProfiles || [];
  openSlideModal('Link Parent to Student', `
    <form id="link-parent-form">
      <div class="form-group"><label>Parent</label>
        <select name="profile_id" ${profileId ? 'readonly' : ''}>
          ${profileId ? `<option value="${profileId}">Selected parent</option>` : profiles.map(p => `<option value="${p.id}">${p.full_name} (${p.email})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Student *</label>
        <select name="student_id" required>
          <option value="">Select student...</option>
          ${students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.classes?.name || 'Unassigned'})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Relationship</label>
        <select name="relationship"><option value="parent">Parent</option><option value="guardian">Guardian</option><option value="other">Other</option></select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Link</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    document.getElementById('link-parent-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = getFormData('link-parent-form');
      await erp.from('parent_students').insert({ org_id: erpOrg.id, profile_id: parseInt(fd.profile_id), student_id: parseInt(fd.student_id), relationship: fd.relationship });
      showToast('Parent linked to student!', 'success');
      closeSlideModal();
      renderParentManage();
    });
  }, 50);
}

/* ============================================================
   TEACHER: CONTACT PARENTS
   ============================================================ */

async function renderTeacherParentComm() {
  const profId = erpProfile.id;
  const { data: teacher } = await erp.from('teachers').select('id').eq('profile_id', profId).single();
  if (!teacher) { el('content-area').innerHTML = '<div class="empty-state">Teacher profile not found.</div>'; return; }
  const { data: myClasses } = await erp.from('classes').select('*, students!inner(id,first_name,last_name,parent_students!inner(profile_id,profiles!inner(id,full_name,email)))').eq('teacher_id', teacher.id);
  const { data: sentMsgs } = await erp.from('parent_communications').select('*, students(first_name,last_name)').eq('sender_id', profId).order('sent_at', { ascending: false }).limit(50);
  let html = `<div class="card"><div class="card-header"><h3>Contact Parents</h3></div><div class="card-body">`;
  // Send message form
  html += `<form id="teacher-comm-form">
    <div class="form-row">
      <div class="form-group"><label>Student *</label>
        <select name="student_id" required>
          <option value="">Select student...</option>`;
  (myClasses.data || []).forEach(c => {
    (c.students || []).forEach(s => {
      const ps = s.parent_students || [];
      if (ps.length) {
        ps.forEach(link => {
          html += `<option value="${s.id}">${s.first_name} ${s.last_name} → ${link.profiles?.full_name || 'Parent'}</option>`;
        });
      }
    });
  });
  html += `</select></div>
      <div class="form-group"><label>Priority</label>
        <select name="priority"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select>
      </div>
    </div>
    <div class="form-group"><label>Title *</label><input name="title" required></div>
    <div class="form-group"><label>Message *</label><textarea name="message" rows="4" required></textarea></div>
    <div class="form-actions"><button type="submit" class="btn btn-primary">Send to Parent</button></div>
  </form>`;
  // Sent messages history
  html += `<div class="mt-3"><h4 style="margin-bottom:8px">Sent Messages</h4>`;
  if (!sentMsgs.data || !sentMsgs.data.length) { html += `<div class="empty-state">No messages sent yet.</div>`; }
  else {
    html += `<div style="max-height:400px;overflow-y:auto">`;
    sentMsgs.data.forEach(m => {
      const priorityColor = { normal: 'var(--primary)', important: 'var(--warning)', urgent: 'var(--danger)' };
      html += `<div class="card mt-1" style="padding:10px;border-left:3px solid ${priorityColor[m.priority] || 'var(--primary)'};font-size:.85rem">
        <div style="display:flex;justify-content:space-between;color:var(--gray-500)">
          <span>To: ${m.students?.first_name || ''} ${m.students?.last_name || ''}</span>
          <span>${new Date(m.sent_at).toLocaleString()}</span>
        </div>
        <div style="font-weight:600;margin-top:2px">${m.title} <span class="badge badge-${m.priority === 'urgent' ? 'danger' : m.priority === 'important' ? 'warning' : 'info'}" style="font-size:.65rem">${m.priority}</span></div>
        <div style="margin-top:2px">${m.message}</div>
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div></div></div>`;
  el('content-area').innerHTML = html;
  setTimeout(() => {
    const form = document.getElementById('teacher-comm-form');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = getFormData('teacher-comm-form');
      await erp.from('parent_communications').insert({
        org_id: erpOrg.id, sender_id: profId, student_id: parseInt(fd.student_id),
        title: fd.title, message: fd.message, priority: fd.priority
      });
      showToast('Message sent to parent!', 'success');
      renderTeacherParentComm();
    });
  }, 50);
}

/* ============================================================
   SUPER ADMIN: SCHOOLS
   ============================================================ */

async function renderSchools() {
  const { data } = await erp.from('organizations').select('*, payments(amount,status)').order('created_at', { ascending: false });
  window._TD['schools'] = data || [];
  regTable('schools', ['Name','Email','Plan','Status','Students','Teachers'],
    o => ({ _id: o.id, 'Name': o.name, 'Email': o.email || '-', 'Plan': `<span class="badge badge-info">${o.subscription_plan}</span>`, 'Status': `<span class="badge badge-${o.status === 'active' ? 'success' : o.status === 'pending' ? 'warning' : 'danger'}">${o.status}</span>`, 'Students': `${o.max_students}`, 'Teachers': `${o.max_teachers}` }),
    row => `<button class="btn btn-sm btn-primary" onclick="editOrg(${row._id})">Edit</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('organizations',${row._id},'School')">Delete</button>`
  );
  renderFilteredTable('schools', el('content-area'), [
    { type: 'search', fields: ['name','email'], placeholder: 'Search school...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'active',label:'Active'},{value:'pending',label:'Pending'},{value:'suspended',label:'Suspended'},{value:'rejected',label:'Rejected'}] },
    { type: 'select', key: 'subscription_plan', label: 'All Plans', options: [{value:'basic',label:'Basic'},{value:'standard',label:'Standard'},{value:'premium',label:'Premium'}] }
  ], 'All Schools');
}

async function editOrg(id) {
  const { data } = await erp.from('organizations').select('*').eq('id', id).single();
  if (!data) return;
  modal('Edit School', `
    <form id="org-form">
      <div class="form-group"><label>Name</label><input name="name" value="${data.name}"></div>
      <div class="form-group"><label>Email</label><input name="email" value="${data.email || ''}"></div>
      <div class="form-row">
        <div class="form-group"><label>Plan</label><select name="subscription_plan">
          <option value="basic" ${data.subscription_plan === 'basic' ? 'selected' : ''}>Basic</option>
          <option value="standard" ${data.subscription_plan === 'standard' ? 'selected' : ''}>Standard</option>
          <option value="premium" ${data.subscription_plan === 'premium' ? 'selected' : ''}>Premium</option>
        </select></div>
        <div class="form-group"><label>Status</label><select name="status">
          <option value="active" ${data.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="suspended" ${data.status === 'suspended' ? 'selected' : ''}>Suspended</option>
          <option value="rejected" ${data.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Max Students</label><input type="number" name="max_students" value="${data.max_students}"></div>
        <div class="form-group"><label>Max Teachers</label><input type="number" name="max_teachers" value="${data.max_teachers}"></div>
      </div>
    </form>`, async () => {
    const fd = getFormData('org-form');
    await erp.from('organizations').update(fd).eq('id', id);
    showToast('School updated!', 'success');
    closeModal();
    navigate('schools');
  });
}

/* ============================================================
   SUPER ADMIN: ENROLLMENTS
   ============================================================ */

async function renderEnrollments() {
  const { data } = await erp.from('organizations').select('*, payments(amount,status,plan_id,payment_method,created_at)').order('created_at', { ascending: false });
  const list = data || [];
  const pending = list.filter(o => o.status === 'pending');
  const others = list.filter(o => o.status !== 'pending');
  let html = `<div class="card"><div class="card-header"><h3>Pending Enrollments</h3></div><div class="card-body"><div class="table-wrap"><table><thead><tr><th>School</th><th>Email</th><th>Plan</th><th>Payment</th><th>Date</th><th></th></tr></thead><tbody>`;
  if (!pending.length) {
    html += `<tr><td colspan="6" class="empty-state">No pending enrollments</td></tr>`;
  } else {
    pending.forEach(o => {
      const pay = o.payments?.[0];
      const payStatus = pay?.status === 'completed' ? 'Paid' : 'Pending';
      const payBadge = pay?.status === 'completed' ? 'success' : 'warning';
      html += `<tr>
        <td><strong>${o.name}</strong></td>
        <td>${o.email || '-'}</td>
        <td><span class="badge badge-info">${o.subscription_plan}</span></td>
        <td><span class="badge badge-${payBadge}">${payStatus}${pay?.amount ? ' — ₹' + pay.amount : ''}</span></td>
        <td style="font-size:.8rem">${new Date(o.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="approveEnrollment(${o.id})">Approve</button>
          <button class="btn btn-sm btn-danger ms-1" onclick="rejectEnrollment(${o.id})">Reject</button>
        </td>
      </tr>`;
    });
  }
  html += `</tbody></table></div></div></div>`;
  if (others.length) {
    html += `<div class="card mt-3"><div class="card-header"><h3>All Enrollments</h3></div><div class="card-body"><div class="table-wrap"><table><thead><tr><th>School</th><th>Email</th><th>Plan</th><th>Status</th><th>Payment</th><th>Date</th><th></th></tr></thead><tbody>`;
    others.forEach(o => {
      const pay = o.payments?.[0];
      const payInfo = pay ? `<span class="badge badge-${pay.status === 'completed' ? 'success' : 'warning'}">${pay.status || 'pending'} ₹${pay.amount}</span>` : '-';
      const statusBadge = o.status === 'active' ? 'success' : o.status === 'rejected' ? 'danger' : 'warning';
      const actions = o.status === 'active'
        ? `<button class="btn btn-sm btn-outline" onclick="resendEnrollmentLink(${o.id})">Resend Link</button> <button class="btn btn-sm btn-danger ms-1" onclick="unenrollOrganization(${o.id})">Unenroll</button>`
        : '';
      html += `<tr>
        <td><strong>${o.name}</strong></td>
        <td>${o.email || '-'}</td>
        <td><span class="badge badge-info">${o.subscription_plan}</span></td>
        <td><span class="badge badge-${statusBadge}">${o.status}</span></td>
        <td>${payInfo}</td>
        <td style="font-size:.8rem">${new Date(o.created_at).toLocaleDateString()}</td>
        <td>${actions}</td>
      </tr>`;
    });
    html += `</tbody></table></div></div></div>`;
  }
  // Profiles without org (re-enroll candidates)
  const { data: orphanProfiles } = await erp.from('profiles').select('id,email,full_name,phone,user_id').is('org_id', null).eq('role', 'school_admin').order('created_at', { ascending: false });
  if (orphanProfiles?.length) {
    html += `<div class="card mt-3"><div class="card-header"><h3>Re-enroll Users</h3></div><div class="card-body"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr></thead><tbody>`;
    orphanProfiles.forEach(p => {
      html += `<tr>
        <td><strong>${p.full_name || '-'}</strong></td>
        <td>${p.email || '-'}</td>
        <td>${p.phone || '-'}</td>
        <td><button class="btn btn-sm btn-success" onclick="reEnrollUser(${p.id})">Re-enroll</button></td>
      </tr>`;
    });
    html += `</tbody></table></div></div></div>`;
  }
  el('content-area').innerHTML = html;
}

async function reEnrollUser(profileId) {
  if (!confirm('Create a new pending enrollment for this user?')) return;
  try {
    const { data: prof } = await erp.from('profiles').select('*, organizations(*)').eq('id', profileId).single();
    if (!prof) throw new Error('Profile not found');
    if (prof.org_id) throw new Error('User already has an organization');
    const { data: plan } = await erp.from('plans').select('*').eq('is_active', true).order('price').limit(1).single();
    if (!plan) throw new Error('No active plan found');
    const slug = (prof.full_name || 'school').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
    const { data: org, error: orgErr } = await erp.from('organizations').insert({
      name: (prof.full_name || 'School') + ' School', slug, email: prof.email, phone: prof.phone || null,
      subscription_plan: plan.slug, status: 'pending',
      max_students: plan.max_students || 100, max_teachers: plan.max_teachers || 20
    }).select().single();
    if (orgErr) throw new Error(orgErr.message);
    await erp.from('profiles').update({ org_id: org.id }).eq('id', profileId);
    const payStatus = plan.price === 0 ? 'completed' : 'pending';
    await erp.from('payments').insert({
      org_id: org.id, plan_id: plan.id, amount: plan.price,
      type: 'subscription', status: payStatus, payment_method: 'offline',
      notes: 'Re-enrolled by admin'
    });
    const { error: mailErr } = await erp.auth.resetPasswordForEmail(prof.email, {
      redirectTo: window.location.origin + '/eduErp/index.html'
    });
    if (mailErr) console.error('Failed to send setup email:', mailErr.message);
    showToast('Re-enrollment created! Pending approval. Email sent to ' + prof.email, 'success');
    navigate('enrollments');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function approveEnrollment(id) {
  if (!confirm('Approve this enrollment? Payment will be marked as completed and the school will be activated.')) return;
  try {
    // Get org details for sending email
    const { data: org } = await erp.from('organizations').select('*').eq('id', id).single();
    if (!org) throw new Error('Organization not found');
    await erp.from('organizations').update({ status: 'active' }).eq('id', id);
    // Update payment status to completed
    const { data: pay } = await erp.from('payments').select('id').eq('org_id', id).maybeSingle();
    if (pay) await erp.from('payments').update({ status: 'completed', paid_date: new Date().toISOString() }).eq('id', pay.id);
    // Send password setup email to the school admin
    const { error: mailErr } = await erp.auth.resetPasswordForEmail(org.email, {
      redirectTo: window.location.origin + '/eduErp/index.html'
    });
    if (mailErr) console.error('Failed to send setup email:', mailErr.message);
    else showToast('Approved! Setup email sent to ' + org.email, 'success');
    navigate('enrollments');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function rejectEnrollment(id) {
  if (!confirm('Reject this enrollment? The school will be marked as rejected.')) return;
  try {
    await erp.from('organizations').update({ status: 'rejected' }).eq('id', id);
    showToast('Enrollment rejected.', 'info');
    navigate('enrollments');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function resendEnrollmentLink(id) {
  if (!confirm('Resend password setup email to the school admin?')) return;
  try {
    const { data: org, error } = await erp.from('organizations').select('email').eq('id', id).single();
    if (error || !org) throw new Error('Organization not found');
    const { error: mailErr } = await erp.auth.resetPasswordForEmail(org.email, {
      redirectTo: window.location.origin + '/eduErp/index.html'
    });
    if (mailErr) throw new Error(mailErr.message);
    showToast('Setup email resent to ' + org.email, 'success');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

async function unenrollOrganization(id) {
  if (!confirm('Unenroll this school? The organization will be deactivated. This can be reversed.')) return;
  try {
    await erp.from('organizations').update({ status: 'unenrolled' }).eq('id', id);
    showToast('School has been unenrolled.', 'info');
    navigate('enrollments');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

/* ============================================================
   SUPER ADMIN: PLANS
   ============================================================ */

async function renderPlans() {
  const { data } = await erp.from('plans').select('*').order('price');
  window._TD['plans'] = data || [];
  regTable('plans', ['Name','Price','Billing','Max Students','Status'],
    p => ({ _id: p.id, 'Name': p.name, 'Price': `₹${p.price}`, 'Billing': p.billing_cycle, 'Max Students': String(p.max_students), 'Status': `<span class="badge badge-${p.is_active ? 'success' : 'danger'}">${p.is_active ? 'Active' : 'Inactive'}</span>` }),
    row => `<button class="btn btn-sm btn-outline" onclick="editPlan(${row._id})">Edit</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('plans',${row._id},'Plan')">Delete</button>`
  );
  renderFilteredTable('plans', el('content-area'), [
    { type: 'search', fields: ['name'], placeholder: 'Search plan...' },
    { type: 'select', key: 'is_active', label: 'All Status', options: [{value:'true',label:'Active'},{value:'false',label:'Inactive'}] }
  ], 'Subscription Plans', `<button class="btn btn-primary btn-sm" onclick="showAddPlan()">+ Add Plan</button>`);
}

function showAddPlan() {
  modal('Add Plan', `
    <form id="plan-form">
      <div class="form-group"><label>Plan Name</label><input name="name" required></div>
      <div class="form-row">
        <div class="form-group"><label>Price (₹)</label><input type="number" name="price" step="0.01" required></div>
        <div class="form-group"><label>Billing Cycle</label><select name="billing_cycle"><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Max Students</label><input type="number" name="max_students" value="100"></div>
        <div class="form-group"><label>Max Teachers</label><input type="number" name="max_teachers" value="20"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
    </form>`, async () => {
    const fd = getFormData('plan-form');
    fd.slug = fd.name.toLowerCase().replace(/\s+/g, '-');
    fd.features = '[]';
    await erp.from('plans').insert(fd);
    showToast('Plan added!', 'success');
    closeModal();
    navigate('plans');
  });
}

async function editPlan(id) { showToast('Edit via Supabase dashboard for full feature control.', 'info'); }

/* ============================================================
   SUPER ADMIN: REVENUE
   ============================================================ */

async function renderRevenue() {
  const [payments, orgs] = await Promise.all([
    erp.from('payments').select('*, organizations(name)').order('created_at', { ascending: false }),
    erp.from('organizations').select('*'),
  ]);
  const totalRevenue = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const subsRevenue = payments.data?.filter(p => p.type === 'subscription').reduce((s, p) => s + Number(p.amount), 0) || 0;
  const completedPayments = payments.data?.filter(p => p.status === 'completed').length || 0;
  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Revenue</div><div class="value">₹${totalRevenue.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Subscription Revenue</div><div class="value">₹${subsRevenue.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Completed Payments</div><div class="value">${completedPayments}</div></div>
    </div>`;
  window._TD['revenue'] = payments.data || [];
  regTable('revenue', ['Organization','Amount','Type','Status','Date'],
    p => ({ _id: p.id, 'Organization': p.organizations?.name || '-', 'Amount': `₹${p.amount}`, 'Type': p.type, 'Status': `<span class="badge badge-${p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}">${p.status}</span>`, 'Date': new Date(p.created_at).toLocaleDateString() }),
    row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('payments',${row._id},'Payment')">Delete</button>`
  );
  renderFilteredTable('revenue', el('content-area'), [
    { type: 'search', fields: [], placeholder: 'Search organization...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'completed',label:'Completed'},{value:'pending',label:'Pending'},{value:'failed',label:'Failed'}] },
    { type: 'select', key: 'type', label: 'All Types', options: [{value:'subscription',label:'Subscription'},{value:'donation',label:'Donation'},{value:'fee',label:'Fee'}] }
  ], 'All Payments');
}

/* ============================================================
   SCHOOL ADMIN: STUDENTS
   ============================================================ */

async function renderStudents() {
  const { data } = await erp.from('students').select('*, classes(name)').eq('org_id', erpOrg.id).order('created_at', { ascending: false });
  window._TD['students'] = data || [];
  regTable('students', ['Roll No','Name','Class','Email','Phone','Status'],
    s => ({ _id: s.id, 'Roll No': s.roll_number || '-', 'Name': `${s.first_name} ${s.last_name}`, 'Class': s.classes?.name || '-', 'Email': s.email || '-', 'Phone': s.phone || '-', 'Status': `<span class="badge badge-${s.status === 'active' ? 'success' : 'danger'}">${s.status}</span>` }),
    row => `<button class="btn btn-sm btn-outline" onclick="showEditStudent(${row._id})">Edit</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('students',${row._id},'Student')">Delete</button>`
  );
  renderFilteredTable('students', el('content-area'), [
    { type: 'search', fields: ['first_name','last_name','roll_number'], placeholder: 'Search name or roll...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'graduated',label:'Graduated'}] }
  ], 'Students', `<button class="btn btn-primary btn-sm" onclick="showAddStudent()">+ Add Student</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('students')">Import CSV</button>`);
}

async function showAddStudent() {
  const { data: classes } = await erp.from('classes').select('*').eq('org_id', erpOrg.id);
  openSlideModal('Add Student', `
    <form id="student-form">
      <div class="form-row">
        <div class="form-group"><label>First Name</label><input name="first_name" required></div>
        <div class="form-group"><label>Last Name</label><input name="last_name" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" name="email"></div>
        <div class="form-group"><label>Phone</label><input name="phone"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select name="class_id"><option value="">No Class</option>${(classes || []).map(c => `<option value="${c.id}">${c.name} ${c.section || ''}</option>`).join('')}</select></div>
        <div class="form-group"><label>Roll Number</label><input name="roll_number"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Gender</label><select name="gender"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
        <div class="form-group"><label>Guardian Name</label><input name="guardian_name"></div>
      </div>
      <div class="form-group"><label>Guardian Phone</label><input name="guardian_phone"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('student-form');
    fd.org_id = erpOrg.id;
    await erp.from('students').insert(fd);
    showToast('Student added!', 'success');
    closeSlideModal();
    navigate('students');
  });
}

async function showEditStudent(id) {
  const { data } = await erp.from('students').select('*').eq('id', id).single();
  if (!data) return;
  const { data: classes } = await erp.from('classes').select('*').eq('org_id', erpOrg.id);
  openSlideModal('Edit Student', `
    <form id="student-form">
      <div class="form-row">
        <div class="form-group"><label>First Name</label><input name="first_name" value="${data.first_name}"></div>
        <div class="form-group"><label>Last Name</label><input name="last_name" value="${data.last_name}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input name="email" value="${data.email || ''}"></div>
        <div class="form-group"><label>Phone</label><input name="phone" value="${data.phone || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select name="class_id"><option value="">No Class</option>${(classes || []).map(c => `<option value="${c.id}" ${data.class_id === c.id ? 'selected' : ''}>${c.name} ${c.section || ''}</option>`).join('')}</select></div>
        <div class="form-group"><label>Roll Number</label><input name="roll_number" value="${data.roll_number || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Gender</label><select name="gender"><option value="">Select</option><option value="male" ${data.gender === 'male' ? 'selected' : ''}>Male</option><option value="female" ${data.gender === 'female' ? 'selected' : ''}>Female</option><option value="other" ${data.gender === 'other' ? 'selected' : ''}>Other</option></select></div>
        <div class="form-group"><label>Status</label><select name="status">
          <option value="active" ${data.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${data.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          <option value="graduated" ${data.status === 'graduated' ? 'selected' : ''}>Graduated</option>
        </select></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('student-form');
    await erp.from('students').update(fd).eq('id', id);
    showToast('Student updated!', 'success');
    closeSlideModal();
    navigate('students');
  });
}

/* ============================================================
   SCHOOL ADMIN: TEACHERS
   ============================================================ */

async function renderTeachers() {
  const { data } = await erp.from('teachers').select('*').eq('org_id', erpOrg.id).order('created_at', { ascending: false });
  window._TD['teachers'] = data || [];
  regTable('teachers', ['Employee ID','Name','Email','Qualification','Status'],
    t => ({ _id: t.id, 'Employee ID': t.employee_id || '-', 'Name': `${t.first_name} ${t.last_name}`, 'Email': t.email || '-', 'Qualification': t.qualification || '-', 'Status': `<span class="badge badge-${t.status === 'active' ? 'success' : 'danger'}">${t.status}</span>` }),
    row => `<button class="btn btn-sm btn-outline" onclick="showEditTeacher(${row._id})">Edit</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('teachers',${row._id},'Teacher')">Delete</button>`
  );
  renderFilteredTable('teachers', el('content-area'), [
    { type: 'search', fields: ['first_name','last_name','employee_id'], placeholder: 'Search name or ID...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}] }
  ], 'Teachers', `<button class="btn btn-primary btn-sm" onclick="showAddTeacher()">+ Add Teacher</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('teachers')">Import CSV</button>`);
}

function showAddTeacher() {
  openSlideModal('Add Teacher', `
    <form id="teacher-form">
      <div class="form-row">
        <div class="form-group"><label>First Name</label><input name="first_name" required></div>
        <div class="form-group"><label>Last Name</label><input name="last_name" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" name="email"></div>
        <div class="form-group"><label>Phone</label><input name="phone"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Employee ID</label><input name="employee_id"></div>
        <div class="form-group"><label>Qualification</label><input name="qualification"></div>
      </div>
      <div class="form-group"><label>Specialization</label><input name="specialization"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('teacher-form');
    fd.org_id = erpOrg.id;
    await erp.from('teachers').insert(fd);
    showToast('Teacher added!', 'success');
    closeSlideModal();
    navigate('teachers');
  });
}

async function showEditTeacher(id) {
  const { data } = await erp.from('teachers').select('*').eq('id', id).single();
  if (!data) return;
  openSlideModal('Edit Teacher', `
    <form id="teacher-form">
      <div class="form-row">
        <div class="form-group"><label>First Name</label><input name="first_name" value="${data.first_name}"></div>
        <div class="form-group"><label>Last Name</label><input name="last_name" value="${data.last_name}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input name="email" value="${data.email || ''}"></div>
        <div class="form-group"><label>Phone</label><input name="phone" value="${data.phone || ''}"></div>
      </div>
      <div class="form-group"><label>Qualification</label><input name="qualification" value="${data.qualification || ''}"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('teacher-form');
    await erp.from('teachers').update(fd).eq('id', id);
    showToast('Teacher updated!', 'success');
    closeSlideModal();
    navigate('teachers');
  });
}

/* ============================================================
   SCHOOL ADMIN: CLASSES
   ============================================================ */

async function renderClasses() {
  const { data: classData } = await erp.from('classes').select('*, teachers(first_name,last_name)').eq('org_id', erpOrg.id).order('name');
  const { data: counts } = await erp.from('students').select('class_id').eq('org_id', erpOrg.id).eq('status', 'active');
  const studentCounts = {};
  (counts || []).forEach(s => { const k = s.class_id; if (k) studentCounts[k] = (studentCounts[k] || 0) + 1; });
  window._TD['classes'] = classData || [];
  regTable('classes', ['Name','Section','Teacher','Students','Room','Academic Year'],
    c => ({ _id: c.id, 'Name': c.name, 'Section': c.section || '-', 'Teacher': c.teachers ? `${c.teachers.first_name} ${c.teachers.last_name}` : '-', 'Students': String(studentCounts[c.id] || 0), 'Room': c.room || '-', 'Academic Year': c.academic_year || '-' }),
    row => `<button class="btn btn-sm btn-outline" onclick="showEditClass(${row._id})">Edit</button><button class="btn btn-sm btn-primary ms-1" onclick="assignStudents(${row._id})">Students</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('classes',${row._id},'Class')">Delete</button>`
  );
  const years = [...new Set((classData || []).filter(c => c.academic_year).map(c => c.academic_year))];
  renderFilteredTable('classes', el('content-area'), [
    { type: 'search', fields: ['name'], placeholder: 'Search class name...' },
    { type: 'select', key: 'academic_year', label: 'All Years', options: years.map(y => ({value:y, label:y})) }
  ], 'Classes', `<button class="btn btn-primary btn-sm" onclick="showAddClass()">+ Add Class</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('classes')">Import CSV</button>`);
}

async function assignStudents(classId) {
  const { data: classData } = await erp.from('classes').select('*, teachers(first_name,last_name)').eq('id', classId).single();
  const { data: allStudents } = await erp.from('students').select('*').eq('org_id', erpOrg.id).eq('status', 'active');
  const assignedIds = new Set((allStudents || []).filter(s => s.class_id === classId).map(s => s.id));
  let html = `<div class="card"><div class="card-header"><h3>Students in ${classData?.name || 'Class'}</h3></div><div class="card-body">`;
  if (!allStudents || !allStudents.length) { html += '<p class="empty-state">No active students.</p>'; } else {
    html += `<div style="max-height:400px;overflow-y:auto">`;
    allStudents.forEach(s => {
      const checked = assignedIds.has(s.id) ? 'checked' : '';
      html += `<label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--gray-100);cursor:pointer">
        <input type="checkbox" class="assign-chk" data-sid="${s.id}" ${checked}>
        <span>${s.first_name} ${s.last_name} (${s.roll_number || 'no roll'})</span>
      </label>`;
    });
    html += `</div>`;
  }
  html += `<div class="form-actions mt-2">
    <button class="btn btn-outline" onclick="navigate('classes')">Back</button>
    <button class="btn btn-primary" onclick="saveAssignStudents(${classId})">Save</button>
  </div></div></div>`;
  el('content-area').innerHTML = html;
}

/* ============================================================
   TEACHER: MY SCHEDULE
   ============================================================ */

async function renderTeacherSchedule() {
  const teacherData = await erp.from('teachers').select('*').eq('profile_id', erpProfile.id).single();
  if (!teacherData.data) {
    el('content-area').innerHTML = '<div class="empty-state"><p>Teacher profile not linked.</p></div>';
    return;
  }
  const teacherId = teacherData.data.id;
  const [schedulesRes, classesRes, subjectsRes] = await Promise.all([
    erp.from('class_schedules').select('*').eq('teacher_id', teacherId).order('day_of_week').order('period_number'),
    erp.from('classes').select('*').eq('org_id', erpOrg.id),
    erp.from('subjects').select('*').eq('org_id', erpOrg.id),
  ]);
  const schedules = schedulesRes.data || [];
  const classes = classesRes.data || [];
  const subjects = subjectsRes.data || [];
  const classMap = {};
  classes.forEach(c => { classMap[c.id] = c; });
  const subjMap = {};
  subjects.forEach(s => { subjMap[s.id] = s; });
  if (!schedules.length) {
    el('content-area').innerHTML = '<div class="empty-state"><p>No classes scheduled for you.</p></div>';
    return;
  }
  const today = new Date().getDay();
  const selectedDay = window._tdDay !== undefined ? window._tdDay : (today >= 1 && today <= 6 ? today : 1);
  window._tdDay = selectedDay;
  const daySchedules = schedules.filter(s => s.day_of_week === selectedDay).sort((a, b) => a.period_number - b.period_number);
  const weekDays = [1, 2, 3, 4, 5, 6];
  let html = `<div class="card"><div class="card-header"><h3>My Schedule</h3></div><div class="card-body">
    <div class="flex gap-1" style="flex-wrap:wrap;margin-bottom:16px">`;
  weekDays.forEach(d => {
    const active = d === selectedDay ? 'btn-primary' : 'btn-outline';
    const todayClass = d === today ? ' (Today)' : '';
    html += `<button class="btn btn-sm ${active}" onclick="window._tdDay=${d};renderTeacherSchedule()">${DAYS_SHORT[d]}${todayClass}</button>`;
  });
  html += `</div>`;
  if (!daySchedules.length) {
    html += `<div class="empty-state"><p>No classes on ${DAYS[selectedDay]}.</p></div>`;
  } else {
    html += `<div class="table-wrap"><table>
      <thead><tr><th>Period</th><th>Class</th><th>Subject</th><th>Time</th></tr></thead><tbody>`;
    daySchedules.forEach(s => {
      const cls = classMap[s.class_id];
      const subj = subjMap[s.subject_id];
      html += `<tr>
        <td><strong>${s.period_number}</strong></td>
        <td>${cls ? `${cls.name} ${cls.section || ''}${cls.room ? ' (' + cls.room + ')' : ''}` : '-'}</td>
        <td>${subj?.name || '-'}</td>
        <td>${s.start_time?.substring(0, 5) || '-'} - ${s.end_time?.substring(0, 5) || '-'}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }
  html += `</div></div>`;
  el('content-area').innerHTML = html;
}

/* ============================================================
   NOTES (shared helpers)
   ============================================================ */

let _notesRenderer = null;

async function showAddNoteForm() {
  openSlideModal('Add Note', `
    <form id="note-form">
      <div class="form-group"><label>Title</label><input name="title" required></div>
      <div class="form-group"><label>Content</label><textarea name="content" rows="5"></textarea></div>
      <div class="form-actions"><button type="submit" class="btn btn-primary">Save</button></div>
    </form>
  `);
  setTimeout(() => {
    document.getElementById('note-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = getFormData('note-form');
      await erp.from('notes').insert({ org_id: erpOrg.id, profile_id: erpProfile.id, title: fd.title, content: fd.content });
      showToast('Note added!', 'success');
      closeSlideModal();
      if (_notesRenderer) _notesRenderer();
    });
  }, 50);
}

async function editNote(id) {
  const { data: note } = await erp.from('notes').select('*').eq('id', id).single();
  if (!note) return;
  openSlideModal('Edit Note', `
    <form id="note-form">
      <div class="form-group"><label>Title</label><input name="title" required></div>
      <div class="form-group"><label>Content</label><textarea name="content" rows="5"></textarea></div>
      <div class="form-actions"><button type="submit" class="btn btn-primary">Save</button></div>
    </form>
  `);
  setTimeout(() => {
    document.querySelector('[name="title"]').value = note.title;
    document.querySelector('[name="content"]').value = note.content || '';
    document.getElementById('note-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = getFormData('note-form');
      await erp.from('notes').update({ title: fd.title, content: fd.content }).eq('id', id);
      showToast('Note updated!', 'success');
      closeSlideModal();
      if (_notesRenderer) _notesRenderer();
    });
  }, 50);
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  await erp.from('notes').delete().eq('id', id);
  showToast('Note deleted!', 'success');
  if (_notesRenderer) _notesRenderer();
}

/* ============================================================
   TEACHER: MY NOTES
   ============================================================ */

async function renderTeacherNotes() {
  _notesRenderer = renderTeacherNotes;
  const { data: notes } = await erp.from('notes').select('*').eq('profile_id', erpProfile.id).order('created_at', { ascending: false });
  const list = notes || [];
  let html = `<div class="card"><div class="card-header"><h3>My Notes</h3><button class="btn btn-primary btn-sm" onclick="showAddNoteForm()">+ Add Note</button></div>
    <div class="card-body">`;
  if (!list.length) {
    html += `<div class="empty-state"><p>No notes yet.</p></div>`;
  } else {
    list.forEach(n => {
      html += `<div class="note-item">
        <div class="note-header">
          <strong>${n.title}</strong>
          <div>
            <button class="btn btn-sm btn-outline" onclick="editNote(${n.id})">Edit</button>
            <button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="deleteNote(${n.id})">Delete</button>
          </div>
        </div>
        ${n.content ? `<div class="note-content">${n.content}</div>` : ''}
        <div class="note-date">${new Date(n.created_at).toLocaleDateString()}</div>
      </div>`;
    });
  }
  html += `</div></div>`;
  el('content-area').innerHTML = html;
}

/* ============================================================
   STUDENT: MY NOTES
   ============================================================ */

async function renderStudentNotes() {
  _notesRenderer = renderStudentNotes;
  const { data: notes } = await erp.from('notes').select('*').eq('profile_id', erpProfile.id).order('created_at', { ascending: false });
  const list = notes || [];
  let html = `<div class="card"><div class="card-header"><h3>My Notes</h3><button class="btn btn-primary btn-sm" onclick="showAddNoteForm()">+ Add Note</button></div>
    <div class="card-body">`;
  if (!list.length) {
    html += `<div class="empty-state"><p>No notes yet.</p></div>`;
  } else {
    list.forEach(n => {
      html += `<div class="note-item">
        <div class="note-header">
          <strong>${n.title}</strong>
          <div>
            <button class="btn btn-sm btn-outline" onclick="editNote(${n.id})">Edit</button>
            <button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="deleteNote(${n.id})">Delete</button>
          </div>
        </div>
        ${n.content ? `<div class="note-content">${n.content}</div>` : ''}
        <div class="note-date">${new Date(n.created_at).toLocaleDateString()}</div>
      </div>`;
    });
  }
  html += `</div></div>`;
  el('content-area').innerHTML = html;
}
async function saveAssignStudents(classId) {
  const sids = [...document.querySelectorAll('.assign-chk:checked')].map(cb => parseInt(cb.dataset.sid));
  const allSt = await erp.from('students').select('id, class_id').eq('org_id', erpOrg.id).eq('status', 'active');
  const unassigned = (allSt.data || []).filter(s => s.class_id === classId && !sids.includes(s.id)).map(s => s.id);
  await erp.from('students').update({ class_id: classId }).eq('org_id', erpOrg.id).in('id', sids);
  for (const sid of unassigned) {
    const s = await erp.from('students').select('class_id').eq('id', sid).single();
    if (s.data?.class_id === classId) {
      await erp.from('students').update({ class_id: null }).eq('id', sid);
    }
  }
  showToast(`Assigned ${sids.length} students to class`, 'success');
  navigate('classes');
}

async function showAddClass() {
  const { data: teachers } = await erp.from('teachers').select('*').eq('org_id', erpOrg.id).eq('status', 'active');
  openSlideModal('Add Class', `
    <form id="class-form">
      <div class="form-row">
        <div class="form-group"><label>Class Name</label><input name="name" required placeholder="e.g. Class 10"></div>
        <div class="form-group"><label>Section</label><input name="section" placeholder="e.g. A"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Teacher</label><select name="teacher_id">
          <option value="">Select</option>
          ${(teachers || []).map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Room</label><input name="room"></div>
      </div>
      <div class="form-group"><label>Academic Year</label><input name="academic_year" placeholder="e.g. 2025-26"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('class-form');
    fd.org_id = erpOrg.id;
    await erp.from('classes').insert(fd);
    showToast('Class added!', 'success');
    closeSlideModal();
    navigate('classes');
  });
}

async function showEditClass(id) {
  const { data } = await erp.from('classes').select('*').eq('id', id).single();
  if (!data) return;
  const { data: teachers } = await erp.from('teachers').select('*').eq('org_id', erpOrg.id).eq('status', 'active');
  openSlideModal('Edit Class', `
    <form id="class-form">
      <div class="form-row">
        <div class="form-group"><label>Class Name</label><input name="name" value="${data.name}" required></div>
        <div class="form-group"><label>Section</label><input name="section" value="${data.section || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Teacher</label><select name="teacher_id">
          <option value="">Select</option>
          ${(teachers || []).map(t => `<option value="${t.id}" ${data.teacher_id === t.id ? 'selected' : ''}>${t.first_name} ${t.last_name}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Room</label><input name="room" value="${data.room || ''}"></div>
      </div>
      <div class="form-group"><label>Academic Year</label><input name="academic_year" value="${data.academic_year || ''}"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('class-form');
    await erp.from('classes').update(fd).eq('id', id);
    showToast('Class updated!', 'success');
    closeSlideModal();
    navigate('classes');
  });
}

/* ============================================================
   SCHOOL ADMIN: SUBJECTS
   ============================================================ */

async function renderSubjects() {
  const { data } = await erp.from('subjects').select('*, classes(name), teachers(first_name,last_name)').eq('org_id', erpOrg.id).order('name');
  window._TD['subjects'] = data || [];
  regTable('subjects', ['Subject','Code','Class','Teacher'],
    s => ({ _id: s.id, 'Subject': s.name, 'Code': s.code || '-', 'Class': s.classes?.name || '-', 'Teacher': s.teachers ? `${s.teachers.first_name} ${s.teachers.last_name}` : '-' }),
    row => `<button class="btn btn-sm btn-outline" onclick="showEditSubject(${row._id})">Edit</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('subjects',${row._id},'Subject')">Delete</button>`
  );
  const classOpts = [...new Map((data || []).filter(s => s.classes).map(s => [s.classes.id, s.classes.name]))];
  renderFilteredTable('subjects', el('content-area'), [
    { type: 'search', fields: ['name','code'], placeholder: 'Search subject...' },
    { type: 'select', key: 'class_id', label: 'All Classes', options: classOpts.map(([id,name]) => ({value:String(id), label:name})) }
  ], 'Subjects', `<button class="btn btn-primary btn-sm" onclick="showAddSubject()">+ Add Subject</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('subjects')">Import CSV</button>`);
}

async function showAddSubject() {
  const [classes, teachers] = await Promise.all([
    erp.from('classes').select('*').eq('org_id', erpOrg.id),
    erp.from('teachers').select('*').eq('org_id', erpOrg.id).eq('status', 'active'),
  ]);
  openSlideModal('Add Subject', `
    <form id="subject-form">
      <div class="form-row">
        <div class="form-group"><label>Subject Name</label><input name="name" required></div>
        <div class="form-group"><label>Code</label><input name="code"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select name="class_id">${(classes.data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Teacher</label><select name="teacher_id"><option value="">Select</option>${(teachers.data || []).map(t => `<option value="${t.id}">${t.first_name} ${t.last_name}</option>`).join('')}</select></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('subject-form');
    fd.org_id = erpOrg.id;
    await erp.from('subjects').insert(fd);
    showToast('Subject added!', 'success');
    closeSlideModal();
    navigate('subjects');
  });
}

async function showEditSubject(id) {
  const { data } = await erp.from('subjects').select('*').eq('id', id).single();
  if (!data) return;
  const [classes, teachers] = await Promise.all([
    erp.from('classes').select('*').eq('org_id', erpOrg.id),
    erp.from('teachers').select('*').eq('org_id', erpOrg.id).eq('status', 'active'),
  ]);
  openSlideModal('Edit Subject', `
    <form id="subject-form">
      <div class="form-row">
        <div class="form-group"><label>Subject Name</label><input name="name" value="${data.name}" required></div>
        <div class="form-group"><label>Code</label><input name="code" value="${data.code || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select name="class_id">${(classes.data || []).map(c => `<option value="${c.id}" ${data.class_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Teacher</label><select name="teacher_id"><option value="">Select</option>${(teachers.data || []).map(t => `<option value="${t.id}" ${data.teacher_id === t.id ? 'selected' : ''}>${t.first_name} ${t.last_name}</option>`).join('')}</select></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('subject-form');
    await erp.from('subjects').update(fd).eq('id', id);
    showToast('Subject updated!', 'success');
    closeSlideModal();
    navigate('subjects');
  });
}

/* ============================================================
   SCHOOL ADMIN: SYLLABUS
   ============================================================ */

async function renderSyllabus() {
  const { data } = await erp.from('syllabus').select('*, classes(name), subjects(name)').eq('org_id', erpOrg.id).order('created_at', { ascending: false });
  window._TD['syllabus'] = data || [];
  regTable('syllabus', ['Title','Class','Subject','Topics'],
    s => ({ _id: s.id, 'Title': s.title, 'Class': s.classes?.name || '-', 'Subject': s.subjects?.name || '-', 'Topics': Array.isArray(s.topics) ? s.topics.join(', ') : '-' }),
    row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('syllabus',${row._id},'Syllabus entry')">Delete</button>`
  );
  const classOpts = [...new Map((data || []).filter(s => s.classes).map(s => [s.classes.id, s.classes.name]))];
  const subjOpts = [...new Map((data || []).filter(s => s.subjects).map(s => [s.subjects.id, s.subjects.name]))];
  renderFilteredTable('syllabus', el('content-area'), [
    { type: 'search', fields: ['title'], placeholder: 'Search title...' },
    { type: 'select', key: 'class_id', label: 'All Classes', options: classOpts.map(([id,n]) => ({value:String(id), label:n})) },
    { type: 'select', key: 'subject_id', label: 'All Subjects', options: subjOpts.map(([id,n]) => ({value:String(id), label:n})) }
  ], 'Syllabus', `<button class="btn btn-primary btn-sm" onclick="showAddSyllabus()">+ Add Syllabus</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('syllabus')">Import CSV</button>`);
}

async function showAddSyllabus() {
  const [classes, subjects] = await Promise.all([
    erp.from('classes').select('*').eq('org_id', erpOrg.id),
    erp.from('subjects').select('*').eq('org_id', erpOrg.id),
  ]);
  openSlideModal('Add Syllabus', `
    <form id="syllabus-form">
      <div class="form-group"><label>Title</label><input name="title" required></div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select name="class_id">${(classes.data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Subject</label><select name="subject_id">${(subjects.data || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('syllabus-form');
    fd.org_id = erpOrg.id;
    fd.topics = '[]';
    await erp.from('syllabus').insert(fd);
    showToast('Syllabus added!', 'success');
    closeSlideModal();
    navigate('syllabus');
  });
}

/* ============================================================
   SCHOOL ADMIN: EXAMS
   ============================================================ */

async function renderExams() {
  const { data } = await erp.from('exams').select('*, classes(name), subjects(name)').eq('org_id', erpOrg.id).order('created_at', { ascending: false });
  window._TD['exams'] = data || [];
  regTable('exams', ['Title','Class','Subject','Total Marks','Pass %','Status'],
    e => ({ _id: e.id, 'Title': e.title, 'Class': e.classes?.name || '-', 'Subject': e.subjects?.name || '-', 'Total Marks': String(e.total_marks), 'Pass %': `${e.pass_percentage}%`, 'Status': `<span class="badge badge-${e.status === 'published' ? 'success' : e.status === 'completed' ? 'info' : 'warning'}">${e.status}</span>` }),
    row => `<button class="btn btn-sm btn-outline" onclick="manageExam(${row._id})">Manage</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('exams',${row._id},'Exam')">Delete</button>`
  );
  renderFilteredTable('exams', el('content-area'), [
    { type: 'search', fields: ['title'], placeholder: 'Search exam...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'draft',label:'Draft'},{value:'published',label:'Published'},{value:'completed',label:'Completed'}] }
  ], 'Exams', `<button class="btn btn-primary btn-sm" onclick="showAddExam()">+ Create Exam</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('exams')">Import CSV</button>`);
}

async function showAddExam() {
  const [classes, subjects] = await Promise.all([
    erp.from('classes').select('*').eq('org_id', erpOrg.id),
    erp.from('subjects').select('*').eq('org_id', erpOrg.id),
  ]);
  openSlideModal('Create Exam', `
    <form id="exam-form">
      <div class="form-group"><label>Exam Title</label><input name="title" required></div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select name="class_id">${(classes.data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Subject</label><select name="subject_id"><option value="">All</option>${(subjects.data || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Total Marks</label><input type="number" name="total_marks" value="100"></div>
        <div class="form-group"><label>Pass %</label><input type="number" name="pass_percentage" value="40"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Duration (min)</label><input type="number" name="duration_minutes" value="60"></div>
        <div class="form-group"><label>Status</label><select name="status"><option value="draft">Draft</option><option value="published">Published</option></select></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('exam-form');
    fd.org_id = erpOrg.id;
    await erp.from('exams').insert(fd);
    showToast('Exam created!', 'success');
    closeSlideModal();
    navigate('exams');
  });
}

async function manageExam(id) {
  const [exam, questions, results] = await Promise.all([
    erp.from('exams').select('*, classes(name), subjects(name)').eq('id', id).single(),
    erp.from('questions').select('*').eq('exam_id', id).order('order_num'),
    erp.from('exam_results').select('*, students(first_name,last_name)').eq('exam_id', id),
  ]);
  const e = exam.data;
  const qs = questions.data || [];
  const rs = results.data || [];
  let html = `
    <div class="card"><div class="card-header"><h3>${e.title}</h3></div>
    <div class="card-body"><p>Class: ${e.classes?.name} | Subject: ${e.subjects?.name || 'All'} | Marks: ${e.total_marks} | Pass: ${e.pass_percentage}%</p>
    <div class="flex gap-2 mt-2"><button class="btn btn-sm btn-primary" onclick="addQuestion(${id})">+ Add Question</button>
    <button class="btn btn-sm btn-success" onclick="publishExam(${id})">${e.status === 'draft' ? 'Publish' : 'Unpublish'}</button></div></div></div>
    <div class="card mt-2"><div class="card-header"><h3>Questions (${qs.length})</h3></div>
    <div class="card-body">${qs.length ? renderTable(['#','Type','Question','Marks'],[],()=>'') : '<p class="empty-state">No questions yet.</p>'}
    ${qs.map((q,i) => `<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--gray-100)"><span><strong>${i+1}.</strong> ${q.question_text.substring(0,60)}${q.question_text.length > 60 ? '...' : ''}</span><span>${q.type} | ${q.marks} marks</span></div>`).join('')}
    </div></div>
    <div class="card mt-2"><div class="card-header"><h3>Results (${rs.length})</h3></div>
    <div class="card-body">${rs.length ? renderTable(['Student','Marks','Percentage','Status'], rs.map(r => ({
      'Student': r.students ? `${r.students.first_name} ${r.students.last_name}` : '-',
      'Marks': `${r.marks_obtained}/${r.total_marks}`,
      'Percentage': `${r.percentage}%`,
      'Status': `<span class="badge badge-${r.status === 'passed' ? 'success' : 'danger'}">${r.status}</span>`
    }))) : '<p class="empty-state">No results yet.</p>'}</div></div>`;
  el('content-area').innerHTML = html;
}

async function addQuestion(examId) {
  modal('Add Question', `
    <form id="question-form">
      <div class="form-group"><label>Type</label><select name="type" onchange="document.getElementById('mcq-options').style.display=this.value==='mcq'?'block':'none'">
        <option value="mcq">Multiple Choice</option><option value="descriptive">Descriptive</option><option value="scenario">Scenario</option>
      </select></div>
      <div class="form-group"><label>Question</label><textarea name="question_text" required></textarea></div>
      <div id="mcq-options" style="display:none">
        <div class="form-group"><label>Options (comma separated)</label><input name="options" placeholder="Option A, Option B, Option C, Option D"></div>
        <div class="form-group"><label>Correct Answer</label><input name="correct_answer" placeholder="e.g. Option A"></div>
      </div>
      <div class="form-group"><label>Marks</label><input type="number" name="marks" value="1" step="0.5"></div>
    </form>`, async () => {
    const fd = getFormData('question-form');
    fd.exam_id = examId;
    if (fd.type === 'mcq' && fd.options) fd.options = JSON.stringify(fd.options.split(',').map(s => s.trim()));
    else fd.options = null;
    await erp.from('questions').insert(fd);
    showToast('Question added!', 'success');
    closeModal();
    manageExam(examId);
  });
}

async function publishExam(id) {
  const e = await erp.from('exams').select('status').eq('id', id).single();
  const newStatus = e.data?.status === 'draft' ? 'published' : 'draft';
  await erp.from('exams').update({ status: newStatus }).eq('id', id);
  showToast(`Exam ${newStatus}!`, 'success');
  manageExam(id);
}

/* ============================================================
   SCHOOL ADMIN: FEES
   ============================================================ */

async function renderFees() {
  const { data } = await erp.from('fees').select('*, students(first_name,last_name)').eq('org_id', erpOrg.id).order('created_at', { ascending: false });
  const total = data?.reduce((s, f) => s + Number(f.amount), 0) || 0;
  const collected = data?.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0) || 0;
  window._TD['fees'] = data || [];
  regTable('fees', ['Student','Amount','Due Date','Status','Type'],
    f => ({ _id: f.id, 'Student': f.students ? `${f.students.first_name} ${f.students.last_name}` : '-', 'Amount': `₹${f.amount}`, 'Due Date': new Date(f.due_date).toLocaleDateString(), 'Status': `<span class="badge badge-${f.status === 'paid' ? 'success' : f.status === 'pending' ? 'warning' : 'danger'}">${f.status}</span>`, 'Type': f.type }),
    row => `<button class="btn btn-sm btn-success" onclick="markFeePaid(${row._id})">Mark Paid</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('fees',${row._id},'Fee record')">Delete</button>`
  );
  const fTypes = [...new Set((data || []).filter(f => f.type).map(f => f.type))];
  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Fees</div><div class="value">₹${total.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Collected</div><div class="value">₹${collected.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Pending</div><div class="value">₹${(total - collected).toLocaleString()}</div></div>
    </div>`;
  renderFilteredTable('fees', el('content-area'), [
    { type: 'search', fields: [], placeholder: 'Search student...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'paid',label:'Paid'},{value:'pending',label:'Pending'},{value:'overdue',label:'Overdue'}] },
    { type: 'select', key: 'type', label: 'All Types', options: fTypes.map(t => ({value:t, label:t.charAt(0).toUpperCase()+t.slice(1)})) }
  ], 'Fees Records', `<button class="btn btn-primary btn-sm" onclick="showAddFee()">+ Add Fee</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('fees')">Import CSV</button>`);
}

async function showAddFee() {
  const { data: students } = await erp.from('students').select('*').eq('org_id', erpOrg.id).eq('status', 'active');
  openSlideModal('Add Fee', `
    <form id="fee-form">
      <div class="form-group"><label>Student</label><select name="student_id">${(students || []).map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Amount (₹)</label><input type="number" name="amount" step="0.01" required></div>
        <div class="form-group"><label>Type</label><select name="type"><option value="tuition">Tuition</option><option value="exam">Exam</option><option value="library">Library</option><option value="transport">Transport</option><option value="other">Other</option></select></div>
      </div>
      <div class="form-group"><label>Due Date</label><input type="date" name="due_date" required></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('fee-form');
    fd.org_id = erpOrg.id;
    await erp.from('fees').insert(fd);
    showToast('Fee added!', 'success');
    closeSlideModal();
    navigate('fees');
  });
}

async function markFeePaid(id) {
  await erp.from('fees').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', id);
  showToast('Fee marked as paid!', 'success');
  navigate('fees');
}

/* ============================================================
   SCHOOL ADMIN: DONATIONS
   ============================================================ */

async function renderDonations() {
  const { data } = await erp.from('donations').select('*').eq('org_id', erpOrg.id).order('date', { ascending: false });
  const total = data?.reduce((s, d) => s + Number(d.amount), 0) || 0;
  window._TD['donations'] = data || [];
  regTable('donations', ['Donor','Amount','Date','Method','Status'],
    d => ({ _id: d.id, 'Donor': d.donor_name, 'Amount': `₹${d.amount}`, 'Date': new Date(d.date).toLocaleDateString(), 'Method': d.payment_method || '-', 'Status': `<span class="badge badge-${d.status === 'completed' ? 'success' : 'warning'}">${d.status}</span>` }),
    row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('donations',${row._id},'Donation')">Delete</button>`
  );
  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Total Donations</div><div class="value">₹${total.toLocaleString()}</div></div>
      <div class="stat-card"><div class="label">Donors</div><div class="value">${data?.length || 0}</div></div>
    </div>`;
  renderFilteredTable('donations', el('content-area'), [
    { type: 'search', fields: ['donor_name'], placeholder: 'Search donor...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'completed',label:'Completed'},{value:'pending',label:'Pending'}] },
    { type: 'select', key: 'payment_method', label: 'All Methods', options: [{value:'cash',label:'Cash'},{value:'bank',label:'Bank Transfer'},{value:'online',label:'Online'},{value:'cheque',label:'Cheque'}] }
  ], 'Donations', `<button class="btn btn-primary btn-sm" onclick="showAddDonation()">+ Record Donation</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('donations')">Import CSV</button>`);
}

function showAddDonation() {
  openSlideModal('Record Donation', `
    <form id="donation-form">
      <div class="form-row">
        <div class="form-group"><label>Donor Name</label><input name="donor_name" required></div>
        <div class="form-group"><label>Amount (₹)</label><input type="number" name="amount" step="0.01" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" name="donor_email"></div>
        <div class="form-group"><label>Phone</label><input name="donor_phone"></div>
      </div>
      <div class="form-group"><label>Payment Method</label><select name="payment_method"><option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="online">Online</option><option value="cheque">Cheque</option></select></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('donation-form');
    fd.org_id = erpOrg.id;
    fd.date = new Date().toISOString().split('T')[0];
    await erp.from('donations').insert(fd);
    showToast('Donation recorded!', 'success');
    closeSlideModal();
    navigate('donations');
  });
}

/* ============================================================
   SCHOOL ADMIN: ATTENDANCE
   ============================================================ */

async function renderAttendance() {
  const { data } = await erp.from('attendance').select('*, students(first_name,last_name), classes(name)').eq('org_id', erpOrg.id).order('date', { ascending: false });
  window._TD['attendance'] = data || [];
  regTable('attendance', ['Student','Class','Date','Status'],
    a => ({ _id: a.id, 'Student': a.students ? `${a.students.first_name} ${a.students.last_name}` : '-', 'Class': a.classes?.name || '-', 'Date': new Date(a.date).toLocaleDateString(), 'Status': `<span class="badge badge-${a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'}">${a.status}</span>` }),
    row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('attendance',${row._id},'Attendance record')">Delete</button>`
  );
  renderFilteredTable('attendance', el('content-area'), [
    { type: 'search', fields: [], placeholder: 'Search student...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'present',label:'Present'},{value:'absent',label:'Absent'},{value:'late',label:'Late'},{value:'leave',label:'Leave'}] }
  ], 'Attendance Records');
}

/* ============================================================
   SCHOOL ADMIN: EXPENSES
   ============================================================ */

async function renderExpenses() {
  const { data } = await erp.from('expenses').select('*').eq('org_id', erpOrg.id).order('created_at', { ascending: false });
  window._TD['expenses'] = data || [];
  regTable('expenses', ['Description','Category','Amount','Date','Status'],
    e => ({ _id: e.id, 'Description': e.description, 'Category': e.category || '-', 'Amount': `₹${Number(e.amount).toLocaleString()}`, 'Date': new Date(e.date || e.created_at).toLocaleDateString(), 'Status': `<span class="badge badge-${e.status === 'approved' ? 'success' : e.status === 'pending' ? 'warning' : 'danger'}">${e.status || 'pending'}</span>` }),
    row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('expenses',${row._id},'Expense')">Delete</button>`
  );
  const categories = [...new Set((data || []).filter(e => e.category).map(e => e.category))];
  renderFilteredTable('expenses', el('content-area'), [
    { type: 'search', fields: ['description'], placeholder: 'Search description...' },
    { type: 'select', key: 'category', label: 'All Categories', options: categories.map(c => ({value:c, label:c.charAt(0).toUpperCase()+c.slice(1)})) },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'approved',label:'Approved'},{value:'pending',label:'Pending'},{value:'rejected',label:'Rejected'}] }
  ], 'Expenses', `<button class="btn btn-primary btn-sm" onclick="showAddExpense()">+ Add Expense</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('expenses')">Import CSV</button>`);
}

function showAddExpense() {
  openSlideModal('Add Expense', `
    <form id="expense-form">
      <div class="form-group"><label>Description</label><input name="description" required></div>
      <div class="form-row">
        <div class="form-group"><label>Amount (₹)</label><input type="number" name="amount" step="0.01" required></div>
        <div class="form-group"><label>Category</label><select name="category"><option value="salary">Salary</option><option value="supplies">Supplies</option><option value="maintenance">Maintenance</option><option value="utilities">Utilities</option><option value="other">Other</option></select></div>
      </div>
      <div class="form-group"><label>Vendor</label><input name="vendor"></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('expense-form');
    fd.org_id = erpOrg.id;
    fd.date = new Date().toISOString().split('T')[0];
    await erp.from('expenses').insert(fd);
    showToast('Expense added!', 'success');
    closeSlideModal();
    navigate('expenses');
  });
}

/* ============================================================
   SUPER ADMIN: PAYMENTS
   ============================================================ */

async function renderPayments() {
  const { data } = await erp.from('payments').select('*, organizations(name)').order('created_at', { ascending: false });
  window._TD['payments'] = data || [];
  regTable('payments', ['Organization','Amount','Type','Status','Date'],
    p => ({ _id: p.id, 'Organization': p.organizations?.name || '-', 'Amount': `₹${p.amount}`, 'Type': p.type, 'Status': `<span class="badge badge-${p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}">${p.status}</span>`, 'Date': new Date(p.created_at).toLocaleDateString() }),
    row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('payments',${row._id},'Payment')">Delete</button>`
  );
  renderFilteredTable('payments', el('content-area'), [
    { type: 'search', fields: [], placeholder: 'Search organization...' },
    { type: 'select', key: 'status', label: 'All Statuses', options: [{value:'completed',label:'Completed'},{value:'pending',label:'Pending'},{value:'failed',label:'Failed'}] },
    { type: 'select', key: 'type', label: 'All Types', options: [{value:'subscription',label:'Subscription'},{value:'donation',label:'Donation'},{value:'fee',label:'Fee'}] }
  ], 'Payments');
}

/* ============================================================
   SCHOOL ADMIN: CALENDAR
   ============================================================ */

async function renderCalendar() {
  const { data } = await erp.from('events').select('*').eq('org_id', erpOrg.id).order('event_date');
  window._TD['events'] = data || [];
  regTable('events', ['Date','Title','Type'],
    e => ({ _id: e.id, 'Date': new Date(e.event_date).toLocaleDateString(), 'Title': e.title, 'Type': `<span class="badge badge-info">${e.event_type}</span>` }),
    row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('events',${row._id},'Event')">Delete</button>`
  );
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const filtered = filterTable(window._TD['events'], 'events');
  const grouped = {};
  filtered.forEach(e => {
    const m = new Date(e.event_date).getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(e);
  });
  let html = `<div class="card"><div class="card-header"><h3>Calendar</h3><button class="btn btn-primary btn-sm" onclick="showAddEvent()">+ Add Event</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('events')">Import CSV</button></div><div class="card-body">`;
  html += `<div class="filter-bar">
    <input class="filter-input" id="fs-events" data-fields="title" placeholder="Search event..." oninput="reRenderCalendar()">
    <select data-ff="events" data-fk="event_type" onchange="reRenderCalendar()">
      <option value="">All Types</option>
      <option value="general">General</option><option value="exam">Exam</option><option value="holiday">Holiday</option><option value="meeting">Meeting</option><option value="deadline">Deadline</option>
    </select>
  </div>`;
  for (const m of Object.keys(grouped)) {
    html += `<h4 style="margin:16px 0 8px;color:var(--primary)">${months[parseInt(m)]}</h4>`;
    html += `<div id="tbl-events">${renderTable(['Date','Title','Type'], grouped[m].map(e => ({ _id: e.id, 'Date': new Date(e.event_date).toLocaleDateString(), 'Title': e.title, 'Type': `<span class="badge badge-info">${e.event_type}</span>` })), row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('events',${row._id},'Event')">Delete</button>`)}</div>`;
  }
  html += `</div></div>`;
  el('content-area').innerHTML = html;
}
function reRenderCalendar() {
  const data = window._TD['events'] || [];
  const search = (document.getElementById('fs-events')?.value || '').toLowerCase();
  const typeFilter = document.querySelector('[data-ff="events"][data-fk="event_type"]')?.value || '';
  const filtered = data.filter(e => {
    if (typeFilter && e.event_type !== typeFilter) return false;
    if (search && !e.title.toLowerCase().includes(search)) return false;
    return true;
  });
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const grouped = {};
  filtered.forEach(e => {
    const m = new Date(e.event_date).getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(e);
  });
  let html = '';
  for (const m of Object.keys(grouped)) {
    html += `<h4 style="margin:16px 0 8px;color:var(--primary)">${months[parseInt(m)]}</h4>`;
    html += renderTable(['Date','Title','Type'], grouped[m].map(e => ({ _id: e.id, 'Date': new Date(e.event_date).toLocaleDateString(), 'Title': e.title, 'Type': `<span class="badge badge-info">${e.event_type}</span>` })), row => `<button class="btn btn-sm btn-danger" onclick="deleteRecord('events',${row._id},'Event')">Delete</button>`);
  }
  const c = document.querySelector('.card:last-child .card-body');
  if (c) c.innerHTML = html;
}

function showAddEvent() {
  openSlideModal('Add Event', `
    <form id="event-form">
      <div class="form-group"><label>Title</label><input name="title" required></div>
      <div class="form-row">
        <div class="form-group"><label>Date</label><input type="date" name="event_date" required></div>
        <div class="form-group"><label>Type</label><select name="event_type"><option value="general">General</option><option value="exam">Exam</option><option value="holiday">Holiday</option><option value="meeting">Meeting</option><option value="deadline">Deadline</option></select></div>
      </div>
      <div class="form-group"><label>Description</label><textarea name="description"></textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('event-form');
    fd.org_id = erpOrg.id;
    await erp.from('events').insert(fd);
    showToast('Event added!', 'success');
    closeSlideModal();
    navigate('calendar');
  });
}

/* ============================================================
   SCHOOL ADMIN: REPORTS (Export to CSV)
   ============================================================ */

async function renderReports() {
  el('content-area').innerHTML = `
    <div class="card"><div class="card-header"><h3>Export Reports</h3></div>
    <div class="card-body">
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary" onclick="exportCSV('students')">📥 Export Students</button>
        <button class="btn btn-primary" onclick="exportCSV('teachers')">📥 Export Teachers</button>
        <button class="btn btn-primary" onclick="exportCSV('attendance')">📥 Export Attendance</button>
        <button class="btn btn-primary" onclick="exportCSV('fees')">📥 Export Fees</button>
        <button class="btn btn-primary" onclick="exportCSV('exams')">📥 Export Exams</button>
        <button class="btn btn-primary" onclick="exportCSV('donations')">📥 Export Donations</button>
      </div>
    </div></div>`;
}

async function exportCSV(table) {
  const { data } = await erp.from(table).select('*').eq('org_id', erpOrg.id);
  if (!data || !data.length) { showToast('No data to export', 'warning'); return; }
  const cols = Object.keys(data[0]).filter(k => !['org_id','updated_at'].includes(k));
  const rows = data.map(r => cols.map(c => {
    const v = r[c];
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }));
  const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `${table}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast(`${table} exported!`, 'success');
}

/* ============================================================
   CSV IMPORT
   ============================================================ */

function parseCSV(text) {
  const rows = []; let cur = []; let field = ''; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nxt = text[i + 1];
    if (inQ) {
      if (ch === '"' && nxt === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n') {
        cur.push(field.trim()); field = '';
        if (cur.some(c => c !== '')) rows.push(cur);
        cur = [];
      } else if (ch !== '\r') field += ch;
    }
  }
  cur.push(field.trim());
  if (cur.some(c => c !== '')) rows.push(cur);
  return rows;
}

const IMPORT_CFG = {
  students: {
    table: 'students', title: 'Students',
    cols: [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name', required: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'roll_number', label: 'Roll Number' },
      { key: 'class', label: 'Class (name + section, e.g. "Class 10 A")' },
      { key: 'gender', label: 'Gender (male/female/other)' },
      { key: 'guardian_name', label: 'Guardian Name' },
      { key: 'guardian_phone', label: 'Guardian Phone' },
    ],
    sample: 'first_name,last_name,email,phone,roll_number,class,gender,guardian_name,guardian_phone\nArjun,Sharma,arjun@demo.com,9876543210,STU001,Class 10 A,male,Rajesh Sharma,9876543210\nDivya,Patel,divya@demo.com,9876543211,STU002,Class 9 B,female,Meena Patel,9876543211',
    resolve: async (rows) => {
      const names = [...new Set(rows.filter(r => r.class).map(r => r.class))];
      if (!names.length) return rows;
      const { data: classes } = await erp.from('classes').select('id,name,section').eq('org_id', erpOrg.id);
      const map = {};
      (classes || []).forEach(c => {
        const k = `${c.name}${c.section ? ' ' + c.section : ''}`.toLowerCase().trim();
        map[k] = c.id; map[c.name.toLowerCase().trim()] = c.id;
      });
      rows.forEach(r => { if (r.class) { r.class_id = map[r.class.toLowerCase().trim()] || null; delete r.class; } });
      return rows;
    }
  },
  teachers: {
    table: 'teachers', title: 'Teachers',
    cols: [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name', required: true },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'employee_id', label: 'Employee ID' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'specialization', label: 'Specialization' },
    ],
    sample: 'first_name,last_name,email,phone,employee_id,qualification,specialization\nRajesh,Kumar,rajesh@demo.com,9876543210,TCH001,M.Sc. Mathematics,Mathematics\nPriya,Singh,priya@demo.com,9876543211,TCH002,M.A. English,English Literature',
    resolve: null
  },
  classes: {
    table: 'classes', title: 'Classes',
    cols: [
      { key: 'name', label: 'Name', required: true },
      { key: 'section', label: 'Section' },
      { key: 'room', label: 'Room' },
      { key: 'academic_year', label: 'Academic Year' },
    ],
    sample: 'name,section,room,academic_year\nClass 10,A,Room 101,2025-26\nClass 9,B,Room 102,2025-26',
    resolve: null
  },
  subjects: {
    table: 'subjects', title: 'Subjects',
    cols: [
      { key: 'name', label: 'Name', required: true },
      { key: 'code', label: 'Code' },
      { key: 'class', label: 'Class (name + section)' },
    ],
    sample: 'name,code,class\nMathematics,MATH101,Class 10 A\nEnglish,ENG101,Class 9 B',
    resolve: async (rows) => {
      const names = [...new Set(rows.filter(r => r.class).map(r => r.class))];
      if (!names.length) return rows;
      const { data: classes } = await erp.from('classes').select('id,name,section').eq('org_id', erpOrg.id);
      const map = {};
      (classes || []).forEach(c => { const k = `${c.name}${c.section ? ' ' + c.section : ''}`.toLowerCase().trim(); map[k] = c.id; });
      rows.forEach(r => { if (r.class) { r.class_id = map[r.class.toLowerCase().trim()] || null; delete r.class; } });
      return rows;
    }
  },
  fees: {
    table: 'fees', title: 'Fees',
    cols: [
      { key: 'student_id', label: 'Student ID', required: true },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'type', label: 'Type (tuition/exam/library/transport/other)', required: true },
      { key: 'due_date', label: 'Due Date (YYYY-MM-DD)', required: true },
    ],
    sample: 'student_id,amount,type,due_date\n1,5000,tuition,2025-06-30\n2,4500,tuition,2025-06-30',
    resolve: null
  },
  donations: {
    table: 'donations', title: 'Donations',
    cols: [
      { key: 'donor_name', label: 'Donor Name', required: true },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'donor_email', label: 'Email' },
      { key: 'donor_phone', label: 'Phone' },
      { key: 'payment_method', label: 'Method (cash/bank/online/cheque)' },
      { key: 'date', label: 'Date (YYYY-MM-DD)' },
      { key: 'status', label: 'Status (completed/pending)' },
    ],
    sample: 'donor_name,amount,donor_email,donor_phone,payment_method,date,status\nRavi Sharma,10000,ravi@demo.com,9876543210,online,2025-06-15,completed\nAnita Gupta,5000,anita@demo.com,9876543211,cash,2025-06-16,completed',
    resolve: null
  },
  expenses: {
    table: 'expenses', title: 'Expenses',
    cols: [
      { key: 'description', label: 'Description', required: true },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'category', label: 'Category (salary/supplies/maintenance/utilities/other)', required: true },
      { key: 'vendor', label: 'Vendor' },
      { key: 'date', label: 'Date (YYYY-MM-DD)' },
      { key: 'status', label: 'Status (approved/pending/rejected)' },
    ],
    sample: 'description,amount,category,vendor,date,status\nWhiteboard markers,1200,supplies,Stationery Shop,2025-06-10,approved\nElectricity bill,8500,utilities,Tata Power,2025-06-01,approved',
    resolve: null
  },
  events: {
    table: 'events', title: 'Events',
    cols: [
      { key: 'title', label: 'Title', required: true },
      { key: 'event_date', label: 'Date (YYYY-MM-DD)', required: true },
      { key: 'event_type', label: 'Type (general/exam/holiday/meeting/deadline)' },
      { key: 'description', label: 'Description' },
    ],
    sample: 'title,event_date,event_type,description\nAnnual Day,2025-12-15,general,Annual day celebration\nSummer Break,2025-05-01,holiday,Summer holidays begin',
    resolve: null
  },
  syllabus: {
    table: 'syllabus', title: 'Syllabus',
    cols: [
      { key: 'title', label: 'Title', required: true },
      { key: 'class', label: 'Class (name + section)', required: true },
      { key: 'subject', label: 'Subject name', required: true },
      { key: 'description', label: 'Description' },
    ],
    sample: 'title,class,subject,description\nAlgebra Basics,Class 10 A,Mathematics,Linear equations\nGrammar,Class 9 B,English,Parts of speech',
    resolve: async (rows) => {
      const cnames = [...new Set(rows.filter(r => r.class).map(r => r.class))];
      const snames = [...new Set(rows.filter(r => r.subject).map(r => r.subject))];
      if (!cnames.length && !snames.length) return rows;
      const [cr, sr] = await Promise.all([
        cnames.length ? erp.from('classes').select('id,name,section').eq('org_id', erpOrg.id) : { data: [] },
        snames.length ? erp.from('subjects').select('id,name').eq('org_id', erpOrg.id) : { data: [] }
      ]);
      const cm = {}; (cr.data || []).forEach(c => { const k = `${c.name}${c.section ? ' ' + c.section : ''}`.toLowerCase().trim(); cm[k] = c.id; cm[c.name.toLowerCase().trim()] = c.id; });
      const sm = {}; (sr.data || []).forEach(s => { sm[s.name.toLowerCase().trim()] = s.id; });
      rows.forEach(r => {
        if (r.class) { r.class_id = cm[r.class.toLowerCase().trim()] || null; delete r.class; }
        if (r.subject) { r.subject_id = sm[r.subject.toLowerCase().trim()] || null; delete r.subject; }
      });
      return rows;
    }
  },
  exams: {
    table: 'exams', title: 'Exams',
    cols: [
      { key: 'title', label: 'Title', required: true },
      { key: 'class_id', label: 'Class ID', required: true },
      { key: 'subject_id', label: 'Subject ID' },
      { key: 'total_marks', label: 'Total Marks' },
      { key: 'pass_percentage', label: 'Pass Percentage' },
      { key: 'duration_minutes', label: 'Duration (minutes)' },
      { key: 'status', label: 'Status (draft/published/completed)' },
    ],
    sample: 'title,class_id,subject_id,total_marks,pass_percentage,duration_minutes,status\nMidterm Exam,1,2,100,40,60,draft\nFinal Exam,1,2,100,35,120,draft',
    resolve: null
  },
  books: {
    table: 'library_books', title: 'Library Books',
    cols: [
      { key: 'title', label: 'Title', required: true },
      { key: 'author', label: 'Author', required: true },
      { key: 'isbn', label: 'ISBN' },
      { key: 'category', label: 'Category' },
      { key: 'publisher', label: 'Publisher' },
      { key: 'published_year', label: 'Published Year' },
      { key: 'total_copies', label: 'Total Copies' },
      { key: 'shelf_location', label: 'Shelf Location' },
    ],
    sample: 'title,author,isbn,category,publisher,published_year,total_copies,shelf_location\nMathematics Textbook,RD Sharma,9788121900001,Textbook,NCERT,2024,10,A-101\nEnglish Reader,Wren & Martin,9788121900002,Textbook,Oxford,2023,15,A-102',
    resolve: null
  }
};

async function showImportCSV(entity) {
  const cfg = IMPORT_CFG[entity];
  if (!cfg) { showToast('Invalid entity', 'error'); return; }
  const req = cfg.cols.filter(c => c.required);
  openSlideModal(`Import ${cfg.title}`, `
    <div style="padding:0.5rem">
      <p class="text-sm text-gray-500 mb-3">
        Required columns: <strong>${req.map(c => c.label).join(', ')}</strong>.
        <br><a href="#" onclick="downloadImportSample('${entity}'); return false;" class="text-primary font-medium">📥 Download sample format</a>
      </p>
      <div class="upload-zone" style="border:2px dashed #d1d5db;border-radius:8px;padding:2rem;text-align:center;cursor:pointer;background:#f9fafb;transition:border-color .2s"
           onclick="document.getElementById('csv-input-${entity}').click()"
           onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='#d1d5db'">
        <div class="text-4xl mb-2">📂</div>
        <p class="text-gray-500">Click to select a CSV file</p>
        <p class="text-xs text-gray-400 mt-1" id="csv-filename-${entity}">No file chosen</p>
      </div>
      <input type="file" id="csv-input-${entity}" accept=".csv" style="display:none">
      <div id="csv-preview-${entity}" class="mt-3"></div>
      <div class="form-actions" style="margin-top:1rem">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-csv-${entity}" disabled onclick="importCSVData('${entity}')">Import</button>
      </div>
    </div>`);
  const input = document.getElementById(`csv-input-${entity}`);
  input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById(`csv-filename-${entity}`).textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
    const reader = new FileReader();
    reader.onload = function(ev) {
      const text = ev.target.result;
      const rows = parseCSV(text);
      if (rows.length < 2) { showToast('CSV must have header row and at least one data row', 'error'); return; }
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const data = rows.slice(1);
      const missing = req.filter(c => !headers.includes(c.key.toLowerCase()));
      if (missing.length) { showToast('Missing required columns: ' + missing.map(c => c.label).join(', '), 'error'); return; }
      window._csvData = { entity, headers, data };
      let prev = '<p class="text-sm text-gray-600 mb-2">Found <strong>' + data.length + '</strong> records</p>';
      if (data.length) {
        prev += '<div class="table-wrap" style="max-height:220px;overflow-y:auto"><table class="table-sm"><thead><tr>' + rows[0].map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>';
        data.slice(0, 8).forEach(r => { prev += '<tr>' + r.map(c => '<td>' + (c || '-') + '</td>').join('') + '</tr>'; });
        if (data.length > 8) prev += '<tr><td colspan="' + headers.length + '" class="text-center text-gray-400 text-sm">... and ' + (data.length - 8) + ' more rows</td></tr>';
        prev += '</tbody></table></div>';
      }
      document.getElementById('csv-preview-' + entity).innerHTML = prev;
      document.getElementById('btn-csv-' + entity).disabled = false;
    };
    reader.readAsText(file);
  });
}

async function importCSVData(entity) {
  const cfg = IMPORT_CFG[entity];
  const d = window._csvData;
  if (!d || !d.headers || !d.data || d.entity !== entity) { showToast('No data loaded. Please upload a CSV file first.', 'error'); return; }
  const btn = document.getElementById('btn-csv-' + entity);
  btn.disabled = true; btn.textContent = '⏳ Importing...';
  const colMap = {};
  d.headers.forEach((h, i) => { const m = cfg.cols.find(c => c.key.toLowerCase() === h); if (m) colMap[i] = m.key; });
  let rows = d.data.map(row => {
    const obj = { org_id: erpOrg.id };
    row.forEach((v, i) => { if (colMap[i] !== undefined && v.trim()) obj[colMap[i]] = v.trim(); });
    return obj;
  });
  if (cfg.resolve) rows = await cfg.resolve(rows);
  let success = 0, errors = [];
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    try {
      const { error } = await erp.from(cfg.table).insert(batch);
      if (error) errors.push(error.message); else success += batch.length;
    } catch (err) { errors.push(err.message); }
    btn.textContent = '⏳ ' + Math.min(i + 50, rows.length) + '/' + rows.length;
  }
  showToast('Imported ' + success + '/' + rows.length + ' records' + (errors.length ? ', ' + errors.length + ' errors' : ''), errors.length ? 'warning' : 'success');
  if (errors.length) console.error('CSV import errors:', errors.slice(0, 5));
  closeSlideModal();
  navigate(currentPage);
}

function downloadImportSample(entity) {
  const cfg = IMPORT_CFG[entity];
  if (!cfg) return;
  const blob = new Blob([cfg.sample], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = entity + '_sample.csv'; a.click();
}

/* ============================================================
   TEACHER: MY CLASSES
   ============================================================ */

async function renderMyClasses() {
  const teacherData = await erp.from('teachers').select('*').eq('profile_id', erpProfile.id).single();
  if (!teacherData.data) { el('content-area').innerHTML = '<div class="empty-state"><p>Teacher profile not linked.</p></div>'; return; }
  const { data: classes } = await erp.from('classes').select('*').eq('teacher_id', teacherData.data.id);
  const { data: allStudents } = await erp.from('students').select('class_id').eq('org_id', erpOrg.id).eq('status', 'active');
  const counts = {};
  (allStudents || []).forEach(s => { if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1; });
  el('content-area').innerHTML = `
    <div class="card"><div class="card-header"><h3>My Classes</h3></div>
    <div class="card-body">${renderTable(['Name','Section','Students','Room','Academic Year'], (classes || []).map(c => ({
      _id: c.id, 'Name': c.name, 'Section': c.section || '-', 'Students': String(counts[c.id] || 0), 'Room': c.room || '-', 'Academic Year': c.academic_year || '-'
    })), row => `<button class="btn btn-sm btn-outline" onclick="viewClassStudents(${row._id})">View Students</button>`)}</div></div>`;
}

async function viewClassStudents(classId) {
  const { data: students } = await erp.from('students').select('*, classes(name)').eq('class_id', classId).eq('org_id', erpOrg.id).eq('status', 'active');
  const cls = students?.[0]?.classes;
  el('content-area').innerHTML = `
    <div class="card"><div class="card-header"><h3>Students - ${cls?.name || 'Class'}</h3><button class="btn btn-sm btn-outline" onclick="navigate('my-classes')">Back</button></div>
    <div class="card-body">${renderTable(['Roll No','Name','Email','Phone'], (students || []).map(s => ({
      'Roll No': s.roll_number || '-', 'Name': `${s.first_name} ${s.last_name}`, 'Email': s.email || '-', 'Phone': s.phone || '-'
    })))}</div></div>`;
}

/* ============================================================
   TEACHER: TAKE ATTENDANCE
   ============================================================ */

async function renderTakeAttendance() {
  const teacherData = await erp.from('teachers').select('*').eq('profile_id', erpProfile.id).single();
  if (!teacherData.data) return;
  const { data: classes } = await erp.from('classes').select('*').eq('teacher_id', teacherData.data.id);
  if (!classes || !classes.length) { el('content-area').innerHTML = '<div class="empty-state"><p>No classes assigned.</p></div>'; return; }
  let html = `<div class="card"><div class="card-header"><h3>Take Attendance</h3></div><div class="card-body">
    <div class="form-row">
      <div class="form-group"><label>Class</label><select id="att-class" onchange="loadAttendanceStudents()">
        <option value="">Select Class</option>${classes.map(c => `<option value="${c.id}">${c.name} ${c.section || ''}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Date</label><input type="date" id="att-date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div id="attendance-list" class="mt-2"></div>
    <div id="attendance-actions" style="display:none" class="mt-2">
      <button class="btn btn-success" onclick="submitAttendance()">Save Attendance</button>
    </div></div></div>`;
  el('content-area').innerHTML = html;
}

async function loadAttendanceStudents() {
  const classId = el('att-class').value;
  const date = el('att-date').value;
  if (!classId || !date) return;
  const [studentsRes, recordsRes] = await Promise.all([
    erp.from('students').select('*').eq('org_id', erpOrg.id).eq('class_id', classId).eq('status', 'active'),
    erp.from('attendance').select('*').eq('class_id', classId).eq('date', date)
  ]);
  const students = studentsRes.data || [];
  if (!students.length) { el('attendance-list').innerHTML = '<p class="empty-state">No students.</p>'; return; }
  const recordMap = {};
  (recordsRes.data || []).forEach(r => { recordMap[r.student_id] = r.status; });
  const opts = ['present','absent','late','leave'];
  let html = '<table><thead><tr><th>Student</th><th>Status</th></tr></thead><tbody>';
  students.forEach(s => {
    const cur = recordMap[s.id] || 'present';
    html += `<tr><td>${s.first_name} ${s.last_name}</td>
      <td><select class="att-status" data-sid="${s.id}">
        ${opts.map(o => `<option value="${o}"${o===cur?' selected':''}>${o.charAt(0).toUpperCase()+o.slice(1)}</option>`).join('')}
      </select></td></tr>`;
  });
  html += '</tbody></table>';
  el('attendance-list').innerHTML = html;
  el('attendance-actions').style.display = 'block';
  window._attClassId = classId;
}

async function submitAttendance() {
  const date = el('att-date').value;
  const classId = window._attClassId;
  if (!classId || !date) { showToast('Select class and date', 'warning'); return; }
  const teacherData = await erp.from('teachers').select('*').eq('profile_id', erpProfile.id).single();
  const records = [];
  document.querySelectorAll('.att-status').forEach(sel => {
    records.push({
      org_id: erpOrg.id, student_id: parseInt(sel.dataset.sid),
      class_id: parseInt(classId), date, status: sel.value,
      marked_by: teacherData.data?.id || null
    });
  });
  for (const r of records) {
    await erp.from('attendance').upsert(r, { onConflict: 'student_id, date, class_id' });
  }
  showToast(`Attendance saved for ${records.length} students!`, 'success');
}

/* ============================================================
   TEACHER: ASSIGNMENTS
   ============================================================ */

async function renderTeacherAssignments() {
  const teacherData = await erp.from('teachers').select('*').eq('profile_id', erpProfile.id).single();
  if (!teacherData.data) { el('content-area').innerHTML = '<div class="empty-state"><p>Teacher profile not linked.</p></div>'; return; }
  const teacher = teacherData.data;
  const { data: assignments } = await erp.from('assignments').select('*, classes(name), subjects(name)').eq('teacher_id', teacher.id).order('created_at', { ascending: false });
  window._TD['teacher-assignments'] = assignments || [];
  regTable('teacher-assignments', ['Title','Class','Subject','Due Date','Status'],
    a => ({ _id: a.id, 'Title': a.title, 'Class': a.classes?.name || '-', 'Subject': a.subjects?.name || '-', 'Due Date': new Date(a.due_date).toLocaleDateString(), 'Status': `<span class="badge badge-${a.status === 'active' ? 'success' : 'danger'}">${a.status}</span>` }),
    row => `<button class="btn btn-sm btn-outline" onclick="viewAssignment(${row._id})">View</button><button class="btn btn-sm btn-danger ms-1" onclick="deleteRecord('assignments',${row._id},'Assignment')">Delete</button>`
  );
  renderFilteredTable('teacher-assignments', el('content-area'), [
    { type: 'search', fields: ['title'], placeholder: 'Search assignment...' },
    { type: 'select', key: 'status', label: 'All Status', options: [{value:'active',label:'Active'},{value:'closed',label:'Closed'}] }
  ], 'My Assignments', `<button class="btn btn-primary btn-sm" onclick="showAddAssignment()">+ Create Assignment</button>`);
}

async function showAddAssignment() {
  const teacherData = await erp.from('teachers').select('*').eq('profile_id', erpProfile.id).single();
  if (!teacherData.data) return;
  const [classes, subjects] = await Promise.all([
    erp.from('classes').select('*').eq('teacher_id', teacherData.data.id),
    erp.from('subjects').select('*').eq('teacher_id', teacherData.data.id),
  ]);
  openSlideModal('Create Assignment', `
    <form id="assignment-form">
      <div class="form-group"><label>Title</label><input name="title" required></div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="3"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Class</label><select name="class_id" required>${(classes.data || []).map(c => `<option value="${c.id}">${c.name} ${c.section || ''}</option>`).join('')}</select></div>
        <div class="form-group"><label>Subject</label><select name="subject_id"><option value="">General</option>${(subjects.data || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Due Date</label><input type="date" name="due_date" required></div>
        <div class="form-group"><label>Max Score</label><input type="number" name="max_score" step="0.5" value="100"></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('assignment-form');
    fd.org_id = erpOrg.id;
    fd.teacher_id = teacherData.data.id;
    await erp.from('assignments').insert(fd);
    showToast('Assignment created!', 'success');
    closeSlideModal();
    navigate('assignments');
  });
}

async function viewAssignment(id) {
  const [assignment, submissions] = await Promise.all([
    erp.from('assignments').select('*, classes(name), subjects(name)').eq('id', id).single(),
    erp.from('assignment_submissions').select('*, students(first_name,last_name)').eq('assignment_id', id),
  ]);
  const a = assignment.data;
  const subs = submissions.data || [];
  let html = `<div class="card"><div class="card-header"><h3>${a.title}</h3><button class="btn btn-sm btn-outline" onclick="navigate('assignments')">Back</button></div>
    <div class="card-body"><p>${a.description || ''}</p>
    <div class="flex gap-4 mt-2" style="flex-wrap:wrap;color:var(--gray-600);font-size:.85rem">
      <span>Class: <strong>${a.classes?.name || '-'}</strong></span>
      <span>Subject: <strong>${a.subjects?.name || 'General'}</strong></span>
      <span>Due: <strong>${new Date(a.due_date).toLocaleDateString()}</strong></span>
      <span>Max Score: <strong>${a.max_score || '-'}</strong></span>
    </div></div></div>`;
  const headers = ['Student','Status','Score','Submitted'];
  const rows = subs.map(s => ({
    _id: s.id,
    'Student': s.students ? `${s.students.first_name} ${s.students.last_name}` : '-',
    'Status': `<span class="badge badge-${s.status === 'graded' ? 'success' : s.status === 'submitted' ? 'info' : 'warning'}">${s.status}</span>`,
    'Score': s.score != null ? `${s.score}/${a.max_score || '-'}` : '-',
    'Submitted': new Date(s.submitted_at).toLocaleDateString()
  }));
  html += `<div class="card mt-2"><div class="card-header"><h3>Submissions (${subs.length})</h3></div>
    <div class="card-body">${renderTable(headers, rows)}</div></div>`;
  el('content-area').innerHTML = html;
}

/* ============================================================
   STUDENT: MY ATTENDANCE
   ============================================================ */

async function renderMyAttendance() {
  const studentData = await erp.from('students').select('*').eq('profile_id', erpProfile.id).single();
  if (!studentData.data) return;
  const { data } = await erp.from('attendance').select('*').eq('student_id', studentData.data.id).order('date', { ascending: false });
  const total = data?.length || 0;
  const present = data?.filter(a => a.status === 'present').length || 0;
  const absent = data?.filter(a => a.status === 'absent').length || 0;
  const pct = total ? Math.round(present / total * 100) : 0;
  el('content-area').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="label">Attendance %</div><div class="value">${pct}%</div></div>
      <div class="stat-card"><div class="label">Present</div><div class="value" style="color:var(--success)">${present}</div></div>
      <div class="stat-card"><div class="label">Absent</div><div class="value" style="color:var(--danger)">${absent}</div></div>
      <div class="stat-card"><div class="label">Total Days</div><div class="value">${total}</div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Attendance Records</h3></div>
    <div class="card-body">${renderTable(['Date','Status'], (data || []).map(a => ({
      'Date': new Date(a.date).toLocaleDateString(),
      'Status': `<span class="badge badge-${a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'}">${a.status}</span>`
    })))}</div></div>`;
}

/* ============================================================
   STUDENT: MY EXAMS
   ============================================================ */

async function renderMyExams() {
  const studentData = await erp.from('students').select('*').eq('profile_id', erpProfile.id).single();
  if (!studentData.data) return;
  const { data } = await erp.from('exam_results').select('*, exams(title,total_marks,pass_percentage)').eq('student_id', studentData.data.id).order('submitted_at', { ascending: false });
  el('content-area').innerHTML = `
    <div class="card"><div class="card-header"><h3>My Exam Results</h3></div>
    <div class="card-body">${renderTable(['Exam','Marks','Percentage','Status'], (data || []).map(r => ({
      'Exam': r.exams?.title || '-',
      'Marks': `${r.marks_obtained}/${r.total_marks}`,
      'Percentage': `${r.percentage}%`,
      'Status': `<span class="badge badge-${r.status === 'passed' ? 'success' : 'danger'}">${r.status}</span>`
    })))}</div></div>`;
}

/* ============================================================
   STUDENT: MY FEES
   ============================================================ */

async function renderMyFees() {
  const studentData = await erp.from('students').select('*').eq('profile_id', erpProfile.id).single();
  if (!studentData.data) return;
  const { data } = await erp.from('fees').select('*').eq('student_id', studentData.data.id).order('due_date', { ascending: false });
  el('content-area').innerHTML = `
    <div class="card"><div class="card-header"><h3>My Fees</h3></div>
    <div class="card-body">${renderTable(['Amount','Type','Due Date','Status'], (data || []).map(f => ({
      'Amount': `₹${f.amount}`,
      'Type': f.type,
      'Due Date': new Date(f.due_date).toLocaleDateString(),
      'Status': `<span class="badge badge-${f.status === 'paid' ? 'success' : f.status === 'overdue' ? 'danger' : 'warning'}">${f.status}</span>`
    })))}</div></div>`;
}

/* ============================================================
   SCHOOL ADMIN: TIMETABLE
   ============================================================ */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function renderTimetable() {
  const orgId = erpOrg.id;
  const [classesRes, subjectsRes, teachersRes, schedulesRes] = await Promise.all([
    erp.from('classes').select('*').eq('org_id', orgId).order('name'),
    erp.from('subjects').select('*').eq('org_id', orgId),
    erp.from('teachers').select('*').eq('org_id', orgId).eq('status', 'active'),
    erp.from('class_schedules').select('*').eq('org_id', orgId),
  ]);
  const classes = classesRes.data || [];
  const subjects = subjectsRes.data || [];
  const teachers = teachersRes.data || [];
  const schedules = schedulesRes.data || [];

  if (!classes.length) {
    el('content-area').innerHTML = '<div class="empty-state"><p>No classes yet. Create classes first.</p></div>';
    return;
  }

  const selectedClassId = window._ttClassId || classes[0].id;
  window._ttClassId = selectedClassId;
  window._ttSubjects = subjects;
  window._ttTeachers = teachers;
  window._ttSchedules = schedules;
  window._ttClasses = classes;

  const subjMap = {};
  subjects.forEach(s => { subjMap[s.id] = s; });
  const teacherMap = {};
  teachers.forEach(t => { teacherMap[t.id] = t; });

  const classSchedules = schedules.filter(s => s.class_id === selectedClassId);
  const scheduleMap = {};
  classSchedules.forEach(s => {
    const key = `${s.day_of_week}-${s.period_number}`;
    scheduleMap[key] = s;
  });

  const periods = [...new Set(schedules.filter(s => s.class_id === selectedClassId).map(s => s.period_number))].sort((a, b) => a - b);
  if (!periods.length) {
    for (let i = 1; i <= 8; i++) periods.push(i);
  }
  const maxPeriods = Math.max(...periods, 8);
  const weekDays = [1, 2, 3, 4, 5, 6];

  let html = `<div class="card"><div class="card-header"><h3>Timetable</h3></div><div class="card-body">
    <div class="form-row"><div class="form-group">
      <label>Select Class</label>
      <select id="tt-class" onchange="window._ttClassId=parseInt(this.value,10)||null;renderTimetable()">
        ${classes.map(c => `<option value="${c.id}" ${c.id === selectedClassId ? 'selected' : ''}>${c.name} ${c.section || ''}</option>`).join('')}
      </select>
    </div></div>
    <div class="table-wrap">
    <table class="timetable-grid">
      <thead><tr><th>Day</th>`;
  for (let p = 1; p <= maxPeriods; p++) {
    html += `<th>Period ${p}</th>`;
  }
  html += `</tr></thead><tbody>`;
  for (const d of weekDays) {
    html += `<tr><td><strong>${DAYS[d]}</strong></td>`;
    for (let p = 1; p <= maxPeriods; p++) {
      const key = `${d}-${p}`;
      const s = scheduleMap[key];
      if (s) {
        const subjName = subjMap[s.subject_id]?.name || 'Subject';
        const t = teacherMap[s.teacher_id];
        const teacherName = t ? `${t.first_name} ${t.last_name}` : '';
        const clsRoom = classes.find(c => c.id === selectedClassId)?.room;
        html += `<td class="tt-cell occupied" onclick="editTimetableSlot(${selectedClassId}, ${d}, ${p}, ${s.id})">
          <div class="tt-subject">${subjName}</div>
          <div class="tt-teacher">${teacherName}</div>
          <div class="tt-time">${s.start_time?.substring(0, 5) || ''}-${s.end_time?.substring(0, 5) || ''}</div>
          ${clsRoom ? `<div class="tt-room">${clsRoom}</div>` : ''}
        </td>`;
      } else {
        html += `<td class="tt-cell empty" onclick="editTimetableSlot(${selectedClassId}, ${d}, ${p}, null)">
          <span class="tt-add">+</span>
        </td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table></div></div></div>`;
  el('content-area').innerHTML = html;
}

async function editTimetableSlot(classId, dayOfWeek, periodNumber, scheduleId) {
  const subjects = window._ttSubjects || [];
  const teachers = window._ttTeachers || [];
  const schedules = window._ttSchedules || [];
  const classes = window._ttClasses || [];
  const existing = scheduleId ? schedules.find(s => s.id === scheduleId) : null;

  const orgId = erpOrg.id;
  const classSubjects = subjects.filter(s => s.class_id === classId);
  const cls = classes.find(c => c.id === classId);

  openSlideModal(existing ? 'Edit Period' : 'Add Period', `
    <form id="tt-form">
      <input type="hidden" name="class_id" value="${classId}">
      <input type="hidden" name="day_of_week" value="${dayOfWeek}">
      <input type="hidden" name="period_number" value="${periodNumber}">
      <div class="form-group"><label>Class</label><input value="${cls ? cls.name + ' ' + (cls.section || '') : classId}" disabled></div>
      <div class="form-group"><label>Day</label><input value="${DAYS[dayOfWeek]}" disabled></div>
      <div class="form-group"><label>Period</label><input value="${periodNumber}" disabled></div>
      <div class="form-group"><label>Subject</label><select name="subject_id" required>
        <option value="">Select Subject</option>
        ${(classSubjects.length ? classSubjects : subjects).map(s => `<option value="${s.id}" ${existing && existing.subject_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select></div>
      <div class="form-group"><label>Teacher</label><select name="teacher_id" required>
        <option value="">Select Teacher</option>
        ${teachers.map(t => `<option value="${t.id}" ${existing && existing.teacher_id === t.id ? 'selected' : ''}>${t.first_name} ${t.last_name}</option>`).join('')}
      </select></div>
      <div class="form-row">
        <div class="form-group"><label>Start Time</label><input type="time" name="start_time" value="${existing ? existing.start_time?.substring(0, 5) : ''}" required></div>
        <div class="form-group"><label>End Time</label><input type="time" name="end_time" value="${existing ? existing.end_time?.substring(0, 5) : ''}" required></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        ${existing ? `<button type="button" class="btn btn-danger" onclick="deleteTimetableSlot(${scheduleId})">Delete</button>` : ''}
        <button type="submit" class="btn btn-primary">${existing ? 'Update' : 'Add'}</button>
      </div>
    </form>`);
  el('slide-modal-body').querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = getFormData('tt-form');
    fd.org_id = orgId;
    fd.day_of_week = parseInt(fd.day_of_week);
    fd.period_number = parseInt(fd.period_number);
    fd.class_id = parseInt(fd.class_id);
    fd.subject_id = parseInt(fd.subject_id);
    fd.teacher_id = parseInt(fd.teacher_id);

    try {
      if (existing) {
        await erp.from('class_schedules').update(fd).eq('id', scheduleId);
        showToast('Period updated!', 'success');
      } else {
        await erp.from('class_schedules').insert(fd);
        showToast('Period added!', 'success');
      }
      closeSlideModal();
      await renderTimetable();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function deleteTimetableSlot(id) {
  if (!confirm('Delete this timetable entry?')) return;
  try {
    await erp.from('class_schedules').delete().eq('id', id);
    showToast('Period removed!', 'success');
    closeSlideModal();
    renderTimetable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ============================================================
   STUDENT: MY SCHEDULE
   ============================================================ */

async function renderMySchedule() {
  const studentData = await erp.from('students').select('*, classes(name, room)').eq('profile_id', erpProfile.id).single();
  if (!studentData.data || !studentData.data.class_id) {
    el('content-area').innerHTML = '<div class="empty-state"><p>No class assigned to your profile.</p></div>';
    return;
  }
  const student = studentData.data;
  const classId = student.class_id;

  const [schedulesRes, subjectsRes, teachersRes] = await Promise.all([
    erp.from('class_schedules').select('*').eq('class_id', classId).order('day_of_week').order('period_number'),
    erp.from('subjects').select('*').eq('org_id', erpOrg.id),
    erp.from('teachers').select('*').eq('org_id', erpOrg.id),
  ]);
  const schedules = schedulesRes.data || [];
  const subjects = subjectsRes.data || [];
  const teachers = teachersRes.data || [];

  const subjMap = {};
  subjects.forEach(s => { subjMap[s.id] = s; });
  const teacherMap = {};
  teachers.forEach(t => { teacherMap[t.id] = t; });

  if (!schedules.length) {
    el('content-area').innerHTML = '<div class="empty-state"><p>Timetable not yet published for your class.</p></div>';
    return;
  }

  const today = new Date().getDay();
  const selectedDay = window._sdDay !== undefined ? window._sdDay : today;
  window._sdDay = selectedDay;

  const daySchedules = schedules.filter(s => s.day_of_week === selectedDay).sort((a, b) => a.period_number - b.period_number);

  const weekDays = [1, 2, 3, 4, 5, 6];

  let html = `<div class="card"><div class="card-header"><h3>My Schedule - ${student.classes?.name || 'Class'}${student.classes?.room ? ' (' + student.classes.room + ')' : ''}</h3></div><div class="card-body">
    <div class="flex gap-1" style="flex-wrap:wrap;margin-bottom:16px">`;
  weekDays.forEach(d => {
    const active = d === selectedDay ? 'btn-primary' : 'btn-outline';
    const todayClass = d === today ? ' (Today)' : '';
    html += `<button class="btn btn-sm ${active}" onclick="window._sdDay=${d};renderMySchedule()">${DAYS_SHORT[d]}${todayClass}</button>`;
  });
  html += `</div>`;

  if (!daySchedules.length) {
    html += `<div class="empty-state"><p>No classes scheduled for ${DAYS[selectedDay]}.</p></div>`;
  } else {
    html += `<div class="table-wrap"><table>
      <thead><tr><th>Period</th><th>Subject</th><th>Teacher</th><th>Time</th></tr></thead><tbody>`;
    daySchedules.forEach(s => {
      const subjName = subjMap[s.subject_id]?.name || '-';
      const t = teacherMap[s.teacher_id];
      const teacherName = t ? `${t.first_name} ${t.last_name}` : '-';
      html += `<tr>
        <td><strong>${s.period_number}</strong></td>
        <td>${subjName}</td>
        <td>${teacherName}</td>
        <td>${s.start_time?.substring(0, 5) || '-'} - ${s.end_time?.substring(0, 5) || '-'}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  html += `</div></div>`;

  el('content-area').innerHTML = html;
}

/* ============================================================
   STUDENT: MY ASSIGNMENTS
   ============================================================ */

async function renderStudentAssignments() {
  const studentData = await erp.from('students').select('*, classes(name)').eq('profile_id', erpProfile.id).single();
  if (!studentData.data) { el('content-area').innerHTML = '<div class="empty-state"><p>Student profile not linked to a class.</p></div>'; return; }
  const student = studentData.data;
  const { data: assignments } = await erp.from('assignments').select('*, subjects(name), teachers(first_name,last_name)').eq('class_id', student.class_id).order('due_date');
  window._TD['student-assignments'] = assignments || [];
  regTable('student-assignments', ['Title','Subject','Teacher','Due Date','Status'],
    a => ({ _id: a.id, 'Title': a.title, 'Subject': a.subjects?.name || 'General', 'Teacher': a.teachers ? `${a.teachers.first_name} ${a.teachers.last_name}` : '-', 'Due Date': new Date(a.due_date).toLocaleDateString(), 'Status': `<span class="badge badge-${a.status === 'active' ? 'success' : 'danger'}">${a.status}</span>` }),
    row => `<button class="btn btn-sm btn-outline" onclick="viewStudentAssignment(${row._id})">View</button>`
  );
  renderFilteredTable('student-assignments', el('content-area'), [
    { type: 'search', fields: ['title'], placeholder: 'Search assignments...' },
    { type: 'select', key: 'status', label: 'All Status', options: [{value:'active',label:'Active'},{value:'closed',label:'Closed'}] }
  ], `My Assignments ${student.classes ? `- ${student.classes.name}` : ''}`);
}

async function viewStudentAssignment(id) {
  const studentData = await erp.from('students').select('id').eq('profile_id', erpProfile.id).single();
  if (!studentData.data) return;
  const [assignment, submission] = await Promise.all([
    erp.from('assignments').select('*, subjects(name), teachers(first_name,last_name)').eq('id', id).single(),
    erp.from('assignment_submissions').select('*').eq('assignment_id', id).eq('student_id', studentData.data.id).maybeSingle(),
  ]);
  const a = assignment.data;
  const sub = submission.data;
  let html = `<div class="card"><div class="card-header"><h3>${a.title}</h3><button class="btn btn-sm btn-outline" onclick="navigate('my-assignments')">Back</button></div>
    <div class="card-body"><p>${a.description || 'No description.'}</p>
    <div class="flex gap-4 mt-2" style="flex-wrap:wrap;color:var(--gray-600);font-size:.85rem">
      <span>Subject: <strong>${a.subjects?.name || 'General'}</strong></span>
      <span>Teacher: <strong>${a.teachers ? `${a.teachers.first_name} ${a.teachers.last_name}` : '-'}</strong></span>
      <span>Due: <strong>${new Date(a.due_date).toLocaleDateString()}</strong></span>
      <span>Max Score: <strong>${a.max_score || '-'}</strong></span>
    </div></div></div>`;
  if (sub) {
    const statusBadge = sub.status === 'graded' ? 'success' : sub.status === 'submitted' ? 'info' : 'warning';
    html += `<div class="card mt-2"><div class="card-header"><h3>My Submission</h3></div>
      <div class="card-body"><p>${sub.submission_text || 'No text submitted.'}</p>
      <div class="flex gap-4 mt-2" style="font-size:.85rem;color:var(--gray-600)">
        <span>Status: <span class="badge badge-${statusBadge}">${sub.status}</span></span>
        ${sub.score != null ? `<span>Score: <strong>${sub.score}/${a.max_score || '-'}</strong></span>` : ''}
        ${sub.feedback ? `<span>Feedback: ${sub.feedback}</span>` : ''}
        <span>Submitted: ${new Date(sub.submitted_at).toLocaleString()}</span>
      </div></div></div>`;
  } else if (a.status === 'active') {
    html += `<div class="card mt-2"><div class="card-header"><h3>Submit Assignment</h3></div>
      <div class="card-body"><form id="submit-form">
        <div class="form-group"><label>Your Answer / Notes</label><textarea name="submission_text" rows="5"></textarea></div>
        <div class="form-actions"><button type="submit" class="btn btn-primary">Submit</button></div>
      </form></div></div>`;
    setTimeout(() => {
      const form = document.getElementById('submit-form');
      if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = getFormData('submit-form');
        await erp.from('assignment_submissions').insert({
          assignment_id: id, student_id: studentData.data.id,
          submission_text: fd.submission_text, status: 'submitted'
        });
        showToast('Assignment submitted!', 'success');
        viewStudentAssignment(id);
      });
    }, 50);
  }
  el('content-area').innerHTML = html;
}

/* ============================================================
   LIBRARY: ADMIN DASHBOARD
   ============================================================ */

const LIB_TABS = ['Books', 'Members', 'Transactions', 'Fines'];
let _libTab = 'Books';
let _libSearch = '';

async function renderLibrary() {
  let html = `<div class="card"><div class="card-header"><h3>Library Management</h3></div><div class="card-body">
    <div class="tabs" style="display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap">`;
  LIB_TABS.forEach(t => {
    const active = t === _libTab ? 'btn-primary' : 'btn-outline';
    html += `<button class="btn btn-sm ${active}" onclick="_libTab='${t}';renderLibrary()">${t}</button>`;
  });
  html += `</div><div id="lib-content"></div></div></div>`;
  el('content-area').innerHTML = html;
  if (_libTab === 'Books') renderLibBooks();
  else if (_libTab === 'Members') renderLibMembers();
  else if (_libTab === 'Transactions') renderLibTransactions();
  else if (_libTab === 'Fines') renderLibFines();
}

async function renderLibBooks() {
  const orgId = erpOrg.id;
  const { data: books } = await erp.from('library_books').select('*').eq('org_id', orgId).order('title');
  const list = books || [];
  window._libBooks = list;
  let html = `<div class="flex-between" style="margin-bottom:12px">
    <input class="search-bar" placeholder="Search by title, author, isbn..." value="${_libSearch}" oninput="_libSearch=this.value;renderLibBooks()" style="width:300px">
    <button class="btn btn-primary btn-sm" onclick="showLibBookForm(null)">+ Add Book</button><button class="btn btn-outline btn-sm ms-1" onclick="showImportCSV('books')">Import CSV</button>
  </div><div class="table-wrap"><table><thead><tr><th>Title</th><th>Author</th><th>ISBN</th><th>Category</th><th>Copies</th><th>Avail</th><th>Shelf</th><th></th></tr></thead><tbody>`;
  const q = _libSearch.toLowerCase();
  const filtered = q ? list.filter(b => (b.title+' '+b.author+' '+(b.isbn||'')).toLowerCase().includes(q)) : list;
  if (!filtered.length) {
    html += `<tr><td colspan="8" class="empty-state">No books found.</td></tr>`;
  } else {
    filtered.forEach(b => {
      html += `<tr>
        <td><strong>${b.title}</strong></td>
        <td>${b.author}</td>
        <td style="font-size:.8rem">${b.isbn || '-'}</td>
        <td>${b.category || '-'}</td>
        <td>${b.total_copies}</td>
        <td><span class="badge badge-${b.available_copies > 0 ? 'success' : 'danger'}">${b.available_copies}</span></td>
        <td>${b.shelf_location || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="showLibBookForm(${b.id})">Edit</button>
          <button class="btn btn-sm btn-outline" style="color:var(--danger)" onclick="deleteLibBook(${b.id})">Delete</button>
        </td>
      </tr>`;
    });
  }
  html += `</tbody></table></div>`;
  el('lib-content').innerHTML = html;
}

function showLibBookForm(id) {
  const book = id ? (window._libBooks || []).find(b => b.id === id) : null;
  openSlideModal(book ? 'Edit Book' : 'Add Book', `
    <form id="lib-book-form">
      <div class="form-row">
        <div class="form-group"><label>Title *</label><input name="title" value="${book?.title || ''}" required></div>
        <div class="form-group"><label>Author *</label><input name="author" value="${book?.author || ''}" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ISBN</label><input name="isbn" value="${book?.isbn || ''}"></div>
        <div class="form-group"><label>Category</label><input name="category" value="${book?.category || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Publisher</label><input name="publisher" value="${book?.publisher || ''}"></div>
        <div class="form-group"><label>Year</label><input name="published_year" type="number" value="${book?.published_year || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Total Copies *</label><input name="total_copies" type="number" value="${book?.total_copies || 1}" required></div>
        <div class="form-group"><label>Shelf Location</label><input name="shelf_location" value="${book?.shelf_location || ''}"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea name="description" rows="3">${book?.description || ''}</textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${book ? 'Update' : 'Add'}</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    document.getElementById('lib-book-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = getFormData('lib-book-form');
      const available = book ? Math.min(parseInt(fd.total_copies), (book.available_copies + parseInt(fd.total_copies) - book.total_copies)) : parseInt(fd.total_copies);
      const payload = { org_id: erpOrg.id, title: fd.title, author: fd.author, isbn: fd.isbn, category: fd.category, publisher: fd.publisher, published_year: fd.published_year ? parseInt(fd.published_year) : null, total_copies: parseInt(fd.total_copies), available_copies: available, shelf_location: fd.shelf_location, description: fd.description };
      if (book) {
        await erp.from('library_books').update(payload).eq('id', id);
        showToast('Book updated!', 'success');
      } else {
        await erp.from('library_books').insert(payload);
        showToast('Book added!', 'success');
      }
      closeSlideModal();
      renderLibBooks();
    });
  }, 50);
}

async function deleteLibBook(id) {
  if (!confirm('Delete this book?')) return;
  await erp.from('library_books').delete().eq('id', id);
  showToast('Book deleted!', 'success');
  renderLibBooks();
}

async function renderLibMembers() {
  const orgId = erpOrg.id;
  const [membersRes, studentsRes] = await Promise.all([
    erp.from('library_members').select('*').eq('org_id', orgId).order('first_name'),
    erp.from('students').select('id, first_name, last_name, email').eq('org_id', orgId).eq('status', 'active'),
  ]);
  const members = membersRes.data || [];
  const students = studentsRes.data || [];
  window._libStudents = students;
  const existingStudentIds = new Set(members.filter(m => m.student_id).map(m => m.student_id));
  const unregistered = students.filter(s => !existingStudentIds.has(s.id));

  let html = `<div class="flex-between" style="margin-bottom:12px">
    <span style="font-size:.9rem;color:var(--gray-600)">${members.length} members</span>
    ${unregistered.length ? `<button class="btn btn-primary btn-sm" onclick="showQuickAddMembers()">Add from Students (${unregistered.length})</button>` : ''}
  </div><div class="table-wrap"><table><thead><tr><th>Member ID</th><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>Status</th><th></th></tr></thead><tbody>`;
  if (!members.length) {
    html += `<tr><td colspan="7" class="empty-state">No members yet.</td></tr>`;
  } else {
    members.forEach(m => {
      const statusBadge = m.status === 'active' ? 'success' : m.status === 'suspended' ? 'danger' : 'warning';
      html += `<tr>
        <td style="font-size:.8rem">${m.member_id || '-'}</td>
        <td>${m.first_name} ${m.last_name}</td>
        <td>${m.membership_type}</td>
        <td>${m.email || '-'}</td>
        <td>${m.phone || '-'}</td>
        <td><span class="badge badge-${statusBadge}">${m.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="toggleMemberStatus(${m.id},'${m.status}')">${m.status === 'active' ? 'Suspend' : 'Activate'}</button>
        </td>
      </tr>`;
    });
  }
  html += `</tbody></table></div>`;
  el('lib-content').innerHTML = html;
}

async function showQuickAddMembers() {
  const students = window._libStudents || [];
  let html = `<div style="max-height:400px;overflow-y:auto">`;
  students.forEach(s => {
    html += `<label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--gray-100);cursor:pointer">
      <input type="checkbox" class="lib-add-chk" data-sid="${s.id}" data-fn="${s.first_name}" data-ln="${s.last_name}" data-em="${s.email || ''}">
      <span>${s.first_name} ${s.last_name} ${s.email ? '('+s.email+')' : ''}</span>
    </label>`;
  });
  html += `</div>
  <div class="form-actions mt-2">
    <button class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveQuickAddMembers()">Add Selected</button>
  </div>`;
  openSlideModal('Add Students as Library Members', html);
}

async function saveQuickAddMembers() {
  const chks = document.querySelectorAll('.lib-add-chk:checked');
  if (!chks.length) return;
  const inserts = [];
  chks.forEach(cb => {
    inserts.push({
      org_id: erpOrg.id,
      student_id: parseInt(cb.dataset.sid),
      first_name: cb.dataset.fn,
      last_name: cb.dataset.ln,
      email: cb.dataset.em || null,
      membership_type: 'student',
      member_id: 'LM-' + String(Date.now()).slice(-6) + cb.dataset.sid,
    });
  });
  for (const m of inserts) {
    await erp.from('library_members').insert(m);
  }
  showToast(`${inserts.length} member(s) added!`, 'success');
  closeSlideModal();
  renderLibMembers();
}

async function toggleMemberStatus(id, current) {
  await erp.from('library_members').update({ status: current === 'active' ? 'inactive' : 'active' }).eq('id', id);
  renderLibMembers();
}

async function renderLibTransactions() {
  const orgId = erpOrg.id;
  const [txnsRes, booksRes, membersRes] = await Promise.all([
    erp.from('library_transactions').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
    erp.from('library_books').select('*').eq('org_id', orgId),
    erp.from('library_members').select('*').eq('org_id', orgId).eq('status', 'active'),
  ]);
  const txns = txnsRes.data || [];
  const books = booksRes.data || [];
  const members = membersRes.data || [];
  const bookMap = {}; books.forEach(b => { bookMap[b.id] = b; });
  const memberMap = {}; members.forEach(m => { memberMap[m.id] = m; });
  window._libBooks = books;
  window._libMembers = members;

  let html = `<div style="margin-bottom:12px">
    <button class="btn btn-primary btn-sm" onclick="showBorrowForm()">+ New Borrow</button>
    <span style="margin-left:12px;font-size:.85rem;color:var(--gray-600)">${txns.filter(t => t.status === 'borrowed' || t.status === 'overdue').length} active borrows</span>
  </div><div class="table-wrap"><table><thead><tr><th>Book</th><th>Member</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th><th></th></tr></thead><tbody>`;
  if (!txns.length) {
    html += `<tr><td colspan="7" class="empty-state">No transactions yet.</td></tr>`;
  } else {
    txns.forEach(t => {
      const book = bookMap[t.book_id];
      const member = memberMap[t.member_id];
      const overdue = t.status === 'borrowed' && new Date(t.due_date) < new Date();
      const actualStatus = overdue ? 'overdue' : t.status;
      const statusBadge = actualStatus === 'returned' ? 'success' : actualStatus === 'overdue' ? 'danger' : 'warning';
      html += `<tr>
        <td style="font-size:.85rem">${book?.title || 'Unknown'}</td>
        <td style="font-size:.85rem">${member ? member.first_name + ' ' + member.last_name : 'Unknown'}</td>
        <td style="font-size:.8rem">${new Date(t.borrow_date).toLocaleDateString()}</td>
        <td style="font-size:.8rem">${new Date(t.due_date).toLocaleDateString()}</td>
        <td style="font-size:.8rem">${t.return_date ? new Date(t.return_date).toLocaleDateString() : '-'}</td>
        <td><span class="badge badge-${statusBadge}">${actualStatus}</span></td>
        <td>${actualStatus !== 'returned' ? `<button class="btn btn-sm btn-primary" onclick="returnBook(${t.id})">Return</button>` : ''}</td>
      </tr>`;
    });
  }
  html += `</tbody></table></div>`;
  el('lib-content').innerHTML = html;
}

function showBorrowForm() {
  const books = (window._libBooks || []).filter(b => b.available_copies > 0);
  const members = window._libMembers || [];
  openSlideModal('Borrow Book', `
    <form id="borrow-form">
      <div class="form-group"><label>Book *</label>
        <select name="book_id" required>
          <option value="">Select book...</option>
          ${books.map(b => `<option value="${b.id}">${b.title} (${b.author}) [${b.available_copies} avail]</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Member *</label>
        <select name="member_id" required>
          <option value="">Select member...</option>
          ${members.map(m => `<option value="${m.id}">${m.first_name} ${m.last_name} (${m.membership_type})</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Borrow Date</label><input type="date" name="borrow_date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Due Date *</label><input type="date" name="due_date" value="${new Date(Date.now()+14*86400000).toISOString().split('T')[0]}" required></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea name="notes" rows="2"></textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" onclick="closeSlideModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Borrow</button>
      </div>
    </form>
  `);
  setTimeout(() => {
    document.getElementById('borrow-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = getFormData('borrow-form');
      const bookId = parseInt(fd.book_id);
      const memberId = parseInt(fd.member_id);
      await erp.from('library_transactions').insert({
        org_id: erpOrg.id, book_id: bookId, member_id: memberId,
        borrow_date: fd.borrow_date, due_date: fd.due_date,
        issued_by: erpProfile.id, notes: fd.notes,
      });
      const book = window._libBooks.find(b => b.id === bookId);
      if (book) await erp.from('library_books').update({ available_copies: book.available_copies - 1 }).eq('id', bookId);
      showToast('Book borrowed!', 'success');
      closeSlideModal();
      renderLibTransactions();
    });
  }, 50);
}

async function returnBook(txnId) {
  const { data: txn } = await erp.from('library_transactions').select('*').eq('id', txnId).single();
  if (!txn) return;
  const today = new Date();
  const dueDate = new Date(txn.due_date);
  const daysOverdue = Math.max(0, Math.floor((today - dueDate) / 86400000));
  const fineAmount = daysOverdue * 5;
  const tdy = today.toISOString().split('T')[0];
  await erp.from('library_transactions').update({ return_date: tdy, status: 'returned' }).eq('id', txnId);
  const book = window._libBooks.find(b => b.id === txn.book_id);
  if (book) await erp.from('library_books').update({ available_copies: book.available_copies + 1 }).eq('id', txn.book_id);
  if (daysOverdue > 0) {
    await erp.from('library_fines').insert({
      org_id: erpOrg.id, transaction_id: txnId, member_id: txn.member_id,
      amount: fineAmount, days_overdue: daysOverdue,
    });
    showToast(`Book returned! Fine: &#8377;${fineAmount} (${daysOverdue} days overdue)`, 'warning');
  } else {
    showToast('Book returned on time!', 'success');
  }
  renderLibTransactions();
}

async function renderLibFines() {
  const orgId = erpOrg.id;
  const [finesRes, txnsRes, booksRes, membersRes] = await Promise.all([
    erp.from('library_fines').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
    erp.from('library_transactions').select('*').eq('org_id', orgId),
    erp.from('library_books').select('*').eq('org_id', orgId),
    erp.from('library_members').select('*').eq('org_id', orgId),
  ]);
  const fines = finesRes.data || [];
  const txns = txnsRes.data || [];
  const books = booksRes.data || [];
  const members = membersRes.data || [];
  const txnMap = {}; txns.forEach(t => { txnMap[t.id] = t; });
  const bookMap = {}; books.forEach(b => { bookMap[b.id] = b; });
  const memberMap = {}; members.forEach(m => { memberMap[m.id] = m; });
  const totalUnpaid = fines.filter(f => !f.paid).reduce((s, f) => s + parseFloat(f.amount), 0);

  let html = `<div style="margin-bottom:12px;font-size:.9rem;color:var(--gray-600)">
    Total unpaid fines: <strong style="color:var(--danger)">&#8377;${totalUnpaid.toFixed(2)}</strong> | Total fines: <strong>${fines.length}</strong>
  </div><div class="table-wrap"><table><thead><tr><th>Member</th><th>Book</th><th>Amount</th><th>Days Overdue</th><th>Paid</th><th></th></tr></thead><tbody>`;
  if (!fines.length) {
    html += `<tr><td colspan="6" class="empty-state">No fines recorded.</td></tr>`;
  } else {
    fines.forEach(f => {
      const txn = txnMap[f.transaction_id];
      const book = txn ? bookMap[txn.book_id] : null;
      const member = memberMap[f.member_id];
      html += `<tr>
        <td>${member ? member.first_name + ' ' + member.last_name : '-'}</td>
        <td style="font-size:.85rem">${book?.title || '-'}</td>
        <td><strong>&#8377;${parseFloat(f.amount).toFixed(2)}</strong></td>
        <td>${f.days_overdue} days</td>
        <td>${f.paid ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-danger">Unpaid</span>'}</td>
        <td>${!f.paid ? `<button class="btn btn-sm btn-primary" onclick="payFine(${f.id})">Mark Paid</button>` : ''}</td>
      </tr>`;
    });
  }
  html += `</tbody></table></div>`;
  el('lib-content').innerHTML = html;
}

async function payFine(id) {
  await erp.from('library_fines').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', id);
  showToast('Fine marked as paid!', 'success');
  renderLibFines();
}

/* ============================================================
   LIBRARY: STUDENT / TEACHER VIEW
   ============================================================ */

async function renderMyLibrary() {
  const orgId = erpOrg.id;
  const [booksRes, membersRes] = await Promise.all([
    erp.from('library_books').select('*').eq('org_id', orgId).order('title'),
    erp.from('library_members').select('*').eq('profile_id', erpProfile.id).maybeSingle(),
  ]);
  const books = booksRes.data || [];
  const member = membersRes.data;
  let html = `<div class="card"><div class="card-header"><h3>Library</h3></div><div class="card-body">
    <div class="tabs" style="display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-sm btn-primary" onclick="renderMyLibCatalog()">Browse Books</button>
      ${member ? `<button class="btn btn-sm btn-outline" onclick="renderMyLibBooks()">My Borrowed Books</button>` : ''}
    </div>
    <div id="my-lib-content"></div></div></div>`;
  el('content-area').innerHTML = html;
  renderMyLibCatalog();
}

async function renderMyLibCatalog() {
  const orgId = erpOrg.id;
  const { data: books } = await erp.from('library_books').select('*').eq('org_id', orgId).order('title');
  const list = books || [];
  let html = `<div style="margin-bottom:12px"><input class="search-bar" placeholder="Search books..." style="width:100%;max-width:400px" oninput="filterMyLibCatalog(this.value)"></div>
    <div id="my-lib-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px">`;
  el('my-lib-content').innerHTML = html;
  renderMyLibCards(list);
}

function renderMyLibCards(list) {
  const container = document.getElementById('my-lib-grid');
  if (!container) return;
  let html = '';
  if (!list.length) { html = '<div class="empty-state">No books in the library yet.</div>'; }
  else {
    list.forEach(b => {
      html += `<div class="card" style="padding:12px;border:1px solid var(--border);border-radius:8px">
        <div style="font-weight:600;font-size:.95rem">${b.title}</div>
        <div style="font-size:.8rem;color:var(--gray-500)">${b.author}</div>
        ${b.isbn ? `<div style="font-size:.75rem;color:var(--gray-400)">ISBN: ${b.isbn}</div>` : ''}
        ${b.category ? `<span class="badge badge-info" style="margin-top:6px;background:var(--primary-light);color:var(--primary)">${b.category}</span>` : ''}
        <div style="margin-top:8px;display:flex;justify-content:space-between;font-size:.8rem">
          <span>Copies: <strong>${b.available_copies}</strong>/${b.total_copies}</span>
          <span style="color:var(--gray-500)">${b.shelf_location ? 'Shelf: ' + b.shelf_location : ''}</span>
        </div>
      </div>`;
    });
  }
  container.innerHTML = html;
}

function filterMyLibCatalog(q) {
  const cards = document.querySelectorAll('#my-lib-grid .card');
  const query = q.toLowerCase();
  cards.forEach(c => {
    const text = c.textContent.toLowerCase();
    c.style.display = text.includes(query) ? '' : 'none';
  });
}

async function renderMyLibBooks() {
  const { data: member } = await erp.from('library_members').select('*').eq('profile_id', erpProfile.id).maybeSingle();
  if (!member) { el('my-lib-content').innerHTML = '<div class="empty-state">You are not registered as a library member.</div>'; return; }
  const [txnsRes, booksRes] = await Promise.all([
    erp.from('library_transactions').select('*').eq('member_id', member.id).order('created_at', { ascending: false }),
    erp.from('library_books').select('*').eq('org_id', erpOrg.id),
  ]);
  const txns = txnsRes.data || [];
  const books = booksRes.data || [];
  const bookMap = {}; books.forEach(b => { bookMap[b.id] = b; });
  let html = `<div class="table-wrap"><table><thead><tr><th>Book</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th></tr></thead><tbody>`;
  if (!txns.length) {
    html += `<tr><td colspan="5" class="empty-state">No books borrowed yet.</td></tr>`;
  } else {
    txns.forEach(t => {
      const book = bookMap[t.book_id];
      const overdue = t.status === 'borrowed' && new Date(t.due_date) < new Date();
      const status = overdue ? 'overdue' : t.status;
      const badge = status === 'returned' ? 'success' : status === 'overdue' ? 'danger' : 'warning';
      html += `<tr>
        <td>${book?.title || 'Unknown'}</td>
        <td style="font-size:.8rem">${new Date(t.borrow_date).toLocaleDateString()}</td>
        <td style="font-size:.8rem">${new Date(t.due_date).toLocaleDateString()}</td>
        <td style="font-size:.8rem">${t.return_date ? new Date(t.return_date).toLocaleDateString() : '-'}</td>
        <td><span class="badge badge-${badge}">${status}</span></td>
      </tr>`;
    });
  }
  html += `</tbody></table></div>`;
  el('my-lib-content').innerHTML = html;
}
