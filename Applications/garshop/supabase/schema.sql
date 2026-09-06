-- ============================================================
-- GarShop - Multi-tenant Garage Shop Platform Schema
-- Roles: admin (web), garage owner, garage user
-- All tables prefixed gs_ to avoid clashes in shared project
-- ============================================================

-- ======= Profiles (roles: admin / owner / user) =======
CREATE TABLE IF NOT EXISTS gs_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'owner', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_profiles_role ON gs_profiles(role);

-- ---------- Helper functions ----------
CREATE OR REPLACE FUNCTION public.gs_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gs_profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.gs_is_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.gs_is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gs_profiles WHERE user_id = auth.uid() AND role = 'owner'
  );
$$;
GRANT EXECUTE ON FUNCTION public.gs_is_owner() TO anon, authenticated;

ALTER TABLE gs_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read own or admin" ON gs_profiles FOR SELECT USING (
  user_id = auth.uid() OR public.gs_is_admin()
);
CREATE POLICY "profiles insert own" ON gs_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles update own or admin" ON gs_profiles FOR UPDATE USING (
  user_id = auth.uid() OR public.gs_is_admin()
);
CREATE POLICY "profiles admin delete" ON gs_profiles FOR DELETE USING (public.gs_is_admin());

-- ======= Garages =======
CREATE TABLE IF NOT EXISTS gs_garages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  description TEXT DEFAULT '',
  services_offered TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'deleted')),
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_garages_owner ON gs_garages(owner_id);
CREATE INDEX IF NOT EXISTS idx_gs_garages_status ON gs_garages(status);
ALTER TABLE gs_garages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "garages view approved or own" ON gs_garages FOR SELECT USING (
  status = 'approved' OR owner_id = auth.uid() OR public.gs_is_admin()
);
CREATE POLICY "garages owner insert" ON gs_garages FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);
CREATE POLICY "garages owner or admin update" ON gs_garages FOR UPDATE USING (
  owner_id = auth.uid() OR public.gs_is_admin()
);
CREATE POLICY "garages admin delete" ON gs_garages FOR DELETE USING (public.gs_is_admin());

-- Public garage pages (garage.html) read approved garages with the anon key.
GRANT SELECT ON gs_garages TO anon;

-- ======= Garage <-> User binding =======
-- A user who installs the app from a garage's public page is "bound" to that
-- garage: they may only submit issues / book appointments to that garage.
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

-- ======= Garage services catalog =======
CREATE TABLE IF NOT EXISTS gs_garage_services (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  garage_id BIGINT NOT NULL REFERENCES gs_garages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(12,2) DEFAULT 0,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'engine', 'brakes', 'battery', 'ac', 'tyres', 'body')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_services_garage ON gs_garage_services(garage_id);
ALTER TABLE gs_garage_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services view approved garages" ON gs_garage_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_garage_services.garage_id AND status = 'approved')
  OR public.gs_is_admin()
);
CREATE POLICY "services owner manage" ON gs_garage_services FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_garage_services.garage_id AND owner_id = auth.uid())
  OR public.gs_is_admin()
);

-- ======= Cars =======
CREATE TABLE IF NOT EXISTS gs_cars (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_cars_user ON gs_cars(user_id);
ALTER TABLE gs_cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cars user own" ON gs_cars FOR ALL USING (
  user_id = auth.uid() OR public.gs_is_admin()
);

-- ======= Car components (inventory per car) =======
CREATE TABLE IF NOT EXISTS gs_car_components (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  car_id BIGINT NOT NULL REFERENCES gs_cars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'needs_replace', 'replaced')),
  last_replaced_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_components_car ON gs_car_components(car_id);
ALTER TABLE gs_car_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "components via owner" ON gs_car_components FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_cars WHERE id = gs_car_components.car_id AND user_id = auth.uid())
  OR public.gs_is_admin()
);

-- ======= Issues (user car problems) =======
CREATE TABLE IF NOT EXISTS gs_issues (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id BIGINT NOT NULL REFERENCES gs_cars(id) ON DELETE CASCADE,
  garage_id BIGINT REFERENCES gs_garages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  voice_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_issues_user ON gs_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_gs_issues_garage ON gs_issues(garage_id);
CREATE INDEX IF NOT EXISTS idx_gs_issues_status ON gs_issues(status);
ALTER TABLE gs_issues ENABLE ROW LEVEL SECURITY;
-- Bound users may only submit issues to their bound garage (see gs_garage_users).
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
CREATE POLICY "issues garage owner manage" ON gs_issues FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_issues.garage_id AND owner_id = auth.uid())
  OR public.gs_is_admin()
);

-- ======= Appointments =======
CREATE TABLE IF NOT EXISTS gs_appointments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garage_id BIGINT NOT NULL REFERENCES gs_garages(id) ON DELETE CASCADE,
  car_id BIGINT NOT NULL REFERENCES gs_cars(id) ON DELETE CASCADE,
  service_id BIGINT REFERENCES gs_garage_services(id) ON DELETE SET NULL,
  issue_id BIGINT REFERENCES gs_issues(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_appt_user ON gs_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_gs_appt_garage ON gs_appointments(garage_id);
ALTER TABLE gs_appointments ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "appointments garage owner" ON gs_appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_appointments.garage_id AND owner_id = auth.uid())
  OR public.gs_is_admin()
);

-- ======= Service checklists (user ticks items, owner fixes them) =======
CREATE TABLE IF NOT EXISTS gs_checklists (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id BIGINT REFERENCES gs_cars(id) ON DELETE SET NULL,
  garage_id BIGINT REFERENCES gs_garages(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Service Checklist',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_checklists_user ON gs_checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_gs_checklists_garage ON gs_checklists(garage_id);
CREATE TABLE IF NOT EXISTS gs_checklist_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checklist_id BIGINT NOT NULL REFERENCES gs_checklists(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  user_checked BOOLEAN NOT NULL DEFAULT FALSE,
  owner_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  fixed_note TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_gs_checklist_items_checklist ON gs_checklist_items(checklist_id);
ALTER TABLE gs_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklists user select" ON gs_checklists FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "checklists user update" ON gs_checklists FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "checklists user delete" ON gs_checklists FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "checklists user insert" ON gs_checklists FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND (
    garage_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM gs_garage_users gu WHERE gu.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM gs_garage_users gu WHERE gu.user_id = auth.uid() AND gu.garage_id = gs_checklists.garage_id)
  )
);
CREATE POLICY "checklists owner manage" ON gs_checklists FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_checklists.garage_id AND owner_id = auth.uid())
  OR public.gs_is_admin()
);
ALTER TABLE gs_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_items user via checklist" ON gs_checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_checklists WHERE id = gs_checklist_items.checklist_id AND user_id = auth.uid())
);
CREATE POLICY "checklist_items owner via checklist" ON gs_checklist_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM gs_checklists c JOIN gs_garages g ON g.id = c.garage_id
    WHERE c.id = gs_checklist_items.checklist_id AND g.owner_id = auth.uid()
  )
  OR public.gs_is_admin()
);

-- User app submits a checklist atomically (enforces garage binding like issues)
CREATE OR REPLACE FUNCTION public.gs_submit_checklist(
  p_garage_id BIGINT,
  p_car_id BIGINT,
  p_title TEXT DEFAULT 'Service Checklist',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_notes TEXT DEFAULT ''
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_item JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_garage_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM gs_garage_users WHERE user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM gs_garage_users WHERE user_id = auth.uid() AND garage_id = p_garage_id) THEN
    RAISE EXCEPTION 'Not bound to this garage';
  END IF;
  INSERT INTO gs_checklists (user_id, car_id, garage_id, title, notes)
  VALUES (auth.uid(), p_car_id, p_garage_id, p_title, p_notes)
  RETURNING id INTO v_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO gs_checklist_items (checklist_id, item, user_checked)
    VALUES (v_id,
            COALESCE(NULLIF(v_item->>'item', ''), 'Item'),
            COALESCE((v_item->>'checked')::boolean, FALSE));
  END LOOP;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.gs_submit_checklist(BIGINT, BIGINT, TEXT, JSONB, TEXT) TO authenticated;

-- Owner: checklists submitted to one of their garages (with car + user info)
CREATE OR REPLACE FUNCTION public.gs_owner_checklists(p_garage_id BIGINT)
RETURNS TABLE(
  id BIGINT, user_id UUID, user_name TEXT, phone TEXT, car TEXT,
  title TEXT, status TEXT, notes TEXT, created_at TIMESTAMPTZ, items JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.user_id, p.full_name, p.phone,
         CONCAT_WS(' ', k.brand, k.model) AS car,
         c.title, c.status, c.notes, c.created_at,
         COALESCE(jsonb_agg(
           jsonb_build_object('id', ci.id, 'item', ci.item, 'checked', ci.user_checked,
                              'fixed', ci.owner_fixed, 'note', ci.fixed_note)
           ORDER BY ci.id) FILTER (WHERE ci.id IS NOT NULL), '[]'::jsonb) AS items
  FROM gs_checklists c
  LEFT JOIN gs_profiles p ON p.user_id = c.user_id
  LEFT JOIN gs_cars k ON k.id = c.car_id
  LEFT JOIN gs_checklist_items ci ON ci.checklist_id = c.id
  WHERE c.garage_id = p_garage_id
    AND (
      EXISTS (SELECT 1 FROM gs_garages g WHERE g.id = p_garage_id AND g.owner_id = auth.uid())
      OR public.gs_is_admin()
    )
  GROUP BY c.id, p.full_name, p.phone, k.brand, k.model
  ORDER BY c.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.gs_owner_checklists(p_garage_id BIGINT) TO authenticated;

-- ======= Service reminders =======
CREATE TABLE IF NOT EXISTS gs_reminders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garage_id BIGINT REFERENCES gs_garages(id) ON DELETE CASCADE,
  car_id BIGINT REFERENCES gs_cars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_reminders_user ON gs_reminders(user_id);
ALTER TABLE gs_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders user own" ON gs_reminders FOR ALL USING (user_id = auth.uid());
CREATE POLICY "reminders owner create" ON gs_reminders FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_reminders.garage_id AND owner_id = auth.uid())
  OR public.gs_is_admin()
);

-- ======= In-app notifications =======
CREATE TABLE IF NOT EXISTS gs_notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'reminder')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_notif_user ON gs_notifications(user_id);
ALTER TABLE gs_notifications ENABLE ROW LEVEL SECURITY;
-- Insert is allowed for any authenticated user so owners <-> users can notify each other.
CREATE POLICY "notifications insert authenticated" ON gs_notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications user own" ON gs_notifications FOR SELECT USING (user_id = auth.uid() OR public.gs_is_admin());
CREATE POLICY "notifications update own or admin" ON gs_notifications FOR UPDATE USING (user_id = auth.uid() OR public.gs_is_admin());
CREATE POLICY "notifications admin delete" ON gs_notifications FOR DELETE USING (public.gs_is_admin());

-- ======= Garage parts/components inventory =======
CREATE TABLE IF NOT EXISTS gs_inventory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  garage_id BIGINT NOT NULL REFERENCES gs_garages(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'unit',
  min_stock INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gs_inventory_garage ON gs_inventory(garage_id);
ALTER TABLE gs_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory owner manage" ON gs_inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_inventory.garage_id AND owner_id = auth.uid())
  OR public.gs_is_admin()
);

-- ======= Owner can see customers who have issues with their garage =======
CREATE POLICY "profiles read owner's customers" ON gs_profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM gs_issues i JOIN gs_garages g ON g.id = i.garage_id
    WHERE i.user_id = gs_profiles.user_id AND g.owner_id = auth.uid()
  )
);

-- ======= Admin helper: list users with emails (admin only) =======
CREATE OR REPLACE FUNCTION public.gs_admin_users()
RETURNS TABLE(user_id UUID, full_name TEXT, phone TEXT, role TEXT, created_at TIMESTAMPTZ, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.phone, p.role, p.created_at, u.email
  FROM gs_profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE public.gs_is_admin();
$$;
GRANT EXECUTE ON FUNCTION public.gs_admin_users() TO authenticated;

-- ======= Admin: which garage has which users (admin only) =======
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

-- ======= Owner: users bound to one of the owner's garages =======
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

-- ======= Analytics (admin only) =======
CREATE OR REPLACE FUNCTION public.gs_analytics()
RETURNS TABLE(
  total_garages BIGINT, approved_garages BIGINT, pending_garages BIGINT,
  total_users BIGINT, total_owners BIGINT,
  total_appointments BIGINT, pending_appointments BIGINT,
  total_issues BIGINT, issues_in_progress BIGINT, issues_completed BIGINT,
  total_reminders BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM gs_garages),
    (SELECT COUNT(*) FROM gs_garages WHERE status = 'approved'),
    (SELECT COUNT(*) FROM gs_garages WHERE status = 'pending'),
    (SELECT COUNT(*) FROM gs_profiles WHERE role = 'user'),
    (SELECT COUNT(*) FROM gs_profiles WHERE role = 'owner'),
    (SELECT COUNT(*) FROM gs_appointments),
    (SELECT COUNT(*) FROM gs_appointments WHERE status = 'pending'),
    (SELECT COUNT(*) FROM gs_issues),
    (SELECT COUNT(*) FROM gs_issues WHERE status = 'in_progress'),
    (SELECT COUNT(*) FROM gs_issues WHERE status = 'completed'),
    (SELECT COUNT(*) FROM gs_reminders)
  WHERE public.gs_is_admin();
$$;
GRANT EXECUTE ON FUNCTION public.gs_analytics() TO authenticated;

-- ---------- Grants ----------
GRANT ALL ON gs_profiles TO authenticated;
GRANT ALL ON gs_garages TO authenticated;
GRANT ALL ON gs_garage_services TO authenticated;
GRANT ALL ON gs_cars TO authenticated;
GRANT ALL ON gs_car_components TO authenticated;
GRANT ALL ON gs_issues TO authenticated;
GRANT ALL ON gs_appointments TO authenticated;
GRANT ALL ON gs_reminders TO authenticated;
GRANT ALL ON gs_notifications TO authenticated;
GRANT ALL ON gs_inventory TO authenticated;
GRANT ALL ON gs_garage_users TO authenticated;
GRANT ALL ON gs_checklists TO authenticated;
GRANT ALL ON gs_checklist_items TO authenticated;
