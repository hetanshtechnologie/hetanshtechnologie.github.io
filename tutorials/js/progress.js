(function() {
  const SUPABASE_URL = 'https://vgipghqejzbcoighktij.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo';

  if (!window.supabase) return;

  const path = decodeURIComponent(window.location.pathname);
  const parts = path.split('/');
  const tutIdx = parts.indexOf('tutorials');
  if (tutIdx === -1 || tutIdx + 1 >= parts.length) return;
  const slug = parts[tutIdx + 1];
  if (!slug || slug === 'index.html') return;

  const filename = parts[parts.length - 1] || '';
  const match = filename.match(/^(\d+)/);
  const chapterNum = match ? parseInt(match[1], 10) : 0;

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  client.auth.getUser().then((resp) => {
    const user = resp.data && resp.data.user;
    if (!user) return;
    if (chapterNum > 0) {
      recordProgress(user.id, chapterNum);
    } else {
      renderProgress(user.id);
    }
  }).catch(() => {});

  function recordProgress(userId, chapterNum) {
    client.from('tutorial_progress')
      .select('current_chapter, completed_chapters')
      .eq('user_id', userId)
      .eq('tutorial_slug', slug)
      .maybeSingle()
      .then((resp) => {
        if (resp.error) throw resp.error;
        const existing = resp.data && Array.isArray(resp.data.completed_chapters) ? resp.data.completed_chapters.slice() : [];
        let current = resp.data && resp.data.current_chapter ? resp.data.current_chapter : 0;
        if (existing.indexOf(chapterNum) === -1) existing.push(chapterNum);
        if (chapterNum > current) current = chapterNum;

        const payload = {
          user_id: userId,
          tutorial_slug: slug,
          current_chapter: current,
          completed_chapters: existing,
          updated_at: new Date().toISOString()
        };

        if (resp.data) {
          return client.from('tutorial_progress')
            .update(payload)
            .eq('user_id', userId)
            .eq('tutorial_slug', slug);
        }
        return client.from('tutorial_progress').insert(payload);
      })
      .catch(() => {});
  }

  function renderProgress(userId) {
    client.from('tutorial_progress')
      .select('current_chapter, completed_chapters')
      .eq('user_id', userId)
      .eq('tutorial_slug', slug)
      .maybeSingle()
      .then((resp) => {
        if (resp.error || !resp.data) return;
        const completed = Array.isArray(resp.data.completed_chapters) ? resp.data.completed_chapters : [];
        if (!completed.length) return;

        const chapterLinks = Array.prototype.slice.call(document.querySelectorAll('a[href*="chapters/"]'));
        if (!chapterLinks.length) return;

        const chapterNumOf = (a) => parseInt((a.getAttribute('href') || '').split('/').pop(), 10);
        const unique = Array.from(new Set(chapterLinks.map(chapterNumOf).filter((n) => !isNaN(n)))).sort((a, b) => a - b);
        const total = unique.length;
        if (!total) return;

        const doneCount = unique.filter((n) => completed.indexOf(n) !== -1).length;
        const pct = Math.round((doneCount / total) * 100);
        const nextNum = unique.find((n) => completed.indexOf(n) === -1);
        const finished = nextNum === undefined;
        const continueLink = finished ? null : chapterLinks.find((a) => chapterNumOf(a) === nextNum);

        chapterLinks.forEach((a) => {
          if (completed.indexOf(chapterNumOf(a)) !== -1) {
            a.insertAdjacentHTML('afterbegin', '<span style="color:#16a34a;font-weight:700;">✓ </span>');
            a.style.color = '#16a34a';
          }
        });

        const card = document.createElement('div');
        card.style.cssText = 'background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;';
        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;">' +
            '<strong style="color:#166534;font-size:.95rem;">Your Reading Progress</strong>' +
            '<span style="color:#166534;font-size:.9rem;font-weight:600;">' + pct + '% &middot; ' + doneCount + '/' + total + ' chapters</span>' +
          '</div>' +
          '<div style="height:10px;background:#dcfce7;border-radius:6px;overflow:hidden;">' +
            '<div style="height:100%;width:' + pct + '%;background:#16a34a;border-radius:6px;transition:width .3s;"></div>' +
          '</div>' +
          (finished
            ? '<p style="margin:10px 0 0;color:#166534;font-size:.9rem;">You have finished every chapter of this tutorial.</p>'
            : (continueLink
                ? '<a href="' + continueLink.getAttribute('href') + '" style="display:inline-block;margin-top:12px;background:#16a34a;color:#fff;padding:8px 18px;border-radius:6px;font-size:.9rem;font-weight:600;text-decoration:none;">Continue &rarr;</a>'
                : '')) +
          '<div style="margin-top:12px;border-top:1px solid #bbf7d0;padding-top:10px;">' +
            '<a href="../my-progress.html" style="color:#166534;font-size:.85rem;font-weight:600;text-decoration:none;">View all my progress &rarr;</a>' +
          '</div>';

        const firstList = chapterLinks[0].closest('ol, ul');
        const insertTarget = firstList && firstList.parentNode ? firstList : document.querySelector('ul.toc');
        if (insertTarget && insertTarget.parentNode) {
          insertTarget.parentNode.insertBefore(card, insertTarget);
        }
      })
      .catch(() => {});
  }
})();
