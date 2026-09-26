# PDF Password Remover

Remove the password from a PDF you are authorised to open. Static HTML/CSS/JS
frontend, Supabase for auth, storage and processing.

- `index.html` — sign in / sign up
- `dashboard.html` — drag-and-drop upload, password field, download
- `admin.html` — analytics, user block/unblock, processing log

## Setup

> **The app cannot work until the SQL below has been run.** The `pr_users` and
> `pr_pdf_logs` tables do not exist on the Supabase project yet, so no account
> can load a profile. Until this is done, signing in lands on an error page that
> says so rather than silently failing.

Run these once in the **Supabase SQL editor**
(Dashboard → your project → **SQL Editor** → **New query**), in order:

1. `supabase/schema.sql` — tables, RLS, admin RPCs, 24-hour cleanup job
2. `supabase/storage-policies.sql` — the private `pr_pdfs` bucket and its policies

Paste the whole file into one query and press **Run**, then repeat for the second
file. Both are safe to re-run: every object is created with `create or replace`
or `drop ... if exists` first, and everything is prefixed `pr_`.

To confirm it worked, run this query; it should list the new tables:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'pr_%';
```

Then deploy the Edge Functions:

```bash
supabase link --project-ref vgipghqejzbcoighktij
supabase functions deploy pr-unlock
supabase functions deploy pr-admin
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by Supabase; there is nothing else to configure.

The administrator account is `hetanshtechnologie@gmail.com`. It is granted the
`admin` role by the signup trigger, which matches that exact address in
`supabase/schema.sql` — so **sign in with that address on `index.html` to create
the profile**, then the app will send you to `admin.html` rather than
`dashboard.html`. Any other address gets the `user` role and lands on
`dashboard.html`.

That address in `schema.sql` is the single source of truth. `js/config.js`
deliberately does **not** repeat it, so the two cannot drift apart.

## Google sign-in

The code is complete; the provider has to be switched on in two places. Until
that is done the button returns a clear "Google sign-in is not enabled" message
rather than failing silently.

**1. Create the OAuth client** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → *Create credentials* → *OAuth client ID* → **Web application**.

- **Authorized redirect URI** — this exact URL, and nothing else:
  ```
  https://vgipghqejzbcoighktij.supabase.co/auth/v1/callback
  ```
- Copy the **Client ID** and **Client secret**.

**2. Enable the provider** — Supabase dashboard → **Authentication** → **Providers** → **Google** → enable, then paste the client ID and secret.

**3. Allow the app's own URL** — Supabase dashboard → **Authentication** → **URL Configuration** → **Redirect URLs**, add every address you actually serve the app from:

```
http://localhost/HetanshTechnologie/pdf-password-remover/index.html
https://hetanshtechnologie.github.io/pdf-password-remover/index.html
```

Supabase only allows `http://localhost:3000` by default, so a missing entry here
is the usual cause of *"site not allowed"*. The button posts back to whichever
page it was clicked on, so each host needs its own entry.

How it behaves:

- Google sign-in creates the account on first use, and `pr_handle_new_user`
  assigns the role — `admin` for the address above (case-insensitively), `user`
  for everyone else.
- Returning from Google lands on `index.html`, which waits for Supabase to
  exchange the callback before deciding whether you are signed in.
- A blocked account loses the Google button as well as the form.
- `pr_ensure_user_profile()` promotes an already-existing account to `admin` when
  its address matches, so an account created *before* the SQL was first run is
  fixed by simply signing in again.

## How it works

1. The browser uploads the PDF **directly** to the private `pr_pdfs` bucket under
   its own `<uid>/` folder. The file never passes through an Edge Function.
2. `pr-unlock` verifies the JWT, confirms the profile is `active`, checks the
   object key belongs to the caller, then downloads and decrypts.
3. The unlocked copy is written back to storage, the original is deleted, the
   attempt is logged, and a 1-hour signed URL is returned.

Unencrypted PDFs are detected by loading with no password; the original bytes are
returned untouched rather than re-encoded.

Blank password field:

- **Owner/permissions-only** PDFs open straight away — no password is required,
  so the file is returned decrypted.
- **User-password** PDFs return *"This PDF is password protected."* as a prompt to
  enter the password, which is a distinct message from a wrong password.

## Which encryption is supported

| Cipher | PDF version | Status |
| --- | --- | --- |
| AES-256 | V5 / R6 | supported |
| AES-128 | V4 / R4 | supported |
| RC4-128 | V2 / R3 | supported |
| RC4-40 | V1 / R2 | supported |
| Certificate / public key | `/Adobe.PubSec` | not supported (clear error) |

Verified end-to-end: for every cipher above, using both the user and the owner
password, the output has no `/Encrypt` dictionary, reopens without a password,
keeps its page count, and its text extracts intact (checked with an independent
reader, `pypdf`).

## Why `@cantoo/pdf-lib`

Upstream `pdf-lib` cannot open an encrypted document at all — its docs say so
outright. The alternatives were tested and rejected on evidence:

- **`@pdfsmaller/pdf-decrypt`** produced a structurally valid file with the
  `/Encrypt` dictionary gone, but the **page content was still encrypted** —
  `pypdf` extracted mojibake instead of the document text. It fails silently,
  which is the worst possible outcome for this feature.
- **`pdf-lib-encrypt`** refuses any PDF using compressed object streams, which is
  the default output of most modern PDF producers, so it rejects a large share of
  real files.
- **`qpdf`**, the most reliable tool, is a C++ binary and cannot run in Deno.

`@cantoo/pdf-lib` is the only option tested that decrypts every common cipher
correctly. It needs one non-obvious fix, which is why
`stripEncryptionArtifacts()` exists: after a successful decrypt, pdf-lib still
carries the *source* document's xref/trailer stream as an unparseable
`PDFInvalidObject`, and that leftover still contains the text `/Encrypt`. It is
unreferenced in the output, but strict readers see it and refuse the file. The
function drops only those specific leftovers and touches nothing else.

## Security

- Only authenticated users can upload or unlock; the Edge Functions re-verify the
  JWT and the profile's `active` status on every request.
- Object keys must start with the caller's `uid`; the bucket is private and its
  RLS policies scope reads, writes and deletes to the caller's own folder.
- Download links are signed and expire after 1 hour.
- Uploads are capped at 25 MB and validated as `%PDF-`.
- `pr_cleanup_expired_pdfs()` deletes every object older than 24 hours, scheduled
  via `pg_cron` every 15 minutes. Without `pg_cron`, call it from your own
  scheduler.
- Non-admins cannot change their own `role`, `status` or `email`
  (`trg_pr_protect_user_fields`).
- Admin endpoints re-check the role server-side; a stale client flag grants
  nothing.
- `pr_is_admin()` means **active** admin, so blocking an admin revokes their
  access on the next request rather than leaving a working session until its
  token expires. An administrator can neither block themselves nor block another
  administrator, so the admin surface cannot lock itself out.
- The admin RPCs are `SECURITY DEFINER` and authorise themselves with
  `auth.uid()`, which is why `pr-admin` calls them with the **caller's** token.
  Issuing them with the service role would leave `auth.uid()` empty and every
  call would reject its own caller.

## Note on table names

This app shares a Supabase project with the other apps in this repository, and
that project already has an unrelated `public.users` table. Every object here is
prefixed `pr_` to avoid colliding with it.

## What has been verified, and what has not

Verified locally:

- The four supported ciphers, with both the user and the owner password, produce
  output with no `/Encrypt` dictionary, correct page count, and text that
  extracts intact under an independent reader (`pypdf`).
- The `pr-unlock` request handler across 30 assertions: auth and blocked-user
  rejection, cross-user path and traversal rejection, size/type validation, wrong
  password, owner-only files with a blank password, unencrypted passthrough, and
  the full success path including input deletion and the 1-hour signed URL.
- The `pr-admin` handler across 25 assertions: auth and role guards, action
  routing, input validation, and that the admin RPCs are issued as the signed-in
  admin rather than the service role.
- Both SQL files parse against a real PostgreSQL parser, and the Edge Functions
  type-check under `tsc --strict`.

**Not** verified: nothing has been run against the live Supabase project yet. The
SQL and the two Edge Functions still need to be applied and deployed, and the
front end has not been exercised in a browser. `@cantoo/pdf-lib` was tested on
Node, not on Deno, so its behaviour on the Deno runtime is assumed rather than
confirmed.
