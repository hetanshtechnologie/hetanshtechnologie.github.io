-- ============================================================
-- GarShop - Garage-to-User binding
-- Adds gs_garage_users so a user who downloads the app from a
-- garage's public page is "bound" to that garage. Bound users may
-- only submit issues / book appointments to their bound garage.
-- Admin (and each garage owner) can see which garage has which users.
-- ============================================================

-- ======= Binding table =======
CREATE TABLE IF NOT EXISTS gs_garage_users (
  garage_id BIGINT NOT NULL REFERENCES gs_garages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (garage_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gs_garage_users_user ON gs_garage_users(user_id);
CREATE INDEX IF NOT EXISTS idx_gs_garage_users_garage ON gs_garage_users(garage_id);

ALTER TABLE gs_garage_users ENABLE ROW LEVEL SECURITY;

-- User views / creates / removes their own binding
CREATE POLICY "garage_users user view own" ON gs_garage_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "garage_users user bind self" ON gs_garage_users FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "garage_users user unbind self" ON gs_garage_users FOR DELETE USING (user_id = auth.uid());

-- Garage owner sees / removes users bound to their garage
CREATE POLICY "garage_users owner view own garage" ON gs_garage_users FOR SELECT USING (
  EXISTS (SELECT 1 FROM gs_garages g WHERE g.id = gs_garage_users.garage_id AND g.owner_id = auth.uid())
);
CREATE POLICY "garage_users owner remove bound user" ON gs_garage_users FOR DELETE USING (
  EXISTS (SELECT 1 FROM gs_garages g WHERE g.id = gs_garage_users.garage_id AND g.owner_id = auth.uid())
);

-- Admin sees / manages everything
CREATE POLICY "garage_users admin all" ON gs_garage_users FOR ALL USING (public.gs_is_admin());

GRANT ALL ON gs_garage_users TO authenticated;

-- ======= Enforce binding on issues =======
-- Bound users may only submit issues to their bound garage.
DROP POLICY IF EXISTS "issues user own" ON gs_issues;
CREATE POLICY "issues user select" ON gs_issues FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "issues user update" ON gs_issues FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "issues user delete" ON gs_issues FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "issues user insert" ON gs_issues FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (
    garage_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM gs_garage_users gu WHERE gu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM gs_garage_users gu WHERE gu.user_id = auth.uid() AND gu.garage_id = gs_issues.garage_id)
  )
);

-- ======= Enforce binding on appointments =======
DROP POLICY IF EXISTS "appointments user own" ON gs_appointments;
CREATE POLICY "appointments user select" ON gs_appointments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "appointments user update" ON gs_appointments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "appointments user delete" ON gs_appointments FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "appointments user insert" ON gs_appointments FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (
    NOT EXISTS (SELECT 1 FROM gs_garage_users gu WHERE gu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM gs_garage_users gu WHERE gu.user_id = auth.uid() AND gu.garage_id = gs_appointments.garage_id)
  )
);

-- ======= Admin RPC: which garage has which users =======
CREATE OR REPLACE FUNCTION public.gs_admin_garage_users()
RETURNS TABLE(garage_id BIGINT, garage_name TEXT, user_id UUID, full_name TEXT, phone TEXT, email TEXT, bound_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gu.garage_id, g.name AS garage_name, gu.user_id, p.full_name, p.phone, u.email, gu.bound_at
  FROM gs_garage_users gu
  JOIN gs_garages g ON g.id = gu.garage_id
  LEFT JOIN gs_profiles p ON p.user_id = gu.user_id
  LEFT JOIN auth.users u ON u.id = gu.user_id
  WHERE public.gs_is_admin()
  ORDER BY g.name, p.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.gs_admin_garage_users() TO authenticated;

-- ======= Owner RPC: users bound to one of the owner's garages =======
CREATE OR REPLACE FUNCTION public.gs_owner_garage_users(p_garage_id BIGINT)
RETURNS TABLE(user_id UUID, full_name TEXT, phone TEXT, bound_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gu.user_id, p.full_name, p.phone, gu.bound_at
  FROM gs_garage_users gu
  LEFT JOIN gs_profiles p ON p.user_id = gu.user_id
  WHERE gu.garage_id = p_garage_id
    AND (
      EXISTS (SELECT 1 FROM gs_garages g WHERE g.id = gu.garage_id AND g.owner_id = auth.uid())
      OR public.gs_is_admin()
    )
  ORDER BY p.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.gs_owner_garage_users(p_garage_id BIGINT) TO authenticated;
