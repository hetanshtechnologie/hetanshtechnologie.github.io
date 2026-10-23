import { sb, DEFAULT_DETAILS, PREMIUM_FONT_OPTIONS, CATEGORIES } from '../config.js';
import {
  state, loadTemplates, loadLatestInvitation, loadGuests, loadGuestBatches,
  selectedTemplate, setSelectedTemplate, templateKey, canUseTemplate,
  designFor, detailsFor, planFeature, currentPlan, inviteLimit,
  saveCustomFont, restoreCustomFont, uploadLogo, loadPlan
} from '../store.js';
import { renderPreview, prepareAssets, ensureFonts, makeQrDataUrl, cardShareText } from '../renderer.js';
import {
  escapeHtml, escapeAttr, toast, debounce, formatDate, downloadBlob,
  openModal, confirmDialog
} from '../utils.js';
import { t, getLang } from '../i18n.js';
import { openUpgrade } from './pricing.js';

let currentCanvas = null;
let previewTimer = null;

const MESSAGE_IDEAS = {
  gu: [
    'અમારા જીવનના આ શુભ પ્રસંગે આપની ઉપસ્થિતિ અમારા માટે આશીર્વાદરૂપ રહેશે. સ્નેહપૂર્વક આમંત્રણ છે.',
    'ખુશીઓથી ભરેલા આ મંગલ પ્રસંગે આપને અને આપના પરિવારને હૃદયપૂર્વક આમંત્રિત કરીએ છીએ.',
    'પ્રેમ, પ્રકાશ અને આશીર્વાદ સાથે અમે આપનું સ્વાગત કરીએ છીએ. આપની ઉપસ્થિતિ અમારો આનંદ વધારશે.'
  ],
  en: [
    'Your presence on this joyous occasion will be the greatest blessing for us. We warmly invite you and your family.',
    'With hearts full of love and joy, we request the honour of your presence at our wedding celebration.',
    'As we begin our forever, we would love to celebrate this beautiful moment with you and your family.'
  ]
};

export function sampleGuest() {
  if (state.guests?.length) {
    return state.guests[0];
  }
  return { guest_name: getLang() === 'gu' ? 'મહેમાન' : 'Guest', family_name: getLang() === 'gu' ? 'પરિવાર' : 'Family' };
}

export function collectDetailsFromForm(root) {
  const value = (sel) => root.querySelector(sel)?.value?.trim() || '';
  const checked = (sel) => !!root.querySelector(sel)?.checked;
  return {
    event_name: value('#c-event') || DEFAULT_DETAILS.event_name,
    bride_name: value('#c-bride'),
    groom_name: value('#c-groom'),
    wedding_date: value('#c-date'),
    time: value('#c-time'),
    venue: value('#c-venue'),
    maps_url: value('#c-maps'),
    family_details: value('#c-family'),
    message: value('#c-message'),
    language: value('#c-language') || 'gu',
    font_family: value('#c-font'),
    logo_url: root.querySelector('#logo-data')?.value || '',
    show_qr: checked('#c-qr')
  };
}

function templateSelectOptions(templates, current) {
  return CATEGORIES.map(category => {
    const group = templates.filter(tpl => tpl.category === category);
    if (!group.length) return '';
    return `<optgroup label="${escapeAttr(category)}">${group.map(tpl => `
      <option value="${escapeAttr(templateKey(tpl))}" ${templateKey(tpl) === templateKey(current) ? 'selected' : ''}>
        ${escapeHtml(tpl.name)}${tpl.is_premium ? ' · Premium' : ''}
      </option>`).join('')}</optgroup>`;
  }).join('');
}

function fontOptions(details) {
  const premiumFonts = planFeature('gujarati_fonts');
  const customAllowed = planFeature('custom_font') && state.customFont;
  return PREMIUM_FONT_OPTIONS.map(opt => {
    const premium = /Gujarati|Great Vibes/.test(opt.value);
    const disabled = premium && !premiumFonts;
    return `<option value="${escapeAttr(opt.value)}" ${details.font_family === opt.value ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${escapeHtml(opt.label)}${disabled ? ' · Premium' : ''}</option>`;
  }).join('') + (customAllowed ? `<option value="${escapeAttr(state.customFont.name)}" ${details.font_family === state.customFont.name ? 'selected' : ''}>${escapeHtml(state.customFont.name)} (uploaded)</option>` : '');
}

function swatches(design) {
  return (design.bg || []).concat([design.accent, design.gold]).map(color => `<span class="color-swatch" style="background:${escapeAttr(color)}" title="${escapeAttr(color)}"></span>`).join('');
}

export async function render(container) {
  const [templates] = await Promise.all([
    loadTemplates(),
    loadPlan().catch(() => null)
  ]);
  let tpl = selectedTemplate();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const requested = params.get('template');
  if (requested) {
    const found = templates.find(item => templateKey(item) === requested);
    if (found && canUseTemplate(found)) tpl = found;
    else if (found) {
      setTimeout(() => openUpgrade(t('templates.premiumLocked')), 200);
    }
  }
  if (!tpl && templates.length) tpl = templates[0];
  if (tpl) setSelectedTemplate(tpl);

  await loadGuestBatches().catch(() => []);
  if (state.selectedBatchId) await loadGuests(state.selectedBatchId).catch(() => []);
  await restoreCustomFont().catch(() => null);
  const invitation = await loadLatestInvitation(true).catch(() => null);
  const details = detailsFor(invitation || {});
  if (invitation?.template_id) {
    const saved = templates.find(item => item.id === invitation.template_id);
    if (saved) tpl = saved;
  }
  if (tpl) setSelectedTemplate(tpl);

  const design = designFor(tpl);
  const qrAllowed = planFeature('qr_code');
  const customFontAllowed = planFeature('custom_font');
  const pdfAllowed = planFeature('pdf');
  const hasBatch = !!state.selectedBatchId;

  container.innerHTML = `
    <div class="customize-layout">
      <div>
        <section class="card mb-3">
          <div class="card-head">
            <div>
              <h2>${escapeHtml(t('templates.title'))}</h2>
              <p>${escapeHtml(tpl?.name || t('customize.needTemplate'))}</p>
            </div>
            <div class="row" style="gap:6px">${swatches(design)}</div>
          </div>
          <div class="card-body">
            <div class="form-grid">
              <div class="field span-2">
                <label for="c-template">Template</label>
                <select id="c-template">${templateSelectOptions(templates, tpl)}</select>
              </div>
            </div>
            <div class="btn-group mt-2">
              <a href="#/templates" class="btn btn-sm btn-outline">Browse all templates</a>
              ${tpl?.is_premium ? `<span class="badge badge-gold">Premium template</span>` : ''}
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2>${escapeHtml(t('customize.details'))}</h2>
              <p>${escapeHtml(t('customize.subtitle'))}</p>
            </div>
          </div>
          <form id="customize-form" class="card-body" novalidate>
            <div class="form-grid">
              <div class="field span-2">
                <label for="c-event">${escapeHtml(t('customize.event'))}</label>
                <input id="c-event" type="text" value="${escapeAttr(details.event_name)}" placeholder="Wedding Celebration">
              </div>
              <div class="field">
                <label for="c-bride">${escapeHtml(t('customize.bride'))} <span class="req">*</span></label>
                <input id="c-bride" type="text" value="${escapeAttr(details.bride_name)}" required placeholder="Riya">
              </div>
              <div class="field">
                <label for="c-groom">${escapeHtml(t('customize.groom'))} <span class="req">*</span></label>
                <input id="c-groom" type="text" value="${escapeAttr(details.groom_name)}" required placeholder="Aarav">
              </div>
              <div class="field">
                <label for="c-date">${escapeHtml(t('customize.date'))}</label>
                <input id="c-date" type="date" value="${escapeAttr(details.wedding_date || '')}">
              </div>
              <div class="field">
                <label for="c-time">${escapeHtml(t('customize.time'))}</label>
                <input id="c-time" type="text" value="${escapeAttr(details.time)}" placeholder="7:00 PM onwards">
              </div>
              <div class="field span-2">
                <label for="c-venue">${escapeHtml(t('customize.venue'))}</label>
                <input id="c-venue" type="text" value="${escapeAttr(details.venue)}" placeholder="The Grand Bhagwati, Ahmedabad">
              </div>
              <div class="field span-2">
                <label for="c-maps">${escapeHtml(t('customize.maps'))} <span class="small muted">(${escapeHtml(t('common.optional'))})</span></label>
                <input id="c-maps" type="url" value="${escapeAttr(details.maps_url)}" placeholder="https://maps.google.com/?q=...">
                <span class="help">Used for the venue QR code on premium plans.</span>
              </div>
              <div class="field span-2">
                <label for="c-family">${escapeHtml(t('customize.family'))}</label>
                <input id="c-family" type="text" value="${escapeAttr(details.family_details)}" placeholder="Kadiya Family · Ahmedabad">
              </div>
              <div class="field span-2">
                <div class="message-tools">
                  <label for="c-message">${escapeHtml(t('customize.message'))}</label>
                  <button type="button" class="btn btn-xs btn-outline" id="suggest-message">${escapeHtml(t('customize.suggest'))}</button>
                </div>
                <textarea id="c-message" rows="4" placeholder="${escapeAttr(t('customize.message'))}">${escapeHtml(details.message)}</textarea>
              </div>
              <div class="field">
                <label for="c-language">${escapeHtml(t('customize.language'))}</label>
                <select id="c-language">
                  <option value="gu" ${details.language === 'gu' ? 'selected' : ''}>ગુજરાતી · Gujarati</option>
                  <option value="en" ${details.language === 'en' ? 'selected' : ''}>English</option>
                </select>
              </div>
              <div class="field">
                <label for="c-font">${escapeHtml(t('customize.font'))}</label>
                <select id="c-font">${fontOptions(details)}</select>
              </div>
              <div class="field">
                <label>${escapeHtml(t('customize.logo'))}</label>
                <div class="upload-mini">
                  <span class="logo-preview" id="logo-preview">${details.logo_url ? `<img src="${escapeAttr(details.logo_url)}" alt="Logo">` : 'કં'}</span>
                  <div class="grow">
                    <div>${escapeHtml(details.logo_url ? 'Logo added' : 'PNG or JPG · max 2 MB')}</div>
                    <div class="row" style="gap:6px;margin-top:4px">
                      <label class="btn btn-xs btn-outline" for="logo-file">${escapeHtml(t('common.select'))}</label>
                      ${details.logo_url ? `<button type="button" class="btn btn-xs btn-ghost" id="remove-logo">${escapeHtml(t('common.remove'))}</button>` : ''}
                    </div>
                  </div>
                </div>
                <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" class="hidden">
                <input id="logo-data" type="hidden" value="${escapeAttr(details.logo_url)}">
              </div>
              <div class="field">
                <label>${escapeHtml(t('customize.font'))} upload</label>
                <div class="upload-mini">
                  <div class="grow">
                    <div>${customFontAllowed ? 'TTF / OTF / WOFF · max 3 MB' : 'Custom font is a Premium feature'}</div>
                    <div class="row" style="gap:6px;margin-top:4px">
                      <label class="btn btn-xs ${customFontAllowed ? 'btn-outline' : 'btn-ghost'}" for="font-file">${escapeHtml(customFontAllowed ? t('common.select') : t('common.upgrade'))}</label>
                    </div>
                  </div>
                </div>
                <input id="font-file" type="file" accept=".ttf,.otf,.woff,.woff2" class="hidden">
              </div>
              <div class="field span-2">
                <label class="switch">
                  <input type="checkbox" id="c-qr" ${details.show_qr && qrAllowed ? 'checked' : ''} ${qrAllowed ? '' : 'disabled'}>
                  <span>${escapeHtml(t('customize.qr'))}${qrAllowed ? '' : ' · Premium'}</span>
                </label>
                <span class="help">Adds a scannable Google Maps QR code to every card.</span>
              </div>
            </div>

            <div class="divider"></div>
            <div class="row-wrap" style="justify-content:space-between">
              <div class="btn-group">
                <button type="button" class="btn btn-primary" id="save-continue">${escapeHtml(t('customize.save'))}</button>
                <button type="button" class="btn btn-outline" id="save-only">${escapeHtml(t('customize.saveOnly'))}</button>
              </div>
              <div class="btn-group">
                <button type="button" class="btn btn-ghost" id="download-pdf">${escapeHtml(t('customize.downloadPdf'))}${pdfAllowed ? '' : ' · Premium'}</button>
              </div>
            </div>
            <p class="help mt-2">${hasBatch ? `${state.guests.length} guests loaded · ${escapeHtml(currentPlan().name)} plan` : `<a href="#/upload-guests">Upload a guest list</a> to personalise every card.`}</p>
          </form>
        </section>
      </div>

      <aside class="sticky-preview">
        <div class="preview-card">
          <div class="row" style="justify-content:space-between;padding:2px 2px 8px">
            <strong style="font-family:var(--font-display);font-size:16px">${escapeHtml(t('customize.preview'))}</strong>
            <span class="badge badge-primary">1080 × 1350</span>
          </div>
          <div id="preview-wrap"><div class="loading-block"><span class="spinner"></span></div></div>
          <div class="preview-note">
            <span>${escapeHtml(sampleGuest().guest_name)}</span>
            <span>${escapeHtml(formatDate(details.wedding_date, details.language || getLang()) || '—')}</span>
          </div>
        </div>
      </aside>
    </div>`;

  currentCanvas = document.createElement('canvas');

  const form = container.querySelector('#customize-form');

  function currentTpl() {
    return selectedTemplate();
  }

  function previewOptions() {
    const d = collectDetailsFromForm(form);
    const tp = currentTpl();
    if (!qrAllowed) d.show_qr = false;
    return {
      details: d,
      design: designFor(tp),
      template: tp,
      guest: sampleGuest(),
      watermark: !planFeature('remove_watermark'),
      qrText: d.maps_url || (d.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.venue)}` : '')
    };
  }

  async function paintPreview() {
    const wrap = container.querySelector('#preview-wrap');
    if (!wrap) return;
    try {
      const opts = previewOptions();
      const assets = await prepareAssets({ details: opts.details, template: opts.template, qrText: opts.qrText });
      await renderPreview(currentCanvas, { ...opts, assets });
      if (wrap.firstChild !== currentCanvas) {
        wrap.innerHTML = '';
        wrap.appendChild(currentCanvas);
      }
      container.querySelector('.preview-note span:first-child').textContent = sampleGuest().guest_name;
      container.querySelector('.preview-note span:last-child').textContent = formatDate(opts.details.wedding_date, opts.details.language || getLang()) || '—';
    } catch (error) {
      wrap.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message || t('common.error'))}</div>`;
    }
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(paintPreview, 180);
  }

  form.addEventListener('input', schedulePreview);
  form.addEventListener('change', (event) => {
    if (event.target.id === 'c-language') {
      const lang = event.target.value;
      const message = form.querySelector('#c-message');
      if (!message.value.trim() || MESSAGE_IDEAS.gu.includes(message.value) || MESSAGE_IDEAS.en.includes(message.value)) {
        message.value = MESSAGE_IDEAS[lang][0];
      }
    }
    schedulePreview();
  });

  container.querySelector('#c-template')?.addEventListener('change', (event) => {
    const found = templates.find(item => templateKey(item) === event.target.value);
    if (!found) return;
    if (!canUseTemplate(found)) {
      event.target.value = templateKey(currentTpl());
      openUpgrade(t('templates.premiumLocked'));
      return;
    }
    setSelectedTemplate(found);
    const headName = container.querySelector('.card-head p');
    if (headName) headName.textContent = found.name;
    const swatchRow = container.querySelector('.card-head .row');
    if (swatchRow) swatchRow.innerHTML = swatches(designFor(found));
    schedulePreview();
  });

  form.querySelector('#suggest-message').addEventListener('click', () => {
    const d = collectDetailsFromForm(form);
    const lang = d.language || 'gu';
    const ideas = MESSAGE_IDEAS[lang];
    let next = ideas[Math.floor(Math.random() * ideas.length)];
    const names = [d.bride_name, d.groom_name].filter(Boolean);
    if (names.length === 2) {
      next = lang === 'gu'
        ? `${d.bride_name} અને ${d.groom_name} ના શુભ લગ્ન પ્રસંગે ${next}`
        : `On the wedding of ${d.bride_name} and ${d.groom_name}, ${next.charAt(0).toLowerCase()}${next.slice(1)}`;
    }
    form.querySelector('#c-message').value = next;
    schedulePreview();
  });

  form.querySelector('#logo-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await uploadLogo(file);
      form.querySelector('#logo-data').value = dataUrl;
      form.querySelector('#logo-preview').innerHTML = `<img src="${escapeAttr(dataUrl)}" alt="Logo">`;
      schedulePreview();
      toast('Logo added', 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
    event.target.value = '';
  });

  form.querySelector('#remove-logo')?.addEventListener('click', () => {
    form.querySelector('#logo-data').value = '';
    form.querySelector('#logo-preview').textContent = 'કં';
    schedulePreview();
  });

  form.querySelector('#font-file').addEventListener('change', async (event) => {
    if (!customFontAllowed) {
      openUpgrade('Custom font upload is available on Premium.');
      event.target.value = '';
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const record = await saveCustomFont(file);
      toast('Custom font loaded', 'success');
      const select = form.querySelector('#c-font');
      if (![...select.options].some(o => o.value === record.name)) {
        const option = document.createElement('option');
        option.value = record.name;
        option.textContent = `${record.name} (uploaded)`;
        select.appendChild(option);
      }
      select.value = record.name;
      schedulePreview();
    } catch (error) {
      toast(error.message, 'error');
    }
    event.target.value = '';
  });

  form.querySelector('#c-qr').addEventListener('click', (event) => {
    if (!qrAllowed) {
      event.preventDefault();
      openUpgrade('Venue QR codes are available on Premium and Business plans.');
    }
  });

  async function saveInvitation(continueAfter) {
    const tp = currentTpl();
    if (!tp) {
      toast(t('customize.needTemplate'), 'warning');
      return;
    }
    if (!canUseTemplate(tp)) {
      openUpgrade(t('templates.premiumLocked'));
      return;
    }
    const d = collectDetailsFromForm(form);
    if (!d.bride_name || !d.groom_name) {
      toast('Bride and groom names are required.', 'warning');
      form.querySelector(!d.bride_name ? '#c-bride' : '#c-groom')?.focus();
      return;
    }
    if (!qrAllowed) d.show_qr = false;
    const payload = {
      user_id: state.user.id,
      template_id: tp.id || null,
      design_json: designFor(tp),
      ...d,
      updated_at: new Date().toISOString()
    };
    try {
      const buttons = [form.querySelector('#save-continue'), form.querySelector('#save-only')];
      buttons.forEach(b => { if (b) b.disabled = true; });
      let saved;
      if (state.invitation?.id) {
        const { data, error } = await sb.from('invitation_details').update(payload).eq('id', state.invitation.id).select('*').single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await sb.from('invitation_details').insert(payload).select('*').single();
        if (error) throw error;
        saved = data;
      }
      state.invitation = saved;
      toast(t('customize.saved'), 'success');
      if (continueAfter) {
        location.hash = state.selectedBatchId ? '#/generate' : '#/upload-guests';
      }
    } catch (error) {
      toast(error.message || t('common.error'), 'error');
    } finally {
      [form.querySelector('#save-continue'), form.querySelector('#save-only')].forEach(b => { if (b) b.disabled = false; });
    }
  }

  form.querySelector('#save-continue').addEventListener('click', () => saveInvitation(true));
  form.querySelector('#save-only').addEventListener('click', () => saveInvitation(false));

  form.querySelector('#download-pdf').addEventListener('click', async () => {
    if (!pdfAllowed) {
      openUpgrade('PDF export is available on Premium and Business plans.');
      return;
    }
    const btn = form.querySelector('#download-pdf');
    btn.disabled = true;
    try {
      await downloadPreviewAsPdf();
      toast('PDF downloaded', 'success');
    } catch (error) {
      toast(error.message || t('common.error'), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  async function downloadPreviewAsPdf() {
    const opts = previewOptions();
    const assets = await prepareAssets({ details: opts.details, template: opts.template, qrText: opts.qrText });
    const canvas = document.createElement('canvas');
    const { renderExportCanvas } = await import('../renderer.js');
    await renderExportCanvas(canvas, { ...opts, assets }, 2);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1350], hotfixes: ['px_scaling'] });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 1080, 1350);
    const name = `${(opts.details.bride_name || 'Bride').replace(/\s+/g, '_')}_${(opts.details.groom_name || 'Groom').replace(/\s+/g, '_')}_Invitation.pdf`;
    pdf.save(name);
  }

  // Share preview via WhatsApp/email (text)
  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'btn btn-sm btn-outline btn-block mt-2';
  shareBtn.textContent = t('common.share') + ' · WhatsApp';
  shareBtn.addEventListener('click', () => {
    if (!planFeature('whatsapp')) { openUpgrade('WhatsApp sharing is available on Premium and Business plans.'); return; }
    const opts = previewOptions();
    const text = cardShareText(opts.details, sampleGuest(), opts.details.language);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });
  container.querySelector('.preview-card')?.appendChild(shareBtn);

  if (tpl && !canUseTemplate(tpl)) {
    openUpgrade(t('templates.premiumLocked'));
  }

  await ensureFonts();
  void makeQrDataUrl;
  void confirmDialog;
  void inviteLimit;
  paintPreview();
}
