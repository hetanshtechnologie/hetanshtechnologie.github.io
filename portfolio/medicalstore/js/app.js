(function(){
  const base = 'data/usr/';

  function fetchJSON(path){
    return fetch(base + 'json/' + path).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()});
  }

  function renderProducts(products){
    const grid = document.getElementById('products-grid');
    const filterBtns = document.getElementById('filter-btns');
    const searchInput = document.getElementById('search-input');
    let currentFilter = 'all';
    let searchTerm = '';

    const categories = [...new Set(products.map(p => p.category))];
    categories.sort().forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = cat;
      btn.textContent = cat;
      filterBtns.appendChild(btn);
    });

    function filterProducts(){
      return products.filter(p => {
        const matchCategory = currentFilter === 'all' || p.category === currentFilter;
        const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm) || p.category.toLowerCase().includes(searchTerm);
        return matchCategory && matchSearch;
      });
    }

    function render(){
      const filtered = filterProducts();
      if(filtered.length === 0){
        grid.innerHTML = '<p class="no-products">No products found. Try a different search or filter.</p>';
        return;
      }
      grid.innerHTML = filtered.map(p => {
        const imgSrc = p.image ? base + 'img/' + p.image.split('/').pop() : '';
        const imgTag = imgSrc
          ? `<img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'img-placeholder\\'>${p.name}</div>'">`
          : `<div class="img-placeholder">${p.name}</div>`;
        return `<div class="product-card">${imgTag}<div class="card-body"><span class="category">${p.category}</span><h3>${p.name}</h3><div class="price">${p.price}</div></div></div>`;
      }).join('');
    }

    render();

    filterBtns.addEventListener('click', function(e){
      const btn = e.target.closest('.filter-btn');
      if(!btn)return;
      filterBtns.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });

    searchInput.addEventListener('input', function(){
      searchTerm = this.value.toLowerCase().trim();
      render();
    });
  }

  function renderContact(contact){
    const card = document.getElementById('contact-card');
    card.innerHTML = `
      <div class="name">${contact.storeName}</div>
      <div class="detail">📞 <a href="tel:+91${contact.mobile}">+91 ${contact.mobile}</a></div>
      <div class="detail">✉️ <a href="mailto:${contact.email}">${contact.email}</a></div>
      <div class="detail">📍 ${contact.address}</div>
    `;
  }

  Promise.all([fetchJSON('contact.json'), fetchJSON('products.json')])
    .then(([contact, products]) => { renderContact(contact); renderProducts(products); })
    .catch(err => {
      document.getElementById('contact-card').innerHTML = '<p style="color:#dc2626">Failed to load contact info. Please try again later.</p>';
      document.getElementById('products-grid').innerHTML = '<p style="color:#dc2626">Failed to load products. Please try again later.</p>';
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
