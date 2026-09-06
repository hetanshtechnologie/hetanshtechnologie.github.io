const ForumModule = (() => {
  async function render(el) {
    el.innerHTML = `
      <div class="flex-between mb-2">
        <h3>Community Forum</h3>
        <button class="btn-primary" onclick="ForumModule.showNewTopic()">+ New Topic</button>
      </div>
      <div class="card"><div id="forumList"></div></div>
      <div id="forumModal" class="modal-overlay"></div>
      <div id="topicDetail" class="modal-overlay"></div>`;
    await loadTopics();
  }

  async function loadTopics() {
    const client = supabaseClient.getClient();
    const { data } = await client.from('forum_topics').select('*, profiles!forum_topics_created_by_fkey(full_name, flat_number), forum_comments(count)').order('created_at', { ascending: false });
    const container = document.getElementById('forumList');
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>No discussions yet</h3><p>Be the first to start a topic!</p></div>';
      return;
    }
    container.innerHTML = data.map(t => `
      <div class="forum-post" onclick="ForumModule.showTopic('${t.id}')" style="cursor:pointer;">
        <div class="flex-between">
          <h3>${escHtml(t.title)}</h3>
          <span class="badge badge-${t.is_closed ? 'secondary' : 'info'}">${t.is_closed ? 'Closed' : 'Open'}</span>
        </div>
        <p style="color:var(--text-secondary);margin-top:4px;">${escHtml(t.content.slice(0, 150))}${t.content.length > 150 ? '...' : ''}</p>
        <div class="meta mt-1">
          By <strong>${escHtml(t.profiles?.full_name || 'Unknown')}</strong> (${t.profiles?.flat_number || '-'}) •
          ${t.forum_comments?.length || 0} replies •
          ${new Date(t.created_at).toLocaleDateString()}
        </div>
      </div>`).join('');
  }

  function showNewTopic() {
    const modal = document.getElementById('forumModal');
    modal.innerHTML = `
      <div class="modal">
        <h2>New Discussion</h2>
        <div class="form-group"><label>Title *</label><input id="ft_title" placeholder="Topic title"></div>
        <div class="form-group"><label>Content *</label><textarea id="ft_content" rows="5" placeholder="What's on your mind?"></textarea></div>
        <div class="form-group"><label>Category</label><select id="ft_category"><option value="">General</option><option value="maintenance">Maintenance</option><option value="events">Events</option><option value="security">Security</option><option value="feedback">Feedback</option></select></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn-outline" onclick="document.getElementById('forumModal').classList.remove('active')">Cancel</button>
          <button class="btn-primary" onclick="ForumModule.saveTopic()">Post</button>
        </div>
      </div>`;
    modal.classList.add('active');
  }

  async function saveTopic() {
    const title = document.getElementById('ft_title').value.trim();
    const content = document.getElementById('ft_content').value.trim();
    const category = document.getElementById('ft_category').value;
    if (!title || !content) { showToast('Title and content required', 'error'); return; }
    try {
      const user = AuthModule.currentUser;
      await supabaseClient.getClient().from('forum_topics').insert({ title, content, category, created_by: user.id });
      document.getElementById('forumModal').classList.remove('active');
      showToast('Topic posted', 'success');
      await loadTopics();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function showTopic(topicId) {
    const client = supabaseClient.getClient();
    const { data: topic } = await client.from('forum_topics').select('*, profiles!forum_topics_created_by_fkey(full_name, flat_number)').eq('id', topicId).single();
    const { data: comments } = await client.from('forum_comments').select('*, profiles!forum_comments_created_by_fkey(full_name)').eq('topic_id', topicId).order('created_at');
    const user = AuthModule.currentUser;
    const modal = document.getElementById('topicDetail');
    modal.innerHTML = `
      <div class="modal" style="max-width:700px;">
        <div class="flex-between">
          <h2>${escHtml(topic.title)}</h2>
          <button class="btn-outline btn-sm" onclick="document.getElementById('topicDetail').classList.remove('active')">✕</button>
        </div>
        <p style="color:var(--text-secondary);margin:8px 0;">${escHtml(topic.content)}</p>
        <div class="meta" style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">
          By ${escHtml(topic.profiles?.full_name || 'Unknown')} • ${new Date(topic.created_at).toLocaleDateString()}
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin-bottom:16px;">
        <div id="topicComments" style="margin-bottom:16px;">
          ${(comments || []).map(c => `
            <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
              <strong style="font-size:13px;">${escHtml(c.profiles?.full_name || 'Unknown')}</strong>
              <p style="margin-top:4px;">${escHtml(c.content)}</p>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">${new Date(c.created_at).toLocaleString()}</div>
            </div>`).join('') || '<p style="color:var(--text-secondary);">No comments yet</p>'}
        </div>
        ${!topic.is_closed ? `
        <div style="display:flex;gap:8px;">
          <textarea id="newComment" rows="2" placeholder="Write a comment..." style="flex:1;"></textarea>
          <button class="btn-primary" onclick="ForumModule.addComment('${topicId}')" style="align-self:flex-end;">Post</button>
        </div>` : '<p style="color:var(--text-secondary);font-style:italic;">This topic is closed for comments.</p>'}
      </div>`;
    modal.classList.add('active');
  }

  async function addComment(topicId) {
    const content = document.getElementById('newComment').value.trim();
    if (!content) return;
    try {
      const user = AuthModule.currentUser;
      await supabaseClient.getClient().from('forum_comments').insert({ topic_id: topicId, content, created_by: user.id });
      document.getElementById('newComment').value = '';
      await showTopic(topicId);
    } catch (e) { showToast(e.message, 'error'); }
  }

  return { render, showNewTopic, saveTopic, showTopic, addComment };
})();
