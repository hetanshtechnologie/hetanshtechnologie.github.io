-- Seed: Busy Accounting Software product + 8 edition variants
-- Run in Supabase SQL Editor
-- Update the org_id below as needed (12 = Hetansh Technologie Solutions)

DO $$
DECLARE
  pid BIGINT;
  oid CONSTANT BIGINT := 12;
BEGIN
  INSERT INTO products (org_id, name, sku, unit, gst_rate, category, mrp, selling_price, is_active)
  VALUES (oid, 'Busy Accounting Software', 'BSW', 'nos', 18, 'Software', 0, 0, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO pid FROM products WHERE org_id = oid AND sku = 'BSW';
  IF NOT FOUND THEN RETURN; END IF;

  DELETE FROM product_variants WHERE product_id = pid;

  INSERT INTO product_variants (org_id, product_id, name, sku_suffix, description, selling_price, sort_order, features) VALUES
  (oid, pid, 'Express',      '-EXP', 'Free accounting software for small shops',               0,      1, '["Free forever","Basic accounting","Cash & bank management","1 user"]'),
  (oid, pid, 'Blue',         '-BLU', 'Basic invoicing, inventory, and accounting',            4999,   2, '["Invoice & billing","Inventory management","Basic accounting","1 user","Local support"]'),
  (oid, pid, 'Saffron',      '-SAF', 'Full GST compliance + advanced accounting',             9999,   3, '["GST return filing (GSTR1/3B)","E-way bill & IRN","Multi-currency","Advanced inventory","5 users","Priority support"]'),
  (oid, pid, 'Emerald',      '-EMR', 'Enterprise solution with multi-branch management',     19999,  4, '["Multi-branch support","Consolidation reports","Budgets & forecasting","Project costing","Unlimited users","Dedicated account manager"]'),
  (oid, pid, 'Mobile App',   '-MOB', '100+ reports, quotations, orders, invoices on the go',  2499,  5, '["100+ MIS reports","Quotation & order mgmt","Invoice on mobile","Sales tracking","Expense tracking","Cloud backup"]'),
  (oid, pid, 'Cloud Access', '-CLD', 'Secure remote access to your Busy data from anywhere',   1499,  6, '["Remote desktop access","Data encryption","Auto sync","Multi-device support","24/7 uptime"]'),
  (oid, pid, 'Busy Recom',   '-REC', 'E-commerce sync & reconciliation for online sellers',  12999,  7, '["Amazon & Flipkart order sync","Auto reconciliation","Inventory sync","Pricing rules","Returns management","GST for e-commerce"]'),
  (oid, pid, 'Busy Mandi',   '-MAN', 'Commission agent solution for Anaj & Sabji Mandis',     7999,  8, '["Mandi-specific invoicing","Commission calculation","Weighbridge integration","Aadhaar-linked payments","Mandi fee & charges","Daily market rate update"]')
  ON CONFLICT DO NOTHING;
END $$;
