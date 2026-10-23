import { loadTemplates, canUseTemplate, setSelectedTemplate, selectedTemplate, templateKey, state } from '../store.js';
import { renderThumbnail, renderPreview, prepareAssets, ensureFonts } from '../renderer.js';
import { escapeHtml, escapeAttr, openModal, toast, debounce, loadingBlock, emptyState } from '../utils.js';
import { t, getLang } from '../i18n.js';
import { openUpgrade } from './pricing.js';
import { PAGE_SIZE, CATEGORIES } from '../config.js';

const thumbCache = new Map();

export async function render(container) {
  const templates = await loadTemplates(true);
  const lang = getLang();
  let search = '';
  let category = '';
  let page = 1;

  container.innerHTML = `
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="icon"><use href="#ic-search"></use></svg>
        <input type="search" id="tpl-search" placeholder="${escapeAttr(t('templates.search'))}" autocomplete="off">
      </div>
      <select id="tpl-category" aria-label="Category">
        <option value="">${escapeHtml(t('common.all'))}</option>
        ${CATEGORIES.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
      <span class="badge badge-gold" id="tpl-count"></span>
    </div>
    <div id="tpl-grid" class="gallery"></div>
    <div class="pagination" id="tpl-pagination"></div>`;

  const grid = container.querySelector('#tpl-grid');
  const countEl = container.querySelector('#tpl-count');
  const pagerEl = container.querySelector('#tpl-pagination');

  function filtered() {
    const term = search.trim().toLowerCase();
    return templates.filter(tpl => {
      const matchesSearch = !term || tpl.name.toLowerCase().includes(term) || (tpl.category || '').toLowerCase().includes(term);
      const matchesCategory = !category || tpl.category === category;
      return matchesSearch && matchesCategory;
    });
  }

  async function paintThumb(img, canvas, template) {
    const previewLang = state.invitation?.language || getLang();
    const cacheKey = `${templateKey(template)}:${previewLang}`;
    if (thumbCache.has(cacheKey)) {
      img.src = thumbCache.get(cacheKey);
      img.classList.remove('hidden');
      canvas.remove();
      return;
    }
    try {
      await renderThumbnail(canvas, template, state.invitation || {}, previewLang);
      const URL = canvas.toDataURL('image/jpeg', 0.85);
      thumbCache.set(cacheKey, URL);
      img.src = URL;
      img.classList.remove('hidden');
      canvas.remove();
    } catch {
      canvas.remove();
    }
  }

  function paintGallery() {
    const all = filtered();
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    if (page > pages) page = pages;
    const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    countEl.textContent = `${all.length} template${all.length === 1 ? '' : 's'}`;

    if (!items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1">${emptyState({ title: t('templates.empty'), copy: t('templates.emptyCopy') })}</div>`;
      pagerEl.innerHTML = '';
      return;
    }

    grid.innerHTML = items.map(tpl => {
      const selected = selectedTemplate() && templateKey(selectedTemplate()) === templateKey(tpl);
      const locked = !canUseTemplate(tpl);
      return `
        <article class="template-card" data-key="${escapeAttr(templateKey(tpl))}">
          <div class="template-thumb">
            <canvas width="340" height="425" aria-hidden="true"></canvas>
            <img alt="${escapeAttr(tpl.name)}" class="hidden" loading="lazy">
            <div class="template-tags" style="position:absolute;top:8px;left:8px;right:8px;justify-content:space-between">
              <span class="badge ${tpl.is_premium ? 'badge-gold' : 'badge-success'}">${escapeHtml(tpl.is_premium ? t('templates.premium') : t('templates.basic'))}</span>
              ${selected ? `<span class="badge badge-primary">${escapeHtml(t('guests.selected'))}</span>` : ''}
            </div>
            <div class="thumb-actions">
              <button type="button" class="btn btn-sm btn-outline" data-preview="${escapeAttr(templateKey(tpl))}">${escapeHtml(t('common.preview'))}</button>
              <button type="button" class="btn btn-sm btn-primary" data-use="${escapeAttr(templateKey(tpl))}">${escapeHtml(locked ? t('common.upgrade') : t('common.select'))}</button>
            </div>
          </div>
          <div class="template-meta">
            <strong>${escapeHtml(tpl.name)}</strong>
            <small>${escapeHtml(tpl.category || '')}</small>
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('.template-card').forEach(card => {
      const tpl = templates.find(item => templateKey(item) === card.dataset.key);
      const canvas = card.querySelector('canvas');
      const img = card.querySelector('img');
      if (tpl && canvas && img) paintThumb(img, canvas, tpl);
    });

    pagerEl.innerHTML = pages > 1 ? `
      <button type="button" class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Previous">
        <svg class="icon" style="width:14px;height:14px"><use href="#ic-left"></use></svg>
      </button>
      ${Array.from({ length: pages }, (_, i) => i + 1)
        .filter(n => n === 1 || n === pages || Math.abs(n - page) <= 1)
        .map((n, idx, arr) => `${idx && n - arr[idx - 1] > 1 ? '<span class="muted">…</span>' : ''}<button type="button" class="page-btn ${n === page ? 'active' : ''}" data-page="${n}">${n}</button>`)
        .join('')}
      <button type="button" class="page-btn" data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Next">
        <svg class="icon" style="width:14px;height:14px"><use href="#ic-right"></use></svg>
      </button>` : '';
  }

  function choose(tpl, navigate = true) {
    if (!canUseTemplate(tpl)) {
      openUpgrade(t('templates.premiumLocked'));
      return;
    }
    setSelectedTemplate(tpl);
    toast(`${tpl.name} selected`, 'success');
    if (navigate) {
      location.hash = `#/customize?template=${encodeURIComponent(templateKey(tpl))}`;
    } else {
      paintGallery();
    }
  }

  async function preview(tpl) {
    const qrText = state.invitation?.maps_url || 'https://maps.google.com';
    const modalBody = `<div class="tpl-preview-layout">
      <div class="tpl-canvas-wrap"><div class="loading-block"><span class="spinner"></span></div></div>
      <div>
        <h3 style="font-family:var(--font-display);font-size:24px;font-weight:600">${escapeHtml(tpl.name)}</h3>
        <p class="muted" style="font-size:12px;margin-bottom:14px">${escapeHtml(tpl.category || '')}</p>
        <div class="tpl-detail-list">
          <div class="dl"><span>${escapeHtml(t('templates.premium'))}</span><span>${escapeHtml(tpl.is_premium ? 'Premium' : 'Basic')}</span></div>
          <div class="dl"><span>${escapeHtml(t('common.status'))}</span><span>${escapeHtml(tpl.is_active === false ? 'Inactive' : 'Active')}</span></div>
          <div class="dl"><span>${escapeHtml(t('generate.format'))}</span><span>1080 × 1350</span></div>
        </div>
        ${!canUseTemplate(tpl) ? `<div class="alert alert-warning mt-3">${escapeHtml(t('templates.premiumLocked'))}</div>` : ''}
        <div class="btn-group mt-3">
          <button type="button" class="btn btn-primary" data-modal-use>${escapeHtml(t('templates.use'))}</button>
          ${!canUseTemplate(tpl) ? `<a href="#/pricing" class="btn btn-outline" data-modal-close>${escapeHtml(t('common.upgrade'))}</a>` : ''}
        </div>
        <p class="help mt-3">${escapeHtml(t('customize.subtitle'))}</p>
      </div>
    </div>`;

    let instance = null;
    const close = openModal({
      title: t('common.preview'),
      subtitle: tpl.name,
      body: modalBody,
      size: 'lg',
      onMount(root, closeFn) {
        instance = { root, closeFn };
        root.querySelector('[data-modal-use]').addEventListener('click', () => {
          if (!canUseTemplate(tpl)) {
            closeFn();
            openUpgrade(t('templates.premiumLocked'));
            return;
          }
          closeFn();
          choose(tpl, true);
        });
      }
    });

    try {
      await ensureFonts();
      const previewLang = state.invitation?.language || getLang();
      const assets = await prepareAssets({
        details: { ...(state.invitation || {}), language: previewLang, show_qr: true },
        template: tpl,
        qrText
      });
      const canvas = document.createElement('canvas');
      const wrap = instance?.root.querySelector('.tpl-canvas-wrap');
      if (!wrap) return;
      await renderPreview(canvas, {
        details: { ...(state.invitation || {}), language: previewLang, show_qr: true },
        design: tpl.design,
        template: tpl,
        guest: { guest_name: previewLang === 'gu' ? 'મહેમાન' : 'Guest', family_name: '' },
        watermark: false,
        assets
      });
      wrap.innerHTML = '';
      wrap.appendChild(canvas);
    } catch {
      const wrap = instance?.root.querySelector('.tpl-canvas-wrap');
      if (wrap) wrap.innerHTML = `<div class="alert alert-danger">${escapeHtml(t('common.error'))}</div>`;
    }
    void close;
  }

  container.querySelector('#tpl-search').addEventListener('input', debounce((event) => {
    search = event.target.value;
    page = 1;
    paintGallery();
  }, 200));

  container.querySelector('#tpl-category').addEventListener('change', (event) => {
    category = event.target.value;
    page = 1;
    paintGallery();
  });

  grid.addEventListener('click', (event) => {
    const previewBtn = event.target.closest('[data-preview]');
    const useBtn = event.target.closest('[data-use]');
    if (previewBtn) {
      const tpl = templates.find(item => templateKey(item) === previewBtn.dataset.preview);
      if (tpl) preview(tpl);
    } else if (useBtn) {
      const tpl = templates.find(item => templateKey(item) === useBtn.dataset.use);
      if (tpl) choose(tpl, true);
    }
  });

  pagerEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    page = Number(btn.dataset.page);
    paintGallery();
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  paintGallery();
}
