import { sb, CARD } from '../config.js';
import {
  state, loadTemplates, loadLatestInvitation, loadGuestBatches, loadGuests,
  selectBatch, inviteLimit, currentPlan, planFeature, designFor, detailsFor,
  loadPlan, loadJobs
} from '../store.js';
import {
  ensureFonts, prepareAssets, renderExportCanvas, renderPreview
} from '../renderer.js';
import {
  escapeHtml, escapeAttr, toast, formatDate, formatDateTime, canvasToBlob,
  downloadBlob, safeName, sleep
} from '../utils.js';
import { t, getLang } from '../i18n.js';

let cancelRequested = false;
let running = false;
let zipBlob = null;

function uniqueNames(guests) {
  const used = new Map();
  return guests.map((guest, index) => {
    const base = safeName(guest.guest_name || `Guest_${index + 1}`);
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function swiftStep(activeIndex) {
  const steps = [
    ['1', 'Choose template'],
    ['2', 'Upload guests'],
    ['3', 'Customize'],
    ['4', 'Generate']
  ];
  return `<div class="steps">${steps.map(([n, label], i) => `<div class="step ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}"><span class="n">${i < activeIndex ? '✓' : n}</span>${escapeHtml(label)}</div>`).join('')}</div>`;
}

export async function render(container) {
  const [templates] = await Promise.all([
    loadTemplates(),
    loadPlan().catch(() => null)
  ]);
  const invitation = await loadLatestInvitation(true).catch(() => null);
  const batches = await loadGuestBatches(true).catch(() => []);
  if (!state.selectedBatchId && batches.length) selectBatch(batches[0].id);
  let guests = state.selectedBatchId ? await loadGuests(state.selectedBatchId).catch(() => []) : [];

  const template = templates.find(tpl => tpl.id === invitation?.template_id) || state.selectedTemplate;
  const details = detailsFor(invitation || {});
  const design = invitation?.design_json && Object.keys(invitation.design_json).length
    ? { ...designFor(template), ...invitation.design_json }
    : designFor(template);
  const limit = inviteLimit();
  const count = guests.length;
  const batch = state.guestBatches.find(b => b.id === state.selectedBatchId);
  const canHd = planFeature('hd_export');
  const canPdf = planFeature('pdf');
  const canQr = planFeature('qr_code');
  const watermark = !planFeature('remove_watermark');
  const invitationReady = !!invitation && !!details.bride_name && !!details.groom_name;

  container.innerHTML = `
    ${swiftStep(invitationReady && count ? 3 : invitationReady ? 2 : 0)}
    ${!invitationReady ? `<div class="alert alert-warning mb-3"><span>${escapeHtml(t('generate.missing'))} <a href="#/customize">${escapeHtml(t('nav.customize'))}</a> · <a href="#/upload-guests">${escapeHtml(t('nav.guests'))}</a></span></div>` : ''}
    <div class="generate-layout">
      <div>
        <section class="card mb-3">
          <div class="card-head">
            <div>
              <h2>${escapeHtml(t('generate.summary'))}</h2>
              <p>${escapeHtml(details.event_name || 'Wedding celebration')} · ${escapeHtml(currentPlan().name)} plan</p>
            </div>
            <span class="badge ${invitationReady && count ? 'badge-success' : 'badge-gold'}">${invitationReady && count ? 'Ready' : 'Incomplete'}</span>
          </div>
          <div class="card-body">
            <div class="summary-list">
              <div class="summary-item"><span>${escapeHtml(t('generate.invitation'))}</span><strong>${escapeHtml([details.bride_name, details.groom_name].filter(Boolean).join(' & ') || '—')}</strong></div>
              <div class="summary-item"><span>${escapeHtml(t('generate.template'))}</span><strong>${escapeHtml(template?.name || invitation?.event_name || '—')}</strong></div>
              <div class="summary-item"><span>${escapeHtml(t('generate.guestList'))}</span><strong>${batch ? `${escapeHtml(batch.label)} · ${count}` : '—'}</strong></div>
              <div class="summary-item"><span>${escapeHtml(t('generate.count'))}</span><strong>${count} / ${limit >= 999999 ? '∞' : limit}</strong></div>
              <div class="summary-item"><span>${escapeHtml(t('common.date'))}</span><strong>${escapeHtml(formatDate(details.wedding_date, getLang()) || '—')}</strong></div>
            </div>

            <div class="form-grid mt-3">
              <div class="field">
                <label for="gen-batch">${escapeHtml(t('generate.guestList'))}</label>
                <select id="gen-batch">
                  ${batches.length ? batches.map(b => `<option value="${escapeAttr(b.id)}" ${b.id === state.selectedBatchId ? 'selected' : ''}>${escapeHtml(b.label)} (${b.guest_count})</option>`).join('') : `<option value="">No guest lists</option>`}
                </select>
                ${!batches.length ? `<a class="help" href="#/upload-guests">Upload a guest list →</a>` : ''}
              </div>
              <div class="field">
                <label for="gen-format">${escapeHtml(t('generate.format'))}</label>
                <select id="gen-format">
                  <option value="png">PNG · best quality</option>
                  <option value="jpg">JPG · smaller files</option>
                </select>
              </div>
              <div class="field">
                <label>${escapeHtml(t('generate.hd'))}</label>
                <label class="switch">
                  <input type="checkbox" id="gen-hd" ${canHd ? 'checked' : 'disabled'}>
                  <span>${canHd ? '3× resolution (3240 × 4050)' : 'Premium feature'}</span>
                </label>
              </div>
              <div class="field">
                <label>${escapeHtml(t('generate.pdf'))}</label>
                <label class="switch">
                  <input type="checkbox" id="gen-pdf" ${canPdf ? '' : 'disabled'}>
                  <span>${canPdf ? 'Add a PDF copy of every card' : 'Premium feature'}</span>
                </label>
              </div>
              <div class="field span-2">
                <label class="checkbox">
                  <input type="checkbox" id="gen-cloud" checked>
                  <span>${escapeHtml(t('generate.cloud'))} — saves each card in history and enables WhatsApp / email sharing.</span>
                </label>
              </div>
            </div>

            ${count > limit ? `<div class="alert alert-warning mt-3"><span>${escapeHtml(t('generate.limitExceeded'))} ${escapeHtml(t('guests.limit', { limit, count }))}</span></div>` : ''}
            ${count > 150 ? `<div class="alert alert-info mt-3"><span>Large batch detected. HD exports can be memory-intensive — JPG format is recommended for 150+ cards.</span></div>` : ''}

            <div class="row-wrap mt-3" style="justify-content:space-between">
              <div class="btn-group">
                <button type="button" class="btn btn-primary btn-lg" id="generate-btn" ${!invitationReady || !count || count > limit ? 'disabled' : ''}>
                  <svg class="icon"><use href="#ic-generate"></use></svg>
                  ${escapeHtml(t('generate.start'))}
                </button>
                <button type="button" class="btn btn-outline hidden" id="cancel-btn">Stop</button>
              </div>
              <a href="#/customize" class="btn btn-ghost">${escapeHtml(t('nav.customize'))}</a>
            </div>
          </div>
          <div id="progress-area" class="hidden">
            <div class="gen-progress">
              <div class="gen-status">
                <strong id="gen-status">${escapeHtml(t('generate.progress'))}</strong>
                <span class="badge badge-info" id="gen-percent">0%</span>
              </div>
              <div class="progress progress-lg"><span id="gen-bar"></span></div>
              <div class="progress-meta"><span id="gen-detail"></span><span id="gen-count"></span></div>
              <div class="gen-log" id="gen-log"></div>
            </div>
          </div>
          <div id="result-area"></div>
        </section>
      </div>

      <aside>
        <div class="preview-card">
          <div class="row" style="justify-content:space-between;padding:2px 2px 8px">
            <strong style="font-family:var(--font-display);font-size:16px">First card preview</strong>
            <span class="badge ${watermark ? 'badge-gold' : 'badge-success'}">${watermark ? 'Watermark' : 'No watermark'}</span>
          </div>
          <div id="gen-preview"><div class="loading-block"><span class="spinner"></span></div></div>
          <div class="preview-note"><span>${escapeHtml(guests[0]?.guest_name || 'Sample guest')}</span><span>${escapeHtml(details.language === 'en' ? 'English' : 'ગુજરાતી')}</span></div>
        </div>
        <div class="card card-pad mt-2">
          <h3 style="font-family:var(--font-display);font-size:18px;font-weight:600">What's included</h3>
          <ul class="feature-list" style="margin:12px 0 0">
            <li><span class="${count ? 'f-yes' : 'f-no'}">${count ? '✓' : '✕'}</span><span>${count} personalised card${count === 1 ? '' : 's'}</span></li>
            <li><span class="${canHd ? 'f-yes' : 'f-no'}">${canHd ? '✓' : '✕'}</span><span>${canHd ? 'HD 3× export' : 'HD export (Premium)'}</span></li>
            <li><span class="${watermark ? 'f-no' : 'f-yes'}">${watermark ? '✕' : '✓'}</span><span>${watermark ? 'Kankotri watermark' : 'Watermark removed'}</span></li>
            <li><span class="${canPdf ? 'f-yes' : 'f-no'}">${canPdf ? '✓' : '✕'}</span><span>PDF copies (Premium)</span></li>
            <li><span class="${canQr && details.show_qr ? 'f-yes' : 'f-no'}">${canQr && details.show_qr ? '✓' : '✕'}</span><span>Venue QR code (Premium)</span></li>
          </ul>
          <p class="help mt-2">All cards render at 1080 × 1350 base size${canHd ? ', upscaled 3× for print-quality exports' : ''}.</p>
        </div>
      </aside>
    </div>`;

  const previewCanvas = document.createElement('canvas');
  const previewWrap = container.querySelector('#gen-preview');
  const previewGuest = guests[0] || { guest_name: getLang() === 'gu' ? 'મહેમાન' : 'Guest' };

  async function paintSample() {
    try {
      const qrText = details.maps_url || (details.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.venue)}` : '');
      const assets = await prepareAssets({ details, template, qrText });
      await renderPreview(previewCanvas, {
        details: { ...details, show_qr: details.show_qr && canQr },
        design,
        template,
        guest: previewGuest,
        watermark,
        assets
      });
      if (previewWrap) {
        previewWrap.innerHTML = '';
        previewWrap.appendChild(previewCanvas);
      }
    } catch {
      if (previewWrap) previewWrap.innerHTML = '<div class="alert alert-info">Choose a template and save your invitation to see a preview.</div>';
    }
  }

  container.querySelector('#gen-batch').addEventListener('change', async (event) => {
    selectBatch(event.target.value || null);
    await loadGuests(state.selectedBatchId, true).catch(() => []);
    await render(container);
  });

  container.querySelector('#gen-cloud').addEventListener('change', () => {});

  const genBtn = container.querySelector('#generate-btn');
  const cancelBtn = container.querySelector('#cancel-btn');

  async function startGeneration() {
    if (running) return;
    if (!invitation?.id) {
      toast(t('generate.missing'), 'warning');
      return;
    }
    if (!guests.length) {
      toast('Choose a guest list with at least one guest.', 'warning');
      return;
    }
    if (guests.length > inviteLimit()) {
      toast(t('generate.limitExceeded'), 'warning');
      return;
    }
    cancelRequested = false;
    running = true;
    zipBlob = null;

    const format = container.querySelector('#gen-format').value;
    const hd = container.querySelector('#gen-hd').checked && canHd;
    const includePdf = container.querySelector('#gen-pdf').checked && canPdf;
    const uploadCloud = container.querySelector('#gen-cloud').checked;
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpg' ? 'jpg' : 'png';
    const scale = hd ? 3 : 1;

    genBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    container.querySelector('#progress-area').classList.remove('hidden');
    container.querySelector('#result-area').innerHTML = '';
    const bar = container.querySelector('#gen-bar');
    const pctEl = container.querySelector('#gen-percent');
    const statusEl = container.querySelector('#gen-status');
    const detailEl = container.querySelector('#gen-detail');
    const countEl = container.querySelector('#gen-count');
    const logEl = container.querySelector('#gen-log');
    const log = (line, cls = '') => {
      if (!logEl) return;
      logEl.insertAdjacentHTML('beforeend', `<div class="${cls}">${escapeHtml(line)}</div>`);
      logEl.scrollTop = logEl.scrollHeight;
    };

    function progress(percent, label, detail = '') {
      const value = Math.max(0, Math.min(100, Math.round(percent)));
      if (bar) bar.style.width = `${value}%`;
      if (pctEl) pctEl.textContent = `${value}%`;
      if (statusEl && label) statusEl.textContent = label;
      if (detailEl) detailEl.textContent = detail;
    }

    let job = null;
    try {
      const { data: jobRow, error: jobError } = await sb.from('generation_jobs').insert({
        user_id: state.user.id,
        template_id: invitation?.template_id || null,
        invitation_id: invitation?.id || null,
        guest_batch_id: state.selectedBatchId || null,
        template_name: template?.name || invitation?.event_name || 'Invitation',
        guest_count: guests.length,
        card_count: 0,
        status: 'processing',
        format: ext
      }).select('*').single();
      if (jobError) throw jobError;
      job = jobRow;

      await ensureFonts();
      const qrText = details.maps_url || (details.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.venue)}` : '');
      const assets = await prepareAssets({ details, template, qrText });
      const canvas = document.createElement('canvas');
      const zip = new window.JSZip();
      const folder = zip.folder('WeddingInvitations');
      const names = uniqueNames(guests);
      const dateFolder = new Date().toISOString().slice(0, 10);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storageFolder = `${state.user.id}/${dateFolder}/${stamp}`;
      const cardRows = [];
      let uploaded = 0;
      let cloudFailures = 0;

      progress(2, t('generate.progress'), `Preparing ${guests.length} cards`);
      log(`Job started · ${guests.length} guests · ${ext.toUpperCase()}${hd ? ' · HD 3×' : ''}`);

      for (let i = 0; i < guests.length; i += 1) {
        if (cancelRequested) break;
        const guest = guests[i];
        const opts = {
          details: { ...details, show_qr: details.show_qr && canQr },
          design,
          template,
          guest,
          watermark,
          assets
        };
        await renderExportCanvas(canvas, opts, scale);
        const blob = await canvasToBlob(canvas, mime, 0.94);
        const filename = `${names[i]}.${ext}`;
        folder.file(filename, blob);

        if (includePdf) {
          try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [CARD.width, CARD.height], hotfixes: ['px_scaling'] });
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, CARD.width, CARD.height);
            folder.file(`${names[i]}.pdf`, pdf.output('blob'));
          } catch {
            /* PDF is optional */
          }
        }

        let storagePath = null;
        let imageUrl = null;
        if (uploadCloud) {
          try {
            const path = `${storageFolder}/${filename}`;
            const contentType = format === 'jpg' ? 'image/jpeg' : 'image/png';
            const up = await sb.storage.from('invitations').upload(path, blob, { contentType, upsert: false });
            if (up.error) throw up.error;
            storagePath = path;
            const signed = await sb.storage.from('invitations').createSignedUrl(path, 60 * 60 * 24 * 30);
            imageUrl = signed.data?.signedUrl || null;
            uploaded += 1;
          } catch {
            cloudFailures += 1;
          }
        }

        cardRows.push({
          user_id: state.user.id,
          job_id: job.id,
          guest_name: guest.guest_name,
          template_id: invitation?.template_id || null,
          image_url: imageUrl,
          storage_path: storagePath
        });

        if (i % 5 === 0 || i === guests.length - 1) {
          const pct = 3 + ((i + 1) / guests.length) * 72;
          progress(pct, t('generate.progress'), `Card ${i + 1} of ${guests.length}`);
          countEl.textContent = `${i + 1}/${guests.length}`;
        }
        if (i % 25 === 0) {
          log(`Rendered ${i + 1}/${guests.length} · ${guest.guest_name}`, 'ok');
          await sleep(0);
        }
      }

      if (cancelRequested) {
        log('Generation stopped by user', 'err');
      }

      progress(78, 'Creating ZIP archive', 'Compressing cards…');
      log('Building WeddingInvitations.zip');
      zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => {
        progress(78 + (meta.percent / 100) * 12, 'Creating ZIP archive', `${Math.round(meta.percent)}% compressed`);
      });

      let zipPath = null;
      let zipUrl = null;
      if (uploadCloud && !cancelRequested) {
        try {
          progress(92, 'Saving to your history', 'Uploading ZIP…');
          zipPath = `${storageFolder}/WeddingInvitations.zip`;
          const up = await sb.storage.from('invitations').upload(zipPath, zipBlob, { contentType: 'application/zip', upsert: true });
          if (up.error) throw up.error;
          const signed = await sb.storage.from('invitations').createSignedUrl(zipPath, 60 * 60 * 24 * 30);
          zipUrl = signed.data?.signedUrl || null;
          log('ZIP saved to cloud storage', 'ok');
        } catch {
          zipPath = null;
          zipUrl = null;
          log('ZIP cloud upload failed — local download still available', 'err');
        }
      }

      if (cardRows.length) {
        for (let i = 0; i < cardRows.length; i += 200) {
          await sb.from('generated_cards').insert(cardRows.slice(i, i + 200));
        }
      }

      progress(100, 'Completed', `${cardRows.length} cards ready`);
      log(`Done · ${cardRows.length} cards${uploadCloud ? ` · ${uploaded} uploaded${cloudFailures ? ` · ${cloudFailures} failed` : ''}` : ''}`, 'ok');

      const finalStatus = cancelRequested ? 'cancelled' : 'completed';
      const { data: updatedJob } = await sb.from('generation_jobs').update({
        status: finalStatus,
        card_count: cardRows.length,
        zip_path: zipPath,
        zip_url: zipUrl,
        completed_at: new Date().toISOString()
      }).eq('id', job.id).select('*').single();
      job = updatedJob || job;

      await sb.from('usage_logs').insert({
        user_id: state.user.id,
        plan_id: currentPlan().id || null,
        invite_count: 0,
        generated_count: cardRows.length
      }).then(() => null).catch(() => null);

      await loadJobs(60, true).catch(() => null);

      container.querySelector('#result-area').innerHTML = `
        <div class="gen-progress">
          <div class="result-banner">
            <div class="r-icon"><svg class="icon"><use href="#ic-check"></use></svg></div>
            <div class="grow">
              <h3>${escapeHtml(cancelRequested ? 'Generation stopped' : t('generate.done'))}</h3>
              <p>${escapeHtml(`${cardRows.length} card${cardRows.length === 1 ? '' : 's'} · ${formatDateTime(new Date().toISOString(), getLang())}`)}</p>
            </div>
            <button type="button" class="btn btn-primary" id="download-zip">${escapeHtml(t('generate.downloadZip'))}</button>
          </div>
          <div class="row-wrap mt-2">
            <a href="#/history" class="btn btn-outline btn-sm">${escapeHtml(t('generate.viewHistory'))}</a>
            <button type="button" class="btn btn-ghost btn-sm" id="regenerate">Generate again</button>
          </div>
        </div>`;

      container.querySelector('#download-zip')?.addEventListener('click', () => downloadZip());

      container.querySelector('#regenerate')?.addEventListener('click', () => {
        container.querySelector('#result-area').innerHTML = '';
        container.querySelector('#progress-area').classList.add('hidden');
        genBtn.disabled = false;
        startGeneration();
      });

      if (zipBlob && !cancelRequested) {
        try { downloadZip(); } catch { /* automatic download may be blocked */ }
      }

      if (cancelRequested) toast('Generation stopped. You can download the partial ZIP.', 'warning');
      else toast(t('generate.done'), 'success');
    } catch (error) {
      toast(error.message || t('common.error'), 'error');
      if (job?.id) {
        await sb.from('generation_jobs').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', job.id).catch(() => null);
      }
      progress(100, 'Failed', error.message || '');
      log(error.message || 'Generation failed', 'err');
    } finally {
      running = false;
      genBtn.disabled = false;
      cancelBtn.classList.add('hidden');
    }
  }

  function downloadZip() {
    if (!zipBlob) {
      toast('ZIP is still being prepared.', 'warning');
      return;
    }
    downloadBlob(zipBlob, 'WeddingInvitations.zip');
  }

  genBtn.addEventListener('click', startGeneration);
  cancelBtn.addEventListener('click', () => {
    cancelRequested = true;
    cancelBtn.disabled = true;
    toast('Stopping after the current card…', 'info');
    setTimeout(() => { cancelBtn.disabled = false; }, 1500);
  });

  await paintSample();
}
