-- ============================================================
-- Fix: "Database error saving new user" (500 on signup)
--
-- APPLIED 2026-08-14 via Supabase Management API.
--
-- Cause: this Supabase project is shared across multiple apps.
-- The society-management app's `on_auth_user_created` trigger on
-- auth.users calls handle_new_user(), which INSERTs into the shared
-- `public.profiles` table. Inside GoTrue's transaction that INSERT
-- was failing, so EVERY new signup (any app) returned error 500
-- "Database error saving new user".
--
-- Fix: rewrote handle_new_user() to be fail-open and safe:
--   * SET search_path = public + fully-qualified public.profiles
--   * ON CONFLICT (user_id) DO NOTHING
--   * EXCEPTION WHEN OTHERS THEN NULL  -> a broken app schema can
--     never block auth again.
-- GarShop writes gs_profiles itself after login, so it never
-- depends on this trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, role, flat_number, wing, ownership, occupation, phone, alternate_phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'resident'),
      NEW.raw_user_meta_data->>'flat_number',
      NEW.raw_user_meta_data->>'wing',
      COALESCE(NEW.raw_user_meta_data->>'ownership', 'owner'),
      NEW.raw_user_meta_data->>'occupation',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'alternate_phone'
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

-- Trigger name unchanged (already exists on auth.users).
-- Re-run only if the trigger was dropped:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();
