-- =============================================================
-- v3 — Parent/child roles, plans (Razorpay), per-child progress
--
-- - users.role gains 'parent' and 'child' (existing 'user' -> 'parent')
-- - parents add links, manage child accounts, buy plans
-- - children watch ONLY their parent's links, with their own
--   watched progress (link_progress table)
-- - plans (free/bronze/silver/gold) enforced by a DB trigger
--   (free = 5 links, others per plans table, 30-day expiry)
-- =============================================================

-- ---------- Roles ----------
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent' AFTER 'user';
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'child' AFTER 'parent';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.users SET role = 'parent'::public.user_role WHERE role = 'user'::public.user_role;

-- Super-admin stays admin; everyone else becomes a parent on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t_id UUID;
  tenant_name TEXT;
BEGIN
  tenant_name := COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'Tenant') || ' [' || left(NEW.id::text, 8) || ']';
  INSERT INTO public.tenants (name) VALUES (tenant_name) RETURNING id INTO t_id;
  INSERT INTO public.users (id, tenant_id, email, role)
  VALUES (
    NEW.id,
    t_id,
    NEW.email,
    CASE WHEN NEW.email = 'hetanshtechnologie@gmail.com' THEN 'admin'::public.user_role ELSE 'parent'::public.user_role END
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_profile() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id      UUID := auth.uid();
  v_email   TEXT;
  v_tenant  UUID;
BEGIN
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_id) THEN
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_id;

  INSERT INTO public.tenants (name)
  VALUES (
    COALESCE(NULLIF(split_part(COALESCE(v_email, 'Tenant'), '@', 1), ''), 'Tenant') || ' [' || left(v_id::text, 8) || ']'
  )
  RETURNING id INTO v_tenant;

  INSERT INTO public.users (id, tenant_id, email, role)
  VALUES (
    v_id, v_tenant, v_email,
    CASE WHEN v_email = 'hetanshtechnologie@gmail.com' THEN 'admin'::public.user_role ELSE 'parent'::public.user_role END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- ---------- Parent link & plan columns on users ----------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','bronze','silver','gold')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_payment_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_parent ON public.users(parent_id);

-- Admins may also push/revoke plans and manually detach a child's link.
GRANT UPDATE (plan, plan_expires_at) ON public.users TO authenticated;

-- ---------- Plan catalog ----------
CREATE TABLE IF NOT EXISTS public.yt_plans (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  price         INTEGER NOT NULL DEFAULT 0,    -- paise (INR)
  max_videos    INTEGER NOT NULL DEFAULT 5,
  max_children  INTEGER NOT NULL DEFAULT 1,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.yt_plans (name, price, max_videos, max_children) VALUES
  ('free',   0,      5,          1),
  ('bronze', 19900,  50,         3),
  ('silver', 49900,  200,        10),
  ('gold',   99900,  999999,     999999)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  max_videos = EXCLUDED.max_videos,
  max_children = EXCLUDED.max_children,
  active = TRUE;

GRANT SELECT ON public.yt_plans TO authenticated;

-- ---------- Plan purchases (receipt log) ----------
CREATE TABLE IF NOT EXISTS public.plan_purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id             INTEGER NOT NULL REFERENCES public.yt_plans(id),
  amount              INTEGER NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'paid',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.plan_purchases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_plan_purchases_user ON public.plan_purchases(user_id);

DROP POLICY IF EXISTS "pp_select_own" ON public.plan_purchases;
CREATE POLICY "pp_select_own" ON public.plan_purchases
  FOR SELECT USING (
    user_id = auth.uid()
    OR (public.is_tenant_admin() AND
        user_id IN (SELECT id FROM public.users WHERE tenant_id = public.current_tenant_id()))
  );

GRANT SELECT ON public.plan_purchases TO authenticated;

-- ---------- Children (parent invitation to link an account) ----------
CREATE TABLE IF NOT EXISTS public.children (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (name <> ''),
  email      TEXT NOT NULL,
  pin        TEXT NOT NULL CHECK (pin ~ '^[0-9]{4}$'),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, email)
);
CREATE INDEX IF NOT EXISTS idx_children_parent ON public.children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_email ON public.children(lower(email));

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Parent sees their own invites; admins see the tenant's.
DROP POLICY IF EXISTS "children_select_scoped" ON public.children;
CREATE POLICY "children_select_scoped" ON public.children
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (parent_id = auth.uid() OR public.is_tenant_admin())
  );

GRANT SELECT ON public.children TO authenticated;

-- ---------- Per-child watched progress ----------
CREATE TABLE IF NOT EXISTS public.link_progress (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id    UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  child_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  watched    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_link ON public.link_progress(link_id);
CREATE INDEX IF NOT EXISTS idx_progress_child ON public.link_progress(child_id);

ALTER TABLE public.link_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_select_scoped" ON public.link_progress;
CREATE POLICY "progress_select_scoped" ON public.link_progress
  FOR SELECT USING (
    child_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.links l
      WHERE l.id = link_progress.link_id
        AND (l.user_id = auth.uid()
             OR (public.is_tenant_admin() AND l.tenant_id = public.current_tenant_id()))
    )
  );

DROP POLICY IF EXISTS "progress_write_own" ON public.link_progress;
CREATE POLICY "progress_write_own" ON public.link_progress
  FOR INSERT WITH CHECK (child_id = auth.uid());

DROP POLICY IF EXISTS "progress_update_own" ON public.link_progress;
CREATE POLICY "progress_update_own" ON public.link_progress
  FOR UPDATE USING (child_id = auth.uid()) WITH CHECK (child_id = auth.uid());

DROP POLICY IF EXISTS "progress_delete_own" ON public.link_progress;
CREATE POLICY "progress_delete_own" ON public.link_progress
  FOR DELETE USING (child_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_progress TO authenticated;

-- ---------- Role helpers ----------

-- Parents and admins manage links/categories/children; children are read-only.
CREATE OR REPLACE FUNCTION public.can_manage_content() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role IN ('parent', 'admin') FROM public.users WHERE id = auth.uid()), FALSE);
$$;

-- Effective plan (falls back to 'free' once expired or never active).
CREATE OR REPLACE FUNCTION public.effective_plan_name(p_uid UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN u.plan IS NOT NULL AND u.plan <> 'free'
         AND u.plan_expires_at IS NOT NULL AND u.plan_expires_at >= NOW()
    THEN u.plan ELSE 'free' END
  FROM public.users u WHERE u.id = p_uid;
$$;

-- Effective video + child limits for a user.
CREATE OR REPLACE FUNCTION public.plan_limits(p_uid UUID)
RETURNS TABLE(videos INTEGER, kids INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(pl.max_videos, 5), COALESCE(pl.max_children, 1)
  FROM public.users u
  LEFT JOIN public.yt_plans pl ON pl.name = public.effective_plan_name(u.id)
  WHERE u.id = p_uid;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_content() TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_plan_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_limits(UUID) TO authenticated;

-- ---------- Links: children can read their parent's links ----------
DROP POLICY IF EXISTS "links_select_scoped" ON public.links;
CREATE POLICY "links_select_scoped" ON public.links
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      user_id = auth.uid()
      OR public.is_tenant_admin()
      OR user_id IN (SELECT parent_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "links_insert_own" ON public.links;
CREATE POLICY "links_insert_own" ON public.links
  FOR INSERT WITH CHECK (
    public.can_manage_content()
    AND tenant_id = public.current_tenant_id()
    AND user_id = auth.uid()
    AND (
      category_id IS NULL
      OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = public.links.category_id AND c.tenant_id = public.links.tenant_id)
    )
  );

-- ---------- Categories: parents & admins manage, children read-only ----------
DROP POLICY IF EXISTS "categories_insert_tenant" ON public.categories;
CREATE POLICY "categories_insert_tenant" ON public.categories
  FOR INSERT WITH CHECK (
    public.can_manage_content()
    AND tenant_id = public.current_tenant_id()
    AND (
      parent_id IS NULL
      OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = public.categories.parent_id AND c.tenant_id = public.categories.tenant_id)
    )
  );

DROP POLICY IF EXISTS "categories_update_tenant" ON public.categories;
CREATE POLICY "categories_update_tenant" ON public.categories
  FOR UPDATE USING (
    public.can_manage_content()
    AND tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    public.can_manage_content()
    AND tenant_id = public.current_tenant_id()
    AND (
      parent_id IS NULL
      OR EXISTS (SELECT 1 FROM public.categories c WHERE c.id = public.categories.parent_id AND c.tenant_id = public.categories.tenant_id)
    )
  );

DROP POLICY IF EXISTS "categories_delete_tenant" ON public.categories;
CREATE POLICY "categories_delete_tenant" ON public.categories
  FOR DELETE USING (
    public.can_manage_content()
    AND tenant_id = public.current_tenant_id()
  );

-- ---------- Users: own / parent-child / admin visibility ----------
CREATE OR REPLACE FUNCTION public.check_user_other(tid UUID, uid UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT uid = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users c WHERE c.id = uid AND c.parent_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.users m WHERE m.id = auth.uid() AND m.parent_id = uid)
      OR (public.is_tenant_admin() AND tid = public.current_tenant_id());
$$;

DROP POLICY IF EXISTS "users_select_own_tenant" ON public.users;
CREATE POLICY "users_select_own_tenant" ON public.users
  FOR SELECT USING (public.check_user_other(tenant_id, id));

-- Admins may delete users (cascades links/children/progress).
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (
    public.is_tenant_admin()
    AND tenant_id = public.current_tenant_id()
    AND id <> auth.uid()
  );
GRANT DELETE ON public.users TO authenticated;

-- ---------- Enforce plan video limit + block child inserts (server-side) ----------
CREATE OR REPLACE FUNCTION public.enforce_link_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.role = 'child'::public.user_role) THEN
    RAISE EXCEPTION 'Children cannot add links.';
  END IF;

  SELECT COALESCE(l.videos, 5) INTO v_limit FROM public.plan_limits(NEW.user_id) l;
  SELECT count(*) INTO v_count FROM public.links WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Plan limit reached: %, % of % videos allowed. Upgrade your plan to add more.', v_count, v_limit, v_limit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_link_insert ON public.links;
CREATE TRIGGER trg_enforce_link_insert
  BEFORE INSERT ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_link_insert();

-- ---------- RPC: create child invite (parent or admin) ----------
CREATE OR REPLACE FUNCTION public.create_child(p_parent_id UUID, p_name TEXT, p_email TEXT, p_pin TEXT)
RETURNS public.children
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_parent   public.users%ROWTYPE;
  v_limit    INTEGER;
  v_count    INTEGER;
  v_child    public.children;
BEGIN
  SELECT public.is_tenant_admin() INTO v_is_admin;
  IF NOT v_is_admin AND p_parent_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only add children to your own account.';
  END IF;

  SELECT * INTO v_parent FROM public.users WHERE id = p_parent_id;
  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Parent not found.';
  END IF;
  IF NOT v_is_admin AND v_parent.tenant_id <> public.current_tenant_id() THEN
    RAISE EXCEPTION 'Parent is not in your workspace.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Child name is required.';
  END IF;
  IF p_email IS NULL OR position('@' in p_email) = 0 THEN
    RAISE EXCEPTION 'Enter a valid child email.';
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits.';
  END IF;

  SELECT COALESCE(l.kids, 1) INTO v_limit FROM public.plan_limits(v_parent.id) l;
  SELECT count(*) INTO v_count FROM public.children WHERE parent_id = v_parent.id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Child limit reached: % of % allowed by your plan.', v_count, v_limit;
  END IF;

  INSERT INTO public.children (parent_id, tenant_id, name, email, pin)
  VALUES (v_parent.id, v_parent.tenant_id, btrim(p_name), btrim(lower(p_email)), p_pin)
  RETURNING * INTO v_child;

  RETURN v_child;
END;
$$;

-- ---------- RPC: list children (own or tenant-wide for admin) ----------
CREATE OR REPLACE FUNCTION public.list_children(p_parent_id UUID DEFAULT NULL)
RETURNS TABLE(id UUID, parent_id UUID, name TEXT, email TEXT, pin TEXT, status TEXT,
              child_user_id UUID, child_email TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  SELECT public.is_tenant_admin() INTO v_is_admin;
  IF NOT v_is_admin AND p_parent_id IS NOT NULL AND p_parent_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only list your own children.';
  END IF;

  RETURN QUERY
  SELECT c.id, c.parent_id, c.name, c.email, c.pin, c.status,
         u.id AS child_user_id, u.email AS child_email, c.created_at
  FROM public.children c
  LEFT JOIN public.users u
         ON lower(u.email) = lower(c.email)
        AND u.parent_id = c.parent_id
        AND u.role = 'child'::public.user_role
  WHERE c.tenant_id = public.current_tenant_id()
    AND (v_is_admin OR c.parent_id = v_uid OR (p_parent_id IS NOT NULL AND c.parent_id = p_parent_id))
  ORDER BY c.created_at;
END;
$$;

-- ---------- RPC: update child invite (rename / change email / reset PIN) ----------
CREATE OR REPLACE FUNCTION public.update_child(p_child_id UUID, p_name TEXT, p_email TEXT, p_pin TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_child    public.children%ROWTYPE;
BEGIN
  SELECT public.is_tenant_admin() INTO v_is_admin;
  SELECT * INTO v_child FROM public.children WHERE id = p_child_id;
  IF v_child IS NULL THEN
    RAISE EXCEPTION 'Child not found.';
  END IF;
  IF NOT v_is_admin AND v_child.parent_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only edit your own children.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Child name is required.';
  END IF;
  IF p_email IS NULL OR position('@' in p_email) = 0 THEN
    RAISE EXCEPTION 'Enter a valid child email.';
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits.';
  END IF;

  IF v_child.status = 'active'
     AND lower(v_child.email) <> lower(p_email) THEN
    -- email changed: detach the previously linked account so the new owner can link
    UPDATE public.users
    SET parent_id = NULL, role = 'parent'::public.user_role
    WHERE parent_id = v_child.parent_id AND lower(email) = lower(v_child.email);
    DELETE FROM public.link_progress lp
    WHERE lp.child_id IN (
      SELECT id FROM public.users
      WHERE parent_id = v_child.parent_id AND lower(email) = lower(v_child.email)
    );
  END IF;

  UPDATE public.children
  SET name = btrim(p_name),
      email = btrim(lower(p_email)),
      pin = p_pin,
      status = CASE WHEN v_child.status = 'active' AND lower(v_child.email) <> lower(p_email)
                    THEN 'pending' ELSE v_child.status END
  WHERE id = p_child_id;
END;
$$;

-- ---------- RPC: remove child (unlink + detach account) ----------
CREATE OR REPLACE FUNCTION public.unlink_child(p_child_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_child    public.children%ROWTYPE;
BEGIN
  SELECT public.is_tenant_admin() INTO v_is_admin;
  SELECT * INTO v_child FROM public.children WHERE id = p_child_id;
  IF v_child IS NULL THEN
    RAISE EXCEPTION 'Child not found.';
  END IF;
  IF NOT v_is_admin AND v_child.parent_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'You can only remove your own children.';
  END IF;

  DELETE FROM public.link_progress lp
  WHERE lp.child_id IN (
    SELECT id FROM public.users
    WHERE parent_id = v_child.parent_id AND lower(email) = lower(v_child.email)
  );

  UPDATE public.users
  SET parent_id = NULL, role = 'parent'::public.user_role
  WHERE parent_id = v_child.parent_id AND lower(email) = lower(v_child.email);

  DELETE FROM public.children WHERE id = p_child_id;
END;
$$;

-- ---------- RPC: a child links their own Google account to a parent ----------
CREATE OR REPLACE FUNCTION public.link_child(p_email TEXT, p_pin TEXT)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_email    TEXT;
  v_is_admin BOOLEAN;
  v_child    public.children%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT public.is_tenant_admin() INTO v_is_admin;

  SELECT * INTO v_child
  FROM public.children
  WHERE lower(email) = lower(COALESCE(NULLIF(btrim(p_email), ''), v_email))
    AND pin = p_pin
  LIMIT 1;

  IF v_child IS NULL THEN
    RAISE EXCEPTION 'Invalid email or PIN. Ask your parent for the correct code.';
  END IF;
  IF v_is_admin AND v_uid = v_child.parent_id THEN
    RAISE EXCEPTION 'Cannot link a parent account to itself.';
  END IF;

  UPDATE public.users
  SET parent_id = v_child.parent_id,
      tenant_id = v_child.tenant_id,
      role = 'child'::public.user_role
  WHERE id = v_uid;

  UPDATE public.children SET status = 'active' WHERE id = v_child.id;

  RETURN TRUE;
END;
$$;

-- ---------- RPC grants ----------
GRANT EXECUTE ON FUNCTION public.create_child(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_children(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_child(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_child(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_child(TEXT, TEXT) TO authenticated;