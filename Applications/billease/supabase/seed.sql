-- ============================================================================
-- BillEase v2 - Demo seed data (multi-tenant)
--
-- Seeds a cafe/restaurant business for the owner test account.
-- Run AFTER schema.sql and AFTER seed-users.sql (which creates
-- owner@billease.test / admin@billease.test / staff@billease.test).
-- To seed a different account instead, set target_email below.
-- Safe to re-run: deletes this business's seed data first.
-- ============================================================================

DO $$
DECLARE
  uid uuid;
  target_email text := 'owner@billease.test';

  biz uuid;
  -- product ids by sku
  p_chai uuid; p_coffee uuid; p_thali uuid; p_pbm uuid; p_naan uuid; p_dosa uuid;
  p_biryani uuid; p_cc uuid; p_fls uuid; p_gj uuid; p_brw uuid; p_sand uuid;
  p_milk uuid; p_tea uuid; p_cofpow uuid; p_rice uuid; p_paneer uuid; p_butter uuid;
  p_tomato uuid; p_onion uuid; p_maida uuid; p_sugar uuid; p_batter uuid; p_oil uuid;
  p_lime uuid; p_soda uuid; p_cardamom uuid;
  -- party ids
  c_rahul uuid; c_kavita uuid; c_mehta uuid; c_itpark uuid;
  v_farm uuid; v_dairy uuid;
  -- table ids
  t1 uuid; t2 uuid; t3 uuid; t4 uuid;
  inv uuid;
  inv_rec RECORD;
  subtotal DECIMAL(14,2); tax DECIMAL(14,2); total DECIMAL(14,2);
  paid_total DECIMAL(14,2);
BEGIN
  -- ---------- 1. Target user ----------
  IF target_email <> '' THEN
    SELECT id INTO uid FROM auth.users WHERE email = target_email ORDER BY created_at DESC LIMIT 1;
  ELSE
    SELECT id INTO uid FROM auth.users ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user found. Sign up through the app first, or set target_email.';
  END IF;

  -- ---------- 2. Clean previous seed for this user ----------
  DELETE FROM be_loyalty_ledger USING be_businesses b
    WHERE be_loyalty_ledger.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_campaigns USING be_businesses b
    WHERE be_campaigns.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_eway_bills USING be_businesses b
    WHERE be_eway_bills.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_expenses USING be_businesses b
    WHERE be_expenses.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_recipe_items USING be_businesses b
    WHERE be_recipe_items.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_invoice_items USING be_businesses b
    WHERE be_invoice_items.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_payments USING be_businesses b
    WHERE be_payments.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_invoices USING be_businesses b
    WHERE be_invoices.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_tables USING be_businesses b
    WHERE be_tables.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_parties USING be_businesses b
    WHERE be_parties.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_products USING be_businesses b
    WHERE be_products.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_notifications USING be_businesses b
    WHERE be_notifications.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_members USING be_businesses b
    WHERE be_members.business_id = b.id AND b.owner_id = uid;
  DELETE FROM be_businesses WHERE owner_id = uid;

  -- ---------- 3. Business (tenant) ----------
  INSERT INTO be_businesses
    (owner_id, name, business_type, gstin, fssai, phone, email, address, city, state,
     pincode, currency, gst_enabled, loyalty_enabled, invoice_prefix, invoice_seq,
     pos_prefix, pos_seq, opening_cash)
  VALUES
    (uid, 'Spice & Sip Cafe', 'cafe', '27AARTS1234C1Z8', '11521008001234',
     '+91 98765 43210', 'hello@spiceandsip.in', '14, FC Road', 'Pune', 'Maharashtra',
     '411005', 'INR', TRUE, TRUE, 'BE', 2, 'POS', 7, 5000)
  RETURNING id INTO biz;

  INSERT INTO be_members (business_id, user_id, role, can_bill)
  VALUES (biz, uid, 'owner', TRUE);

  -- Attach the admin & staff test accounts as members of this business
  DECLARE
    m_admin uuid; m_staff uuid;
  BEGIN
    SELECT id INTO m_admin FROM auth.users WHERE email = 'admin@billease.test';
    SELECT id INTO m_staff FROM auth.users WHERE email = 'staff@billease.test';
    IF m_admin IS NOT NULL THEN
      INSERT INTO be_members (business_id, user_id, role, can_bill)
      VALUES (biz, m_admin, 'admin', TRUE);
    END IF;
    IF m_staff IS NOT NULL THEN
      INSERT INTO be_members (business_id, user_id, role, can_bill)
      VALUES (biz, m_staff, 'staff', TRUE);
    END IF;
  END;

  -- ---------- 4. Menu (products) ----------
  INSERT INTO be_products
    (business_id, name, sku, hsn, unit, category, purchase_price, selling_price,
     gst_rate, stock, low_stock_at, is_service, is_ingredient, available, sort_order)
  VALUES
    -- Dishes
    (biz, 'Masala Chai',      'CHAI',  '22021010', 'cup',   'Beverages', 8.00,  30.00, 5,  0, 0, FALSE, FALSE, TRUE, 10),
    (biz, 'Filter Coffee',    'COFFEE','22021010', 'cup',   'Beverages', 12.00, 60.00, 5,  0, 0, FALSE, FALSE, TRUE, 11),
    (biz, 'Veg Thali',        'VTHALI','21069099', 'plate', 'Main Course', 70.00, 149.00, 5, 0, 0, FALSE, FALSE, TRUE, 20),
    (biz, 'Paneer Butter Masala', 'PBM', '21069099', 'plate', 'Main Course', 90.00, 189.00, 5, 0, 0, FALSE, FALSE, TRUE, 21),
    (biz, 'Butter Naan',      'NAAN',  '19059090', 'pcs',   'Breads', 8.00,  45.00, 5,  0, 0, FALSE, FALSE, TRUE, 22),
    (biz, 'Masala Dosa',      'DOSA',  '21069099', 'pcs',   'Main Course', 45.00, 99.00, 5, 0, 0, FALSE, FALSE, TRUE, 23),
    (biz, 'Veg Biryani',      'BIRYANI','21069099', 'plate', 'Main Course', 65.00, 149.00, 5, 0, 0, FALSE, FALSE, TRUE, 24),
    (biz, 'Cold Coffee',      'CC',    '22029990', 'glass', 'Beverages', 45.00, 120.00, 18, 0, 0, FALSE, FALSE, TRUE, 12),
    (biz, 'Fresh Lime Soda',  'FLS',   '22029990', 'glass', 'Beverages', 22.00, 70.00, 18, 0, 0, FALSE, FALSE, TRUE, 13),
    (biz, 'Gulab Jamun',      'GJ',    '19059090', 'pcs',   'Desserts', 12.00, 40.00, 5,  0, 0, FALSE, FALSE, TRUE, 30),
    (biz, 'Brownie + Ice Cream','BRW', '18063200', 'pcs',   'Desserts', 55.00, 130.00, 18, 0, 0, FALSE, FALSE, TRUE, 31),
    (biz, 'Grilled Sandwich','SAND',   '19059090', 'pcs',   'Snacks', 35.00, 80.00, 5,  0, 0, FALSE, FALSE, TRUE, 40),
    -- Ingredients (tracked in stock, hidden from the menu)
    (biz, 'Milk',            'ING-MILK',   '04011000', 'l',   'Ingredients', 55.00, 0, 5, 60, 15, FALSE, TRUE, FALSE, 0),
    (biz, 'Tea Leaves',      'ING-TEA',    '09024000', 'g',   'Ingredients', 0.40, 0, 5, 2000, 300, FALSE, TRUE, FALSE, 0),
    (biz, 'Coffee Powder',   'ING-COFF',   '09012100', 'g',   'Ingredients', 1.10, 0, 5, 1500, 250, FALSE, TRUE, FALSE, 0),
    (biz, 'Basmati Rice',    'ING-RICE',   '10063000', 'kg',  'Ingredients', 60.00, 0, 5, 40, 8, FALSE, TRUE, FALSE, 0),
    (biz, 'Paneer',          'ING-PANEER', '04061000', 'kg',  'Ingredients', 320.00, 0, 5, 8, 2, FALSE, TRUE, FALSE, 0),
    (biz, 'Butter',          'ING-BUTTER', '04051000', 'kg',  'Ingredients', 500.00, 0, 5, 5, 1, FALSE, TRUE, FALSE, 0),
    (biz, 'Tomato',          'ING-TOM',    '07020000', 'kg',  'Ingredients', 40.00, 0, 5, 12, 4, FALSE, TRUE, FALSE, 0),
    (biz, 'Onion',           'ING-ONION',  '07031000', 'kg',  'Ingredients', 25.00, 0, 5, 10, 4, FALSE, TRUE, FALSE, 0),
    (biz, 'Maida',           'ING-MAIDA',  '11010000', 'kg',  'Ingredients', 38.00, 0, 5, 25, 5, FALSE, TRUE, FALSE, 0),
    (biz, 'Sugar',           'ING-SUGAR',  '17019900', 'kg',  'Ingredients', 45.00, 0, 5, 15, 3, FALSE, TRUE, FALSE, 0),
    (biz, 'Dosa Batter',     'ING-BATTER', '21069099', 'l',   'Ingredients', 35.00, 0, 5, 20, 5, FALSE, TRUE, FALSE, 0),
    (biz, 'Cooking Oil',     'ING-OIL',    '15119000', 'l',   'Ingredients', 140.00, 0, 5, 30, 5, FALSE, TRUE, FALSE, 0),
    (biz, 'Lime',            'ING-LIME',   '08055000', 'kg',  'Ingredients', 60.00, 0, 5, 6, 2, FALSE, TRUE, FALSE, 0),
    (biz, 'Soda Water',      'ING-SODA',   '22011000', 'l',   'Ingredients', 20.00, 0, 18, 25, 6, FALSE, TRUE, FALSE, 0),
    (biz, 'Cardamom',        'ING-CARD',   '09083000', 'g',   'Ingredients', 2.50, 0, 5, 500, 100, FALSE, TRUE, FALSE, 0);

  SELECT id INTO p_chai    FROM be_products WHERE business_id = biz AND sku = 'CHAI';
  SELECT id INTO p_coffee  FROM be_products WHERE business_id = biz AND sku = 'COFFEE';
  SELECT id INTO p_thali   FROM be_products WHERE business_id = biz AND sku = 'VTHALI';
  SELECT id INTO p_pbm     FROM be_products WHERE business_id = biz AND sku = 'PBM';
  SELECT id INTO p_naan    FROM be_products WHERE business_id = biz AND sku = 'NAAN';
  SELECT id INTO p_dosa    FROM be_products WHERE business_id = biz AND sku = 'DOSA';
  SELECT id INTO p_biryani FROM be_products WHERE business_id = biz AND sku = 'BIRYANI';
  SELECT id INTO p_cc      FROM be_products WHERE business_id = biz AND sku = 'CC';
  SELECT id INTO p_fls     FROM be_products WHERE business_id = biz AND sku = 'FLS';
  SELECT id INTO p_gj      FROM be_products WHERE business_id = biz AND sku = 'GJ';
  SELECT id INTO p_brw     FROM be_products WHERE business_id = biz AND sku = 'BRW';
  SELECT id INTO p_sand    FROM be_products WHERE business_id = biz AND sku = 'SAND';
  SELECT id INTO p_milk    FROM be_products WHERE business_id = biz AND sku = 'ING-MILK';
  SELECT id INTO p_tea     FROM be_products WHERE business_id = biz AND sku = 'ING-TEA';
  SELECT id INTO p_cofpow  FROM be_products WHERE business_id = biz AND sku = 'ING-COFF';
  SELECT id INTO p_rice    FROM be_products WHERE business_id = biz AND sku = 'ING-RICE';
  SELECT id INTO p_paneer  FROM be_products WHERE business_id = biz AND sku = 'ING-PANEER';
  SELECT id INTO p_butter  FROM be_products WHERE business_id = biz AND sku = 'ING-BUTTER';
  SELECT id INTO p_tomato  FROM be_products WHERE business_id = biz AND sku = 'ING-TOM';
  SELECT id INTO p_onion   FROM be_products WHERE business_id = biz AND sku = 'ING-ONION';
  SELECT id INTO p_maida   FROM be_products WHERE business_id = biz AND sku = 'ING-MAIDA';
  SELECT id INTO p_sugar   FROM be_products WHERE business_id = biz AND sku = 'ING-SUGAR';
  SELECT id INTO p_batter  FROM be_products WHERE business_id = biz AND sku = 'ING-BATTER';
  SELECT id INTO p_oil     FROM be_products WHERE business_id = biz AND sku = 'ING-OIL';
  SELECT id INTO p_lime    FROM be_products WHERE business_id = biz AND sku = 'ING-LIME';
  SELECT id INTO p_soda    FROM be_products WHERE business_id = biz AND sku = 'ING-SODA';
  SELECT id INTO p_cardamom FROM be_products WHERE business_id = biz AND sku = 'ING-CARD';

  -- ---------- 5. Recipes (dish -> ingredients) ----------
  INSERT INTO be_recipe_items (business_id, product_id, ingredient_id, qty) VALUES
    (biz, p_chai,   p_milk, 0.15), (biz, p_chai,   p_tea, 8), (biz, p_chai, p_sugar, 10), (biz, p_chai, p_cardamom, 1),
    (biz, p_coffee, p_milk, 0.10), (biz, p_coffee, p_cofpow, 12), (biz, p_coffee, p_sugar, 8),
    (biz, p_dosa,   p_batter, 0.35), (biz, p_dosa, p_oil, 0.02),
    (biz, p_thali,  p_rice, 0.15), (biz, p_thali, p_tomato, 0.05), (biz, p_thali, p_onion, 0.05), (biz, p_thali, p_butter, 0.01),
    (biz, p_pbm,    p_paneer, 0.10), (biz, p_pbm, p_tomato, 0.08), (biz, p_pbm, p_onion, 0.06), (biz, p_pbm, p_butter, 0.02),
    (biz, p_naan,   p_maida, 0.08), (biz, p_naan, p_butter, 0.01),
    (biz, p_fls,    p_lime, 0.05), (biz, p_fls, p_soda, 0.25), (biz, p_fls, p_sugar, 10),
    (biz, p_biryani, p_rice, 0.20), (biz, p_biryani, p_onion, 0.08), (biz, p_biryani, p_oil, 0.03),
    (biz, p_cc,     p_milk, 0.15), (biz, p_cc, p_cofpow, 15), (biz, p_cc, p_sugar, 12);

  -- ---------- 6. Tables ----------
  INSERT INTO be_tables (business_id, name, seats) VALUES
    (biz, 'T1', 2), (biz, 'T2', 4), (biz, 'T3', 4), (biz, 'T4', 4),
    (biz, 'T5', 4), (biz, 'T6', 6), (biz, 'T7', 2), (biz, 'T8', 6);
  SELECT id INTO t1 FROM be_tables WHERE business_id = biz AND name = 'T1';
  SELECT id INTO t2 FROM be_tables WHERE business_id = biz AND name = 'T2';
  SELECT id INTO t3 FROM be_tables WHERE business_id = biz AND name = 'T3';
  SELECT id INTO t4 FROM be_tables WHERE business_id = biz AND name = 'T4';

  -- ---------- 7. Parties ----------
  INSERT INTO be_parties
    (business_id, type, name, company, phone, email, billing_address, credit_limit, opening_balance)
  VALUES
    (biz, 'customer', 'Rahul Sharma', '', '+91 98000 10001', 'rahul@example.com', 'Flat 12, Kothrud, Pune', 20000, 0),
    (biz, 'customer', 'Kavita Joshi', '', '+91 98000 10002', 'kavita@example.com', 'Sinhagad Road, Pune', 10000, 0),
    (biz, 'customer', 'Mehta Catering Services', '', '+91 98000 10003', 'orders@mehtacatering.in', 'Baner Road, Pune', 50000, 0),
    (biz, 'customer', 'IT Park Canteen', '', '+91 98000 10004', 'canteen@itpark.in', 'Hinjewadi Phase 1, Pune', 30000, 0),
    (biz, 'vendor', 'Fresh Farm Produce', '', '+91 98000 20001', 'sales@freshfarm.in', 'APMC Market, Pune', 50000, 0),
    (biz, 'vendor', 'Dairy & Co', '', '+91 98000 20002', 'supply@dairyco.in', 'Kothrud Depot, Pune', 30000, 0);
  SELECT id INTO c_rahul  FROM be_parties WHERE business_id = biz AND name = 'Rahul Sharma';
  SELECT id INTO c_kavita FROM be_parties WHERE business_id = biz AND name = 'Kavita Joshi';
  SELECT id INTO c_mehta  FROM be_parties WHERE business_id = biz AND name = 'Mehta Catering Services';
  SELECT id INTO c_itpark FROM be_parties WHERE business_id = biz AND name = 'IT Park Canteen';
  SELECT id INTO v_farm   FROM be_parties WHERE business_id = biz AND name = 'Fresh Farm Produce';
  SELECT id INTO v_dairy  FROM be_parties WHERE business_id = biz AND name = 'Dairy & Co';

  -- ---------- 8. Invoices & items (totals computed in step 9) ----------
  -- POS-0001: dine-in table T3, paid
  INSERT INTO be_invoices (business_id, invoice_number, party_id, table_id, waiter, type, dine_type,
    status, sent_to_kitchen, invoice_date, place_of_supply, notes)
  VALUES (biz, 'POS-0001', c_rahul, t3, 'Ankit', 'pos', 'dine_in', 'draft', TRUE,
          CURRENT_DATE - 1, 'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0001';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount, special_notes) VALUES
    (biz, inv, p_dosa, 'Masala Dosa', '21069099', 2, 'pcs', 99, 5, 0, ''),
    (biz, inv, p_coffee, 'Filter Coffee', '22021010', 2, 'cup', 60, 5, 0, ''),
    (biz, inv, p_gj, 'Gulab Jamun', '19059090', 1, 'pcs', 40, 5, 0, 'less sugar');

  -- POS-0002: takeaway, paid via UPI
  INSERT INTO be_invoices (business_id, invoice_number, party_id, type, dine_type, status,
    invoice_date, place_of_supply, notes)
  VALUES (biz, 'POS-0002', c_kavita, 'pos', 'takeaway', 'draft', CURRENT_DATE, 'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0002';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_chai, 'Masala Chai', '22021010', 4, 'cup', 30, 5, 0),
    (biz, inv, p_biryani, 'Veg Biryani', '21069099', 2, 'plate', 149, 5, 0);

  -- POS-0003: Swiggy delivery, paid online, platform fee
  INSERT INTO be_invoices (business_id, invoice_number, type, dine_type, platform, platform_fee,
    status, invoice_date, place_of_supply, notes)
  VALUES (biz, 'POS-0003', 'pos', 'delivery', 'Swiggy', 30, 'draft', CURRENT_DATE, 'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0003';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_pbm, 'Paneer Butter Masala', '21069099', 1, 'plate', 189, 5, 0),
    (biz, inv, p_naan, 'Butter Naan', '19059090', 2, 'pcs', 45, 5, 0),
    (biz, inv, p_biryani, 'Veg Biryani', '21069099', 1, 'plate', 149, 5, 0);

  -- POS-0004: website online order, paid
  INSERT INTO be_invoices (business_id, invoice_number, type, dine_type, platform, status,
    invoice_date, place_of_supply, notes)
  VALUES (biz, 'POS-0004', 'pos', 'online', 'Website', 'draft', CURRENT_DATE, 'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0004';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_cc, 'Cold Coffee', '22029990', 2, 'glass', 120, 18, 0),
    (biz, inv, p_sand, 'Grilled Sandwich', '19059090', 2, 'pcs', 80, 5, 0);

  -- POS-0005: open dine-in order sent to kitchen (KDS demo), table T1
  INSERT INTO be_invoices (business_id, invoice_number, table_id, waiter, type, dine_type, status,
    sent_to_kitchen, invoice_date, place_of_supply, notes)
  VALUES (biz, 'POS-0005', t1, 'Ankit', 'pos', 'dine_in', 'sent', TRUE, CURRENT_DATE, 'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0005';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount, special_notes) VALUES
    (biz, inv, p_naan, 'Butter Naan', '19059090', 2, 'pcs', 45, 5, 0, ''),
    (biz, inv, p_pbm, 'Paneer Butter Masala', '21069099', 1, 'plate', 189, 5, 0, 'less spicy'),
    (biz, inv, p_fls, 'Fresh Lime Soda', '22029990', 2, 'glass', 70, 18, 0, 'no ice');

  -- POS-0006: open order, ready to be prepared, table T2
  INSERT INTO be_invoices (business_id, invoice_number, table_id, waiter, type, dine_type, status,
    sent_to_kitchen, invoice_date, place_of_supply, notes)
  VALUES (biz, 'POS-0006', t2, 'Sneha', 'pos', 'dine_in', 'sent', TRUE, CURRENT_DATE, 'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0006';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount, special_notes) VALUES
    (biz, inv, p_thali, 'Veg Thali', '21069099', 1, 'plate', 149, 5, 0, 'no onion'),
    (biz, inv, p_chai, 'Masala Chai', '22021010', 2, 'cup', 30, 5, 0, '');

  -- POS-0007: running bill (held), table T4, not yet sent to kitchen
  INSERT INTO be_invoices (business_id, invoice_number, table_id, waiter, type, dine_type, status,
    sent_to_kitchen, invoice_date, place_of_supply, notes)
  VALUES (biz, 'POS-0007', t4, 'Sneha', 'pos', 'dine_in', 'open', FALSE, CURRENT_DATE, 'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0007';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount, special_notes) VALUES
    (biz, inv, p_coffee, 'Filter Coffee', '22021010', 2, 'cup', 60, 5, 0, ''),
    (biz, inv, p_brw, 'Brownie + Ice Cream', '18063200', 1, 'pcs', 130, 18, 0, '');

  -- BE-0001: catering invoice (corporate), paid via bank
  INSERT INTO be_invoices (business_id, invoice_number, party_id, type, dine_type, status,
    invoice_date, due_date, place_of_supply, notes)
  VALUES (biz, 'BE-0001', c_mehta, 'sale', 'delivery', 'draft', CURRENT_DATE - 3, CURRENT_DATE + 12,
          'Maharashtra', 'Corporate lunch order - 50 pax. Amount inclusive of service.');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'BE-0001';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_biryani, 'Veg Biryani', '21069099', 10, 'plate', 149, 5, 0),
    (biz, inv, p_pbm, 'Paneer Butter Masala', '21069099', 5, 'plate', 189, 5, 0),
    (biz, inv, p_naan, 'Butter Naan', '19059090', 20, 'pcs', 45, 5, 0),
    (biz, inv, p_gj, 'Gulab Jamun', '19059090', 10, 'pcs', 40, 5, 0);

  -- BE-0002: canteen order, overdue
  INSERT INTO be_invoices (business_id, invoice_number, party_id, type, dine_type, platform, platform_fee,
    status, invoice_date, due_date, place_of_supply, notes)
  VALUES (biz, 'BE-0002', c_itpark, 'sale', 'delivery', 'Direct', 50, 'overdue',
          CURRENT_DATE - 20, CURRENT_DATE - 5, 'Maharashtra', 'Monthly canteen supply.');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'BE-0002';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_thali, 'Veg Thali', '21069099', 30, 'plate', 149, 5, 0),
    (biz, inv, p_chai, 'Masala Chai', '22021010', 50, 'cup', 30, 5, 0);

  -- QOT-0001: catering quotation
  INSERT INTO be_invoices (business_id, invoice_number, party_id, type, dine_type, status,
    invoice_date, due_date, place_of_supply, notes)
  VALUES (biz, 'QOT-0001', c_mehta, 'quotation', 'delivery', 'sent',
          CURRENT_DATE - 2, CURRENT_DATE + 28, 'Maharashtra', 'Diwali party quotation, valid 30 days.');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'QOT-0001';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_brw, 'Brownie + Ice Cream', '18063200', 50, 'pcs', 130, 18, 0),
    (biz, inv, p_cc, 'Cold Coffee', '22029990', 50, 'glass', 120, 18, 0);

  -- PB-0001: vegetable purchase, paid
  INSERT INTO be_invoices (business_id, invoice_number, party_id, type, status,
    invoice_date, due_date, place_of_supply, notes)
  VALUES (biz, 'PB-0001', v_farm, 'purchase', 'paid', CURRENT_DATE - 5, CURRENT_DATE + 2,
          'Maharashtra', 'Weekly vegetable order.');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'PB-0001';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_tomato, 'Tomato', '07020000', 20, 'kg', 40, 5, 0),
    (biz, inv, p_onion, 'Onion', '07031000', 25, 'kg', 25, 5, 0),
    (biz, inv, p_lime, 'Lime', '08055000', 10, 'kg', 60, 5, 0);

  -- PB-0002: dairy purchase, payment pending (reminder)
  INSERT INTO be_invoices (business_id, invoice_number, party_id, type, status,
    invoice_date, due_date, place_of_supply, notes)
  VALUES (biz, 'PB-0002', v_dairy, 'purchase', 'sent', CURRENT_DATE - 7, CURRENT_DATE - 1,
          'Maharashtra', 'Milk supply. Payment due.');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'PB-0002';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_milk, 'Milk', '04011000', 100, 'l', 55, 5, 0),
    (biz, inv, p_butter, 'Butter', '04051000', 10, 'kg', 500, 5, 0);

  -- PB-0003: rice purchase, paid (older)
  INSERT INTO be_invoices (business_id, invoice_number, party_id, type, status,
    invoice_date, due_date, place_of_supply, notes)
  VALUES (biz, 'PB-0003', v_farm, 'purchase', 'paid', CURRENT_DATE - 30, CURRENT_DATE - 10,
          'Maharashtra', '');
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'PB-0003';
  INSERT INTO be_invoice_items (business_id, invoice_id, product_id, product_name, hsn, qty, unit, rate, gst_rate, amount) VALUES
    (biz, inv, p_rice, 'Basmati Rice', '10063000', 50, 'kg', 60, 5, 0);

  -- ---------- 9. Compute totals ----------
  FOR inv_rec IN SELECT id FROM be_invoices WHERE business_id = biz LOOP
    SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(amount * gst_rate / 100), 0)
      INTO subtotal, tax FROM be_invoice_items WHERE invoice_id = inv_rec.id;
    total := subtotal + tax;
    UPDATE be_invoices SET items_total = subtotal, tax_amount = tax, total = total
      WHERE id = inv_rec.id;
  END LOOP;

  -- ---------- 10. Payments ----------
  SELECT total INTO paid_total FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0001';
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0001';
  INSERT INTO be_payments (business_id, invoice_id, party_id, direction, amount, method, payment_date, notes)
  VALUES (biz, inv, c_rahul, 'received', paid_total, 'cash', CURRENT_DATE - 1, 'Cash at counter');

  SELECT total INTO paid_total FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0002';
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0002';
  INSERT INTO be_payments (business_id, invoice_id, party_id, direction, amount, method, payment_date, notes)
  VALUES (biz, inv, c_kavita, 'received', paid_total, 'upi', CURRENT_DATE, 'UPI ref UPI90123');

  SELECT total INTO paid_total FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0003';
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0003';
  INSERT INTO be_payments (business_id, invoice_id, party_id, direction, amount, method, payment_date, notes)
  VALUES (biz, inv, NULL, 'received', paid_total, 'online', CURRENT_DATE, 'Swiggy settlement');

  SELECT total INTO paid_total FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0004';
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'POS-0004';
  INSERT INTO be_payments (business_id, invoice_id, party_id, direction, amount, method, payment_date, notes)
  VALUES (biz, inv, NULL, 'received', paid_total, 'online', CURRENT_DATE, 'Website order');

  SELECT total INTO paid_total FROM be_invoices WHERE business_id = biz AND invoice_number = 'BE-0001';
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'BE-0001';
  INSERT INTO be_payments (business_id, invoice_id, party_id, direction, amount, method, payment_date, notes)
  VALUES (biz, inv, c_mehta, 'received', paid_total, 'bank', CURRENT_DATE - 1, 'NEFT ref NEFT77821');

  -- Supplier payments (purchase bills)
  SELECT total INTO paid_total FROM be_invoices WHERE business_id = biz AND invoice_number = 'PB-0001';
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'PB-0001';
  INSERT INTO be_payments (business_id, invoice_id, party_id, direction, amount, method, payment_date, notes)
  VALUES (biz, inv, v_farm, 'paid', paid_total, 'cash', CURRENT_DATE - 2, 'Cash at mandi');

  SELECT total INTO paid_total FROM be_invoices WHERE business_id = biz AND invoice_number = 'PB-0003';
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'PB-0003';
  INSERT INTO be_payments (business_id, invoice_id, party_id, direction, amount, method, payment_date, notes)
  VALUES (biz, inv, v_farm, 'paid', paid_total, 'bank', CURRENT_DATE - 28, 'NEFT ref NEFT11900');

  -- ---------- 11. Expenses ----------
  INSERT INTO be_expenses (business_id, category, amount, expense_date, payment_method, vendor_name, notes) VALUES
    (biz, 'Rent', 25000, CURRENT_DATE - 3, 'bank', 'Shop landlord', 'Monthly rent'),
    (biz, 'Electricity', 4800, CURRENT_DATE - 6, 'upi', 'Mahavitaran', 'Power bill'),
    (biz, 'Staff Salary', 12000, CURRENT_DATE - 2, 'cash', 'Kitchen staff', 'Weekly wages'),
    (biz, 'LPG / Fuel', 3200, CURRENT_DATE - 4, 'cash', 'Indane', 'Kitchen cylinders'),
    (biz, 'Packaging', 1500, CURRENT_DATE - 1, 'upi', 'Packplus', 'Delivery boxes and covers'),
    (biz, 'Cleaning', 900, CURRENT_DATE - 8, 'cash', 'Supplier', 'Detergents');

  -- ---------- 12. Marketing campaign ----------
  INSERT INTO be_campaigns (business_id, title, message, channel, audience, status, sent_count) VALUES
    (biz, 'Weekend Special',
     'Hi {name}! Flat 10% off on dine-in this weekend at Spice & Sip Cafe. Use code WEEKEND10. See you soon!',
     'whatsapp', 'customers', 'sent', 12);

  -- ---------- 13. Loyalty points ----------
  INSERT INTO be_loyalty_ledger (business_id, party_id, points, reason, invoice_id) VALUES
    (biz, c_rahul, 120, 'Earned on POS-0001', NULL),
    (biz, c_kavita, 80, 'Earned on POS-0002', NULL);
  UPDATE be_parties SET loyalty_points = 120 WHERE id = c_rahul;
  UPDATE be_parties SET loyalty_points = 80 WHERE id = c_kavita;

  -- ---------- 14. e-Way bill sample ----------
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'BE-0002';
  INSERT INTO be_eway_bills (business_id, invoice_id, eway_number, transporter_name, vehicle_no,
    vehicle_type, from_state, to_state, from_pincode, to_pincode, distance_km, value, status) VALUES
    (biz, inv, '751234567890', 'Kavya Logistics', 'MH12AB1234', 'Rigid Body', 'Maharashtra',
     'Maharashtra', '411005', '411057', 22, 100, 'valid');

  -- ---------- 15. e-Invoice sample ----------
  SELECT id INTO inv FROM be_invoices WHERE business_id = biz AND invoice_number = 'BE-0001';
  UPDATE be_invoices SET irn = '64ee2e1cd76b4f4d9b2f3a5f9c8d7e6b5a4f3c2d1e9f8a7b6c5d4e3f2a1b0c9d',
    ack_no = '146825482370', ack_date = to_char(CURRENT_DATE - 1, 'YYYY-MM-DD') WHERE id = inv;

  -- ---------- 16. Notifications ----------
  INSERT INTO be_notifications (business_id, user_id, title, message, type, link) VALUES
    (biz, uid, 'Low stock: Milk', 'Milk is at 60 l, threshold is 15 l. Reorder soon.', 'warning', 'products'),
    (biz, uid, '2 invoices overdue', 'BE-0002 and PB-0002 need follow-up.', 'error', 'invoices');

  RAISE NOTICE 'BillEase v2 seed complete for business %.', biz;
END $$;
