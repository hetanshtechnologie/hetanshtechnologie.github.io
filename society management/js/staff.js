const StaffModule = (() => {
  let activeTab = 'roster';

  async function render(el) {
    el.innerHTML = `
      <div class="flex-between mb-2">
        <div style="display:flex;gap:4px;">
          <button class="btn-outline ${activeTab === 'roster' ? 'active' : ''}" onclick="StaffModule.switchTab('roster')">👥 Roster</button>
          <button class="btn-outline ${activeTab === 'attendance' ? 'active' : ''}" onclick="StaffModule.switchTab('attendance')">✅ Attendance</button>
          <button class="btn-outline ${activeTab === 'shifts' ? 'active' : ''}" onclick="StaffModule.switchTab('shifts')">🕐 Shifts</button>
          <button class="btn-outline ${activeTab === 'duties' ? 'active' : ''}" onclick="StaffModule.switchTab('duties')">📋 Duties</button>
        </div>
        <button class="btn-primary" onclick="StaffModule.showAddStaff()">+ Add Staff</button>
      </div>
      <div id="staffContent"></div>
      <div id="staffModal" class="modal-overlay"></div>`;
    await renderTab();
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.btn-outline').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderTab();
  }

  async function renderTab() {
    const el = document.getElementById('staffContent');
    if (!el) return;
    el.innerHTML = '<div class="spinner"></div>';
    switch (activeTab) {
      case 'roster': await renderRoster(el); break;
      case 'attendance': await renderAttendance(el); break;
      case 'shifts': await renderShifts(el); break;
      case 'duties': await renderDuties(el); break;
    }
  }

  // ─── ROSTER ───
  async function renderRoster(el) {
    const client = supabaseClient.getClient();
    const { data } = await client.from('profiles').select('*').in('role', ['staff', 'security']).order('full_name');
    if (!data || data.length === 0) {
      el.innerHTML = '<div class="card" style="text-align:center;padding:32px;color:var(--text-secondary);">👥 No staff members yet</div>';
      return;
    }
    el.innerHTML = `<div class="card"><table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Flat</th><th>Status</th><th>Actions</th></tr></thead><tbody>${
      data.map(s => `<tr>
        <td><strong>${escHtml(s.full_name)}</strong></td>
        <td><span class="badge badge-${s.role === 'security' ? 'warning' : 'info'}">${s.role}</span></td>
        <td>${escHtml(s.phone || '-')}</td>
        <td>${escHtml(s.email || '-')}</td>
        <td>${escHtml(s.flat_number || '-')}</td>
        <td><span class="badge badge-${s.is_active ? 'success' : 'danger'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-outline btn-sm" onclick="StaffModule.showEditStaff('${s.user_id}')">✏️</button>
          <button class="btn-outline btn-sm" onclick="StaffModule.toggleActive('${s.user_id}', ${!s.is_active})" style="margin-left:4px;">${s.is_active ? '🔴' : '🟢'}</button>
        </td>
      </tr>`).join('')
    }</tbody></table></div>`;
  }

  function showAddStaff() { showStaffForm(null); }
  function showEditStaff(id) { showStaffForm(id); }

  async function showStaffForm(id) {
    const client = supabaseClient.getClient();
    let staff = { full_name: '', email: '', phone: '', flat_number: '', role: 'staff', is_active: true };
    if (id) {
      const { data } = await client.from('profiles').select('*').eq('user_id', id).single();
      if (data) staff = data;
    }
    const modal = document.getElementById('staffModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;">
        <h2>${id ? 'Edit Staff' : 'Add Staff'}</h2>
        <div class="form-group"><label>Full Name *</label><input type="text" id="sf_name" value="${escHtml(staff.full_name)}"></div>
        ${!id ? '<div class="form-group"><label>Email *</label><input type="email" id="sf_email" value="' + escHtml(staff.email || '') + '"></div>' : ''}
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input type="text" id="sf_phone" value="${escHtml(staff.phone || '')}"></div>
          <div class="form-group"><label>Flat / Location</label><input type="text" id="sf_flat" value="${escHtml(staff.flat_number || '')}"></div>
        </div>
        <div class="form-group"><label>Role</label>
          <select id="sf_role">
            <option value="staff" ${staff.role === 'staff' ? 'selected' : ''}>Staff</option>
            <option value="security" ${staff.role === 'security' ? 'selected' : ''}>Security</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('staffModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="StaffModule.saveStaff('${id || ''}')">${id ? 'Update' : 'Add'} Staff</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveStaff(id) {
    const data = {
      full_name: document.getElementById('sf_name').value.trim(),
      phone: document.getElementById('sf_phone').value.trim(),
      flat_number: document.getElementById('sf_flat').value.trim(),
      role: document.getElementById('sf_role').value,
    };
    if (!data.full_name) { showToast('Name is required', 'error'); return; }
    try {
      const client = supabaseClient.getClient();
      if (id) {
        await client.from('profiles').update(data).eq('user_id', id);
      } else {
        const email = document.getElementById('sf_email').value.trim();
        if (!email) { showToast('Email is required', 'error'); return; }
        const { error } = await client.auth.admin.createUser({ email, password: 'staff123', email_confirm: true, user_metadata: { ...data, email } });
        if (error) throw error;
      }
      document.getElementById('staffModal').classList.remove('active');
      showToast(`Staff ${id ? 'updated' : 'added'} successfully`, 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function toggleActive(id, active) {
    try {
      const client = supabaseClient.getClient();
      await client.from('profiles').update({ is_active: active }).eq('user_id', id);
      showToast(active ? 'Staff activated' : 'Staff deactivated', 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ─── ATTENDANCE ───
  async function renderAttendance(el) {
    const today = new Date().toISOString().slice(0, 10);
    const client = supabaseClient.getClient();
    const { data: staff } = await client.from('profiles').select('*').in('role', ['staff', 'security']).eq('is_active', true).order('full_name');
    const { data: attendance } = await client.from('staff_attendance').select('*').eq('attendance_date', today);

    const attMap = {};
    (attendance || []).forEach(a => { attMap[a.staff_id] = a; });

    el.innerHTML = `
      <div class="card">
        <div class="flex-between mb-2">
          <h3>📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
          <button class="btn-primary" onclick="StaffModule.markAllPresent()">✅ Mark All Present</button>
        </div>
        <table><thead><tr><th>Staff</th><th>Role</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Actions</th></tr></thead><tbody>${
          (!staff || staff.length === 0) ? '<tr><td colspan="6" class="text-center" style="padding:24px;color:var(--text-secondary)">No staff members</td></tr>' :
          staff.map(s => {
            const att = attMap[s.user_id];
            const status = att?.status || 'absent';
            const colors = { present: 'success', absent: 'danger', half_day: 'warning', leave: 'info', holiday: 'secondary' };
            return `<tr>
              <td><strong>${escHtml(s.full_name)}</strong></td>
              <td><span class="badge badge-secondary">${s.role}</span></td>
              <td><span class="badge badge-${colors[status]}">${status}</span></td>
              <td>${att?.check_in ? new Date(att.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              <td>${att?.check_out ? new Date(att.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
              <td style="display:flex;gap:4px;">
                ${!att ? `<button class="btn-outline btn-sm" onclick="StaffModule.markAttendance('${s.user_id}', 'present')">✅</button>
                <button class="btn-outline btn-sm" onclick="StaffModule.markAttendance('${s.user_id}', 'absent')">❌</button>
                <button class="btn-outline btn-sm" onclick="StaffModule.markAttendance('${s.user_id}', 'leave')">🏖️</button>` :
                `<button class="btn-outline btn-sm" onclick="StaffModule.checkOut('${s.user_id}')">🚪 Check Out</button>`}
              </td>
            </tr>`;
          }).join('')
        }</tbody></table>
      </div>`;
  }

  async function markAttendance(staffId, status) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const client = supabaseClient.getClient();
      const { error } = await client.from('staff_attendance').upsert({
        staff_id: staffId, attendance_date: today, status,
        check_in: status === 'present' ? new Date().toISOString() : null
      }, { onConflict: 'staff_id,attendance_date' });
      if (error) throw error;
      showToast('Attendance marked', 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function markAllPresent() {
    const client = supabaseClient.getClient();
    const { data: staff } = await client.from('profiles').select('user_id').in('role', ['staff', 'security']).eq('is_active', true);
    if (!staff || staff.length === 0) { showToast('No staff found', 'error'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const rows = staff.map(s => ({ staff_id: s.user_id, attendance_date: today, status: 'present', check_in: now }));
    try {
      const { error } = await client.from('staff_attendance').upsert(rows, { onConflict: 'staff_id,attendance_date' });
      if (error) throw error;
      showToast(`Marked ${staff.length} staff as present`, 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function checkOut(staffId) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const client = supabaseClient.getClient();
      await client.from('staff_attendance').update({ check_out: new Date().toISOString() }).eq('staff_id', staffId).eq('attendance_date', today);
      showToast('Checked out', 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ─── SHIFTS ───
  async function renderShifts(el) {
    const client = supabaseClient.getClient();
    const today = new Date().toISOString().slice(0, 10);
    const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { data: staff } = await client.from('profiles').select('*').in('role', ['staff', 'security']).eq('is_active', true).order('full_name');
    const { data: shifts } = await client.from('staff_shifts').select('*, profiles!staff_shifts_staff_id_fkey(full_name)').gte('shift_date', today).lte('shift_date', weekLater).order('shift_date');

    const shiftsByDate = {};
    (shifts || []).forEach(s => {
      if (!shiftsByDate[s.shift_date]) shiftsByDate[s.shift_date] = [];
      shiftsByDate[s.shift_date].push(s);
    });

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
      dates.push(d);
    }

    el.innerHTML = `
      <div class="flex-between mb-2">
        <h3>📅 Weekly Shifts</h3>
        <button class="btn-primary" onclick="StaffModule.showAddShift()">+ Assign Shift</button>
      </div>
      ${dates.map(d => {
        const dayShifts = shiftsByDate[d] || [];
        const label = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `
          <div class="card mb-2">
            <h4 style="margin-bottom:8px;">${label} ${d === today ? '(Today)' : ''}</h4>
            ${dayShifts.length === 0 ? '<p style="color:var(--text-secondary);font-size:14px;">No shifts assigned</p>' :
              `<div style="display:flex;flex-wrap:wrap;gap:8px;">${dayShifts.map(s => {
                const icons = { morning: '🌅', afternoon: '☀️', night: '🌙', full_day: '📅' };
                return `<div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;">
                  <strong>${escHtml(s.profiles?.full_name || '-')}</strong>
                  <span class="badge badge-info" style="margin-left:4px;">${icons[s.shift_type] || ''} ${s.shift_type}</span>
                  <span style="color:var(--text-secondary);margin-left:4px;">${s.start_time?.slice(0,5)} - ${s.end_time?.slice(0,5)}</span>
                </div>`;
              }).join('')}</div>`}
          </div>`;
      }).join('')}`;
  }

  function showAddShift() {
    const modal = document.getElementById('staffModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;">
        <h2>🕐 Assign Shift</h2>
        <div class="form-group"><label>Staff Member *</label><select id="shift_staff"><option value="">Select staff...</option></select></div>
        <div class="form-row">
          <div class="form-group"><label>Date *</label><input type="date" id="shift_date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label>Shift Type *</label>
            <select id="shift_type"><option value="morning">Morning (6AM-2PM)</option><option value="afternoon">Afternoon (2PM-10PM)</option><option value="night">Night (10PM-6AM)</option><option value="full_day">Full Day</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start Time</label><input type="time" id="shift_start" value="06:00"></div>
          <div class="form-group"><label>End Time</label><input type="time" id="shift_end" value="14:00"></div>
        </div>
        <div class="form-group"><label>Notes</label><input type="text" id="shift_notes" placeholder="Optional notes"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('staffModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="StaffModule.saveShift()">Assign Shift</button>
        </div>
      </div>`;
    modal.classList.add('active');
    loadStaffDropdown('shift_staff');
    document.getElementById('shift_type').addEventListener('change', function() {
      const times = { morning: ['06:00','14:00'], afternoon: ['14:00','22:00'], night: ['22:00','06:00'], full_day: ['06:00','22:00'] };
      const t = times[this.value];
      if (t) { document.getElementById('shift_start').value = t[0]; document.getElementById('shift_end').value = t[1]; }
    });
  }

  async function saveShift() {
    const staff_id = document.getElementById('shift_staff').value;
    const shift_date = document.getElementById('shift_date').value;
    const shift_type = document.getElementById('shift_type').value;
    const start_time = document.getElementById('shift_start').value;
    const end_time = document.getElementById('shift_end').value;
    const notes = document.getElementById('shift_notes').value.trim();
    if (!staff_id || !shift_date) { showToast('Staff and date are required', 'error'); return; }
    try {
      const client = supabaseClient.getClient();
      const { error } = await client.from('staff_shifts').insert({ staff_id, shift_date, shift_type, start_time, end_time, notes });
      if (error) throw error;
      document.getElementById('staffModal').classList.remove('active');
      showToast('Shift assigned', 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ─── DUTIES ───
  async function renderDuties(el) {
    const client = supabaseClient.getClient();
    const { data: duties } = await client.from('staff_duties').select('*, profiles!staff_duties_staff_id_fkey(full_name)').order('created_at', { ascending: false }).limit(50);
    const { data: staff } = await client.from('profiles').select('*').in('role', ['staff', 'security']).eq('is_active', true).order('full_name');

    el.innerHTML = `
      <div class="flex-between mb-2">
        <div style="display:flex;gap:8px;">
          <select id="dutyFilter" onchange="StaffModule.filterDuties()" style="max-width:180px;">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button class="btn-primary" onclick="StaffModule.showAddDuty()">+ Assign Duty</button>
      </div>
      <div class="card"><table><thead><tr><th>Task</th><th>Assigned To</th><th>Priority</th><th>Status</th><th>Due Date</th><th>Actions</th></tr></thead><tbody id="dutyTableBody">${
        (!duties || duties.length === 0) ? '<tr><td colspan="6" class="text-center" style="padding:32px;color:var(--text-secondary)">No duties assigned yet</td></tr>' :
        duties.map(d => {
          const pc = { low: 'secondary', medium: 'info', high: 'danger' };
          const sc = { pending: 'warning', in_progress: 'info', completed: 'success' };
          return `<tr>
            <td><strong>${escHtml(d.title)}</strong>${d.description ? '<br><span style="font-size:12px;color:var(--text-secondary);">' + escHtml(d.description) + '</span>' : ''}</td>
            <td>${escHtml(d.profiles?.full_name || '-')}</td>
            <td><span class="badge badge-${pc[d.priority]}">${d.priority}</span></td>
            <td><span class="badge badge-${sc[d.status]}">${d.status.replace('_', ' ')}</span></td>
            <td>${d.due_date ? formatDate(d.due_date) : '-'}</td>
            <td>
              ${d.status !== 'completed' ? `<button class="btn-outline btn-sm" onclick="StaffModule.updateDutyStatus('${d.id}', '${d.status === 'pending' ? 'in_progress' : 'completed'}')">${d.status === 'pending' ? '▶️ Start' : '✅ Done'}</button>` : '<span style="color:var(--success);">✅</span>'}
            </td>
          </tr>`;
        }).join('')
      }</tbody></table></div>`;
  }

  function showAddDuty() {
    const modal = document.getElementById('staffModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:480px;">
        <h2>📋 Assign Duty</h2>
        <div class="form-group"><label>Title *</label><input type="text" id="duty_title" placeholder="Task title"></div>
        <div class="form-group"><label>Description</label><textarea id="duty_desc" rows="2" placeholder="Task details"></textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Assign To *</label><select id="duty_staff"><option value="">Select staff...</option></select></div>
          <div class="form-group"><label>Priority</label>
            <select id="duty_priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>
          </div>
        </div>
        <div class="form-group"><label>Due Date</label><input type="date" id="duty_due"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('staffModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="StaffModule.saveDuty()">Assign Duty</button>
        </div>
      </div>`;
    modal.classList.add('active');
    loadStaffDropdown('duty_staff');
  }

  async function saveDuty() {
    const title = document.getElementById('duty_title').value.trim();
    const description = document.getElementById('duty_desc').value.trim();
    const staff_id = document.getElementById('duty_staff').value;
    const priority = document.getElementById('duty_priority').value;
    const due_date = document.getElementById('duty_due').value || null;
    if (!title || !staff_id) { showToast('Title and staff are required', 'error'); return; }
    try {
      const client = supabaseClient.getClient();
      const { error } = await client.from('staff_duties').insert({
        title, description, staff_id, priority, due_date,
        created_by: AuthModule.currentUser.id
      });
      if (error) throw error;
      document.getElementById('staffModal').classList.remove('active');
      showToast('Duty assigned', 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function updateDutyStatus(id, status) {
    try {
      const client = supabaseClient.getClient();
      const update = { status };
      if (status === 'completed') update.completed_at = new Date().toISOString();
      await client.from('staff_duties').update(update).eq('id', id);
      showToast('Duty updated', 'success');
      await renderTab();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function filterDuties() {
    renderTab();
  }

  // ─── HELPERS ───
  async function loadStaffDropdown(selectId) {
    const client = supabaseClient.getClient();
    const { data } = await client.from('profiles').select('user_id, full_name, role').in('role', ['staff', 'security']).eq('is_active', true).order('full_name');
    const select = document.getElementById(selectId);
    if (select && data) {
      select.innerHTML = '<option value="">Select staff...</option>' +
        data.map(s => `<option value="${s.user_id}">${escHtml(s.full_name)} (${s.role})</option>`).join('');
    }
  }

  return { render, switchTab, showAddStaff, showEditStaff, saveStaff, toggleActive, markAttendance, markAllPresent, checkOut, showAddShift, saveShift, showAddDuty, saveDuty, updateDutyStatus, filterDuties };
})();
