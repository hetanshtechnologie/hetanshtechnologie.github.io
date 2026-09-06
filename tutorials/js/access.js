(function() {
  'use strict';
  var SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';

  var path = decodeURIComponent(window.location.pathname);
  var parts = path.split('/');
  var tutIdx = parts.indexOf('tutorials');
  var slug = tutIdx >= 0 ? parts[tutIdx + 1] : null;

  if (!slug) return;

  var FREE_SLUGS = {
    'html':1,'css':1,'nodejs':1,'pwa':1,'react':1,
    'angular':1,'android':1,'dotnetcore':1,'python':1,'ios':1,
    'fastapi-tutorial':1,'playwright-tutorial':1,'voip-project-delivery':1,'senior-product-owner':1,'supabase':1,'c#':1,'c%23':1
  };

  if (FREE_SLUGS[slug]) return;

  var PRODUCT_SLUGS = {
    'ai':'ai-tutorial','genai':'genai-tutorial',
    'ai-102':'ai-102-tutorial','ai-agentic-track':'ai-agentic-track-tutorial','ai-engineer-core':'ai-engineer-core-tutorial',
    'claude-vibe-course':'claude-vibe-course-tutorial','maf-fundamentals':'maf-fundamentals-tutorial',
    'foundry-fundamentals':'foundry-fundamentals-tutorial','snowflake-tutorial':'snowflake-tutorial',
    'project-management':'project-management-tutorial','interpersonal-skills':'interpersonal-skills-tutorial',
    'ml':'ml-tutorial','dsa':'dsa-tutorial','dsa-leetcode-roadmap':'dsa-leetcode-roadmap-tutorial',
    'system-design-fundamentals':'system-design-fundamentals-tutorial',
    'ai-system-design':'ai-system-design-tutorial','ml-system-design':'ml-system-design-tutorial',
    'mindset-mastery':'mindset-mastery-tutorial','cost-takeout-sourcing':'cost-takeout-sourcing-tutorial',
    'rpa-ai':'rpa-ai-tutorial','enterprise-architecture-ai-governance':'enterprise-architecture-ai-governance-tutorial',
    'ai-fundamentals':'ai-fundamentals-tutorial',
    'data-science':'data-science-tutorial'
  };
  var productSlug = PRODUCT_SLUGS[slug];
  if (!productSlug) return;

  var MAX_FREE = 5;
  var filename = parts[parts.length - 1] || '';
  var pageNum = parseInt((filename || '').match(/^\d+/)?.[0], 10);

  if (!pageNum || pageNum <= MAX_FREE) return;

  var paywallActive = false;
  var paywallEl = null;

  function showPaywall() {
    if (paywallActive) return;
    paywallActive = true;
    var ch = document.querySelector('.chapter');
    if (ch) ch.style.display = 'none';
    document.body.style.background = '#f8fafc';
    paywallEl = document.createElement('div');
    paywallEl.id = 'paywall-overlay';
    paywallEl.style.cssText = 'min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;';
    paywallEl.innerHTML = '<div style="background:#fff;border-radius:16px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.15);margin:40px 20px;">' +
      '<div style="font-size:48px;margin-bottom:12px;">📘</div>' +
      '<h2 style="font-size:1.4rem;font-weight:700;margin-bottom:8px;color:#0f172a;">Unlock Full Tutorial</h2>' +
      '<p style="color:#64748b;margin-bottom:20px;line-height:1.6;font-size:.95rem;">You\'ve reached the free preview limit. Purchase the complete guide to access all chapters and the downloadable PDF.</p>' +
      '<a href="' + '../'.repeat(parts.length - tutIdx - 1) + 'ecommerce/index.html" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 36px;border-radius:10px;font-weight:600;font-size:1.05rem;text-decoration:none;margin-bottom:10px;">Buy for ₹500</a>' +
      '<p style="font-size:.8rem;color:#94a3b8;">One-time payment &bull; Lifetime access &bull; PDF included</p>' +
      '</div>';
    document.body.appendChild(paywallEl);
  }

  function removePaywall() {
    if (paywallEl && paywallEl.parentNode) {
      paywallEl.parentNode.removeChild(paywallEl);
    }
    var ch = document.querySelector('.chapter');
    if (ch) ch.style.display = '';
    document.body.style.background = '';
    paywallActive = false;
    paywallEl = null;
  }

  if (window.supabase) {
    var _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    _client.auth.getUser().then(function(resp) {
      var user = resp.data && resp.data.user;
      if (!user) { showPaywall(); return; }
      if (user.email === 'hetanshtechnologie@gmail.com') { removePaywall(); return; }
      return _client.rpc('check_tutorial_purchase', { p_product_slug: productSlug }).then(function(r) {
        if (r.data) { removePaywall(); }
        else { showPaywall(); }
      });
    }).catch(function() { showPaywall(); });
  } else {
    showPaywall();
  }
})();
