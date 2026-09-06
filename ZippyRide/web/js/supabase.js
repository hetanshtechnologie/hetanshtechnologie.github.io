const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo'

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUser = null
let currentPage = 'dashboard'
let chartsInitialized = false
let isRegisterMode = false

// Initialize auth state
sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user
    if (window.sitengSetUser) window.sitengSetUser(session.user.email, session.user.id)
    document.getElementById('login-overlay').style.display = 'none'
    document.getElementById('app').style.display = 'flex'
    document.getElementById('admin-name').textContent = session.user.email || 'Admin'
    loadDashboard()
  } else {
    currentUser = null
    if (window.sitengSetUser) window.sitengSetUser(null)
    document.getElementById('app').style.display = 'none'
    document.getElementById('login-overlay').style.display = 'flex'
  }
})

async function login() {
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value.trim()
  document.getElementById('login-error').textContent = ''

  if (!email || !password) {
    document.getElementById('login-error').textContent = 'Enter email and password'
    return
  }

  if (isRegisterMode) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/seed-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email, password }),
      })
      const result = await res.json()
      if (!res.ok) { document.getElementById('login-error').textContent = result.error; return }
      document.getElementById('login-error').textContent = 'Account created! You can now sign in.'
      isRegisterMode = false
      document.getElementById('login-btn').textContent = 'Sign In'
      document.getElementById('login-toggle').textContent = 'First time? Create admin account'
      document.getElementById('login-subtitle').textContent = 'Sign in to manage your fleet'
    } catch (e) {
      document.getElementById('login-error').textContent = e.message
    }
    return
  }

  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) {
    document.getElementById('login-error').textContent = error.message
  }
}

function toggleLoginMode() {
  isRegisterMode = !isRegisterMode
  document.getElementById('login-error').textContent = ''
  if (isRegisterMode) {
    document.getElementById('login-btn').textContent = 'Create Admin Account'
    document.getElementById('login-subtitle').textContent = 'Register as the first admin'
    document.getElementById('login-toggle').textContent = 'Already have an account? Sign in'
  } else {
    document.getElementById('login-btn').textContent = 'Sign In'
    document.getElementById('login-subtitle').textContent = 'Sign in to manage your fleet'
    document.getElementById('login-toggle').textContent = 'First time? Create admin account'
  }
}

function logout() {
  sb.auth.signOut()
}

function navigate(page) {
  currentPage = page
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page)
  })

  const titles = {
    dashboard: 'Dashboard',
    drivers: 'Drivers',
    riders: 'Riders',
    trips: 'Trips',
    payments: 'Payments',
    tickets: 'Support Tickets',
    settings: 'Settings',
  }
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard'

  switch (page) {
    case 'dashboard': loadDashboard(); break
    case 'drivers': loadDrivers(); break
    case 'riders': loadRiders(); break
    case 'trips': loadTrips(); break
    case 'payments': loadPayments(); break
    case 'tickets': loadTickets(); break
    case 'settings': loadSettings(); break
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open')
}

async function checkAdmin() {
  if (!currentUser) return false
  const { data, error } = await sb.from('profiles').select('role').eq('id', currentUser.id).single()
  return data?.role === 'admin'
}

function formatCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s || ''
  return div.innerHTML
}
