// admin.js — admin portal (manage tenant users, view all links in the workspace).
let app = null;

async function init() {
  app = await guardPage('admin');
  if (!app) return;

  el('admin-tabs').addEventListener('click', onTabClick);
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

async function loadUsers() {
  let users = [];
  try {
    users = await db.listTenantUsers();
  } catch (err) {
    el('admin-users').innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
    return;
  }

  const rows = users.map(u => {
    const opts = ['admin', 'user'].map(r =>
      '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + r + '</option>'
    ).join('');
    return '<div class="user-row" data-user-id="' + u.id + '">'
      + '<div class="user-email">' + esc(u.email) + '</div>'
      + '<select class="role-select" data-current="' + esc(u.role) + '">' + opts + '</select>'
      + '<div class="user-created">' + formatDate(u.created_at) + '</div>'
      + '</div>';
  });
  el('admin-users').innerHTML = rows.join('') || '<p class="empty">No users in this workspace yet.</p>';

  el('admin-users').querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', () => changeRole(sel));
  });
}

async function changeRole(sel) {
  const row = sel.closest('.user-row');
  const uid = row.dataset.userId;
  const role = sel.value;
  sel.disabled = true;
  try {
    await db.setUserRole(uid, role);
    toast('Role updated to "' + role + '".');
  } catch (err) {
    sel.value = sel.dataset.current;
    toast(err.message, true);
  } finally {
    sel.disabled = false;
  }
}

async function loadLinks() {
  let links = [];
  try {
    links = await db.listTenantLinks();
  } catch (err) {
    el('admin-links').innerHTML = '<p class="empty">' + esc(err.message) + '</p>';
    return;
  }

  const rows = links.map(l =>
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
    const link = links.find(x => String(x.id) === id);
    row.querySelector('.link-title').addEventListener('click', (e) => {
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
        await loadLinks();
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