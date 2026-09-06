# Ornate Jewels — Premium Jewellery Website

A modern, responsive static website for Ornate Jewels, a jewellery shop in Ahmedabad. Built with HTML, CSS (Bootstrap 5), and JavaScript.

## Features

- Home page with hero banner, featured products, testimonials, festive offers
- Products page with category filtering (Gold, Silver, Diamond, Bridal, Custom)
- Gallery page with image lightbox
- About Us page with story, team, mission, trust factors
- Contact page with address, Google Maps, inquiry form
- Testimonials page with customer reviews and review submission
- WhatsApp "Click to Chat" floating button
- Newsletter subscription
- Downloadable catalogue section
- SEO-optimized meta tags
- Social media links (Instagram, Facebook, WhatsApp, YouTube, Pinterest)
- Scroll reveal animations and hover effects
- Fully responsive (mobile, tablet, desktop)

## File Structure

```
ornate-jewels/
├── index.html          # Home page
├── products.html       # Products & catalogue
├── gallery.html        # Image gallery
├── about.html          # About Us
├── testimonials.html   # Customer testimonials
├── contact.html        # Contact & inquiry form
├── css/
│   └── style.css       # Custom styles (gold/white/black theme)
├── js/
│   └── script.js       # Interactions, animations, form handling
└── README.md           # This file
```

## Deployment

### GitHub Pages

1. Create a repository on GitHub (e.g., `ornate-jewels`)
2. Push all files to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit — Ornate Jewels website"
   git branch -M main
   git remote add origin https://github.com/your-username/ornate-jewels.git
   git push -u origin main
   ```
3. Go to **Settings → Pages** in your repository
4. Under "Branch", select `main` and `/ (root)` folder
5. Click **Save**. Your site will be live at `https://your-username.github.io/ornate-jewels/`

### Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and sign in
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop the project folder onto the upload area
4. Your site will be live at a random `.netlify.app` URL
5. To use a custom domain, go to **Site settings → Domain management**

### Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. In the project directory, run:
   ```bash
   vercel
   ```
3. Follow the prompts (log in, link project)
4. Your site will be deployed to a `.vercel.app` URL

## Customization

- **Brand name, contact info, social links**: Edit in each HTML file (search for `Ornate Jewels`, `98765`, etc.)
- **WhatsApp number**: Update in the WhatsApp float link (`wa.me/91XXXXXXXXXX`)
- **Google Maps embed**: Replace the `src` URL in `contact.html`
- **Colors**: Edit CSS custom properties in `css/style.css` (the `:root` section)
- **Images**: Replace Unsplash image URLs with your own product photos

## Credits

- **Bootstrap 5** — CSS framework
- **Bootstrap Icons** — Icon set
- **Google Fonts** — Playfair Display & Lato
- **Unsplash** — Placeholder jewellery images
- **RandomUser** — Placeholder customer photos

## License

This project is free to use for commercial and personal projects.
