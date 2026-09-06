-- ============================================================
-- GarShop - Admin: create a new user account
-- Admin can register a brand-new user (any role) directly from
-- the admin console. Creates the confirmed auth.users row plus
-- the gs_profiles row with the chosen role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.gs_admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT '',
  p_phone TEXT DEFAULT '',
  p_role TEXT DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.gs_is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;
  IF p_role NOT IN ('user', 'owner', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(btrim(p_email))) THEN
    RAISE EXCEPTION 'An account with this email already exists';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, recovery_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    is_sso_user, created_at, updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    lower(btrim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    '', '', '', '',
    FALSE, NOW(), NOW()
  )
  RETURNING id INTO v_id;

  INSERT INTO gs_profiles (user_id, full_name, phone, role)
  VALUES (v_id, p_full_name, p_phone, p_role);

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gs_admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
