-- ============================================================================
-- BillEase v2 - Test users (role-based) for local / staging testing
--
-- Creates confirmed email/password auth accounts so you can log in through
-- the app and exercise every role:
--
--   owner@billease.test   / Owner@123   -> owner of the Spice & Sip Cafe demo
--   admin@billease.test   / Admin@123   -> admin (can manage team/settings)
--   staff@billease.test   / Staff@123   -> staff (can bill, no management)
--
-- Run AFTER schema.sql. Run seed.sql AFTER this to attach admin/staff to the
-- demo business. Idempotent: safe to re-run.
-- ============================================================================

DO $$
DECLARE
  u uuid;
BEGIN
  -- ---------- Owner ----------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner@billease.test') THEN
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'owner@billease.test', crypt('Owner@123', gen_salt('bf')), NOW(),
       '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW())
    RETURNING id INTO u;
    INSERT INTO auth.identities
      (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES
      (gen_random_uuid(), u, u::text, 'email',
       json_build_object('sub', u::text, 'email', 'owner@billease.test'), NOW(), NOW(), NOW());
  END IF;

  -- ---------- Admin ----------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@billease.test') THEN
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'admin@billease.test', crypt('Admin@123', gen_salt('bf')), NOW(),
       '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW())
    RETURNING id INTO u;
    INSERT INTO auth.identities
      (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES
      (gen_random_uuid(), u, u::text, 'email',
       json_build_object('sub', u::text, 'email', 'admin@billease.test'), NOW(), NOW(), NOW());
  END IF;

  -- ---------- Staff ----------
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'staff@billease.test') THEN
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'staff@billease.test', crypt('Staff@123', gen_salt('bf')), NOW(),
       '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW())
    RETURNING id INTO u;
    INSERT INTO auth.identities
      (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES
      (gen_random_uuid(), u, u::text, 'email',
       json_build_object('sub', u::text, 'email', 'staff@billease.test'), NOW(), NOW(), NOW());
  END IF;

  RAISE NOTICE 'Test users ready: owner@billease.test, admin@billease.test, staff@billease.test';
END $$;
