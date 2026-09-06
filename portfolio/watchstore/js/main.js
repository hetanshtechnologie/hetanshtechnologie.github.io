// ===== Utility: fetch JSON =====
async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`Failed to load ${path}:`, e);
    return [];
  }
}

// ===== Navbar scroll effect =====
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ===== Mobile menu toggle =====
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

// ===== Active nav link =====
(function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
})();

// ===== Load products =====
async function loadProducts(containerId, filterContainerId) {
  const products = await loadJSON('data/usr/json/products.json');
  const container = document.getElementById(containerId);
  const filterContainer = filterContainerId ? document.getElementById(filterContainerId) : null;
  if (!container) return;

  function render(category) {
    const filtered = category && category !== 'All'
      ? products.filter(p => p.category === category)
      : products;
    container.innerHTML = filtered.map(p => `
      <div class="product-card bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
        <div class="h-56 bg-gray-100 overflow-hidden relative">
          <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover"
               onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%231a1a1a%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%23d4af37%22 font-size=%2220%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${p.name}%3C/text%3E%3C/svg%3E'">
          ${p.badge ? `<span class="absolute top-3 left-3 bg-gold text-black text-xs font-bold px-3 py-1 rounded-full">${p.badge}</span>` : ''}
        </div>
        <div class="p-5">
          <span class="category-badge">${p.category}</span>
          <h3 class="text-lg font-bold mt-2 text-gray-900">${p.name}</h3>
          <p class="text-sm text-gray-500 mt-1 line-clamp-2">${p.description}</p>
          <div class="flex items-baseline mt-3">
            <span class="text-xl font-bold text-gold">${p.price}</span>
            ${p.originalPrice ? `<span class="text-sm text-gray-400 ml-2 line-through">${p.originalPrice}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Filter buttons
  if (filterContainer) {
    const cats = ['All', 'Luxury', 'Smart', 'Classic', 'Sports'];
    filterContainer.innerHTML = cats.map(c =>
      `<button class="filter-btn ${c === 'All' ? 'active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    filterContainer.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.cat);
    });
  }

  render('All');
}

// ===== Load testimonials =====
async function loadTestimonials(containerId) {
  const data = await loadJSON('data/usr/json/testimonials.json');
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = data.map(t => `
    <div class="testimonial-card bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div class="flex items-center mb-3">
        <div class="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          <img src="${t.image}" alt="${t.name}" class="w-full h-full object-cover"
               onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Ccircle fill=%22%23d4af37%22 cx=%2224%22 cy=%2224%22 r=%2224%22/%3E%3Ctext fill=%22%23000%22 font-size=%2218%22 x=%2224%22 y=%2224%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${t.name[0]}%3C/text%3E%3C/svg%3E'">
        </div>
        <div class="ml-3">
          <p class="font-bold text-gray-900">${t.name}</p>
          <p class="text-sm text-gray-500">${t.location}</p>
        </div>
      </div>
      <div class="mb-2">${'<span class="star filled">★</span>'.repeat(t.rating)}${'<span class="star">★</span>'.repeat(5 - t.rating)}</div>
      <p class="text-gray-600 text-sm leading-relaxed">${t.text}</p>
    </div>
  `).join('');
}

// ===== Load offers =====
async function loadOffers(containerId) {
  const data = await loadJSON('data/usr/json/offers.json');
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = data.map(o => `
    <div class="offer-card rounded-xl overflow-hidden shadow-lg bg-gradient-to-r ${o.color} text-white">
      <div class="p-6">
        <span class="inline-block bg-white text-black text-xs font-bold px-3 py-1 rounded-full mb-3">${o.badge}</span>
        <h3 class="text-xl font-bold mb-2">${o.title}</h3>
        <p class="text-sm opacity-90 mb-3">${o.description}</p>
        <div class="flex items-center justify-between">
          <span class="text-2xl font-bold">${o.discount}</span>
          <span class="text-xs opacity-75">Valid till: ${o.validUntil}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== Load gallery =====
async function loadGallery(containerId, filterContainerId) {
  const data = await loadJSON('data/usr/json/gallery.json');
  const container = document.getElementById(containerId);
  const filterContainer = filterContainerId ? document.getElementById(filterContainerId) : null;
  if (!container) return;

  function render(category) {
    const filtered = category && category !== 'All'
      ? data.filter(g => g.category === category)
      : data;
    container.innerHTML = filtered.map(g => `
      <div class="gallery-card rounded-xl overflow-hidden shadow-lg cursor-pointer group" data-src="${g.image}">
        <div class="h-64 bg-gray-100 overflow-hidden relative">
          <img src="${g.image}" alt="${g.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
               onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%231a1a1a%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%23d4af37%22 font-size=%2220%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${g.title}%3C/text%3E%3C/svg%3E'">
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
            <span class="text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg font-bold">${g.title}</span>
          </div>
        </div>
        <div class="p-3 bg-white">
          <p class="text-sm font-semibold text-gray-900">${g.title}</p>
          <span class="category-badge text-xs">${g.category}</span>
        </div>
      </div>
    `).join('');
  }

  if (filterContainer) {
    const cats = ['All', 'Showroom', 'Luxury', 'Smart', 'Classic', 'Sports'];
    filterContainer.innerHTML = cats.map(c =>
      `<button class="filter-btn ${c === 'All' ? 'active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    filterContainer.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.cat);
    });
  }

  render('All');
}

// ===== Lightbox =====
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbClose = document.getElementById('lightbox-close');
  if (!lightbox || !lbImg || !lbClose) return;

  document.addEventListener('click', e => {
    const card = e.target.closest('.gallery-card');
    if (card) {
      const src = card.dataset.src || card.querySelector('img')?.src;
      if (src) {
        lbImg.src = src;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    }
  });

  const close = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };
  lbClose.addEventListener('click', close);
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });
}

// ===== Newsletter =====
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]')?.value;
    if (email) {
      alert('Thank you for subscribing! We will keep you updated on our latest offers and collections.');
      form.reset();
    }
  });
}

// ===== Contact form =====
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    alert('Thank you for reaching out! We will get back to you within 24 hours.');
    form.reset();
  });
}

// ===== Load contact info =====
async function loadContact() {
  const data = await loadJSON('data/usr/json/contact.json');
  if (!data) return;

  // Phone & WhatsApp links
  document.querySelectorAll('[data-phone]').forEach(el => {
    el.textContent = data.phone;
    if (el.tagName === 'A') el.href = `tel:${data.phoneRaw}`;
  });
  document.querySelectorAll('[data-phone-raw]').forEach(el => {
    el.textContent = data.phoneRaw;
    if (el.tagName === 'A') el.href = `tel:${data.phoneRaw}`;
  });
  document.querySelectorAll('[data-whatsapp]').forEach(el => {
    if (el.tagName === 'A') el.href = data.social.whatsapp;
  });

  // Email
  document.querySelectorAll('[data-email]').forEach(el => {
    el.textContent = data.email;
    if (el.tagName === 'A') el.href = `mailto:${data.email}`;
  });

  // Address
  document.querySelectorAll('[data-address-line1]').forEach(el => el.textContent = data.address.line1);
  document.querySelectorAll('[data-address-line2]').forEach(el => el.textContent = data.address.line2);
  document.querySelectorAll('[data-address-full]').forEach(el => el.textContent = data.address.full);

  // Hours
  document.querySelectorAll('[data-hours-weekdays]').forEach(el => el.textContent = data.hours.weekdays);
  document.querySelectorAll('[data-hours-saturday]').forEach(el => el.textContent = data.hours.saturday);
  document.querySelectorAll('[data-hours-sunday]').forEach(el => el.textContent = data.hours.sunday);

  // Store name / tagline
  document.querySelectorAll('[data-shop-name]').forEach(el => el.textContent = data.shopName);
  document.querySelectorAll('[data-tagline]').forEach(el => el.textContent = data.tagline);

  // Social links
  document.querySelectorAll('[data-social-instagram]').forEach(el => {
    if (el.tagName === 'A') el.href = data.social.instagram;
  });
  document.querySelectorAll('[data-social-facebook]').forEach(el => {
    if (el.tagName === 'A') el.href = data.social.facebook;
  });
  document.querySelectorAll('[data-social-youtube]').forEach(el => {
    if (el.tagName === 'A') el.href = data.social.youtube;
  });

  // Map embed
  document.querySelectorAll('[data-map-src]').forEach(el => {
    if (el.tagName === 'IFRAME') el.src = data.map.embedSrc;
  });

  // Features list
  document.querySelectorAll('[data-features]').forEach(el => {
    el.innerHTML = data.features.map(f => `<li class="flex items-start">
      <svg class="w-5 h-5 mr-2 flex-shrink-0 text-gold mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      <span>${f}</span>
    </li>`).join('');
  });
}

// ===== Scroll animations (Intersection Observer) =====
function initScrollAnimations() {
  const els = document.querySelectorAll('[data-aos]');
  if (!els.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add(entry.target.dataset.aos);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => observer.observe(el));
}

// ===== Init all =====
document.addEventListener('DOMContentLoaded', () => {
  loadProducts('products-container', 'filter-container');
  loadTestimonials('testimonials-container');
  loadOffers('offers-container');
  loadGallery('gallery-container', 'gallery-filter');
  loadContact();
  initLightbox();
  initNewsletter();
  initContactForm();
  initScrollAnimations();
});
