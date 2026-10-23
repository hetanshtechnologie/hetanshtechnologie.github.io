import { sb } from '../config.js';
import {
  state, loadJobs, planFeature, loadLatestInvitation
} from '../store.js';
import {
  escapeHtml, escapeAttr, toast, loadingBlock, emptyState, statusBadge,
  formatDateTime, openModal, confirmDialog, downloadBlob, whatsappLink
} from '../utils.js';
import { t, getLang } from '../i18n.js';

async function signedUrl(path, seconds = 3600) {
  if (!path) return null;
  const { data, error } = await sb.storage.from('invitations').createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl || null;
}

async function signedUrls(paths, seconds = 3600) {
  const result = new Map();
  if (!paths.length) return result;
  const { data, error } = await sb.storage.from('invitations').createSignedUrls(paths, seconds);
  if (error) return result;
  (data || []).forEach(item => {
    if (item?.path && item?.signedUrl) result.set(item.path, item.signedUrl);
  });
  return result;
}

async function cardsFor(jobId) {
  const { data, error } = await sb
    .from('generated_cards')
    .select('*')
    .eq('job_id', jobId)
    .order('guest_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function downloadZip(job) {
  try {
    const url = job.zip_path ? await signedUrl(job.zip_path, 3600) : job.zip_url;
    if (!url) {
      toast('ZIP file is no longer available. Generate this batch again.', 'warning');
      return;
    }
    toast('Preparing download…', 'info');
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    downloadBlob(blob, `${(job.template_name || 'WeddingInvitations').replace(/[^\w-]+/g, '_')}.zip`);
  } catch (error) {
    toast(error.message || 'Could not download ZIP.', 'error');
  }
}

async function openCards(job) {
  const close = openModal({
    title: `${job.template_name || 'Invitation'} · ${job.card_count || job.guest_count || 0} cards`,
    subtitle: `${formatDateTime(job.created_at, getLang())} · ${String(job.format || 'png').toUpperCase()}`,
    body: loadingBlock(t('common.loading')),
    size: 'lg'
  });
  try {
    const cards = await cardsFor(job.id);
    const signed = await signedUrls(cards.map(card => card.storage_path).filter(Boolean));
    cards.forEach(card => {
      if (card.storage_path && signed.has(card.storage_path)) card.image_url = signed.get(card.storage_path);
      else if (card.storage_path) card.image_url = null;
    });
    const invitation = await loadLatestInvitation().catch(() => null);
    const details = invitation || {};
    const canShare = planFeature('whatsapp');
    const body = cards.length ? `
      <div class="cards-grid">
        ${cards.map(card => `
          <div class="card-mini">
            ${card.image_url ? `<img src="${escapeAttr(card.image_url)}" alt="${escapeAttr(card.guest_name)}" loading="lazy">` : `<div style="aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px">No preview</div>`}
            <div class="cm-body">
              <strong title="${escapeAttr(card.guest_name)}">${escapeHtml(card.guest_name)}</strong>
              <div class="cm-actions mt-1">
                ${card.image_url ? `<a class="btn btn-xs btn-outline" href="${escapeAttr(card.image_url)}" target="_blank" rel="noopener">${escapeHtml(t('common.download'))}</a>` : ''}
                ${canShare && card.image_url ? `<a class="btn btn-xs btn-ghost" href="${escapeAttr(whatsappLink('', `${details.event_name || job.template_name || 'Invitation'}\n${card.image_url}`))}" target="_blank" rel="noopener">${escapeHtml(t('share.whatsapp'))}</a>` : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>
      <p class="help mt-2">Card and ZIP links are refreshed securely each time you open this dialog.</p>`
      : emptyState({ title: 'No cards stored', copy: 'This batch was generated without uploading copies to the cloud.', mark: 'કં' });
    close();
    openModal({
      title: `${job.template_name || 'Invitation'} · ${cards.length} cards`,
      subtitle: `${formatDateTime(job.created_at, getLang())} · ${String(job.format || 'png').toUpperCase()}`,
      body,
      size: 'lg',
      footer: `<button type="button" class="btn btn-outline" data-modal-close>${escapeHtml(t('common.close'))}</button>${job.zip_path || job.zip_url ? `<button type="button" class="btn btn-primary" data-download-zip>${escapeHtml(t('history.download'))}</button>` : ''}`,
      onMount(root) {
        root.querySelector('[data-download-zip]')?.addEventListener('click', () => downloadZip(job));
      }
    });
  } catch (error) {
    close();
    toast(error.message || t('common.error'), 'error');
  }
}

async function deleteJob(job) {
  const ok = await confirmDialog(`Delete this batch of ${job.card_count || job.guest_count || 0} cards? This cannot be undone.`, {
    title: t('history.delete'),
    confirmText: t('common.delete'),
    danger: true
  });
  if (!ok) return;
  try {
    const cards = await cardsFor(job.id).catch(() => []);
    const paths = [job.zip_path, ...cards.map(c => c.storage_path)].filter(Boolean);
    if (paths.length) await sb.storage.from('invitations').remove(paths).catch(() => null);
    const { error } = await sb.from('generation_jobs').delete().eq('id', job.id);
    if (error) throw error;
    state.jobs = state.jobs.filter(item => item.id !== job.id);
    toast('Batch deleted.', 'success');
    window.dispatchEvent(new CustomEvent('kankotri:refresh'));
  } catch (error) {
    toast(error.message || t('common.error'), 'error');
  }
}

function jobCard(job) {
  const status = job.status || 'completed';
  const canDownload = (job.zip_path || job.zip_url) && status === 'completed';
  return `
    <div class="job-card" data-job="${escapeAttr(job.id)}">
      <div class="job-art">કં</div>
      <div class="job-main">
        <h3>${escapeHtml(job.template_name || 'Wedding invitations')}</h3>
        <p>${escapeHtml(formatDateTime(job.created_at, getLang()))} · ${Number(job.card_count || job.guest_count || 0)} ${escapeHtml(t('common.cards'))} · ${escapeHtml(String(job.format || 'png').toUpperCase())}</p>
      </div>
      ${statusBadge(status)}
      <div class="job-actions">
        ${canDownload ? `<button type="button" class="btn btn-sm btn-outline" data-zip>${escapeHtml(t('history.download'))}</button>` : ''}
        <button type="button" class="btn btn-sm btn-ghost" data-cards ${Number(job.card_count || 0) ? '' : 'disabled'}>${escapeHtml(t('history.viewCards'))}</button>
        <button type="button" class="icon-btn" data-delete aria-label="${escapeAttr(t('history.delete'))}"><svg class="icon"><use href="#ic-trash"></use></svg></button>
      </div>
    </div>`;
}

export async function render(container) {
  container.innerHTML = loadingBlock(t('common.loading'));
  let jobs = [];
  try {
    jobs = await loadJobs(60, true);
  } catch (error) {
    container.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message || t('common.error'))}</div>`;
    return;
  }

  const completed = jobs.filter(j => j.status === 'completed');
  const totalCards = completed.reduce((sum, job) => sum + Number(job.card_count || 0), 0);
  const totalGuests = completed.reduce((sum, job) => sum + Number(job.guest_count || 0), 0);

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>${escapeHtml(t('history.title'))}</h2>
        <p>${escapeHtml(t('history.subtitle'))}</p>
      </div>
      <div class="btn-group">
        <a href="#/generate" class="btn btn-outline">${escapeHtml(t('nav.generate'))}</a>
        <a href="#/templates" class="btn btn-primary">${escapeHtml(t('nav.templates'))}</a>
      </div>
    </div>
    <div class="stat-grid mb-3" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="stat-card"><div class="s-label">Batches</div><div class="s-value">${jobs.length}</div><div class="s-foot">all time</div></div>
      <div class="stat-card highlight"><div class="s-label">${escapeHtml(t('common.cards'))}</div><div class="s-value">${totalCards}</div><div class="s-foot">${totalGuests} guests processed</div></div>
      <div class="stat-card"><div class="s-label">Latest batch</div><div class="s-value" style="font-size:20px">${jobs[0] ? escapeHtml(formatDateTime(jobs[0].created_at, getLang()).split(',')[0]) : '—'}</div><div class="s-foot">${jobs[0] ? escapeHtml(jobs[0].template_name || '') : ''}</div></div>
    </div>
    <section class="card">
      <div class="card-head">
        <div>
          <h2>${escapeHtml(t('history.title'))}</h2>
          <p>${completed.length} completed · ${jobs.length - completed.length} other</p>
        </div>
        <div class="row" style="gap:8px">
          <select id="history-status" class="btn btn-sm btn-outline">
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div class="card-body">
        ${jobs.length ? `<div class="job-list" id="history-list">${jobs.map(jobCard).join('')}</div>` : emptyState({
          title: t('history.empty'),
          copy: t('history.emptyCopy'),
          action: `<a href="#/generate" class="btn btn-primary">${escapeHtml(t('generate.start'))}</a>`
        })}
      </div>
    </section>`;

  const list = container.querySelector('#history-list');
  if (!list) return;

  const statusSelect = container.querySelector('#history-status');
  statusSelect.addEventListener('change', () => {
    const value = statusSelect.value;
    list.querySelectorAll('[data-job]').forEach(el => {
      el.classList.toggle('hidden', !!value && el.dataset.status !== value);
    });
  });
  list.querySelectorAll('[data-job]').forEach(el => {
    const job = jobs.find(item => item.id === el.dataset.job);
    if (!job) return;
    el.dataset.status = job.status || 'completed';
    el.classList.toggle('hidden', !!statusSelect.value && el.dataset.status !== statusSelect.value);
    el.querySelector('[data-zip]')?.addEventListener('click', () => downloadZip(job));
    el.querySelector('[data-cards]')?.addEventListener('click', () => openCards(job));
    el.querySelector('[data-delete]')?.addEventListener('click', () => deleteJob(job));
  });
}
