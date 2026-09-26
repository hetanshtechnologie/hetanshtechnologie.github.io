-- v5-link-order.sql — manual link ordering (sort_order).
-- Run in the Supabase SQL editor once.

ALTER TABLE public.links ADD COLUMN IF NOT EXISTS sort_order BIGINT NOT NULL DEFAULT 0;

-- Backfill: number existing links 1..N per tenant, oldest first.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.links
)
UPDATE public.links l
SET sort_order = ranked.rn
FROM ranked
WHERE l.id = ranked.id;

-- Auto-assign max+1 for new links so they land at the end of the custom order.
CREATE OR REPLACE FUNCTION public.assign_link_sort_order() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max BIGINT;
BEGIN
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_max
  FROM public.links
  WHERE tenant_id = NEW.tenant_id;
  NEW.sort_order := v_max;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_link_sort_order ON public.links;
CREATE TRIGGER trg_assign_link_sort_order
  BEFORE INSERT ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.assign_link_sort_order();