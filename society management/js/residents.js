const ResidentsModule = (() => {
  async function render(el) {
    const user = AuthModule.currentUser;
    if (user.profile?.role !== 'admin') {
      el.innerHTML = '<div class="card"><h3>My Profile</h3>' + await renderProfile(user) + '</div>';
      return;
    }
    el.innerHTML = `
      <div class="flex-between mb-2">
        <input type="text" id="residentSearch" placeholder="Search residents..." style="max-width:300px;" oninput="ResidentsModule.search()">
        <button class="btn-primary" onclick="ResidentsModule.showAddForm()">+ Add Resident</button>
      </div>
      <div class="card"><table><thead><tr><th>Name</th><th>Flat</th><th>Type</th><th>Phone</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody id="residentTableBody"></tbody></table></div>
      <div id="residentModal" class="modal-overlay"></div>`;
    await loadResidents();
  }

  async function loadResidents(search) {
    const client = supabaseClient.getClient();
    let query = client.from('profiles').select('*').neq('role', 'admin').order('full_name');
    if (search) query = query.ilike('full_name', `%${search}%`);
    const { data } = await query;
    const tbody = document.getElementById('residentTableBody');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-secondary)">No residents found</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(r => `
      <tr>
        <td><strong>${escHtml(r.full_name)}</strong></td>
        <td>${escHtml(r.flat_number || '-')}</td>
        <td><span class="badge badge-${r.ownership === 'owner' ? 'info' : 'warning'}">${r.ownership || 'owner'}</span></td>
        <td>${escHtml(r.phone || '-')}</td>
        <td>${escHtml(r.email || '-')}</td>
        <td><span class="badge badge-secondary">${r.role}</span></td>
        <td>
          <button class="btn-outline btn-sm" onclick="ResidentsModule.showEditForm('${r.id}')">✏️</button>
          <button class="btn-outline btn-sm" onclick="ResidentsModule.deleteResident('${r.id}', '${escHtml(r.full_name)}')" style="margin-left:4px;color:var(--danger);">🗑️</button>
        </td>
      </tr>`).join('');
  }

  function showAddForm() { showForm(null); }
  function showEditForm(id) { showForm(id); }

  async function showForm(id) {
    const client = supabaseClient.getClient();
    let resident = { full_name: '', email: '', phone: '', flat_number: '', wing: '', ownership: 'owner', role: 'resident', occupation: '', alternate_phone: '', is_active: true };
    if (id) {
      const { data } = await client.from('profiles').select('*').eq('id', id).single();
      if (data) resident = data;
    }
    const modal = document.getElementById('residentModal');
    modal.innerHTML = `
      <div class="modal">
        <h2>${id ? 'Edit Resident' : 'Add Resident'}</h2>
        <div class="form-row">
          <div class="form-group"><label>Full Name *</label><input type="text" id="rf_name" value="${escHtml(resident.full_name)}"></div>
          <div class="form-group"><label>Email *</label><input type="email" id="rf_email" value="${escHtml(resident.email || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input type="text" id="rf_phone" value="${escHtml(resident.phone || '')}"></div>
          <div class="form-group"><label>Alternate Phone</label><input type="text" id="rf_alt_phone" value="${escHtml(resident.alternate_phone || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Flat Number *</label><input type="text" id="rf_flat" value="${escHtml(resident.flat_number || '')}"></div>
          <div class="form-group"><label>Wing</label><input type="text" id="rf_wing" value="${escHtml(resident.wing || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Ownership</label><select id="rf_ownership"><option value="owner" ${resident.ownership === 'owner' ? 'selected' : ''}>Owner</option><option value="tenant" ${resident.ownership === 'tenant' ? 'selected' : ''}>Tenant</option></select></div>
          <div class="form-group"><label>Role</label><select id="rf_role"><option value="resident" ${resident.role === 'resident' ? 'selected' : ''}>Resident</option><option value="staff" ${resident.role === 'staff' ? 'selected' : ''}>Staff</option><option value="security" ${resident.role === 'security' ? 'selected' : ''}>Security</option><option value="admin" ${resident.role === 'admin' ? 'selected' : ''}>Admin</option></select></div>
        </div>
        <div class="form-group"><label>Occupation</label><input type="text" id="rf_occupation" value="${escHtml(resident.occupation || '')}"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('residentModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="ResidentsModule.saveResident('${id || ''}')">${id ? 'Update' : 'Add'} Resident</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveResident(id) {
    const data = {
      full_name: document.getElementById('rf_name').value.trim(),
      email: document.getElementById('rf_email').value.trim(),
      phone: document.getElementById('rf_phone').value.trim(),
      alternate_phone: document.getElementById('rf_alt_phone').value.trim(),
      flat_number: document.getElementById('rf_flat').value.trim(),
      wing: document.getElementById('rf_wing').value.trim(),
      ownership: document.getElementById('rf_ownership').value,
      role: document.getElementById('rf_role').value,
      occupation: document.getElementById('rf_occupation').value.trim(),
    };
    if (!data.full_name || !data.flat_number) { showToast('Name and Flat are required', 'error'); return; }
    try {
      const client = supabaseClient.getClient();
      if (id) {
        await client.from('profiles').update(data).eq('id', id);
      } else {
        const { error } = await client.auth.admin.createUser({ email: data.email, password: 'society123', email_confirm: true, user_metadata: data });
        if (error) throw error;
      }
      document.getElementById('residentModal').classList.remove('active');
      await loadResidents();
      showToast(`Resident ${id ? 'updated' : 'added'} successfully`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function renderProfile(user) {
    const p = user.profile;
    return `
      <div class="form-row mt-2">
        <div class="form-group"><label>Full Name</label><input value="${escHtml(p.full_name)}" disabled></div>
        <div class="form-group"><label>Flat Number</label><input value="${escHtml(p.flat_number || '-')}" disabled></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input value="${escHtml(p.email || '-')}" disabled></div>
        <div class="form-group"><label>Phone</label><input value="${escHtml(p.phone || '-')}" disabled></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Ownership</label><input value="${p.ownership || 'Owner'}" disabled></div>
        <div class="form-group"><label>Role</label><input value="${p.role}" disabled></div>
      </div>`;
  }

  async function deleteResident(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also remove their auth account.`)) return;
    try {
      const client = supabaseClient.getClient();
      await client.from('profiles').delete().eq('id', id);
      try { await client.auth.admin.deleteUser(id); } catch (e) { /* auth user may not exist */ }
      showToast('Resident deleted', 'success');
      await loadResidents();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function search() {
    const q = document.getElementById('residentSearch')?.value;
    loadResidents(q);
  }

  return { render, showAddForm, showEditForm, saveResident, deleteResident, search };
})();
