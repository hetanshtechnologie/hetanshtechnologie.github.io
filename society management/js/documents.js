const DocumentsModule = (() => {
  const CATEGORIES = {
    meeting_minutes: '📋 Meeting Minutes',
    legal: '⚖️ Legal',
    financial: '💰 Financial',
    policy: '📜 Policy',
    notice: '📢 Notice',
    other: '📄 Other'
  };

  async function render(el) {
    const user = AuthModule.currentUser;
    const isAdmin = user.profile?.role === 'admin' || user.profile?.role === 'super_admin';
    el.innerHTML = `
      <div class="flex-between mb-2">
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" id="docSearch" placeholder="Search documents..." style="max-width:280px;" oninput="DocumentsModule.search()">
          <select id="docCategory" onchange="DocumentsModule.search()" style="max-width:200px;">
            <option value="">All Categories</option>
            ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        ${isAdmin ? '<button class="btn-primary" onclick="DocumentsModule.showUpload()">+ Upload Document</button>' : ''}
      </div>
      <div id="docGrid" class="grid grid-3"></div>
      <div id="docModal" class="modal-overlay"></div>`;
    await loadDocuments();
  }

  async function loadDocuments(search, category) {
    const client = supabaseClient.getClient();
    let query = client.from('documents').select('*, profiles!documents_uploaded_by_fkey(full_name)').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    if (search) query = query.ilike('title', `%${search}%`);
    if (category) query = query.eq('category', category);
    const { data } = await query;
    const grid = document.getElementById('docGrid');
    if (!data || data.length === 0) {
      grid.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-secondary);">📄 No documents yet</div>';
      return;
    }
    grid.innerHTML = data.map(d => {
      const cat = CATEGORIES[d.category] || '📄 Other';
      const size = d.file_size ? (d.file_size / 1024).toFixed(0) + ' KB' : '';
      return `
        <div class="card" style="cursor:pointer;transition:all .15s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <span class="badge badge-info" style="font-size:11px;">${cat}</span>
            ${d.is_pinned ? '<span style="color:#f59e0b;">📌</span>' : ''}
          </div>
          <h4 style="margin-bottom:4px;font-size:15px;">${escHtml(d.title)}</h4>
          ${d.description ? `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escHtml(d.description)}</p>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-secondary);border-top:1px solid var(--border);padding-top:8px;margin-top:auto;">
            <span>${escHtml(d.profiles?.full_name || 'Unknown')}</span>
            <span>${size} · ${formatDate(d.created_at)}</span>
          </div>
          <div style="display:flex;gap:4px;margin-top:8px;">
            <a href="${d.file_url}" target="_blank" class="btn-outline btn-sm" style="flex:1;text-align:center;text-decoration:none;">📥 View</a>
            ${AuthModule.currentUser.profile?.role === 'admin' ? `<button class="btn-outline btn-sm" onclick="DocumentsModule.deleteDoc('${d.id}')" style="color:var(--danger);">🗑️</button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  function showUpload() {
    const modal = document.getElementById('docModal');
    modal.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <h2>📄 Upload Document</h2>
        <div class="form-group"><label>Title *</label><input type="text" id="doc_title" placeholder="Document title"></div>
        <div class="form-group"><label>Description</label><textarea id="doc_desc" rows="2" placeholder="Brief description"></textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Category *</label>
            <select id="doc_category">
              ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Pin to top</label>
            <select id="doc_pinned"><option value="false">No</option><option value="true">Yes</option></select>
          </div>
        </div>
        <div class="form-group"><label>File URL *</label><input type="url" id="doc_url" placeholder="https://... (Google Drive, Dropbox, direct link)"></div>
        <p style="font-size:12px;color:var(--text-secondary);margin-top:-8px;">Paste a link to the document (Google Drive, Dropbox, or direct file URL)</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('docModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="DocumentsModule.saveDocument()">Upload</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveDocument() {
    const title = document.getElementById('doc_title').value.trim();
    const description = document.getElementById('doc_desc').value.trim();
    const category = document.getElementById('doc_category').value;
    const file_url = document.getElementById('doc_url').value.trim();
    const is_pinned = document.getElementById('doc_pinned').value === 'true';
    if (!title || !file_url) { showToast('Title and File URL are required', 'error'); return; }
    const fileName = file_url.split('/').pop().split('?')[0] || 'document';
    try {
      const client = supabaseClient.getClient();
      const { error } = await client.from('documents').insert({
        title, description, category, file_url, file_name: fileName,
        uploaded_by: AuthModule.currentUser.id, is_pinned
      });
      if (error) throw error;
      document.getElementById('docModal').classList.remove('active');
      showToast('Document uploaded successfully', 'success');
      await loadDocuments();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function deleteDoc(id) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const client = supabaseClient.getClient();
      const { error } = await client.from('documents').delete().eq('id', id);
      if (error) throw error;
      showToast('Document deleted', 'success');
      await loadDocuments();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function search() {
    const q = document.getElementById('docSearch')?.value;
    const cat = document.getElementById('docCategory')?.value;
    loadDocuments(q, cat);
  }

  return { render, loadDocuments, showUpload, saveDocument, deleteDoc, search };
})();
