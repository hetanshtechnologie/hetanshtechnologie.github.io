const NoticesModule = (() => {
  async function render(el) {
    const user = AuthModule.currentUser;
    const isAdmin = user.profile?.role === 'admin';
    el.innerHTML = `
      ${isAdmin ? `<div class="flex-between mb-2"><button class="btn-primary" onclick="NoticesModule.showAddForm()">+ New Notice</button></div>` : ''}
      <div id="noticesList"></div>
      <div id="noticeModal" class="modal-overlay"></div>`;
    await loadNotices();
  }

  async function loadNotices() {
    const client = supabaseClient.getClient();
    const { data } = await client.from('announcements').select('*, profiles(full_name)').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    const container = document.getElementById('noticesList');
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>No notices yet</h3></div>';
      return;
    }
    container.innerHTML = data.map(n => {
      const priorityClass = n.priority === 'urgent' ? 'danger' : n.priority === 'high' ? 'warning' : 'info';
      return `<div class="card mb-2 ${n.is_pinned ? 'pinned' : ''}" style="${n.is_pinned ? 'border-left:4px solid var(--primary)' : ''}">
        <div class="flex-between">
          <div>
            <h3>${n.is_pinned ? '📌 ' : ''}${escHtml(n.title)}</h3>
            <span class="badge badge-${priorityClass}">${n.priority}</span>
            <span class="badge badge-secondary">${n.category}</span>
          </div>
          <span style="font-size:12px;color:var(--text-secondary)">${new Date(n.created_at).toLocaleDateString()}</span>
        </div>
        <p style="margin-top:8px;color:var(--text-secondary);white-space:pre-wrap;">${escHtml(n.content)}</p>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">Posted by ${n.profiles?.full_name || 'Admin'}</div>
      </div>`;
    }).join('');
  }

  function showAddForm() {
    const modal = document.getElementById('noticeModal');
    modal.innerHTML = `
      <div class="modal">
        <h2>New Notice</h2>
        <div class="form-group"><label>Title *</label><input id="nt_title" placeholder="Notice title"></div>
        <div class="form-group"><label>Content *</label><textarea id="nt_content" rows="5" placeholder="Write your notice here..."></textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><select id="nt_category"><option value="general">General</option><option value="maintenance">Maintenance</option><option value="emergency">Emergency</option><option value="event">Event</option><option value="notice">Notice</option></select></div>
          <div class="form-group"><label>Priority</label><select id="nt_priority"><option value="low">Low</option><option value="normal" selected>Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
        </div>
        <div class="form-group"><label><input type="checkbox" id="nt_pinned"> Pin this notice</label></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('noticeModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="NoticesModule.saveNotice()">Publish</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveNotice() {
    const title = document.getElementById('nt_title').value.trim();
    const content = document.getElementById('nt_content').value.trim();
    const category = document.getElementById('nt_category').value;
    const priority = document.getElementById('nt_priority').value;
    const isPinned = document.getElementById('nt_pinned').checked;
    if (!title || !content) { showToast('Title and content are required', 'error'); return; }
    try {
      const user = AuthModule.currentUser;
      await supabaseClient.getClient().from('announcements').insert({
        title, content, category, priority, is_pinned: isPinned, created_by: user.id
      });
      document.getElementById('noticeModal').classList.remove('active');
      showToast('Notice published', 'success');
      await loadNotices();
    } catch (e) { showToast(e.message, 'error'); }
  }

  return { render, showAddForm, saveNotice };
})();
