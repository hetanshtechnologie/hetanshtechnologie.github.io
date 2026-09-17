# hetanshtechnologie - Corporate Website

A professional, responsive corporate website for an IT startup specializing in software engineering, cloud-native architecture, AI integration, and enterprise solutions.

## Features

- **Responsive Design**: Optimized for mobile, tablet, and desktop viewing
- **Modern UI**: Clean corporate design with blue/white/gray color palette
- **TailwindCSS**: Utility-first CSS framework via CDN
- **Smooth Animations**: Subtle transitions and scroll-based animations
- **SEO Optimized**: Meta tags and Open Graph support
- **Contact Form**: Functional inquiry form with validation
- **Newsletter Subscription**: Email subscription with validation
- **Mobile Navigation**: Responsive hamburger menu

## Pages

1. **Home** (`index.html`) - Hero section, stats, services preview, portfolio highlights, testimonials
2. **Services** (`services.html`) - Detailed service offerings with technology stacks
3. **Portfolio** (`portfolio.html`) - Case studies (ITER France, Healthcare SaaS, Gujarat Transport, MinistryBrands)
4. **About** (`about.html`) - Founder profile, certifications, company values
5. **Careers** (`careers.html`) - Job openings and company culture
6. **Contact** (`contact.html`) - Contact form, company information, downloadable resources

## Project Structure

```
hetanshtechnologie/
├── index.html          # Home page
├── services.html       # Services page
├── portfolio.html      # Portfolio/Case studies
├── about.html          # About us page
├── careers.html        # Careers page
├── contact.html        # Contact page
├── css/
│   └── style.css      # Custom styles and animations
├── js/
│   └── main.js        # JavaScript interactions
├── images/            # Image assets (create as needed)
└── README.md          # This file
```

## Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Custom styles with animations
- **JavaScript (ES6+)** - Form handling, animations, interactions
- **TailwindCSS** - Via CDN for rapid styling
- **Google Fonts** - Inter font family

## Deployment Instructions

### Option 1: GitHub Pages (Free)

1. Create a new GitHub repository
2. Push your code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/hetanshtechnologie.git
   git push -u origin main
   ```
3. Go to repository **Settings** → **Pages**
4. Under **Source**, select **main** branch and **/ (root)** folder
5. Click **Save** - Your site will be live at `https://yourusername.github.io/hetanshtechnologie/`

### Option 2: Netlify (Free)

1. Sign up at [netlify.com](https://www.netlify.com)
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop your project folder
4. Your site will be live instantly with a Netlify subdomain
5. Optional: Configure custom domain in site settings

**Netlify CLI method:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir .
```

### Option 3: Azure Static Web Apps (Free Tier Available)

1. Install Azure CLI: [https://aka.ms/installazurecliwindows](https://aka.ms/installazurecliwindows)
2. Login to Azure:
   ```bash
   az login
   ```
3. Create a Static Web App:
   ```bash
   az staticwebapp create \
     --name hetanshtechnologie \
     --resource-group myResourceGroup \
     --location "East US2" \
     --source . \
     --target-location "East US2"
   ```
4. Or use VS Code extension: **Azure Static Web Apps** and follow the wizard

**Using Azure Portal:**
1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for **"Static Web Apps"**
3. Click **"Create"** → Choose subscription & resource group
4. **Deployment details**: Select "Other" as source
5. Upload your files or connect to GitHub repository

## Customization

### Update Contact Information
Edit the following in all HTML files:
- Email: `hetanshtechnologie@gmail.com`
- Phone: `+91 9974031480`
- LinkedIn: Update LinkedIn URL

### Replace Placeholder Images
Replace placeholder image URLs with actual images in:
- `images/` directory
- Update `src` attributes in HTML files

### Update Meta Tags
Customize SEO meta tags in each HTML file:
```html
<meta property="og:url" content="https://yoursite.com">
<meta property="og:image" content="https://yoursite.com/images/og-image.jpg">
```

### Color Scheme
Modify CSS variables in `css/style.css`:
```css
:root {
    --primary-blue: #2563eb;
    --primary-blue-dark: #1d4ed8;
    /* Add more custom colors */
}
```

## Form Handling

The contact and newsletter forms are currently set up with frontend validation and console logging. To make them fully functional:

### Option A: Formspree (Free)
1. Sign up at [formspree.io](https://formspree.io)
2. Create a new form
3. Update form action in HTML:
   ```html
   <form action="https://formspree.io/f/your-form-id" method="POST">
   ```

### Option B: EmailJS (Free Tier)
1. Sign up at [emailjs.com](https://www.emailjs.com)
2. Add EmailJS SDK and configure in `js/main.js`

### Option C: Custom Backend
Create a backend API endpoint and update the form submission logic in `js/main.js`.

## Performance Optimization

- Images are currently placeholders - use optimized WebP/AVIF formats
- Minify CSS and JS for production
- Enable GZIP/Brotli compression on hosting platform
- Use a CDN for static assets

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

© 2026 Hetansh Technologie. All rights reserved.

## Contact

- **Email**: hetanshtechnologie@gmail.com
- **Phone**: +91 8200537020
- **LinkedIn**: [Connect on LinkedIn](https://www.linkedin.com/in/hetansh-technologie-012298434/)

---

**Note**: This is a static website. For dynamic features (CMS, database, user accounts), consider migrating to a framework like React, Angular, or Next.js with a backend API.
