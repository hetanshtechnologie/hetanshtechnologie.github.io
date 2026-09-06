-- =============================================================
-- Blog Application - Supabase Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- =============================================================

-- 1. User profiles table (must be first; other tables FK to it)
CREATE TABLE blog_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Topics table
CREATE TABLE blog_topics (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES blog_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Articles table
CREATE TABLE blog_articles (
  id BIGSERIAL PRIMARY KEY,
  topic_id BIGINT REFERENCES blog_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  created_by UUID REFERENCES blog_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Replies table (hierarchical / threaded)
CREATE TABLE blog_replies (
  id BIGSERIAL PRIMARY KEY,
  article_id BIGINT REFERENCES blog_articles(id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES blog_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES blog_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Enable Row Level Security
-- =============================================================
ALTER TABLE blog_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS Policies: Public read, authenticated write
-- =============================================================

-- Topics: anyone can read, only authenticated users can insert/update/delete
CREATE POLICY "Topics public read" ON blog_topics FOR SELECT USING (true);
CREATE POLICY "Topics authenticated insert" ON blog_topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Topics owner update" ON blog_topics FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Topics owner delete" ON blog_topics FOR DELETE USING (auth.uid() = created_by);

-- Articles: anyone can read, only authenticated users can insert/update/delete
CREATE POLICY "Articles public read" ON blog_articles FOR SELECT USING (true);
CREATE POLICY "Articles authenticated insert" ON blog_articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Articles owner update" ON blog_articles FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Articles owner delete" ON blog_articles FOR DELETE USING (auth.uid() = created_by);

-- Replies: anyone can read, only authenticated users can insert
CREATE POLICY "Replies public read" ON blog_replies FOR SELECT USING (true);
CREATE POLICY "Replies authenticated insert" ON blog_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Replies owner update" ON blog_replies FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Replies owner delete" ON blog_replies FOR DELETE USING (auth.uid() = created_by);

-- Profiles: anyone can read, only the owner can insert/update
CREATE POLICY "Profiles public read" ON blog_profiles FOR SELECT USING (true);
CREATE POLICY "Profiles owner insert" ON blog_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles owner update" ON blog_profiles FOR UPDATE USING (auth.uid() = id);

-- =============================================================
-- Auto-create profile on signup (trigger)
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.blog_profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- ONLY for existing databases (if you already ran the original schema):
-- Run these ALTER statements to fix FK references so Supabase
-- can resolve blog_profiles joins correctly.
-- =============================================================
-- ALTER TABLE blog_topics DROP CONSTRAINT blog_topics_created_by_fkey;
-- ALTER TABLE blog_topics ADD CONSTRAINT blog_topics_created_by_fkey
--   FOREIGN KEY (created_by) REFERENCES blog_profiles(id) ON DELETE SET NULL;
--
-- ALTER TABLE blog_articles DROP CONSTRAINT blog_articles_created_by_fkey;
-- ALTER TABLE blog_articles ADD CONSTRAINT blog_articles_created_by_fkey
--   FOREIGN KEY (created_by) REFERENCES blog_profiles(id) ON DELETE SET NULL;
--
-- ALTER TABLE blog_replies DROP CONSTRAINT blog_replies_created_by_fkey;
-- ALTER TABLE blog_replies ADD CONSTRAINT blog_replies_created_by_fkey
--   FOREIGN KEY (created_by) REFERENCES blog_profiles(id) ON DELETE SET NULL;
