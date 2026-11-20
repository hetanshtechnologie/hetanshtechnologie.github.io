let parsed = null;
let parseError = '';

const HEADER_ALIASES = {
  guest_name: ['guestname', 'guest', 'name', 'fullname', 'inviteename', 'invitename'],
  family_name: ['familyname', 'family', 'household', 'surname'],
  city: ['city', 'town', 'village'],
  mobile: ['mobile', 'phone', 'mobileno', 'contact', 'whatsapp', 'number'],
  relation: ['relation', 'relationship', 'remarks', 'note']
};

function findColumn(headers, key) {
  const aliases = HEADER_ALIASES[key] || [key];
  for (const alias of aliases) {
    const index = headers.findIndex(h => normalizeHeader(h) === alias);
    if (index !== -1) return index;
  }
  return -1;
}

function parseWorkbookRows(rows) {
  const headerRow = (rows[0] || []).map(value => String(value ?? '').trim());
  if (!headerRow.some(Boolean)) {
    throw new Error('The file has no header row. Include GuestName, FamilyName, City columns.');
  }
  const columns = {
    guest_name: findColumn(headerRow, 'guest_name'),
    family_name: findColumn(headerRow, 'family_name'),
    city: findColumn(headerRow, 'city'),
    mobile: findColumn(headerRow, 'mobile'),
    relation: findColumn(headerRow, 'relation')
  };
  if (columns.guest_name === -1) {
    throw new Error('GuestName column not found. Your file needs a GuestName header.');
  }
  const valid = [];
  const invalid = [];
  rows.slice(1).forEach((row, index) => {
    const get = (key) => columns[key] === -1 ? '' : String(row[columns[key]] ?? '').trim();
    const guest = {
      guest_name: get('guest_name'),
      family_name: get('family_name'),
      city: get('city'),
      mobile: get('mobile'),
      relation: get('relation')
    };
    if (!guest.guest_name) {
      const nonEmpty = Object.values(guest).some(Boolean);
      if (nonEmpty) invalid.push({ row: index + 2, reason: 'GuestName is empty', data: guest });
      return;
    }
    valid.push(guest);
  });
  return { valid, invalid, headers: headerRow };
}

async function readGuestFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new Error('Please upload a .csv, .xlsx or .xls file.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('File is larger than 12 MB.');
  }
  const buffer = await readFileAsArrayBuffer(file);
  let rows;
  if (ext === 'csv') {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(buffer)).replace(/^\uFEFF/, '');
    const workbook = window.XLSX.read(text, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  } else {
    const workbook = window.XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  }
  return parseWorkbookRows(rows);
}

function validationHtml(data, error) {
  if (error) {
    return `<div class="alert alert-danger mt-2">${escapeHtml(error)}</div>`;
  }
  if (!data) return '';
  const total = data.valid.length + data.invalid.length;
  return `
    <div class="validation-grid">
      <div class="validation-item"><div class="v-label">${escapeHtml(t('guests.total'))}</div><div class="v-value">${total}</div></div>
      <div class="validation-item ok"><div class="v-label">${escapeHtml(t('guests.valid'))}</div><div class="v-value">${data.valid.length}</div></div>
      <div class="validation-item ${data.invalid.length ? 'bad' : ''}"><div class="v-label">${escapeHtml(t('guests.invalid'))}</div><div class="v-value">${data.invalid.length}</div></div>
      <div class="validation-item"><div class="v-label">${escapeHtml(t('generate.format'))}</div><div class="v-value" style="font-size:14px">CSV / XLSX</div></div>
    </div>
    ${data.invalid.length ? `<div class="alert alert-warning mb-2">${data.invalid.slice(0, 3).map(e => `Row ${e.row}: ${escapeHtml(e.reason)}`).join(' · ')}${data.invalid.length > 3 ? ` · +${data.invalid.length - 3} more` : ''}</div>` : ''}
    <div class="upload-list">
      <table class="data">
        <thead><tr><th>#</th><th>${escapeHtml(t('common.name'))}</th><th>${escapeHtml(t('common.family'))}</th><th>${escapeHtml(t('common.city'))}</th><th>${escapeHtml(t('common.mobile'))}</th><th>${escapeHtml(t('common.relation'))}</th></tr></thead>
        <tbody>
          ${data.valid.slice(0, 100).map((g, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(g.guest_name)}</strong></td>
            <td>${escapeHtml(g.family_name || '—')}</td>
            <td>${escapeHtml(g.city || '—')}</td>
            <td>${escapeHtml(g.mobile || '—')}</td>
            <td>${escapeHtml(g.relation || '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${data.valid.length > 100 ? `<p class="help mt-1">Showing first 100 of ${data.valid.length} rows.</p>` : ''}
    <div class="row-wrap mt-2">
      <button type="button" class="btn btn-primary" data-save-list ${data.valid.length > inviteLimit() ? 'disabled' : ''}>${escapeHtml(t('guests.save'))}</button>
      <button type="button" class="btn btn-ghost" data-clear-file>${escapeHtml(t('common.remove'))}</button>
      ${data.valid.length > inviteLimit() ? `<button type="button" class="btn btn-gold" data-open-upgrade>${escapeHtml(t('common.upgrade'))}</button>` : ''}
    </div>
    ${data.valid.length > inviteLimit() ? `<div class="alert alert-warning mt-2">${escapeHtml(t('guests.limit', { limit: inviteLimit(), count: data.valid.length }))}</div>` : ''}`;
}

function batchesHtml(batches) {
  if (!batches.length) {
    return emptyState({ title: t('guests.noLists'), copy: t('guests.noListsCopy'), mark: '☰' });
  }
  return batches.map(batch => `
    <div class="batch-row ${batch.id === state.selectedBatchId ? 'selected' : ''}" data-batch="${escapeAttr(batch.id)}">
      <div class="b-main">
        <strong>${escapeHtml(batch.label)}</strong>
        <small>${Number(batch.guest_count || 0)} ${escapeHtml(t('common.guests'))} · ${escapeHtml(formatDateTime(batch.created_at, getLang()))}${batch.file_name ? ` · ${escapeHtml(batch.file_name)}` : ''}</small>
      </div>
      <div class="row" style="gap:5px">
        ${batch.id === state.selectedBatchId ? `<span class="badge badge-primary">${escapeHtml(t('guests.selected'))}</span>` : `<button type="button" class="btn btn-xs btn-outline" data-use-batch="${escapeAttr(batch.id)}">${escapeHtml(t('guests.useList'))}</button>`}
        <button type="button" class="icon-btn" style="width:30px;height:30px" data-view-batch="${escapeAttr(batch.id)}" title="${escapeAttr(t('common.view'))}"><svg class="icon" style="width:14px;height:14px"><use href="#ic-guests"></use></svg></button>
        <button type="button" class="icon-btn danger" style="width:30px;height:30px" data-delete-batch="${escapeAttr(batch.id)}" title="${escapeAttr(t('common.delete'))}"><svg class="icon" style="width:14px;height:14px"><use href="#ic-trash"></use></svg></button>
      </div>
    </div>`).join('');
}

async function renderGuests(container) {
  await loadPlan().catch(() => null);
  const batches = await loadGuestBatches(true);
  const limit = inviteLimit();
  parsed = null;
  parseError = '';

  container.innerHTML = `
    <div class="alert alert-info mb-3">
      <span>${escapeHtml(t('guests.subtitle'))}. Plan: <strong>${escapeHtml(currentPlan().name)}</strong> · limit <strong>${limit >= 999999 ? '∞' : limit}</strong>.</span>
    </div>
    <div class="dash-grid" style="grid-template-columns:1.35fr .65fr;margin-top:0">
      <section class="card">
        <div class="card-head">
          <div>
            <h2>${escapeHtml(t('guests.uploadTitle'))}</h2>
            <p>${escapeHtml(t('guests.uploadCopy'))}</p>
          </div>
          <a href="#" class="btn btn-sm btn-outline" id="download-sample">${escapeHtml(t('guests.sample'))}</a>
        </div>
        <div class="card-body">
          <div class="dropzone" id="dropzone" tabindex="0" role="button">
            <div class="dz-icon"><svg class="icon"><use href="#ic-upload"></use></svg></div>
            <h3>${escapeHtml(t('guests.uploadTitle'))}</h3>
            <p>${escapeHtml(t('guests.uploadCopy'))}</p>
            <p class="mt-1"><span class="dz-link">${escapeHtml(t('guests.browse'))}</span></p>
            <input type="file" id="guest-file" accept=".csv,.xlsx,.xls" class="hidden">
          </div>
          <div id="file-status" class="mt-2"></div>
          <div id="validation"></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>${escapeHtml(t('guests.recent'))}</h2>
            <p>${batches.length} ${escapeHtml(batches.length === 1 ? 'list' : 'lists')}</p>
          </div>
        </div>
        <div class="card-body" style="padding:0" id="batches-list">${batchesHtml(batches)}</div>
      </section>
    </div>`;

  const dropzone = container.querySelector('#dropzone');
  const fileInput = container.querySelector('#guest-file');
  const statusEl = container.querySelector('#file-status');
  const validationEl = container.querySelector('#validation');
  const listEl = container.querySelector('#batches-list');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
  });

  ['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  async function handleFile(file) {
    parsed = null;
    parseError = '';
    statusEl.innerHTML = `<div class="alert alert-info"><span class="spinner sm"></span> Reading ${escapeHtml(file.name)}…</div>`;
    validationEl.innerHTML = '';
    try {
      const result = await readGuestFile(file);
      if (result.valid.length > MAX_GUESTS) {
        throw new Error(`Maximum ${MAX_GUESTS.toLocaleString('en-IN')} guests per file.`);
      }
      if (!result.valid.length && !result.invalid.length) {
        throw new Error('The file has no data rows.');
      }
      parsed = { ...result, file };
      statusEl.innerHTML = `<div class="alert alert-success"><svg class="icon" style="width:15px;height:15px"><use href="#ic-check"></use></svg> <span>${escapeHtml(file.name)} ready — ${result.valid.length} valid records.</span></div>`;
      validationEl.innerHTML = validationHtml(parsed, '');
    } catch (error) {
      parseError = error.message;
      statusEl.innerHTML = '';
      validationEl.innerHTML = validationHtml(null, error.message);
    }
    fileInput.value = '';
  }

  container.querySelector('#download-sample').addEventListener('click', (event) => {
    event.preventDefault();
    const csv = 'GuestName,FamilyName,City,Mobile,Relation\nSnehal Kadiya,Kadiya Family,Ahmedabad,9876543210,Friend\nRaj Patel,Patel Family,Surat,9123456780,Relative\n';
    triggerDownloadText(csv, 'kankotri-guest-sample.csv');
  });

  validationEl.addEventListener('click', async (event) => {
    if (event.target.closest('[data-clear-file]')) {
      parsed = null;
      statusEl.innerHTML = '';
      validationEl.innerHTML = '';
      return;
    }
    if (event.target.closest('[data-open-upgrade]')) {
      openUpgrade(t('guests.limit', { limit: inviteLimit(), count: parsed?.valid.length || 0 }));
      return;
    }
    const saveBtn = event.target.closest('[data-save-list]');
    if (saveBtn && parsed) {
      await saveBatch(saveBtn);
    }
  });

  async function saveBatch(button) {
    if (!parsed?.valid.length) return;
    if (parsed.valid.length > inviteLimit()) {
      openUpgrade(t('guests.limit', { limit: inviteLimit(), count: parsed.valid.length }));
      return;
    }
    button.disabled = true;
    button.innerHTML = `<span class="spinner sm"></span> ${escapeHtml(t('common.saving'))}`;
    try {
      const baseName = parsed.file.name.replace(/\.(csv|xlsx|xls)$/i, '').replace(/[_-]+/g, ' ').trim();
      const label = `${baseName || 'Guest list'} · ${formatDate(new Date().toISOString(), getLang())}`;
      const { data: batch, error: batchError } = await sb.from('guest_batches').insert({
        user_id: state.user.id,
        label,
        file_name: parsed.file.name,
        guest_count: parsed.valid.length
      }).select('*').single();
      if (batchError) throw batchError;

      const rows = parsed.valid.map(g => ({ ...g, user_id: state.user.id, batch_id: batch.id }));
      for (let i = 0; i < rows.length; i += 400) {
        const chunk = rows.slice(i, i + 400);
        const { error } = await sb.from('guest_lists').insert(chunk);
        if (error) {
          await sb.from('guest_batches').delete().eq('id', batch.id);
          throw error;
        }
        button.innerHTML = `<span class="spinner sm"></span> Saving ${Math.min(i + 400, rows.length)}/${rows.length}`;
      }

      await sb.from('usage_logs').insert({
        user_id: state.user.id,
        plan_id: currentPlan().id || null,
        invite_count: rows.length,
        generated_count: 0
      });

      parsed = null;
      statusEl.innerHTML = '';
      validationEl.innerHTML = '';
      selectBatch(batch.id);
      await loadGuestBatches(true);
      listEl.innerHTML = batchesHtml(state.guestBatches);
      toast(t('guests.saved'), 'success');
    } catch (error) {
      toast(error.message || t('common.error'), 'error');
      button.disabled = false;
      button.textContent = t('guests.save');
    }
  }

  listEl.addEventListener('click', async (event) => {
    const useBtn = event.target.closest('[data-use-batch]');
    const viewBtn = event.target.closest('[data-view-batch]');
    const deleteBtn = event.target.closest('[data-delete-batch]');

    if (useBtn) {
      selectBatch(useBtn.dataset.useBatch);
      listEl.innerHTML = batchesHtml(state.guestBatches);
      const batch = currentBatch();
      toast(`${batch?.label || 'Guest list'} selected`, 'success');
    }

    if (viewBtn) {
      const batch = state.guestBatches.find(b => b.id === viewBtn.dataset.viewBatch);
      if (!batch) return;
      const close = openModal({
        title: batch.label,
        subtitle: `${batch.guest_count} ${t('common.guests')}`,
        body: loadingBlock(),
        size: 'lg',
        footer: `<button type="button" class="btn btn-primary" data-select-batch>${escapeHtml(t('guests.useList'))}</button>`,
        onMount(root, closeFn) {
          root.querySelector('[data-select-batch]')?.addEventListener('click', () => {
            selectBatch(batch.id);
            listEl.innerHTML = batchesHtml(state.guestBatches);
            closeFn();
            toast(t('guests.selected'), 'success');
          });
        }
      });
      try {
        const guests = await loadGuests(batch.id, true);
        const bodyEl = document.querySelector('#modal-root [data-modal-body]');
        if (bodyEl) {
          bodyEl.innerHTML = `<div class="upload-list">
            <table class="data"><thead><tr><th>#</th><th>${escapeHtml(t('common.name'))}</th><th>${escapeHtml(t('common.family'))}</th><th>${escapeHtml(t('common.city'))}</th><th>${escapeHtml(t('common.mobile'))}</th></tr></thead><tbody>
            ${guests.map((g, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHtml(g.guest_name)}</strong></td><td>${escapeHtml(g.family_name || '—')}</td><td>${escapeHtml(g.city || '—')}</td><td>${escapeHtml(g.mobile || '—')}</td></tr>`).join('')}
            </tbody></table></div>`;
        }
      } catch (error) {
        const bodyEl = document.querySelector('#modal-root [data-modal-body]');
        if (bodyEl) bodyEl.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
      }
      void close;
    }

    if (deleteBtn) {
      const batch = state.guestBatches.find(b => b.id === deleteBtn.dataset.deleteBatch);
      if (!batch) return;
      const ok = await confirmDialog(`Delete “${batch.label}” and its ${batch.guest_count} guests?`, { danger: true, confirmText: t('common.delete') });
      if (!ok) return;
      const { error } = await sb.from('guest_batches').delete().eq('id', batch.id);
      if (error) { toast(error.message, 'error'); return; }
      if (state.selectedBatchId === batch.id) {
        selectBatch(null);
        const remaining = state.guestBatches.filter(b => b.id !== batch.id);
        if (remaining.length) selectBatch(remaining[0].id);
      }
      await loadGuestBatches(true);
      listEl.innerHTML = batchesHtml(state.guestBatches);
      toast('Guest list deleted', 'success');
    }
  });
}
