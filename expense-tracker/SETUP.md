# Daily Expense Tracker - Setup Guide

## 1. Database Setup
Run `supabase/schema.sql` in Supabase SQL Editor to create all tables and seed plans.

## 2. Edge Functions
Deploy these Supabase Edge Functions:
- `et-create-order` - Razorpay order creation
- `et-verify-purchase` - Payment verification
- `et-admin` - Admin dashboard data

```bash
supabase functions deploy et-create-order --no-verify-jwt
supabase functions deploy et-verify-purchase --no-verify-jwt
supabase functions deploy et-admin --no-verify-jwt
```

## 3. Environment Variables
Set these in Supabase Dashboard:
- `RAZORPAY_KEY_ID` - Your Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Your Razorpay key secret
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase

## 4. Files Structure
```
expense-tracker/
  index.html       - Main app (login + dashboard)
  admin.html       - Admin panel
  css/style.css    - Styles with dark mode
  js/app.js        - All app logic
  supabase/schema.sql - Database schema
```

## 5. Features
- CRUD expenses with categories
- Recurring expenses (weekly/monthly/yearly)
- Monthly/yearly analytics with charts
- Budget tracking with alerts
- Dark/Light mode
- Hindi/English language support
- CSV export
- Free/Pro/Admin plans with Razorpay
- Admin dashboard with user management
