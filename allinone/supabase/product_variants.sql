-- Add product_variants table (idempotent)
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

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'org_isolation') THEN
    CREATE POLICY org_isolation ON product_variants
      FOR ALL USING (
        org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
