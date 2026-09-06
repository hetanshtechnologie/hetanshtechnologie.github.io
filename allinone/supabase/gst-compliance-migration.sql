-- GST Compliance Module: ITC table, Payments table, IRN/EWB functions

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

ALTER TABLE gst_itc ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gst_itc' AND policyname = 'org_isolation') THEN
    CREATE POLICY org_isolation ON gst_itc FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gst_payments' AND policyname = 'org_isolation') THEN
    CREATE POLICY org_isolation ON gst_payments FOR ALL USING (org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gst_itc_org ON gst_itc(org_id);
CREATE INDEX IF NOT EXISTS idx_gst_itc_period ON gst_itc(org_id, period);
CREATE INDEX IF NOT EXISTS idx_gst_payments_org ON gst_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_gst_payments_period ON gst_payments(org_id, period);

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
