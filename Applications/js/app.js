const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let isAdmin = false;
let projects = [];
let tasks = {};
let comments = {};
let risks = {};
let milestones = {};
let notifications = [];
let selectedProjectId = null;
let currentView = 'dashboard';

function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function escHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function randomId() { return Math.floor(Math.random() * 2147483647); }

// ======= Auth =======
async function checkAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    currentUser = user;
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('user-email').textContent = user.email;
    await checkRole();
    const tablesOk = await checkTables();
    if (!tablesOk) {
      showToast('Run supabase/schema.sql in your Supabase SQL Editor first', 'error');
      return;
    }
    await loadProjects();
    await loadNotifications();
    showView('dashboard');
  }
}

async function checkTables() {
  try {
    const { data, error } = await sb.from('pm_projects').select('id').limit(1);
    if (error && error.message?.includes('relation') && error.message?.includes('does not exist')) return false;
    if (error && error.code === '42P01') return false;
    return true;
  } catch (e) {
    return false;
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; return; }
  await checkAuth();
}

async function handleSignup() {
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) { errEl.textContent = error.message; return; }
  if (data.user) {
    try {
      await sb.from('pm_roles').insert([{ user_id: data.user.id, role: 'user' }]);
    } catch (_) { /* table may not exist yet */ }
    showToast('Account created! Please check your email for verification.');
    showLoginForm();
  }
}

async function handleGoogleLogin() {
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
  });
  if (error) { errEl.textContent = error.message; }
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

async function checkRole() {
  try {
    const { data } = await sb.from('pm_roles').select('role').eq('user_id', currentUser.id).maybeSingle();
    isAdmin = data?.role === 'admin';
  } catch (e) {
    isAdmin = false;
  }
  document.getElementById('admin-link').style.display = isAdmin ? '' : 'none';
}

function showLoginForm() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('signup-form').classList.add('hidden');
  document.getElementById('login-toggle').innerHTML = `Don't have an account? <a id="show-signup" style="color:var(--primary);cursor:pointer;font-weight:600;">Sign Up</a>`;
  document.getElementById('show-signup')?.addEventListener('click', showSignupForm);
}

function showSignupForm() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('signup-form').classList.remove('hidden');
  document.getElementById('login-toggle').innerHTML = `Already have an account? <a id="show-login" style="color:var(--primary);cursor:pointer;font-weight:600;">Sign In</a>`;
  document.getElementById('show-login')?.addEventListener('click', showLoginForm);
}

// ======= Navigation =======
function showView(view) {
  currentView = view;
  if (view === 'project-detail' && !selectedProjectId) view = 'projects';
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + view);
  if (panel) panel.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navItem) navItem.classList.add('active');

  if (view === 'dashboard') renderDashboard();
  else if (view === 'projects') renderProjects();
  else if (view === 'project-detail') renderProjectDetail();
  else if (view === 'notifications') renderNotifications();
  document.getElementById('notif-badge').textContent = notifications.filter(n => !n.read).length || '';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ======= Projects =======
async function loadProjects() {
  let query = sb.from('pm_projects').select('*').order('created_at', { ascending: false });
  if (!isAdmin) query = query.eq('user_id', currentUser.id);
  const { data, error } = await query;
  if (!error) { projects = data || []; document.getElementById('project-count').textContent = projects.length; }
  else { showToast('Error loading projects: ' + error.message, 'error'); console.error('loadProjects error:', error); }
}

async function saveProject() {
  const id = document.getElementById('project-id').value;
  const title = document.getElementById('project-title').value;
  const description = document.getElementById('project-desc').value;
  const status = document.getElementById('project-status').value;
  const priority = document.getElementById('project-priority').value;
  const startDate = document.getElementById('project-start').value;
  const endDate = document.getElementById('project-end').value;
  const budget = parseFloat(document.getElementById('project-budget').value) || 0;
  const clientName = document.getElementById('project-client-name').value;
  const clientEmail = document.getElementById('project-client-email').value;

  if (!title) { showToast('Title is required', 'error'); return; }

  if (id) {
    const { error } = await sb.from('pm_projects').update({ title, description, status, priority, start_date: startDate, end_date: endDate, budget, client_name: clientName, client_email: clientEmail, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Project updated');
  } else {
    const { error } = await sb.from('pm_projects').insert([{ id: randomId(), user_id: currentUser.id, title, description, status, priority, start_date: startDate, end_date: endDate, budget, client_name: clientName, client_email: clientEmail }]);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Project created');
  }
  closeModal();
  await loadProjects();
  if (currentView === 'projects') renderProjects();
  else if (currentView === 'dashboard') renderDashboard();
}

function showProjectModal(project) {
  document.getElementById('modal-title').textContent = project ? 'Edit Project' : 'New Project';
  document.getElementById('project-id').value = project?.id || '';
  document.getElementById('project-title').value = project?.title || '';
  document.getElementById('project-desc').value = project?.description || '';
  document.getElementById('project-status').value = project?.status || 'active';
  document.getElementById('project-priority').value = project?.priority || 'medium';
  document.getElementById('project-start').value = project?.start_date || '';
  document.getElementById('project-end').value = project?.end_date || '';
  document.getElementById('project-budget').value = project?.budget || '';
  document.getElementById('project-client-name').value = project?.client_name || '';
  document.getElementById('project-client-email').value = project?.client_email || '';
  openModal('project-modal');
}

async function deleteProject(id) {
  if (!confirm('Delete this project and all its data?')) return;
  const { error } = await sb.from('pm_projects').delete().eq('id', id);
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Project deleted');
  await loadProjects();
  if (currentView === 'projects') renderProjects();
  else if (currentView === 'dashboard') renderDashboard();
}

function openProject(id) {
  selectedProjectId = id;
  showView('project-detail');
}

// ======= Tasks =======
async function loadTasks(projectId) {
  const { data, error } = await sb.from('pm_tasks').select('*').eq('project_id', projectId).order('order_index');
  if (!error) tasks[projectId] = data || [];
  else showToast('Error loading tasks', 'error');
}

async function saveTask() {
  const projectId = parseInt(document.getElementById('task-project-id').value);
  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-desc').value;
  const status = document.getElementById('task-status').value;
  const priority = document.getElementById('task-priority').value;
  const dueDate = document.getElementById('task-due').value;
  const estimatedHours = parseFloat(document.getElementById('task-est-hours').value) || 0;

  if (!title) { showToast('Title is required', 'error'); return; }

  if (id) {
    const { error } = await sb.from('pm_tasks').update({ title, description, status, priority, due_date: dueDate, estimated_hours: estimatedHours, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Task updated');
  } else {
    const { error } = await sb.from('pm_tasks').insert([{ id: randomId(), project_id: projectId, user_id: currentUser.id, title, description, status, priority, due_date: dueDate, estimated_hours: estimatedHours, order_index: (tasks[projectId] || []).length }]);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Task added');
  }
  closeModal();
  await loadTasks(projectId);
  await loadProjects();
  renderProjectDetail();
}

function showTaskModal(task, projectId) {
  document.getElementById('modal-title').textContent = task ? 'Edit Task' : 'New Task';
  document.getElementById('task-id').value = task?.id || '';
  document.getElementById('task-project-id').value = task ? task.project_id : projectId;
  document.getElementById('task-title').value = task?.title || '';
  document.getElementById('task-desc').value = task?.description || '';
  document.getElementById('task-status').value = task?.status || 'todo';
  document.getElementById('task-priority').value = task?.priority || 'medium';
  document.getElementById('task-due').value = task?.due_date || '';
  document.getElementById('task-est-hours').value = task?.estimated_hours || '';
  openModal('task-modal');
}

async function updateTaskStatus(taskId, newStatus, projectId) {
  const { error } = await sb.from('pm_tasks').update({ status: newStatus }).eq('id', taskId);
  if (!error) {
    await loadTasks(projectId);
    renderProjectDetail();
  }
}

async function deleteTask(id, projectId) {
  if (!confirm('Delete this task?')) return;
  const { error } = await sb.from('pm_tasks').delete().eq('id', id);
  if (!error) {
    showToast('Task deleted');
    await loadTasks(projectId);
    renderProjectDetail();
  }
}

// ======= Comments =======
async function loadComments(projectId) {
  const { data, error } = await sb.from('pm_comments').select('*').eq('project_id', projectId).order('created_at');
  if (!error) comments[projectId] = data || [];
}

async function saveComment() {
  const projectId = parseInt(document.getElementById('comment-project-id').value);
  const content = document.getElementById('comment-content').value;
  if (!content.trim()) return;
  const { error } = await sb.from('pm_comments').insert([{ id: randomId(), project_id: projectId, user_id: currentUser.id, content: content.trim() }]);
  if (error) { showToast(error.message, 'error'); return; }
  document.getElementById('comment-content').value = '';
  await loadComments(projectId);
  renderComments(projectId);
}

// ======= Risks =======
async function loadRisks(projectId) {
  const { data, error } = await sb.from('pm_risks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (!error) risks[projectId] = data || [];
}

async function saveRisk() {
  const projectId = parseInt(document.getElementById('risk-project-id').value);
  const id = document.getElementById('risk-id').value;
  const title = document.getElementById('risk-title').value;
  const description = document.getElementById('risk-desc').value;
  const severity = document.getElementById('risk-severity').value;
  const status = document.getElementById('risk-status').value;
  const mitigation = document.getElementById('risk-mitigation').value;
  if (!title) { showToast('Title required', 'error'); return; }
  if (id) {
    await sb.from('pm_risks').update({ title, description, severity, status, mitigation }).eq('id', id);
  } else {
    await sb.from('pm_risks').insert([{ id: randomId(), project_id: projectId, user_id: currentUser.id, title, description, severity, status, mitigation }]);
  }
  closeModal();
  await loadRisks(projectId);
  renderRisks(projectId);
}

function showRiskModal(risk, projectId) {
  document.getElementById('modal-title').textContent = risk ? 'Edit Risk' : 'New Risk';
  document.getElementById('risk-id').value = risk?.id || '';
  document.getElementById('risk-project-id').value = risk ? risk.project_id : projectId;
  document.getElementById('risk-title').value = risk?.title || '';
  document.getElementById('risk-desc').value = risk?.description || '';
  document.getElementById('risk-severity').value = risk?.severity || 'medium';
  document.getElementById('risk-status').value = risk?.status || 'open';
  document.getElementById('risk-mitigation').value = risk?.mitigation || '';
  openModal('risk-modal');
}

async function deleteRisk(id, projectId) {
  if (!confirm('Delete this risk?')) return;
  await sb.from('pm_risks').delete().eq('id', id);
  await loadRisks(projectId);
  renderRisks(projectId);
}

// ======= Milestones =======
async function loadMilestones(projectId) {
  const { data, error } = await sb.from('pm_milestones').select('*').eq('project_id', projectId).order('created_at');
  if (!error) milestones[projectId] = data || [];
}

async function saveMilestone() {
  const projectId = parseInt(document.getElementById('ms-project-id').value);
  const id = document.getElementById('ms-id').value;
  const title = document.getElementById('ms-title').value;
  const description = document.getElementById('ms-desc').value;
  const dueDate = document.getElementById('ms-due').value;
  const status = document.getElementById('ms-status').value;
  if (!title) { showToast('Title required', 'error'); return; }
  if (id) {
    await sb.from('pm_milestones').update({ title, description, due_date: dueDate, status }).eq('id', id);
  } else {
    await sb.from('pm_milestones').insert([{ id: randomId(), project_id: projectId, user_id: currentUser.id, title, description, due_date: dueDate, status }]);
  }
  closeModal();
  await loadMilestones(projectId);
  renderMilestones(projectId);
}

function showMilestoneModal(ms, projectId) {
  document.getElementById('modal-title').textContent = ms ? 'Edit Milestone' : 'New Milestone';
  document.getElementById('ms-id').value = ms?.id || '';
  document.getElementById('ms-project-id').value = ms ? ms.project_id : projectId;
  document.getElementById('ms-title').value = ms?.title || '';
  document.getElementById('ms-desc').value = ms?.description || '';
  document.getElementById('ms-due').value = ms?.due_date || '';
  document.getElementById('ms-status').value = ms?.status || 'pending';
  openModal('milestone-modal');
}

async function deleteMilestone(id, projectId) {
  if (!confirm('Delete this milestone?')) return;
  await sb.from('pm_milestones').delete().eq('id', id);
  await loadMilestones(projectId);
  renderMilestones(projectId);
}

// ======= Notifications =======
async function loadNotifications() {
  try {
    const { data } = await sb.from('pm_notifications').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(20);
    if (data) notifications = data;
  } catch (_) { notifications = []; }
}

async function markNotifRead(id) {
  await sb.from('pm_notifications').update({ read: 1 }).eq('id', id);
  await loadNotifications();
  renderNotifications();
  document.getElementById('notif-badge').textContent = notifications.filter(n => !n.read).length || '';
}

// ======= Render Functions =======
function renderDashboard() {
  const total = projects.length;
  const active = projects.filter(p => p.status === 'active').length;
  const completed = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((s, p) => s + (parseFloat(p.budget) || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (parseFloat(p.spent) || 0), 0);

  document.getElementById('stat-projects').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-budget').textContent = '₹' + totalBudget.toLocaleString();

  const recent = projects.slice(0, 6);
  const grid = document.getElementById('dashboard-projects');
  if (recent.length === 0) {
    grid.innerHTML = `<div class="card" style="text-align:center;color:var(--gray-500);padding:40px;"><div style="font-size:40px;margin-bottom:12px;">📋</div><p>No projects yet. Create your first project!</p></div>`;
  } else {
    grid.innerHTML = recent.map(p => projectCardHtml(p)).join('');
  }
}

function projectCardHtml(p) {
  const taskCount = tasks[p.id]?.length || 0;
  const doneCount = tasks[p.id]?.filter(t => t.status === 'done').length || 0;
  return `<div class="project-card priority-${p.priority}" onclick="openProject(${p.id})">
    <div class="card-actions" onclick="event.stopPropagation()">
      <button class="btn btn-sm btn-secondary" onclick="showProjectModal(${JSON.stringify(p).replace(/"/g,'&quot;')})">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteProject(${p.id})">🗑️</button>
    </div>
    <div class="project-status status-${p.status}">${p.status.replace('_', ' ')}</div>
    <div class="project-title">${escHtml(p.title)}</div>
    <div class="project-desc">${escHtml(p.description)}</div>
    <div class="project-meta">
      <span>📅 ${formatDate(p.start_date) || '-'} → ${formatDate(p.end_date) || '-'}</span>
      <span>🎯 ${doneCount}/${taskCount} tasks</span>
      ${p.client_name ? `<span>👤 ${escHtml(p.client_name)}</span>` : ''}
    </div>
  </div>`;
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  const filter = (document.getElementById('project-filter')?.value || 'all');
  let filtered = projects;
  if (filter !== 'all') filtered = projects.filter(p => p.status === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="card" style="text-align:center;color:var(--gray-500);padding:40px;"><div style="font-size:40px;margin-bottom:12px;">📋</div><p>No projects found.</p></div>`;
  } else {
    grid.innerHTML = filtered.map(p => projectCardHtml(p)).join('');
  }
}

function renderProjectDetail() {
  const project = projects.find(p => p.id === selectedProjectId);
  if (!project) { showView('projects'); return; }
  const p = project;

  document.getElementById('pd-title').textContent = p.title;
  document.getElementById('pd-status-badge').className = `project-status status-${p.status}`;
  document.getElementById('pd-status-badge').textContent = p.status.replace('_', ' ');
  document.getElementById('pd-priority-badge').textContent = p.priority;
  document.getElementById('pd-desc').textContent = p.description || 'No description';
  document.getElementById('pd-dates').textContent = `${formatDate(p.start_date) || 'N/A'} - ${formatDate(p.end_date) || 'N/A'}`;
  document.getElementById('pd-client').textContent = p.client_name || 'N/A';
  document.getElementById('pd-client-email').textContent = p.client_email || 'N/A';
  document.getElementById('pd-budget').textContent = '₹' + (parseFloat(p.budget) || 0).toLocaleString();
  document.getElementById('pd-spent').textContent = '₹' + (parseFloat(p.spent) || 0).toLocaleString();

  const spentPct = p.budget > 0 ? Math.min(100, ((parseFloat(p.spent) || 0) / parseFloat(p.budget)) * 100) : 0;
  document.getElementById('pd-budget-bar').style.width = spentPct + '%';
  document.getElementById('pd-budget-bar').style.background = spentPct > 90 ? 'var(--danger)' : spentPct > 70 ? 'var(--warning)' : 'var(--success)';

  // Tabs
  document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pd-tab-content').forEach(t => t.classList.add('hidden'));
  const activeTab = document.querySelector('.pd-tab.active') || document.querySelector('.pd-tab');
  if (activeTab) {
    activeTab.classList.add('active');
    document.getElementById('pd-content-' + activeTab.dataset.tab)?.classList.remove('hidden');
  }

  loadTasks(selectedProjectId);
  loadComments(selectedProjectId);
  loadRisks(selectedProjectId);
  loadMilestones(selectedProjectId);
}

function switchPdTab(tab) {
  document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pd-tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelector(`.pd-tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('pd-content-' + tab).classList.remove('hidden');
  if (tab === 'tasks') renderTasks(selectedProjectId);
  else if (tab === 'comments') renderComments(selectedProjectId);
  else if (tab === 'risks') renderRisks(selectedProjectId);
  else if (tab === 'milestones') renderMilestones(selectedProjectId);
  else if (tab === 'gantt') renderGantt(selectedProjectId);
}

function renderTasks(projectId) {
  const ts = tasks[projectId] || [];
  const columns = ['todo', 'in_progress', 'review', 'done'];
  const board = document.getElementById('pd-tasks-board');
  board.innerHTML = columns.map(col => {
    const items = ts.filter(t => t.status === col);
    return `<div class="task-column">
      <h3>${col.replace('_', ' ').toUpperCase()} (${items.length})</h3>
      ${items.map(t => `<div class="task-card" onclick="editTaskFromCard(${t.id}, ${projectId})">
        <div class="task-title">${escHtml(t.title)}</div>
        <div class="task-meta">
          <span class="task-priority pri-${t.priority}"></span>
          <span>${t.due_date ? formatDate(t.due_date) : ''}</span>
          ${t.assigned_to ? '<span class="task-assignee">👤</span>' : ''}
        </div>
      </div>`).join('')}
      ${items.length === 0 ? '<div style="font-size:12px;color:var(--gray-500);padding:20px 0;text-align:center;">No tasks</div>' : ''}
    </div>`;
  }).join('');
}

function editTaskFromCard(taskId, projectId) {
  const task = (tasks[projectId] || []).find(t => t.id === taskId);
  if (task) showTaskModal(task, projectId);
}

function renderComments(projectId) {
  const cs = comments[projectId] || [];
  const el = document.getElementById('pd-comments');
  el.innerHTML = cs.map(c => `
    <div class="comment-item">
      <div class="comment-header">
        <span class="comment-author">${escHtml(c.user_id === currentUser.id ? 'You' : 'User')}</span>
        <span class="comment-time">${formatDate(c.created_at)}</span>
      </div>
      <div class="comment-text">${escHtml(c.content)}</div>
    </div>
  `).join('') || '<div style="color:var(--gray-500);font-size:13px;padding:12px 0;">No comments yet.</div>';
  document.getElementById('comment-project-id').value = projectId;
}

function renderRisks(projectId) {
  const rs = risks[projectId] || [];
  const el = document.getElementById('pd-risks');
  el.innerHTML = rs.map(r => `
    <div class="risk-item">
      <span class="risk-severity sev-${r.severity}">${r.severity}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:14px;">${escHtml(r.title)}</div>
        <div style="font-size:12px;color:var(--gray-500);">${escHtml(r.description)}</div>
        ${r.mitigation ? `<div style="font-size:12px;color:var(--gray-500);margin-top:2px;">🛡️ ${escHtml(r.mitigation)}</div>` : ''}
      </div>
      <span class="badge badge-${r.status}">${r.status}</span>
      <button class="btn btn-sm btn-secondary" onclick="showRiskModal(${JSON.stringify(r).replace(/"/g,'&quot;')}, ${projectId})">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteRisk(${r.id}, ${projectId})">🗑️</button>
    </div>
  `).join('') || '<div style="color:var(--gray-500);font-size:13px;padding:12px;">No risks logged.</div>';
}

function renderMilestones(projectId) {
  const ms = milestones[projectId] || [];
  const el = document.getElementById('pd-milestones');
  el.innerHTML = ms.length ? `<div class="timeline">${ms.map(m => `
    <div class="timeline-item ${m.status}">
      <div class="tl-title">${escHtml(m.title)}</div>
      <div class="tl-date">📅 ${formatDate(m.due_date) || 'No date'}</div>
      ${m.description ? `<div class="tl-desc">${escHtml(m.description)}</div>` : ''}
      <div style="margin-top:4px;display:flex;gap:4px;">
        <span class="badge badge-${m.status}">${m.status.replace('_', ' ')}</span>
        <button class="btn btn-xs btn-secondary" onclick="showMilestoneModal(${JSON.stringify(m).replace(/"/g,'&quot;')}, ${projectId})">✏️</button>
        <button class="btn btn-xs btn-danger" onclick="deleteMilestone(${m.id}, ${projectId})">🗑️</button>
      </div>
    </div>
  `).join('')}</div>` : '<div style="color:var(--gray-500);font-size:13px;padding:12px;">No milestones set.</div>';
}

function renderGantt(projectId) {
  const ts = tasks[projectId] || [];
  const el = document.getElementById('pd-gantt');
  if (!ts.length) {
    el.innerHTML = '<div style="color:var(--gray-500);font-size:13px;padding:12px;">Add tasks to see timeline.</div>';
    return;
  }
  el.innerHTML = `<div class="gantt-chart">
    <div class="gantt-header"><div class="gantt-label-h">Task</div><div style="flex:1;">Timeline</div></div>
    ${ts.map(t => `<div class="gantt-row">
      <div class="gantt-label">${escHtml(t.title)}</div>
      <div class="gantt-bar-wrap">
        <div class="gantt-bar ${t.status}" style="width:${t.status === 'done' ? 100 : t.status === 'in_progress' ? 60 : t.status === 'review' ? 80 : 20}%;"></div>
      </div>
    </div>`).join('')}
  </div>`;
}

function renderNotifications() {
  const el = document.getElementById('notif-list');
  el.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
      <div class="notif-icon">${n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : n.type === 'success' ? '✅' : 'ℹ️'}</div>
      <div class="notif-content">
        <div class="notif-title">${escHtml(n.title)}</div>
        <div class="notif-msg">${escHtml(n.message)}</div>
      </div>
      <div class="notif-time">${formatDate(n.created_at)}</div>
    </div>
  `).join('') || '<div style="color:var(--gray-500);padding:40px;text-align:center;">No notifications</div>';
}

// ======= Modal =======
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// ======= Init =======
document.addEventListener('DOMContentLoaded', function () {
  // Setup navigation
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });

  // Setup login/signup
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('signup-btn').addEventListener('click', handleSignup);
  document.getElementById('google-login-btn').addEventListener('click', handleGoogleLogin);
  document.getElementById('show-signup').addEventListener('click', showSignupForm);
  document.getElementById('logout-link').addEventListener('click', logout);

  // Setup project filter
  document.getElementById('project-filter')?.addEventListener('change', renderProjects);

  // Enter key support
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('signup-password').addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });

  // Modal close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  });

  // Close sidebar when clicking overlay
  document.getElementById('sidebar-overlay')?.addEventListener('click', toggleSidebar);

  // Check auth
  checkAuth();
});
