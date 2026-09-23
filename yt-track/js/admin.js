// admin.js — admin portal (manage parents/children/plans, view all tenant links).
let app = null;
let users = [];
let tenantLinks = [];

async function init() {
  app = await guardPage('admin');
  if (!app) return;
  el('admin-tabs').addEventListener('click', onTabClick);
  el('admin-add-child').addEventListener('submit', onSubmitAdminChild);
  await Promise.all([loadUsers(), loadLinks()]);
}

function onTabClick(e) {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  el('users-panel').classList.toggle('hidden', tab.dataset.panel !== 'users');
  el('links-panel').classList.toggle('hidden', tab.dataset.panel !== 'links');
}

// ---------- Users: parents & children ----------

async function loadUsers() {
  try {
    [users, tenantLinks] = await Promise.all([db.listTenantUsers(), db.listTenantLinks()]);
  } catch (err) {
    el('admin-users').innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
    return;
  }
  const countByUser = {};
  tenantLinks.forEach(l => { countByUser[l.user_id] = (countByUser[l.user_id] || 0) + 1; });

  const parents = users.filter(u => u.role === 'parent' || u.role === 'admin');
  const children = users.filter(u => u.role === 'child');
  const byParent = {};
  children.forEach(c => {
    if (c.parent_id) (byParent[c.parent_id] = byParent[c.parent_id] || []).push(c);
  });

  const parentSel = el('admin-child-parent');
  parentSel.innerHTML = parents.map(p =>
    '<option value="' + p.id + '">' + esc(p.email) + (p.role === 'admin' ? ' (admin)' : '') + '</option>'
  ).join('') || '<option value="">No parents yet</option>';
  parentSel.disabled = !parents.length;

  const eff = (u) => {
    if (u.plan && u.plan !== 'free' && u.plan_expires_at && new Date(u.plan_expires_at).getTime() > Date.now()) return u.plan;
    return 'free';
  };

  const rows = parents.map(p => {
    const kids = byParent[p.id] || [];
    const vid = countByUser[p.id] || 0;
    const plan = eff(p);
    return '<div class="parent-row" data-id="' + p.id + '">'
      + '<div class="parent-main">'
      + '<span class="p-email">' + esc(p.email) + '</span>'
      + '<span class="badge ' + (p.role === 'admin' ? 'ok' : '') + '">' + esc(p.role) + '</span>'
      + '<span class="p-plan">' + esc(plan) + (p.plan_expires_at && plan !== 'free' ? ' &middot; till ' + formatDate(p.plan_expires_at) : '') + '</span>'
      + '</div>'
      + '<span class="p-usage">' + vid + ' videos &middot; ' + kids.length + ' child' + (kids.length === 1 ? '' : 'ren') + '</span>'
      + '<button class="btn btn-outline btn-small" data-act="kids">Children (' + kids.length + ')</button>'
      + '<select class="input plan-select" data-pid="' + p.id + '" data-cur="' + plan + '">'
      + ['free', 'bronze', 'silver', 'gold'].map(r =>
          '<option value="' + r + '"' + (plan === r ? ' selected' : '') + '>' + r + '</option>'
        ).join('')
      + '</select>'
      + '<button class="btn btn-outline btn-small" data-act="setplan">Set plan</button>'
      + (p.role !== 'admin' ? '<button class="btn btn-outline btn-small danger" data-act="del">Delete</button>' : '')
      + '<div class="parent-kids hidden" data-kids-for="' + p.id + '">'
      + (kids.length
          ? kids.map(k => '<div class="child-row" data-id="' + k.id + '"><span class="child-main"><span class="child-name">' + esc(k.email) + '</span></span><span class="badge ' + (k.status === 'active' ? 'ok' : 'warn') + '">' + esc(k.status) + '</span><button class="btn btn-outline btn-small danger" data-act="delchild">Unlink</button></div>').join('')
          : '<p class="empty">No children yet.</p>')
      + '</div>'
      + '</div>';
  });
  el('admin-users').innerHTML = rows.join('') || '<p class="empty">No parents in this workspace yet.</p>';

  el('admin-users').querySelectorAll('.parent-row').forEach(row => {
    const pid = row.dataset.id;
    row.querySelector('[data-act="kids"]').addEventListener('click', () => {
      const area = row.querySelector('.parent-kids');
      area.classList.toggle('hidden');
    });
    const delBtn = row.querySelector('[data-act="del"]');
    if (delBtn) delBtn.addEventListener('click', async () => {
      if (!confirm('Delete this parent? Their videos, children links and progress are all removed.')) return;
      try {
        await db.deleteUser(pid);
        toast('Parent deleted.');
        await Promise.all([loadUsers(), loadLinks()]);
      } catch (err) {
        toast(err.message, true);
      }
    });
    const sel = row.querySelector('.plan-select');
    row.querySelector('[data-act="setplan"]').addEventListener('click', async () => {
      const plan = sel.value;
      const expiresAt = plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      try {
        await db.setPlan(pid, plan, expiresAt);
        toast('Plan set to ' + plan + (expiresAt ? ' (30 days)' : '') + '.');
        await loadUsers();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  el('admin-users').querySelectorAll('[data-act="delchild"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.closest('.child-row').dataset.id;
      if (!confirm('Unlink this child from their parent?')) return;
      try {
        await db.unlinkChild(cid);
        toast('Child unlinked.');
        await loadUsers();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

async function onSubmitAdminChild(e) {
  e.preventDefault();
  const parentId = el('admin-child-parent').value;
  if (!parentId) { toast('Select a parent first.', true); return; }
  try {
    await db.createChild({
      name: el('admin-child-name').value.trim(),
      email: el('admin-child-email').value.trim(),
      pin: el('admin-child-pin').value.trim(),
      parent_id: parentId,
    });
    el('admin-child-name').value = '';
    el('admin-child-email').value = '';
    el('admin-child-pin').value = '';
    toast('Child added.');
    await loadUsers();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Links (all tenant) ----------

async function loadLinks() {
  let rows = [];
  try {
    tenantLinks = await db.listTenantLinks();
  } catch (err) {
    el('admin-links').innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
    return;
  }
  rows = tenantLinks.map(l =>
    '<div class="link-row" data-id="' + l.id + '">'
    + '<label class="watch-check"><input type="checkbox" class="link-watch"' + (l.watched ? ' checked' : '') + '></label>'
    + '<div class="link-main">'
    + '<a class="link-title" href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow">' + esc(l.title || shortUrl2(l.url)) + '</a>'
    + '<div class="link-url-meta">' + esc(l.owner_email || '') + (l.category ? ' \u00b7 ' + esc(l.category) : '') + (l.title ? ' \u00b7 ' + esc(shortUrl2(l.url)) : '') + '</div>'
    + '</div>'
    + '<button class="btn btn-outline btn-small link-del">Delete</button>'
    + '</div>'
  );
  el('admin-links').innerHTML = rows.join('') || '<p class="empty">No links in this workspace yet.</p>';

  el('admin-links').querySelectorAll('.link-row').forEach(row => {
    const id = row.dataset.id;
    const link = tenantLinks.find(x => String(x.id) === id);
    const titleEl = row.querySelector('.link-title');
    if (titleEl) titleEl.addEventListener('click', (e) => {
      if (link && openVideoPlayer(link.url)) e.preventDefault();
    });
    row.querySelector('.link-watch').addEventListener('change', async (e) => {
      try {
        await db.setWatched(id, e.target.checked);
      } catch (err) {
        e.target.checked = !e.target.checked;
        toast(err.message, true);
      }
    });
    row.querySelector('.link-del').addEventListener('click', async () => {
      if (!confirm('Delete this link?')) return;
      try {
        await db.deleteLink(id);
        await Promise.all([loadUsers(), loadLinks()]);
        toast('Link deleted.');
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

function shortUrl2(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname.slice(0, 24));
  } catch (e) {
    return String(url || '').slice(0, 40);
  }
}

init();