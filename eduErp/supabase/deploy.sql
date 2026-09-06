-- ============================================================
-- EduERP Deployment Script
-- Drops old profiles table, creates eduErp schema, seeds data
-- ============================================================

-- 0. Drop old incompatible tables (from previous systems)
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS fees CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS syllabus CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CORE MULTI-TENANT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic','standard','premium')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected')),
  max_students INTEGER DEFAULT 100,
  max_teachers INTEGER DEFAULT 20,
  storage_limit_mb INTEGER DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  max_students INTEGER DEFAULT 100,
  max_teachers INTEGER DEFAULT 20,
  storage_limit_mb INTEGER DEFAULT 500,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES plans(id),
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription','setup','donation','fee')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  receipt_url TEXT,
  due_date DATE,
  paid_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin','school_admin','teacher','student')),
  org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  dob DATE,
  gender TEXT,
  address TEXT,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','graduated','transferred')),
  guardian_name TEXT,
  guardian_phone TEXT,
  roll_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  dob DATE,
  gender TEXT,
  address TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  qualification TEXT,
  specialization TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','resigned')),
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  room TEXT,
  academic_year TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS syllabus (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topics JSONB DEFAULT '[]',
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','leave')),
  marked_by INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, date, class_id)
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  total_marks DECIMAL(10,2) NOT NULL,
  pass_percentage DECIMAL(5,2) DEFAULT 40.00,
  duration_minutes INTEGER DEFAULT 60,
  scheduled_date TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','in_progress','completed')),
  instructions TEXT,
  created_by INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq','descriptive','scenario')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  marks DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_results (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(10,2) DEFAULT 0,
  total_marks DECIMAL(10,2) DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','passed','failed')),
  answers JSONB,
  evaluated_by INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  evaluated_at TIMESTAMPTZ,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS fees (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','waived')),
  type TEXT NOT NULL CHECK (type IN ('tuition','exam','library','transport','other')),
  receipt_no TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  amount DECIMAL(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  message TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  receipt_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('salary','infrastructure','supplies','utilities','events','other')),
  amount DECIMAL(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'general' CHECK (event_type IN ('general','exam','holiday','meeting','deadline')),
  created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_org_id ON students(org_id);
CREATE INDEX IF NOT EXISTS idx_teachers_org_id ON teachers(org_id);
CREATE INDEX IF NOT EXISTS idx_classes_org_id ON classes(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS helper functions (SECURITY DEFINER to avoid recursive policy evaluation)
CREATE OR REPLACE FUNCTION is_super_admin(uid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = uid AND role = 'super_admin');
END;
$$;

CREATE OR REPLACE FUNCTION get_user_org_id(uid UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE org INTEGER;
BEGIN
  SELECT org_id INTO org FROM public.profiles WHERE user_id = uid;
  RETURN org;
END;
$$;

-- Super Admin sees all
CREATE POLICY "super_admin_all_organizations" ON organizations FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "super_admin_all_plans" ON plans FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "super_admin_all_payments" ON payments FOR ALL USING (is_super_admin(auth.uid()));
CREATE POLICY "super_admin_all_profiles" ON profiles FOR ALL USING (is_super_admin(auth.uid()));

-- Anyone can read plans
CREATE POLICY "anyone_read_plans" ON plans FOR SELECT USING (true);

-- Tenant-based access (org_id scoped)
CREATE POLICY "org_access_organizations" ON organizations FOR SELECT USING (
  id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_profiles" ON profiles FOR SELECT USING (
  user_id = auth.uid() OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_students" ON students FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_teachers" ON teachers FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_classes" ON classes FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_subjects" ON subjects FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_syllabus" ON syllabus FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_attendance" ON attendance FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_exams" ON exams FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_questions" ON questions FOR ALL USING (
  exam_id IN (SELECT id FROM exams WHERE org_id = get_user_org_id(auth.uid()))
);

CREATE POLICY "org_access_exam_results" ON exam_results FOR ALL USING (
  exam_id IN (SELECT id FROM exams WHERE org_id = get_user_org_id(auth.uid()))
);

CREATE POLICY "org_access_fees" ON fees FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_donations" ON donations FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_expenses" ON expenses FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

CREATE POLICY "org_access_events" ON events FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) OR is_super_admin(auth.uid())
);

-- Student self-access
CREATE POLICY "student_self_attendance" ON attendance FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "student_self_exam_results" ON exam_results FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Seed Data: Plans
INSERT INTO plans (name, slug, description, price, billing_cycle, max_students, max_teachers, storage_limit_mb, features) VALUES
('Basic', 'basic', 'For small schools just getting started', 0, 'monthly', 100, 20, 500, '["Up to 100 students","Up to 20 teachers","500 MB storage","Basic reports","Email support"]'),
('Standard', 'standard', 'For growing institutions', 4999, 'monthly', 500, 50, 2000, '["Up to 500 students","Up to 50 teachers","2 GB storage","Advanced reports","Exam system","Priority support"]'),
('Premium', 'premium', 'For large institutions with full features', 9999, 'monthly', 999999, 999999, 10000, '["Unlimited students","Unlimited teachers","10 GB storage","All reports","Full exam system","Donation management","Calendar integration","Export to CSV/Excel","API access","Dedicated support"]')
ON CONFLICT (slug) DO NOTHING;

-- Seed Data: Demo Organizations
INSERT INTO organizations (name, slug, email, phone, address, subscription_plan, status, max_students, max_teachers) VALUES
('Demo International School', 'demo-school', 'admin@demoschool.edu', '+1-555-0100', '123 Education Lane, Learning City', 'standard', 'active', 500, 50),
('Springfield Academy', 'springfield-academy', 'contact@springfield.edu', '+1-555-0200', '456 Knowledge Ave, Springfield', 'premium', 'active', 999999, 999999),
('Hillcrest Elementary', 'hillcrest-elementary', 'info@hillcrest.edu', '+1-555-0300', '789 Wisdom Street, Hillcrest', 'basic', 'pending', 100, 20)
ON CONFLICT (slug) DO NOTHING;

-- Function: Auto-create profile on user signup (trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role, full_name)
  VALUES (NEW.id, NEW.email, 'school_admin', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create super_admin profile for existing user hetanshtechnologie@gmail.com
INSERT INTO profiles (user_id, email, role, full_name)
SELECT id, email, 'super_admin', 'Hetansh Technologie'
FROM auth.users
WHERE email = 'hetanshtechnologie@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
