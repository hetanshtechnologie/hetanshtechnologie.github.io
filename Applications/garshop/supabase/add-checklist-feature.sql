-- ============================================================
-- GarShop - Service checklist feature
-- Users tick items needing attention on a checklist (bound to their
-- garage) and submit it. The garage owner sees the checklist in the
-- owner dashboard and marks items as fixed, then completes it.
-- ============================================================

-- ======= Checklists (submitted by users) =======
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

-- ======= Checklist items =======
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
-- User: view / edit / delete own checklists; insert enforces garage binding like issues.
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
-- Owner: manage checklists for their garage; admin: all.
CREATE POLICY "checklists owner manage" ON gs_checklists FOR ALL USING (
  EXISTS (SELECT 1 FROM gs_garages WHERE id = gs_checklists.garage_id AND owner_id = auth.uid())
  OR public.gs_is_admin()
);

ALTER TABLE gs_checklist_items ENABLE ROW LEVEL SECURITY;
-- Items follow the checklist's owner (user or garage owner).
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

-- ======= Submit a checklist atomically (used by the Android user app) =======
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
  -- Bound users may only submit to their bound garage (same rule as issues).
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

-- ======= Owner: checklists submitted to one of their garages (with car + user info) =======
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

-- ---------- Grants ----------
GRANT ALL ON gs_checklists TO authenticated;
GRANT ALL ON gs_checklist_items TO authenticated;
