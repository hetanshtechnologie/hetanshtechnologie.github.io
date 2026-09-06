-- Migration: TDS/TCS certificates + challans, cost centres, budgets, activity log index
-- Run: psql -h aws-0-ap-south-1.pooler.supabase.com -U postgres.vgipghqejzbcoighktij -d postgres -f migration-remaining.sql

-- 1. TDS/TCS Challans (deposits to government)
CREATE TABLE IF NOT EXISTS tds_challans (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  challan_no    TEXT NOT NULL,
  section       TEXT NOT NULL,
  tds_type      TEXT NOT NULL CHECK (tds_type IN ('tds','tcs')),
  amount        NUMERIC(14,2) NOT NULL,
  deposit_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  bsr_code      TEXT,
  mode          TEXT DEFAULT 'online' CHECK (mode IN ('online','bank','cash')),
  status        TEXT DEFAULT 'paid' CHECK (status IN ('paid','pending','bounced')),
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tds_challans ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON tds_challans FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

-- 2. TDS/TCS Certificates (Form 16/16A/27D)
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
ALTER TABLE tds_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON tds_certificates FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

-- 3. Cost Centres
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
ALTER TABLE cost_centres ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON cost_centres FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

-- 4. Budgets
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
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON budgets FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

-- 5. Add cost_centre_id to journal_lines
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS cost_centre_id BIGINT REFERENCES cost_centres(id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_tds_challans_org ON tds_challans(org_id);
CREATE INDEX IF NOT EXISTS idx_tds_certs_org ON tds_certificates(org_id, party_id);
CREATE INDEX IF NOT EXISTS idx_cost_centres_org ON cost_centres(org_id);
CREATE INDEX IF NOT EXISTS idx_budgets_org ON budgets(org_id, fiscal_year);
