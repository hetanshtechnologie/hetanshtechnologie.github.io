# JobPortal - Naukri-style Job Portal

A complete job portal with three roles: **Admin**, **Company**, **Job Seeker**.

```
Applications/jobportal/
├── index.html            # Main SPA (login/signup, jobs, apply, reviews, profile, plans)
├── admin.html            # Admin panel (companies, seekers, jobs, reviews, CVs, plans)
├── css/style.css         # Design system
├── js/app.js             # App logic (auth, jobs, applications, reviews, plans, Razorpay)
├── js/admin.js           # Admin logic
└── supabase/
    ├── schema.sql        # 9 tables + RLS + grants
    └── seed-data.sql     # Plans, demo companies, demo jobs, sample CVs
```

## Database tables

| Table | Purpose |
|-------|---------|
| `jp_profiles` | User role (admin/company/seeker) + shared profile fields |
| `jp_companies` | Company profiles, plan, approval status |
| `jp_plans` | Subscription plans for companies & seekers |
| `jp_subscriptions` | User plan assignments |
| `jp_jobs` | Job postings (salary, skills, highlight, status) |
| `jp_applications` | Job applications (CTC, cover letter, status) |
| `jp_reviews` | Company reviews (interview, culture, environment) |
| `jp_cvs` | Seeded / posted CVs managed by admin |

## Supabase Setup

1. Open [Supabase Dashboard](https://supabase.com) → SQL Editor.
2. Run `supabase/schema.sql`, then `supabase/seed-data.sql`.
3. Auth: enable **Email** and **Google** providers.
4. Storage: create a public bucket named `resumes` (used for resume uploads).
5. Create the admin user:
   - Sign up via the app (as Job Seeker or Company), then run:
     `UPDATE jp_profiles SET role = 'admin' WHERE email = '<your-email>';`
   - Or directly: `INSERT INTO jp_profiles (user_id, role, email) VALUES ('<USER_UUID>', 'admin', '<email>');`
6. Deploy the edge functions (for Razorpay payments):
   ```bash
   supabase functions deploy jp-create-order
   supabase functions deploy jp-verify-purchase
   ```
   Make sure the `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` secrets are set on the project.
7. Google OAuth: the redirect flows through `/blog/index.html?app=jobportal` (already wired in `blog/index.html`).

## Payments

- Plans with `price > 0` open the Razorpay checkout (`jp-create-order` → checkout → `jp-verify-purchase`).
- On successful company plan purchase, the company's `plan` field is upgraded (free/premium/enterprise).
- Seeker Pro plans grant premium visibility + highlighted resume.

## Roles

- **Job Seeker**: browse/search jobs, apply, track applications, write company reviews, build profile, buy plans.
- **Company**: register (pending approval), post/highlight jobs (limit from plan), review applicants, view reviews.
- **Admin**: approve/reject companies, manage seekers/jobs/reviews/plans, seed & view CVs.

## Development

No build step. Open `index.html` in a browser or serve with any HTTP server:

```bash
npx serve Applications/jobportal
```
