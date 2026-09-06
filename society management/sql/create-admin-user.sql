-- Complete setup: Create profiles table + admin user
-- Run this in Supabase SQL Editor

-- 1. Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'resident',
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  flat_number TEXT,
  wing TEXT,
  ownership TEXT DEFAULT 'owner',
  occupation TEXT,
  alternate_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create admin user
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  pw_hash text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
BEGIN
  DELETE FROM profiles WHERE email = 'society_admin@society.local';
  DELETE FROM auth.identities WHERE provider_id = 'society_admin@society.local';
  DELETE FROM auth.users WHERE email = 'society_admin@society.local';

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, confirmation_token, is_super_admin, role)
  VALUES (new_user_id, '00000000-0000-0000-0000-000000000000', 'society_admin@society.local',
    pw_hash, now(), '{"full_name":"Society Admin","role":"admin"}'::jsonb,
    now(), now(), '', false, 'authenticated');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  VALUES (new_user_id, new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', 'society_admin@society.local'),
    'email', 'society_admin@society.local', now(), now());

  INSERT INTO profiles (id, full_name, email, role, is_active)
  VALUES (new_user_id, 'Society Admin', 'society_admin@society.local', 'admin', true);
END $$;

-- 3. Verify
SELECT id, email, role FROM profiles WHERE email = 'society_admin@society.local';
