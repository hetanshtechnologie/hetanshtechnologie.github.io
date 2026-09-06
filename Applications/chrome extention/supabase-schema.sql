-- =============================================================
-- Job Tracker Chrome Extension - Supabase Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- ======= Job Tracker (main tracking table) =======
CREATE TABLE IF NOT EXISTS job_tracker (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  job_title TEXT DEFAULT '',
  job_url TEXT NOT NULL,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'visited' CHECK (status IN ('visited', 'applied', 'interview', 'rejected', 'offered', 'accepted')),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  salary_expected TEXT DEFAULT '',
  location TEXT DEFAULT '',
  job_type TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_tracker_url ON job_tracker(job_url);
CREATE INDEX IF NOT EXISTS idx_job_tracker_company ON job_tracker(company_name);
CREATE INDEX IF NOT EXISTS idx_job_tracker_status ON job_tracker(status);
CREATE INDEX IF NOT EXISTS idx_job_tracker_applied ON job_tracker(applied);
CREATE INDEX IF NOT EXISTS idx_job_tracker_visited ON job_tracker(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_tracker_user ON job_tracker(user_id);

-- Add the user_id column to an existing table (safe to re-run)
ALTER TABLE job_tracker ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE job_tracker ENABLE ROW LEVEL SECURITY;

-- Per-user access: only the owner can insert / read / update / delete
DROP POLICY IF EXISTS "Public can insert job_tracker" ON job_tracker;
CREATE POLICY "User can insert job_tracker" ON job_tracker
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read job_tracker" ON job_tracker;
CREATE POLICY "User can read job_tracker" ON job_tracker
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can update job_tracker" ON job_tracker;
CREATE POLICY "User can update job_tracker" ON job_tracker
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can delete job_tracker" ON job_tracker;
CREATE POLICY "User can delete job_tracker" ON job_tracker
  FOR DELETE USING (auth.uid() = user_id);

-- ======= Job Profile (autofill profile data) =======
CREATE TABLE IF NOT EXISTS job_profile (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  linked_in TEXT DEFAULT '',
  resume_url TEXT DEFAULT '',
  website TEXT DEFAULT '',
  cover_letter TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE job_profile ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE job_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read job_profile" ON job_profile;
CREATE POLICY "User can read job_profile" ON job_profile
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can insert job_profile" ON job_profile;
CREATE POLICY "User can insert job_profile" ON job_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can update job_profile" ON job_profile;
CREATE POLICY "User can update job_profile" ON job_profile
  FOR UPDATE USING (auth.uid() = user_id);

-- ======= Grants =======
GRANT SELECT, INSERT, UPDATE, DELETE ON job_tracker TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_profile TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_tracker TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_profile TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
