-- Bank Reconciliation tables

CREATE TABLE IF NOT EXISTS bank_statements (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id        BIGINT REFERENCES organizations(id),
  bank_name     TEXT,
  account_no    TEXT,
  statement_date DATE,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY org_isolation ON bank_statements FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY org_isolation ON bank_transactions FOR ALL
  USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bank_txn_date ON bank_transactions(org_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_bank_txn_match ON bank_transactions(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_txn_statement ON bank_transactions(statement_id);
