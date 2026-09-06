-- Set hetanshtechnologie@gmail.com as superadmin
-- Run this AFTER schema.sql and AFTER the user has signed up at least once

-- First, try to set admin by finding existing user
UPDATE profiles
SET role = 'admin'
WHERE email = 'hetanshtechnologie@gmail.com';

-- If the user hasn't signed up yet, this will ensure when they do,
-- the handle_new_user trigger sets them as admin
-- (The trigger uses raw_user_meta_data ->> 'role', so we need to update
-- the auth.users metadata too)

-- Update auth user metadata to include admin role (requires service_role key)
-- Uncomment and run separately with service_role if needed:
-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'hetanshtechnologie@gmail.com';

-- Verify
SELECT id, email, role, full_name FROM profiles WHERE email = 'hetanshtechnologie@gmail.com';
