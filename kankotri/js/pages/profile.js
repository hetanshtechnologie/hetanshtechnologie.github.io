import { sb } from '../config.js';
import {
  state, loadProfile, loadPlan, loadGuestBatches, currentPlan, inviteLimit,
  isAdmin, isSuspended, setTheme, signOut
} from '../store.js';
import {
  escapeHtml, escapeAttr, toast, formatDate, formatCurrency, statusBadge,
  avatarHtml, initials, loadingBlock, confirmDialog
} from '../utils.js';
import { t, getLang, setLang } from '../i18n.js';

export async function render(container) {
  container.innerHTML = loadingBlock(t('common.loading'));
  const batches = await loadGuestBatches(true).catch(() => []);
  await loadPlan().catch(() => null);
  if (!state.profile) await loadProfile().catch(() => null);

  const profile = state.profile || {};
  const plan = currentPlan();
  const limit = inviteLimit();
  const totalGuests = batches.reduce((sum, batch) => sum + Number(batch.guest_count || 0), 0);
  const usage = Math.min(100, Math.round((totalGuests / Math.max(1, limit)) * 100));
  const isEmailUser = (profile.provider || '').includes('email') || !profile.provider;
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const lang = getLang();

  container.innerHTML = `
    <div class="section-head">
      <div>
        <h2>${escapeHtml(t('profile.title'))}</h2>
        <p>${escapeHtml(t('profile.subtitle'))}</p>
      </div>
      <a href="#/pricing" class="btn btn-outline">${escapeHtml(t('common.upgrade'))}</a>
    </div>

    <div class="profile-grid">
      <aside style="display:grid;gap:18px">
        <section class="card profile-card">
          <div class="profile-avatar">${profile.avatar_url ? `<img src="${escapeAttr(profile.avatar_url)}" alt="${escapeAttr(profile.full_name || '')}">` : escapeHtml(initials(profile.full_name || profile.email || 'G'))}</div>
          <h2>${escapeHtml(profile.full_name || 'Guest')}</h2>
          <p class="p-email">${escapeHtml(profile.email || state.user?.email || '')}</p>
          <div class="row mt-2" style="justify-content:center;gap:6px">
            ${statusBadge(isSuspended() ? 'suspended' : 'active')}
            <span class="badge ${Number(plan.price) > 0 ? 'badge-gold' : ''}">${escapeHtml(plan.name || 'Free')}</span>
            ${isAdmin() ? '<span class="badge badge-primary">Admin</span>' : ''}
          </div>
          <div class="profile-facts">
            <div class="pf"><span>${escapeHtml(t('profile.plan'))}</span><strong>${escapeHtml(plan.name || 'Free')}</strong></div>
            <div class="pf"><span>${escapeHtml(t('profile.role'))}</span><strong>${escapeHtml(profile.role || 'user')}</strong></div>
            <div class="pf"><span>${escapeHtml(t('profile.provider'))}</span><strong>${escapeHtml(profile.provider || 'email')}</strong></div>
            <div class="pf"><span>${escapeHtml(t('profile.memberSince'))}</span><strong>${escapeHtml(formatDate(profile.created_at || state.user?.created_at, lang) || '—')}</strong></div>
          </div>
          <button type="button" class="btn btn-outline btn-block mt-3" id="signout-btn">${escapeHtml(t('profile.signout'))}</button>
        </section>

        <section class="card card-pad">
          <div class="section-head" style="margin-bottom:10px">
            <h2 style="font-size:17px">${escapeHtml(t('dashboard.planUsage'))}</h2>
            <span class="small muted">${usage}%</span>
          </div>
          <div class="progress"><span style="width:${usage}%"></span></div>
          <div class="progress-meta"><span>${totalGuests} ${escapeHtml(t('common.guests'))}</span><span>${limit >= 999999 ? 'Unlimited' : limit} limit</span></div>
          <p class="help mt-2">${escapeHtml(formatCurrency(plan.price, lang))}${Number(plan.price) > 0 ? ` ${escapeHtml(t('pricing.month'))}` : ` · ${escapeHtml(t('pricing.freePlan'))}`} · ${Number(plan.storage_limit_mb || 100).toLocaleString('en-IN')} MB storage</p>
          <a href="#/pricing" class="btn btn-primary btn-sm btn-block mt-2">${escapeHtml(Number(plan.price) > 0 ? 'Change plan' : t('common.upgrade'))}</a>
        </section>
      </aside>

      <div class="settings-grid">
        <section class="card">
          <div class="card-head">
            <div><h2>${escapeHtml(t('profile.account'))}</h2><p>Update your display name and review your sign-in details.</p></div>
            ${avatarHtml(profile)}
          </div>
          <form class="card-body" id="account-form" novalidate>
            <div class="form-grid">
              <div class="field">
                <label for="p-name">${escapeHtml(t('auth.name'))}</label>
                <input id="p-name" type="text" value="${escapeAttr(profile.full_name || '')}" autocomplete="name" required>
              </div>
              <div class="field">
                <label for="p-email">${escapeHtml(t('common.email'))}</label>
                <input id="p-email" type="email" value="${escapeAttr(profile.email || state.user?.email || '')}" disabled>
                <span class="help">Email is managed by your sign-in provider.</span>
              </div>
            </div>
            <div class="row-wrap mt-3" style="justify-content:space-between">
              <button type="submit" class="btn btn-primary" id="save-name">${escapeHtml(t('profile.saveName'))}</button>
              <span class="small muted">User ID · <span class="mono">${escapeHtml(state.user?.id || '')}</span></span>
            </div>
          </form>
        </section>

        <section class="card">
          <div class="card-head">
            <div><h2>${escapeHtml(t('profile.security'))}</h2><p>${isEmailUser ? 'Change the password used to sign in.' : 'Your account uses Google sign-in.'}</p></div>
          </div>
          <div class="card-body">
            ${isEmailUser ? `
              <form id="password-form" novalidate>
                <div class="form-grid">
                  <div class="field">
                    <label for="p-new-pass">${escapeHtml(t('auth.newPassword'))}</label>
                    <input id="p-new-pass" type="password" minlength="6" autocomplete="new-password" required>
                  </div>
                  <div class="field">
                    <label for="p-confirm-pass">${escapeHtml(t('auth.confirmPassword'))}</label>
                    <input id="p-confirm-pass" type="password" minlength="6" autocomplete="new-password" required>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary mt-3" id="save-pass">${escapeHtml(t('profile.changePassword'))}</button>
              </form>` : `
              <div class="alert alert-info"><span>You signed in with Google, so there is no password to manage here. Use your Google account security settings.</span></div>`}
            <div class="divider"></div>
            <div class="row-wrap" style="justify-content:space-between">
              <div><strong class="small">Send a password reset link</strong><p class="help">Useful if you want to set a password for email sign-in later.</p></div>
              <button type="button" class="btn btn-outline btn-sm" id="reset-pass">Send reset email</button>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div><h2>${escapeHtml(t('profile.preferences'))}</h2><p>Language and appearance are saved on this device.</p></div>
          </div>
          <div class="card-body">
            <div class="settings-row">
              <div><strong>${escapeHtml(t('profile.language'))}</strong><small>Interface language for the studio</small></div>
              <select id="p-lang" style="width:170px">
                <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
                <option value="gu" ${lang === 'gu' ? 'selected' : ''}>ગુજરાતી</option>
              </select>
            </div>
            <div class="settings-row">
              <div><strong>${escapeHtml(t('profile.darkMode'))}</strong><small>Switch between light and dark studio themes</small></div>
              <label class="switch">
                <input type="checkbox" id="p-theme" ${theme === 'dark' ? 'checked' : ''}>
                <span>${theme === 'dark' ? 'On' : 'Off'}</span>
              </label>
            </div>
            <div class="settings-row">
              <div><strong>Custom font</strong><small>${state.customFont ? `Loaded: ${escapeHtml(state.customFont.original || state.customFont.name)}` : 'No custom font uploaded'}</small></div>
              <span class="badge">${state.customFont ? 'Ready' : '—'}</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div><h2>Data & privacy</h2><p>Manage the guest data associated with your account.</p></div>
          </div>
          <div class="card-body">
            <div class="settings-row">
              <div><strong>Saved guest lists</strong><small>${batches.length} ${batches.length === 1 ? 'list' : 'lists'} · ${totalGuests} ${escapeHtml(t('common.guests'))}</small></div>
              <a href="#/upload-guests" class="btn btn-sm btn-outline">${escapeHtml(t('nav.guests'))}</a>
            </div>
            <div class="settings-row">
              <div><strong>Generation history</strong><small>Download or remove previously generated cards</small></div>
              <a href="#/history" class="btn btn-sm btn-outline">${escapeHtml(t('nav.history'))}</a>
            </div>
            ${isAdmin() ? `<div class="settings-row"><div><strong>Admin dashboard</strong><small>Manage users, templates, plans and payments</small></div><a href="#/admin" class="btn btn-sm btn-primary">${escapeHtml(t('nav.admin'))}</a></div>` : ''}
          </div>
        </section>
      </div>
    </div>`;

  const nameForm = container.querySelector('#account-form');
  nameForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = container.querySelector('#p-name').value.trim();
    if (!name) {
      toast('Please enter your name.', 'warning');
      return;
    }
    const btn = container.querySelector('#save-name');
    btn.disabled = true;
    try {
      const { data, error } = await sb.from('profiles').update({ full_name: name }).eq('id', state.user.id).select('*').single();
      if (error) throw error;
      await sb.auth.updateUser({ data: { full_name: name } }).catch(() => null);
      state.profile = data;
      toast(t('common.saved'), 'success');
      window.dispatchEvent(new CustomEvent('kankotri:profile'));
    } catch (error) {
      toast(error.message || t('common.error'), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  const passwordForm = container.querySelector('#password-form');
  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const pass = container.querySelector('#p-new-pass').value;
    const confirm = container.querySelector('#p-confirm-pass').value;
    if (pass.length < 6) {
      toast('Password must be at least 6 characters.', 'warning');
      return;
    }
    if (pass !== confirm) {
      toast('Passwords do not match.', 'warning');
      return;
    }
    const btn = container.querySelector('#save-pass');
    btn.disabled = true;
    try {
      const { error } = await sb.auth.updateUser({ password: pass });
      if (error) throw error;
      passwordForm.reset();
      toast('Password updated.', 'success');
    } catch (error) {
      toast(error.message || t('common.error'), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  container.querySelector('#reset-pass').addEventListener('click', async () => {
    const email = profile.email || state.user?.email;
    if (!email) return;
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}${location.pathname}#/reset-password`
      });
      if (error) throw error;
      toast(t('auth.resetSent'), 'success');
    } catch (error) {
      toast(error.message || t('common.error'), 'error');
    }
  });

  container.querySelector('#p-lang').addEventListener('change', (event) => {
    setLang(event.target.value);
    window.dispatchEvent(new CustomEvent('kankotri:refresh'));
  });

  container.querySelector('#p-theme').addEventListener('change', (event) => {
    const next = setTheme(event.target.checked ? 'dark' : 'light');
    event.target.closest('.switch')?.querySelector('span')?.replaceChildren(document.createTextNode(next === 'dark' ? 'On' : 'Off'));
    window.dispatchEvent(new CustomEvent('kankotri:theme', { detail: { theme: next } }));
  });

  container.querySelector('#signout-btn').addEventListener('click', async () => {
    const ok = await confirmDialog('Sign out of Kankotri on this device?', { title: t('profile.signout'), confirmText: t('profile.signout') });
    if (!ok) return;
    await signOut();
  });
}
