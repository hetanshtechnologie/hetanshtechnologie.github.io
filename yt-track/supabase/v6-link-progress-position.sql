-- v6-link-progress-position.sql — saved watch time for every account.
-- Run in the Supabase SQL editor once (the deployed link_progress table was
-- missing the `position` column, which caused HTTP 400 on dashboard load).

ALTER TABLE public.link_progress
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Make sure every authenticated user may read/write their own progress rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_progress TO authenticated;

-- Refresh PostgREST's schema cache so the new column is usable immediately.
NOTIFY pgrst, 'reload schema';
