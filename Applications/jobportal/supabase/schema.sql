-- =============================================================
-- JobPortal - Naukri-like job portal (Hetansh Technologie)
-- Roles: admin, company, seeker
-- Run this in Supabase SQL Editor, then run seed-data.sql
-- =============================================================

-- ======= Profiles (role + seeker/company shared details) =======
CREATE TABLE IF NOT EXISTS jp_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'seeker' CHECK (role IN ('admin','company','seeker')),
  email TEXT DEFAULT '',
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  location TEXT DEFAULT '',
  headline TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  current_ctc TEXT DEFAULT '',
  expected_ctc TEXT DEFAULT '',
  notice_period TEXT DEFAULT '',
  experience_years NUMERIC(4,1) DEFAULT 0,
  resume_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin check (SECURITY DEFINER avoids RLS recursion) - defined AFTER jp_profiles
CREATE OR REPLACE FUNCTION public.jp_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jp_profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.jp_is_admin() TO anon, authenticated;

ALTER TABLE jp_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_profiles read own" ON jp_profiles FOR SELECT USING (user_id = auth.uid() OR public.jp_is_admin());
CREATE POLICY "jp_profiles read applicants" ON jp_profiles FOR SELECT USING (EXISTS (
  SELECT 1 FROM jp_applications a
  JOIN jp_jobs j ON j.id = a.job_id
  JOIN jp_companies c ON c.id = j.company_id
  WHERE a.seeker_id = jp_profiles.user_id AND c.user_id = auth.uid()
));
CREATE POLICY "jp_profiles insert own" ON jp_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "jp_profiles update own" ON jp_profiles FOR UPDATE USING (user_id = auth.uid() OR public.jp_is_admin());

-- Prevent clients from self-assigning the admin role
CREATE OR REPLACE FUNCTION public.jp_prevent_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NOT public.jp_is_admin() THEN
    RAISE EXCEPTION 'Cannot assign the admin role directly';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS jp_profiles_prevent_admin ON jp_profiles;
CREATE TRIGGER jp_profiles_prevent_admin
  BEFORE INSERT OR UPDATE ON jp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.jp_prevent_admin_role();

-- ======= Companies =======
CREATE TABLE IF NOT EXISTS jp_companies (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  website TEXT DEFAULT '',
  description TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  location TEXT DEFAULT '',
  size TEXT DEFAULT '11-50',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium','enterprise')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jp_companies_user ON jp_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_jp_companies_status ON jp_companies(status);
ALTER TABLE jp_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_companies public read approved" ON jp_companies FOR SELECT USING (status = 'approved' OR user_id = auth.uid() OR public.jp_is_admin());
CREATE POLICY "jp_companies insert own" ON jp_companies FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "jp_companies update own" ON jp_companies FOR UPDATE USING (user_id = auth.uid() OR public.jp_is_admin());

-- ======= Plans (monetization) =======
CREATE TABLE IF NOT EXISTS jp_plans (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('company','seeker')),
  price INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 0,
  job_limit INTEGER NOT NULL DEFAULT 2,
  highlight_jobs INTEGER NOT NULL DEFAULT 0,
  resume_views INTEGER NOT NULL DEFAULT 0,
  premium_visibility BOOLEAN NOT NULL DEFAULT FALSE,
  priority_support BOOLEAN NOT NULL DEFAULT FALSE,
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE jp_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_plans public read" ON jp_plans FOR SELECT USING (true);
CREATE POLICY "jp_plans admin write" ON jp_plans FOR ALL USING (public.jp_is_admin());

-- ======= Subscriptions =======
CREATE TABLE IF NOT EXISTS jp_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES jp_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  razorpay_order_id TEXT DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jp_subscriptions_user ON jp_subscriptions(user_id);
ALTER TABLE jp_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_subscriptions own" ON jp_subscriptions FOR ALL USING (user_id = auth.uid() OR public.jp_is_admin());

-- ======= Jobs =======
CREATE TABLE IF NOT EXISTS jp_jobs (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES jp_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Full-time',
  location TEXT DEFAULT 'Remote',
  experience_min NUMERIC(4,1) DEFAULT 0,
  experience_max NUMERIC(4,1) DEFAULT 0,
  salary_min NUMERIC(12,2) DEFAULT 0,
  salary_max NUMERIC(12,2) DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jp_jobs_status ON jp_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jp_jobs_company ON jp_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jp_jobs_skills ON jp_jobs USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_jp_jobs_title ON jp_jobs(title);
ALTER TABLE jp_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_jobs public read active" ON jp_jobs FOR SELECT USING (
  (status = 'active' AND EXISTS (SELECT 1 FROM jp_companies WHERE id = jp_jobs.company_id AND status = 'approved'))
  OR EXISTS (SELECT 1 FROM jp_companies WHERE id = jp_jobs.company_id AND user_id = auth.uid())
  OR public.jp_is_admin()
);
CREATE POLICY "jp_jobs read applied" ON jp_jobs FOR SELECT USING (EXISTS (SELECT 1 FROM jp_applications WHERE job_id = jp_jobs.id AND seeker_id = auth.uid()));
CREATE POLICY "jp_jobs company insert" ON jp_jobs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM jp_companies WHERE id = jp_jobs.company_id AND user_id = auth.uid()));
CREATE POLICY "jp_jobs company update" ON jp_jobs FOR UPDATE USING (EXISTS (SELECT 1 FROM jp_companies WHERE id = jp_jobs.company_id AND user_id = auth.uid()) OR public.jp_is_admin());
CREATE POLICY "jp_jobs company delete" ON jp_jobs FOR DELETE USING (EXISTS (SELECT 1 FROM jp_companies WHERE id = jp_jobs.company_id AND user_id = auth.uid()) OR public.jp_is_admin());

-- ======= Applications =======
CREATE TABLE IF NOT EXISTS jp_applications (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES jp_jobs(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_ctc TEXT DEFAULT '',
  expected_ctc TEXT DEFAULT '',
  notice_period TEXT DEFAULT '',
  cover_letter TEXT DEFAULT '',
  resume_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','reviewed','shortlisted','rejected','hired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, seeker_id)
);
CREATE INDEX IF NOT EXISTS idx_jp_applications_job ON jp_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_jp_applications_seeker ON jp_applications(seeker_id);
ALTER TABLE jp_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_applications seeker own" ON jp_applications FOR SELECT USING (seeker_id = auth.uid());
CREATE POLICY "jp_applications company job" ON jp_applications FOR SELECT USING (EXISTS (SELECT 1 FROM jp_jobs WHERE id = jp_applications.job_id AND company_id IN (SELECT id FROM jp_companies WHERE user_id = auth.uid())));
CREATE POLICY "jp_applications admin all" ON jp_applications FOR SELECT USING (public.jp_is_admin());
CREATE POLICY "jp_applications insert own" ON jp_applications FOR INSERT WITH CHECK (seeker_id = auth.uid());
CREATE POLICY "jp_applications company update" ON jp_applications FOR UPDATE USING (EXISTS (SELECT 1 FROM jp_jobs WHERE id = jp_applications.job_id AND company_id IN (SELECT id FROM jp_companies WHERE user_id = auth.uid())) OR public.jp_is_admin());

-- ======= Reviews =======
CREATE TABLE IF NOT EXISTS jp_reviews (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES jp_companies(id) ON DELETE CASCADE,
  seeker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT DEFAULT '',
  interview_exp TEXT DEFAULT '',
  culture TEXT DEFAULT '',
  environment TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jp_reviews_company ON jp_reviews(company_id);
ALTER TABLE jp_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_reviews public read published" ON jp_reviews FOR SELECT USING (status = 'published' OR seeker_id = auth.uid() OR public.jp_is_admin());
CREATE POLICY "jp_reviews insert own" ON jp_reviews FOR INSERT WITH CHECK (seeker_id = auth.uid());
CREATE POLICY "jp_reviews update admin" ON jp_reviews FOR UPDATE USING (public.jp_is_admin() OR seeker_id = auth.uid());
CREATE POLICY "jp_reviews delete admin" ON jp_reviews FOR DELETE USING (public.jp_is_admin());

-- ======= CVs / Resumes (admin seeds & views, seekers submit) =======
CREATE TABLE IF NOT EXISTS jp_cvs (
  id BIGSERIAL PRIMARY KEY,
  seeker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  experience_years NUMERIC(4,1) DEFAULT 0,
  file_url TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jp_cvs_email ON jp_cvs(email);
ALTER TABLE jp_cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jp_cvs admin all" ON jp_cvs FOR ALL USING (public.jp_is_admin());
CREATE POLICY "jp_cvs seeker own" ON jp_cvs FOR SELECT USING (seeker_id = auth.uid());

-- ======= Grants =======
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_companies TO authenticated;
GRANT SELECT ON jp_companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_plans TO authenticated;
GRANT SELECT ON jp_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_jobs TO authenticated;
GRANT SELECT ON jp_jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_reviews TO authenticated;
GRANT SELECT ON jp_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jp_cvs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
