-- Society Management System - Supabase PostgreSQL Schema

-- Profiles / Residents (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'resident', 'security', 'staff')) DEFAULT 'resident',
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  flat_number TEXT,
  wing TEXT,
  ownership TEXT CHECK (ownership IN ('owner', 'tenant')) DEFAULT 'owner',
  occupation TEXT,
  alternate_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Flats / Units
CREATE TABLE flats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_number TEXT NOT NULL UNIQUE,
  wing TEXT,
  floor INTEGER,
  area_sqft NUMERIC,
  owner_id UUID REFERENCES profiles(id),
  tenant_id UUID REFERENCES profiles(id),
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance Bills
CREATE TABLE maintenance_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id UUID REFERENCES flats(id) NOT NULL,
  resident_id UUID REFERENCES profiles(id) NOT NULL,
  bill_month DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  late_fee NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'paid', 'partial', 'overdue')) DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES maintenance_bills(id),
  resident_id UUID REFERENCES profiles(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('upi', 'razorpay', 'stripe', 'cash', 'bank_transfer')),
  transaction_id TEXT UNIQUE,
  gateway_response JSONB,
  status TEXT CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
  paid_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements / Notice Board
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('general', 'maintenance', 'emergency', 'event', 'notice')),
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  attachment_url TEXT,
  created_by UUID REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Forum Topics
CREATE TABLE forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Forum Comments
CREATE TABLE forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Emergency Contacts Directory
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  email TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Facilities
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  hourly_rate NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Facility Bookings
CREATE TABLE facility_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) NOT NULL,
  resident_id UUID REFERENCES profiles(id) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  amount_paid NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Visitors
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_number TEXT,
  purpose TEXT,
  flat_id UUID REFERENCES flats(id),
  host_id UUID REFERENCES profiles(id),
  otp TEXT,
  otp_expires_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'approved', 'checked_in', 'checked_out', 'rejected')) DEFAULT 'pending',
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parking Slots
CREATE TABLE parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number TEXT NOT NULL UNIQUE,
  wing TEXT,
  type TEXT CHECK (type IN ('car', 'bike', 'visitor')) DEFAULT 'car',
  is_occupied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parking Assignments
CREATE TABLE parking_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES parking_slots(id) NOT NULL,
  resident_id UUID REFERENCES profiles(id) NOT NULL,
  vehicle_number TEXT NOT NULL,
  vehicle_model TEXT,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Complaints / Service Requests
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID REFERENCES profiles(id) NOT NULL,
  category TEXT CHECK (category IN ('plumbing', 'electrical', 'cleaning', 'painting', 'pest_control', 'structural', 'other')) NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  assigned_to UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses (for reports)
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  paid_to TEXT,
  payment_mode TEXT,
  bill_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from profiles
CREATE OR REPLACE FUNCTION user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- RLS Policies
CREATE POLICY "Admins full access" ON profiles FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON flats FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON maintenance_bills FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON payments FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON announcements FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON forum_topics FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON forum_comments FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON emergency_contacts FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON facilities FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON facility_bookings FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON visitors FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON parking_slots FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON parking_assignments FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON complaints FOR ALL USING (user_role() = 'admin');
CREATE POLICY "Admins full access" ON expenses FOR ALL USING (user_role() = 'admin');

-- Profile access
CREATE POLICY "View own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Bills: residents see their own
CREATE POLICY "View own bills" ON maintenance_bills FOR SELECT USING (resident_id = auth.uid());

-- Payments: residents see their own
CREATE POLICY "View own payments" ON payments FOR SELECT USING (resident_id = auth.uid());

-- Forum
CREATE POLICY "Anyone can read topics" ON forum_topics FOR SELECT USING (true);
CREATE POLICY "Residents create topics" ON forum_topics FOR INSERT WITH CHECK (user_role() IN ('resident', 'admin'));
CREATE POLICY "Anyone can read comments" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "Residents create comments" ON forum_comments FOR INSERT WITH CHECK (user_role() IN ('resident', 'admin'));

-- Announcements: all authenticated users can read
CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT USING (true);

-- Emergency contacts: all can read
CREATE POLICY "Anyone can read emergency contacts" ON emergency_contacts FOR SELECT USING (true);

-- Facility bookings
CREATE POLICY "Residents book facilities" ON facility_bookings FOR INSERT WITH CHECK (user_role() IN ('resident', 'admin'));
CREATE POLICY "View bookings" ON facility_bookings FOR SELECT USING (resident_id = auth.uid() OR user_role() = 'admin');

-- Visitors
CREATE POLICY "Security view visitors" ON visitors FOR SELECT USING (user_role() IN ('security', 'admin'));
CREATE POLICY "Residents view own visitors" ON visitors FOR SELECT USING (host_id = auth.uid());
CREATE POLICY "Insert visitors" ON visitors FOR INSERT WITH CHECK (user_role() IN ('security', 'admin', 'resident'));

-- Complaints
CREATE POLICY "Create complaints" ON complaints FOR INSERT WITH CHECK (user_role() IN ('resident', 'admin'));
CREATE POLICY "View complaints" ON complaints FOR SELECT USING (resident_id = auth.uid() OR user_role() IN ('admin', 'staff'));

-- Residents can view their own payments
CREATE POLICY "View own payments" ON payments FOR SELECT USING (
  resident_id = auth.uid()
);

-- Forum access
CREATE POLICY "Residents forum access" ON forum_topics FOR SELECT USING (true);
CREATE POLICY "Residents create topics" ON forum_topics FOR INSERT WITH CHECK (
  COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) IN ('resident', 'admin')
);
CREATE POLICY "Anyone can read comments" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "Residents create comments" ON forum_comments FOR INSERT WITH CHECK (
  COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) IN ('resident', 'admin')
);

-- Announcements readable by all authenticated users
CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT USING (true);

-- Emergency contacts readable by all
CREATE POLICY "Anyone can read emergency contacts" ON emergency_contacts FOR SELECT USING (true);

-- Facility bookings
CREATE POLICY "Residents book facilities" ON facility_bookings FOR INSERT WITH CHECK (
  COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) IN ('resident', 'admin')
);
CREATE POLICY "View own bookings" ON facility_bookings FOR SELECT USING (
  resident_id = auth.uid() OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) = 'admin'
);

-- Visitors
CREATE POLICY "Security view visitors" ON visitors FOR SELECT USING (
  COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) IN ('security', 'admin')
);
CREATE POLICY "Residents view own visitors" ON visitors FOR SELECT USING (
  host_id = auth.uid()
);
CREATE POLICY "Security manage visitors" ON visitors FOR INSERT WITH CHECK (
  COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) IN ('security', 'admin', 'resident')
);

-- Complaints
CREATE POLICY "Create complaints" ON complaints FOR INSERT WITH CHECK (
  COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) IN ('resident', 'admin')
);
CREATE POLICY "View own complaints" ON complaints FOR SELECT USING (
  resident_id = auth.uid() OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', (SELECT role FROM profiles WHERE id = auth.uid())) IN ('admin', 'staff')
);

-- Functions
CREATE OR REPLACE FUNCTION generate_monthly_bills()
RETURNS void AS $$
DECLARE
  flat RECORD;
  base_amount NUMERIC := 1500;
BEGIN
  FOR flat IN SELECT * FROM flats WHERE is_occupied = true LOOP
    INSERT INTO maintenance_bills (flat_id, resident_id, bill_month, amount, due_date)
    VALUES (
      flat.id,
      COALESCE(flat.owner_id, flat.tenant_id),
      date_trunc('month', CURRENT_DATE)::DATE,
      base_amount,
      date_trunc('month', CURRENT_DATE)::DATE + INTERVAL '10 days'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role, flat_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'New User'),
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'role', 'resident'),
    new.raw_user_meta_data ->> 'flat_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
