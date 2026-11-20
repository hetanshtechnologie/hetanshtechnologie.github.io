async function renderDashboard(container) {
  const [batches, jobs] = await Promise.all([
    loadGuestBatches(true).catch(() => []),
    loadJobs(24, true).catch(() => [])
  ]);
  const invitation = await loadLatestInvitation().catch(() => null);
  const lang = getLang();

  const totalGuests = batches.reduce((sum, b) => sum + Number(b.guest_count || 0), 0);
  const completed = jobs.filter(j => j.status === 'completed');
  const cards = completed.reduce((sum, j) => sum + Number(j.card_count || 0), 0);
  const templatesUsed = new Set(completed.map(j => j.template_id).filter(Boolean)).size;
  const now = new Date();
  const monthGuestCount = batches
    .filter(b => {
      const d = new Date(b.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, b) => sum + Number(b.guest_count || 0), 0);
  const limit = inviteLimit();
  const usage = Math.min(100, Math.round((monthGuestCount / Math.max(1, limit)) * 100));
  const recent = jobs.slice(0, 5);
  const firstName = (state.profile?.full_name || state.user?.email || 'there').split(' ')[0];
  const circumference = 2 * Math.PI * 36;

  container.innerHTML = `
    <div class="hero-card">
      <div class="hero-content">
        <p class="eyebrow">${escapeHtml(t('dashboard.welcome'))}, ${escapeHtml(firstName)}</p>
        <h2>${escapeHtml(t('dashboard.heroTitle'))}</h2>
        <p>${escapeHtml(t('dashboard.heroCopy'))}</p>
        <div class="hero-actions">
          <a href="#/customize" class="btn btn-primary">${escapeHtml(t('dashboard.start'))}</a>
          <a href="#/templates" class="btn btn-outline">${escapeHtml(t('dashboard.browse'))}</a>
        </div>
      </div>
      <div class="progress-ring" title="${escapeHtml(t('dashboard.planUsage'))}">
        <svg width="86" height="86" viewBox="0 0 86 86">
          <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(255,248,231,.18)" stroke-width="6"></circle>
          <circle cx="43" cy="43" r="36" fill="none" stroke="#D4AF37" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - (circumference * usage) / 100}"></circle>
        </svg>
        <span>${usage}%</span>
      </div>
    </div>

    <div class="stat-grid" style="margin-top:18px">
      <div class="stat-card">
        <div class="s-label">${escapeHtml(t('dashboard.totalGuests'))}</div>
        <div class="s-value">${totalGuests.toLocaleString('en-IN')}</div>
        <div class="s-foot">${batches.length} ${escapeHtml(batches.length === 1 ? 'list' : 'lists')} uploaded</div>
        <span class="stat-icon"><svg class="icon"><use href="#ic-guests"></use></svg></span>
      </div>
      <div class="stat-card">
        <div class="s-label">${escapeHtml(t('dashboard.templatesUsed'))}</div>
        <div class="s-value">${templatesUsed}</div>
        <div class="s-foot">${escapeHtml(currentPlan().name)} plan</div>
        <span class="stat-icon"><svg class="icon"><use href="#ic-templates"></use></svg></span>
      </div>
      <div class="stat-card highlight">
        <div class="s-label">${escapeHtml(t('dashboard.cardsGenerated'))}</div>
        <div class="s-value">${cards.toLocaleString('en-IN')}</div>
        <div class="s-foot">${completed.length} ${escapeHtml(t('dashboard.jobs'))}</div>
        <span class="stat-icon"><svg class="icon"><use href="#ic-generate"></use></svg></span>
      </div>
      <div class="stat-card">
        <div class="s-label">${escapeHtml(t('dashboard.planUsage'))}</div>
        <div class="s-value">${monthGuestCount}/${limit >= 999999 ? '∞' : limit}</div>
        <div class="s-foot">${escapeHtml(t('dashboard.thisMonth'))} · ${usage}%</div>
        <span class="stat-icon"><svg class="icon"><use href="#ic-pricing"></use></svg></span>
      </div>
    </div>

    <div class="dash-grid">
      <section class="card">
        <div class="card-head">
          <div>
            <h2>${escapeHtml(t('dashboard.recent'))}</h2>
            <p>${escapeHtml(t('history.subtitle'))}</p>
          </div>
          <a href="#/history" class="btn btn-sm btn-outline">${escapeHtml(t('common.view'))}</a>
        </div>
        <div class="card-body">
          ${recent.length ? `<div class="recent-list">
            ${recent.map(job => `
              <a class="recent-item" href="#/history">
                <span class="recent-thumb">${job.template_id ? 'કં' : initials(job.template_name || 'K')}</span>
                <span class="recent-info">
                  <strong>${escapeHtml(job.template_name || 'Invitation set')}</strong>
                  <small>${escapeHtml(formatDateTime(job.created_at, lang))} · ${Number(job.card_count || 0)} ${escapeHtml(t('common.cards'))}</small>
                </span>
                ${statusBadge(job.status)}
              </a>`).join('')}
          </div>` : emptyState({
            title: t('history.empty'),
            copy: t('history.emptyCopy'),
            action: `<a href="#/customize" class="btn btn-primary btn-sm">${escapeHtml(t('dashboard.start'))}</a>`
          })}
        </div>
      </section>

      <div style="display:grid;gap:18px">
        <section class="card">
          <div class="card-head">
            <div><h2>${escapeHtml(t('dashboard.quick'))}</h2></div>
          </div>
          <div class="card-body">
            <div class="quick-grid">
              <a class="quick-action" href="#/upload-guests">
                <span class="q-icon"><svg class="icon"><use href="#ic-upload"></use></svg></span>
                <strong>${escapeHtml(t('nav.guests'))}</strong>
                <small>CSV / XLSX upload</small>
              </a>
              <a class="quick-action" href="#/templates">
                <span class="q-icon"><svg class="icon"><use href="#ic-templates"></use></svg></span>
                <strong>${escapeHtml(t('nav.templates'))}</strong>
                <small>${state.templates.length || 12} designs</small>
              </a>
              <a class="quick-action" href="#/customize">
                <span class="q-icon"><svg class="icon"><use href="#ic-customize"></use></svg></span>
                <strong>${escapeHtml(t('nav.customize'))}</strong>
                <small>${invitation ? escapeHtml(invitation.event_name || 'Saved invitation') : 'Create details'}</small>
              </a>
              <a class="quick-action" href="#/pricing">
                <span class="q-icon"><svg class="icon"><use href="#ic-pricing"></use></svg></span>
                <strong>${escapeHtml(isPaidPlan() ? t('nav.pricing') : t('common.upgrade'))}</strong>
                <small>${escapeHtml(currentPlan().name)} plan</small>
              </a>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div><h2>${escapeHtml(t('generate.summary'))}</h2></div>
          </div>
          <div class="card-body">
            <div class="summary-list">
              <div class="summary-item"><span>${escapeHtml(t('generate.template'))}</span><strong>${escapeHtml(state.selectedTemplate?.name || '—')}</strong></div>
              <div class="summary-item"><span>${escapeHtml(t('generate.guestList'))}</span><strong>${batches[0] ? escapeHtml(batches[0].label) : '—'}</strong></div>
              <div class="summary-item"><span>${escapeHtml(t('generate.count'))}</span><strong>${Number(batches[0]?.guest_count || 0)}</strong></div>
              <div class="summary-item"><span>${escapeHtml(t('common.date'))}</span><strong>${invitation?.wedding_date ? escapeHtml(formatDate(invitation.wedding_date, lang)) : '—'}</strong></div>
            </div>
            <a href="#/generate" class="btn btn-primary btn-block mt-2">${escapeHtml(t('generate.start'))}</a>
          </div>
        </section>
      </div>
    </div>`;
}
