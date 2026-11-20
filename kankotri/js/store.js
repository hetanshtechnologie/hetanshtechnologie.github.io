const FREE_PLAN = {
  id: null,
  name: 'Free',
  price: 0,
  invite_limit: 20,
  storage_limit_mb: 100,
  features: {
    all_templates: false,
    hd_export: false,
    zip_download: true,
    whatsapp: false,
    qr_code: false,
    gujarati_fonts: false,
    remove_watermark: false,
    email: false,
    pdf: false,
    custom_font: false,
    bulk_whatsapp: false,
    bulk_email: false,
    white_label: false,
    team: false,
    custom_domain: false
  }
};

const state = {
  user: null,
  profile: null,
  plan: null,
  plans: [],
  plansLoaded: false,
  templates: [],
  templatesLoaded: false,
  guestBatches: [],
  guestBatchesLoaded: false,
  selectedBatchId: localStorage.getItem('kankotri_batch') || null,
  guests: [],
  invitation: null,
  selectedTemplate: null,
  jobs: [],
  customFont: null,
  customFontName: 'Kankotri Custom'
};

function cacheKey(userId, suffix) {
  return `kankotri_${suffix}_${userId}`;
}

async function loadProfile(user = state.user) {
  if (!user) return null;
  state.user = user;
  try {
    let { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      const meta = user.user_metadata || {};
      const payload = {
        id: user.id,
        email: user.email,
        full_name: meta.full_name || meta.name || (user.email || '').split('@')[0],
        avatar_url: meta.avatar_url || meta.picture || null,
        provider: user.app_metadata?.provider || meta.provider || 'email',
        role: 'user'
      };
      try {
        const inserted = await sb.from('profiles').insert(payload).select('*').single();
        if (inserted.error) throw inserted.error;
        data = inserted.data;
      } catch {
        const retry = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
        data = retry.data;
      }
    }
    state.profile = data || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || (user.email || '').split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || null,
      provider: user.app_metadata?.provider || 'email',
      role: 'user',
      plan_id: null,
      subscription_status: 'free',
      is_suspended: false
    };
    await loadPlan().catch(() => null);
    return state.profile;
  } catch {
    state.profile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || (user.email || '').split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || null,
      provider: user.app_metadata?.provider || 'email',
      role: 'user',
      plan_id: null,
      subscription_status: 'free',
      is_suspended: false
    };
    await loadPlan().catch(() => null);
    return state.profile;
  }
}

async function loadPlan() {
  try {
    const { data } = await sb.rpc('get_my_plan');
    state.plan = data || FREE_PLAN;
    if (!state.plan.features) state.plan.features = {};
    if (!state.plan.name) state.plan = { ...FREE_PLAN };
    return state.plan;
  } catch {
    state.plan = { ...FREE_PLAN };
    return state.plan;
  }
}

function currentPlan() {
  return state.plan || FREE_PLAN;
}

function isAdmin() {
  return state.profile?.role === 'admin';
}

function isSuspended() {
  return !!state.profile?.is_suspended;
}

function inviteLimit() {
  const limit = Number(currentPlan().invite_limit ?? 20);
  return limit > 0 ? limit : 20;
}

function planFeature(key) {
  const features = currentPlan().features || {};
  if (key in features) return !!features[key];
  return false;
}

function isPaidPlan() {
  return Number(currentPlan().price || 0) > 0;
}

async function loadPlans(force = false) {
  if (state.plansLoaded && !force) return state.plans;
  try {
    const { data, error } = await sb.from('plans').select('*').order('price', { ascending: true });
    if (error) throw error;
    state.plans = data || [];
    state.plansLoaded = true;
    return state.plans;
  } catch {
    state.plans = [];
    state.plansLoaded = true;
    return state.plans;
  }
}

function freePlan() {
  return state.plans.find(p => Number(p.price) === 0) || FREE_PLAN;
}

function planById(id) {
  return state.plans.find(p => p.id === id) || FREE_PLAN;
}

async function loadTemplates(force = false) {
  if (state.templatesLoaded && !force) return state.templates;
  try {
    const { data, error } = await sb.from('templates').select('*').eq('is_active', true).order('created_at', { ascending: true });
    if (error) throw error;
    let rows = (data || []).map(t => ({
      ...t,
      key: t.id,
      design: { ...DEFAULT_DESIGN, ...(t.design || {}) },
      local: false
    }));
    if (!rows.length) {
      rows = FALLBACK_TEMPLATES.map(t => ({ ...t, id: null, design: { ...DEFAULT_DESIGN, ...t.design }, local: true }));
    }
    state.templates = rows;
    state.templatesLoaded = true;
    if (!state.selectedTemplate) {
      const savedKey = localStorage.getItem(STORAGE_KEYS.lastTemplate);
      state.selectedTemplate = rows.find(t => String(t.key) === savedKey) || rows[0] || null;
    }
    return state.templates;
  } catch {
    const rows = FALLBACK_TEMPLATES.map(t => ({ ...t, id: null, design: { ...DEFAULT_DESIGN, ...t.design }, local: true }));
    state.templates = rows;
    state.templatesLoaded = true;
    if (!state.selectedTemplate) {
      const savedKey = localStorage.getItem(STORAGE_KEYS.lastTemplate);
      state.selectedTemplate = rows.find(t => String(t.key) === savedKey) || rows[0] || null;
    }
    return state.templates;
  }
}

function templateKey(template) {
  return String(template?.id || template?.key || '');
}

function selectedTemplate() {
  return state.selectedTemplate || state.templates[0] || null;
}

function setSelectedTemplate(template) {
  state.selectedTemplate = template;
  localStorage.setItem(STORAGE_KEYS.lastTemplate, templateKey(template));
  return template;
}

function canUseTemplate(template) {
  if (!template) return true;
  if (!template.is_premium) return true;
  return planFeature('all_templates');
}

function designFor(template) {
  return { ...DEFAULT_DESIGN, ...(template?.design || {}) };
}

function detailsFor(details) {
  return { ...DEFAULT_DETAILS, ...(details || {}) };
}

async function loadGuestBatches(force = false) {
  if (!state.user) return [];
  if (state.guestBatchesLoaded && !force) return state.guestBatches;
  try {
    const { data, error } = await sb
      .from('guest_batches')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;
    state.guestBatches = data || [];
    state.guestBatchesLoaded = true;
    if (state.selectedBatchId && !state.guestBatches.some(b => b.id === state.selectedBatchId)) {
      state.selectedBatchId = null;
      localStorage.removeItem('kankotri_batch');
    }
    return state.guestBatches;
  } catch {
    state.guestBatches = [];
    state.guestBatchesLoaded = true;
    state.selectedBatchId = null;
    localStorage.removeItem('kankotri_batch');
    return state.guestBatches;
  }
}

function selectBatch(id) {
  state.selectedBatchId = id;
  state.guests = [];
  if (id) localStorage.setItem('kankotri_batch', id);
  else localStorage.removeItem('kankotri_batch');
}

function currentBatch() {
  return state.guestBatches.find(b => b.id === state.selectedBatchId) || null;
}

async function loadGuests(batchId = state.selectedBatchId, force = false) {
  if (!batchId) return [];
  if (!force && state.guests.length && state.guests[0]?.batch_id === batchId) return state.guests;
  try {
    const pageSize = 1000;
    let from = 0;
    let all = [];
    while (true) {
      const { data, error } = await sb
        .from('guest_lists')
        .select('*')
        .eq('batch_id', batchId)
        .order('uploaded_at', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = data || [];
      all = all.concat(rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    state.guests = all;
    return all;
  } catch {
    state.guests = [];
    return [];
  }
}

async function loadLatestInvitation(force = false) {
  if (!state.user) return null;
  if (state.invitation && !force) return state.invitation;
  try {
    const { data, error } = await sb
      .from('invitation_details')
      .select('*')
      .eq('user_id', state.user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    state.invitation = data || null;
    if (data) {
      const tpl = state.templates.find(t => t.id === data.template_id);
      if (tpl) state.selectedTemplate = tpl;
      else if (data.design_json && Object.keys(data.design_json).length) {
        state.selectedTemplate = {
          key: 'saved',
          id: data.template_id || null,
          name: data.event_name || 'Saved invitation',
          category: '',
          is_premium: false,
          design: data.design_json,
          local: true
        };
      }
    }
    return state.invitation;
  } catch {
    state.invitation = null;
    return null;
  }
}

async function loadJobs(limit = 60, force = false) {
  if (!state.user) return [];
  if (state.jobs.length && !force) return state.jobs;
  try {
    const { data, error } = await sb
      .from('generation_jobs')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    state.jobs = data || [];
    return state.jobs;
  } catch {
    state.jobs = [];
    return [];
  }
}

async function signOut() {
  await sb.auth.signOut();
}

function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(STORAGE_KEYS.theme, next);
  return next;
}

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function initPreferences() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(theme);
  const lang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
  setLang(lang);
}

async function saveCustomFont(file) {
  if (!file) throw new Error('Choose a font file');
  if (file.size > 3 * 1024 * 1024) throw new Error('Font must be smaller than 3 MB');
  const dataUrl = await readFileAsDataURL(file);
  const record = { name: state.customFontName, dataUrl, original: file.name };
  try {
    localStorage.setItem(cacheKey(state.user?.id || 'guest', 'font'), JSON.stringify(record));
  } catch {
    throw new Error('Font file is too large for browser storage');
  }
  await registerCustomFont(record);
  state.customFont = record;
  return record;
}

async function registerCustomFont(record) {
  if (!record?.dataUrl) return null;
  try {
    const face = new FontFace(record.name, `url(${record.dataUrl})`);
    await face.load();
    document.fonts.add(face);
    state.customFont = record;
    return face;
  } catch {
    return null;
  }
}

async function restoreCustomFont() {
  if (!state.user) return null;
  try {
    const raw = localStorage.getItem(cacheKey(state.user.id, 'font'));
    if (!raw) return null;
    const record = JSON.parse(raw);
    state.customFont = record;
    await registerCustomFont(record);
    return record;
  } catch {
    return null;
  }
}

async function uploadLogo(file) {
  if (!file) throw new Error('Choose a logo image');
  if (file.size > 2 * 1024 * 1024) throw new Error('Logo must be smaller than 2 MB');
  const dataUrl = await readFileAsDataURL(file);
  await loadImage(dataUrl);
  return dataUrl;
}

function planFeatureList(plan) {
  const f = plan?.features || {};
  return [
    ['All templates', f.all_templates],
    ['HD export', f.hd_export],
    ['ZIP download', f.zip_download],
    ['WhatsApp share', f.whatsapp],
    ['QR code', f.qr_code],
    ['Gujarati fonts', f.gujarati_fonts],
    ['Remove watermark', f.remove_watermark],
    ['Email invitations', f.email],
    ['PDF export', f.pdf],
    ['Custom font upload', f.custom_font],
    ['Bulk WhatsApp', f.bulk_whatsapp],
    ['Bulk email', f.bulk_email],
    ['White label branding', f.white_label],
    ['Team members', f.team],
    ['Custom domain', f.custom_domain]
  ];
}

function language() {
  return getLang();
}
