const SecurityModule = (() => {
  async function render(el) {
    const user = AuthModule.currentUser;
    const role = user.profile?.role;
    const isSecurity = role === 'security' || role === 'admin';

    el.innerHTML = `
      <div class="tabs">
        <div class="tab active" data-tab="visitors" onclick="SecurityModule.switchTab('visitors')">👤 Visitors</div>
        <div class="tab" data-tab="parking" onclick="SecurityModule.switchTab('parking')">🅿️ Parking</div>
        <div class="tab" data-tab="emergency" onclick="SecurityModule.switchTab('emergency')">📞 Emergency</div>
      </div>
      <div id="securityContent"></div>
      <div id="securityModal" class="modal-overlay"></div>`;
    await showVisitors();
  }

  function switchTab(tab) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tabs .tab[data-tab="${tab}"]`).classList.add('active');
    if (tab === 'visitors') showVisitors();
    else if (tab === 'parking') showParking();
    else if (tab === 'emergency') showEmergency();
  }

  async function showVisitors() {
    const user = AuthModule.currentUser;
    const role = user.profile?.role;
    const isSecurity = role === 'security' || role === 'admin';
    const container = document.getElementById('securityContent');
    container.innerHTML = `
      ${isSecurity ? `<div class="flex-between mb-2"><button class="btn-primary" onclick="SecurityModule.showAddVisitor()">+ Register Visitor</button></div>` : ''}
      <div class="card"><table><thead><tr>
        <th>Name</th><th>Phone</th><th>Vehicle</th><th>Flat</th><th>Status</th><th>Time</th>${isSecurity ? '<th>Actions</th>' : ''}
      </tr></thead><tbody id="visitorTableBody"></tbody></table></div>`;
    await loadVisitors();
  }

  async function loadVisitors() {
    const user = AuthModule.currentUser;
    const role = user.profile?.role;
    const isSecurity = role === 'security' || role === 'admin';
    const client = supabaseClient.getClient();
    const tbody = document.getElementById('visitorTableBody');

    let query = client.from('visitors').select('*, profiles!visitors_host_id_fkey(full_name, flat_number)').order('created_at', { ascending: false }).limit(30);
    if (role === 'resident') query = query.eq('host_id', user.id);
    const { data } = await query;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:32px;color:var(--text-secondary)">No visitors</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(v => {
      const statusClass = v.status === 'approved' || v.status === 'checked_in' ? 'success' : v.status === 'rejected' ? 'danger' : 'warning';
      return `<tr>
        <td><strong>${escHtml(v.name)}</strong></td>
        <td>${escHtml(v.phone)}</td>
        <td>${escHtml(v.vehicle_number || '-')}</td>
        <td>${v.profiles?.flat_number || '-'}</td>
        <td><span class="badge badge-${statusClass}">${v.status}</span></td>
        <td style="font-size:12px;">${new Date(v.created_at).toLocaleString()}</td>
        ${isSecurity ? `<td>
          ${v.status === 'pending' ? `<button class="btn-success btn-sm" onclick="SecurityModule.approveVisitor('${v.id}')">✅ Approve</button> <button class="btn-danger btn-sm" onclick="SecurityModule.rejectVisitor('${v.id}')">❌ Reject</button>` : ''}
          ${v.status === 'approved' ? `<button class="btn-primary btn-sm" onclick="SecurityModule.checkIn('${v.id}')">Check In</button>` : ''}
          ${v.status === 'checked_in' ? `<button class="btn-warning btn-sm" onclick="SecurityModule.checkOut('${v.id}')">Check Out</button>` : ''}
        </td>` : ''}
      </tr>`;
    }).join('');
  }

  function showAddVisitor() {
    const modal = document.getElementById('securityModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:450px;">
        <h2>Register Visitor</h2>
        <div class="form-row">
          <div class="form-group"><label>Name *</label><input id="vis_name" placeholder="Visitor name"></div>
          <div class="form-group"><label>Phone *</label><input id="vis_phone" placeholder="Phone number"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Vehicle</label><input id="vis_vehicle" placeholder="Vehicle number"></div>
          <div class="form-group"><label>Host Flat</label><input id="vis_flat" placeholder="e.g. A-101"></div>
        </div>
        <div class="form-group"><label>Purpose</label><textarea id="vis_purpose" rows="2" placeholder="Visit purpose"></textarea></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('securityModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="SecurityModule.saveVisitor()">Register</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveVisitor() {
    const name = document.getElementById('vis_name').value.trim();
    const phone = document.getElementById('vis_phone').value.trim();
    const vehicle = document.getElementById('vis_vehicle').value.trim();
    const flat = document.getElementById('vis_flat').value.trim();
    const purpose = document.getElementById('vis_purpose').value.trim();
    if (!name || !phone) { showToast('Name and phone required', 'error'); return; }
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      let hostId = null;
      if (flat) {
        const { data: profiles } = await supabaseClient.getClient().from('profiles').select('user_id').eq('flat_number', flat).limit(1);
        if (profiles && profiles.length > 0) hostId = profiles[0].user_id;
      }
      await supabaseClient.getClient().from('visitors').insert({
        name, phone, vehicle_number: vehicle, purpose,
        flat_id: null, host_id: hostId, otp,
        otp_expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
        status: 'pending'
      });
      document.getElementById('securityModal').classList.remove('active');
      showToast(`Visitor registered. OTP: ${otp}`, 'success');
      await loadVisitors();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function approveVisitor(id) {
    const user = AuthModule.currentUser;
    await supabaseClient.getClient().from('visitors').update({ status: 'approved', approved_by: user.id }).eq('id', id);
    showToast('Visitor approved', 'success');
    await loadVisitors();
  }

  async function rejectVisitor(id) {
    await supabaseClient.getClient().from('visitors').update({ status: 'rejected' }).eq('id', id);
    showToast('Visitor rejected', 'info');
    await loadVisitors();
  }

  async function checkIn(id) {
    await supabaseClient.getClient().from('visitors').update({ status: 'checked_in', check_in_at: new Date().toISOString() }).eq('id', id);
    showToast('Visitor checked in', 'success');
    await loadVisitors();
  }

  async function checkOut(id) {
    await supabaseClient.getClient().from('visitors').update({ status: 'checked_out', check_out_at: new Date().toISOString() }).eq('id', id);
    showToast('Visitor checked out', 'success');
    await loadVisitors();
  }

  async function showParking() {
    const container = document.getElementById('securityContent');
    const { data: slots } = await supabaseClient.getClient().from('parking_slots').select('*').order('slot_number');
    const { data: assignments } = await supabaseClient.getClient().from('parking_assignments').select('*, profiles!parking_assignments_resident_id_fkey(full_name, flat_number), parking_slots!parking_assignments_slot_id_fkey(slot_number)').eq('is_active', true);

    container.innerHTML = `
      <div class="flex-between mb-2">
        <h3>Parking Slots</h3>
        <button class="btn-primary" onclick="SecurityModule.showAssignParking()">+ Assign Slot</button>
      </div>
      <div class="grid grid-4" id="parkingGrid">
        ${(slots || []).map(s => {
          const assign = (assignments || []).find(a => a.slot_id === s.id);
          return `<div class="card text-center" style="${s.is_occupied ? 'border-left:4px solid var(--danger);' : 'border-left:4px solid var(--success);'}">
            <div style="font-size:24px;margin-bottom:4px;">${s.type === 'bike' ? '🛵' : '🚗'}</div>
            <h4>${s.slot_number}</h4>
            <div style="font-size:12px;color:var(--text-secondary);">${s.wing || 'Main'}</div>
            <div style="margin-top:8px;">
              ${assign ? `<span style="font-size:12px;">${assign.profiles?.full_name || 'Assigned'}<br>${assign.vehicle_number}</span>` : '<span class="badge badge-success">Available</span>'}
            </div>
          </div>`;
        }).join('') || '<p>No parking slots configured</p>'}
      </div>`;
  }

  async function showAssignParking() {
    const { data: slots } = await supabaseClient.getClient().from('parking_slots').select('*').eq('is_occupied', false);
    const { data: residents } = await supabaseClient.getClient().from('profiles').select('user_id, full_name, flat_number').neq('role', 'admin');
    const modal = document.getElementById('securityModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:450px;">
        <h2>Assign Parking Slot</h2>
        <div class="form-group"><label>Slot</label><select id="pk_slot">${(slots || []).map(s => `<option value="${s.id}">${s.slot_number} (${s.type})</option>`).join('') || '<option>No free slots</option>'}</select></div>
        <div class="form-group"><label>Resident</label><select id="pk_resident">${(residents || []).map(r => `<option value="${r.user_id}">${r.full_name} - ${r.flat_number || ''}</option>`).join('')}</select></div>
        <div class="form-group"><label>Vehicle Number</label><input id="pk_vehicle" placeholder="MH-01-AB-1234"></div>
        <div class="form-group"><label>Vehicle Model</label><input id="pk_model" placeholder="Honda City"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('securityModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="SecurityModule.saveParkingAssign()">Assign</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveParkingAssign() {
    const slotId = document.getElementById('pk_slot').value;
    const residentId = document.getElementById('pk_resident').value;
    const vehicle = document.getElementById('pk_vehicle').value.trim();
    if (!vehicle) { showToast('Vehicle number required', 'error'); return; }
    try {
      const client = supabaseClient.getClient();
      await client.from('parking_assignments').insert({ slot_id: slotId, resident_id: residentId, vehicle_number: vehicle, vehicle_model: document.getElementById('pk_model').value.trim() });
      await client.from('parking_slots').update({ is_occupied: true }).eq('id', slotId);
      document.getElementById('securityModal').classList.remove('active');
      showToast('Parking assigned', 'success');
      await showParking();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function showEmergency() {
    const container = document.getElementById('securityContent');
    const { data } = await supabaseClient.getClient().from('emergency_contacts').select('*').eq('is_visible', true).order('name');
    container.innerHTML = `
      <div class="flex-between mb-2">
        <h3>Emergency Contacts</h3>
        <button class="btn-primary" onclick="SecurityModule.showAddEmergency()">+ Add Contact</button>
      </div>
      <div class="grid grid-3">
        ${(data || []).map(c => `
          <div class="card" style="border-left:4px solid var(--danger);">
            <h4>${escHtml(c.name)}</h4>
            <p style="font-size:13px;color:var(--text-secondary);">${escHtml(c.designation || '')} ${c.department ? '• ' + escHtml(c.department) : ''}</p>
            <p style="margin-top:8px;"><strong>📞 ${escHtml(c.phone)}</strong></p>
            ${c.alternate_phone ? `<p style="font-size:13px;">Alt: ${escHtml(c.alternate_phone)}</p>` : ''}
            ${c.email ? `<p style="font-size:13px;">✉️ ${escHtml(c.email)}</p>` : ''}
          </div>`).join('') || '<div class="empty-state" style="grid-column:1/-1;"><h3>No emergency contacts</h3></div>'}
      </div>`;
  }

  function showAddEmergency() {
    const modal = document.getElementById('securityModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:450px;">
        <h2>Add Emergency Contact</h2>
        <div class="form-row">
          <div class="form-group"><label>Name *</label><input id="ec_name"></div>
          <div class="form-group"><label>Phone *</label><input id="ec_phone"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Designation</label><input id="ec_designation"></div>
          <div class="form-group"><label>Department</label><input id="ec_department"></div>
        </div>
        <div class="form-group"><label>Alternate Phone</label><input id="ec_alt_phone"></div>
        <div class="form-group"><label>Email</label><input id="ec_email"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('securityModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="SecurityModule.saveEmergency()">Add</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveEmergency() {
    const data = {
      name: document.getElementById('ec_name').value.trim(),
      phone: document.getElementById('ec_phone').value.trim(),
      designation: document.getElementById('ec_designation').value.trim(),
      department: document.getElementById('ec_department').value.trim(),
      alternate_phone: document.getElementById('ec_alt_phone').value.trim(),
      email: document.getElementById('ec_email').value.trim(),
    };
    if (!data.name || !data.phone) { showToast('Name and phone required', 'error'); return; }
    try {
      await supabaseClient.getClient().from('emergency_contacts').insert(data);
      document.getElementById('securityModal').classList.remove('active');
      showToast('Contact added', 'success');
      await showEmergency();
    } catch (e) { showToast(e.message, 'error'); }
  }

  return { render, switchTab, showAddVisitor, saveVisitor, approveVisitor, rejectVisitor, checkIn, checkOut, showAssignParking, saveParkingAssign, showAddEmergency, saveEmergency };
})();
