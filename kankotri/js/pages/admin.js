const FEATURE_KEYS = [
  ['all_templates', 'All templates'],
  ['hd_export', 'HD 3× export'],
  ['zip_download', 'ZIP download'],
  ['whatsapp', 'WhatsApp sharing'],
  ['qr_code', 'Venue QR code'],
  ['gujarati_fonts', 'Premium Gujarati fonts'],
  ['remove_watermark', 'Remove watermark'],
  ['email', 'Email invitations'],
  ['pdf', 'PDF export'],
  ['custom_font', 'Custom font upload'],
  ['bulk_whatsapp', 'Bulk WhatsApp'],
  ['bulk_email', 'Bulk email'],
  ['white_label', 'White label'],
  ['team', 'Team members'],
  ['custom_domain', 'Custom domain']
];

const BORDERS = ['mandala', 'floral', 'paisley', 'double', 'minimal'];
const ORNAMENTS = ['ganesh', 'om', 'rings', 'kalash', 'sparkle', 'floral', 'mandala'];
const LAYOUTS = ['classic', 'royal', 'modern'];
const FONTS = ['Cormorant Garamond', 'Playfair Display', 'Great Vibes'];

let activeTab = 'overview';

function tabButton(id, label) {
  return `<button type="button" class="tab ${activeTab === id ? 'active' : ''}" data-tab="${id}">${escapeHtml(label)}</button>`;
}

async function audit(action, entity, entityId, meta = {}) {
  try {
    await sb.from('audit_logs').insert({
      actor_id: state.user?.id || null,
      action,
      entity,
      entity_id: entityId == null ? null : String(entityId),
      meta
    });
  } catch {
    /* audit is best effort */
  }
}

async function uploadTemplateAsset(file, folder) {
  if (!file) return null;
  const path = `${folder}/${Date.now()}-${safeName(file.name).replace(/\s+/g, '_')}`;
  const { error } = await sb.storage.from('templates').upload(path, file, { contentType: file.type || undefined, upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from('templates').getPublicUrl(path);
  return data?.publicUrl || null;
}

function statCard(label, value, foot, highlight = false) {
  return `<div class="stat-card ${highlight ? 'highlight' : ''}"><div class="s-label">${escapeHtml(label)}</div><div class="s-value">${escapeHtml(value)}</div><div class="s-foot">${escapeHtml(foot)}</div></div>`;
}

function planName(plans, planId) {
  return plans.find(p => p.id === planId)?.name || 'Free';
}

/* ------------------------------- overview ------------------------------- */
async function renderOverview(panel) {
  panel.innerHTML = loadingBlock(t('common.loading'));
  const [profilesRes, jobsRes, paymentsRes, plansRes] = await Promise.all([
    sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('generation_jobs').select('card_count,status,created_at').limit(5000),
    sb.from('payments').select('*').order('created_at', { ascending: false }).limit(300),
    loadPlans(true).catch(() => [])
  ]);
  const profiles = profilesRes.data || [];
  const jobs = jobsRes.data || [];
  const payments = paymentsRes.data || [];
  const plans = plansRes || [];
  const suspended = profiles.filter(p => p.is_suspended).length;
  const paidUsers = profiles.filter(p => Number(plans.find(pl => pl.id === p.plan_id)?.price || 0) > 0).length;
  const premiumUsers = profiles.filter(p => plans.find(pl => pl.id === p.plan_id)?.name === 'Premium').length;
  const businessUsers = profiles.filter(p => plans.find(pl => pl.id === p.plan_id)?.name === 'Business').length;
  const cards = jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + Number(j.card_count || 0), 0);
  const revenue = payments.filter(p => p.payment_status === 'success').reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const recentUsers = profiles.slice(0, 6);
  const recentPayments = payments.slice(0, 6);

  panel.innerHTML = `
    <div class="admin-stat-grid mb-3">
      ${statCard(t('admin.totalUsers'), String(profiles.length), `${suspended} suspended`)}
      ${statCard(t('admin.activeUsers'), String(profiles.length - suspended), `${paidUsers} paid`)}
      ${statCard(t('admin.premiumUsers'), String(premiumUsers), `${businessUsers} Business`)}
      ${statCard(t('admin.businessUsers'), String(businessUsers), 'top plan')}
      ${statCard(t('admin.cardsGenerated'), cards.toLocaleString('en-IN'), `${jobs.length} jobs`)}
      ${statCard(t('admin.revenue'), formatCurrency(revenue, getLang()), `${payments.filter(p => p.payment_status === 'success').length} payments`, true)}
    </div>
    <div class="dash-grid">
      <section class="card">
        <div class="card-head"><div><h2>Newest users</h2><p>Latest accounts created</p></div><button type="button" class="btn btn-sm btn-outline" data-goto="users">${escapeHtml(t('admin.users'))}</button></div>
        <div class="table-wrap" style="border:0;border-radius:0">
          <table class="data">
            <thead><tr><th>${escapeHtml(t('common.name'))}</th><th>${escapeHtml(t('profile.plan'))}</th><th>${escapeHtml(t('common.status'))}</th><th>Joined</th></tr></thead>
            <tbody>${recentUsers.map(p => `
              <tr>
                <td><div class="user-cell">${avatarHtml(p)}<div><strong>${escapeHtml(p.full_name || 'Guest')}</strong><small>${escapeHtml(p.email || '')}</small></div></div></td>
                <td>${escapeHtml(planName(plans, p.plan_id))}</td>
                <td>${statusBadge(p.is_suspended ? 'suspended' : 'active')}</td>
                <td class="small muted">${escapeHtml(formatDate(p.created_at, getLang()))}</td>
              </tr>`).join('') || `<tr><td colspan="4" class="muted">No users yet.</td></tr>`}</tbody>
          </table>
        </div>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Recent payments</h2><p>Latest Razorpay activity</p></div><button type="button" class="btn btn-sm btn-outline" data-goto="payments">${escapeHtml(t('common.view'))}</button></div>
        <div class="card-body">
          ${recentPayments.length ? `<div class="recent-list">${recentPayments.map(p => {
            const user = profiles.find(u => u.id === p.user_id);
            return `<div class="recent-item">
              <span class="recent-thumb">₹</span>
              <span class="recent-info"><strong>${escapeHtml(user?.full_name || user?.email || 'User')}</strong><small>${escapeHtml(formatDateTime(p.created_at, getLang()))} · ${escapeHtml(p.transaction_id || '—')}</small></span>
              <span class="text-right"><strong>${escapeHtml(formatCurrency(p.amount, getLang()))}</strong><br>${statusBadge(p.payment_status)}</span>
            </div>`;
          }).join('')}</div>` : emptyState({ title: 'No payments yet', copy: 'Successful checkouts will appear here.', mark: '₹' })}
        </div>
      </section>
    </div>
    <section class="card mt-3">
      <div class="card-head"><div><h2>Quick admin actions</h2><p>Jump to the area you need</p></div></div>
      <div class="card-body">
        <div class="quick-grid">
          <button type="button" class="quick-action" data-goto="templates"><span class="q-icon"><svg class="icon"><use href="#ic-templates"></use></svg></span><strong>${escapeHtml(t('admin.templates'))}</strong><small>${state.templates.length} designs</small></button>
          <button type="button" class="quick-action" data-goto="plans"><span class="q-icon"><svg class="icon"><use href="#ic-pricing"></use></svg></span><strong>${escapeHtml(t('admin.plans'))}</strong><small>${plans.length} plans</small></button>
          <button type="button" class="quick-action" data-goto="users"><span class="q-icon"><svg class="icon"><use href="#ic-guests"></use></svg></span><strong>${escapeHtml(t('admin.users'))}</strong><small>Assign plans</small></button>
          <button type="button" class="quick-action" data-goto="payments"><span class="q-icon"><svg class="icon"><use href="#ic-pricing"></use></svg></span><strong>Payments</strong><small>${payments.length} records</small></button>
        </div>
      </div>
    </section>`;

  panel.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.goto)));
}

/* -------------------------------- users -------------------------------- */
async function renderUsers(panel) {
  panel.innerHTML = loadingBlock(t('common.loading'));
  const [profilesRes, plansRes, subsRes] = await Promise.all([
    sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
    loadPlans(true).catch(() => []),
    sb.from('subscriptions').select('*').limit(500)
  ]);
  const profiles = profilesRes.data || [];
  const plans = plansRes || [];
  const subs = subsRes.data || [];

  panel.innerHTML = `
    <section class="card">
      <div class="card-head">
        <div><h2>${escapeHtml(t('admin.users'))}</h2><p>${profiles.length} accounts · assign plans, suspend access or grant admin rights</p></div>
        <div class="search-wrap" style="max-width:280px">
          <svg class="icon"><use href="#ic-search"></use></svg>
          <input type="search" id="user-search" placeholder="${escapeAttr(t('common.search'))}">
        </div>
      </div>
      <div class="table-wrap" style="border:0;border-radius:0">
        <table class="data">
          <thead><tr><th>User</th><th>Plan</th><th>Subscription</th><th>Role</th><th>Joined</th><th class="text-right">${escapeHtml(t('common.actions'))}</th></tr></thead>
          <tbody id="users-body">
            ${profiles.map(p => {
              const sub = subs.find(s => s.user_id === p.id);
              return `<tr data-user="${escapeAttr(p.id)}" data-search="${escapeAttr(`${p.full_name || ''} ${p.email || ''}`.toLowerCase())}">
                <td><div class="user-cell">${avatarHtml(p)}<div><strong>${escapeHtml(p.full_name || 'Guest')}</strong><small>${escapeHtml(p.email || '')}</small></div></div></td>
                <td>
                  <select data-plan-select style="min-width:120px">
                    <option value="">Free</option>
                    ${plans.map(plan => `<option value="${escapeAttr(plan.id)}" ${p.plan_id === plan.id ? 'selected' : ''}>${escapeHtml(plan.name)}</option>`).join('')}
                  </select>
                  <div class="small muted mt-1">${escapeHtml(sub ? formatDate(sub.start_date, getLang()) : '—')}</div>
                </td>
                <td>${statusBadge(p.is_suspended ? 'suspended' : p.subscription_status === 'free' ? 'free' : 'active')}</td>
                <td>${p.role === 'admin' ? '<span class="badge badge-primary">admin</span>' : '<span class="badge">user</span>'}</td>
                <td class="small muted">${escapeHtml(formatDate(p.created_at, getLang()))}</td>
                <td>
                  <div class="table-actions">
                    <button type="button" class="btn btn-xs btn-outline" data-toggle-role>${p.role === 'admin' ? 'Make user' : 'Make admin'}</button>
                    <button type="button" class="btn btn-xs ${p.is_suspended ? 'btn-outline' : 'btn-ghost'}" data-toggle-suspend>${p.is_suspended ? t('admin.activate') : t('admin.suspend')}</button>
                  </div>
                </td>
              </tr>`;
            }).join('') || `<tr><td colspan="6" class="muted">No users found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`;

  const search = panel.querySelector('#user-search');
  search.addEventListener('input', () => {
    const value = search.value.trim().toLowerCase();
    panel.querySelectorAll('[data-user]').forEach(row => {
      row.classList.toggle('hidden', !!value && !row.dataset.search.includes(value));
    });
  });

  panel.querySelectorAll('[data-user]').forEach(row => {
    const user = profiles.find(p => p.id === row.dataset.user);
    if (!user) return;
    row.querySelector('[data-plan-select]').addEventListener('change', async (event) => {
      const planId = event.target.value || null;
      const plan = plans.find(p => p.id === planId);
      try {
        const { error } = await sb.from('profiles').update({
          plan_id: planId,
          subscription_status: planId ? 'active' : 'free'
        }).eq('id', user.id);
        if (error) throw error;
        const existing = subs.find(s => s.user_id === user.id);
        if (existing) {
          await sb.from('subscriptions').update({
            plan_id: planId,
            status: planId ? 'active' : 'cancelled',
            start_date: new Date().toISOString(),
            end_date: null
          }).eq('id', existing.id);
        } else if (planId) {
          await sb.from('subscriptions').insert({
            user_id: user.id,
            plan_id: planId,
            status: 'active',
            start_date: new Date().toISOString()
          });
        }
        await audit('assign_plan', 'profile', user.id, { plan: plan?.name || 'Free' });
        toast(`${user.full_name || user.email} → ${plan?.name || 'Free'}`, 'success');
      } catch (error) {
        toast(error.message || t('common.error'), 'error');
        showTab('users');
      }
    });

    row.querySelector('[data-toggle-suspend]').addEventListener('click', async () => {
      const next = !user.is_suspended;
      const ok = await confirmDialog(`${next ? 'Suspend' : 'Reactivate'} ${user.full_name || user.email}?`, {
        title: next ? t('admin.suspend') : t('admin.activate'),
        confirmText: next ? t('admin.suspend') : t('admin.activate'),
        danger: next
      });
      if (!ok) return;
      try {
        const { error } = await sb.from('profiles').update({ is_suspended: next }).eq('id', user.id);
        if (error) throw error;
        await audit(next ? 'suspend_user' : 'activate_user', 'profile', user.id);
        toast(next ? 'User suspended.' : 'User reactivated.', 'success');
        showTab('users');
      } catch (error) {
        toast(error.message || t('common.error'), 'error');
      }
    });

    row.querySelector('[data-toggle-role]').addEventListener('click', async () => {
      if (user.id === state.user.id) {
        toast('You cannot change your own admin role.', 'warning');
        return;
      }
      const next = user.role === 'admin' ? 'user' : 'admin';
      const ok = await confirmDialog(`Change ${user.full_name || user.email} to ${next}?`, {
        title: 'Change role',
        confirmText: 'Change role',
        danger: next === 'user'
      });
      if (!ok) return;
      try {
        const { error } = await sb.from('profiles').update({ role: next }).eq('id', user.id);
        if (error) throw error;
        await audit('change_role', 'profile', user.id, { role: next });
        toast(`Role changed to ${next}.`, 'success');
        showTab('users');
      } catch (error) {
        toast(error.message || t('common.error'), 'error');
      }
    });
  });
}

/* ------------------------------- templates ------------------------------- */
function templateForm(tpl) {
  const design = { ...DEFAULT_DESIGN, ...(tpl?.design || {}) };
  return `
    <div class="form-grid">
      <div class="field span-2"><label for="t-name">Template name</label><input id="t-name" type="text" value="${escapeAttr(tpl?.name || '')}" required></div>
      <div class="field">
        <label for="t-category">Category</label>
        <select id="t-category">${CATEGORIES.map(c => `<option value="${escapeAttr(c)}" ${tpl?.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="t-layout">Layout</label>
        <select id="t-layout">${LAYOUTS.map(l => `<option value="${l}" ${design.layout === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="t-border">Border</label>
        <select id="t-border">${BORDERS.map(b => `<option value="${b}" ${design.border === b ? 'selected' : ''}>${b}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="t-ornament">Ornament</label>
        <select id="t-ornament">${ORNAMENTS.map(o => `<option value="${o}" ${design.ornament === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="t-font">Display font</label>
        <select id="t-font">${FONTS.map(f => `<option value="${f}" ${design.font === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label class="checkbox"><input type="checkbox" id="t-premium" ${tpl?.is_premium ? 'checked' : ''}><span>Premium template</span></label>
        <label class="checkbox mt-1"><input type="checkbox" id="t-active" ${tpl ? (tpl.is_active !== false ? 'checked' : '') : 'checked'}><span>Active</span></label>
      </div>
      <div class="field span-2">
        <label>Design colours</label>
        <div class="design-grid">
          <div class="design-field"><label for="t-bg1">Background 1</label><input id="t-bg1" type="color" value="${escapeAttr(design.bg?.[0] || '#FFF8E7')}"></div>
          <div class="design-field"><label for="t-bg2">Background 2</label><input id="t-bg2" type="color" value="${escapeAttr(design.bg?.[1] || '#F3DFC1')}"></div>
          <div class="design-field"><label for="t-accent">Accent</label><input id="t-accent" type="color" value="${escapeAttr(design.accent || '#B76E79')}"></div>
          <div class="design-field"><label for="t-gold">Gold</label><input id="t-gold" type="color" value="${escapeAttr(design.gold || '#D4AF37')}"></div>
          <div class="design-field"><label for="t-text">Text</label><input id="t-text" type="color" value="${escapeAttr(design.text || '#5A2A2A')}"></div>
        </div>
      </div>
      <div class="field"><label for="t-thumb">Thumbnail image</label><input id="t-thumb" type="file" accept="image/png,image/jpeg,image/webp"><span class="help">JPG/PNG/WebP · shown in the gallery</span></div>
      <div class="field"><label for="t-design-img">Full design image</label><input id="t-design-img" type="file" accept="image/png,image/jpeg,image/webp"><span class="help">Optional background artwork</span></div>
    </div>`;
}

function collectTemplateForm(root, tpl) {
  const val = (sel) => root.querySelector(sel)?.value || '';
  return {
    name: val('#t-name').trim(),
    category: val('#t-category'),
    is_premium: root.querySelector('#t-premium').checked,
    is_active: root.querySelector('#t-active').checked,
    design: {
      ...DEFAULT_DESIGN,
      layout: val('#t-layout'),
      border: val('#t-border'),
      ornament: val('#t-ornament'),
      font: val('#t-font'),
      bg: [val('#t-bg1'), val('#t-bg2')],
      accent: val('#t-accent'),
      gold: val('#t-gold'),
      text: val('#t-text')
    },
    thumbnail_url: tpl?.thumbnail_url || null,
    template_image_url: tpl?.template_image_url || null
  };
}

async function openTemplateEditor(tpl) {
  const close = openModal({
    title: tpl ? 'Edit template' : t('admin.addTemplate'),
    subtitle: 'Design colours, artwork and availability',
    body: templateForm(tpl),
    size: 'lg',
    footer: `<button type="button" class="btn btn-outline" data-modal-close>${escapeHtml(t('common.cancel'))}</button><button type="button" class="btn btn-primary" data-save-template>${escapeHtml(t('common.save'))}</button>`,
    onMount(root, closeFn) {
      root.querySelector('[data-save-template]').addEventListener('click', async () => {
        const btn = root.querySelector('[data-save-template]');
        btn.disabled = true;
        try {
          const payload = collectTemplateForm(root, tpl);
          if (!payload.name) throw new Error('Template name is required.');
          const thumb = root.querySelector('#t-thumb').files?.[0];
          const designImage = root.querySelector('#t-design-img').files?.[0];
          if (thumb) payload.thumbnail_url = await uploadTemplateAsset(thumb, 'thumbnails');
          if (designImage) payload.template_image_url = await uploadTemplateAsset(designImage, 'designs');
          if (tpl?.id) {
            const { error } = await sb.from('templates').update(payload).eq('id', tpl.id);
            if (error) throw error;
            await audit('update_template', 'template', tpl.id, { name: payload.name });
          } else {
            const { data, error } = await sb.from('templates').insert(payload).select('id').single();
            if (error) throw error;
            await audit('create_template', 'template', data.id, { name: payload.name });
          }
          await loadTemplates(true);
          closeFn();
          toast('Template saved.', 'success');
          showTab('templates');
        } catch (error) {
          toast(error.message || t('common.error'), 'error');
          btn.disabled = false;
        }
      });
    }
  });
  void close;
}

async function renderTemplatesAdmin(panel) {
  panel.innerHTML = loadingBlock(t('common.loading'));
  const { data, error } = await sb.from('templates').select('*').order('created_at', { ascending: false });
  if (error) {
    panel.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    return;
  }
  const templates = data || [];
  panel.innerHTML = `
    <section class="card">
      <div class="card-head">
        <div><h2>${escapeHtml(t('admin.templates'))}</h2><p>${templates.length} designs · ${templates.filter(tpl => tpl.is_active).length} active</p></div>
        <button type="button" class="btn btn-primary" id="add-template"><svg class="icon"><use href="#ic-plus"></use></svg>${escapeHtml(t('admin.addTemplate'))}</button>
      </div>
      <div class="table-wrap" style="border:0;border-radius:0">
        <table class="data">
          <thead><tr><th>Design</th><th>Category</th><th>Access</th><th>Status</th><th>Created</th><th class="text-right">${escapeHtml(t('common.actions'))}</th></tr></thead>
          <tbody>${templates.map(tpl => `
            <tr data-template="${escapeAttr(tpl.id)}">
              <td>
                <div class="user-cell">
                  <span class="recent-thumb">${tpl.thumbnail_url ? `<img src="${escapeAttr(tpl.thumbnail_url)}" alt="">` : 'કં'}</span>
                  <div><strong>${escapeHtml(tpl.name)}</strong><small>${escapeHtml(tpl.design?.layout || 'classic')} · ${escapeHtml(tpl.design?.border || 'mandala')}</small></div>
                </div>
              </td>
              <td>${escapeHtml(tpl.category || '—')}</td>
              <td>${tpl.is_premium ? '<span class="badge badge-gold">Premium</span>' : '<span class="badge">Basic</span>'}</td>
              <td>${statusBadge(tpl.is_active ? 'active' : 'expired')}</td>
              <td class="small muted">${escapeHtml(formatDate(tpl.created_at, getLang()))}</td>
              <td>
                <div class="table-actions">
                  <button type="button" class="btn btn-xs btn-outline" data-edit>${escapeHtml(t('common.edit'))}</button>
                  <button type="button" class="btn btn-xs btn-ghost" data-toggle-active>${tpl.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button type="button" class="icon-btn" data-delete aria-label="${escapeAttr(t('common.delete'))}"><svg class="icon"><use href="#ic-trash"></use></svg></button>
                </div>
              </td>
            </tr>`).join('') || `<tr><td colspan="6" class="muted">No templates yet.</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;

  panel.querySelector('#add-template').addEventListener('click', () => openTemplateEditor(null));

  panel.querySelectorAll('[data-template]').forEach(row => {
    const tpl = templates.find(item => item.id === row.dataset.template);
    row.querySelector('[data-edit]').addEventListener('click', () => openTemplateEditor(tpl));
    row.querySelector('[data-toggle-active]').addEventListener('click', async () => {
      try {
        const { error } = await sb.from('templates').update({ is_active: !tpl.is_active }).eq('id', tpl.id);
        if (error) throw error;
        await audit('toggle_template', 'template', tpl.id, { active: !tpl.is_active });
        await loadTemplates(true);
        showTab('templates');
      } catch (error) {
        toast(error.message || t('common.error'), 'error');
      }
    });
    row.querySelector('[data-delete]').addEventListener('click', async () => {
      const ok = await confirmDialog(`Delete “${tpl.name}”? Existing invitations keep their saved design.`, {
        title: 'Delete template', confirmText: t('common.delete'), danger: true
      });
      if (!ok) return;
      try {
        const { error } = await sb.from('templates').delete().eq('id', tpl.id);
        if (error) throw error;
        await audit('delete_template', 'template', tpl.id, { name: tpl.name });
        await loadTemplates(true);
        toast('Template deleted.', 'success');
        showTab('templates');
      } catch (error) {
        toast(error.message || t('common.error'), 'error');
      }
    });
  });
}

/* --------------------------------- plans --------------------------------- */
function planForm(plan) {
  return `
    <form class="card card-pad" data-plan-id="${escapeAttr(plan.id || '')}">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <h3 style="font-family:var(--font-display);font-size:20px;font-weight:600">${escapeHtml(plan.name)}</h3>
        <label class="checkbox"><input type="checkbox" data-p-active ${plan.is_active ? 'checked' : ''}><span>Active</span></label>
      </div>
      <div class="form-grid">
        <div class="field"><label>Name</label><input type="text" data-p-name value="${escapeAttr(plan.name || '')}" required></div>
        <div class="field"><label>Price (₹)</label><input type="number" min="0" step="1" data-p-price value="${Number(plan.price || 0)}"></div>
        <div class="field"><label>Invite limit</label><input type="number" min="1" step="1" data-p-limit value="${Number(plan.invite_limit || 0)}"></div>
        <div class="field"><label>Storage (MB)</label><input type="number" min="1" step="1" data-p-storage value="${Number(plan.storage_limit_mb || 0)}"></div>
      </div>
      <div class="divider"></div>
      <div class="feature-list" style="margin:0 0 14px;grid-template-columns:1fr 1fr;display:grid;gap:8px">
        ${FEATURE_KEYS.map(([key, label]) => `<label class="checkbox"><input type="checkbox" data-p-feature="${key}" ${plan.features?.[key] ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`).join('')}
      </div>
      <div class="row" style="justify-content:space-between">
        <button type="submit" class="btn btn-primary btn-sm">${escapeHtml(t('common.save'))}</button>
        <span class="small muted">${plan.features ? `${Object.values(plan.features).filter(Boolean).length} features` : ''}</span>
      </div>
    </form>`;
}

async function renderPlans(panel) {
  panel.innerHTML = loadingBlock(t('common.loading'));
  const plans = await loadPlans(true).catch(() => []);
  panel.innerHTML = `
    <div class="section-head">
      <div><h2>${escapeHtml(t('admin.plans'))}</h2><p>Update pricing, limits and feature entitlements</p></div>
      <button type="button" class="btn btn-primary" id="add-plan"><svg class="icon"><use href="#ic-plus"></use></svg>Add plan</button>
    </div>
    <div class="pricing-grid">${plans.map(planForm).join('')}</div>`;

  panel.querySelector('#add-plan').addEventListener('click', () => {
    const close = openModal({
      title: 'Add plan',
      body: `
        <div class="form-grid">
          <div class="field"><label for="np-name">Plan name</label><input id="np-name" type="text" required></div>
          <div class="field"><label for="np-price">Price (₹)</label><input id="np-price" type="number" min="0" value="0"></div>
          <div class="field"><label for="np-limit">Invite limit</label><input id="np-limit" type="number" min="1" value="100"></div>
          <div class="field"><label for="np-storage">Storage (MB)</label><input id="np-storage" type="number" min="1" value="500"></div>
        </div>`,
      footer: `<button type="button" class="btn btn-outline" data-modal-close>${escapeHtml(t('common.cancel'))}</button><button type="button" class="btn btn-primary" data-create>${escapeHtml(t('common.save'))}</button>`,
      onMount(root, closeFn) {
        root.querySelector('[data-create]').addEventListener('click', async () => {
          const name = root.querySelector('#np-name').value.trim();
          if (!name) {
            toast('Plan name is required.', 'warning');
            return;
          }
          const features = {};
          FEATURE_KEYS.forEach(([key]) => { features[key] = false; });
          try {
            const { data, error } = await sb.from('plans').insert({
              name,
              price: Number(root.querySelector('#np-price').value || 0),
              invite_limit: Number(root.querySelector('#np-limit').value || 20),
              storage_limit_mb: Number(root.querySelector('#np-storage').value || 500),
              features,
              is_active: true
            }).select('id').single();
            if (error) throw error;
            await audit('create_plan', 'plan', data.id, { name });
            await loadPlans(true);
            closeFn();
            showTab('plans');
          } catch (error) {
            toast(error.message || t('common.error'), 'error');
          }
        });
      }
    });
    void close;
  });

  panel.querySelectorAll('[data-plan-id]').forEach(form => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = form.dataset.planId;
      const features = {};
      form.querySelectorAll('[data-p-feature]').forEach(input => { features[input.dataset.pFeature] = input.checked; });
      const payload = {
        name: form.querySelector('[data-p-name]').value.trim(),
        price: Number(form.querySelector('[data-p-price]').value || 0),
        invite_limit: Number(form.querySelector('[data-p-limit]').value || 20),
        storage_limit_mb: Number(form.querySelector('[data-p-storage]').value || 100),
        features,
        is_active: form.querySelector('[data-p-active]').checked
      };
      if (!payload.name) {
        toast('Plan name is required.', 'warning');
        return;
      }
      try {
        const { error } = await sb.from('plans').update(payload).eq('id', id);
        if (error) throw error;
        await audit('update_plan', 'plan', id, { name: payload.name });
        toast('Plan saved.', 'success');
        showTab('plans');
      } catch (error) {
        toast(error.message || t('common.error'), 'error');
      }
    });
  });
}

/* ------------------------------- payments ------------------------------- */
async function renderPayments(panel) {
  panel.innerHTML = loadingBlock(t('common.loading'));
  const [paymentsRes, profilesRes] = await Promise.all([
    sb.from('payments').select('*').order('created_at', { ascending: false }).limit(300),
    sb.from('profiles').select('id,email,full_name').limit(500)
  ]);
  const payments = paymentsRes.data || [];
  const profiles = profilesRes.data || [];
  const revenue = payments.filter(p => p.payment_status === 'success').reduce((sum, p) => sum + Number(p.amount || 0), 0);

  panel.innerHTML = `
    <div class="admin-stat-grid mb-3">
      ${statCard('Payments', String(payments.length), 'last 300 records')}
      ${statCard('Collected', formatCurrency(revenue, getLang()), 'successful only', true)}
      ${statCard('Refunds', String(payments.filter(p => p.payment_status === 'refunded').length), 'marked refunded')}
    </div>
    <section class="card">
      <div class="card-head"><div><h2>Payments</h2><p>Razorpay transactions and manual plan activations</p></div></div>
      <div class="table-wrap" style="border:0;border-radius:0">
        <table class="data">
          <thead><tr><th>User</th><th>Amount</th><th>Status</th><th>Transaction</th><th>Date</th><th class="text-right">${escapeHtml(t('common.actions'))}</th></tr></thead>
          <tbody>${payments.map(payment => {
            const user = profiles.find(u => u.id === payment.user_id);
            return `<tr data-payment="${escapeAttr(payment.id)}">
              <td><div class="user-cell">${avatarHtml(user || {})}<div><strong>${escapeHtml(user?.full_name || 'User')}</strong><small>${escapeHtml(user?.email || '')}</small></div></div></td>
              <td><strong>${escapeHtml(formatCurrency(payment.amount, getLang()))}</strong></td>
              <td>${statusBadge(payment.payment_status)}</td>
              <td class="mono">${escapeHtml(payment.transaction_id || '—')}</td>
              <td class="small muted">${escapeHtml(formatDateTime(payment.created_at, getLang()))}</td>
              <td><div class="table-actions">${payment.payment_status === 'success' ? `<button type="button" class="btn btn-xs btn-ghost" data-refund>Mark refunded</button>` : ''}</div></td>
            </tr>`;
          }).join('') || `<tr><td colspan="6" class="muted">No payments yet.</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;

  panel.querySelectorAll('[data-payment]').forEach(row => {
    const payment = payments.find(p => p.id === row.dataset.payment);
    row.querySelector('[data-refund]')?.addEventListener('click', async () => {
      const ok = await confirmDialog('Refund this payment through Razorpay? The plan is not changed automatically.', {
        title: 'Refund payment', confirmText: 'Refund', danger: true
      });
      if (!ok) return;
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) throw new Error('Your session has expired. Please sign in again.');
        const res = await fetch(`${EDGE_URL}/kankotri-admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ action: 'refund-payment', payment_id: payment.id })
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || 'Refund failed');
        toast('Payment refunded through Razorpay.', 'success');
        showTab('payments');
      } catch (error) {
        toast(error.message || t('common.error'), 'error');
      }
    });
  });
}

/* -------------------------------- audit -------------------------------- */
async function renderAudit(panel) {
  panel.innerHTML = loadingBlock(t('common.loading'));
  const { data, error } = await sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(150);
  if (error) {
    panel.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
    return;
  }
  const logs = data || [];
  panel.innerHTML = `
    <section class="card">
      <div class="card-head"><div><h2>Audit log</h2><p>Recent admin and system actions</p></div></div>
      <div class="table-wrap" style="border:0;border-radius:0">
        <table class="data">
          <thead><tr><th>Action</th><th>Entity</th><th>Entity ID</th><th>Meta</th><th>When</th></tr></thead>
          <tbody>${logs.map(log => `
            <tr>
              <td><span class="badge badge-primary">${escapeHtml(log.action)}</span></td>
              <td>${escapeHtml(log.entity || '—')}</td>
              <td class="mono">${escapeHtml(log.entity_id || '—')}</td>
              <td class="small muted">${escapeHtml(log.meta && Object.keys(log.meta).length ? JSON.stringify(log.meta) : '—')}</td>
              <td class="small muted">${escapeHtml(formatDateTime(log.created_at, getLang()))}</td>
            </tr>`).join('') || `<tr><td colspan="5" class="muted">No audit entries yet.</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
}

/* -------------------------------- shell -------------------------------- */
let shell = null;

async function showTab(tab) {
  activeTab = tab;
  if (!shell) return;
  shell.querySelectorAll('[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  const panel = shell.querySelector('#admin-panel');
  if (!panel) return;
  panel.innerHTML = loadingBlock(t('common.loading'));
  if (tab === 'overview') await renderOverview(panel);
  else if (tab === 'users') await renderUsers(panel);
  else if (tab === 'templates') await renderTemplatesAdmin(panel);
  else if (tab === 'plans') await renderPlans(panel);
  else if (tab === 'payments') await renderPayments(panel);
  else if (tab === 'audit') await renderAudit(panel);
}

async function renderAdmin(container) {
  if (!isAdmin()) {
    container.innerHTML = `<div class="alert alert-danger">${escapeHtml('Admin access only. Ask an existing admin to promote your account.')}</div>`;
    return;
  }
  container.innerHTML = `
    <div class="section-head">
      <div><h2>${escapeHtml(t('admin.title'))}</h2><p>${escapeHtml(t('admin.subtitle'))}</p></div>
      <span class="badge badge-primary">${escapeHtml(initials(state.profile?.full_name || 'Admin'))} · admin</span>
    </div>
    <div class="tabs admin-tabs">
      ${tabButton('overview', t('admin.overview'))}
      ${tabButton('users', t('admin.users'))}
      ${tabButton('templates', t('admin.templates'))}
      ${tabButton('plans', t('admin.plans'))}
      ${tabButton('payments', 'Payments')}
      ${tabButton('audit', 'Audit log')}
    </div>
    <div id="admin-panel"></div>`;
  shell = container;
  container.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  await showTab(activeTab);
}
