const PAGE_SIZE = 20

async function loadDashboard() {
  const el = document.getElementById('page-content')
  el.innerHTML = '<div class="location-empty" style="text-align:center;padding:40px;color:#666">Loading dashboard...</div>'

  try {
    const { data: stats, error } = await sb.rpc('get_admin_stats')
    if (error) throw error

    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="icon">🚗</div><div class="label">Online Drivers</div><div class="value">${stats.online_drivers}</div><div class="change">${stats.verified_drivers} verified</div></div>
        <div class="stat-card"><div class="icon">👤</div><div class="label">Total Riders</div><div class="value">${stats.total_riders}</div><div class="change">${stats.total_drivers} total drivers</div></div>
        <div class="stat-card"><div class="icon">📍</div><div class="label">Completed Trips</div><div class="value">${stats.completed_trips}</div><div class="change">${stats.today_trips} today</div></div>
        <div class="stat-card"><div class="icon">💰</div><div class="label">Total Revenue</div><div class="value">${formatCurrency(stats.total_revenue)}</div><div class="change" class="up">${stats.pending_payouts > 0 ? formatCurrency(stats.pending_payouts) + ' pending' : ''}</div></div>
        <div class="stat-card"><div class="icon">📊</div><div class="label">Total Trips</div><div class="value">${stats.total_trips}</div><div class="change">${stats.cancelled_trips} cancelled (${stats.total_trips > 0 ? Math.round(stats.cancelled_trips / stats.total_trips * 100) : 0}%)</div></div>
        <div class="stat-card"><div class="icon">🎫</div><div class="label">Open Tickets</div><div class="value">${stats.open_tickets}</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-card"><h4>Weekly Trips</h4><canvas id="chart-trips"></canvas></div>
        <div class="chart-card"><h4>Revenue (Last 7 Days)</h4><canvas id="chart-revenue"></canvas></div>
      </div>
      <div class="table-container">
        <div class="table-header"><h3>Recent Trips</h3><button class="btn btn-sm" onclick="navigate('trips')">View All</button></div>
        <div id="recent-trips-table"><div style="padding:20px;text-align:center;color:#666">Loading...</div></div>
      </div>`

    loadDashboardCharts()
    loadRecentTrips()
  } catch (e) {
    el.innerHTML = `<div class="location-empty" style="text-align:center;padding:40px;color:#ef5350">Error: ${e.message}</div>`
  }
}

async function loadRecentTrips() {
  const container = document.getElementById('recent-trips-table')
  try {
    const { data, error } = await sb.from('trips')
      .select('id, rider_id, driver_id, pickup_address, drop_address, fare_final, status, created_at')
      .order('created_at', { ascending: false }).limit(10)
    if (error) throw error
    if (!data?.length) { container.innerHTML = '<div style="padding:20px;text-align:center;color:#666">No trips yet</div>'; return }

    container.innerHTML = `<table><thead><tr><th>ID</th><th>Rider</th><th>Driver</th><th>Pickup</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead><tbody>
      ${data.map(t => `<tr><td>#${t.id}</td><td>${t.rider_id?.substring(0, 8) || '—'}..</td><td>${t.driver_id?.substring(0, 8) || '—'}..</td><td>${escapeHtml(t.pickup_address?.substring(0, 30))}</td><td>${t.fare_final ? formatCurrency(t.fare_final) : '—'}</td><td><span class="status-badge ${t.status}">${t.status}</span></td><td>${formatDate(t.created_at)}</td></tr>`).join('')}
    </tbody></table>`
  } catch (e) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:#ef5350">${e.message}</div>`
  }
}

async function loadDrivers() {
  const el = document.getElementById('page-content')
  el.innerHTML = `
    <div class="filter-bar">
      <input type="text" id="driver-search" placeholder="Search name, email, phone..." oninput="filterDrivers()">
      <select id="driver-filter" onchange="filterDrivers()">
        <option value="all">All Drivers</option>
        <option value="verified">Verified</option>
        <option value="unverified">Unverified</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
    </div>
    <div class="table-container">
      <div class="table-header"><h3>Drivers</h3><span id="driver-count" style="color:#888;font-size:13px"></span></div>
      <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Vehicle</th><th>Status</th><th>Rating</th><th>Rides</th><th>Earnings</th><th>Actions</th></tr></thead><tbody id="drivers-tbody"></tbody></table>
    </div>
    <div id="driver-pagination" style="display:flex;justify-content:center;gap:8px"></div>`
  await fetchDrivers()
}

let allDrivers = []

async function fetchDrivers() {
  try {
    const { data, error } = await sb.from('driver_details')
      .select('id, license_number, vehicle_type, vehicle_number, vehicle_color, is_verified, is_online, current_lat, current_lng, rating, total_rides, total_earnings, profile:profiles!id(name, email, phone)')
      .order('total_rides', { ascending: false })
    if (error) throw error
    allDrivers = data || []
    document.getElementById('driver-count').textContent = `${data?.length || 0} drivers`
    filterDrivers()
  } catch (e) {
    document.getElementById('drivers-tbody').innerHTML = `<tr><td colspan="9" style="color:#ef5350;text-align:center">${e.message}</td></tr>`
  }
}

function filterDrivers() {
  const q = (document.getElementById('driver-search')?.value || '').toLowerCase()
  const filter = document.getElementById('driver-filter')?.value || 'all'
  const filtered = allDrivers.filter(d => {
    const p = d.profile || {}
    if (q && !(p.name || '').toLowerCase().includes(q) && !(p.email || '').toLowerCase().includes(q) && !(p.phone || '').includes(q)) return false
    if (filter === 'verified' && !d.is_verified) return false
    if (filter === 'unverified' && d.is_verified) return false
    if (filter === 'online' && !d.is_online) return false
    if (filter === 'offline' && d.is_online) return false
    return true
  })
  renderDriverTable(filtered)
}

function renderDriverTable(drivers) {
  const tbody = document.getElementById('drivers-tbody')
  if (!drivers.length) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#666">No drivers found</td></tr>'; return }

  tbody.innerHTML = drivers.map(d => {
    const p = d.profile || {}
    const status = d.is_verified ? (d.is_online ? '<span class="status-badge completed" style="background:#1b3a2a">Online</span>' : '<span class="status-badge pending" style="background:#2a2a1a">Offline</span>') : '<span class="status-badge cancelled">Unverified</span>'
    return `<tr>
      <td><strong>${escapeHtml(p.name || '—')}</strong></td>
      <td>${escapeHtml(p.email || '—')}</td>
      <td>${escapeHtml(p.phone || '—')}</td>
      <td>${escapeHtml(d.vehicle_type || '—')} · ${escapeHtml(d.vehicle_number || '')}</td>
      <td>${status}</td>
      <td>⭐ ${d.rating || '—'}</td>
      <td>${d.total_rides || 0}</td>
      <td>${formatCurrency(d.total_earnings)}</td>
      <td><button class="btn btn-sm" onclick="showDriverDetail('${d.id}')">View</button></td>
    </tr>`
  }).join('')
}

async function showDriverDetail(id) {
  const { data, error } = await sb.from('driver_details').select('*, profile:profiles!id(*)').eq('id', id).single()
  if (error || !data) return alert('Error: ' + (error?.message || 'Not found'))
  const p = data.profile || {}

  const recentTrips = await sb.from('trips').select('id, pickup_address, drop_address, fare_final, status, created_at').eq('driver_id', id).order('created_at', { ascending: false }).limit(5)

  showModal(`
    <h3>${escapeHtml(p.name || 'Driver')}</h3>
    <div class="field"><label>Email</label><div>${escapeHtml(p.email || '—')}</div></div>
    <div class="field"><label>Phone</label><div>${escapeHtml(p.phone || '—')}</div></div>
    <div class="field"><label>Vehicle</label><div>${escapeHtml(data.vehicle_type || '—')} · ${escapeHtml(data.vehicle_number || '—')} (${escapeHtml(data.vehicle_color || '—')})</div></div>
    <div class="field"><label>License</label><div>${escapeHtml(data.license_number || '—')}</div></div>
    <div class="field"><label>Rating</label><div>⭐ ${data.rating || '—'} · ${data.total_rides || 0} rides</div></div>
    <div class="field"><label>Earnings</label><div>${formatCurrency(data.total_earnings)}</div></div>
    <div class="field"><label>Bank</label><div>${escapeHtml(data.bank_account || '—')} (IFSC: ${escapeHtml(data.bank_ifsc || '—')})</div></div>
    <hr style="border-color:#2a2a3e;margin:16px 0">
    <h4 style="margin-bottom:8px">Recent Trips</h4>
    ${recentTrips.error || !recentTrips.data?.length ? '<div style="color:#666;font-size:13px">No trips yet</div>' :
      `<table><thead><tr><th>ID</th><th>Pickup</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead><tbody>
      ${recentTrips.data.map(t => `<tr><td>#${t.id}</td><td>${escapeHtml(t.pickup_address?.substring(0, 20))}</td><td>${t.fare_final ? formatCurrency(t.fare_final) : '—'}</td><td><span class="status-badge ${t.status}">${t.status}</span></td><td>${formatDate(t.created_at)}</td></tr>`).join('')}
      </tbody></table>`
    }
    <div style="display:flex;gap:8px;margin-top:16px">
      ${data.is_verified ? `<button class="btn btn-sm btn-danger" onclick="toggleDriverVerification('${id}', false)">Unverify</button>` : `<button class="btn btn-sm btn-primary" onclick="toggleDriverVerification('${id}', true)">Verify</button>`}
      <button class="btn btn-sm" onclick="closeModal()">Close</button>
    </div>
  `)
}

async function toggleDriverVerification(id, verify) {
  if (!confirm(verify ? 'Verify this driver?' : 'Unverify this driver?')) return
  const { error } = await sb.from('driver_details').update({ is_verified: verify }).eq('id', id)
  if (error) return alert('Error: ' + error.message)
  closeModal()
  fetchDrivers()
}

// === RIDERS ===
let allRiders = []

async function loadRiders() {
  const el = document.getElementById('page-content')
  el.innerHTML = `
    <div class="filter-bar">
      <input type="text" id="rider-search" placeholder="Search name, email..." oninput="filterRiders()">
    </div>
    <div class="table-container">
      <div class="table-header"><h3>Riders</h3><span id="rider-count" style="color:#888;font-size:13px"></span></div>
      <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Rating</th><th>Total Rides</th><th>Joined</th><th>Actions</th></tr></thead><tbody id="riders-tbody"></tbody></table>
    </div>`

  try {
    const { data, error } = await sb.from('profiles').select('id, name, email, phone, created_at, rider_details!id(rating, total_rides)').eq('role', 'rider').order('created_at', { ascending: false })
    if (error) throw error
    allRiders = data || []
    document.getElementById('rider-count').textContent = `${data?.length || 0} riders`
    filterRiders()
  } catch (e) {
    document.getElementById('riders-tbody').innerHTML = `<tr><td colspan="7" style="color:#ef5350;text-align:center">${e.message}</td></tr>`
  }
}

function filterRiders() {
  const q = (document.getElementById('rider-search')?.value || '').toLowerCase()
  const filtered = allRiders.filter(r => !q || (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q))
  renderRiderTable(filtered)
}

function renderRiderTable(riders) {
  const tbody = document.getElementById('riders-tbody')
  if (!riders.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666">No riders found</td></tr>'; return }

  tbody.innerHTML = riders.map(r => {
    const rd = r.rider_details || {}
    return `<tr>
      <td><strong>${escapeHtml(r.name || '—')}</strong></td>
      <td>${escapeHtml(r.email || '—')}</td>
      <td>${escapeHtml(r.phone || '—')}</td>
      <td>⭐ ${rd.rating || '—'}</td>
      <td>${rd.total_rides || 0}</td>
      <td>${formatDate(r.created_at)}</td>
      <td><button class="btn btn-sm" onclick="showRiderDetail('${r.id}')">View</button></td>
    </tr>`
  }).join('')
}

async function showRiderDetail(id) {
  const { data, error } = await sb.from('profiles').select('*, rider_details!id(*)').eq('id', id).single()
  if (error || !data) return alert('Error')
  const rd = data.rider_details || {}
  showModal(`
    <h3>${escapeHtml(data.name || 'Rider')}</h3>
    <div class="field"><label>Email</label><div>${escapeHtml(data.email || '—')}</div></div>
    <div class="field"><label>Phone</label><div>${escapeHtml(data.phone || '—')}</div></div>
    <div class="field"><label>Rating</label><div>⭐ ${rd.rating || '—'} · ${rd.total_rides || 0} rides</div></div>
    <div class="field"><label>Joined</label><div>${formatDate(data.created_at)}</div></div>
    <button class="btn btn-sm" onclick="closeModal()" style="margin-top:16px">Close</button>
  `)
}

// === TRIPS ===
async function loadTrips() {
  const el = document.getElementById('page-content')
  el.innerHTML = `
    <div class="filter-bar">
      <select id="trip-status-filter" onchange="fetchTrips()">
        <option value="all">All Status</option>
        <option value="requested">Requested</option>
        <option value="accepted">Accepted</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input type="date" id="trip-date-from">
      <input type="date" id="trip-date-to">
      <button class="btn btn-sm btn-primary" onclick="fetchTrips()">Apply</button>
    </div>
    <div class="table-container">
      <div class="table-header"><h3>Trips</h3><span id="trip-count" style="color:#888;font-size:13px"></span></div>
      <table><thead><tr><th>ID</th><th>Rider</th><th>Driver</th><th>Pickup</th><th>Drop</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead><tbody id="trips-tbody"></tbody></table>
    </div>
    <div id="trip-pagination" style="display:flex;justify-content:center;gap:8px"></div>`
  await fetchTrips()
}

async function fetchTrips() {
  const status = document.getElementById('trip-status-filter')?.value
  const dateFrom = document.getElementById('trip-date-from')?.value
  const dateTo = document.getElementById('trip-date-to')?.value

  let query = sb.from('trips').select('id, rider_id, driver_id, pickup_address, drop_address, fare_estimate, fare_final, status, distance_km, duration_min, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(PAGE_SIZE)

  if (status && status !== 'all') query = query.eq('status', status)
  if (dateFrom) query = query.gte('created_at', dateFrom + 'T00:00:00Z')
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z')

  try {
    const { data, error, count } = await query
    if (error) throw error
    document.getElementById('trip-count').textContent = `${count || data?.length || 0} trips`
    const tbody = document.getElementById('trips-tbody')
    if (!data?.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#666">No trips found</td></tr>'; return }

    tbody.innerHTML = data.map(t => `<tr>
      <td>#${t.id}</td>
      <td>${t.rider_id?.substring(0, 8) || '—'}..</td>
      <td>${t.driver_id?.substring(0, 8) || '—'}..</td>
      <td>${escapeHtml(t.pickup_address?.substring(0, 25) || '—')}</td>
      <td>${escapeHtml(t.drop_address?.substring(0, 25) || '—')}</td>
      <td>${t.fare_final ? formatCurrency(t.fare_final) : t.fare_estimate ? formatCurrency(t.fare_estimate) + ' est' : '—'}</td>
      <td><span class="status-badge ${t.status}">${t.status}</span></td>
      <td>${formatDate(t.created_at)}</td>
    </tr>`).join('')
  } catch (e) {
    document.getElementById('trips-tbody').innerHTML = `<tr><td colspan="8" style="color:#ef5350;text-align:center">${e.message}</td></tr>`
  }
}

// === PAYMENTS ===
async function loadPayments() {
  const el = document.getElementById('page-content')
  el.innerHTML = `
    <div class="filter-bar">
      <select id="payment-status-filter" onchange="fetchPayments()">
        <option value="all">All Status</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
        <option value="refunded">Refunded</option>
      </select>
    </div>
    <div class="table-container">
      <div class="table-header"><h3>Payments</h3><span id="payment-count" style="color:#888;font-size:13px"></span></div>
      <table><thead><tr><th>ID</th><th>Trip</th><th>Amount</th><th>Commission</th><th>Driver Earnings</th><th>Method</th><th>Status</th><th>Date</th></tr></thead><tbody id="payments-tbody"></tbody></table>
    </div>`

  try {
    let query = sb.from('ride_payments').select('id, trip_id, amount, commission, driver_earnings, method, gateway, status, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(PAGE_SIZE)
    const status = document.getElementById('payment-status-filter')?.value
    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error
    document.getElementById('payment-count').textContent = `${count || data?.length || 0} payments`

    const tbody = document.getElementById('payments-tbody')
    if (!data?.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#666">No payments found</td></tr>'; return }

    tbody.innerHTML = data.map(p => `<tr>
      <td>#${p.id}</td>
      <td>#${p.trip_id}</td>
      <td>${formatCurrency(p.amount)}</td>
      <td>${formatCurrency(p.commission)}</td>
      <td>${formatCurrency(p.driver_earnings)}</td>
      <td>${escapeHtml(p.method || '—')}</td>
      <td><span class="status-badge ${p.status}">${p.status}</span></td>
      <td>${formatDate(p.created_at)}</td>
    </tr>`).join('')
  } catch (e) {
    document.getElementById('payments-tbody').innerHTML = `<tr><td colspan="8" style="color:#ef5350;text-align:center">${e.message}</td></tr>`
  }
}

// === TICKETS ===
async function loadTickets() {
  const el = document.getElementById('page-content')
  el.innerHTML = `
    <div class="filter-bar">
      <select id="ticket-filter" onchange="fetchTickets()">
        <option value="all">All Tickets</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
    </div>
    <div class="table-container">
      <div class="table-header"><h3>Support Tickets</h3><span id="ticket-count" style="color:#888;font-size:13px"></span></div>
      <table><thead><tr><th>ID</th><th>User</th><th>Subject</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody id="tickets-tbody"></tbody></table>
    </div>`
  await fetchTickets()
}

async function fetchTickets() {
  const status = document.getElementById('ticket-filter')?.value

  try {
    let query = sb.from('support_tickets').select('id, user_id, trip_id, subject, status, priority, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(PAGE_SIZE)
    if (status && status !== 'all') query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw error
    document.getElementById('ticket-count').textContent = `${count || data?.length || 0} tickets`

    const tbody = document.getElementById('tickets-tbody')
    if (!data?.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666">No tickets found</td></tr>'; return }

    tbody.innerHTML = data.map(t => `<tr>
      <td>#${t.id}</td>
      <td>${t.user_id?.substring(0, 8) || '—'}..</td>
      <td>${escapeHtml(t.subject?.substring(0, 40) || '—')}</td>
      <td><span class="status-badge ${t.priority === 'urgent' || t.priority === 'high' ? 'cancelled' : t.priority === 'medium' ? 'pending' : 'completed'}">${t.priority || '—'}</span></td>
      <td><span class="status-badge ${t.status}">${t.status}</span></td>
      <td>${formatDate(t.created_at)}</td>
      <td><button class="btn btn-sm" onclick="showTicketDetail(${t.id})">View</button></td>
    </tr>`).join('')
  } catch (e) {
    document.getElementById('tickets-tbody').innerHTML = `<tr><td colspan="7" style="color:#ef5350;text-align:center">${e.message}</td></tr>`
  }
}

async function showTicketDetail(id) {
  const { data, error } = await sb.from('support_tickets').select('*, messages:ticket_messages(*)').eq('id', id).single()
  if (error || !data) return alert('Error')

  const msgs = data.messages || []
  showModal(`
    <h3>#${data.id}: ${escapeHtml(data.subject)}</h3>
    <div class="field"><label>Description</label><div>${escapeHtml(data.description)}</div></div>
    <hr style="border-color:#2a2a3e;margin:16px 0">
    <h4 style="margin-bottom:8px">Messages (${msgs.length})</h4>
    ${msgs.length === 0 ? '<div style="color:#666;font-size:13px">No messages</div>' :
      msgs.map(m => `<div style="padding:8px 0;border-bottom:1px solid #25253e">
        <div style="font-size:11px;color:#888">${m.user_id?.substring(0, 8)}.. · ${formatDate(m.created_at)}</div>
        <div>${escapeHtml(m.message)}</div>
      </div>`).join('')
    }
    <div style="margin-top:16px">
      <label style="font-size:12px;color:#888;display:block;margin-bottom:4px">Add Reply</label>
      <textarea id="ticket-reply" rows="3" style="margin-bottom:8px"></textarea>
      <div style="display:flex;gap:8px">
        <select id="ticket-status-update">
          <option value="open" ${data.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="in_progress" ${data.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="resolved" ${data.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          <option value="closed" ${data.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
        <button class="btn btn-sm btn-primary" onclick="replyTicket(${id})">Reply</button>
        <button class="btn btn-sm" onclick="closeModal()">Close</button>
      </div>
    </div>
  `)
}

async function replyTicket(id) {
  const message = document.getElementById('ticket-reply')?.value?.trim()
  const newStatus = document.getElementById('ticket-status-update')?.value
  if (!message) return alert('Enter a reply message')

  try {
    if (newStatus) {
      const { error: err1 } = await sb.from('support_tickets').update({ status: newStatus }).eq('id', id)
      if (err1) throw err1
    }
    const { error: err2 } = await sb.from('ticket_messages').insert({
      ticket_id: id, user_id: currentUser.id, message,
    })
    if (err2) throw err2
    closeModal()
    fetchTickets()
  } catch (e) {
    alert('Error: ' + e.message)
  }
}

// === SETTINGS ===
function loadSettings() {
  document.getElementById('page-content').innerHTML = `
    <div style="max-width:600px">
      <div class="table-container">
        <div class="table-header"><h3>Fare Settings</h3></div>
        <div style="padding:20px">
          <div class="field"><label>Base Fare (Sedan)</label><input type="number" value="50" id="fare-base"></div>
          <div class="field"><label>Per KM (Sedan)</label><input type="number" value="12" id="fare-per-km"></div>
          <div class="field"><label>Per Minute (Sedan)</label><input type="number" value="2" id="fare-per-min"></div>
          <div class="field"><label>Platform Commission (%)</label><input type="number" value="20" id="commission-rate"></div>
          <button class="btn btn-primary" onclick="alert('Settings saved (in-memory). Update schema.sql for persistence.')">Save Settings</button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-header"><h3>Supabase Configuration</h3></div>
        <div style="padding:20px;font-size:13px;color:#888">
          <p>Update the credentials in <code>web/js/supabase.js</code> and run <code>schema.sql</code> in your Supabase SQL editor.</p>
          <p style="margin-top:8px">Deploy Edge Functions:</p>
          <pre style="background:#0f0f1a;padding:12px;border-radius:6px;margin-top:4px;font-size:11px">
supabase functions deploy seed-admin
supabase functions deploy fare-estimate
supabase functions deploy notify-ride
supabase functions deploy process-payment
          </pre>
        </div>
      </div>
    </div>`
}

// === MODAL ===
function showModal(html) {
  let overlay = document.querySelector('.modal-overlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.onclick = (e) => { if (e.target === overlay) closeModal() }
    document.body.appendChild(overlay)
    const box = document.createElement('div')
    box.className = 'modal-box'
    overlay.appendChild(box)
  }
  overlay.querySelector('.modal-box').innerHTML = html
  overlay.classList.add('open')
}

function closeModal() {
  document.querySelector('.modal-overlay')?.classList.remove('open')
}

// Check auth on load
;(async () => {
  const session = await sb.auth.getSession()
  if (session?.data?.session) {
    currentUser = session.data.session.user
    document.getElementById('login-overlay').style.display = 'none'
    document.getElementById('app').style.display = 'flex'
    document.getElementById('admin-name').textContent = currentUser.email || 'Admin'
    loadDashboard()
  }
})()
