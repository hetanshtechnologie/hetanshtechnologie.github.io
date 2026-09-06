(function(){
  const base = 'data/usr/';

  function fetchJSON(path){
    return fetch(base + 'json/' + path).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()});
  }

  function renderServices(services){
    const grid = document.getElementById('services-grid');
    grid.innerHTML = services.map(s => {
      const imgSrc = s.image ? base + 'img/' + s.image.split('/').pop() : '';
      const imgTag = imgSrc
        ? `<img src="${imgSrc}" alt="${s.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'img-placeholder\\'>${s.title}</div>'">`
        : `<div class="img-placeholder">${s.title}</div>`;
      return `<div class="service-card">${imgTag}<div class="card-body"><h3>${s.title}</h3><p>${s.description}</p></div></div>`;
    }).join('');
  }

  function renderContact(contact){
    const card = document.getElementById('contact-card');
    card.innerHTML = `
      <div class="name">${contact.name}</div>
      <div class="detail">📞 <a href="tel:+91${contact.mobile}">+91 ${contact.mobile}</a></div>
      <div class="detail">✉️ <a href="mailto:${contact.email}">${contact.email}</a></div>
    `;
  }

  Promise.all([fetchJSON('contact.json'), fetchJSON('services.json')])
    .then(([contact, services]) => { renderContact(contact); renderServices(services); })
    .catch(err => {
      document.getElementById('contact-card').innerHTML = '<p style="color:#dc2626">Failed to load contact info. Please try again later.</p>';
      document.getElementById('services-grid').innerHTML = '<p style="color:#dc2626">Failed to load services. Please try again later.</p>';
    });

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if(toggle && links){
    toggle.addEventListener('click', function(e){
      e.stopPropagation();
      links.classList.toggle('open');
    });
    document.addEventListener('click', function(){links.classList.remove('open')});
    links.addEventListener('click', function(e){e.stopPropagation()});
  }
})();
