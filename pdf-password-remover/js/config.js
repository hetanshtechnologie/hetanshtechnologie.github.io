// PDF Password Remover — client configuration.
// SUPABASE_ANON_KEY is a publishable key (RLS-protected); it is safe to ship in the browser.
//
// The administrator account is NOT configured here: role assignment happens in the
// auth.users signup trigger in supabase/schema.sql, which grants 'admin' to
// hetanshtechnologie@gmail.com. That SQL is the single source of truth.
const CONFIG = {
  SUPABASE_URL: 'https://vgipghqejzbcoighktij.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaXBnaHFlanpiY29pZ2hrdGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjQ2MjIsImV4cCI6MjA5NTMwMDYyMn0.KoDwAZarGWOLwKXOwycA8wuIiIrksvZy7dyaO0-ehUo',
  UNLOCK_FUNCTION: 'pr-unlock',
  ADMIN_FUNCTION: 'pr-admin',
  BUCKET: 'pr_pdfs',
  APP_NAME: 'PDF Password Remover',
  MAX_FILE_BYTES: 25 * 1024 * 1024,
  // Signed download links are short-lived; storage objects are purged after 24h.
  SIGNED_URL_TTL_SECONDS: 3600
};
