(function() {
  const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';

  const pathParts = window.location.pathname.split('/');
  const idx = pathParts.indexOf('tutorials');
  if (idx === -1 || idx + 1 >= pathParts.length) return;
  const tutorialSlug = pathParts[idx + 1];

  const chapterEl = document.querySelector('.chapter');
  if (!chapterEl) return;

  const container = document.createElement('div');
  container.style.cssText = 'margin-top:32px;padding-top:24px;border-top:2px solid #e0e0e0;';
  container.innerHTML = `
    <h3 style="margin-bottom:8px;font-size:1.1rem;">Was this helpful?</h3>
    <p style="font-size:.9rem;color:#666;margin-bottom:12px;">Send your feedback about this ${tutorialSlug} tutorial.</p>
    <textarea id="tutorial-feedback-text" placeholder="Share your thoughts, suggestions, or report an issue..." style="width:100%;min-height:80px;padding:10px;border:1px solid #ccc;border-radius:6px;font-family:inherit;font-size:.9rem;resize:vertical;"></textarea>
    <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <button id="tutorial-feedback-btn" style="padding:8px 20px;background:#0f3460;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Send Feedback</button>
      <span id="tutorial-feedback-msg" style="font-size:.85rem;color:#666;"></span>
    </div>
  `;
  chapterEl.appendChild(container);

  const textarea = document.getElementById('tutorial-feedback-text');
  const btn = document.getElementById('tutorial-feedback-btn');
  const msg = document.getElementById('tutorial-feedback-msg');

  btn.addEventListener('click', async function() {
    const text = textarea.value.trim();
    if (!text) { msg.textContent = 'Please write some feedback.'; msg.style.color = '#d32f2f'; return; }
    btn.disabled = true;
    btn.textContent = 'Sending...';
    msg.textContent = '';
    try {
      const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error } = await _sb.from('tutorial_feedback').insert({ tutorial_slug: tutorialSlug, feedback_text: text });
      if (error) throw error;
      msg.textContent = 'Thanks for your feedback!';
      msg.style.color = '#2e7d32';
      textarea.value = '';
    } catch (err) {
      msg.textContent = 'Failed to send. Try again later.';
      msg.style.color = '#d32f2f';
    }
    btn.disabled = false;
    btn.textContent = 'Send Feedback';
  });
})();
