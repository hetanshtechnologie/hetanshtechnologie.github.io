const ComplaintsModule = (() => {
  async function render(el) {
    const user = AuthModule.currentUser;
    const role = user.profile?.role;

    el.innerHTML = `
      <div class="flex-between mb-2">
        <div>
          <button class="btn-primary" onclick="ComplaintsModule.showRaiseForm()">+ Raise Complaint</button>
        </div>
        <select id="complaintFilter" onchange="ComplaintsModule.loadComplaints()" style="max-width:150px;">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div class="card"><table><thead><tr>
        <th>ID</th><th>Category</th><th>Description</th><th>Priority</th><th>Status</th><th>Date</th>${role === 'admin' || role === 'staff' ? '<th>Assigned To</th><th>Actions</th>' : ''}
      </tr></thead><tbody id="complaintTableBody"></tbody></table></div>
      <div id="complaintModal" class="modal-overlay"></div>`;
    await loadComplaints();
  }

  async function loadComplaints() {
    const user = AuthModule.currentUser;
    const role = user.profile?.role;
    const client = supabaseClient.getClient();
    const tbody = document.getElementById('complaintTableBody');
    const filter = document.getElementById('complaintFilter')?.value;

    let query = client.from('complaints').select('*, profiles!complaints_resident_id_fkey(full_name, flat_number), assigned:profiles!complaints_assigned_to_fkey(full_name)');
    if (role === 'resident') query = query.eq('resident_id', user.id);
    if (role === 'staff') query = query.eq('assigned_to', user.id);
    if (filter) query = query.eq('status', filter);
    query = query.order('created_at', { ascending: false }).limit(30);
    const { data } = await query;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:32px;color:var(--text-secondary)">No complaints found</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(c => {
      const priorityClass = c.priority === 'urgent' ? 'danger' : c.priority === 'high' ? 'warning' : 'info';
      const statusClass = c.status === 'resolved' || c.status === 'closed' ? 'success' : c.status === 'open' ? 'warning' : 'info';
      return `<tr>
        <td>#${c.id.slice(0, 8)}</td>
        <td><span class="badge badge-secondary">${c.category}</span></td>
        <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(c.description)}</td>
        <td><span class="badge badge-${priorityClass}">${c.priority}</span></td>
        <td><span class="badge badge-${statusClass}">${c.status}</span></td>
        <td style="font-size:12px;">${new Date(c.created_at).toLocaleDateString()}</td>
        ${role === 'admin' || role === 'staff' ? `
          <td>${c.assigned?.full_name || 'Unassigned'}</td>
          <td>
            <button class="btn-outline btn-sm" onclick="ComplaintsModule.showEdit('${c.id}', '${c.status}', '${c.assigned_to || ''}')">Manage</button>
          </td>` : ''}
      </tr>`;
    }).join('');
  }

  function showRaiseForm() {
    const modal = document.getElementById('complaintModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <h2>Raise a Complaint</h2>
        <div class="form-group"><label>Category *</label>
          <select id="comp_category">
            <option value="plumbing">🔧 Plumbing</option>
            <option value="electrical">⚡ Electrical</option>
            <option value="cleaning">🧹 Cleaning</option>
            <option value="painting">🎨 Painting</option>
            <option value="pest_control">🐜 Pest Control</option>
            <option value="structural">🏗️ Structural</option>
            <option value="other">📌 Other</option>
          </select>
        </div>
        <div class="form-group"><label>Description *</label><textarea id="comp_desc" rows="4" placeholder="Describe the issue in detail..."></textarea></div>
        <div class="form-group"><label>Priority</label>
          <select id="comp_priority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('complaintModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="ComplaintsModule.saveComplaint()">Submit</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveComplaint() {
    const category = document.getElementById('comp_category').value;
    const description = document.getElementById('comp_desc').value.trim();
    const priority = document.getElementById('comp_priority').value;
    if (!description) { showToast('Description is required', 'error'); return; }
    try {
      const user = AuthModule.currentUser;
      await supabaseClient.getClient().from('complaints').insert({ resident_id: user.id, category, description, priority });
      document.getElementById('complaintModal').classList.remove('active');
      showToast('Complaint submitted', 'success');
      await loadComplaints();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function showEdit(id, currentStatus, assignedTo) {
    const { data: staff } = await supabaseClient.getClient().from('profiles').select('user_id, full_name').eq('role', 'staff');
    const modal = document.getElementById('complaintModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:450px;">
        <h2>Manage Complaint #${id.slice(0, 8)}</h2>
        <div class="form-group"><label>Status</label>
          <select id="comp_status">
            <option value="open" ${currentStatus === 'open' ? 'selected' : ''}>Open</option>
            <option value="assigned" ${currentStatus === 'assigned' ? 'selected' : ''}>Assigned</option>
            <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="resolved" ${currentStatus === 'resolved' ? 'selected' : ''}>Resolved</option>
            <option value="closed" ${currentStatus === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <div class="form-group"><label>Assign To</label>
          <select id="comp_assign">
            <option value="">Unassigned</option>
            ${(staff || []).map(s => `<option value="${s.user_id}" ${s.user_id === assignedTo ? 'selected' : ''}>${s.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Resolution Notes</label><textarea id="comp_notes" rows="3"></textarea></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('complaintModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="ComplaintsModule.updateComplaint('${id}')">Update</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function updateComplaint(id) {
    const status = document.getElementById('comp_status').value;
    const assignedTo = document.getElementById('comp_assign').value || null;
    const notes = document.getElementById('comp_notes').value.trim();
    const update = { status, assigned_to: assignedTo, updated_at: new Date().toISOString() };
    if (notes) update.resolution_notes = notes;
    if (status === 'resolved' || status === 'closed') update.resolved_at = new Date().toISOString();
    try {
      await supabaseClient.getClient().from('complaints').update(update).eq('id', id);
      document.getElementById('complaintModal').classList.remove('active');
      showToast('Complaint updated', 'success');
      await loadComplaints();
    } catch (e) { showToast(e.message, 'error'); }
  }

  return { render, showRaiseForm, saveComplaint, showEdit, updateComplaint, loadComplaints };
})();
