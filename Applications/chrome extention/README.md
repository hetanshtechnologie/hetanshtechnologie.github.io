# Job Tracker & Autofill - Chrome Extension

Track job applications and autofill forms using Supabase.

## Setup

### 1. Create Supabase Tables

Run `supabase-schema.sql` in your Supabase SQL Editor to create the required tables.

### 2. Generate Icons

Open `generate-icons.html` in a browser, right-click each canvas, and save as:
- `icons/icon16.png`
- `icons/icon48.png`  
- `icons/icon128.png`

### 3. Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension/` folder

### 4. Configure

The extension uses your existing Supabase credentials (already configured in `background.js`).

### 5. Google Login (per-user data)

1. **Enable Google provider** in Supabase:
   `Authentication` → `Providers` → `Google` → enable and add your Google OAuth Client ID/Secret (already done if your admin dashboard logs in with Google).
2. **Add the extension redirect URL** in Supabase:
   `Authentication` → `URL Configuration` → `Redirect URLs` → add `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`
   (Find your extension ID on `chrome://extensions` after loading the unpacked extension.)
3. **Update the database** (per-user RLS): re-run the updated `supabase-schema.sql` in the Supabase SQL Editor. This adds a `user_id` column and makes each user see only their own rows.
4. Reload the extension in `chrome://extensions` (the reload adds the new `identity` permission).
5. Open the popup and click **Login with Google**.

> Note: Rows tracked before login have no `user_id` and won't appear after logging in.

## Features

- **Auto-tracking**: Visits to job sites (LinkedIn, Indeed, Greenhouse, Lever, Workday, etc.) are automatically tracked
- **Google Login**: Sign in with Google so history & profile are private to you
- **Status management**: Mark applications as Applied, Interview, Offered, Rejected
- **Job detail capture**: Auto-detects job title, company, location, salary & job type (JSON-LD + DOM) and lets you edit/save them
- **Form autofill**: Stores your profile and fills job application forms with one click
- **Field detection**: Intelligently matches form fields (name, email, phone, LinkedIn, resume URL, etc.)
- **History**: View all tracked applications in the popup

## File Structure

```
chrome-extension/
  manifest.json       # Manifest V3 configuration
  background.js       # Service worker (Supabase sync)
  content.js          # Content script (form detection & autofill)
  popup.html          # Extension popup UI
  popup.js            # Popup logic
  supabase-schema.sql # Database schema
  generate-icons.html # Icon generator tool
  icons/              # Extension icons (create via generator)
```

## Admin Dashboard

View all tracked applications at: `admin/JobApplication/index.html`

Requires admin authentication (hetanshtechnologie@gmail.com).
