-- Add RLS policies for self-registration (landing page enrollment)
-- Run: supabase db query --linked -f deploy-self-register.sql

-- Allow users to insert their own profile during signup
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'self_insert_profiles') THEN
    CREATE POLICY "self_insert_profiles" ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'self_update_profiles') THEN
    CREATE POLICY "self_update_profiles" ON profiles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Allow authenticated users to create organizations (self-signup)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'self_insert_organizations') THEN
    CREATE POLICY "self_insert_organizations" ON organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Allow authenticated users to create payment records during signup
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'self_insert_payments') THEN
    CREATE POLICY "self_insert_payments" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
