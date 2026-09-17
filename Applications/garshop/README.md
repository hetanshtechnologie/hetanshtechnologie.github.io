# GarShop — Multi-tenant Garage Shop Platform

A complete platform connecting car owners with local garages.

- **Admin** — Web app (HTML/CSS/JS + Supabase): approve/manage garages, view users, appointments, issues, reminders, analytics.
- **Garage Owner** — Android app (Kotlin): register garage, manage services catalog, view requests & users, schedule appointments, update repair status, send service reminders.
- **Garage User** — Android app (Kotlin): register/login, add cars, report issues (text + photo), browse garages, book appointments, get notifications, track service history.
- **Backend** — Supabase (auth, Postgres database, RLS, REST API, storage).

## Folder structure

```
garshop/
├── admin/                 # Admin web app (static, deploy to GitHub Pages / any host)
│   ├── index.html
│   ├── css/style.css
│   └── js/ (config.js, app.js)
├── android/
│   ├── owner/             # Garage Owner Android app (Kotlin, Gradle)
│   └── user/              # Garage User Android app (Kotlin, Gradle)
├── supabase/
│   ├── schema.sql         # Full DB schema + RLS policies + admin RPC functions
│   └── seed-data.sql      # Demo data (garage, services, car, issues...)
└── downloads/             # Built APKs
    ├── GarShop-Owner.apk
    └── GarShop-User.apk
```

## Quick start

1. **Supabase setup** — follow [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md): run `schema.sql`, create the storage bucket, promote an admin.
2. **Admin web app** — open `admin/index.html` in a browser (or host it). Login with the admin account.
3. **Android apps** — install the APKs from `downloads/`, or rebuild with Android Studio.

## Rebuild the Android apps

Prerequisites: JDK 17+, Android SDK 34. Open `android/owner` or `android/user` in Android Studio, or build via Gradle:

```
cd android/owner
gradlew assembleDebug          # output: app/build/outputs/apk/debug/app-debug.apk
```

## Roles & workflow

| Role | Can do |
|------|--------|
| Admin | Approve/suspend/delete garages, view all users/appointments/issues, analytics |
| Owner | Register garage → gets approved by admin → manage services, appointments, repair status, reminders |
| User | Add cars, report issues, book appointments, receive reminders |

**Multi-tenant isolation:** RLS policies scope every row to the garage owner. A garage owner only sees data for garages they own.

## Tech notes

- **Auth:** Supabase email/password (`gs_profiles` holds the role: `admin` / `owner` / `user`).
- **Photos:** uploaded to Supabase Storage bucket `gs_images` (public read).
- **Reminders:** stored in `gs_reminders` + in-app `gs_notifications`. Push notifications require FCM (see SUPABASE_SETUP.md → "Push notifications").
- **Appointment flow:** User books (status `pending`) → Owner confirms (`confirmed`) → Owner completes (`completed`).
- **Repair flow:** Issue `pending` → `in_progress` → `completed`.

## Live URLs (after pushing to GitHub Pages)

- Admin: `https://HetanshTechnologie.github.io/Applications/garshop/admin/index.html`
- Owner APK: `https://HetanshTechnologie.github.io/Applications/garshop/downloads/GarShop-Owner.apk`
- User APK: `https://HetanshTechnologie.github.io/Applications/garshop/downloads/GarShop-User.apk`
