# Shop Setup Guide

## 1. Database
Run `shop/supabase-schema.sql` in Supabase SQL Editor.

## 2. Edge Functions (deployed)
| Function | Purpose | Status |
|---|---|---|
| `create-order` | Creates order from cart for UPI/Bank payments (uses service_role) | Deployed |
| `send-pdf-email` | Sends email with PDF links (requires Resend API key) | Deployed |
| `create-razorpay-order` | Creates Razorpay order, saves pending order record | Deployed |
| `verify-payment` | Verifies Razorpay HMAC signature, saves order items, clears cart | Deployed |
| `razorpay-webhook` | Handles Razorpay webhook (for future server-side confirmation) | Deployed |

### Set secrets in Supabase Dashboard -> Edge Functions:
- `RAZORPAY_KEY_ID` = `rzp_live_T69SbFfk53qNmY`
- `RAZORPAY_KEY_SECRET` = `jI0XYcUDAzg6fvEGLspETOI4`
- `RESEND_API_KEY` = your Resend API key (for email delivery)
- `SITE_URL` = `https://HetanshTechnologie.github.io`

## 3. Payment Methods

### Razorpay (Cards / UPI / Wallet / Net Banking)
- Razorpay key ID is configured in `shop/js/shop.js`
- Checkout flow: User clicks "Pay via Razorpay" -> Razorpay popup -> Pay -> Auto-verify -> Success page
- Orders are confirmed instantly (no manual verification needed)
- Requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` secrets to be set

### UPI (GPay / PhonePe / Paytm)
- UPI ID: `hetanshtechnologie@okaxis`
- Phone: `+919974031480`
- User pays via any UPI app and enters the transaction ID

### Net Banking / NEFT / IMPS
- Update `shop/cart.html` — replace `[Your Account Number]` and `[Your IFSC Code]` (search for `bank-account` and `bank-ifsc` IDs)

## 4. Admin Payment Verification (UPI/Bank only)
Orders via UPI/Bank are stored with `payment_status = 'confirmed'` (auto-confirmed after user submits transaction ID). Razorpay orders are auto-verified via HMAC signature.

## 5. Resend (Email)
1. Sign up at https://resend.com
2. Verify your domain
3. Set `RESEND_API_KEY` in Supabase Edge Function secrets

## 6. Frontend
All shop pages are at `/shop/`. The site nav links to `/shop/` from all pages.

## Flow
Login -> Browse products -> Add to cart -> Checkout -> Razorpay/UPI/Bank -> Pay -> Success page with download links
