const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';

const _sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function getCurrentUser() {
  const { data: { user }, error } = await _sb.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function signUp(email, password, username, fullName) {
  const { data, error } = await _sb.auth.signUp({
    email,
    password,
    options: { data: { username, full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await _sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (window.sitengSetUser) window.sitengSetUser(data.user?.email, data.user?.id);
  return data;
}

async function signInWithGoogle() {
  const { data, error } = await _sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname.replace(/login\.html.*/, 'index.html') }
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await _sb.auth.signOut();
  if (error) throw error;
  if (window.sitengSetUser) window.sitengSetUser(null);
}

function onAuthChange(callback) {
  _sb.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user || null);
  });
}

async function getTopics() {
  const { data, error } = await _sb
    .from('blog_topics')
    .select('*, blog_articles(count)')
    .order('name');
  if (error) throw error;
  return data;
}

async function getTopicBySlug(slug) {
  const { data, error } = await _sb
    .from('blog_topics')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

async function createTopic(name, description, slug) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in to create a topic.');
  const { data, error } = await _sb
    .from('blog_topics')
    .insert({ name, description, slug, created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getRecentArticles(limit = 10) {
  const { data, error } = await _sb
    .from('blog_articles')
    .select('*, blog_topics(name, slug), blog_profiles!created_by(username, full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

async function getArticlesByTopic(topicSlug) {
  const { data, error } = await _sb
    .from('blog_articles')
    .select('*, blog_topics!inner(name, slug), blog_profiles!created_by(username, full_name)')
    .eq('blog_topics.slug', topicSlug)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function getArticleBySlug(slug) {
  const { data, error } = await _sb
    .from('blog_articles')
    .select('*, blog_topics(name, slug), blog_profiles!created_by(username, full_name)')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

async function createArticle(topicId, title, slug, content, featuredImage) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in to create an article.');
  const { data, error } = await _sb
    .from('blog_articles')
    .insert({
      topic_id: topicId, title, slug, content,
      featured_image: featuredImage || null,
      created_by: user.id
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getReplies(articleId) {
  const { data, error } = await _sb
    .from('blog_replies')
    .select('*, blog_profiles!created_by(username, full_name)')
    .eq('article_id', articleId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

function buildReplyTree(replies) {
  const map = {};
  const roots = [];
  replies.forEach(r => {
    const reply = { ...r, children: [] };
    map[r.id] = reply;
    if (!r.parent_id) {
      roots.push(reply);
    } else {
      if (map[r.parent_id]) {
        map[r.parent_id].children.push(reply);
      } else {
        roots.push(reply);
      }
    }
  });
  return roots;
}

function renderReplyTree(replies, articleId, currentUser) {
  const tree = buildReplyTree(replies);
  return tree.map(r => renderReplyNode(r, articleId, currentUser)).join('');
}

function renderReplyNode(reply, articleId, currentUser, depth = 0) {
  const childrenHtml = reply.children
    .map(c => renderReplyNode(c, articleId, currentUser, depth + 1))
    .join('');
  const displayName = reply.blog_profiles?.username || reply.created_by?.substring(0, 8) || 'Anonymous';
  const avatar = displayName[0].toUpperCase();
  const replyForm = currentUser
    ? `<div class="reply-form" style="display:none" data-parent="${reply.id}">
        <textarea placeholder="Write your reply..." class="reply-textarea"></textarea>
        <button class="btn btn-primary btn-sm reply-submit" style="margin-top:6px">Reply</button>
        <button class="btn btn-secondary btn-sm reply-cancel" style="margin-top:6px;margin-left:4px">Cancel</button>
      </div>`
    : '';
  return `
    <div class="reply ${depth > 0 ? 'reply-nested' : ''}">
      <div class="reply-header">
        <span class="user-badge"><span class="avatar">${avatar}</span> <strong>${displayName}</strong></span>
        <span>${new Date(reply.created_at).toLocaleDateString()}</span>
      </div>
      <div class="reply-content">${escapeHtml(reply.content)}</div>
      <div class="reply-actions">
        ${currentUser ? `<button class="reply-toggle" data-parent="${reply.id}">Reply</button>` : ''}
      </div>
      ${replyForm}
      ${childrenHtml}
    </div>`;
}

async function createReply(articleId, content, parentId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in to reply.');
  const payload = { article_id: articleId, content, created_by: user.id };
  if (parentId) payload.parent_id = parentId;
  const { data, error } = await _sb
    .from('blog_replies')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getProfile(userId) {
  const { data, error } = await _sb
    .from('blog_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function showAlert(containerId, message, type = 'info') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
  setTimeout(() => { container.innerHTML = ''; }, 5000);
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const sec = Math.floor((now - date) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

const ADMIN_EMAIL = 'hetanshtechnologie@gmail.com';

async function isAdmin() {
  const user = await getCurrentUser();
  return user && user.email === ADMIN_EMAIL;
}

async function updateArticle(id, fields) {
  const { error } = await _sb.from('blog_articles').update(fields).eq('id', id);
  if (error) throw error;
}

async function deleteArticle(id) {
  const { error } = await _sb.from('blog_articles').delete().eq('id', id);
  if (error) throw error;
}

async function updateTopic(id, fields) {
  const { error } = await _sb.from('blog_topics').update(fields).eq('id', id);
  if (error) throw error;
}

async function deleteTopic(id) {
  const { error } = await _sb.from('blog_topics').delete().eq('id', id);
  if (error) throw error;
}
