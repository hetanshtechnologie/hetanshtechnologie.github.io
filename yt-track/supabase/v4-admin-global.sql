-- v4: global admin — admins (role='admin') can see & manage every user/link across ALL tenants.

-- ---------- 1. RLS: admins bypass tenant scoping ----------
CREATE OR REPLACE FUNCTION public.check_user_other(tid UUID, uid UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT uid = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users c WHERE c.id = uid AND c.parent_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.users m WHERE m.id = auth.uid() AND m.parent_id = uid)
      OR public.is_tenant_admin();
$$;

CREATE OR REPLACE FUNCTION public.check_user_visible(tid UUID, uid UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (uid = auth.uid())
      OR public.is_tenant_admin();
$$;

DROP POLICY IF EXISTS "users_select_own_tenant" ON public.users;
CREATE POLICY "users_select_own_tenant" ON public.users
  FOR SELECT USING (public.check_user_other(tenant_id, id));

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.is_tenant_admin() AND id <> auth.uid())
  WITH CHECK (public.is_tenant_admin() AND id <> auth.uid());

DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE USING (public.is_tenant_admin() AND id <> auth.uid());

-- links: admin sees/edits/deletes all links (non-admins keep tenant + ownership scoping)
DROP POLICY IF EXISTS "links_select_scoped" ON public.links;
CREATE POLICY "links_select_scoped" ON public.links
  FOR SELECT USING (
    (public.is_tenant_admin())
    OR (tenant_id = public.current_tenant_id() AND user_id = auth.uid())
    OR (user_id IN (SELECT parent_id FROM public.users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "links_update_scoped" ON public.links;
CREATE POLICY "links_update_scoped" ON public.links
  FOR UPDATE USING (
    (public.is_tenant_admin())
    OR (tenant_id = public.current_tenant_id() AND user_id = auth.uid())
  )
  WITH CHECK (
    (public.is_tenant_admin() OR (tenant_id = public.current_tenant_id() AND user_id = auth.uid()))
    AND ((category_id IS NULL) OR (EXISTS (
      SELECT 1 FROM public.categories c WHERE c.id = links.category_id AND c.tenant_id = links.tenant_id
    )))
  );

DROP POLICY IF EXISTS "links_delete_scoped" ON public.links;
CREATE POLICY "links_delete_scoped" ON public.links
  FOR DELETE USING (
    (public.is_tenant_admin())
    OR (tenant_id = public.current_tenant_id() AND user_id = auth.uid())
  );

-- categories: admins read all; writes restricted to content managers across tenants
DROP POLICY IF EXISTS "categories_select_tenant" ON public.categories;
CREATE POLICY "categories_select_tenant" ON public.categories
  FOR SELECT USING (tenant_id = public.current_tenant_id() OR public.is_tenant_admin());

DROP POLICY IF EXISTS "categories_insert_tenant" ON public.categories;
CREATE POLICY "categories_insert_tenant" ON public.categories
  FOR INSERT WITH CHECK (
    public.can_manage_content()
    AND (tenant_id = public.current_tenant_id() OR public.is_tenant_admin())
    AND ((parent_id IS NULL) OR (EXISTS (
      SELECT 1 FROM public.categories c WHERE c.id = categories.parent_id AND c.tenant_id = categories.tenant_id
    )))
  );

DROP POLICY IF EXISTS "categories_update_tenant" ON public.categories;
CREATE POLICY "categories_update_tenant" ON public.categories
  FOR UPDATE USING (
    public.can_manage_content()
    AND (tenant_id = public.current_tenant_id() OR public.is_tenant_admin())
  )
  WITH CHECK (
    public.can_manage_content()
    AND (tenant_id = public.current_tenant_id() OR public.is_tenant_admin())
    AND ((parent_id IS NULL) OR (EXISTS (
      SELECT 1 FROM public.categories c WHERE c.id = categories.parent_id AND c.tenant_id = categories.tenant_id
    )))
  );

DROP POLICY IF EXISTS "categories_delete_tenant" ON public.categories;
CREATE POLICY "categories_delete_tenant" ON public.categories
  FOR DELETE USING (
    public.can_manage_content()
    AND (tenant_id = public.current_tenant_id() OR public.is_tenant_admin())
  );

-- children: admins read all
DROP POLICY IF EXISTS "children_select_scoped" ON public.children;
CREATE POLICY "children_select_scoped" ON public.children
  FOR SELECT USING (
    (public.is_tenant_admin())
    OR (tenant_id = public.current_tenant_id() AND parent_id = auth.uid())
  );

-- ---------- 2. RPCs: admin helpers (SECURITY DEFINER) ----------
CREATE OR REPLACE FUNCTION public.admin_list_children()
RETURNS TABLE(id UUID, parent_id UUID, parent_email TEXT, name TEXT, email TEXT, pin TEXT, status TEXT,
              child_user_id UUID, child_email TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_tenant_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  RETURN QUERY
  SELECT c.id, c.parent_id, pr.email AS parent_email, c.name, c.email, c.pin, c.status,
         u.id AS child_user_id, u.email AS child_email, c.created_at
  FROM public.children c
  JOIN public.users pr ON pr.id = c.parent_id
  LEFT JOIN public.users u ON lower(u.email) = lower(c.email) AND u.parent_id = c.parent_id AND u.role = 'child'
  ORDER BY c.created_at;
END;
$$;

-- Set role / re-parent / set plan for any (non-admin) user.
CREATE OR REPLACE FUNCTION public.admin_set_user(
  p_user_id UUID,
  p_role TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_plan TEXT DEFAULT NULL,
  p_plan_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target public.users%ROWTYPE;
  v_parent public.users%ROWTYPE;
BEGIN
  IF NOT public.is_tenant_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  SELECT * INTO v_target FROM public.users WHERE id = p_user_id;
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF v_target.role = 'admin' OR v_target.id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify an admin user';
  END IF;

  -- Re-parent / convert to a child of p_parent_id
  IF p_parent_id IS NOT NULL THEN
    SELECT * INTO v_parent FROM public.users WHERE id = p_parent_id;
    IF v_parent IS NULL THEN
      RAISE EXCEPTION 'Parent not found';
    END IF;
    IF v_parent.role IN ('child', 'admin') THEN
      RAISE EXCEPTION 'Target user is not a parent';
    END IF;

    UPDATE public.users
    SET role = 'child'::public.user_role, parent_id = v_parent.id, tenant_id = v_parent.tenant_id
    WHERE id = p_user_id;

    IF EXISTS (SELECT 1 FROM public.children WHERE parent_id = v_parent.id AND lower(email) = lower(v_target.email)) THEN
      UPDATE public.children SET status = 'active' WHERE parent_id = v_parent.id AND lower(email) = lower(v_target.email);
    ELSE
      INSERT INTO public.children (parent_id, tenant_id, name, email, pin, status)
      VALUES (v_parent.id, v_parent.tenant_id, split_part(v_target.email, '@', 1), lower(v_target.email), '0000', 'active');
    END IF;
  END IF;

  -- Convert back to a parent (unlink)
  IF p_role = 'parent' THEN
    DELETE FROM public.link_progress lp
    WHERE lp.child_id = p_user_id;
    UPDATE public.users SET role = 'parent'::public.user_role, parent_id = NULL WHERE id = p_user_id;
  END IF;

  -- Plan (parents) + create_child-time profile stays intact
  IF p_plan IS NOT NULL THEN
    UPDATE public.users SET plan = p_plan, plan_expires_at = p_plan_expires_at WHERE id = p_user_id;
  END IF;
END;
$$;

-- Hard-delete any (non-admin) user; children are unlinked to parents first.
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target public.users%ROWTYPE;
BEGIN
  IF NOT public.is_tenant_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User is required';
  END IF;

  SELECT * INTO v_target FROM public.users WHERE id = p_user_id;
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF v_target.role = 'admin' OR v_target.id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete an admin user';
  END IF;

  -- If this user is a child, remove their invite row so it does not linger
  IF v_target.role = 'child' THEN
    DELETE FROM public.children c WHERE c.parent_id = v_target.parent_id AND lower(c.email) = lower(v_target.email);
  END IF;

  -- Any children linked to this user become independent parents again
  UPDATE public.users SET role = 'parent'::public.user_role, parent_id = NULL
  WHERE parent_id = p_user_id AND role = 'child'::public.user_role;

  DELETE FROM public.users WHERE id = p_user_id;  -- cascades links/children/progress/purchases
END;
$$;

-- ---------- 3. Grants ----------
GRANT EXECUTE ON FUNCTION public.admin_list_children() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user(UUID, TEXT, UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;