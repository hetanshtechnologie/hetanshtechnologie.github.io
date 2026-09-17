const sb = supabase.createClient(
  'https://vgipghqejzbcoighktij.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo'
);

const EDGE_FUNCTION_URL = 'https://vgipghqejzbcoighktij.supabase.co/functions/v1';
const RAZORPAY_KEY_ID = 'rzp_live_T69SbFfk53qNmY';

let currentUser = null;
let currentView = 'permanent';
let userPlan = null;
let planLimits = { max_templates: 3, max_schedules_per_month: 30 };
let selectedPermTaskIds = new Set();
let expandedPermTaskIds = new Set();
let runningTrackers = {};
let ttPeriod = 'day';

// Auth
async function checkAuth() {
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    currentUser = user;
    await loadPlan();
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('user-email').textContent = user.email;
    const badge = document.getElementById('plan-badge');
    if (badge && userPlan) badge.textContent = userPlan.name;
    setDefaultDate();
    loadPermanentTasks();
    loadRunningTrackers();
  } else {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
}

function setDefaultDate() {
  const istToday = istDateStr();
  const ttMonth = document.getElementById('tt-month');
  if (ttMonth && !ttMonth.value) ttMonth.value = istToday.substring(0, 7);
  const ttYear = document.getElementById('tt-year');
  if (ttYear && !ttYear.value) ttYear.value = istToday.substring(0, 4);
  const ttFrom = document.getElementById('tt-from');
  if (ttFrom && !ttFrom.value) ttFrom.value = istToday;
  const ttTo = document.getElementById('tt-to');
  if (ttTo && !ttTo.value) ttTo.value = istToday;
}

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  if (!email || !password) { err.textContent = 'Please fill in all fields'; return; }
  err.textContent = '';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { err.textContent = error.message.includes('Invalid login') ? 'Invalid email or password' : error.message; return; }
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
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: 'https://HetanshTechnologie.github.io/todo/index.html' } });
  if (error) { err.textContent = error.message; return; }
  err.textContent = 'Check your email for confirmation link!';
  err.style.color = '#188038';
});

document.getElementById('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('google-login-btn').addEventListener('click', async () => {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
  });
  if (error) document.getElementById('login-error').textContent = error.message;
});

document.getElementById('logout-link').addEventListener('click', async () => {
  await sb.auth.signOut();
  if (window.sitengSetUser) window.sitengSetUser(null);
  currentUser = null;
  checkAuth();
});


// Navigation
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const view = el.dataset.view;
    currentView = view;
    document.getElementById('panel-' + view).classList.add('active');
    if (view === 'permanent') loadPermanentTasks();
    if (view === 'contacts') loadContacts();
    if (view === 'time') { setDefaultDate(); loadTimeTracking(); }
  });
});

// ======= Plan Management =======
async function loadPlan() {
  if (!currentUser) return;
  const { data: up } = await sb.from('todo_user_plans').select('plan_id,status').eq('user_id', currentUser.id).maybeSingle();
  if (up && up.status === 'active') {
    const { data: p } = await sb.from('todo_plans').select('*').eq('id', up.plan_id).maybeSingle();
    if (p && p.active) {
      planLimits = { max_templates: p.max_templates, max_schedules_per_month: p.max_schedules_per_month };
      userPlan = p;
      return;
    }
  }
  userPlan = { id: 0, name: 'Free', max_templates: 3, max_schedules_per_month: 30, price: 0 };
  planLimits = { max_templates: 3, max_schedules_per_month: 30 };
}

async function checkLimit(type) {
  if (!currentUser) return true;
  if (type === 'templates') {
    const { count } = await sb.from('todo_templates').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id);
    if (count < planLimits.max_templates) return true;
    await showUpsell('templates', count);
    return false;
  }
  if (type === 'schedules') {
    const month = new Date().toISOString().substring(0, 7);
    const { count } = await sb.from('todo_daily_schedules').select('*', { count: 'exact', head: true }).eq('user_id', currentUser.id).gte('schedule_date', month + '-01').lte('schedule_date', month + '-31');
    if (count < planLimits.max_schedules_per_month) return true;
    await showUpsell('schedules', count);
    return false;
  }
  return true;
}

async function showUpsell(type, current) {
  const { data: plans } = await sb.from('todo_plans').select('*').eq('active', true).order('price');
  const limitKey = type === 'templates' ? 'max_templates' : 'max_schedules_per_month';
  const labels = { templates: 'Templates', schedules: 'Daily Schedules' };
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
      html += '<span>' + (p.max_templates >= 999999 ? '&#8734;' : p.max_templates) + ' Templates</span>';
      html += ' &middot; ';
      html += '<span>' + (p.max_schedules_per_month >= 999999 ? '&#8734;' : p.max_schedules_per_month) + ' Schedules/mo</span>';
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
    const res = await fetch(EDGE_FUNCTION_URL + '/todo-create-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ plan_id: planId })
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Order failed'); }
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
          const vRes = await fetch(EDGE_FUNCTION_URL + '/todo-verify-purchase', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId
            })
          });
          const vData = await vRes.json();
          if (!vRes.ok) throw new Error(vData.error || 'Verification failed');
          alert('Payment successful! ' + vData.plan_name + ' plan activated.');
          await loadPlan();
          const badge = document.getElementById('plan-badge');
          if (badge && userPlan) badge.textContent = userPlan.name;
        } catch (e) { alert('Payment verification failed: ' + e.message); }
      },
      modal: { ondismiss: function() { } }
    });
    rzp.open();
  } catch (e) { alert('Payment failed: ' + e.message); }
}



// ======= Contact Management =======
var contactsSortState = 'name';
var contactFilter = 'active';
var contactPage = 1;
var contactPageSize = 20;
var contactSearch = '';

function setContactFilter(filter) {
  contactFilter = filter;
  document.querySelectorAll('.contact-filter-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.filter === filter);
  });
  loadContacts();
}

async function loadContacts() {
  if (!currentUser) return;
  var tf = document.getElementById('contact-timeframe');
  var timeframe = tf ? parseInt(tf.value) : 30;
  var cutDate = timeframe ? new Date(Date.now() - timeframe * 86400000).toISOString().substring(0, 19) : '1970-01-01';
  if (timeframe === 'all' || isNaN(timeframe)) cutDate = '1970-01-01';

  var { data: contacts } = await sb.from('todo_contacts').select('*').eq('user_id', currentUser.id).order('order_index');
  var container = document.getElementById('contacts-container');
  if (!contacts || !contacts.length) {
    container.innerHTML = '<p style="color:#666;text-align:center;padding:30px;">No contacts yet. Add one to get started.</p>';
    return;
  }

  // Filter by visibility
  if (contactFilter === 'active') contacts = contacts.filter(function(c) { return !c.hidden; });
  else if (contactFilter === 'hidden') contacts = contacts.filter(function(c) { return c.hidden; });

  // Search filter
  if (contactSearch) {
    var q = contactSearch.toLowerCase();
    contacts = contacts.filter(function(c) { return (c.name || '').toLowerCase().includes(q) || (c.number || '').toLowerCase().includes(q); });
  }

  if (!contacts.length) {
    container.innerHTML = '<p style="color:#666;text-align:center;padding:30px;">No ' + contactFilter + ' contacts' + (contactSearch ? ' matching "' + escHtml(contactSearch) + '"' : '') + '.</p>';
    return;
  }

  // Gather call counts
  var contactIds = contacts.map(function(c) { return c.id; });
  var { data: allCalls } = await sb.from('todo_contact_calls').select('contact_id').in('contact_id', contactIds).gte('called_at', cutDate);
  var callCounts = {};
  if (allCalls) { allCalls.forEach(function(c) { callCounts[c.contact_id] = (callCounts[c.contact_id] || 0) + 1; }); }

  // Append count to each contact for sorting
  contacts.forEach(function(c) { c._callCount = callCounts[c.id] || 0; });

  if (contactsSortState === 'least-called') {
    contacts.sort(function(a,b) { return (a._callCount || 999) - (b._callCount || 999); });
  } else if (contactsSortState === 'most-called') {
    contacts.sort(function(a,b) { return (b._callCount || 0) - (a._callCount || 0); });
  }

  // Paginate
  var totalPages = Math.ceil(contacts.length / contactPageSize);
  if (contactPage > totalPages) contactPage = totalPages;
  var startIdx = (contactPage - 1) * contactPageSize;
  var pageContacts = contacts.slice(startIdx, startIdx + contactPageSize);

  var html = '<div class="contact-page-info">Page ' + contactPage + ' of ' + totalPages + ' (' + contacts.length + ' contacts)</div>';
  for (var ci = 0; ci < pageContacts.length; ci++) {
    var c = pageContacts[ci];
    var rowNum = startIdx + ci + 1;
    var count = c._callCount || 0;
    var badgeClass = count === 0 ? 'background:#fef2f2;color:#d93025;' : 'background:#e8f4fd;color:#1a73e8;';
    html += '<div class="contact-item" draggable="true" data-id="' + c.id + '" data-idx="' + (startIdx + ci) + '" ' +
      'ondragstart="contactDragStart(event)" ondragover="contactDragOver(event)" ondrop="contactDrop(event)" ondragend="contactDragEnd(event)" ' +
      'onclick="toggleContactPanel(' + c.id + ', event)"' + (c.hidden ? ' style="opacity:0.5;"' : '') + '>' +
      '<input type="checkbox" class="contact-select-cb" onclick="event.stopPropagation();updateBulkSendBtn()" data-id="' + c.id + '">' +
      '<span class="contact-row-num">' + rowNum + '</span>' +
      '<span class="contact-handle" onclick="event.stopPropagation();">&#x2630;</span>' +
      '<span class="contact-name">' + escHtml(c.name) + (c.number ? ' <span style="color:#999;font-size:12px;font-weight:400;">' + escHtml(c.number) + '</span>' : '') + (c.hidden ? ' <span style="color:#999;font-size:10px;">(hidden)</span>' : '') + '</span>' +
      '<span class="contact-call-badge" style="' + badgeClass + '">' + count + ' calls</span>' +
      (c.number ? '<span class="contact-wa-icon" onclick="event.stopPropagation();sendWhatsApp(\'' + escHtml(c.number) + '\')" title="Send WhatsApp">&#x1F4AC;</span>' : '') +
      '<span class="contact-expand-icon" id="expand-icon-' + c.id + '">&#x25B6;</span>' +
      '<span class="contact-delete-icon" onclick="event.stopPropagation();if(confirm(\'Delete this contact?\'))deleteContact(' + c.id + ')" title="Delete contact">&#x2716;</span></div>' +
      '<div class="contact-panel" id="contact-panel-' + c.id + '" style="display:none;"></div>';
  }
  // Pagination controls
  html += '<div class="contact-pagination">';
  if (contactPage > 1) html += '<button class="btn btn-sm btn-secondary" onclick="contactPage--;loadContacts()">&#x25C0; Prev</button> ';
  html += '<span class="contact-page-num">' + contactPage + ' / ' + totalPages + '</span>';
  if (contactPage < totalPages) html += ' <button class="btn btn-sm btn-secondary" onclick="contactPage++;loadContacts()">Next &#x25B6;</button>';
  html += '</div>';

  container.innerHTML = html;
}

function contactDragStart(e) {
  e.dataTransfer.setData('text/plain', e.currentTarget.dataset.id);
  e.currentTarget.classList.add('dragging');
}
function contactDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}
function contactDragEnd(e) {
  document.querySelectorAll('.contact-item').forEach(function(el) { el.classList.remove('dragging', 'drag-over'); });
}
function contactDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  var draggedId = parseInt(e.dataTransfer.getData('text/plain'));
  var targetEl = e.currentTarget;
  var items = Array.from(document.querySelectorAll('.contact-item'));
  var draggedIdx = items.findIndex(function(el) { return parseInt(el.dataset.id) === draggedId; });
  var targetIdx = items.indexOf(targetEl);
  if (draggedIdx === -1 || draggedIdx === targetIdx) return;

  if (draggedIdx < targetIdx) { targetEl.parentNode.insertBefore(items[draggedIdx], targetEl.nextSibling); }
  else { targetEl.parentNode.insertBefore(items[draggedIdx], targetEl); }

  // Re-save order using global indices
  var newItems = document.querySelectorAll('.contact-item');
  var updates = [];
  newItems.forEach(function(el, idx) {
    var id = parseInt(el.dataset.id);
    var globalIdx = parseInt(el.dataset.idx);
    updates.push(sb.from('todo_contacts').update({ order_index: globalIdx }).eq('id', id));
  });
  Promise.all(updates).catch(function(){});
}

function toggleContactPanel(contactId, event) {
  if (event) {
    var handle = event.target.closest('.contact-handle');
    if (handle) return;
  }
  var panel = document.getElementById('contact-panel-' + contactId);
  var icon = document.getElementById('expand-icon-' + contactId);
  if (!panel) return;
  if (panel.style.display !== 'block') {
    panel.style.display = 'block';
    if (icon) icon.classList.add('open');
    loadContactPanel(contactId);
  } else {
    panel.style.display = 'none';
    if (icon) icon.classList.remove('open');
  }
}

async function loadContactPanel(contactId) {
  var panel = document.getElementById('contact-panel-' + contactId);
  if (!panel) return;

  // Load contact data
  var { data: contactData } = await sb.from('todo_contacts').select('hidden, number').eq('id', contactId).single();
  var isHidden = contactData ? contactData.hidden : false;

  // Load notes
  var { data: notes } = await sb.from('todo_contact_notes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false });
  // Load calls
  var { data: calls } = await sb.from('todo_contact_calls').select('*').eq('contact_id', contactId).order('called_at', { ascending: false });

  var html = '<div style="display:flex;gap:16px;flex-wrap:wrap;">';

  // Notes section
  html += '<div style="flex:1;min-width:200px;"><h4>Notes</h4>';
  if (notes && notes.length) {
    notes.forEach(function(n) {
      html += '<div class="entry-row"><span class="entry-text">' + escHtml(n.text) + '</span>' +
        '<button class="btn btn-sm btn-danger" onclick="deleteContactNote(' + n.id + ',' + contactId + ')">X</button></div>';
    });
  } else { html += '<p style="font-size:12px;color:#999;">No notes yet.</p>'; }
  html += '<div class="add-row"><input type="text" id="new-note-' + contactId + '" placeholder="Add note..." onkeydown="if(event.key===\'Enter\')addContactNote(' + contactId + ')">' +
    '<button class="btn btn-sm btn-primary" onclick="addContactNote(' + contactId + ')">Add</button></div></div>';

  // Calls section
  html += '<div style="flex:1;min-width:200px;"><h4>Call History</h4>';
  if (calls && calls.length) {
    calls.forEach(function(cl) {
      var dt = cl.called_at.substring(0, 16).replace('T', ' ');
      html += '<div class="entry-row"><span class="entry-time">' + escHtml(dt) + '</span>' +
        '<button class="btn btn-sm btn-danger" onclick="deleteContactCall(' + cl.id + ',' + contactId + ')">X</button></div>';
    });
  } else { html += '<p style="font-size:12px;color:#999;">No calls logged yet.</p>'; }
  html += '<div class="add-row"><input type="datetime-local" id="new-call-' + contactId + '" value="' + new Date().toISOString().substring(0, 16) + '">' +
    '<button class="btn btn-sm btn-primary" onclick="addContactCall(' + contactId + ')">Log</button></div></div>';

  html += '</div>';

  // Hide/Unhide, WhatsApp and Delete buttons
  html += '<div style="margin-top:12px;text-align:right;display:flex;gap:8px;justify-content:flex-end;">' +
    (contactData && contactData.number ? '<button class="btn btn-sm btn-primary" onclick="sendWhatsApp(\'' + escHtml(contactData.number) + '\')" style="background:#25D366;border-color:#25D366;">&#x1F4AC; WhatsApp</button>' : '') +
    '<button class="btn btn-sm btn-secondary" id="hide-btn-' + contactId + '" onclick="toggleContactVisibility(' + contactId + ')"></button>' +
    '<button class="btn btn-sm btn-danger" onclick="deleteContact(' + contactId + ')">Delete Contact</button></div>';

  panel.innerHTML = html;

  // Set hide/unhide button text
  var hideBtn = document.getElementById('hide-btn-' + contactId);
  if (hideBtn) hideBtn.textContent = isHidden ? 'Unhide' : 'Hide';
}

function showAddContactModal() {
  var html = '<h3>Add Contact</h3>' +
    '<label>Name</label><input id="new-contact-name" placeholder="Contact name" onkeydown="if(event.key===\'Enter\')document.getElementById(\'new-contact-number\').focus()">' +
    '<label>Phone (optional)</label><input id="new-contact-number" placeholder="Phone number" onkeydown="if(event.key===\'Enter\')saveContact()">' +
    '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="saveContact()">Add</button></div>';
  showModal(html);
  setTimeout(function() { var inp = document.getElementById('new-contact-name'); if (inp) inp.focus(); }, 100);
}

async function saveContact() {
  var name = document.getElementById('new-contact-name').value.trim();
  if (!name) return alert('Name is required');
  var number = document.getElementById('new-contact-number') ? document.getElementById('new-contact-number').value.trim() : '';
  closeModal();

  var { data: existing } = await sb.from('todo_contacts').select('order_index').eq('user_id', currentUser.id).order('order_index', { ascending: false }).limit(1);
  var nextOrder = (existing && existing.length) ? existing[0].order_index + 1 : 0;
  var { data: idExist } = await sb.from('todo_contacts').select('id').order('id', { ascending: false }).limit(1);
  var newId = (idExist && idExist.length) ? idExist[0].id + 1 : 1;
  var now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  var payload = { id: newId, name: name, order_index: nextOrder, user_id: currentUser.id, created_at: now };
  if (number) payload.number = number;
  var { error } = await sb.from('todo_contacts').insert(payload);
  if (error) {
    // Retry without number if column doesn't exist
    if (number) { delete payload.number; var { error: e2 } = await sb.from('todo_contacts').insert(payload); if (e2) return alert('Error: ' + e2.message); }
    else return alert('Error: ' + error.message);
  }
  loadContacts();
}

async function deleteContact(contactId) {
  if (!confirm('Delete this contact and all associated notes & calls?')) return;
  await sb.from('todo_contact_notes').delete().eq('contact_id', contactId);
  await sb.from('todo_contact_calls').delete().eq('contact_id', contactId);
  await sb.from('todo_contacts').delete().eq('id', contactId);
  loadContacts();
}

async function toggleContactVisibility(contactId) {
  var { data: c } = await sb.from('todo_contacts').select('hidden').eq('id', contactId).single();
  if (!c) return;
  var newVal = !c.hidden;
  await sb.from('todo_contacts').update({ hidden: newVal }).eq('id', contactId);
  loadContacts();
}

function sendWhatsApp(number) {
  var cleaned = number.replace(/[^\d+]/g, '');
  window.open('https://wa.me/' + encodeURIComponent(cleaned), '_blank');
}

function updateBulkSendBtn() {
  var btn = document.getElementById('bulk-send-btn');
  if (!btn) return;
  var checked = document.querySelectorAll('.contact-select-cb:checked').length;
  btn.style.display = checked ? 'inline-flex' : 'none';
  btn.textContent = '\u{1F4AC} Send to Selected (' + checked + ')';
}

function getSelectedContactIds() {
  var ids = [];
  document.querySelectorAll('.contact-select-cb:checked').forEach(function(cb) {
    ids.push(parseInt(cb.dataset.id));
  });
  return ids;
}

async function sendBulkWhatsApp() {
  var ids = getSelectedContactIds();
  if (!ids.length) return;
  var msg = prompt('Enter message to send to ' + ids.length + ' contact(s):');
  if (!msg) return;
  var { data: contacts } = await sb.from('todo_contacts').select('number').in('id', ids);
  if (!contacts || !contacts.length) return;
  var encoded = encodeURIComponent(msg);
  contacts.forEach(function(c) {
    if (c.number) {
      var cleaned = c.number.replace(/[^\d+]/g, '');
      window.open('https://wa.me/' + encodeURIComponent(cleaned) + '?text=' + encoded, '_blank');
    }
  });
  // Uncheck all
  document.querySelectorAll('.contact-select-cb:checked').forEach(function(cb) { cb.checked = false; });
  updateBulkSendBtn();
}

async function addContactNote(contactId) {
  var input = document.getElementById('new-note-' + contactId);
  var text = input.value.trim();
  if (!text) return;
  input.value = '';
  var { data: idExist } = await sb.from('todo_contact_notes').select('id').order('id', { ascending: false }).limit(1);
  var newId = (idExist && idExist.length) ? idExist[0].id + 1 : 1;
  var now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await sb.from('todo_contact_notes').insert({ id: newId, contact_id: contactId, text: text, created_at: now });
  loadContactPanel(contactId);
}

async function deleteContactNote(noteId, contactId) {
  if (!confirm('Delete this note?')) return;
  await sb.from('todo_contact_notes').delete().eq('id', noteId);
  loadContactPanel(contactId);
}

async function addContactCall(contactId) {
  var input = document.getElementById('new-call-' + contactId);
  var datetime = input.value;
  if (!datetime) return;
  var calledAt = datetime.replace('T', ' ') + ':00';
  var { data: idExist } = await sb.from('todo_contact_calls').select('id').order('id', { ascending: false }).limit(1);
  var newId = (idExist && idExist.length) ? idExist[0].id + 1 : 1;
  var now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await sb.from('todo_contact_calls').insert({ id: newId, contact_id: contactId, called_at: calledAt, created_at: now });
  loadContactPanel(contactId);
  loadContacts();
}

async function deleteContactCall(callId, contactId) {
  if (!confirm('Delete this call entry?')) return;
  await sb.from('todo_contact_calls').delete().eq('id', callId);
  loadContactPanel(contactId);
  loadContacts();
}

async function importLocationHistoryContacts() {
  var btn = document.getElementById('import-lh-btn');
  if (btn) btn.disabled = true;
  try {
    var lhPhone = currentUser ? currentUser.email : null;

    var { data: existing } = await sb.from('todo_contacts').select('name, number').eq('user_id', currentUser.id);
    var existingNames = {};
    var existingNumbers = {};
    var hasNumberCol = true;
    if (existing) {
      existing.forEach(function(c) {
        existingNames[c.name.toLowerCase().trim()] = true;
        if (c.number) existingNumbers[c.number.replace(/[^\d]/g, '')] = true;
      });
      // Check if number column exists
      if (existing.length && existing[0].number === undefined) hasNumberCol = false;
    }

    var { data: lhContacts, error } = await sb.from('phone_contacts').select('name, number').eq('phone', lhPhone);
    if (error) { alert('Error fetching from Location History: ' + error.message); return; }
    if (!lhContacts || !lhContacts.length) { alert('No contacts found in Location History.'); return; }

    var inserted = 0, skipped = 0, lhSeen = {};
    var { data: idExist } = await sb.from('todo_contacts').select('id').order('id', { ascending: false }).limit(1);
    var nextId = (idExist && idExist.length) ? idExist[0].id + 1 : 1;
    var { data: orderExist } = await sb.from('todo_contacts').select('order_index').eq('user_id', currentUser.id).order('order_index', { ascending: false }).limit(1);
    var nextOrder = (orderExist && orderExist.length) ? orderExist[0].order_index + 1 : 0;
    var now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    for (var i = 0; i < lhContacts.length; i++) {
      var c = lhContacts[i];
      var nameKey = c.name.toLowerCase().trim();
      var numKey = c.number ? c.number.replace(/[^\d]/g, '') : '';
      // Skip if name or number already exists in todo_contacts
      if (existingNames[nameKey]) { skipped++; continue; }
      if (numKey && existingNumbers[numKey]) { skipped++; continue; }
      // Skip if same name already imported from LH this batch
      if (lhSeen[nameKey]) { skipped++; continue; }
      if (numKey && lhSeen[numKey]) { skipped++; continue; }
      lhSeen[nameKey] = true;
      if (numKey) lhSeen[numKey] = true;
      var payload = { id: nextId++, name: c.name, order_index: nextOrder++, user_id: currentUser.id, created_at: now };
      if (hasNumberCol) payload.number = c.number || '';
      await sb.from('todo_contacts').insert(payload);
      inserted++;
    }
    alert('Imported ' + inserted + ' contacts' + (skipped ? ', skipped ' + skipped + ' duplicates' : '') + '.');
    loadContacts();
  } finally {
    if (btn) btn.disabled = false;
  }
}

function sortLeastCalled() {
  if (contactsSortState === 'name') contactsSortState = 'least-called';
  else if (contactsSortState === 'least-called') contactsSortState = 'most-called';
  else contactsSortState = 'name';
  var labels = { 'name': 'Sort: Name', 'least-called': 'Sort: Least Called', 'most-called': 'Sort: Most Called' };
  var btn = document.getElementById('sort-least-called');
  if (btn) btn.textContent = labels[contactsSortState] || 'Sort: Name';
  loadContacts();
}

async function mergeDuplicateContacts() {
  var { data: contacts } = await sb.from('todo_contacts').select('*').eq('user_id', currentUser.id);
  if (!contacts || contacts.length < 2) { alert('Not enough contacts to merge.'); return; }

  // Group duplicates by normalized name
  var groups = [];
  var seen = {};
  contacts.forEach(function(c) {
    var key = (c.name || '').toLowerCase().trim();
    if (!key) return;
    if (seen[key] !== undefined) { groups[seen[key]].push(c); }
    else { seen[key] = groups.length; groups.push([c]); }
  });

  // Also group by number (across different names)
  var numGroups = {};
  contacts.forEach(function(c) {
    if (!c.number) return;
    var numKey = c.number.replace(/[^\d]/g, '');
    if (!numKey) return;
    if (!numGroups[numKey]) numGroups[numKey] = [];
    numGroups[numKey].push(c);
  });
  Object.keys(numGroups).forEach(function(num) {
    var g = numGroups[num];
    if (g.length < 2) return;
    // Check if this group is already covered by a name group
    var alreadyCovered = groups.some(function(grp) {
      return grp.length > 1 && g.every(function(c) { return grp.some(function(x) { return x.id === c.id; }); });
    });
    if (!alreadyCovered) groups.push(g);
  });

  var toMerge = groups.filter(function(g) { return g.length > 1; });
  if (!toMerge.length) { alert('No duplicate contacts found.'); return; }

  // Build summary HTML
  var summary = '<h3>Merge Duplicate Contacts</h3><p style="font-size:13px;color:#666;margin-bottom:12px;">' + toMerge.length + ' duplicate group(s) found. Keep will retain notes & calls.</p>';
  toMerge.forEach(function(g, gi) {
    // Pick the best contact to keep: has number > has notes > first
    var keep = g[0];
    g.forEach(function(c) {
      if (c.number && !keep.number) keep = c;
      else if (c.number && keep.number && c.created_at < keep.created_at) keep = c;
    });
    summary += '<div style="border:1px solid #ddd;border-radius:6px;padding:10px;margin-bottom:8px;font-size:13px;">';
    summary += '<div style="font-weight:600;margin-bottom:4px;">Group ' + (gi + 1) + '</div>';
    g.forEach(function(c) {
      var isKeep = c.id === keep.id;
      summary += '<div style="padding:3px 6px;' + (isKeep ? 'background:#e8f4fd;border-radius:4px;' : '') + '">' +
        escHtml(c.name) + (c.number ? ' - ' + escHtml(c.number) : '') + (isKeep ? ' <strong>(keep)</strong>' : '') + '</div>';
    });
    summary += '</div>';
  });
  summary += '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal();window._mergeData=null">Cancel</button>' +
    '<button class="btn btn-primary" onclick="closeModal();executeMerge(window._mergeData)">Merge ' + toMerge.length + ' Group(s)</button></div>';
  window._mergeData = toMerge;

  showModal(summary);
}

async function executeMerge(groups) {
  var merged = 0, deleted = 0;
  for (var gi = 0; gi < groups.length; gi++) {
    var g = groups[gi];
    // Pick keep: has number > has notes > first
    var keep = g[0];
    for (var ci = 0; ci < g.length; ci++) {
      if (g[ci].number && !keep.number) keep = g[ci];
      else if (g[ci].number && keep.number && g[ci].created_at < keep.created_at) keep = g[ci];
    }
    var toDelete = g.filter(function(c) { return c.id !== keep.id; });
    for (var di = 0; di < toDelete.length; di++) {
      var del = toDelete[di];
      // Transfer notes
      await sb.from('todo_contact_notes').update({ contact_id: keep.id }).eq('contact_id', del.id);
      // Transfer calls
      await sb.from('todo_contact_calls').update({ contact_id: keep.id }).eq('contact_id', del.id);
      // Delete
      await sb.from('todo_contacts').delete().eq('id', del.id);
      deleted++;
    }
    merged++;
  }
  alert('Merged ' + merged + ' group(s), deleted ' + deleted + ' duplicate(s).');
  loadContacts();
}

// ======= Modal =======
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ======= Utility =======
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ======= Permament Tasks =======

async function loadPermanentTasks() {
  const { data } = await sb.from('todo_permanent_tasks').select('*').eq('user_id', currentUser.id).order('order_index');
  const container = document.getElementById('permanent-task-list');
  if (!data || !data.length) {
    container.innerHTML = '<div class="card"><p style="color:#666;text-align:center;padding:20px;">No todos yet. Add your first task above.</p></div>';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const taskIds = data.map(t => t.id);
  const { data: logs } = await sb.from('todo_permanent_task_logs').select('*')
    .eq('user_id', currentUser.id).eq('log_date', today).in('task_id', taskIds);
  const logMap = {};
  if (logs) logs.forEach(l => { logMap[l.task_id] = l; });

  const ttDayStart = istDateStr() + ' 00:00:00';
  const { data: ttToday } = await sb.from('todo_time_tracking')
    .select('task_id')
    .eq('user_id', currentUser.id)
    .eq('task_type', 'permanent')
    .gte('start_time', ttDayStart);
  const workedTaskIds = new Set();
  if (ttToday) ttToday.forEach(r => workedTaskIds.add(r.task_id));

  selectedPermTaskIds.clear();
  document.getElementById('delete-selected-perm-btn').style.display = 'none';

  const parents = data.filter(t => !t.parent_id);
  const children = {};
  data.filter(t => t.parent_id).forEach(t => {
    if (!children[t.parent_id]) children[t.parent_id] = [];
    children[t.parent_id].push(t);
  });

  function renderTask(t, depth) {
    const log = logMap[t.id];
    const completed = log ? log.is_completed : 0;
    const hasChildren = children[t.id] && children[t.id].length;
    const indent = depth * 24;
    const isExpanded = expandedPermTaskIds.has(t.id);
    return '<div class="card perm-task-card" style="margin-left:' + indent + 'px;border-left:' + (depth ? '2px solid #e8e8e8' : 'none') + '">' +
      '<div class="task-item' + (workedTaskIds.has(t.id) ? ' worked' : '') + '" data-id="' + t.id + '" data-parent="' + (t.parent_id || '') + '" draggable="true">' +
      '<span class="drag-handle">&#x2630;</span>' +
      (hasChildren ? '<span class="perm-expand-icon ' + (isExpanded ? 'open' : '') + '" onclick="event.stopPropagation();togglePermChildren(' + t.id + ');loadPermanentTasks()">&#x25B6;</span>' : '<span class="perm-expand-placeholder"></span>') +
      '<input type="checkbox" class="task-select" onchange="togglePermSelect(' + t.id + ', this.checked)" style="width:16px;height:16px;accent-color:#d93025;cursor:pointer;">' +
      '<input type="checkbox" class="task-check" ' + (completed ? 'checked' : '') + ' onchange="togglePermanentTask(' + t.id + ', this.checked, loadPermanentTasks)">' +
      '<span class="task-title' + (completed ? ' done' : '') + '">' + (t.title || '') + '</span>' +
      '<span class="task-status-dot ' + (completed ? 'done' : 'pending') + '"></span>' +
      (depth === 0 ? '<button class="btn btn-sm btn-ghost" onclick="showPermanentTaskModal(null,' + t.id + ')" title="Add subtask">+ Sub</button>' : '') +
      '<button class="btn btn-sm tt-btn btn-success" data-tt-type="permanent" data-tt-id="' + t.id + '" data-tt-title="' + escHtml(t.title) + '" style="font-size:11px;padding:2px 10px;min-width:54px;">Start</button>' +
      '<button class="btn btn-sm btn-secondary" onclick="showPermanentTaskModal(' + t.id + ')">Edit</button>' +
      '<button class="btn btn-sm btn-danger" onclick="deletePermanentTask(' + t.id + ')">Del</button></div>' +
      (t.note ? '<div class="task-note" title="Click to edit note" onclick="showPermanentTaskModal(' + t.id + ')">' + escHtml(t.note) + '</div>' : '') +
      '</div>';
  }

  function renderSubtree(parentId, depth) {
    const subs = children[parentId] || [];
    if (!subs.length) return '';
    let html = '<div class="perm-children" id="perm-children-' + parentId + '" style="display:' + (expandedPermTaskIds.has(parentId) ? 'block' : 'none') + '">';
    for (const t of subs) {
      html += renderTask(t, depth);
      html += renderSubtree(t.id, depth + 1);
    }
    html += '</div>';
    return html;
  }

  let html = '';
  for (const p of parents) {
    html += renderTask(p, 0);
    html += renderSubtree(p.id, 1);
  }
  container.innerHTML = html;
  updateTimerButtons();
}

function togglePermChildren(taskId) {
  if (expandedPermTaskIds.has(taskId)) {
    expandedPermTaskIds.delete(taskId);
  } else {
    expandedPermTaskIds.add(taskId);
  }
}

var dragFromHandle = false;
document.addEventListener('mousedown', function(e) {
  dragFromHandle = !!e.target.closest('.drag-handle');
});


(function() {
  var c = document.getElementById('permanent-task-list');
  if (!c) return;
  c.addEventListener('dragstart', function(e) {
    if (!dragFromHandle) { e.preventDefault(); return; }
    dragFromHandle = false;
    var item = e.target.closest('.task-item');
    if (!item) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: parseInt(item.dataset.id), parent: item.dataset.parent }));
    item.closest('.perm-task-card').classList.add('dragging');
  });
  c.addEventListener('dragenter', function(e) {
    var item = e.target.closest('.task-item');
    if (!item) return;
    e.preventDefault();
    item.closest('.perm-task-card').classList.add('drag-over');
  });
  c.addEventListener('dragover', function(e) {
    var item = e.target.closest('.task-item');
    if (!item) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    item.closest('.perm-task-card').classList.add('drag-over');
  });
  c.addEventListener('drop', async function(e) {
    var targetItem = e.target.closest('.task-item');
    if (!targetItem) return;
    e.preventDefault();
    var targetCard = targetItem.closest('.perm-task-card');
    targetCard.classList.remove('drag-over');
    var data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (ex) { return; }
    var draggedId = data.id;
    var draggedParent = data.parent;
    var targetId = parseInt(targetItem.dataset.id);
    var targetParent = targetItem.dataset.parent;
    if (draggedId === targetId || draggedParent !== targetParent) return;

    var sameParent = function() {
      return Array.from(c.querySelectorAll('.perm-task-card')).filter(function(el) {
        var item = el.querySelector('.task-item');
        return item && item.dataset.parent === draggedParent;
      });
    };

    var draggedCard = sameParent().find(function(el) { return parseInt(el.querySelector('.task-item').dataset.id) === draggedId; });
    if (!draggedCard) return;

    var rect = targetCard.getBoundingClientRect();
    var placeBefore = (e.clientY - rect.top) < rect.height / 2;

    if (placeBefore) {
      targetCard.parentNode.insertBefore(draggedCard, targetCard);
    } else {
      targetCard.parentNode.insertBefore(draggedCard, targetCard.nextSibling);
    }

    var newOrder = sameParent().map(function(el) { return parseInt(el.querySelector('.task-item').dataset.id); });
    var overlay = document.getElementById('reorder-overlay');
    if (overlay) overlay.classList.add('show');
    try {
      var updates = newOrder.map(function(id, idx) {
        return sb.from('todo_permanent_tasks').update({ order_index: idx }).eq('id', id);
      });
      await Promise.all(updates);
    } finally {
      if (overlay) overlay.classList.remove('show');
    }
    loadPermanentTasks();
  });
  c.addEventListener('dragend', function(e) {
    c.querySelectorAll('.perm-task-card').forEach(function(el) { el.classList.remove('dragging', 'drag-over'); });
  });
})();

function togglePermSelect(taskId, checked) {
  if (checked) selectedPermTaskIds.add(taskId);
  else selectedPermTaskIds.delete(taskId);
  document.getElementById('delete-selected-perm-btn').style.display = selectedPermTaskIds.size ? 'inline-block' : 'none';
}

async function deleteSelectedPermTasks() {
  if (!selectedPermTaskIds.size) return;
  const count = selectedPermTaskIds.size;
  if (!confirm('Delete ' + count + ' todo' + (count > 1 ? 's' : '') + '?')) return;
  const ids = Array.from(selectedPermTaskIds);
  selectedPermTaskIds.clear();
  document.getElementById('delete-selected-perm-btn').style.display = 'none';
  await sb.from('todo_permanent_task_logs').delete().in('task_id', ids);
  await sb.from('todo_permanent_tasks').delete().in('id', ids);
  loadPermanentTasks();
}

function showPermanentTaskModal(id, parentId) {
  (async () => {
    let task = null;
    if (id) {
      const { data: t } = await sb.from('todo_permanent_tasks').select('*').eq('id', id).single();
      if (t) task = t;
    }
    const title = id ? 'Edit Todo' : 'New Todo';
    const action = id ? ('savePermanentTask(' + id + ')') : (parentId ? 'savePermanentTask(null,' + parentId + ')' : 'savePermanentTask(null)');

    const { data: allTasks } = await sb.from('todo_permanent_tasks').select('*').eq('user_id', currentUser.id).order('order_index');
    let parentOptions = '';
    if (allTasks && allTasks.length) {
      parentOptions = '<label>Parent Task</label><select id="pt-parent"><option value="">(top-level)</option>';
      for (const t of allTasks) {
        if (id && t.id === id) continue;
        const selected = (task && task.parent_id === t.id) || (parentId && parentId === t.id) ? 'selected' : '';
        parentOptions += '<option value="' + t.id + '" ' + selected + '>' + escHtml(t.title) + '</option>';
      }
      parentOptions += '</select>';
    }

    const html = '<h3>' + title + '</h3>' +
      parentOptions +
      '<label>Task Description</label><textarea id="pt-title" placeholder="e.g. Morning exercise (supports HTML: <b>bold</b>, <ul>...</ul>)">' + (task ? escHtml(task.title) : '') + '</textarea>' +
      '<label>Note</label><textarea id="pt-note" placeholder="Optional note for this task">' + (task ? escHtml(task.note || '') : '') + '</textarea>' +
      '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="' + action + '">Save</button></div>';
    showModal(html);
  })();
}

async function savePermanentTask(id, parentId) {
  const title = document.getElementById('pt-title').value.trim();
  if (!title) return alert('Task description is required');
  const note = document.getElementById('pt-note') ? document.getElementById('pt-note').value.trim() : '';
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const parentSelect = document.getElementById('pt-parent');
  const actualParentId = parentId || (parentSelect ? (parentSelect.value || null) : null);

  if (id) {
    const updateData = { title, note };
    if (parentSelect !== null) updateData.parent_id = actualParentId;
    if (parentId) updateData.parent_id = parentId;
    const { error } = await sb.from('todo_permanent_tasks').update(updateData).eq('id', id);
    if (error) return alert('Error: ' + error.message);
  } else {
    const { data: existing } = await sb.from('todo_permanent_tasks').select('id').order('id', { ascending: false }).limit(1);
    const newId = (existing && existing.length) ? existing[0].id + 1 : 1;
    const { data: lastOrder } = await sb.from('todo_permanent_tasks').select('order_index').eq('user_id', currentUser.id).order('order_index', { ascending: false }).limit(1);
    const nextOrder = (lastOrder && lastOrder.length) ? lastOrder[0].order_index + 1 : 0;
    const { error } = await sb.from('todo_permanent_tasks').insert({
      id: newId, title, note, parent_id: actualParentId,
      user_id: currentUser.id, created_at: now, order_index: nextOrder
    });
    if (error) return alert('Error: ' + error.message);
  }
  closeModal();
  loadPermanentTasks();
}

async function deletePermanentTask(id) {
  if (!confirm('Delete this task and all its subtasks?')) return;
  const { data: children } = await sb.from('todo_permanent_tasks').select('id').eq('parent_id', id);
  const ids = [id];
  if (children) {
    for (const c of children) ids.push(c.id);
    const { data: grandchildren } = await sb.from('todo_permanent_tasks').select('id').in('parent_id', ids);
    if (grandchildren) for (const g of grandchildren) ids.push(g.id);
  }
  await sb.from('todo_permanent_task_logs').delete().in('task_id', ids);
  await sb.from('todo_permanent_tasks').delete().in('id', ids);
  loadPermanentTasks();
}


async function togglePermanentTask(taskId, completed, cb) {
  const date = istDateStr();
  if (!date) return;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Toggle children too
  const { data: children } = await sb.from('todo_permanent_tasks').select('id').eq('parent_id', taskId);
  const allIds = [taskId];
  if (children) for (const c of children) allIds.push(c.id);

  for (const id of allIds) {
    const { data: existing } = await sb.from('todo_permanent_task_logs').select('*')
      .eq('task_id', id).eq('user_id', currentUser.id).eq('log_date', date);

    if (existing && existing.length) {
      await sb.from('todo_permanent_task_logs').update({
        is_completed: completed ? 1 : 0,
        completed_at: completed ? now : null
      }).eq('id', existing[0].id);
    } else {
      const { data: last } = await sb.from('todo_permanent_task_logs').select('id').order('id', { ascending: false }).limit(1);
      const newId = (last && last.length) ? last[0].id + 1 : 1;
      await sb.from('todo_permanent_task_logs').insert({
        id: newId, task_id: id, user_id: currentUser.id,
        log_date: date, is_completed: completed ? 1 : 0,
        completed_at: completed ? now : null
      });
    }
  }
  if (cb) cb();
}


// ======= Time Tracking =======
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function msToIstStr(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0') + ' ' +
    String(d.getUTCHours()).padStart(2, '0') + ':' +
    String(d.getUTCMinutes()).padStart(2, '0') + ':' +
    String(d.getUTCSeconds()).padStart(2, '0');
}

function istToMs(str) {
  if (!str) return 0;
  const t = str.includes('T') ? str : str.replace(' ', 'T');
  return Date.parse(t + '+05:30') || 0;
}

function istNowStr() {
  return msToIstStr(Date.now());
}

function istDateStr() {
  return istNowStr().substring(0, 10);
}

function ttKey(type, id) {
  return type + ':' + id;
}

function to12hr(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return hhmm || '';
  const parts = hhmm.split(':');
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return hhmm;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + parts[1] + ' ' + ampm;
}

function formatDuration(sec) {
  if (!sec || sec < 0) return '0m';
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm ' + s + 's';
  return s + 's';
}

function formatElapsed(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function elapsedText(startTime) {
  return formatElapsed((Date.now() - istToMs(startTime)) / 1000);
}

function durationSeconds(entry) {
  if (entry.end_time) {
    if (entry.duration_seconds != null) return entry.duration_seconds;
    return Math.max(0, Math.round((istToMs(entry.end_time) - istToMs(entry.start_time)) / 1000));
  }
  return Math.max(0, Math.round((Date.now() - istToMs(entry.start_time)) / 1000));
}

async function loadRunningTrackers() {
  runningTrackers = {};
  if (!currentUser) return;
  const { data } = await sb.from('todo_time_tracking').select('*').eq('user_id', currentUser.id).is('end_time', null);
  if (data) data.forEach(t => { runningTrackers[ttKey(t.task_type, t.task_id)] = t; });
  updateTimerButtons();
}

function updateTimerButtons() {
  document.querySelectorAll('.tt-btn').forEach(function(btn) {
    const key = ttKey(btn.dataset.ttType, btn.dataset.ttId);
    const running = runningTrackers[key];
    btn.classList.toggle('btn-danger', !!running);
    btn.classList.toggle('btn-success', !running);
    btn.textContent = running ? 'Stop' : 'Start';
  });
}

async function stopTrackingRow(tr) {
  if (!tr || tr.end_time) return;
  const now = istNowStr();
  const duration = Math.max(0, Math.round((istToMs(now) - istToMs(tr.start_time)) / 1000));
  await sb.from('todo_time_tracking').update({ end_time: now, duration_seconds: duration }).eq('id', tr.id);
}

async function startTracking(type, id, title) {
  if (!currentUser) return;
  for (const k of Object.keys(runningTrackers)) {
    await stopTrackingRow(runningTrackers[k]);
  }
  const now = istNowStr();
  const { data: idExist } = await sb.from('todo_time_tracking').select('id').order('id', { ascending: false }).limit(1);
  const newId = (idExist && idExist.length) ? idExist[0].id + 1 : 1;
  const { error } = await sb.from('todo_time_tracking').insert({
    id: newId, task_id: id, task_type: type, task_title: title,
    user_id: currentUser.id, start_time: now, end_time: null, duration_seconds: null, created_at: now
  });
  if (error) return alert('Error: ' + error.message);
  await loadRunningTrackers();
}

async function toggleTracking(type, id, title) {
  const key = ttKey(type, id);
  if (runningTrackers[key]) {
    await stopTrackingRow(runningTrackers[key]);
    delete runningTrackers[key];
  } else {
    await startTracking(type, id, title);
  }
  updateTimerButtons();
  if (currentView === 'time') loadTimeTracking();
  loadPermanentTasks();
}

async function stopTracker(id) {
  const { data } = await sb.from('todo_time_tracking').select('*').eq('id', id).single();
  if (data) await stopTrackingRow(data);
  await loadRunningTrackers();
  loadTimeTracking();
}

async function deleteTimeEntry(id) {
  if (!confirm('Delete this time entry?')) return;
  await sb.from('todo_time_tracking').delete().eq('id', id);
  await loadRunningTrackers();
  loadTimeTracking();
  loadPermanentTasks();
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.tt-btn');
  if (btn) toggleTracking(btn.dataset.ttType, parseInt(btn.dataset.ttId), btn.dataset.ttTitle);
});

function setTimePeriod(p) {
  ttPeriod = p;
  document.querySelectorAll('#tt-period-tabs .contact-filter-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.period === p);
  });
  loadTimeTracking();
}

function resetTimeRangeToday() {
  const today = istDateStr();
  const f = document.getElementById('tt-from');
  const t = document.getElementById('tt-to');
  if (f) f.value = today;
  if (t) t.value = today;
  loadTimeTracking();
}

async function populateTimeTaskDropdown() {
  const sel = document.getElementById('tt-task');
  if (!sel) return;
  const { data: entries } = await sb.from('todo_time_tracking').select('task_id,task_type,task_title').eq('user_id', currentUser.id);
  const seen = {};
  const opts = [];
  if (entries) {
    entries.forEach(function(e) {
      const key = ttKey(e.task_type, e.task_id);
      if (!seen[key]) { seen[key] = true; opts.push({ key: key, label: e.task_title }); }
    });
  }
  opts.sort(function(a, b) { return a.label.localeCompare(b.label); });
  const prev = sel.value;
  sel.innerHTML = '<option value="">All Tasks</option>';
  opts.forEach(function(o) { sel.innerHTML += '<option value="' + escHtml(o.key) + '">' + escHtml(o.label) + '</option>'; });
  sel.value = prev;
}

async function loadTimeTracking() {
  if (!currentUser) return;
  await populateTimeTaskDropdown();
  const sel = document.getElementById('tt-task');
  const taskKey = sel ? sel.value : '';
  const fromEl = document.getElementById('tt-from');
  const toEl = document.getElementById('tt-to');
  const fromDate = fromEl ? fromEl.value : '';
  const toDate = toEl ? toEl.value : '';
  const { data: entries } = await sb.from('todo_time_tracking').select('*').eq('user_id', currentUser.id).order('start_time', { ascending: false });
  const chartEl = document.getElementById('tt-chart');
  const tableEl = document.getElementById('tt-table');
  if (!entries || !entries.length) {
    chartEl.innerHTML = '<p style="color:#666;text-align:center;padding:24px;">No time tracked yet. Go to the Todo list, press <strong>Start</strong> on a task, then <strong>Stop</strong> when done.</p>';
    tableEl.innerHTML = '';
    document.getElementById('tt-month-pivot').innerHTML = '<p style="color:#666;text-align:center;padding:16px;">No time tracked yet.</p>';
    document.getElementById('tt-year-pivot').innerHTML = '<p style="color:#666;text-align:center;padding:16px;">No time tracked yet.</p>';
    return;
  }
  let filtered = entries;
  if (taskKey) filtered = entries.filter(function(e) { return ttKey(e.task_type, e.task_id) === taskKey; });
  if (!filtered.length) {
    chartEl.innerHTML = '<p style="color:#666;text-align:center;padding:24px;">No entries for this task.</p>';
  } else {
    chartEl.innerHTML = renderTimeChart(filtered);
  }
  let tableEntries = filtered;
  if (fromDate) tableEntries = tableEntries.filter(function(e) { return (e.start_time || '').substring(0, 10) >= fromDate; });
  if (toDate) tableEntries = tableEntries.filter(function(e) { return (e.start_time || '').substring(0, 10) <= toDate; });
  renderTimeTable(tableEntries);
  renderMonthPivot(entries);
  renderYearPivot(entries);
}

function renderTimeChart(entries) {
  let data = [];
  if (ttPeriod === 'month') {
    const year = parseInt(document.getElementById('tt-year').value) || new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = {};
    entries.forEach(function(e) {
      const d = e.start_time.substring(0, 10);
      if (parseInt(d.substring(0, 4)) !== year) return;
      const m = parseInt(d.substring(5, 7)) - 1;
      buckets[m] = (buckets[m] || 0) + durationSeconds(e);
    });
    for (let m = 0; m < 12; m++) data.push({ label: months[m], value: buckets[m] || 0 });
  } else if (ttPeriod === 'year') {
    const buckets = {};
    entries.forEach(function(e) {
      const y = e.start_time.substring(0, 4);
      buckets[y] = (buckets[y] || 0) + durationSeconds(e);
    });
    Object.keys(buckets).sort().forEach(function(y) { data.push({ label: y, value: buckets[y] }); });
  } else {
    let month = document.getElementById('tt-month').value;
    if (!month) {
      const today = new Date();
      month = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    }
    const year = parseInt(month.substring(0, 4));
    const mon = parseInt(month.substring(5, 7));
    const daysInMonth = new Date(year, mon, 0).getDate();
    const buckets = {};
    entries.forEach(function(e) {
      const d = e.start_time.substring(0, 10);
      if (d.substring(0, 7) !== month) return;
      const day = parseInt(d.substring(8, 10));
      buckets[day] = (buckets[day] || 0) + durationSeconds(e);
    });
    for (let d = 1; d <= daysInMonth; d++) {
      data.push({ label: String(d), value: buckets[d] || 0, sub: new Date(year, mon - 1, d).toLocaleDateString('en', { weekday: 'short' }) });
    }
  }
  return renderBarChart(data);
}

function renderBarChart(data) {
  if (!data.length) return '<p style="color:#999;text-align:center;padding:20px;">No data.</p>';
  const max = Math.max.apply(null, data.map(function(d) { return d.value; }));
  const total = data.reduce(function(a, d) { return a + d.value; }, 0);
  let html = '<div style="font-size:13px;color:#666;margin-bottom:10px;">Total: <strong>' + formatDuration(total) + '</strong></div>';
  html += '<div style="display:flex;align-items:flex-end;gap:4px;height:220px;border-bottom:1px solid #ddd;">';
  data.forEach(function(d) {
    const pct = max > 0 ? Math.round(d.value / max * 100) : 0;
    const barH = Math.max(pct, d.value > 0 ? 3 : 1);
    html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0;">';
    if (d.value > 0) html += '<div style="font-size:10px;color:#666;margin-bottom:2px;white-space:nowrap;">' + formatDuration(d.value) + '</div>';
    html += '<div title="' + escHtml(d.label) + ': ' + formatDuration(d.value) + '" style="width:70%;max-width:44px;height:' + barH + '%;background:' + (d.value > 0 ? '#1a73e8' : '#eee') + ';border-radius:3px 3px 0 0;"></div>';
    html += '<div style="font-size:10px;color:#888;margin-top:4px;white-space:nowrap;">' + escHtml(d.label) + (d.sub ? ' <span style="color:#bbb;">' + escHtml(d.sub) + '</span>' : '') + '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function dtLocalValue(str) {
  if (!str) return '';
  return (str.length >= 16 ? str.substring(0, 16) : str).replace(' ', 'T');
}

async function updateTimeEntryTime(id, field, value) {
  const { data: entry } = await sb.from('todo_time_tracking').select('start_time,end_time').eq('id', id).single();
  if (!entry) return;
  const norm = function(v) {
    if (!v) return '';
    const s = v.replace('T', ' ');
    return s.length === 16 ? s + ':00' : s;
  };
  let start = entry.start_time;
  let end = entry.end_time;
  if (field === 'start') {
    const v = norm(value);
    if (v) start = v;
  } else {
    end = norm(value) || null;
  }
  if (start && end && istToMs(end) < istToMs(start)) {
    alert('End time cannot be before start time.');
    loadTimeTracking();
    return;
  }
  const update = { start_time: start };
  if (field === 'end') update.end_time = end;
  if (start && end) {
    update.duration_seconds = Math.max(0, Math.round((istToMs(end) - istToMs(start)) / 1000));
  } else {
    update.duration_seconds = null;
  }
  await sb.from('todo_time_tracking').update(update).eq('id', id);
  await loadRunningTrackers();
  loadTimeTracking();
}

function titleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

let ttPickTasks = [];
let ttPickId = '';

function taskPickerHTML() {
  return '<label>Task</label>' +
    '<div class="tt-picker">' +
    '<input type="text" id="tt-add-search" placeholder="Search or type a task..." autocomplete="off" oninput="filterTaskPicker()" onfocus="filterTaskPicker()" onkeydown="taskPickerKey(event)">' +
    '<div class="tt-picker-list" id="tt-add-list"></div>' +
    '</div>';
}

function renderTaskPickerList(filter) {
  const list = document.getElementById('tt-add-list');
  if (!list) return;
  const q = (filter || '').toLowerCase();
  let html = '<div class="tt-picker-opt" data-id="" onclick="selectTaskPicker(\'\', this)">Custom (type a title)...</div>';
  ttPickTasks.forEach(function(t) {
    if (q && String(t.title).toLowerCase().indexOf(q) === -1) return;
    const selected = ttPickId === String(t.id) ? ' selected' : '';
    html += '<div class="tt-picker-opt' + selected + '" data-id="' + t.id + '" onclick="selectTaskPicker(' + t.id + ', this)">' + escHtml(t.title) + '</div>';
  });
  list.innerHTML = html;
  list.style.display = 'block';
}

function selectTaskPicker(id, el) {
  ttPickId = String(id);
  const search = document.getElementById('tt-add-search');
  if (id === '') {
    if (search) search.value = '';
  } else if (el && el.textContent) {
    if (search) search.value = el.textContent;
  }
  const list = document.getElementById('tt-add-list');
  if (list) list.style.display = 'none';
  toggleCustomTaskInput();
}

function filterTaskPicker() {
  const search = document.getElementById('tt-add-search');
  renderTaskPickerList(search ? search.value : '');
}

function taskPickerKey(e) {
  if (e.key === 'Escape') {
    const list = document.getElementById('tt-add-list');
    if (list) list.style.display = 'none';
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const first = document.querySelector('#tt-add-list .tt-picker-opt:not([data-id=""])');
    if (first) first.click();
  }
}

async function showAddTimeEntryModal() {
  const { data: tasks } = await sb.from('todo_permanent_tasks').select('id,title').eq('user_id', currentUser.id).order('order_index');
  ttPickTasks = (tasks || []).map(function(t) { return { id: t.id, title: t.title }; });
  ttPickId = '';
  const now = istNowStr().substring(0, 16);
  const html = '<h3>Add Time Entry</h3>' +
    taskPickerHTML() +
    '<label>Custom Task Title</label><input type="text" id="tt-add-custom" placeholder="e.g. Deep work">' +
    '<label>Start (IST)</label><input type="datetime-local" id="tt-add-start" value="' + now + '">' +
    '<label>End (IST)</label><input type="datetime-local" id="tt-add-end">' +
    '<p style="font-size:12px;color:#888;margin:4px 0 0;">Leave End empty to start a running timer.</p>' +
    '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="saveTimeEntry()">Save</button></div>';
  showModal(html);
  renderTaskPickerList('');
  toggleCustomTaskInput();
}

function toggleCustomTaskInput() {
  const cust = document.getElementById('tt-add-custom');
  if (!cust) return;
  cust.style.display = ttPickId === '' ? '' : 'none';
}

function normDatetime(v) {
  if (!v) return '';
  const s = v.replace('T', ' ');
  return s.length === 16 ? s + ':00' : s;
}

async function saveTimeEntry(id) {
  const isCustom = ttPickId === '';
  const title = isCustom
    ? (document.getElementById('tt-add-custom').value || '').trim()
    : (ttPickTasks.find(function(t) { return String(t.id) === ttPickId; }) || {}).title || '';
  const start = normDatetime(document.getElementById('tt-add-start').value);
  const end = normDatetime(document.getElementById('tt-add-end').value) || null;
  if (!title) return alert('Task title is required');
  if (!start) return alert('Start time is required');
  if (end && istToMs(end) < istToMs(start)) return alert('End time cannot be before start time.');
  const taskType = isCustom ? 'manual' : 'permanent';
  const taskId = isCustom ? titleHash(title) : parseInt(ttPickId, 10);
  const duration = end ? Math.max(0, Math.round((istToMs(end) - istToMs(start)) / 1000)) : null;
  const payload = {
    task_id: taskId, task_type: taskType, task_title: title,
    start_time: start, end_time: end, duration_seconds: duration
  };
  if (id) {
    const { error } = await sb.from('todo_time_tracking').update(payload).eq('id', id);
    if (error) return alert('Error: ' + error.message);
  } else {
    const now = istNowStr();
    const { data: last } = await sb.from('todo_time_tracking').select('id').order('id', { ascending: false }).limit(1);
    const newId = (last && last.length) ? last[0].id + 1 : 1;
    const { error } = await sb.from('todo_time_tracking').insert({
      id: newId, user_id: currentUser.id, created_at: now, ...payload
    });
    if (error) return alert('Error: ' + error.message);
  }
  closeModal();
  await loadRunningTrackers();
  loadTimeTracking();
}

async function showEditTimeEntryModal(id) {
  const { data: entry } = await sb.from('todo_time_tracking').select('*').eq('id', id).single();
  if (!entry) return;
  const { data: tasks } = await sb.from('todo_permanent_tasks').select('id,title').eq('user_id', currentUser.id).order('order_index');
  const matched = entry.task_type === 'permanent' && tasks && tasks.some(function(t) { return t.id === entry.task_id; });
  let opts = '<option value="">Custom (type a title)...</option>';
  if (tasks) tasks.forEach(function(t) {
    const selected = (matched && t.id === entry.task_id) ? 'selected' : '';
    opts += '<option value="' + t.id + '" ' + selected + '>' + escHtml(t.title) + '</option>';
  });
  const html = '<h3>Edit Time Entry</h3>' +
    '<label>Task</label><select id="tt-add-task" onchange="toggleCustomTaskInput()">' + opts + '</select>' +
    '<label>Custom Task Title</label><input type="text" id="tt-add-custom" value="' + escHtml(entry.task_title || '') + '">' +
    '<label>Start (IST)</label><input type="datetime-local" id="tt-add-start" value="' + dtLocalValue(entry.start_time) + '">' +
    '<label>End (IST)</label><input type="datetime-local" id="tt-add-end" value="' + (entry.end_time ? dtLocalValue(entry.end_time) : '') + '">' +
    '<p style="font-size:12px;color:#888;margin:4px 0 0;">Leave End empty to mark as running.</p>' +
    '<div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="saveTimeEntry(' + id + ')">Save</button></div>';
  showModal(html);
  toggleCustomTaskInput();
}

document.addEventListener('change', function(e) {
  const startInp = e.target.closest('.tt-start-input');
  const endInp = e.target.closest('.tt-end-input');
  if (startInp) updateTimeEntryTime(parseInt(startInp.dataset.id), 'start', startInp.value);
  else if (endInp) updateTimeEntryTime(parseInt(endInp.dataset.id), 'end', endInp.value);
});

function renderTimeTable(entries) {
  const el = document.getElementById('tt-table');
  if (!entries || !entries.length) { el.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No entries in the selected date range.</p>'; return; }
  let total = 0;
  let html = '<table class="summary-table"><thead><tr><th class="task-row">Task</th><th>Type</th><th>Start (IST)</th><th>End (IST)</th><th>Duration</th><th></th></tr></thead><tbody>';
  entries.forEach(function(e) {
    const running = !e.end_time;
    const dur = durationSeconds(e);
    if (!running) total += dur;
    html += '<tr>' +
      '<td class="task-row">' + (e.task_title || '') + '</td>' +
      '<td>' + (e.task_type === 'daily' ? 'Daily' : 'Todo') + '</td>' +
      '<td><input type="datetime-local" step="1" class="tt-start-input" data-id="' + e.id + '" value="' + dtLocalValue(e.start_time) + '"></td>' +
      '<td>' +
        (running
          ? '<input type="datetime-local" step="1" class="tt-end-input" data-id="' + e.id + '" value="">' +
            '<div class="tt-running" data-start="' + escHtml(e.start_time) + '" style="color:#188038;font-weight:600;font-size:12px;">' + elapsedText(e.start_time) + '</div>'
          : '<input type="datetime-local" step="1" class="tt-end-input" data-id="' + e.id + '" value="' + dtLocalValue(e.end_time) + '">') +
      '</td>' +
      '<td><strong>' + formatDuration(dur) + '</strong></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-sm btn-secondary" onclick="showEditTimeEntryModal(' + e.id + ')">Edit</button> ' +
        (running ? '<button class="btn btn-sm btn-success" onclick="stopTracker(' + e.id + ')">Stop</button>' : '<button class="btn btn-sm btn-danger" onclick="deleteTimeEntry(' + e.id + ')">Del</button>') +
      '</td>' +
      '</tr>';
  });
  html += '<tr><td colspan="4" style="text-align:right;font-weight:600;">Total (completed)</td><td style="font-weight:700;color:#1a73e8;">' + formatDuration(total) + '</td><td></td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}

function shortDur(sec) {
  if (!sec) return '';
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return h + 'h' + (m ? m + 'm' : '');
  if (m > 0) return m + 'm';
  return sec + 's';
}

function renderMonthPivot(entries) {
  const el = document.getElementById('tt-month-pivot');
  if (!el) return;
  const month = document.getElementById('tt-month').value;
  if (!month) { el.innerHTML = '<p style="color:#666;text-align:center;padding:16px;">Select a month.</p>'; return; }
  const year = parseInt(month.substring(0, 4));
  const mon = parseInt(month.substring(5, 7));
  const daysInMonth = new Date(year, mon, 0).getDate();
  const taskMap = {};
  entries.forEach(function(e) {
    const d = (e.start_time || '').substring(0, 10);
    if (d.substring(0, 7) !== month) return;
    const key = ttKey(e.task_type, e.task_id);
    if (!taskMap[key]) taskMap[key] = { title: e.task_title || '', days: {} };
    const day = parseInt(d.substring(8, 10));
    taskMap[key].days[day] = (taskMap[key].days[day] || 0) + durationSeconds(e);
  });
  const keys = Object.keys(taskMap).sort(function(a, b) {
    return taskMap[a].title.localeCompare(taskMap[b].title);
  });
  if (!keys.length) { el.innerHTML = '<p style="color:#666;text-align:center;padding:16px;">No time tracked in this month.</p>'; return; }
  let html = '<table class="summary-table"><thead><tr><th class="task-row">Task</th>';
  for (let d = 1; d <= daysInMonth; d++) html += '<th style="font-size:10px;">' + d + '</th>';
  html += '<th style="min-width:60px;">Total</th></tr></thead><tbody>';
  keys.forEach(function(k) {
    const t = taskMap[k];
    let rowTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) rowTotal += t.days[d] || 0;
    html += '<tr><td class="task-row">' + escHtml(t.title) + '</td>';
    for (let d = 1; d <= daysInMonth; d++) {
      const v = t.days[d] || 0;
      html += v ? '<td title="' + escHtml(t.title) + ' day ' + d + ': ' + formatDuration(v) + '" style="color:#1a73e8;">' + shortDur(v) + '</td>' : '<td class="cell-none">-</td>';
    }
    html += '<td><strong>' + formatDuration(rowTotal) + '</strong></td></tr>';
  });
  let grandTotal = 0;
  html += '<tr style="background:#f8f9fa;"><td class="task-row" style="font-weight:700;">Total</td>';
  for (let d = 1; d <= daysInMonth; d++) {
    let colTotal = 0;
    keys.forEach(function(k) { colTotal += taskMap[k].days[d] || 0; });
    grandTotal += colTotal;
    html += colTotal ? '<td style="font-weight:700;color:#1a73e8;">' + shortDur(colTotal) + '</td>' : '<td class="cell-none">-</td>';
  }
  html += '<td style="font-weight:800;color:#1a73e8;">' + formatDuration(grandTotal) + '</td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}

function renderYearPivot(entries) {
  const el = document.getElementById('tt-year-pivot');
  if (!el) return;
  const year = document.getElementById('tt-year').value;
  if (!year) { el.innerHTML = '<p style="color:#666;text-align:center;padding:16px;">Select a year.</p>'; return; }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const taskMap = {};
  entries.forEach(function(e) {
    const d = (e.start_time || '').substring(0, 10);
    if (d.substring(0, 4) !== year) return;
    const key = ttKey(e.task_type, e.task_id);
    if (!taskMap[key]) taskMap[key] = { title: e.task_title || '', months: {} };
    const m = parseInt(d.substring(5, 7)) - 1;
    taskMap[key].months[m] = (taskMap[key].months[m] || 0) + durationSeconds(e);
  });
  const keys = Object.keys(taskMap).sort(function(a, b) {
    return taskMap[a].title.localeCompare(taskMap[b].title);
  });
  if (!keys.length) { el.innerHTML = '<p style="color:#666;text-align:center;padding:16px;">No time tracked in this year.</p>'; return; }
  let html = '<table class="summary-table"><thead><tr><th class="task-row">Task</th>';
  for (let m = 0; m < 12; m++) html += '<th style="font-size:11px;">' + months[m] + '</th>';
  html += '<th style="min-width:60px;">Total</th></tr></thead><tbody>';
  keys.forEach(function(k) {
    const t = taskMap[k];
    let rowTotal = 0;
    for (let m = 0; m < 12; m++) rowTotal += t.months[m] || 0;
    html += '<tr><td class="task-row">' + escHtml(t.title) + '</td>';
    for (let m = 0; m < 12; m++) {
      const v = t.months[m] || 0;
      html += v ? '<td title="' + escHtml(t.title) + ' ' + months[m] + ': ' + formatDuration(v) + '" style="color:#1a73e8;">' + shortDur(v) + '</td>' : '<td class="cell-none">-</td>';
    }
    html += '<td><strong>' + formatDuration(rowTotal) + '</strong></td></tr>';
  });
  let grandTotal = 0;
  html += '<tr style="background:#f8f9fa;"><td class="task-row" style="font-weight:700;">Total</td>';
  for (let m = 0; m < 12; m++) {
    let colTotal = 0;
    keys.forEach(function(k) { colTotal += taskMap[k].months[m] || 0; });
    grandTotal += colTotal;
    html += colTotal ? '<td style="font-weight:700;color:#1a73e8;">' + shortDur(colTotal) + '</td>' : '<td class="cell-none">-</td>';
  }
  html += '<td style="font-weight:800;color:#1a73e8;">' + formatDuration(grandTotal) + '</td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}

// Mobile sidebar
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  var item = e.target.closest('.nav-item');
  if (item && window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }
});

// Live elapsed timers for running time-tracking entries
setInterval(function() {
  document.querySelectorAll('.tt-running').forEach(function(span) {
    span.textContent = elapsedText(span.getAttribute('data-start'));
  });
}, 1000);

// Auto-refresh daily schedule every 60s to keep current-task highlight updated
setInterval(function() {
  if (!currentUser) return;
  if (currentView === 'contacts') loadContacts();
  if (currentView === 'time') loadTimeTracking();
  loadRunningTrackers();
}, 60000);

// Init
checkAuth();
