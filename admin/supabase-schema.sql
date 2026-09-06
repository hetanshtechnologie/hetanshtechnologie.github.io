-- Run this in Supabase SQL Editor to enable admin access to contact table
-- This assumes hetanshtechnologie@gmail.com is already authenticated via Supabase Auth

-- Enable RLS on contact table (if not already enabled)
ALTER TABLE contact ENABLE ROW LEVEL SECURITY;

-- Allow admin to read all contact rows
-- (Admin is identified by email via the authenticated user)
DROP POLICY IF EXISTS "Admin can read contact" ON contact;
CREATE POLICY "Admin can read contact" ON contact
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com'
  );

-- Allow admin to delete contact rows
DROP POLICY IF EXISTS "Admin can delete contact" ON contact;
CREATE POLICY "Admin can delete contact" ON contact
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com'
  );

-- Keep existing policy for public inserts
DROP POLICY IF EXISTS "Public can insert contact" ON contact;
CREATE POLICY "Public can insert contact" ON contact
  FOR INSERT WITH CHECK (true);

-- Grant anonymous INSERT access (for the contact form / newsletter)
GRANT INSERT ON contact TO anon;
GRANT USAGE ON SEQUENCE contact_id_seq TO anon;

-- Grant admin SELECT/DELETE
GRANT SELECT, DELETE ON contact TO authenticated;

-- =============================================================
-- Blog admin policies — hetanshtechnologie@gmail.com can manage all content
-- =============================================================

-- Articles: admin can update/delete any article
DROP POLICY IF EXISTS "Admin articles update" ON blog_articles;
CREATE POLICY "Admin articles update" ON blog_articles
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');
DROP POLICY IF EXISTS "Admin articles delete" ON blog_articles;
CREATE POLICY "Admin articles delete" ON blog_articles
  FOR DELETE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

-- Topics: admin can update/delete any topic
DROP POLICY IF EXISTS "Admin topics update" ON blog_topics;
CREATE POLICY "Admin topics update" ON blog_topics
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');
DROP POLICY IF EXISTS "Admin topics delete" ON blog_topics;
CREATE POLICY "Admin topics delete" ON blog_topics
  FOR DELETE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

-- Replies: admin can delete any reply
DROP POLICY IF EXISTS "Admin replies delete" ON blog_replies;
CREATE POLICY "Admin replies delete" ON blog_replies
  FOR DELETE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

-- =============================================================
-- Jobs (careers / apply page) — see supabase/migrations/20260731090000_jobs_table.sql
-- =============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Public can read job postings
DROP POLICY IF EXISTS "Jobs public read" ON jobs;
CREATE POLICY "Jobs public read" ON jobs
  FOR SELECT USING (true);

-- Admin can add / update / delete jobs
DROP POLICY IF EXISTS "Admin insert jobs" ON jobs;
CREATE POLICY "Admin insert jobs" ON jobs
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

DROP POLICY IF EXISTS "Admin update jobs" ON jobs;
CREATE POLICY "Admin update jobs" ON jobs
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

DROP POLICY IF EXISTS "Admin delete jobs" ON jobs;
CREATE POLICY "Admin delete jobs" ON jobs
  FOR DELETE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

GRANT SELECT ON jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO authenticated;
