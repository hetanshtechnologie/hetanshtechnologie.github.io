-- =====================================================
-- Society Management — New Features Schema
-- Run this AFTER schema.sql in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. DOCUMENT STORAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('meeting_minutes', 'legal', 'financial', 'policy', 'notice', 'other')) NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access documents" ON documents FOR ALL USING (user_role() = 'admin');

-- Everyone can read documents
CREATE POLICY "Anyone can read documents" ON documents FOR SELECT USING (true);

-- Admins and staff can upload
CREATE POLICY "Admins insert documents" ON documents FOR INSERT WITH CHECK (user_role() IN ('admin', 'staff'));

-- =====================================================
-- 2. STAFF MANAGEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES profiles(id) NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('morning', 'afternoon', 'night', 'full_day')) DEFAULT 'morning',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access staff_shifts" ON staff_shifts FOR ALL USING (user_role() = 'admin');

-- Staff can view own shifts
CREATE POLICY "Staff view own shifts" ON staff_shifts FOR SELECT USING (staff_id = auth.uid());

-- =====================================================
-- 3. STAFF ATTENDANCE
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES profiles(id) NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday')) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, attendance_date)
);

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access staff_attendance" ON staff_attendance FOR ALL USING (user_role() = 'admin');

-- Staff can view own attendance
CREATE POLICY "Staff view own attendance" ON staff_attendance FOR SELECT USING (staff_id = auth.uid());

-- =====================================================
-- 4. STAFF DUTIES / TASKS
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_duties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  assigned_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE staff_duties ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access staff_duties" ON staff_duties FOR ALL USING (user_role() = 'admin');

-- Staff can view and update own duties
CREATE POLICY "Staff view own duties" ON staff_duties FOR SELECT USING (staff_id = auth.uid());
CREATE POLICY "Staff update own duties" ON staff_duties FOR UPDATE USING (staff_id = auth.uid());
