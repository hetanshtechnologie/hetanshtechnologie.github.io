-- ============================================================
-- GarShop - Issue location (Google Maps)
-- Lets the user attach their current lat/lng to a reported issue
-- so the garage owner can navigate to them via Google Maps.
-- ============================================================

ALTER TABLE gs_issues
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
