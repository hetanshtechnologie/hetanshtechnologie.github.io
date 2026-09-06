// Hetansh Technologie - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when clicking on a link
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Contact form handling
    const contactForm = document.getElementById('contact-form');
    const formSuccess = document.getElementById('form-success');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData);

            // Basic validation
            if (!data.name || !data.email || !data.message) {
                alert('Please fill in all required fields.');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                alert('Please enter a valid email address.');
                return;
            }

            // Simulate form submission
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;

            // Simulate API call
            setTimeout(function() {
                contactForm.reset();
                contactForm.style.display = 'none';
                if (formSuccess) {
                    formSuccess.classList.remove('hidden');
                }
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 1500);

            // In production, you would send data to your backend/API
            console.log('Form submitted:', data);
        });
    }

    // Newsletter form handling
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const emailInput = newsletterForm.querySelector('input[type="email"]');
            if (!emailInput || !emailInput.value) {
                alert('Please enter your email address.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailInput.value)) {
                alert('Please enter a valid email address.');
                return;
            }

            const submitButton = newsletterForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Subscribing...';
            submitButton.disabled = true;

            try {
                const response = await fetch("https://vgipghqejzbcoighktij.supabase.co/rest/v1/contact", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo",
                        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo",
                        "Prefer": "return=minimal"
                    },
                    body: JSON.stringify({
                        name: "Newsletter Subscriber",
                        email: emailInput.value,
                        phone: "",
                        service: "Newsletter Subscription",
                        message: "Subscribed via newsletter form"
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to subscribe. Please try again.');
                }

                alert('Thank you for subscribing to our newsletter!');
                emailInput.value = '';
            } catch (error) {
                alert(error.message);
                console.error('Newsletter subscription error:', error);
            } finally {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Load portfolio demos from JSON
    async function loadPortfolioDemos() {
      try {
        const res = await fetch('data/usr/json/portfolio-sites.json');
        const sites = await res.json();
        const grid = document.getElementById('portfolio-demos');
        if (!grid) return;
        grid.innerHTML = sites.map(s => `
          <a href="${s.url}" class="portfolio-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 block">
            <div class="h-48 overflow-hidden">
              <img src="${s.image}" alt="${s.title}" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23e5e7eb%22 width=%22400%22 height=%22300%22/%3E%3Ctext fill=%22%236b7280%22 font-size=%2224%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3E${s.title}%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold mb-2">${s.title}</h3>
              <p class="text-gray-600 mb-4">${s.description}</p>
              <span class="inline-block ${s.color} text-sm px-3 py-1 rounded-full">${s.category}</span>
            </div>
          </a>
        `).join('');
      } catch(e) { console.log('Portfolio demos not loaded:', e); }
    }
    loadPortfolioDemos();

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.service-card, .portfolio-card, .testimonial-card, .job-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Stats counter animation
    function animateCounter(element, target, duration) {
        let start = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(function() {
            start += increment;
            if (start >= target) {
                element.textContent = target + (target === 24 ? '/7' : '+');
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(start) + (target === 24 ? '/7' : '+');
            }
        }, 16);
    }

    // Observe stats section
    const statsSection = document.querySelector('.bg-blue-600.text-white');
    if (statsSection) {
        const statsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counters = entry.target.querySelectorAll('.text-4xl, .text-5xl');
                    counters.forEach(counter => {
                        const text = counter.textContent.trim();
                        if (text.includes('19')) {
                            animateCounter(counter, 19, 2000);
                        } else if (text.includes('100')) {
                            animateCounter(counter, 100, 2000);
                        } else if (text.includes('50')) {
                            animateCounter(counter, 50, 2000);
                        }
                    });
                    statsObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        statsObserver.observe(statsSection);
    }

    // Active navigation link highlighting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Lazy loading for images (if any)
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    console.log('Hetansh Technologie website loaded successfully!');
});
