-- ============================================================
-- All-in-One ERP — Full Database Bootstrap
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Core tables
CREATE TABLE IF NOT EXISTS organizations (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  gstin         TEXT UNIQUE,
  pan           TEXT,
  address       JSONB,
  contact       JSONB,
  industry_type TEXT,
  variant       TEXT DEFAULT 'blue',
  settings      JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        BIGINT REFERENCES organizations(id),
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin','accountant','sales','inventory_manager','staff')),
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('asset','liability','income','expense','equity')),
  parent_id     BIGINT REFERENCES chart_of_accounts(id),
  is_active     BOOLEAN DEFAULT TRUE,
  UNIQUE(org_id, code)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference     TEXT,
  description   TEXT,
  entry_type    TEXT DEFAULT 'manual' CHECK (entry_type IN ('manual','invoice','payment','contra','gst')),
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_id      BIGINT REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id    BIGINT REFERENCES chart_of_accounts(id),
  debit         NUMERIC(14,2) DEFAULT 0,
  credit        NUMERIC(14,2) DEFAULT 0,
  description   TEXT
);

CREATE TABLE IF NOT EXISTS parties (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  type          TEXT NOT NULL CHECK (type IN ('customer','supplier','both')),
  name          TEXT NOT NULL,
  gstin         TEXT,
  pan           TEXT,
  phone         TEXT,
  email         TEXT,
  address       JSONB,
  credit_limit  NUMERIC(14,2),
  opening_bal   NUMERIC(14,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  name          TEXT NOT NULL,
  sku           TEXT,
  hsn_code      TEXT,
  sac_code      TEXT,
  unit          TEXT DEFAULT 'nos',
  gst_rate      NUMERIC(5,2) DEFAULT 0,
  cess_rate     NUMERIC(5,2) DEFAULT 0,
  category      TEXT,
  brand         TEXT,
  attributes    JSONB DEFAULT '[]',
  mrp           NUMERIC(12,2),
  selling_price NUMERIC(12,2),
  purchase_price NUMERIC(12,2),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  product_id    BIGINT REFERENCES products(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sku_suffix    TEXT,
  description   TEXT,
  features      JSONB DEFAULT '[]',
  mrp           NUMERIC(12,2),
  selling_price NUMERIC(12,2),
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  product_id    BIGINT REFERENCES products(id),
  batch_no      TEXT,
  mfg_date      DATE,
  expiry_date   DATE,
  quantity      NUMERIC(12,3) DEFAULT 0,
  cost_price    NUMERIC(12,2),
  location      TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  product_id    BIGINT REFERENCES products(id),
  batch_id      BIGINT REFERENCES inventory_batches(id),
  serial_no     TEXT NOT NULL UNIQUE,
  status        TEXT DEFAULT 'available' CHECK (status IN ('available','sold','damaged','returned'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id            BIGINT REFERENCES organizations(id),
  invoice_no        TEXT NOT NULL,
  invoice_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE,
  customer_id       BIGINT REFERENCES parties(id),
  billing_address   JSONB,
  shipping_address  JSONB,
  gstin             TEXT,
  place_of_supply   TEXT,
  invoice_type      TEXT DEFAULT 'regular' CHECK (invoice_type IN ('regular','export','debit_note','credit_note','proforma')),
  reverse_charge    BOOLEAN DEFAULT FALSE,
  payment_terms     TEXT,
  subtotal          NUMERIC(14,2),
  discount_pct      NUMERIC(5,2) DEFAULT 0,
  discount_amt      NUMERIC(14,2) DEFAULT 0,
  taxable_amt       NUMERIC(14,2),
  cgst_amt          NUMERIC(14,2) DEFAULT 0,
  sgst_amt          NUMERIC(14,2) DEFAULT 0,
  igst_amt          NUMERIC(14,2) DEFAULT 0,
  cess_amt          NUMERIC(14,2) DEFAULT 0,
  total             NUMERIC(14,2),
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  irn               TEXT,
  eway_bill_no      TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id      BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
  product_id      BIGINT REFERENCES products(id),
  batch_id        BIGINT REFERENCES inventory_batches(id),
  description     TEXT,
  quantity        NUMERIC(12,3),
  unit            TEXT,
  rate            NUMERIC(14,2),
  discount_pct    NUMERIC(5,2) DEFAULT 0,
  taxable_amt     NUMERIC(14,2),
  gst_rate        NUMERIC(5,2),
  cgst_amt        NUMERIC(14,2) DEFAULT 0,
  sgst_amt        NUMERIC(14,2) DEFAULT 0,
  igst_amt        NUMERIC(14,2) DEFAULT 0,
  total           NUMERIC(14,2)
);

CREATE TABLE IF NOT EXISTS payments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  invoice_id    BIGINT REFERENCES invoices(id),
  party_id      BIGINT REFERENCES parties(id),
  amount        NUMERIC(14,2) NOT NULL,
  mode          TEXT DEFAULT 'cash' CHECK (mode IN ('cash','bank','upi','card','cheque','online')),
  reference_no  TEXT,
  payment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gst_records (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id          BIGINT REFERENCES organizations(id),
  return_type     TEXT NOT NULL CHECK (return_type IN ('GSTR1','GSTR2A','GSTR3B','GSTR9')),
  return_period   TEXT NOT NULL,
  invoice_id      BIGINT REFERENCES invoices(id),
  party_id        BIGINT REFERENCES parties(id),
  gstin           TEXT,
  invoice_no      TEXT,
  invoice_date    DATE,
  taxable_amt     NUMERIC(14,2),
  cgst_amt        NUMERIC(14,2) DEFAULT 0,
  sgst_amt        NUMERIC(14,2) DEFAULT 0,
  igst_amt        NUMERIC(14,2) DEFAULT 0,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','matched','mismatched','filed')),
  filed_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS gst_rates (
  hsn_code      TEXT PRIMARY KEY,
  description   TEXT,
  cgst          NUMERIC(5,2),
  sgst          NUMERIC(5,2),
  igst          NUMERIC(5,2),
  cess          NUMERIC(5,2) DEFAULT 0,
  effective_from DATE,
  effective_to   DATE
);

CREATE TABLE IF NOT EXISTS gst_itc (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  invoice_id    BIGINT REFERENCES invoices(id),
  party_id      BIGINT REFERENCES parties(id),
  itc_type      TEXT NOT NULL CHECK (itc_type IN ('central','state','integrated','cess')),
  amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
  eligible      BOOLEAN DEFAULT TRUE,
  period        TEXT NOT NULL,
  status        TEXT DEFAULT 'available' CHECK (status IN ('available','claimed','reversed','lapsed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gst_payments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  challan_no    TEXT NOT NULL,
  period        TEXT NOT NULL,
  return_type   TEXT NOT NULL CHECK (return_type IN ('GSTR1','GSTR3B','GSTR9')),
  amount        NUMERIC(14,2) NOT NULL,
  payment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  mode          TEXT DEFAULT 'online' CHECK (mode IN ('online','bank','cash','adjustment')),
  cpin          TEXT,
  bank_ref_no   TEXT,
  status        TEXT DEFAULT 'paid' CHECK (status IN ('pending','paid','bounced')),
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS industry_configs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  industry_type   TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  features        JSONB DEFAULT '[]',
  default_accounts JSONB DEFAULT '[]',
  gst_required    BOOLEAN DEFAULT TRUE,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  user_id       UUID REFERENCES auth.users(id),
  action        TEXT NOT NULL,
  table_name    TEXT,
  record_id     BIGINT,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS keepalive (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pinged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tds_challans (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  challan_no    TEXT NOT NULL,
  section       TEXT,
  tds_type      TEXT NOT NULL CHECK (tds_type IN ('tds','tcs')),
  amount        NUMERIC(14,2) NOT NULL,
  deposit_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  bsr_code      TEXT,
  mode          TEXT DEFAULT 'online' CHECK (mode IN ('online','bank','cash')),
  status        TEXT DEFAULT 'paid' CHECK (status IN ('paid','pending','bounced')),
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tds_certificates (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id          BIGINT REFERENCES organizations(id),
  party_id        BIGINT REFERENCES parties(id),
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('form16','form16a','form27d','form16e')),
  financial_year  TEXT NOT NULL,
  quarter         TEXT CHECK (quarter IN ('Q1','Q2','Q3','Q4','Annual')),
  section         TEXT,
  total_amount    NUMERIC(14,2) DEFAULT 0,
  tds_amount      NUMERIC(14,2) DEFAULT 0,
  certificate_no  TEXT,
  issue_date      DATE,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','issued','received')),
  file_url        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centres (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  name          TEXT NOT NULL,
  code          TEXT,
  description   TEXT,
  parent_id     BIGINT REFERENCES cost_centres(id),
  is_active     BOOLEAN DEFAULT TRUE,
  UNIQUE(org_id, name)
);

CREATE TABLE IF NOT EXISTS budgets (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id          BIGINT REFERENCES organizations(id),
  fiscal_year     TEXT NOT NULL,
  account_id      BIGINT REFERENCES chart_of_accounts(id),
  cost_centre_id  BIGINT REFERENCES cost_centres(id),
  budget_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent_amount    NUMERIC(14,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_backups (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  file_name     TEXT NOT NULL,
  file_url      TEXT,
  file_size     BIGINT,
  table_count   INTEGER,
  record_count  INTEGER,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  error_msg     TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eway_bills (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id            BIGINT REFERENCES organizations(id),
  ewb_no            TEXT UNIQUE,
  ewb_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  invoice_id        BIGINT REFERENCES invoices(id),
  invoice_no        TEXT NOT NULL,
  invoice_date      DATE NOT NULL,
  doc_type          TEXT DEFAULT 'INV' CHECK (doc_type IN ('INV','BOS','CHL','OTH')),
  from_gstin        TEXT NOT NULL,
  from_name         TEXT,
  from_address      TEXT,
  from_pincode      TEXT,
  from_state_code   INTEGER,
  to_gstin          TEXT,
  to_name           TEXT,
  to_address        TEXT,
  to_pincode        TEXT,
  to_state_code     INTEGER,
  total_value       NUMERIC(14,2) NOT NULL DEFAULT 0,
  taxable_amt       NUMERIC(14,2) DEFAULT 0,
  cgst_amt          NUMERIC(14,2) DEFAULT 0,
  sgst_amt          NUMERIC(14,2) DEFAULT 0,
  igst_amt          NUMERIC(14,2) DEFAULT 0,
  cess_amt          NUMERIC(14,2) DEFAULT 0,
  hsn_code          TEXT,
  transporter_id    TEXT,
  transporter_name  TEXT,
  transporter_doc_no TEXT,
  transporter_doc_date DATE,
  vehicle_no        TEXT,
  distance_km       INTEGER,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  part_b_generated  BOOLEAN DEFAULT FALSE,
  json_response     JSONB,
  error_msg         TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eway_distance (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_pincode  TEXT NOT NULL,
  to_pincode    TEXT NOT NULL,
  distance_km   INTEGER NOT NULL,
  route_desc    TEXT
);

-- 2. Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_itc ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tds_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eway_bills ENABLE ROW LEVEL SECURITY;

-- Add cost_centre_id to journal_lines
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS cost_centre_id BIGINT REFERENCES cost_centres(id);

-- 3. RLS Policies
-- Org isolation: user sees only their org's data
CREATE POLICY org_isolation ON organizations
  FOR ALL USING (
    id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON products
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON invoices
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON invoice_lines
  FOR ALL USING (
    invoice_id IN (SELECT id FROM invoices WHERE org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY org_isolation ON parties
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON chart_of_accounts
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON journal_entries
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON journal_lines
  FOR ALL USING (
    entry_id IN (SELECT id FROM journal_entries WHERE org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY org_isolation ON payments
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON product_variants
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON inventory_batches
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON inventory_serial_numbers
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON gst_records
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON gst_itc
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON gst_payments
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON audit_log
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON tds_challans
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON tds_certificates
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON cost_centres
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON budgets
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON org_backups
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON bank_statements
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON bank_transactions
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY org_isolation ON eway_bills
  FOR ALL USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

-- User profiles: self-read, org-read
CREATE POLICY user_profiles_self ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY user_profiles_org ON user_profiles
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY user_profiles_admin ON user_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can create organizations
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can read any organization (needed for post-insert select and profile linking)
CREATE POLICY "Users can read organizations" ON organizations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own organization (by checking profile link)
CREATE POLICY "Users can update own org" ON organizations
  FOR UPDATE USING (
    id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
  );

-- Admin: full access to all org data
CREATE POLICY admin_all ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- User profiles self-insert (during registration)
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- User profiles self-update (e.g. org_id, phone)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Public: can read GST rates and industry configs
CREATE POLICY gst_rates_public ON gst_rates FOR SELECT USING (true);
CREATE POLICY industry_configs_public ON industry_configs FOR SELECT USING (true);

-- 4. Seed industry configs
INSERT INTO industry_configs (industry_type, label, features) VALUES
  ('retail','Retail Shop','["billing","inventory","gst"]'),
  ('pharmacy','Pharmacy','["batch","expiry","schedule_h","gst"]'),
  ('fmcg','FMCG','["batch","expiry","distribution","gst"]'),
  ('auto_parts','Auto Parts','["serial_no","interchangeable","gst"]'),
  ('food_beverages','Food & Beverages','["batch","expiry","fssai","gst"]'),
  ('chemical','Chemical','["batch","hazardous","gst"]'),
  ('computer_hardware','Computer Hardware','["serial_no","warranty","gst"]'),
  ('furniture','Furniture','["attributes","dimensions","gst"]'),
  ('book_publishing','Book Publishing','["isbn","author","edition","gst"]'),
  ('travel','Travel','["booking","itinerary","gst"]'),
  ('electrical','Electrical','["serial_no","warranty","gst"]'),
  ('paper_mill','Paper Mill','["batch","weight","gst"]'),
  ('paint','Paint','["batch","shade","gst"]'),
  ('mobile','Mobile','["imei","brand","warranty","gst"]'),
  ('garments','Garments','["size","color","season","gst"]'),
  ('jewellery','Jewellery','["hallmark","carat","weight","gst"]'),
  ('agriculture','Agriculture','["mandi","commission","gst"]'),
  ('stationery','Stationery','["batch","gst"]'),
  ('electronics','Electronics','["serial_no","warranty","gst"]'),
  ('real_estate','Real Estate','["project","unit","rera","gst"]'),
  ('grocery','Grocery','["batch","expiry","gst"]'),
  ('ecommerce','Ecommerce','["order_sync","marketplace","gst"]')
ON CONFLICT (industry_type) DO NOTHING;

-- 5. Seed GST rates (see seed-hsn-sac.sql for 185+ comprehensive codes)
INSERT INTO gst_rates VALUES
  ('0101','Live animals',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
  ('0402','Milk powder',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
  ('0901','Coffee',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
  ('1701','Sugar',2.5,2.5,5,0,'2017-07-01','9999-12-31'),
  ('2710','Petroleum',NULL,NULL,NULL,0,'2017-07-01','9999-12-31'),
  ('3004','Pharmaceuticals',6,6,12,0,'2017-07-01','9999-12-31'),
  ('6204','Women garments',6,6,12,0,'2017-07-01','9999-12-31'),
  ('8471','Computers',9,9,18,0,'2017-07-01','9999-12-31'),
  ('8517','Mobile phones',9,9,18,0,'2017-07-01','9999-12-31'),
  ('9999','Services (general)',9,9,18,0,'2017-07-01','9999-12-31')
ON CONFLICT (hsn_code) DO UPDATE SET description = EXCLUDED.description;

-- 6. Functions
CREATE OR REPLACE FUNCTION next_invoice_no(org_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix TEXT;
  next_num INT;
BEGIN
  SELECT COALESCE(settings->>'invoice_prefix', 'INV-') INTO prefix
  FROM organizations WHERE id = org_id_param;
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_no, '-', 2) AS INTEGER)), 0) + 1
  INTO next_num FROM invoices WHERE org_id = org_id_param;
  RETURN prefix || LPAD(next_num::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION calculate_gst(
  taxable_amt NUMERIC,
  gst_rate NUMERIC,
  place_of_supply TEXT,
  org_state TEXT
) RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cgst NUMERIC;
  sgst NUMERIC;
  igst NUMERIC;
BEGIN
  IF place_of_supply = org_state THEN
    cgst := ROUND(taxable_amt * gst_rate / 200, 2);
    sgst := cgst;
    igst := 0;
  ELSE
    cgst := 0;
    sgst := 0;
    igst := ROUND(taxable_amt * gst_rate / 100, 2);
  END IF;
  RETURN jsonb_build_object('cgst', cgst, 'sgst', sgst, 'igst', igst);
END;
$$;

CREATE OR REPLACE FUNCTION generate_irn(invoice_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  irn_val TEXT;
BEGIN
  irn_val := 'IRN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 12));
  UPDATE invoices SET irn = irn_val, status = 'sent' WHERE id = invoice_id;
  RETURN jsonb_build_object('irn', irn_val);
END;
$$;

CREATE OR REPLACE FUNCTION generate_ewaybill(invoice_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ewb_val TEXT;
BEGIN
  ewb_val := 'EWB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  UPDATE invoices SET eway_bill_no = ewb_val WHERE id = invoice_id;
  RETURN jsonb_build_object('eway_bill_no', ewb_val);
END;
$$;

CREATE OR REPLACE FUNCTION get_dashboard_kpis(org_id_param BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_invoices', (SELECT COUNT(*) FROM invoices WHERE org_id = org_id_param),
    'pending_invoices', (SELECT COUNT(*) FROM invoices WHERE org_id = org_id_param AND status IN ('draft','sent','overdue')),
    'paid_invoices', (SELECT COUNT(*) FROM invoices WHERE org_id = org_id_param AND status = 'paid'),
    'total_revenue', (SELECT COALESCE(SUM(total), 0) FROM invoices WHERE org_id = org_id_param AND status = 'paid'),
    'total_parties', (SELECT COUNT(*) FROM parties WHERE org_id = org_id_param),
    'total_products', (SELECT COUNT(*) FROM products WHERE org_id = org_id_param),
    'low_stock_items', (SELECT COUNT(*) FROM inventory_batches WHERE org_id = org_id_param AND quantity < 10),
    'total_gst_payable', (SELECT COALESCE(SUM(cgst_amt + sgst_amt + igst_amt), 0) FROM invoices WHERE org_id = org_id_param AND status = 'paid')
  ) INTO result;
  RETURN result;
END;
$$;

-- 7b. Advanced billing tables
CREATE TABLE IF NOT EXISTS godowns (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  name          TEXT NOT NULL,
  location      TEXT,
  address       TEXT,
  manager       TEXT,
  contact       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE godowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON godowns FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_godowns_org ON godowns(org_id);

CREATE TABLE IF NOT EXISTS payment_reminders (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  invoice_id    BIGINT REFERENCES invoices(id),
  party_id      BIGINT REFERENCES parties(id),
  reminder_type TEXT DEFAULT 'email' CHECK (reminder_type IN ('email','sms','whatsapp')),
  frequency     TEXT DEFAULT 'weekly' CHECK (frequency IN ('daily','weekly','monthly')),
  last_sent_at  TIMESTAMPTZ,
  next_send_at  TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON payment_reminders FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_payment_reminders_org ON payment_reminders(org_id);

CREATE TABLE IF NOT EXISTS tds_rates (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section         TEXT NOT NULL,
  description     TEXT,
  rate            NUMERIC(5,2) NOT NULL,
  threshold       NUMERIC(14,2),
  threshold_limit NUMERIC(14,2),
  surcharge       NUMERIC(5,2) DEFAULT 0,
  cess            NUMERIC(5,2) DEFAULT 0,
  effective_from  DATE,
  effective_to    DATE
);
ALTER TABLE tds_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY tds_rates_public ON tds_rates FOR SELECT USING (true);

-- 7c. Invoice doc_type, TDS/TCS, godown columns (added IF NOT EXISTS)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'invoice' CHECK (doc_type IN ('quotation','order','challan','proforma','invoice'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tds_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tds_amt NUMERIC(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tcs_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tcs_amt NUMERIC(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS upi_qr TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ref_number TEXT;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS godown_id BIGINT REFERENCES godowns(id);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12,3) DEFAULT 0;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS max_stock NUMERIC(12,3) DEFAULT 0;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(12,3) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(org_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_invoices_valid_until ON invoices(org_id, valid_until);
CREATE INDEX IF NOT EXISTS idx_inv_batches_godown ON inventory_batches(godown_id);

-- 7d. Extended statuses for doc workflow
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft','sent','accepted','rejected','expired','confirmed','processing','shipped','delivered','paid','overdue','cancelled','converted'));

-- 7f. Bank reconciliation tables
CREATE TABLE IF NOT EXISTS bank_statements (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  bank_name     TEXT,
  account_no    TEXT,
  statement_date DATE,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON bank_statements FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id            BIGINT REFERENCES organizations(id),
  statement_id      BIGINT REFERENCES bank_statements(id) ON DELETE CASCADE,
  txn_date          DATE NOT NULL,
  narration         TEXT,
  debit             NUMERIC(14,2) DEFAULT 0,
  credit            NUMERIC(14,2) DEFAULT 0,
  balance           NUMERIC(14,2),
  ref_no            TEXT,
  matched_payment_id BIGINT REFERENCES payments(id),
  matched_invoice_id BIGINT REFERENCES invoices(id),
  match_status      TEXT DEFAULT 'unmatched' CHECK (match_status IN ('unmatched','auto_matched','manual_matched','ignored')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON bank_transactions FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bank_txn_date ON bank_transactions(org_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_bank_txn_match ON bank_transactions(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_txn_statement ON bank_transactions(statement_id);

-- 7e. Indexes
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_org ON chart_of_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_parties_org ON parties(org_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_party ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(org_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(org_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_gst_itc_org ON gst_itc(org_id);
CREATE INDEX IF NOT EXISTS idx_gst_itc_period ON gst_itc(org_id, period);
CREATE INDEX IF NOT EXISTS idx_gst_payments_org ON gst_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_gst_payments_period ON gst_payments(org_id, period);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_tds_challans_org ON tds_challans(org_id);
CREATE INDEX IF NOT EXISTS idx_tds_certs_org ON tds_certificates(org_id, party_id);
CREATE INDEX IF NOT EXISTS idx_cost_centres_org ON cost_centres(org_id);
CREATE INDEX IF NOT EXISTS idx_budgets_org ON budgets(org_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_eway_org ON eway_bills(org_id);
CREATE INDEX IF NOT EXISTS idx_eway_invoice ON eway_bills(invoice_id);
CREATE INDEX IF NOT EXISTS idx_eway_status ON eway_bills(org_id, status);
CREATE INDEX IF NOT EXISTS idx_eway_ewb ON eway_bills(ewb_no);
CREATE INDEX IF NOT EXISTS idx_eway_dist ON eway_distance(from_pincode, to_pincode);
