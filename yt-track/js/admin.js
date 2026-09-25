// admin.js — admin portal (see & manage every user across tenants, manage plans, view all links).
let app = null;
let users = [];
let children = [];
let tenantLinks = [];
let userFilter = '';

const PLAN_ORDER = ['free', 'bronze', 'silver', 'gold'];

async function init() {
  app = await guardPage('admin');
  if (!app) return;
  el('admin-tabs').addEventListener('click', onTabClick);
  el('admin-add-child').addEventListener('submit', onSubmitAdminChild);
  el('admin-add-link').addEventListener('submit', onSubmitAdminLink);
  el('admin-user-search').addEventListener('input', (e) => {
    userFilter = e.target.value.trim().toLowerCase();
    renderUsers();
  });
  await Promise.all([loadUsers(), loadLinks()]);
}

async function onSubmitAdminLink(e) {
  e.preventDefault();
  const url = el('admin-link-url').value.trim();
  if (!url) { toast('Paste a YouTube link first.', true); return; }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await db.addLink({ url, title: el('admin-link-title').value.trim() || null });
    el('admin-link-url').value = '';
    el('admin-link-title').value = '';
    toast('Link added.');
    await Promise.all([loadUsers(), loadLinks()]);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

function onTabClick(e) {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  el('users-panel').classList.toggle('hidden', tab.dataset.panel !== 'users');
  el('links-panel').classList.toggle('hidden', tab.dataset.panel !== 'links');
}

// ---------- All users (parents + children, every tenant) ----------

async function loadUsers() {
  try {
    [users, children, tenantLinks] = await Promise.all([
      db.listTenantUsers(),
      db.adminListChildren(),
      db.listTenantLinks(),
    ]);
  } catch (err) {
    el('admin-users').innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
    return;
  }
  renderUsers();
}

function effPlan(u) {
  if (u.plan && u.plan !== 'free' && u.plan_expires_at && new Date(u.plan_expires_at).getTime() > Date.now()) return u.plan;
  return 'free';
}

function parentOptions(selected) {
  return users
    .filter(u => u.role === 'parent')
    .map(p => '<option value="' + p.id + '"' + (selected === p.id ? ' selected' : '') + '>' + esc(p.email) + '</option>')
    .join('') || '<option value="">No parents</option>';
}

function renderUsers() {
  const countByUser = {};
  tenantLinks.forEach(l => { countByUser[l.user_id] = (countByUser[l.user_id] || 0) + 1; });
  const kidsByParent = {};
  children.forEach(c => { (kidsByParent[c.parent_id] = kidsByParent[c.parent_id] || []).push(c); });

  const sel = el('admin-child-parent');
  sel.innerHTML = parentOptions();
  sel.disabled = !users.some(u => u.role === 'parent');

  const stats = {
    total: users.length,
    parents: users.filter(u => u.role === 'parent').length,
    children: users.filter(u => u.role === 'child').length,
    admins: users.filter(u => u.role === 'admin').length,
  };
  el('admin-stats').innerHTML =
    '<span>' + stats.total + ' users</span><span>' + stats.parents + ' parents</span>'
    + '<span>' + stats.children + ' children</span><span>' + stats.admins + ' admins</span>';

  const rows = users
    .filter(u => !userFilter || String(u.email || '').toLowerCase().includes(userFilter))
    .map(u => renderUserRow(u, countByUser[u.id] || 0, kidsByParent[u.id] || []));

  el('admin-users').innerHTML = rows.join('') || '<p class="empty">No users found.</p>';
  bindUserActions();
}

function renderUserRow(u, videos, kids) {
  const isAdmin = u.role === 'admin';
  const isChild = u.role === 'child';
  const plan = effPlan(u);
  const kidRow = isChild ? (children.find(c => c.parent_id === u.parent_id && String(c.email).toLowerCase() === String(u.email).toLowerCase())) : null;

  const info = isChild
    ? '<span class="p-plan">&rarr; ' + esc(kidRow ? kidRow.parent_email : '') + '</span>'
      + '<span class="badge ' + (kidRow && kidRow.status === 'active' ? 'ok' : 'warn') + '">' + esc(kidRow ? kidRow.status : 'unlinked') + '</span>'
    : isAdmin
      ? '<span class="p-plan">super admin</span>'
      : '<span class="p-plan">' + esc(plan) + (plan !== 'free' && u.plan_expires_at ? ' &middot; till ' + formatDate(u.plan_expires_at) : '') + '</span>'
        + '<span class="p-usage">' + videos + ' videos &middot; ' + kids.length + ' child' + (kids.length === 1 ? '' : 'ren') + '</span>';

  let controls = '';

  if (!isAdmin) {
    // Role switcher (parent <-> child) with parent picker for children
    controls += '<select class="input plan-select user-role" data-role-sel>' 
      + '<option value="parent"' + (!isChild ? ' selected' : '') + '>parent</option>'
      + '<option value="child"' + (isChild ? ' selected' : '') + '>child</option>'
      + '</select>';
    controls += '<select class="input plan-select user-parent hidden" data-parent-sel data-empty-opt>' + parentOptions(u.parent_id) + '</select>';
    controls += '<button class="btn btn-outline btn-small" data-act="saverole">Save role</button>';

    if (!isChild) {
      controls += '<select class="input plan-select user-plan" data-plan-sel data-cur="' + plan + '">'
        + PLAN_ORDER.map(r => '<option value="' + r + '"' + (plan === r ? ' selected' : '') + '>' + r + '</option>').join('')
        + '</select>';
      controls += '<button class="btn btn-outline btn-small" data-act="setplan">Set plan</button>';
    } else {
      controls += '<button class="btn btn-outline btn-small" data-act="editchild">Edit child</button>';
    }

    controls += (u.id !== app.profile.id
      ? '<button class="btn btn-outline btn-small danger" data-act="del">Delete</button>'
      : '');
  }

  return '<div class="parent-row user-row" data-id="' + u.id + '" data-role="' + u.role + '">'
    + '<div class="parent-main">'
    + '<span class="p-email">' + esc(u.email) + '</span>'
    + '<span class="badge ' + (isAdmin ? 'ok' : (isChild ? 'warn' : '')) + '">' + esc(u.role) + '</span>'
    + info
    + '</div>'
    + controls
    + (isChild ? '<div class="parent-kids hidden" data-edit-child="' + u.id + '"></div>' : '')
    + '</div>';
}

function bindUserActions() {
  // Toggle parent picker visibility when the role select changes
  el('admin-users').querySelectorAll('.user-row').forEach(row => {
    const roleSel = row.querySelector('[data-role-sel]');
    const parentSel = row.querySelector('[data-parent-sel]');
    if (roleSel && parentSel) {
      const sync = () => parentSel.classList.toggle('hidden', roleSel.value !== 'child');
      roleSel.addEventListener('change', sync);
      sync();
    }
  });

  el('admin-users').querySelectorAll('[data-act="saverole"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.user-row');
      const id = row.dataset.id;
      const role = row.querySelector('[data-role-sel]').value;
      const parentId = row.querySelector('[data-parent-sel]').value;
      if (role === 'child' && !parentId) { toast('Choose a parent for this child.', true); return; }
      try {
        await db.adminSetUser(id, { role, parent_id: role === 'child' ? parentId : null });
        toast('Role updated.');
        await loadUsers();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  el('admin-users').querySelectorAll('[data-act="setplan"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.user-row');
      const id = row.dataset.id;
      const plan = row.querySelector('[data-plan-sel]').value;
      try {
        await db.adminSetUser(id, { plan });
        toast('Plan set to ' + plan + (plan !== 'free' ? ' (30 days)' : '') + '.');
        await loadUsers();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });

  el('admin-users').querySelectorAll('[data-act="editchild"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.user-row');
      const id = row.dataset.id;
      const user = users.find(u => u.id === id);
      const kid = children.find(c => c.parent_id === user.parent_id && String(c.email).toLowerCase() === String(user.email).toLowerCase());
      const area = row.querySelector('[data-edit-child]');
      if (!area) return;
      const open = area.classList.contains('hidden');
      if (open && kid) {
        area.innerHTML =
          '<div class="child-edit">'
          + '<input class="input ec-name" value="' + esc(kid.name || '') + '" placeholder="Name">'
          + '<input class="input ec-email" value="' + esc(kid.email || '') + '" placeholder="Google email">'
          + '<input class="input pin-input ec-pin" maxlength="4" inputmode="numeric" value="' + esc(kid.pin || '') + '" placeholder="PIN">'
          + '<button class="btn btn-primary btn-small" data-act="savechild">Save</button>'
          + '</div>';
        area.querySelector('[data-act="savechild"]').addEventListener('click', async () => {
          try {
            await db.updateChild(kid.id, {
              name: area.querySelector('.ec-name').value.trim(),
              email: area.querySelector('.ec-email').value.trim(),
              pin: area.querySelector('.ec-pin').value.trim(),
            });
            toast('Child updated.');
            await loadUsers();
          } catch (err) {
            toast(err.message, true);
          }
        });
      } else if (!kid) {
        area.innerHTML = '<p class="empty">No invite row to edit.</p>';
      }
      area.classList.toggle('hidden');
    });
  });

  el('admin-users').querySelectorAll('[data-act="del"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.user-row');
      const id = row.dataset.id;
      if (!confirm('Delete this user? Their links, children and progress are removed.')) return;
      try {
        await db.adminDeleteUser(id);
        toast('User deleted.');
        await Promise.all([loadUsers(), loadLinks()]);
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

// ---------- All links (every tenant) ----------

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
    + '<button class="btn btn-outline btn-small link-edit">Edit</button>'
    + '<button class="btn btn-outline btn-small link-del">Delete</button>'
    + '<div class="link-edit-area hidden">'
    + '<input class="input le-title" value="' + esc(l.title || '') + '" placeholder="Title of link" autocomplete="off">'
    + '<input class="input le-url" value="' + esc(l.url) + '" placeholder="YouTube link" autocomplete="off">'
    + '<button class="btn btn-primary btn-small le-save">Save</button>'
    + '<button class="btn btn-outline btn-small le-cancel">Cancel</button>'
    + '</div>'
    + '</div>'
  );
  el('admin-links').innerHTML = rows.join('') || '<p class="empty">No links yet.</p>';

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
    row.querySelector('.link-edit').addEventListener('click', () => {
      row.querySelector('.link-edit-area').classList.toggle('hidden');
    });
    row.querySelector('.le-cancel').addEventListener('click', () => {
      row.querySelector('.link-edit-area').classList.add('hidden');
    });
    row.querySelector('.le-save').addEventListener('click', async () => {
      const url = row.querySelector('.le-url').value.trim();
      if (!url) { toast('Link URL is required.', true); return; }
      try {
        await db.updateLink(id, {
          title: row.querySelector('.le-title').value.trim() || null,
          url,
        });
        await Promise.all([loadUsers(), loadLinks()]);
        toast('Link updated.');
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