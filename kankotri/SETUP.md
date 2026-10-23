# Kankotri Invitation Generator — Setup

A static single-page app for creating personalised Gujarati/English wedding invitations. It uses Supabase for authentication, database, and file storage, and Razorpay for plan purchases.

- App path: `/kankotri/`
- Local entry: `kankotri/index.html`
- Supabase project ref: `vgipghqejzbcoighktij`
- App URL: `https://hetanshtechnologie.github.io/kankotri/`

There is no build step. Everything runs from static files and CDN libraries.

## 1. Create the database

1. Open the Supabase Dashboard for project `vgipghqejzbcoighktij`.
2. Go to **SQL Editor** and run the full contents of:

   `kankotri/supabase/schema.sql`

The script is idempotent. It creates:

- `profiles`, `plans`, `templates`, `guest_batches`, `guest_lists`
- `invitation_details`, `generation_jobs`, `generated_cards`
- `subscriptions`, `usage_logs`, `payments`, `audit_logs`
- Row Level Security policies and the `get_my_plan()` RPC
- Storage buckets `invitations` (private) and `templates` (public)
- Starter Free/Premium/Business plans and 12 starter templates

Re-running the script is safe. It will not delete user data.

## 2. Make yourself an admin

After signing up once through the app, run this in the SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'hetanshtechnologie@gmail.com';
```

Sign out and back in. The **Admin** item appears in the sidebar. The same page also lets you promote or demote other admins.

## 3. Configure authentication

In Supabase **Authentication > URL Configuration**:

- **Site URL**

  ```text
  https://hetanshtechnologie.github.io/kankotri/
  ```

- **Redirect URLs** — add all of these:

  ```text
  https://hetanshtechnologie.github.io/kankotri/
  https://hetanshtechnologie.github.io/kankotri/index.html
  http://localhost:5500/kankotri/
  http://localhost:5500/kankotri/index.html
  ```

Add any other local/preview origins you use. The app redirects to the current path after Google sign-in, email confirmation, and password reset.

### Google sign-in

1. Create an OAuth 2.0 Web Client in Google Cloud Console.
2. Add the Supabase callback as an authorized redirect URI:

   ```text
   https://vgipghqejzbcoighktij.supabase.co/auth/v1/callback
   ```

3. In Supabase **Authentication > Providers > Google**, enable Google and paste the Client ID and Client Secret.

Email/password sign-up works without Google.

## 4. Deploy the edge functions

Three functions are required:

| Function | Purpose |
| --- | --- |
| `kankotri-create-order` | Creates a Razorpay order for a paid plan |
| `kankotri-verify-purchase` | Verifies the Razorpay signature and activates the plan |
| `kankotri-admin` | Admin-only Razorpay refunds |

Set the Razorpay secrets once:

```bash
npx supabase secrets set \
  RAZORPAY_KEY_ID=rzp_live_T69SbFfk53qNmY \
  RAZORPAY_KEY_SECRET=your_razorpay_key_secret \
  --project-ref vgipghqejzbcoighktij
```

Deploy all three:

```bash
npx supabase functions deploy kankotri-create-order --project-ref vgipghqejzbcoighktij
npx supabase functions deploy kankotri-verify-purchase --project-ref vgipghqejzbcoighktij
npx supabase functions deploy kankotri-admin --project-ref vgipghqejzbcoighktij
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to hosted functions. Do not put the Razorpay secret or service-role key in the frontend.

Razorpay orders are created in paise (`plan.price * 100`). The verify function also checks the payment status and amount with Razorpay before activating a plan.

## 5. Verify storage

The schema creates the buckets and policies. Confirm in **Storage**:

- `invitations` — **private**
- `templates` — **public**

Generated cards and ZIP files are uploaded under:

```text
<user-id>/<YYYY-MM-DD>/<timestamp>/...
```

The first folder must equal the signed-in user's id, or the storage policy will reject the upload.

## 6. Run locally

Use a local web server from the repository root, not `file://`:

```bash
npx serve .
# or
python -m http.server 5500
```

Then open:

```text
http://localhost:5500/kankotri/
```

Add that exact origin/path to Supabase redirect URLs before testing Google sign-in or password reset.

## 7. Test checklist

1. Sign up with email, confirm the email, and sign in.
2. Sign in with Google.
3. Open **Templates**, preview a card, and pick one.
4. Upload a guest CSV/XLSX and save the batch.
5. Fill in **Customize**, upload a logo/font if desired, and save.
6. Generate a small batch with PNG first, then test PDF and HD.
7. Download the ZIP from the success panel and from **History**.
8. Open **Plans**, complete a Razorpay test payment, and confirm the plan changes.
9. Sign in as admin and check all six Admin tabs.
10. Refund a successful payment from **Admin > Payments**; confirm the Razorpay refund and the `payments` status.
11. Delete a generation job; confirm its storage files are removed.
12. Promote the admin email and verify a normal user cannot open `#/admin`.

Use Razorpay test keys while testing, then replace the secrets with live keys.

## Common issues

**“Razorpay is not configured”**  
The edge function secrets are missing. Run `supabase secrets set` and redeploy.

**Google sign-in returns to the wrong page**  
Add the exact current origin and path to Supabase redirect URLs.

**Uploads fail with a storage policy error**  
The path must start with the signed-in user id, and the `invitations` bucket must be private.

**Plan stays Free after payment**  
Check the `kankotri-verify-purchase` function logs. The payment must be `captured` or `authorized` and the amount must match the plan price.

**Admin link is missing**  
Set `profiles.role = 'admin'` for your account, then sign out and back in.
