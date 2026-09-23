// dashboard.js — link tracker: add links, watch them off with checkboxes,
// and organize links into parent/child categories.
let app = null;
let links = [];
let categories = [];
let filterCat = '';

async function init() {
  app = await guardPage();
  if (!app) return;
  el('user-email').textContent = app.profile.email;

  el('add-link-form').addEventListener('submit', onSubmitLink);
  el('add-category-form').addEventListener('submit', onSubmitCategory);

  await loadCategories();
  el('filter-cat').addEventListener('change', (e) => { filterCat = e.target.value; renderLinks(); });
  await loadLinks();
}

// ---------- Categories ----------

function categoryOptionsHtml() {
  return buildFlat(categories).map(c =>
    '<option value="' + c.id + '">' + '\u00A0'.repeat(c.depth) + esc(c.name) + '</option>'
  ).join('');
}

async function loadCategories() {
  categories = await db.listCategories();
  el('category-parent').innerHTML = '<option value="">No parent (root)</option>' + categoryOptionsHtml();
  el('link-category').innerHTML = '<option value="">No category</option>' + categoryOptionsHtml();
  fillFilterOptions();
  renderCategoryTree();
  renderLinks();
}

function fillFilterOptions() {
  const sel = el('filter-cat');
  const current = sel.value;
  sel.innerHTML = '<option value="">All links</option>' + categoryOptionsHtml();
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
  links = await db.listLinks();
  renderSummary();
  renderLinks();
}

function renderSummary() {
  const total = links.length;
  const watched = links.filter(l => l.watched).length;
  el('overall-progress').innerHTML =
    '<div class="summary-text">' + total + ' link' + (total === 1 ? '' : 's') + ' &middot; ' + watched + ' watched</div>'
    + renderProgressBar(percentFromCounts(watched, total));
}

function renderLinks() {
  const container = el('link-list');
  const list = filterCat ? links.filter(l => String(l.category_id) === filterCat) : links;
  if (!list.length) {
    container.innerHTML = '<p class="empty">No links yet. Paste a YouTube link above to start tracking.</p>';
    return;
  }
  container.innerHTML = list.map(renderLinkRow).join('');

  container.querySelectorAll('.link-row').forEach(row => {
    const id = row.dataset.id;
    const link = links.find(x => String(x.id) === id);
    row.querySelector('.link-title').addEventListener('click', (e) => {
      if (link && openVideoPlayer(link.url)) e.preventDefault();
    });
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
  return '<div class="link-row' + (l.watched ? ' done' : '') + '" data-id="' + l.id + '">'
    + '<label class="watch-check"><input type="checkbox" class="link-watch"' + (l.watched ? ' checked' : '') + '></label>'
    + (canPlay ? '<span class="play-badge" title="Play inline">&#9654;</span>' : '')
    + '<div class="link-main">'
    + '<a class="link-title" href="' + esc(l.url) + '" target="_blank" rel="noopener nofollow">' + esc(label) + '</a>'
    + '<div class="link-url-meta">' + esc(shortUrl(l.url)) + (l.category ? ' &middot; ' + esc(l.category) : '') + '</div>'
    + '</div>'
    + linkCatSelect(l)
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
    toast('Link added.');
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

// ---------- Helpers ----------

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