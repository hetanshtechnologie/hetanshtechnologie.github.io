-- ============================================================
-- GarShop - Keep user checklists in sync with the services catalog
--  1. Links each checklist item to the catalog service it came from.
--  2. When an owner adds a service to the catalog, it is appended to
--     every open (pending / in_progress) checklist of that garage.
--  3. When an owner renames a service, linked checklist items are renamed.
--  4. gs_submit_checklist() now stores the service_id from each item.
-- ============================================================

-- Link checklist items to catalog services
ALTER TABLE gs_checklist_items
  ADD COLUMN IF NOT EXISTS service_id BIGINT REFERENCES gs_garage_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gs_checklist_items_service ON gs_checklist_items(service_id);

-- Trigger: sync catalog changes into open checklists
CREATE OR REPLACE FUNCTION public.gs_sync_service_to_checklists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO gs_checklist_items (checklist_id, item, user_checked, service_id)
    SELECT c.id, NEW.name, FALSE, NEW.id
    FROM gs_checklists c
    WHERE c.garage_id = NEW.garage_id
      AND c.status IN ('pending', 'in_progress')
      AND NOT EXISTS (
        SELECT 1 FROM gs_checklist_items ci
        WHERE ci.checklist_id = c.id AND ci.service_id = NEW.id
      );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE gs_checklist_items SET item = NEW.name
    WHERE service_id = NEW.id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gs_sync_service_to_checklists ON gs_garage_services;
CREATE TRIGGER trg_gs_sync_service_to_checklists
  AFTER INSERT OR UPDATE OF name ON gs_garage_services
  FOR EACH ROW EXECUTE FUNCTION public.gs_sync_service_to_checklists();

-- gs_submit_checklist: accept an optional service_id per item
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
    INSERT INTO gs_checklist_items (checklist_id, item, user_checked, service_id)
    VALUES (v_id,
            COALESCE(NULLIF(v_item->>'item', ''), 'Item'),
            COALESCE((v_item->>'checked')::boolean, FALSE),
            NULLIF(v_item->>'service_id', '')::bigint);
  END LOOP;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.gs_submit_checklist(BIGINT, BIGINT, TEXT, JSONB, TEXT) TO authenticated;
