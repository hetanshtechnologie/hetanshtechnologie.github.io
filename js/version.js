fetch('/version.json')
  .then(r => r.json())
  .then(d => {
    const v = 'v' + d.version;
    const el = document.getElementById('site-version');
    if (el) el.textContent = v;
    document.querySelectorAll('a').forEach(a => {
      if (a.textContent.trim() === 'HetanshTechnologie' && !a.title) a.title = v;
    });
  })
  .catch(() => {});
