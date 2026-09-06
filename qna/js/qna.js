let sb = null;
let currentUser = null;
let currentView = 'questions';
let catCache = [];
let tagCache = [];
let qPage = 1;
let qTotal = 0;
const Q_PAGE_SIZE = 25;

const EDGE_FUNCTION_URL = 'https://vgipghqejzbcoighktij.supabase.co/functions/v1';
const RAZORPAY_KEY_ID = 'rzp_live_T69SbFfk53qNmY';

let userPlan = null;
let planLimits = { max_categories: 5, max_questions: 25, max_tags: 5, max_jobs: 3 };

async function loadPlan() {
  if (!currentUser) return;
  const { data: up } = await sb.from('qna_user_plans').select('plan_id,status').eq('user_id', currentUser.id).maybeSingle();
  if (up && up.status === 'active') {
    const { data: p } = await sb.from('qna_plans').select('*').eq('id', up.plan_id).maybeSingle();
    if (p && p.active) {
      planLimits = { max_categories: p.max_categories, max_questions: p.max_questions, max_tags: p.max_tags, max_jobs: p.max_jobs };
      userPlan = p;
      return;
    }
  }
  userPlan = { id: 0, name: 'Free', max_categories: 5, max_questions: 25, max_tags: 5, max_jobs: 3, price: 0 };
  planLimits = { max_categories: 5, max_questions: 25, max_tags: 5, max_jobs: 3 };
}

async function checkLimit(type) {
  if (!currentUser) return true;
  let count;
  if (type === 'categories') {
    const { count: c } = await sb.from('qna_categories').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
    count = c;
    if (count < planLimits.max_categories) return true;
  } else if (type === 'questions') {
    const { count: c } = await sb.from('qna_questions').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
    count = c;
    if (count < planLimits.max_questions) return true;
  } else if (type === 'tags') {
    const { count: c } = await sb.from('qna_tags').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
    count = c;
    if (count < planLimits.max_tags) return true;
  } else if (type === 'jobs') {
    const { count: c } = await sb.from('qna_job_applications').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
    count = c;
    if (count < planLimits.max_jobs) return true;
  }
  await showUpsell(type, count);
  return false;
}

async function showUpsell(type, current) {
  const { data: plans } = await sb.from('qna_plans').select('*').eq('active', true).order('price');
  const limitKey = 'max_' + type;
  const labels = { categories: 'Categories', questions: 'Questions', tags: 'Tags', jobs: 'Job Applications' };
  let html = '<h3 style="margin-bottom:12px;">Plan Limit Reached</h3>';
  html += '<p style="font-size:14px;color:#666;margin-bottom:16px;">You\'ve used ' + current + ' of ' + planLimits[limitKey] + ' ' + labels[type] + ' on your current plan. Upgrade to continue adding.</p>';
  html += '<div style="display:flex;flex-direction:column;gap:12px;">';
  if (plans) {
    for (const p of plans) {
      if (p.price === 0) continue;
      const canUpgrade = p[limitKey] > planLimits[limitKey];
      html += '<div style="border:1px solid #e0e0e0;border-radius:8px;padding:14px;' + (canUpgrade ? 'cursor:pointer;' : 'opacity:0.5;') + '"' + (canUpgrade ? ' onclick="purchasePlan(' + p.id + ')"' : '') + '>';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<div><strong style="font-size:16px;">' + escHtml(p.name) + '</strong>';
      html += '<div style="font-size:12px;color:#666;margin-top:4px;">';
      const parts = [];
      if (p.max_categories >= 999999) parts.push('&#8734; Categories'); else parts.push(p.max_categories + ' Categories');
      if (p.max_questions >= 999999) parts.push('&#8734; Questions'); else parts.push(p.max_questions + ' Questions');
      if (p.max_tags >= 999999) parts.push('&#8734; Tags'); else parts.push(p.max_tags + ' Tags');
      if (p.max_jobs >= 999999) parts.push('&#8734; Jobs'); else parts.push(p.max_jobs + ' Jobs');
      html += parts.join(' &middot; ');
      html += '</div></div>';
      html += '<div style="font-size:18px;font-weight:700;color:#1a73e8;">&#8377;' + (p.price / 100).toFixed(2) + '</div>';
      html += '</div></div>';
    }
  }
  html += '</div>';
  html += '<div class="modal-actions" style="margin-top:16px;"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button></div>';
  showModal(html);
}

async function purchasePlan(planId) {
  closeModal();
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) return alert('Please login again');
  try {
    const res = await fetch(EDGE_FUNCTION_URL + '/qna-create-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ plan_id: planId })
    });
    if (!res.ok) {
      let msg = 'Failed to create order';
      try { const e = await res.json(); msg = e.details || e.error || msg; } catch (_) { try { msg = await res.text(); } catch (_2) {} }
      return alert(msg);
    }
    const order = await res.json();
    const rzp = new Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'Hetansh Technologie',
      description: order.plan_name + ' Plan',
      order_id: order.id,
      prefill: { name: order.user_name, email: order.user_email, contact: '919974031480' },
      theme: { color: '#2563eb' },
      handler: async function(response) {
        try {
          const vRes = await fetch(EDGE_FUNCTION_URL + '/qna-verify-purchase', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId
            })
          });
          if (!vRes.ok) {
            let msg = 'Verification failed';
            try { const e = await vRes.json(); msg = e.error || msg; } catch (_) { try { msg = await vRes.text(); } catch (_2) {} }
            return alert(msg);
          }
          const vData = await vRes.json();
          alert('Payment successful! ' + vData.plan_name + ' plan activated.');
          await loadPlan();
          location.reload();
        } catch (e) { alert('Verification error: ' + e.message); }
      },
      modal: { ondismiss: function() { } }
    });
    rzp.open();
  } catch (e) { alert('Payment failed: ' + e.message); }
}

// Auth
async function checkAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    currentUser = user;
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('user-email').textContent = user.email;
    await loadPlan();
    const badge = document.getElementById('plan-badge');
    if (badge && userPlan) badge.textContent = userPlan.name;
    await loadCatFilter();
    await loadCategories();
    await loadTags();
    // Default to Questions view
    document.querySelector('#panel-dashboard').classList.remove('active');
    document.querySelector('#panel-questions').classList.add('active');
    document.querySelector('[data-view="dashboard"]').classList.remove('active');
    document.querySelector('[data-view="questions"]').classList.add('active');
    currentView = 'questions';
  } else {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
}

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  if (!email || !password) { err.textContent = 'Please fill in all fields'; return; }
  err.textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login')) err.textContent = 'Invalid email or password';
    else err.textContent = error.message;
    return;
  }
  if (window.sitengSetUser) window.sitengSetUser(data.user?.email, data.user?.id);
  checkAuth();
});

document.getElementById('show-signup').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  if (!email || !password) { err.textContent = 'Enter email and password to sign up'; return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters'; return; }
  err.textContent = '';
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { emailRedirectTo: 'https://Hetansh Technologie .github.io/qna/index.html' }
  });
  if (error) { err.textContent = error.message; return; }
  err.textContent = 'Check your email for confirmation link!';
  err.style.color = '#188038';
});

document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-link').addEventListener('click', async () => {
  await sb.auth.signOut();
  if (window.sitengSetUser) window.sitengSetUser(null);
  currentUser = null;
  checkAuth();
});

async function socialLogin(provider) {
  await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
  });
}

// Navigation
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const view = el.dataset.view;
    currentView = view;
    document.getElementById('panel-' + view).classList.add('active');
    if (view === 'dashboard') loadDashboard();
    if (view === 'questions') { qPage = 1; document.getElementById('q-list').innerHTML = '<p style="color:#666;padding:16px;">Select a category and click Load to view questions.</p>'; document.getElementById('q-pagination').innerHTML = ''; }
    if (view === 'categories') loadCategories();
    if (view === 'tags') loadTags();
    if (view === 'jobs') loadJobs();
  });
});

// Dashboard
async function loadDashboard() {
  const { count: qCount } = await sb.from('qna_questions').select('*', { count: 'exact', head: true });
  const { count: aCount } = await sb.from('qna_answers').select('*', { count: 'exact', head: true });
  const { count: cCount } = await sb.from('qna_categories').select('*', { count: 'exact', head: true });
  const { count: jCount } = await sb.from('qna_job_applications').select('*', { count: 'exact', head: true });
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${qCount}</div><div class="stat-label">Questions</div></div>
    <div class="stat-card"><div class="stat-value">${aCount}</div><div class="stat-label">Answers</div></div>
    <div class="stat-card"><div class="stat-value">${cCount}</div><div class="stat-label">Categories</div></div>
    <div class="stat-card"><div class="stat-value">${jCount}</div><div class="stat-label">Applications</div></div>
  `;
  const { data: recent } = await sb.from('qna_questions').select('id,title,category_id,is_hidden,created_at').order('id', { ascending: false }).limit(10);
  if (!recent) return;
  document.getElementById('dash-recent').innerHTML = recent.map(q => {
    const cat = catCache.find(c => c.id === q.category_id);
    return `<div class="q-item"><span class="q-title">${escHtml(q.title)}</span><span class="q-meta">${cat ? escHtml(cat.name) : ''}</span></div>`;
  }).join('');
}

// Questions
function catOptionsHtml(cats, excludeId, includeAll, selectedId) {
  const children = {};
  cats.forEach(c => { const p = c.parent_id || 0; if (!children[p]) children[p] = []; children[p].push(c); });
  let html = includeAll ? '<option value="">All Categories</option>' : '';
  function walk(parentId, depth) {
    const items = (children[parentId] || []).sort((a, b) => a.order_index - b.order_index);
    for (const c of items) {
      if (c.id === excludeId) continue;
      html += `<option value="${c.id}"${c.id == selectedId ? ' selected' : ''}>${'&nbsp;'.repeat(depth * 4)}${escHtml(c.name)}</option>`;
      walk(c.id, depth + 1);
    }
  }
  walk(0, 0);
  return html;
}

async function loadCatFilter() {
  const { data } = await sb.from('qna_categories').select('id,name,parent_id,order_index').order('order_index');
  if (!data) return;
  catCache = data;
  const sel = document.getElementById('q-cat-filter');
  sel.innerHTML = catOptionsHtml(data, null, true);
  // Also rebuild cat tree
  buildCatTree();
  renderCatSearchDropdown();
}

// Searchable category dropdown
function catSearchItems() {
  const items = [];
  items.push({ id: '', name: 'All Categories', depth: 0 });
  const cats = catCache.slice();
  const children = {};
  cats.forEach(c => { const p = c.parent_id || 0; if (!children[p]) children[p] = []; children[p].push(c); });
  function walk(parentId, depth) {
    (children[parentId] || []).sort((a, b) => a.order_index - b.order_index).forEach(c => {
      items.push({ id: c.id, name: c.name, depth });
      walk(c.id, depth + 1);
    });
  }
  walk(0, 0);
  return items;
}

function renderCatSearchDropdown() {
  const dd = document.getElementById('q-cat-dropdown');
  if (!dd) return;
  const q = (document.getElementById('q-cat-search').value || '').trim().toLowerCase();
  const items = catSearchItems();
  const sel = document.getElementById('q-cat-filter');
  const selectedVal = sel.value;
  const matches = q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  if (!matches.length) {
    dd.innerHTML = '<div class="cat-search-empty">No matching categories</div>';
    return;
  }
  dd.innerHTML = matches.map(i =>
    `<div class="cat-search-item${String(i.id) === String(selectedVal) ? ' selected' : ''}" data-cid="${i.id}" onclick="selectCatSearch(${i.id || 'null'}, event)">${'&nbsp;'.repeat(i.depth * 4)}${escHtml(i.name)}</div>`
  ).join('');
}

function showCatSearch() {
  document.getElementById('q-cat-dropdown').classList.remove('hidden');
  renderCatSearchDropdown();
}

function hideCatSearch() {
  const dd = document.getElementById('q-cat-dropdown');
  if (dd) dd.classList.add('hidden');
}

function selectCatSearch(id, ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  const sel = document.getElementById('q-cat-filter');
  sel.value = id || '';
  const input = document.getElementById('q-cat-search');
  if (id) {
    const item = catSearchItems().find(i => String(i.id) === String(id));
    if (item) input.value = item.name;
  } else {
    input.value = '';
  }
  hideCatSearch();
  loadQuestions();
}

function onCatSearchKey(e) {
  if (e.key === 'Escape') { hideCatSearch(); e.target.blur(); return; }
  if (e.key === 'Enter') {
    const sel = document.getElementById('q-cat-dropdown').querySelector('.cat-search-item');
    if (sel) sel.click();
    return;
  }
}

document.addEventListener('click', function(e) {
  const wrap = document.querySelector('.cat-search-wrap');
  if (wrap && !wrap.contains(e.target)) hideCatSearch();
});

async function loadQuestions() {
  window._qChecked = {};
  updateQSelectBar();
  const search = document.getElementById('q-search').value.trim();
  const catId = document.getElementById('q-cat-filter').value;
  const hideFilter = document.getElementById('q-hide-filter').value;

  let query = sb.from('qna_questions').select('id,title,description,category_id,order_index,is_hidden,created_at', { count: 'exact' });
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  if (catId) query = query.eq('category_id', catId);
  if (hideFilter === 'visible') query = query.eq('is_hidden', false);
  if (hideFilter === 'hidden') query = query.eq('is_hidden', true);

  if (hideFilter === 'unread') {
    const { data: prefs } = await sb.from('qna_user_question_preferences').select('question_id,is_read').eq('is_read', false);
    const unreadIds = prefs ? prefs.map(p => p.question_id) : [];
    if (unreadIds.length) { query = query.in('id', unreadIds); }
    else {
      document.getElementById('q-list').innerHTML = '<p style="color:#666;padding:16px;">No unread questions.</p>';
      qTotal = 0; renderPagination(); return;
    }
  }

  const from = (qPage - 1) * Q_PAGE_SIZE;
  const to = from + Q_PAGE_SIZE - 1;
  const { data, count, error } = await query.order('order_index', { ascending: true }).range(from, to);
  if (error || !data) { document.getElementById('q-list').innerHTML = `<p style="color:#d93025;">Error loading questions</p>`; return; }
  qTotal = count;

  const { data: prefs } = await sb.from('qna_user_question_preferences').select('question_id,is_read');
  const prefMap = {};
  if (prefs) prefs.forEach(p => { prefMap[p.question_id] = p; });

  // Store page questions for reorder context
  window._qPageData = data;
  renderQuestionList(data, prefMap);
}

function renderQuestionList(questions, prefMap) {
  const container = document.getElementById('q-list');
  if (!questions.length) { container.innerHTML = '<p style="color:#666;padding:16px;">No questions found.</p>'; renderPagination(); return; }

  container.innerHTML = questions.map((q, i) => {
    const p = prefMap[q.id];
    const read = p && p.is_read;
    const cat = catCache.find(c => c.id === q.category_id);
    return `<div class="q-item ${read ? 'q-read' : ''}" data-qid="${q.id}" data-idx="${i}" onclick="toggleQDetail(${q.id}, this)">
      <span class="drag-handle" draggable="true" ondragstart="onDragStart(event)" ondragover="onDragOver(event)" ondrop="onDrop(event)" ondragend="onDragEnd(event)" title="Drag to reorder">⠿</span>
      <input type="checkbox" class="q-checkbox" data-qid="${q.id}" onclick="event.stopPropagation();onQCheckChange()" ${window._qChecked && window._qChecked[q.id] ? 'checked' : ''}>
      <span class="q-seq">${i + 1}.</span>
      <span class="q-title">${escHtml(q.title)}${read ? '<span class="read-badge">Read</span>' : ''}</span>
      <span class="q-meta">${cat ? escHtml(cat.name) : ''}${q.is_hidden ? ' <span style="color:#d93025;">Hidden</span>' : ''}</span>
      <span class="q-actions">
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();readAloudQuestion(${q.id})" title="Read aloud">&#128264;</button>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();toggleHide(${q.id})" title="${q.is_hidden ? 'Unhide' : 'Hide'}">&#128065;</button>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();showQModal(${q.id})">&#9998;</button>
        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteQuestion(${q.id})">&#10005;</button>
      </span>
    </div>
    <div class="q-detail hidden" id="qdetail-${q.id}"></div>`;
  }).join('');
  renderPagination();
  updateQSelectBar();
}

let _dragSrcId = null;

function onDragStart(e) {
  const handle = e.target.closest('.drag-handle');
  if (!handle) { e.preventDefault(); return; }
  const item = e.target.closest('.q-item');
  if (!item) { e.preventDefault(); return; }
  _dragSrcId = parseInt(item.dataset.qid);
  e.dataTransfer.effectAllowed = 'move';
  item.classList.add('dragging');
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const item = e.target.closest('.q-item');
  if (item) item.classList.add('drag-over');
}

function onDragEnd(e) {
  e.target.closest('.q-item').classList.remove('dragging');
  document.querySelectorAll('.q-item.drag-over').forEach(el => el.classList.remove('drag-over'));
  _dragSrcId = null;
}

async function onDrop(e) {
  e.preventDefault();
  const target = e.target.closest('.q-item');
  if (!target) return;
  target.classList.remove('drag-over');
  const targetId = parseInt(target.dataset.qid);
  if (!_dragSrcId || _dragSrcId === targetId) return;
  const data = window._qPageData;
  if (!data) return;
  const src = data.find(q => q.id === _dragSrcId);
  const dst = data.find(q => q.id === targetId);
  if (!src || !dst) return;
  const srcOrder = src.order_index;
  const dstOrder = dst.order_index;
  const { error: e1 } = await sb.from('qna_questions').update({ order_index: dstOrder }).eq('id', _dragSrcId);
  const { error: e2 } = await sb.from('qna_questions').update({ order_index: srcOrder }).eq('id', targetId);
  if (e1 || e2) return alert('Reorder failed: ' + ((e1 || e2).message));
  loadQuestions();
}

function renderPagination() {
  const totalPages = Math.ceil(qTotal / Q_PAGE_SIZE) || 1;
  let html = `<button ${qPage <= 1 ? 'disabled' : ''} onclick="qPage=${Math.max(1,qPage-1)};loadQuestions()">Prev</button>`;
  for (let i = Math.max(1, qPage - 2); i <= Math.min(totalPages, qPage + 2); i++) {
    html += `<button class="${i === qPage ? 'active' : ''}" onclick="qPage=${i};loadQuestions()">${i}</button>`;
  }
  html += `<button ${qPage >= totalPages ? 'disabled' : ''} onclick="qPage=${Math.min(totalPages,qPage+1)};loadQuestions()">Next</button>`;
  html += `<span style="margin-left:8px;font-size:13px;color:#999;">${(qPage-1)*Q_PAGE_SIZE+1}-${Math.min(qPage*Q_PAGE_SIZE,qTotal)} of ${qTotal}</span>`;
  document.getElementById('q-pagination').innerHTML = html;
}

async function toggleQDetail(questionId, el) {
  const detail = document.getElementById('qdetail-' + questionId);

  // If this detail is already visible, just hide it and return
  if (!detail.classList.contains('hidden')) {
    detail.classList.add('hidden');
    return;
  }

  // Close all other open details (only one open at a time)
  document.querySelectorAll('.q-detail:not(.hidden)').forEach(d => {
    d.classList.add('hidden');
  });

  // Mark as read when expanding
  if (currentUser) {
    await sb.from('qna_user_question_preferences').upsert({
      user_id: currentUser.id, question_id: questionId, is_read: true
    }, { onConflict: 'user_id,question_id' });
    el.classList.add('q-read');
    const titleSpan = el.querySelector('.q-title');
    if (titleSpan && !titleSpan.querySelector('.read-badge')) {
      titleSpan.innerHTML += ' <span class="read-badge">Read</span>';
    }
  }

  if (detail.dataset.loaded) { detail.classList.remove('hidden'); return; }
  detail.innerHTML = '<p style="color:#999;">Loading...</p>';
  detail.classList.remove('hidden');

  const { data: q } = await sb.from('qna_questions').select('*').eq('id', questionId).single();
  const { data: answers } = await sb.from('qna_answers').select('*').eq('question_id', questionId).order('id');
  const { data: p } = await sb.from('qna_user_question_preferences').select('*').eq('question_id', questionId).maybeSingle();

  detail.dataset.loaded = '1';
  let html = '';
  if (q && q.description) html += `<div class="q-desc">${escHtml(q.description)}</div>`;
  if (answers && answers.length) {
    html += answers.map(a => `<div class="answer-item">
      <div class="answer-content">${a.content_html}</div>
      <div class="answer-meta">${a.created_at ? 'Added ' + a.created_at.split(' ')[0] : ''}
        <button class="btn btn-sm btn-secondary" style="float:right" onclick="editAnswer(${a.id},${questionId})">Edit</button>
        <button class="btn btn-sm btn-danger" style="float:right" onclick="deleteAnswer(${a.id},${questionId})">Del</button>
      </div>
    </div>`).join('');
  } else {
    html += '<p style="color:#999;font-size:13px;">No answers yet.</p>';
  }
  html += `<button class="btn btn-sm btn-secondary" onclick="addAnswer(${questionId})">+ Add Answer</button>`;
  html += ` <button class="btn btn-sm btn-secondary" onclick="readAloudQuestion(${questionId})">&#128264; Read Aloud</button>`;
  if (p) html += `<span style="margin-left:8px;font-size:12px;color:#999;">${p.is_read ? 'Read' : 'Unread'}</span>`;
  detail.innerHTML = html;
}

async function toggleRead(questionId, markRead) {
  await sb.from('qna_user_question_preferences').upsert({
    user_id: currentUser.id, question_id: questionId, is_read: markRead
  }, { onConflict: 'user_id,question_id' });
  loadQuestions();
}

async function toggleHide(questionId) {
  const { data: q } = await sb.from('qna_questions').select('is_hidden').eq('id', questionId).single();
  if (!q) return;
  await sb.from('qna_questions').update({ is_hidden: !q.is_hidden }).eq('id', questionId);
  loadQuestions();
}

// Question CRUD Modal
async function showQModal(id) {
  let q = { title: '', description: '', category_id: '', order_index: 0, is_hidden: false, tag_ids: [] };
  if (id) {
    const { data } = await sb.from('qna_questions').select('*').eq('id', id).single();
    if (data) q = data;
    const { data: qt } = await sb.from('qna_question_tags').select('tag_id').eq('question_id', id);
    if (qt) q.tag_ids = qt.map(t => t.tag_id);
  }
  const cats = await loadAllCategories();
  const html = `<h3>${id ? 'Edit' : 'New'} Question</h3>
    <label>Title</label><input id="mq-title" value="${escHtml(q.title)}">
    <label>Description</label><textarea id="mq-desc">${escHtml(q.description)}</textarea>
    <label>Category</label><select id="mq-cat">${catOptionsHtml(cats, null, false, q.category_id)}</select>
    <label>Order Index</label><input id="mq-order" type="number" value="${q.order_index || 0}">
    <label><input type="checkbox" id="mq-hidden" ${q.is_hidden ? 'checked' : ''}> Hidden</label>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveQuestion(${id || 'null'})">Save</button>
    </div>`;
  showModal(html);
}

async function saveQuestion(id) {
  const data = {
    title: document.getElementById('mq-title').value,
    description: document.getElementById('mq-desc').value,
    category_id: parseInt(document.getElementById('mq-cat').value),
    order_index: parseInt(document.getElementById('mq-order').value) || 0,
    is_hidden: document.getElementById('mq-hidden').checked,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  if (!data.title) return alert('Title is required');
  if (!id && !(await checkLimit('questions'))) return;
  if (id) {
    const { error } = await sb.from('qna_questions').update(data).eq('id', id);
    if (error) return alert('Error: ' + error.message);
  } else {
    const { error } = await sb.from('qna_questions').insert({ ...data, user_id: currentUser.id });
    if (error) return alert('Error: ' + error.message);
  }
  closeModal();
  loadQuestions();
}

async function deleteQuestion(id) {
  if (!confirm('Delete this question and all its answers?')) return;
  await sb.from('qna_answers').delete().eq('question_id', id);
  await sb.from('qna_question_tags').delete().eq('question_id', id);
  await sb.from('qna_user_question_preferences').delete().eq('question_id', id);
  await sb.from('qna_questions').delete().eq('id', id);
  loadQuestions();
}

// Answer CRUD
async function addAnswer(questionId) {
  const html = `<h3>Add Answer</h3>
    <label>Content (HTML)</label><textarea id="ma-content" style="min-height:150px;"></textarea>
    <p style="font-size:12px;color:#999;">You can use HTML tags like &lt;p&gt;, &lt;pre&gt;&lt;code&gt;, &lt;strong&gt;, etc.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAnswer(${questionId},null)">Save</button>
    </div>`;
  showModal(html);
}

async function editAnswer(answerId, questionId) {
  const { data: a } = await sb.from('qna_answers').select('*').eq('id', answerId).single();
  if (!a) return;
  const html = `<h3>Edit Answer</h3>
    <label>Content (HTML)</label><textarea id="ma-content" style="min-height:150px;">${escHtml(a.content_html)}</textarea>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAnswer(${questionId},${answerId})">Save</button>
    </div>`;
  showModal(html);
}

async function saveAnswer(questionId, answerId) {
  const content = document.getElementById('ma-content').value;
  if (!content) return alert('Content is required');
  const data = {
    content_html: content,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  if (answerId) {
    const { error } = await sb.from('qna_answers').update(data).eq('id', answerId);
    if (error) return alert('Error: ' + error.message);
  } else {
    const { error } = await sb.from('qna_answers').insert({ ...data, question_id: questionId, user_id: currentUser.id });
    if (error) return alert('Error: ' + error.message);
  }
  closeModal();
  const el = document.getElementById('qdetail-' + questionId);
  if (el) { delete el.dataset.loaded; toggleQDetail(questionId, el.previousElementSibling); }
}

async function deleteAnswer(answerId, questionId) {
  if (!confirm('Delete this answer?')) return;
  await sb.from('qna_answers').delete().eq('id', answerId);
  const el = document.getElementById('qdetail-' + questionId);
  if (el) { delete el.dataset.loaded; toggleQDetail(questionId, el.previousElementSibling); }
}

// Categories
async function loadAllCategories() {
  const { data } = await sb.from('qna_categories').select('*').order('order_index');
  return data || [];
}

function buildCatTree() {
  const container = document.getElementById('cat-tree');
  if (!container) return;
  const cats = catCache;
  const children = {};
  cats.forEach(c => {
    const p = c.parent_id || 0;
    if (!children[p]) children[p] = [];
    children[p].push(c);
  });
  container.innerHTML = renderCatChildren(children, 0, 0);
}

function renderCatChildren(children, parentId, depth) {
  const items = children[parentId] || [];
  if (!items.length) return '';
  let html = '<div class="cat-children">';
  items.sort((a, b) => a.order_index - b.order_index);
  for (const c of items) {
    const qCount = catCache._qCounts ? (catCache._qCounts[c.id] || 0) : '';
    html += `<div class="cat-item" data-cid="${c.id}">
      <input type="checkbox" class="cat-checkbox" data-cid="${c.id}" onclick="onCatCheckChange()" ${window._catChecked && window._catChecked[c.id] ? 'checked' : ''}>
      <span class="cat-name" onclick="showCatQuestions(${c.id})">${escHtml(c.name)}</span>
      <span class="cat-count">${qCount ? qCount + ' Q' : ''}</span>
      <button class="btn btn-sm btn-secondary" onclick="showCatModal(${c.id})">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteCategory(${c.id})">Del</button>
    </div>`;
    html += renderCatChildren(children, c.id, depth + 1);
  }
  html += '</div>';
  return html;
}

async function showCatQuestions(catId) {
  document.getElementById('q-cat-filter').value = catId;
  const item = catSearchItems().find(i => String(i.id) === String(catId));
  const input = document.getElementById('q-cat-search');
  if (input) input.value = item ? item.name : '';
  document.querySelector('[data-view="questions"]').click();
}

async function showCatModal(id) {
  let cat = { name: '', parent_id: 0, order_index: 0 };
  if (id) {
    const { data } = await sb.from('qna_categories').select('*').eq('id', id).single();
    if (data) cat = data;
  }
  const cats = await loadAllCategories();
  const catOpts = `<option value="0">None (root)</option>` + catOptionsHtml(cats.filter(c => c.id !== id), id, false, cat.parent_id);
  const html = `<h3>${id ? 'Edit' : 'New'} Category</h3>
    <label>Name</label><input id="mc-name" value="${escHtml(cat.name)}">
    <label>Parent Category</label><select id="mc-parent">${catOpts}</select>
    <label>Order Index</label><input id="mc-order" type="number" value="${cat.order_index || 0}">
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveCategory(${id || 'null'})">Save</button>
    </div>`;
  showModal(html);
}

async function saveCategory(id) {
  const data = {
    name: document.getElementById('mc-name').value,
    parent_id: parseInt(document.getElementById('mc-parent').value) || null,
    order_index: parseInt(document.getElementById('mc-order').value) || 0
  };
  if (!data.name) return alert('Name is required');
  if (data.parent_id === 0) data.parent_id = null;
  if (!id && !(await checkLimit('categories'))) return;
  if (id) {
    const { error } = await sb.from('qna_categories').update(data).eq('id', id);
    if (error) return alert('Error: ' + error.message);
  } else {
    const { error } = await sb.from('qna_categories').insert({ ...data, user_id: currentUser.id });
    if (error) return alert('Error: ' + error.message);
  }
  closeModal();
  await loadCatFilter();
  loadCategories();
}

async function loadCategories() {
  window._catChecked = {};
  updateCatSelectBar();
  catCache = await loadAllCategories();
  // Get question counts
  const { data: counts } = await sb.from('qna_questions').select('category_id');
  const qCounts = {};
  if (counts) counts.forEach(q => { qCounts[q.category_id] = (qCounts[q.category_id] || 0) + 1; });
  catCache._qCounts = qCounts;
  buildCatTree();
  loadCatFilter();
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  const { data: children } = await sb.from('qna_categories').select('id').eq('parent_id', id).limit(1);
  if (children && children.length) return alert('Cannot delete category with children. Move or delete children first.');
  const { data: questions } = await sb.from('qna_questions').select('id').eq('category_id', id).limit(1);
  if (questions && questions.length) return alert('Cannot delete category with questions. Move questions to another category first.');
  await sb.from('qna_categories').delete().eq('id', id);
  loadCategories();
}

// Tags
async function loadTags() {
  const { data } = await sb.from('qna_tags').select('*').order('name');
  if (!data) return;
  tagCache = data;
  const { data: counts } = await sb.from('qna_question_tags').select('tag_id');
  const qCounts = {};
  if (counts) counts.forEach(t => { qCounts[t.tag_id] = (qCounts[t.tag_id] || 0) + 1; });
  const container = document.getElementById('tag-list');
  if (!data.length) { container.innerHTML = '<p style="color:#666;">No tags yet.</p>'; return; }
  container.innerHTML = data.map(t => `<div class="cat-item">
    <span class="tag-badge">${escHtml(t.name)}</span>
    <span style="font-size:12px;color:#999;">${qCounts[t.id] || 0} questions</span>
    <button class="btn btn-sm btn-danger" onclick="deleteTag(${t.id})">Del</button>
  </div>`).join('');
}

function showTagModal() {
  const html = `<h3>New Tag</h3>
    <label>Name</label><input id="mt-name">
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveTag()">Save</button>
    </div>`;
  showModal(html);
}

async function saveTag() {
  const name = document.getElementById('mt-name').value.trim();
  if (!name) return alert('Name is required');
  if (!(await checkLimit('tags'))) return;
  const { error } = await sb.from('qna_tags').insert({ name, user_id: currentUser.id });
  if (error) return alert('Error: ' + error.message);
  closeModal();
  loadTags();
}

async function deleteTag(id) {
  if (!confirm('Delete this tag?')) return;
  await sb.from('qna_question_tags').delete().eq('tag_id', id);
  await sb.from('qna_tags').delete().eq('id', id);
  loadTags();
}

// Job Tracker
async function loadJobs() {
  const { data } = await sb.from('qna_job_applications').select('*').order('date', { ascending: false }).order('company');
  if (!data) return;
  const tbody = document.getElementById('job-table-body');
  tbody.innerHTML = data.map(j => `<tr>
    <td>${escHtml(j.company)}</td>
    <td>${escHtml(j.role)}</td>
    <td>${j.date}</td>
    <td><span class="tag-badge">${escHtml(j.status)}</span></td>
    <td style="font-size:12px;">${j.contact ? escHtml(j.contact) : ''}${j.email ? '<br>' + escHtml(j.email) : ''}${j.phone ? '<br>' + escHtml(j.phone) : ''}</td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="showJobModal(${j.id})">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteJob(${j.id})">Del</button>
    </td>
  </tr>`).join('');
}

function showJobModal(id) {
  let j = { company: '', role: '', date: '', status: 'Applied', website: '', contact: '', email: '', phone: '', notes: '' };
  if (id) {
    (async () => {
      const { data } = await sb.from('qna_job_applications').select('*').eq('id', id).single();
      if (data) j = data;
      showJobForm(j, id);
    })();
  } else {
    showJobForm(j, null);
  }
}

function showJobForm(j, id) {
  const today = new Date().toISOString().split('T')[0];
  const html = `<h3>${id ? 'Edit' : 'New'} Job Application</h3>
    <label>Company</label><input id="mj-company" value="${escHtml(j.company)}">
    <label>Role</label><input id="mj-role" value="${escHtml(j.role)}">
    <label>Date</label><input id="mj-date" type="date" value="${j.date || today}">
    <label>Status</label><select id="mj-status">
      ${['Applied', 'Phone Screen', 'Interview', 'Technical Round', 'HR Round', 'Offer', 'Rejected', 'Accepted', 'Withdrawn'].map(s =>
        `<option value="${s}" ${j.status === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
    <label>Website</label><input id="mj-website" value="${escHtml(j.website || '')}">
    <label>Contact</label><input id="mj-contact" value="${escHtml(j.contact || '')}">
    <label>Email</label><input id="mj-email" value="${escHtml(j.email || '')}">
    <label>Phone</label><input id="mj-phone" value="${escHtml(j.phone || '')}">
    <label>Notes</label><textarea id="mj-notes">${escHtml(j.notes || '')}</textarea>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveJob(${id || 'null'})">Save</button>
    </div>`;
  showModal(html);
}

async function saveJob(id) {
  const data = {
    company: document.getElementById('mj-company').value,
    role: document.getElementById('mj-role').value,
    date: document.getElementById('mj-date').value,
    status: document.getElementById('mj-status').value,
    website: document.getElementById('mj-website').value || null,
    contact: document.getElementById('mj-contact').value || null,
    email: document.getElementById('mj-email').value || null,
    phone: document.getElementById('mj-phone').value || null,
    notes: document.getElementById('mj-notes').value || null
  };
  if (!data.company || !data.role) return alert('Company and Role are required');
  if (!id && !(await checkLimit('jobs'))) return;
  if (id) {
    const { error } = await sb.from('qna_job_applications').update(data).eq('id', id);
    if (error) return alert('Error: ' + error.message);
  } else {
    const { error } = await sb.from('qna_job_applications').insert({ ...data, user_id: currentUser.id });
    if (error) return alert('Error: ' + error.message);
  }
  closeModal();
  loadJobs();
}

async function deleteJob(id) {
  if (!confirm('Delete this application?')) return;
  await sb.from('qna_job_applications').delete().eq('id', id);
  loadJobs();
}

// Multi-select delete
function onQCheckChange() {
  if (!window._qChecked) window._qChecked = {};
  document.querySelectorAll('.q-checkbox').forEach(cb => {
    if (cb.checked) window._qChecked[parseInt(cb.dataset.qid)] = true;
    else delete window._qChecked[parseInt(cb.dataset.qid)];
    cb.closest('.q-item').classList.toggle('selected', cb.checked);
  });
  updateQSelectBar();
}

function updateQSelectBar() {
  const bar = document.getElementById('q-select-bar');
  const btn = document.getElementById('q-delete-selected');
  const count = window._qChecked ? Object.keys(window._qChecked).length : 0;
  bar.classList.toggle('hidden', count === 0);
  btn.disabled = count === 0;
  btn.textContent = 'Delete Selected' + (count ? ' (' + count + ')' : '');
}

function toggleAllQuestions(checked) {
  window._qChecked = window._qChecked || {};
  document.querySelectorAll('.q-checkbox').forEach(cb => {
    cb.checked = checked;
    const qid = parseInt(cb.dataset.qid);
    if (checked) window._qChecked[qid] = true;
    else delete window._qChecked[qid];
    cb.closest('.q-item').classList.toggle('selected', checked);
  });
  updateQSelectBar();
}

async function deleteSelectedQuestions() {
  const ids = Object.keys(window._qChecked || {}).map(Number);
  if (!ids.length) return;
  if (!confirm('Delete ' + ids.length + ' selected question' + (ids.length > 1 ? 's' : '') + ' and all their answers?')) return;
  const btn = document.getElementById('q-delete-selected');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  for (const id of ids) {
    await sb.from('qna_answers').delete().eq('question_id', id);
    await sb.from('qna_question_tags').delete().eq('question_id', id);
    await sb.from('qna_user_question_preferences').delete().eq('question_id', id);
    await sb.from('qna_questions').delete().eq('id', id);
  }
  window._qChecked = {};
  loadQuestions();
}

function onCatCheckChange() {
  if (!window._catChecked) window._catChecked = {};
  document.querySelectorAll('.cat-checkbox').forEach(cb => {
    if (cb.checked) window._catChecked[parseInt(cb.dataset.cid)] = true;
    else delete window._catChecked[parseInt(cb.dataset.cid)];
    cb.closest('.cat-item').classList.toggle('selected', cb.checked);
  });
  updateCatSelectBar();
}

function updateCatSelectBar() {
  const bar = document.getElementById('cat-select-bar');
  const btn = document.getElementById('cat-delete-selected');
  const count = window._catChecked ? Object.keys(window._catChecked).length : 0;
  bar.classList.toggle('hidden', count === 0);
  btn.disabled = count === 0;
  btn.textContent = 'Delete Selected' + (count ? ' (' + count + ')' : '');
}

function toggleAllCategories(checked) {
  window._catChecked = window._catChecked || {};
  document.querySelectorAll('.cat-checkbox').forEach(cb => {
    cb.checked = checked;
    const cid = parseInt(cb.dataset.cid);
    if (checked) window._catChecked[cid] = true;
    else delete window._catChecked[cid];
    cb.closest('.cat-item').classList.toggle('selected', checked);
  });
  updateCatSelectBar();
}

async function deleteSelectedCategories() {
  const ids = Object.keys(window._catChecked || {}).map(Number);
  if (!ids.length) return;
  if (!confirm('Delete ' + ids.length + ' selected categor' + (ids.length > 1 ? 'ies' : 'y') + '?')) return;
  const btn = document.getElementById('cat-delete-selected');
  btn.disabled = true;
  btn.textContent = 'Checking...';
  // Load all categories for dependency check
  const allCats = await loadAllCategories();
  const childMap = {};
  allCats.forEach(c => { const p = c.parent_id || 0; if (!childMap[p]) childMap[p] = []; childMap[p].push(c.id); });
  // Check children and questions for each selected category
  const blocked = [];
  const toDelete = [];
  for (const id of ids) {
    const children = childMap[id] || [];
    if (children.length) { blocked.push('Category #' + id + ' has child categories'); continue; }
    const { data: questions } = await sb.from('qna_questions').select('id').eq('category_id', id).limit(1);
    if (questions && questions.length) { blocked.push('Category #' + id + ' has questions'); continue; }
    toDelete.push(id);
  }
  if (blocked.length) {
    alert('Cannot delete:\n' + blocked.join('\n'));
    btn.textContent = 'Delete Selected (' + ids.length + ')';
    btn.disabled = false;
    // Uncheck blocked items
    blocked.forEach(msg => { /* just inform user */ });
    return;
  }
  btn.textContent = 'Deleting...';
  for (const id of toDelete) {
    await sb.from('qna_categories').delete().eq('id', id);
    delete window._catChecked[id];
  }
  loadCategories();
}

// Modal helpers
async function exportQuestions() {
  var catId = document.getElementById('q-cat-filter').value;
  var catName = catId ? (catCache.find(function(c) { return c.id == catId; }) || {}).name : 'All Categories';

  // Fetch all questions matching current filter (no pagination)
  var qry = sb.from('qna_questions').select('id,title,description,category_id,created_at');
  if (catId) qry = qry.eq('category_id', catId);
  var { data: questions } = await qry.order('order_index');
  if (!questions || !questions.length) { alert('No questions to export.'); return; }

  // Fetch all answers for these questions
  var qIds = questions.map(function(q) { return q.id; });
  var { data: answers } = await sb.from('qna_answers').select('*').in('question_id', qIds).order('id');

  // Build answer map
  var ansMap = {};
  if (answers) answers.forEach(function(a) {
    if (!ansMap[a.question_id]) ansMap[a.question_id] = [];
    ansMap[a.question_id].push(a);
  });

  // Build text
  var lines = [];
  var separator = '='.repeat(60);
  lines.push(separator);
  lines.push('Q&A Export - ' + catName);
  lines.push('Generated: ' + new Date().toLocaleString());
  lines.push(separator);
  lines.push('');

  questions.forEach(function(q, i) {
    lines.push((i + 1) + '. ' + q.title);
    lines.push('');

    var qa = ansMap[q.id] || [];
    if (qa.length) {
      qa.forEach(function(a, ai) {
        lines.push('   Answer ' + (ai + 1) + ':');
        var text = a.content_html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        // Wrap long text
        while (text.length > 0) {
          lines.push('      ' + text.substring(0, 100));
          text = text.substring(100);
        }
        lines.push('');
      });
    } else {
      lines.push('   (No answers)');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  });

  var blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'qna-export-' + (catId ? catName.replace(/[^a-z0-9]/gi, '-').toLowerCase() : 'all') + '.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function readAloudAllQuestions() {
  var search = document.getElementById('q-search').value.trim();
  var catId = document.getElementById('q-cat-filter').value;
  var hideFilter = document.getElementById('q-hide-filter').value;

  var qry = sb.from('qna_questions').select('id,title,description');
  if (search) qry = qry.or('title.ilike.%' + search + '%,description.ilike.%' + search + '%');
  if (catId) qry = qry.eq('category_id', catId);
  if (hideFilter === 'visible') qry = qry.eq('is_hidden', false);
  if (hideFilter === 'hidden') qry = qry.eq('is_hidden', true);
  var { data: questions } = await qry.order('order_index');
  if (!questions || !questions.length) { alert('No questions to read.'); return; }

  var qIds = questions.map(function(q) { return q.id; });
  var { data: answers } = await sb.from('qna_answers').select('question_id,content_html').in('question_id', qIds);
  var ansMap = {};
  if (answers) answers.forEach(function(a) {
    if (!ansMap[a.question_id]) ansMap[a.question_id] = [];
    ansMap[a.question_id].push(a);
  });

  var parts = [];
  questions.forEach(function(q, i) {
    var text = 'Question ' + (i + 1) + ': ' + q.title + '. ';
    if (q.description) text += q.description.replace(/<[^>]*>/g, '') + '. ';
    var qa = ansMap[q.id] || [];
    if (qa.length) {
      text += 'Answers. ';
      qa.forEach(function(a, ai) {
        text += 'Answer ' + (ai + 1) + ': ' + a.content_html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ') + '. ';
      });
    }
    parts.push(text);
  });
  speakQueue(parts);
}

async function readAloudQuestion(questionId) {
  var { data: q } = await sb.from('qna_questions').select('title,description').eq('id', questionId).single();
  if (!q) return;
  var { data: answers } = await sb.from('qna_answers').select('content_html').eq('question_id', questionId);
  var text = q.title + '. ' + (q.description ? q.description.replace(/<[^>]*>/g, '') + '. ' : '');
  if (answers && answers.length) {
    text += ' Answers. ';
    answers.forEach(function(a, i) {
      text += 'Answer ' + (i + 1) + ': ' + a.content_html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ') + '. ';
    });
  }
  speakText(text);
}

var _speechGen = 0;

function speakText(text) {
  speakQueue([text]);
}

function speakQueue(parts) {
  window.speechSynthesis.cancel();
  _speechGen++;
  if (!parts || !parts.length) return;
  var gen = _speechGen;
  speakParts(parts, 0, gen);
}

function speakParts(parts, pi, gen) {
  if (_speechGen !== gen) return;
  if (pi >= parts.length) return;
  var chunks = splitSpeechChunks(parts[pi]);
  speakPartChunks(parts, pi, chunks, 0, gen);
}

function speakPartChunks(parts, pi, chunks, ci, gen) {
  if (_speechGen !== gen) return;
  if (ci >= chunks.length) {
    setTimeout(function() { speakParts(parts, pi + 1, gen); }, 250);
    return;
  }
  var utter = new SpeechSynthesisUtterance(chunks[ci]);
  utter.rate = 0.9;
  utter.pitch = 1;
  utter.onend = function() {
    if (_speechGen !== gen) return;
    window.speechSynthesis.cancel();
    speakPartChunks(parts, pi, chunks, ci + 1, gen);
  };
  utter.onerror = function() {
    if (_speechGen !== gen) return;
    speakPartChunks(parts, pi, chunks, ci + 1, gen);
  };
  window.speechSynthesis.speak(utter);
  window.speechSynthesis.resume();
}

function splitSpeechChunks(text, maxLen) {
  maxLen = maxLen || 190;
  var cleaned = String(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  var chunks = [];
  var remaining = cleaned;
  while (remaining.length > maxLen) {
    var slice = remaining.substring(0, maxLen);
    var cut = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '), slice.lastIndexOf(', '));
    if (cut < 80) {
      cut = slice.lastIndexOf(' ');
      if (cut < 80) cut = maxLen;
    }
    chunks.push(slice.substring(0, cut + 1).trim());
    remaining = remaining.substring(cut + 1).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Utility
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Mobile sidebar
function toggleSidebar() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('sidebar-overlay');
  s.classList.toggle('open');
  o.classList.toggle('open');
}

// Close sidebar on nav click (mobile)
document.addEventListener('click', function(e) {
  var navItem = e.target.closest('.nav-item');
  if (navItem && window.innerWidth <= 768) {
    var s = document.getElementById('sidebar');
    var o = document.getElementById('sidebar-overlay');
    s.classList.remove('open');
    o.classList.remove('open');
  }
});

// Init
function initQNA() {
  sb = supabase.createClient(
    'https://vgipghqejzbcoighktij.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo'
  );
  checkAuth();
}
