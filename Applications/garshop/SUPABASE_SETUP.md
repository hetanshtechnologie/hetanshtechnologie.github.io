# GarShop — Supabase Setup & Deployment

Uses the same Supabase project as the todo app:
- Project ref: `vgipghqejzbcoighktij`
- URL: `https://vgipghqejzbcoighktij.supabase.co`

## 1. Run the schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Open `supabase/schema.sql`, copy the contents, run it.
   - Creates all `gs_*` tables, RLS policies, and admin helper RPC functions.

## 2. Create the storage bucket

1. **Storage → New bucket** → name: `gs_images`
2. Public bucket: **ON** (photos are served publicly).
3. Keep file size limit (default 50 MB) — the app compresses photos anyway.
4. **Storage policies are required** — without them every upload fails with
   `new row violates row-level security policy`. In **SQL Editor**, run
   `supabase/add-gs-images-storage-policies.sql`. It lets any signed-in user
   upload to their own `<auth.uid()>/` folder (the key all apps use) and allows
   public reads.

## 3. Create the admin account

The web app only shows data to a profile with `role = 'admin'`.

1. **Authentication → Users → Add user** (email + password) for the admin.
2. Copy the new user's UUID.
3. In **SQL Editor**, run:

```sql
INSERT INTO gs_profiles (user_id, full_name, phone, role)
VALUES ('<ADMIN_USER_UUID>', 'Admin', '', 'admin');
```

4. Login to `admin/index.html` with those credentials.

> Do not sign up as admin from the apps — the apps only create `owner`/`user` roles.

## 4. (Optional) Seed demo data

1. Create two users in **Authentication → Users**: `owner@demo.com`, `user@demo.com`.
2. Replace the UUID placeholders at the top of `supabase/seed-data.sql` with their UUIDs.
3. Run the file in **SQL Editor**.

## 5. Deploy the admin web app

**GitHub Pages** (repo: `Hetansh Technologie /Hetansh Technologie .github.io`):
- Push the `Applications/garshop` folder; it's served at
  `https://Hetansh Technologie .github.io/Applications/garshop/admin/index.html`
- The config in `admin/js/config.js` already points at the project URL + anon key.

> The anon key is a public (publishable) key — safe to include in web apps. Never expose the `service_role` key.

## 6. Install the Android apps

- Copy `downloads/GarShop-Owner.apk` and `downloads/GarShop-User.apk` to a phone and open them (allow "install unknown apps"), or
- Rebuild from `android/owner` and `android/user` in Android Studio.

Both apps embed the same Supabase URL + anon key and authenticate users with email/password.

## Push notifications (optional, beyond current scope)

In-app notifications are already persisted to `gs_notifications` (users see them in the Notifications screen).
To add true OS push notifications:

1. Create a Firebase project → add two Android apps (owner + user, matching `com.garshop.owner` / `com.garshop.user`), download `google-services.json`.
2. Add `com.google.gms.google-services` plugin + `firebase-messaging` to both apps.
3. Write a Supabase **Edge Function** (or use `pg_cron` on `gs_reminders`) to send FCM messages for due reminders.

## Database schema at a glance

| Table | Purpose |
|-------|---------|
| `gs_profiles` | Users + role (`admin`/`owner`/`user`) |
| `gs_garages` | Garage shops (owner_id, status pending→approved/suspended) |
| `gs_garage_services` | Per-garage services catalog |
| `gs_cars` | User cars |
| `gs_car_components` | Components / inventory per car |
| `gs_issues` | User-reported problems (photo, status) |
| `gs_appointments` | Bookings (pending→confirmed→completed) |
| `gs_reminders` | Service reminders |
| `gs_notifications` | In-app notifications |
| `gs_inventory` | Garage parts/components stock |
| `gs_analytics()` | Admin RPC returning aggregated counts |
| `gs_admin_users()` | Admin RPC returning profiles + auth emails |
