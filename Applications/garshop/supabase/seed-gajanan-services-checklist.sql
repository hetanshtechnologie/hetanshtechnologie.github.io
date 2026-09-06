-- ============================================================
-- GarShop - Seed: Gajanan's Services Catalog + Hetansh Technologie's Checklist
--  * Services catalog for "Gajanan Auto Grarage" (garage id 4)
--  * Car + Pre-Service Checklist for hetanshtechnologie@gmail.com whose
--    checklist items mirror the services catalog.
-- Idempotent: only seeds when the garage has no services yet.
-- ============================================================

DO $$
DECLARE
  v_garage_id BIGINT := 4;                                     -- Gajanan Auto Grarage
  v_user_id   UUID := '1c9e9820-a4a3-4f89-a253-9d770bc61b78';  -- hetanshtechnologie@gmail.com
  v_car_id       BIGINT;
  v_checklist_id BIGINT;
BEGIN

  -- Services catalog (only if not already seeded)
  IF NOT EXISTS (SELECT 1 FROM gs_garage_services WHERE garage_id = v_garage_id) THEN
    INSERT INTO gs_garage_services (garage_id, name, description, price, category) VALUES
      (v_garage_id, 'Engine Oil Change',        'Full synthetic engine oil change with new oil filter', 2500, 'engine'),
      (v_garage_id, 'Engine Tune-Up',           'Spark plugs, ignition and engine tuning',             1500, 'engine'),
      (v_garage_id, 'Brake Pad Replacement',    'Front brake pads replacement with inspection',        1000, 'brakes'),
      (v_garage_id, 'Brake Fluid Top-Up',       'Brake fluid flush and refill',                         500, 'brakes'),
      (v_garage_id, 'Battery Service',          'Battery testing, terminal cleaning and replacement',  2000, 'battery'),
      (v_garage_id, 'AC Gas Refill',            'AC gas refill and cooling system check',              1500, 'ac'),
      (v_garage_id, 'AC Filter Cleaning',       'Cabin air filter cleaning and replacement',            300, 'ac'),
      (v_garage_id, 'Wheel Alignment',          'Computerised wheel alignment and balancing',           500, 'tyres'),
      (v_garage_id, 'Tyre Replacement',         'New tyre fitting with balancing',                     3500, 'tyres'),
      (v_garage_id, 'Denting & Painting',       'Panel denting and repainting',                        2500, 'body'),
      (v_garage_id, 'Full Body Wash',           'Complete exterior wash and polish',                    400, 'body'),
      (v_garage_id, 'General Checkup',          'Multi-point vehicle health inspection',                500, 'general');
  END IF;

  -- A car for the checklist
  INSERT INTO gs_cars (user_id, brand, model, year)
  VALUES (v_user_id, 'Maruti', 'Swift', 2021)
  RETURNING id INTO v_car_id;

  -- Checklist whose items mirror the services catalog
  INSERT INTO gs_checklists (user_id, car_id, garage_id, title, notes, status)
  VALUES (v_user_id, v_car_id, v_garage_id, 'Pre-Service Checklist',
          'Please check these items during the service.', 'pending')
  RETURNING id INTO v_checklist_id;

  INSERT INTO gs_checklist_items (checklist_id, item, user_checked, service_id)
  SELECT v_checklist_id, s.name, v.checked, s.id
  FROM (VALUES
    ('Engine Oil Change',     TRUE),
    ('Engine Tune-Up',        FALSE),
    ('Brake Pad Replacement', TRUE),
    ('Brake Fluid Top-Up',    FALSE),
    ('Battery Service',       TRUE),
    ('AC Gas Refill',         TRUE),
    ('AC Filter Cleaning',    FALSE),
    ('Wheel Alignment',       FALSE),
    ('Tyre Replacement',      FALSE),
    ('Denting & Painting',    FALSE),
    ('Full Body Wash',        FALSE),
    ('General Checkup',       TRUE)
  ) AS v(item, checked)
  JOIN gs_garage_services s ON s.garage_id = v_garage_id AND s.name = v.item;

END $$;
