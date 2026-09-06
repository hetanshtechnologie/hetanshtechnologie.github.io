const DashboardModule = (() => {
  async function render(el) {
    const client = supabaseClient.getClient();
    const user = AuthModule.currentUser;
    const role = user.profile?.role;

    let stats = {};
    try {
      if (role === 'admin') {
        const { count: residents } = await client.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin');
        const { count: bills } = await client.from('maintenance_bills').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: complaints } = await client.from('complaints').select('*', { count: 'exact', head: true }).neq('status', 'resolved').neq('status', 'closed');
        const { count: visitors } = await client.from('visitors').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: documents } = await client.from('documents').select('*', { count: 'exact', head: true });
        const { count: staff } = await client.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['staff', 'security']);
        stats = { residents, bills, complaints, visitors, documents, staff };
      } else if (role === 'resident') {
        const { count: myBills } = await client.from('maintenance_bills').select('*', { count: 'exact', head: true }).eq('resident_id', user.id).eq('status', 'pending');
        const { count: myComplaints } = await client.from('complaints').select('*', { count: 'exact', head: true }).eq('resident_id', user.id).neq('status', 'resolved');
        const { count: myBookings } = await client.from('facility_bookings').select('*', { count: 'exact', head: true }).eq('resident_id', user.id).neq('status', 'cancelled');
        stats = { myBills, myComplaints, myBookings, dues: await getDuesAmount(user.id) };
      } else {
        const { count: pendingVisitors } = await client.from('visitors').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        stats = { pendingVisitors };
      }
    } catch (e) { console.error(e); }

    el.innerHTML = `
      <div class="grid grid-4" id="statCards"></div>
      <div class="grid grid-2 mt-3">
        <div class="card" id="recentActivity"><h3 class="mb-2">Recent Activity</h3><div class="spinner"></div></div>
        <div class="card" id="quickActions"><h3 class="mb-2">Quick Actions</h3>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${role === 'admin' ? `
              <button class="btn-primary" onclick="AuthModule.navigate('maintenance')">💰 Generate Bills</button>
              <button class="btn-outline" onclick="AuthModule.navigate('notices')">📢 New Notice</button>
              <button class="btn-outline" onclick="AuthModule.navigate('complaints')">📝 View Complaints</button>
              <button class="btn-outline" onclick="AuthModule.navigate('staff')">🧑‍🔧 Manage Staff</button>
              <button class="btn-outline" onclick="AuthModule.navigate('documents')">📁 Documents</button>
            ` : role === 'resident' ? `
              <button class="btn-primary" onclick="AuthModule.navigate('maintenance')">💰 Pay Maintenance</button>
              <button class="btn-outline" onclick="AuthModule.navigate('complaints')">📝 Raise Complaint</button>
              <button class="btn-outline" onclick="AuthModule.navigate('facilities')">🏋️ Book Facility</button>
              <button class="btn-outline" onclick="AuthModule.navigate('documents')">📁 Documents</button>
            ` : role === 'security' ? `
              <button class="btn-primary" onclick="AuthModule.navigate('security')">🔒 Manage Visitors</button>
            ` : `
              <button class="btn-primary" onclick="AuthModule.navigate('complaints')">📝 View Assigned</button>
            `}
          </div>
        </div>
      </div>`;

    renderStats(stats, role);
    loadRecentActivity(el, role);
  }

  function renderStats(stats, role) {
    const container = document.getElementById('statCards');
    let cards = [];
    if (role === 'admin') {
      cards = [
        { icon: '👥', value: stats.residents || 0, label: 'Total Residents' },
        { icon: '🧑‍🔧', value: stats.staff || 0, label: 'Staff Members' },
        { icon: '💰', value: stats.bills || 0, label: 'Pending Bills' },
        { icon: '📝', value: stats.complaints || 0, label: 'Open Complaints' },
        { icon: '🔒', value: stats.visitors || 0, label: 'Pending Visitors' },
        { icon: '📁', value: stats.documents || 0, label: 'Documents' },
      ];
    } else if (role === 'resident') {
      cards = [
        { icon: '💰', value: `₹${stats.dues || 0}`, label: 'Total Dues' },
        { icon: '📝', value: stats.myBills || 0, label: 'Pending Bills' },
        { icon: '📋', value: stats.myComplaints || 0, label: 'Open Complaints' },
        { icon: '🏋️', value: stats.myBookings || 0, label: 'Active Bookings' },
      ];
    } else {
      cards = [
        { icon: '🔒', value: stats.pendingVisitors || 0, label: 'Pending Visitors' },
      ];
    }
    container.innerHTML = cards.map(c => `
      <div class="stat-card text-center">
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>`).join('');
  }

  async function loadRecentActivity(el, role) {
    const container = document.getElementById('recentActivity');
    try {
      const client = supabaseClient.getClient();
      let html = '';
      if (role === 'admin') {
        const { data: complaints } = await client.from('complaints').select('*, profiles!complaints_resident_id_fkey(full_name)').order('created_at', { ascending: false }).limit(5);
        html = (complaints || []).map(c => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;">
            <strong>${c.profiles?.full_name || 'Unknown'}</strong> reported <span class="badge badge-info">${c.category}</span>
            <span style="float:right;font-size:12px;color:var(--text-secondary)">${new Date(c.created_at).toLocaleDateString()}</span>
          </div>`).join('') || '<p style="color:var(--text-secondary)">No recent activity</p>';
      } else if (role === 'resident') {
        const { data: notices } = await client.from('announcements').select('*').order('created_at', { ascending: false }).limit(5);
        html = (notices || []).map(n => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;">
            <strong>${n.title}</strong>
            <span class="badge badge-${n.priority === 'urgent' ? 'danger' : 'info'}">${n.priority}</span>
            <span style="float:right;font-size:12px;color:var(--text-secondary)">${new Date(n.created_at).toLocaleDateString()}</span>
          </div>`).join('') || '<p style="color:var(--text-secondary)">No recent notices</p>';
      } else {
        const { data: visitors } = await client.from('visitors').select('*').order('created_at', { ascending: false }).limit(5);
        html = (visitors || []).map(v => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;">
            👤 ${v.name} - <span class="badge badge-${v.status === 'pending' ? 'warning' : 'success'}">${v.status}</span>
            <span style="float:right;font-size:12px;color:var(--text-secondary)">${new Date(v.created_at).toLocaleDateString()}</span>
          </div>`).join('') || '<p style="color:var(--text-secondary)">No recent visitors</p>';
      }
      container.innerHTML = html;
    } catch (e) { container.innerHTML = '<p style="color:var(--text-secondary)">Could not load activity</p>'; }
  }

  async function getDuesAmount(userId) {
    try {
      const { data } = await supabaseClient.getClient().from('maintenance_bills').select('amount, paid_amount').eq('resident_id', userId).neq('status', 'paid');
      return (data || []).reduce((sum, b) => sum + (b.amount - b.paid_amount), 0);
    } catch { return 0; }
  }

  return { render };
})();
