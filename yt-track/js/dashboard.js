// dashboard.js — parent view (manage links/categories/children, upgrade plan)
// and child view (watch only the parent's videos with personal progress).
let app = null;
let links = [];
let categories = [];
let filterCat = '';
let progressMap = {};
let children = [];
let plans = [];
let familyProgress = [];
let isChild = false;
let planMode = 'links';

async function init() {
  app = await guardPage();
  if (!app) return;
  const p = app.profile;
  isChild = p.role === 'child' && !!p.parent_id;
  el('user-email').textContent = p.email;

  if (isChild) await setupChildView();
  else await setupParentView();

  try {
    await loadCategories();
  } catch (err) {
    toast(err.message, true);
  }
  el('filter-cat').addEventListener('change', (e) => { filterCat = e.target.value; renderLinks(); });
  planMode = isChild ? 'videos' : 'links';
  await loadLinks();
  if (!isChild) {
    renderPlanPanel();
    if (app.profile.role !== 'admin' && (links.length > 0 || children.length > 0)) {
      el('join-panel').classList.add('hidden');
    }
  }
}

// ---------- Role setup ----------

async function setupChildView() {
  el('add-link-form').classList.add('hidden');
  el('categories-panel').classList.add('hidden');
  el('plan-panel').classList.add('hidden');
  el('children-panel').classList.add('hidden');
  el('join-panel').classList.add('hidden');
  el('child-banner').classList.remove('hidden');
  const parent = await db.parentProfile(app.profile.parent_id);
  const pName = parent && parent.email ? parent.email : 'your parent';
  el('child-banner-title').textContent = 'Videos from ' + pName;
  el('child-parent-email').textContent = 'Only ' + pName + ' can add videos here. You can mark your own progress.';
  try {
    const prog = await db.listMyProgress();
    progressMap = {};
    (prog || []).forEach(x => { progressMap[x.link_id] = !!x.watched; });
  } catch (err) { /* ignore */ }
}

async function setupParentView() {
  const p = app.profile;
  el('add-link-form').classList.remove('hidden');
  el('join-panel').classList.toggle('hidden', p.role === 'admin');
  el('plan-panel').classList.remove('hidden');
  el('children-panel').classList.remove('hidden');
  el('add-link-form').addEventListener('submit', onSubmitLink);
  el('add-category-form').addEventListener('submit', onSubmitCategory);
  el('add-child-form').addEventListener('submit', onSubmitChild);
  el('join-form').addEventListener('submit', onSubmitJoin);

  try {
    plans = await db.listPlans();
    children = await db.listChildren(null);
    familyProgress = await db.familyProgress();
  } catch (err) {
    toast(err.message, true);
    plans = plans || [];
    children = children || [];
    familyProgress = familyProgress || [];
  }
  renderPlanPanel();
  renderChildren();
}

// ---------- Categories ----------

function categoryOptionsHtml() {
  return buildFlat(categories).map(c =>
    '<option value="' + c.id + '">' + '\u00A0'.repeat(c.depth) + esc(c.name) + '</option>'
  ).join('');
}

async function loadCategories() {
  categories = await db.listCategories();
  const parentSel = el('category-parent');
  if (parentSel) parentSel.innerHTML = '<option value="">No parent (root)</option>' + categoryOptionsHtml();
  const linkSel = el('link-category');
  if (!isChild && linkSel) linkSel.innerHTML = '<option value="">No category</option>' + categoryOptionsHtml();
  fillFilterOptions();
  if (!isChild) renderCategoryTree();
}

function fillFilterOptions() {
  const sel = el('filter-cat');
  const current = sel.value;
  sel.innerHTML = '<option value="">All ' + planMode + '</option>' + categoryOptionsHtml();
  sel.value = current;
}

async function onSubmitCategory(e) {
  e.preventDefault();
  const name = el('category-name').value.trim();
  if (!name) { toast('Enter a category name.', true); return; }
  const parent_id = el('category-parent').value || null;
  try {
    await db.createCategory({ name, parent_id });
    el('category-name').value = '';
    await loadCategories();
    toast('Category added.');
  } catch (err) {
    toast(err.message, true);
  }
}

function renderCategoryTree() {
  const container = el('category-tree');
  const flat = buildFlat(categories);
  if (!flat.length) {
    container.innerHTML = '<p class="empty">No categories yet. Create one above.</p>';
    return;
  }
  const counts = {};
  links.forEach(l => { if (l.category_id) counts[l.category_id] = (counts[l.category_id] || 0) + 1; });

  container.innerHTML = flat.map(c =>
    '<div class="cat-node" data-id="' + c.id + '" style="padding-left:' + (Math.min(c.depth, 8) * 16) + 'px">'
    + '<span class="cat-name">' + esc(c.name) + '</span>'
    + '<span class="cat-count">' + (counts[c.id] || 0) + '</span>'
    + '<span class="cat-actions">'
    + '<button class="btn btn-outline btn-small" data-act="child" title="Add child category">+</button>'
    + '<button class="btn btn-outline btn-small" data-act="rename" title="Rename">&#9998;</button>'
    + '<button class="btn btn-outline btn-small danger" data-act="del" title="Delete">&#10005;</button>'
    + '</span>'
    + '</div>'
  ).join('');

  container.querySelectorAll('.cat-node').forEach(node => {
    node.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onCatAction(node.dataset.id, btn.dataset.act);
      });
    });
  });
}

function catName(id) {
  const c = categories.find(x => String(x.id) === String(id));
  return c ? c.name : '';
}

function closeCatEdit() {
  document.querySelectorAll('.cat-edit').forEach(x => x.remove());
}

function openCatEdit(catId, kind) {
  closeCatEdit();
  const node = document.querySelector('.cat-node[data-id="' + catId + '"]');
  if (!node) return;

  const row = document.createElement('div');
  row.className = 'cat-edit';
  const input = document.createElement('input');
  input.className = 'input';
  if (kind === 'rename') input.value = catName(catId);
  else input.placeholder = 'Child category name';
  const save = document.createElement('button');
  save.className = 'btn btn-small btn-primary';
  save.textContent = kind === 'rename' ? 'Rename' : 'Add';
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-small btn-outline';
  cancel.textContent = 'Cancel';
  row.append(input, save, cancel);
  node.after(row);
  input.focus();

  save.addEventListener('click', async () => {
    const name = input.value.trim();
    if (!name) return;
    try {
      if (kind === 'rename') await db.updateCategory(catId, { name });
      else await db.createCategory({ name, parent_id: catId });
      toast(kind === 'rename' ? 'Category renamed.' : 'Child category added.');
      await loadCategories();
    } catch (err) {
      toast(err.message, true);
    }
  });
  cancel.addEventListener('click', closeCatEdit);
}

async function onCatAction(id, act) {
  if (act === 'rename') { openCatEdit(id, 'rename'); return; }
  if (act === 'child') { openCatEdit(id, 'child'); return; }
  if (act === 'del') {
    if (!confirm('Delete this category? Its child categories are removed too and links lose their assignment.')) return;
    try {
      await db.deleteCategory(id);
      await loadCategories();
      toast('Category deleted.');
    } catch (err) {
      toast(err.message, true);
    }
  }
}

// ---------- Links ----------

async function loadLinks() {
  try {
    links = await db.listLinks();
  } catch (err) {
    toast(err.message, true);
    links = links || [];
  }
  renderSummary();
  renderLinks();
}

function renderSummary() {
  const total = links.length;
  let watched = 0;
  if (isChild) watched = links.filter(l => progressMap[l.id]).length;
  else watched = links.filter(l => l.watched).length;
  const label = isChild ? 'video' : 'link';
  el('overall-progress').innerHTML =
    '<div class="summary-text">' + total + ' ' + label + (total === 1 ? '' : 's') + ' &middot; ' + watched + ' watched</div>'
    + renderProgressBar(percentFromCounts(watched, total));
}

function renderLinks() {
  const container = el('link-list');
  const list = filterCat ? links.filter(l => String(l.category_id) === filterCat) : links;
  if (!list.length) {
    container.innerHTML = isChild
      ? '<p class="empty">No videos yet. Ask your parent to add some.</p>'
      : '<p class="empty">No links yet. Paste a YouTube link above to start tracking.</p>';
    return;
  }
  container.innerHTML = list.map(renderLinkRow).join('');

  container.querySelectorAll('.link-row').forEach(row => {
    const id = row.dataset.id;
    const link = links.find(x => String(x.id) === id);
    const titleEl = row.querySelector('.link-title');
    if (titleEl) titleEl.addEventListener('click', (e) => {
      if (link && openVideoPlayer(link.url)) e.preventDefault();
    });

    if (isChild) {
      const cb = row.querySelector('.link-watch');
      if (cb) cb.addEventListener('change', async (e) => {
        const prev = e.target.checked;
        try {
          await db.setProgress(id, prev);
          progressMap[id] = prev;
          renderSummary();
          renderLinks();
        } catch (err) {
          e.target.checked = !prev;
          toast(err.message, true);
        }
      });
      return;
    }

    row.querySelector('.link-watch').addEventListener('change', async (e) => {
      const prev = e.target.checked;
      try {
        await db.setWatched(id, prev);
        await loadLinks();
      } catch (err) {
        e.target.checked = !prev;
        toast(err.message, true);
      }
    });
    row.querySelector('.link-cat').addEventListener('change', async (e) => {
      try {
        await db.updateLink(id, { category_id: e.target.value || null });
        await loadLinks();
      } catch (err) {
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

function renderLinkRow(l) {
  const label = linkLabel(l);
  const canPlay = !!youtubeVideoId(l.url);
  const done = isChild ? progressMap[l.id] : l.watched;
  const row = '<div class="link-row' + (done ? ' done' : '') + '" data-id="' + l.id + '">'
    + '<label class="watch-check"><input type="checkbox" class="link-watch"' + (done ? ' checked' : '') + '></label>'
    + (canPlay ? '<span class="play-badge" title="Play inline">&#9654;</span>' : '')
    + '<div class="link-main">'
    + '<a class="link-title" href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow">' + esc(label) + '</a>'
    + '<div class="link-url-meta">' + esc(shortUrl(l.url)) + (l.category ? ' &middot; ' + esc(l.category) : '') + '</div>'
    + '</div>';
  if (isChild) return row + '</div>';
  return row + linkCatSelect(l)
    + '<button class="btn btn-outline btn-small link-del">Delete</button>'
    + '</div>';
}

function linkCatSelect(l) {
  return '<select class="input link-cat">'
    + '<option value="">None</option>'
    + buildFlat(categories).map(c =>
        '<option value="' + c.id + '"' + (String(c.id) === String(l.category_id) ? ' selected' : '') + '>'
        + '\u00A0'.repeat(c.depth) + esc(c.name)
        + '</option>'
      ).join('')
    + '</select>';
}

async function onSubmitLink(e) {
  e.preventDefault();
  const url = el('link-url').value.trim();
  if (!url) { toast('Paste a YouTube link first.', true); return; }
  const category_id = el('link-category').value || null;
  const btn = el('add-link-submit');
  btn.disabled = true;
  try {
    await db.addLink({ url, category_id });
    el('link-url').value = '';
    await loadLinks();
    if (!isChild) renderCategoryTree();
    toast('Link added.');
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// ---------- Children (parent) ----------

function renderChildren() {
  const container = el('children-list');
  if (!children.length) {
    container.innerHTML = '<p class="empty">No children yet. Add one above with their Google email and a 4-digit PIN.</p>';
    return;
  }
  const total = links.length;
  container.innerHTML = children.map(c => {
    const cEmail = c.child_email || c.email;
    const watched = familyProgress.filter(f => f.child_email === cEmail && f.watched).length;
    return '<div class="child-row" data-id="' + c.id + '">'
      + '<div class="child-main">'
      + '<span class="child-name">' + esc(c.name) + '</span>'
      + '<span class="child-email">' + esc(c.email) + ' &middot; PIN ' + esc(c.pin) + '</span>'
      + '</div>'
      + '<span class="badge ' + (c.status === 'active' ? 'ok' : 'warn') + '">' + esc(c.status) + '</span>'
      + '<span class="child-progress">' + watched + '/' + total + ' watched</span>'
      + '<span class="cat-actions">'
      + '<button class="btn btn-outline btn-small" data-act="edit" title="Edit">&#9998;</button>'
      + '<button class="btn btn-outline btn-small danger" data-act="del" title="Remove">&#10005;</button>'
      + '</span>'
      + '</div>';
  }).join('');

  container.querySelectorAll('.child-row').forEach(row => {
    const cid = row.dataset.id;
    row.querySelector('[data-act="edit"]').addEventListener('click', () => openChildEdit(cid));
    row.querySelector('[data-act="del"]').addEventListener('click', async () => {
      if (!confirm('Remove this child? Their account is detached and their progress is deleted.')) return;
      try {
        await db.unlinkChild(cid);
        children = await db.listChildren(null);
        renderChildren();
        toast('Child removed.');
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

function openChildEdit(childId) {
  document.querySelectorAll('.child-edit').forEach(x => x.remove());
  const child = children.find(c => String(c.id) === String(childId));
  const node = document.querySelector('.child-row[data-id="' + childId + '"]');
  if (!child || !node) return;

  const row = document.createElement('div');
  row.className = 'child-edit';
  const name = document.createElement('input');
  name.className = 'input'; name.value = child.name;
  const email = document.createElement('input');
  email.className = 'input'; email.type = 'email'; email.value = child.email;
  const pin = document.createElement('input');
  pin.className = 'input pin-input'; pin.maxLength = 4; pin.value = child.pin;
  const save = document.createElement('button');
  save.className = 'btn btn-small btn-primary'; save.textContent = 'Save';
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-small btn-outline'; cancel.textContent = 'Cancel';
  row.append(name, email, pin, save, cancel);
  node.after(row);

  save.addEventListener('click', async () => {
    try {
      await db.updateChild(childId, { name: name.value.trim(), email: email.value.trim(), pin: pin.value });
      children = await db.listChildren(null);
      renderChildren();
      toast('Child updated.');
    } catch (err) {
      toast(err.message, true);
    }
  });
  cancel.addEventListener('click', () => row.remove());
}

async function onSubmitChild(e) {
  e.preventDefault();
  try {
    await db.createChild({
      name: el('child-name').value.trim(),
      email: el('child-email').value.trim(),
      pin: el('child-pin').value.trim(),
    });
    el('child-name').value = '';
    el('child-email').value = '';
    el('child-pin').value = '';
    children = await db.listChildren(null);
    renderChildren();
    renderPlanPanel();
    toast('Child added. Share the PIN with them.');
  } catch (err) {
    toast(err.message, true);
  }
}

async function onSubmitJoin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await db.linkChild({ email: el('join-email').value.trim(), pin: el('join-pin').value.trim() });
    toast('Linked! Opening your parent\'s videos...');
    window.location.reload();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// ---------- Plan (parent) ----------

function effectivePlanName(p) {
  if (p.plan && p.plan !== 'free' && p.plan_expires_at && new Date(p.plan_expires_at).getTime() > Date.now()) {
    return p.plan;
  }
  return 'free';
}

function renderPlanPanel() {
  const p = app.profile || {};
  const eff = effectivePlanName(p);
  const cur = plans.find(x => x.name === eff) || { max_videos: 5, max_children: 1 };
  const kidsUsed = children.length;
  const expired = p.plan && p.plan !== 'free' && eff === 'free' ? ' (expired)' : '';
  const vidLimit = cur.max_videos >= 999999 ? 'Unlimited' : cur.max_videos;
  const kidLimit = cur.max_children >= 999999 ? 'Unlimited' : cur.max_children;

  el('plan-summary').innerHTML =
    '<div class="plan-current"><b>' + esc(eff) + '</b> plan' + expired + '</div>'
    + '<div class="plan-usage">'
    + '<span>' + links.length + '/' + vidLimit + ' videos</span>'
    + '<span>' + kidsUsed + '/' + kidLimit + ' children</span>'
    + '</div>'
    + (p.plan_expires_at ? '<div class="muted">Expires ' + formatDate(p.plan_expires_at) + '</div>' : '');

  const cards = plans
    .filter(pl => pl.price > 0)
    .map(pl => {
      const isCurrent = eff === pl.name;
      const vL = pl.max_videos >= 999999 ? 'Unlimited videos' : pl.max_videos + ' videos';
      const cL = pl.max_children >= 999999 ? 'unlimited children' : pl.max_children + ' children';
      const btn = isCurrent
        ? '<span class="btn btn-small btn-current">Current</span>'
        : '<button class="btn btn-small btn-primary buy-plan" data-id="' + pl.id + '">Buy for \u20B9' + (pl.price / 100).toFixed(0) + '</button>';
      return '<div class="plan-card" data-name="' + pl.name + '">'
        + '<div class="plan-name">' + esc(cap(pl.name)) + '</div>'
        + '<div class="plan-limits">' + vL + ' &middot; ' + cL + ' &middot; 30 days</div>'
        + btn
        + '</div>';
    }).join('');
  el('plan-cards').innerHTML = cards || '';

  el('plan-cards').querySelectorAll('.buy-plan').forEach(b => {
    b.addEventListener('click', () => {
      const pl = plans.find(x => String(x.id) === String(b.dataset.id));
      if (pl) buyPlan(pl);
    });
  });
}

// ---------- Helpers ----------

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function buildFlat(list) {
  const byParent = {};
  const roots = [];
  list.forEach(c => {
    (byParent[c.parent_id] = byParent[c.parent_id] || []).push(c);
    if (!c.parent_id) roots.push(c);
  });
  const out = [];
  function walk(items, depth) {
    items = items.slice().sort((a, b) => a.name.localeCompare(b.name));
    items.forEach(c => {
      out.push({ ...c, depth });
      if (byParent[c.id]) walk(byParent[c.id], depth + 1);
    });
  }
  walk(roots, 0);
  return out;
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname.slice(0, 24));
  } catch (e) {
    return url.slice(0, 40);
  }
}

function linkLabel(l) {
  if (l.title && l.title.trim()) return l.title.trim();
  const id = youtubeVideoId(l.url);
  if (id) return 'YouTube video \u00b7 ' + id;
  return shortUrl(l.url);
}

init();