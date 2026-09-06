-- ============================================================
-- GarShop - Seed / demo data
-- Run AFTER schema.sql. Use the SQL Editor in Supabase.
-- UUIDs below match the live demo users in the shared Supabase project.
-- ============================================================

DO $$
DECLARE
  v_owner_id UUID := 'eb3fe8bb-4bc7-414a-a77f-9ff0a6d0ce77'; -- owner@demo.com
  v_user_id  UUID := '6a9cc552-a7d1-4f47-86af-d8ff613f5e24'; -- user@demo.com
  v_garage_id BIGINT;
  v_car_id BIGINT;
  v_issue_id BIGINT;
  v_checklist_id BIGINT;
BEGIN

  -- Profiles
  INSERT INTO gs_profiles (user_id, full_name, phone, role) VALUES
    (v_owner_id, 'Torque Owner', '+911234567890', 'owner'),
    (v_user_id, 'Demo User', '+919000000001', 'user')
  ON CONFLICT (user_id) DO NOTHING;

  -- Garage owned by demo owner
  INSERT INTO gs_garages (owner_id, name, location, city, phone, description, services_offered, status)
  VALUES (v_owner_id, 'Torque of the Town', 'SG Highway, Ahmedabad', 'Gujarat', '+911234567890',
          'Premium car service at your tech park with doorstep pickup and drop.',
          'Engine oil, Brake pads, Battery service, AC maintenance, Tyres, Body work',
          'approved')
  RETURNING id INTO v_garage_id;

  -- Services catalog
  INSERT INTO gs_garage_services (garage_id, name, description, price, category) VALUES
    (v_garage_id, 'Engine Oil Change', 'Full synthetic engine oil change with filter', 2500, 'engine'),
    (v_garage_id, 'Brake Pads Replacement', 'High quality brake pads for front wheels', 1000, 'brakes'),
    (v_garage_id, 'Battery Service', 'Battery testing, cleaning and replacement', 2000, 'battery'),
    (v_garage_id, 'AC Maintenance', 'AC gas refill and cooling system check', 1500, 'ac'),
    (v_garage_id, 'General Service', 'Multi-point inspection and tune up', 2000, 'general');

  -- User's car
  INSERT INTO gs_cars (user_id, brand, model, year) VALUES
    (v_user_id, 'Maruti', 'Swift', 2021)
  RETURNING id INTO v_car_id;

  INSERT INTO gs_car_components (car_id, name, status) VALUES
    (v_car_id, 'Front Brake Pads', 'needs_replace'),
    (v_car_id, 'Battery', 'ok');

  -- Sample issue
  INSERT INTO gs_issues (user_id, car_id, garage_id, title, description, status)
  VALUES (v_user_id, v_car_id, v_garage_id, 'Brakes making noise', 'Squeaking sound when braking at low speed.', 'pending')
  RETURNING id INTO v_issue_id;

  -- Sample appointment
  INSERT INTO gs_appointments (user_id, garage_id, car_id, service_id, issue_id, scheduled_at, status, notes)
  VALUES (v_user_id, v_garage_id, v_car_id,
          (SELECT id FROM gs_garage_services WHERE garage_id = v_garage_id AND category = 'brakes' LIMIT 1),
          v_issue_id, NOW() + INTERVAL '2 days', 'pending', 'Doorstep pickup requested');

  -- Sample reminder
  INSERT INTO gs_reminders (user_id, garage_id, car_id, title, message, due_date, status)
  VALUES (v_user_id, v_garage_id, v_car_id, 'Service due soon',
          'Your car is due for engine oil change. Book a service today.', CURRENT_DATE + 14, 'scheduled');

  INSERT INTO gs_notifications (user_id, title, message, type) VALUES
    (v_user_id, 'Welcome to GarShop', 'Report your car issue and book a service at a nearby garage.', 'info');

  -- Inventory
  INSERT INTO gs_inventory (garage_id, item_name, quantity, unit, min_stock) VALUES
    (v_garage_id, 'Engine Oil 5W30', 24, 'litre', 10),
    (v_garage_id, 'Brake Pads Set', 8, 'set', 4),
    (v_garage_id, 'Battery 12V', 6, 'unit', 3);

  -- Bind the demo user to the demo garage (app downloaded from garage page)
  INSERT INTO gs_garage_users (garage_id, user_id)
  VALUES (v_garage_id, v_user_id)
  ON CONFLICT (garage_id, user_id) DO NOTHING;

  -- Services catalog for the second garage (mona, owner monamsc1986@gmail.com).
  -- Resolved by garage name so it works on fresh databases too.
  INSERT INTO gs_garage_services (garage_id, name, description, price, category)
  SELECT g.id, s.name, s.description, s.price, s.category
  FROM (VALUES
    ('Engine Oil Change',     'Engine oil change with new oil filter',           1200, 'engine'),
    ('Engine Tune-Up',        'Spark plugs, ignition and engine tuning',         1500, 'engine'),
    ('Brake Pad Replacement', 'Front brake pads replacement with inspection',     900, 'brakes'),
    ('Brake Fluid Top-Up',    'Brake fluid flush and refill',                     500, 'brakes'),
    ('Battery Check & Replacement', 'Battery testing, terminal cleaning, replacement', 1800, 'battery'),
    ('AC Gas Refill',         'AC gas refill and cooling system check',          1100, 'ac'),
    ('AC Filter Cleaning',    'Cabin air filter cleaning and replacement',        300, 'ac'),
    ('Wheel Alignment',       'Computerised wheel alignment',                     500, 'tyres'),
    ('Tyre Replacement',      'New tyre fitting with balancing',                 3500, 'tyres'),
    ('Denting & Painting',    'Panel denting and repainting',                    2500, 'body'),
    ('Full Body Wash',        'Complete exterior wash and polish',                400, 'body'),
    ('General Checkup',       'Multi-point vehicle health inspection',            500, 'general')
  ) AS s(name, description, price, category)
  JOIN gs_garages g ON g.name = 'mona';

  -- Sample checklist from the demo user to the demo garage
  INSERT INTO gs_checklists (user_id, car_id, garage_id, title, notes, status)
  VALUES (v_user_id, v_car_id, v_garage_id, 'Pre-Service Checklist',
          'Please check these items during the service.', 'pending')
  RETURNING id INTO v_checklist_id;

  INSERT INTO gs_checklist_items (checklist_id, item, user_checked) VALUES
    (v_checklist_id, 'Brake pads', TRUE),
    (v_checklist_id, 'Engine oil level', TRUE),
    (v_checklist_id, 'AC cooling', FALSE),
    (v_checklist_id, 'Tyre pressure', FALSE);

END $$;
