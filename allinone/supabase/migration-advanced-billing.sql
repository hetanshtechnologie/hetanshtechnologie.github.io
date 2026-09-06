-- ============================================================
-- Migration: Advanced Billing Workflow + Inventory Enhancement
-- Phase 1: doc_type workflow, TDS/TCS, godowns, share features
-- ============================================================

-- 1. Add doc_type to invoices (Quotation → Order → Challan → Proforma → Invoice)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'invoice'
  CHECK (doc_type IN ('quotation','order','challan','proforma','invoice'));

-- Relax status constraint to cover all doc types
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft','sent','accepted','rejected','expired','confirmed','processing','shipped','delivered','paid','overdue','cancelled','converted'));

-- Add TDS/TCS fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tds_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tds_amt NUMERIC(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tcs_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tcs_amt NUMERIC(14,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS upi_qr TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ref_number TEXT;

-- 2. Invoice lines: add TDS/TCS and discount fields
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS tds_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS tds_amt NUMERIC(14,2) DEFAULT 0;
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS additional_charges NUMERIC(14,2) DEFAULT 0;
ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS cess_amt NUMERIC(14,2) DEFAULT 0;

-- 3. Multi-godown/warehouse management
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

-- Add godown_id to inventory_batches (each batch lives in a godown)
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS godown_id BIGINT REFERENCES godowns(id);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12,3) DEFAULT 0;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS max_stock NUMERIC(12,3) DEFAULT 0;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(12,3) DEFAULT 0;

-- 4. Payment reminders table
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

-- 5. TDS master table
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

-- Seed standard TDS rates
INSERT INTO tds_rates (section, description, rate, threshold, threshold_limit, effective_from) VALUES
  ('192','Salary',0,250000,500000,'2020-04-01'),
  ('194A','Interest other than securities',10,5000,100000,'2020-04-01'),
  ('194B','Lotteries/crossword puzzles',30,10000,10000,'2020-04-01'),
  ('194C','Contractor/subleasing payments',1,30000,100000,'2020-04-01'),
  ('194H','Commission/brokerage',5,15000,100000,'2020-04-01'),
  ('194I','Rent - land/building/machinery',10,240000,240000,'2020-04-01'),
  ('194J','Professional/technical/medical fees',10,30000,30000,'2020-04-01'),
  ('194Q','Purchase of goods (TDS)',0.1,5000000,null,'2021-07-01'),
  ('206C','TCS - sale of goods',0.1,5000000,null,'2021-07-01')
ON CONFLICT DO NOTHING;

-- 6. Constraints
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tds_section_desc') THEN ALTER TABLE tds_rates ADD CONSTRAINT uq_tds_section_desc UNIQUE (section, description); END IF; END $$;

-- 7. RLS policies for new tables
CREATE POLICY org_isolation ON godowns FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY org_isolation ON payment_reminders FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY tds_rates_public ON tds_rates FOR SELECT USING (true);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_doc_type ON invoices(org_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_invoices_valid_until ON invoices(org_id, valid_until);
CREATE INDEX IF NOT EXISTS idx_godowns_org ON godowns(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_org ON payment_reminders(org_id);
CREATE INDEX IF NOT EXISTS idx_inv_batches_godown ON inventory_batches(godown_id);
