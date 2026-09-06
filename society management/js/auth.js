// Auth Module
const AuthModule = (() => {
  let currentUser = null;

  function showLogin() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <h1>🏘️ Society Manager</h1>
          <p class="text-center">Sign in to your account</p>
          <div id="authError" class="hidden" style="background:#fce8e6;color:#db4437;padding:10px;border-radius:6px;margin-bottom:12px;font-size:14px;"></div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="loginEmail" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="loginPassword" placeholder="••••••••">
          </div>
          <button class="btn-primary" onclick="AuthModule.handleLogin()">Sign In</button>
          <div class="auth-footer">
            Don't have an account? <a href="#" onclick="AuthModule.showRegister()">Register</a>
          </div>
        </div>
      </div>`;
    document.getElementById('loginEmail').addEventListener('keydown', e => e.key === 'Enter' && AuthModule.handleLogin());
    document.getElementById('loginPassword').addEventListener('keydown', e => e.key === 'Enter' && AuthModule.handleLogin());
  }

  function showRegister() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <h1>🏘️ Society Manager</h1>
          <p class="text-center">Create your account</p>
          <div id="authError" class="hidden" style="background:#fce8e6;color:#db4437;padding:10px;border-radius:6px;margin-bottom:12px;font-size:14px;"></div>
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="regName" placeholder="John Doe">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="regEmail" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label>Flat Number</label>
            <input type="text" id="regFlat" placeholder="A-101">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="regPassword" placeholder="Min 6 characters">
          </div>
          <button class="btn-primary" onclick="AuthModule.handleRegister()">Register</button>
          <div class="auth-footer">
            Already registered? <a href="#" onclick="AuthModule.showLogin()">Sign In</a>
          </div>
        </div>
      </div>`;
  }

  async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) { showError('Please fill in all fields'); return; }
    const btn = document.querySelector('.auth-card .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
    try {
      await supabaseClient.signIn(email, password);
      await loadApp();
    } catch (e) {
      showError(e.message || 'Login failed');
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
  }

  async function handleRegister() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const flat = document.getElementById('regFlat').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl = document.getElementById('authError');
    if (!name || !email || !flat || !password) { showError('Please fill in all fields'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters'); return; }
    try {
      await supabaseClient.signUp(email, password, { full_name: name, flat_number: flat, role: 'resident' });
      // Auto-confirm user via Edge Function
      try {
        await fetch('https://vgipghqejzbcoighktij.supabase.co/functions/v1/society-confirm-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      } catch (e) { /* ignore — user may already be confirmed */ }
      // Sign in immediately
      await supabaseClient.signIn(email, password);
      await loadApp();
    } catch (e) {
      showError(e.message || 'Registration failed');
    }
  }

  function showError(msg) {
    const el = document.getElementById('authError');
    if (el) { el.classList.remove('hidden'); el.textContent = msg; el.style.background = '#fce8e6'; el.style.color = '#db4437'; }
    else { showToast(msg, 'error'); }
  }

  async function checkSession() {
    const { data: { session } } = await supabaseClient.getClient().auth.getSession();
    if (session) {
      try {
        currentUser = await supabaseClient.getCurrentUser();
        return currentUser;
      } catch (e) {
        return { id: session.user.id, email: session.user.email, profile: null };
      }
    }
    return null;
  }

  async function loadApp() {
    currentUser = await supabaseClient.getCurrentUser();
    if (!currentUser) { PlansModule.showPricing(); return; }
    const hasAccess = await PlansModule.checkAccess();
    if (!hasAccess) {
      PlansModule.showPricing();
      showToast('Please purchase a plan to access the app', 'info');
      return;
    }
    renderLayout(currentUser);
    await navigate('dashboard');
  }

  function renderLayout(user) {
    const role = user.profile?.role || 'resident';
    const menuItems = {
      admin: [
        { icon: '📊', label: 'Dashboard', id: 'dashboard' },
        { icon: '👥', label: 'Residents', id: 'residents' },
        { icon: '🧑‍🔧', label: 'Staff', id: 'staff' },
        { icon: '💰', label: 'Maintenance', id: 'maintenance' },
        { icon: '📢', label: 'Notice Board', id: 'notices' },
        { icon: '💬', label: 'Forum', id: 'forum' },
        { icon: '🏋️', label: 'Facilities', id: 'facilities' },
        { icon: '🔒', label: 'Security', id: 'security' },
        { icon: '📝', label: 'Complaints', id: 'complaints' },
        { icon: '📁', label: 'Documents', id: 'documents' },
        { icon: '📈', label: 'Reports', id: 'reports' },
      ],
      super_admin: [
        { icon: '📊', label: 'Dashboard', id: 'dashboard' },
        { icon: '👥', label: 'Residents', id: 'residents' },
        { icon: '🧑‍🔧', label: 'Staff', id: 'staff' },
        { icon: '💰', label: 'Maintenance', id: 'maintenance' },
        { icon: '📢', label: 'Notice Board', id: 'notices' },
        { icon: '💬', label: 'Forum', id: 'forum' },
        { icon: '🏋️', label: 'Facilities', id: 'facilities' },
        { icon: '🔒', label: 'Security', id: 'security' },
        { icon: '📝', label: 'Complaints', id: 'complaints' },
        { icon: '📁', label: 'Documents', id: 'documents' },
        { icon: '📈', label: 'Reports', id: 'reports' },
        { icon: '🎫', label: 'Plan Assignment', id: 'plans' },
      ],
      resident: [
        { icon: '📊', label: 'Dashboard', id: 'dashboard' },
        { icon: '💰', label: 'My Bills', id: 'maintenance' },
        { icon: '📢', label: 'Notice Board', id: 'notices' },
        { icon: '💬', label: 'Forum', id: 'forum' },
        { icon: '🏋️', label: 'Book Facility', id: 'facilities' },
        { icon: '📝', label: 'Complaints', id: 'complaints' },
        { icon: '📁', label: 'Documents', id: 'documents' },
      ],
      security: [
        { icon: '📊', label: 'Dashboard', id: 'dashboard' },
        { icon: '🔒', label: 'Visitor Log', id: 'security' },
        { icon: '📢', label: 'Notice Board', id: 'notices' },
        { icon: '📁', label: 'Documents', id: 'documents' },
      ],
      staff: [
        { icon: '📊', label: 'Dashboard', id: 'dashboard' },
        { icon: '📝', label: 'Complaints', id: 'complaints' },
        { icon: '📋', label: 'My Duties', id: 'staff' },
        { icon: '📢', label: 'Notice Board', id: 'notices' },
        { icon: '📁', label: 'Documents', id: 'documents' },
      ]
    };
    const items = menuItems[role] || menuItems.resident;

    document.getElementById('app').innerHTML = `
      <div class="app-layout">
        <aside class="sidebar">
          <div class="logo">🏘️ <span>Society Manager</span></div>
          <a href="../index.html" class="sidebar-home"><span class="icon">🏠</span><span>Home</span></a>
          <nav id="sideNav">${items.map(i => `<a href="#" class="${i.id === 'dashboard' ? 'active' : ''}" data-page="${i.id}"><span class="icon">${i.icon}</span><span>${i.label}</span></a>`).join('')}</nav>
        </aside>
        <main class="main-content">
          <header class="main-header">
            <h1 id="pageTitle">Dashboard</h1>
            <div class="user-info">
              <span id="userRole" style="font-size:13px;color:var(--text-secondary)">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
              <div class="avatar">${(user.profile?.full_name || 'U')[0]}</div>
              <button class="btn-outline btn-sm" onclick="AuthModule.handleLogout()">Logout</button>
            </div>
          </header>
          <div id="pageContent"></div>
        </main>
      </div>`;

    document.querySelectorAll('#sideNav a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('#sideNav a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        navigate(a.dataset.page);
      });
    });
  }

  async function navigate(page) {
    const titles = {
      dashboard: '📊 Dashboard', residents: '👥 Resident Management', maintenance: '💰 Maintenance & Billing',
      notices: '📢 Notice Board', forum: '💬 Resident Forum', facilities: '🏋️ Facility Booking',
      security: '🔒 Security & Visitors', complaints: '📝 Complaints', reports: '📈 Reports & Analytics',
      plans: '🎫 Plan Assignment', documents: '📁 Document Storage', staff: '🧑‍🔧 Staff Management'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    const el = document.getElementById('pageContent');
    el.innerHTML = '<div class="spinner"></div>';
    switch(page) {
      case 'dashboard': await DashboardModule.render(el); break;
      case 'residents': await ResidentsModule.render(el); break;
      case 'maintenance': await MaintenanceModule.render(el); break;
      case 'notices': await NoticesModule.render(el); break;
      case 'forum': await ForumModule.render(el); break;
      case 'facilities': await FacilitiesModule.render(el); break;
      case 'security': await SecurityModule.render(el); break;
      case 'complaints': await ComplaintsModule.render(el); break;
      case 'reports': await ReportsModule.render(el); break;
      case 'plans': await PlanAssignment.render(el); break;
      case 'documents': await DocumentsModule.render(el); break;
      case 'staff': await StaffModule.render(el); break;
      default: el.innerHTML = '<h2>Page not found</h2>';
    }
  }

  function handleLogout() { supabaseClient.signOut().then(() => { if (window.sitengSetUser) window.sitengSetUser(null); currentUser = null; showLogin(); }); }

  return { showLogin, showRegister, handleLogin, handleRegister, loadApp, navigate, checkSession, handleLogout, get currentUser() { return currentUser; } };
})();
