import { sb, RAZORPAY_ENABLED } from '../config.js';
import { state, loadPlans, loadProfile, loadPlan, currentPlan, planFeatureList } from '../store.js';
import {
  escapeHtml, toast, openModal, formatCurrency, formatDate, loadingBlock
} from '../utils.js';
import { t, getLang } from '../i18n.js';

const FEATURE_ROWS = [
  ['all_templates', 'All invitation templates'],
  ['hd_export', 'HD 3× export'],
  ['zip_download', 'Bulk ZIP download'],
  ['whatsapp', 'WhatsApp sharing'],
  ['qr_code', 'Venue QR code'],
  ['gujarati_fonts', 'Premium Gujarati fonts'],
  ['remove_watermark', 'Remove watermark'],
  ['email', 'Email invitations'],
  ['pdf', 'PDF export'],
  ['custom_font', 'Custom font upload'],
  ['bulk_whatsapp', 'Bulk WhatsApp sending'],
  ['bulk_email', 'Bulk email sending'],
  ['white_label', 'White label branding'],
  ['team', 'Team members'],
  ['custom_domain', 'Custom domain']
];

function isCurrent(plan) {
  const active = currentPlan();
  if (plan.id && active?.id) return plan.id === active.id;
  return plan.name === active?.name;
}

function limitLabel(plan) {
  const limit = Number(plan.invite_limit || 0);
  return limit >= 999999 ? 'Unlimited' : limit.toLocaleString('en-IN');
}

function planCard(plan, { compact = false } = {}) {
  const current = isCurrent(plan);
  const price = Number(plan.price || 0);
  const featured = plan.name === 'Premium';
  return `
    <div class="price-card ${featured ? 'featured' : ''} ${current ? 'current' : ''}">
      ${featured ? `<span class="price-ribbon">Most popular</span>` : ''}
      <div class="price-head">
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.name === 'Free' ? t('pricing.freePlan') : plan.name === 'Premium' ? 'For growing celebrations' : 'For planners & businesses')}</p>
      </div>
      <div class="price-amount">
        <span class="cur">₹</span>
        <span class="num">${price.toLocaleString('en-IN')}</span>
        ${price > 0 ? `<span class="per">${escapeHtml(t('pricing.month'))}</span>` : ''}
      </div>
      <div class="price-limit">${escapeHtml(limitLabel(plan))} ${escapeHtml(t('pricing.invitees'))} · ${Number(plan.storage_limit_mb || 0).toLocaleString('en-IN')} MB ${escapeHtml(t('pricing.storage'))}</div>
      ${compact ? '' : `<ul class="feature-list">
        ${FEATURE_ROWS.map(([feature]) => {
          const enabled = !!plan.features?.[feature];
          return `<li class="${enabled ? '' : 'off'}"><span class="${enabled ? 'f-yes' : 'f-no'}">${enabled ? '✓' : '✕'}</span><span>${escapeHtml(featureLabel(feature))}</span></li>`;
        }).join('')}
      </ul>`}
      ${compact ? `<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="small muted">${escapeHtml(t('pricing.invitees'))}</span><strong class="small">${escapeHtml(limitLabel(plan))}</strong></div>` : ''}
      <button type="button" class="btn ${current ? 'btn-outline' : price > 0 ? 'btn-primary' : 'btn-outline'} btn-block" data-buy="${escapeHtml(plan.id || 'free')}" ${current || price === 0 ? 'disabled' : ''}>
        ${escapeHtml(current ? t('pricing.current') : price > 0 ? t('pricing.upgrade') : t('common.free'))}
      </button>
    </div>`;
}

function featureLabel(key) {
  const row = FEATURE_ROWS.find(([k]) => k === key);
  return row?.[1] || key;
}

export function openUpgrade(message) {
  const plans = state.plans || [];
  const body = `
    <div class="alert alert-warning mb-3">${escapeHtml(message || t('upgrade.copy', { plan: currentPlan().name, limit: currentPlan().invite_limit }))}</div>
    <div class="radio-cards plan-modal" style="grid-template-columns:repeat(3,1fr)">
      ${plans.filter(p => Number(p.price) > 0).map(plan => `
        <div class="price-card ${plan.name === 'Premium' ? 'featured' : ''}" style="padding:14px">
          <div class="price-head"><h3 style="font-size:19px">${escapeHtml(plan.name)}</h3></div>
          <div class="price-amount" style="margin:8px 0 4px"><span class="cur">₹</span><span class="num">${Number(plan.price).toLocaleString('en-IN')}</span><span class="per">${escapeHtml(t('pricing.month'))}</span></div>
          <div class="small muted">${escapeHtml(limitLabel(plan))} ${escapeHtml(t('pricing.invitees'))}</div>
          <ul class="feature-list" style="margin:8px 0 10px">
            ${FEATURE_ROWS.slice(0, 6).map(([f]) => `<li class="${plan.features?.[f] ? '' : 'off'}"><span class="${plan.features?.[f] ? 'f-yes' : 'f-no'}">${plan.features?.[f] ? '✓' : '✕'}</span><span>${escapeHtml(featureLabel(f))}</span></li>`).join('')}
          </ul>
          <button type="button" class="btn btn-primary btn-sm btn-block" data-modal-buy="${escapeHtml(plan.id)}">${escapeHtml(t('pricing.upgrade'))}</button>
        </div>`).join('')}
    </div>
    <p class="help mt-2">${escapeHtml(t('generate.limitExceeded'))} 14-day activation is available through the admin if online checkout is unavailable.</p>`;
  openModal({
    title: t('upgrade.title'),
    subtitle: t('pricing.subtitle'),
    body,
    size: 'lg',
    footer: `<button type="button" class="btn btn-outline" data-modal-close>${escapeHtml(t('upgrade.later'))}</button><a href="#/pricing" class="btn btn-primary" data-modal-close>${escapeHtml(t('upgrade.cta'))}</a>`,
    onMount(root, close) {
      root.querySelectorAll('[data-modal-buy]').forEach(btn => btn.addEventListener('click', () => {
        const plan = state.plans.find(p => p.id === btn.dataset.modalBuy);
        if (plan) {
          close();
          buyPlan(plan);
        }
      }));
    }
  });
}

export async function render(container) {
  container.innerHTML = loadingBlock(t('common.loading'));
  const [plans] = await Promise.all([
    loadPlans(true).catch(() => []),
    loadPlan().catch(() => null)
  ]);
  if (!plans.length) {
    container.innerHTML = `<div class="alert alert-danger">${escapeHtml(t('common.error'))} Plans could not be loaded. Run the schema file first.</div>`;
    return;
  }
  const active = currentPlan();
  container.innerHTML = `
    <div class="card card-pad mb-3" style="background:linear-gradient(135deg,rgba(183,110,121,.12),rgba(212,175,55,.08));border-color:rgba(212,175,55,.4)">
      <div class="row-wrap" style="justify-content:space-between">
        <div>
          <span class="badge badge-gold">${escapeHtml(active.name)} ${escapeHtml(t('common.currentPlan'))}</span>
          <h2 style="font-family:var(--font-display);font-size:24px;margin-top:8px">${escapeHtml(t('pricing.title'))}</h2>
          <p class="muted small">${escapeHtml(t('pricing.subtitle'))}</p>
        </div>
        <div class="text-right">
          <div class="small muted">${escapeHtml(t('pricing.invitees'))}</div>
          <div style="font-family:var(--font-display);font-size:28px;font-weight:600">${escapeHtml(limitLabel(active))}</div>
        </div>
      </div>
    </div>
    <div class="pricing-grid">${plans.map(plan => planCard(plan)).join('')}</div>
    <div class="alert alert-info mt-3">
      <span>Payments are processed securely via Razorpay. Your plan activates immediately after successful payment. Need an invoice or offline payment? Contact the admin from your profile page.</span>
    </div>
    <div class="card card-pad mt-3">
      <h3 style="font-family:var(--font-display);font-size:20px;font-weight:600;margin-bottom:8px">What happens when I upgrade?</h3>
      <ul class="feature-list" style="grid-template-columns:1fr 1fr;display:grid;gap:8px">
        <li><span class="f-yes">✓</span><span>More invitees per uploaded guest list</span></li>
        <li><span class="f-yes">✓</span><span>HD 3× exports without watermark</span></li>
        <li><span class="f-yes">✓</span><span>WhatsApp and email invitation sharing</span></li>
        <li><span class="f-yes">✓</span><span>All premium and seasonal templates</span></li>
      </ul>
    </div>`;

  container.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-buy]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.buy;
    const plan = plans.find(p => p.id === id);
    if (plan) buyPlan(plan);
  });
}

export async function buyPlan(plan) {
  if (!plan || Number(plan.price) <= 0) {
    toast('Free plan is already available to every account.', 'info');
    return;
  }
  if (!RAZORPAY_ENABLED) {
    toast('Online payments are not enabled. Please contact the admin.', 'warning');
    return;
  }
  try {
    toast('Opening secure checkout…', 'info');
    const { data, error } = await sb.functions.invoke('kankotri-create-order', { body: { plan_id: plan.id } });
    if (error) throw new Error(error.message || 'Checkout could not be started.');
    if (!data?.id || !data?.key_id) throw new Error(data?.error || 'Checkout could not be started.');
    if (typeof window.Razorpay !== 'function') throw new Error('Razorpay checkout failed to load.');

    const rzp = new window.Razorpay({
      key: data.key_id,
      amount: data.amount,
      currency: data.currency || 'INR',
      name: 'Kankotri Invitations',
      description: `${plan.name} plan`,
      order_id: data.id,
      prefill: {
        name: state.profile?.full_name || '',
        email: state.user?.email || ''
      },
      theme: { color: '#B76E79' },
      handler: async (response) => {
        try {
          const verify = await sb.functions.invoke('kankotri-verify-purchase', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: plan.id
            }
          });
          if (verify.error) throw new Error(verify.error.message || 'Payment verification failed.');
          await loadProfile(state.user);
          await loadPlan();
          toast(`${plan.name} plan activated!`, 'success');
          window.dispatchEvent(new CustomEvent('kankotri:refresh'));
        } catch (err) {
          toast(err.message || 'Payment verification failed.', 'error');
        }
      },
      modal: {
        ondismiss: () => toast('Checkout closed.', 'info')
      }
    });
    rzp.on('payment.failed', (response) => {
      toast(response.error?.description || 'Payment failed.', 'error');
    });
    rzp.open();
  } catch (error) {
    const message = String(error.message || '');
    if (message.includes('Failed to send') || message.includes('404') || message.includes('not found')) {
      openModal({
        title: 'Checkout unavailable',
        size: 'sm',
        body: `<div class="alert alert-warning">Razorpay checkout is not deployed yet. Deploy the <code>kankotri-create-order</code> and <code>kankotri-verify-purchase</code> edge functions, then try again.</div>
          <p class="help mt-2">You can also ask an admin to assign a plan from the admin dashboard. Your request: <strong>${escapeHtml(plan.name)} plan</strong>.</p>`,
        footer: `<a class="btn btn-outline" href="#/profile" data-modal-close>${escapeHtml(t('nav.profile'))}</a><button type="button" class="btn btn-primary" data-modal-close>${escapeHtml(t('common.close'))}</button>`
      });
    } else {
      toast(message || t('common.error'), 'error');
    }
  }
}
