-- ============================================================================
-- BillEase v2 - Multi-tenant Billing, POS & Restaurant Suite
--
-- NOTE: This is a clean v2 schema. It DROPS all existing be_* tables first,
-- so you can re-run it safely during development.
--
-- Multi-tenancy model:
--   be_businesses  -> tenant (restaurant, cafe, retail shop, ...)
--   be_members     -> which users belong to which business + role
--   Every domain table is scoped by business_id and protected by RLS that
--   checks membership (be_is_member).
--
-- Run order: schema.sql -> (seed.sql optional) -> use the app.
-- ============================================================================

-- ---------- Clean slate (v2) ----------
DROP TABLE IF EXISTS be_loyalty_ledger CASCADE;
DROP TABLE IF EXISTS be_campaigns CASCADE;
DROP TABLE IF EXISTS be_eway_bills CASCADE;
DROP TABLE IF EXISTS be_expenses CASCADE;
DROP TABLE IF EXISTS be_recipe_items CASCADE;
DROP TABLE IF EXISTS be_tables CASCADE;
DROP TABLE IF EXISTS be_payments CASCADE;
DROP TABLE IF EXISTS be_invoice_items CASCADE;
DROP TABLE IF EXISTS be_invoices CASCADE;
DROP TABLE IF EXISTS be_parties CASCADE;
DROP TABLE IF EXISTS be_products CASCADE;
DROP TABLE IF EXISTS be_notifications CASCADE;
DROP TABLE IF EXISTS be_members CASCADE;
DROP TABLE IF EXISTS be_businesses CASCADE;
DROP TABLE IF EXISTS be_business_profiles CASCADE;

-- ===========================================================================
-- RLS helper functions
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.be_is_member(biz uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM be_members
                 WHERE business_id = biz AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.be_can_manage(biz uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM be_members
                 WHERE business_id = biz AND user_id = auth.uid()
                   AND role IN ('owner', 'admin'));
$$;

GRANT EXECUTE ON FUNCTION public.be_is_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.be_can_manage(uuid) TO anon, authenticated;

-- Invite a member to a business by email (owner/admin only).
-- Returns the member id or NULL if the email has no account yet.
CREATE OR REPLACE FUNCTION public.be_invite_member(biz uuid, email text, role text DEFAULT 'staff')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  new_id uuid;
BEGIN
  IF NOT public.be_can_manage(biz) THEN
    RAISE EXCEPTION 'Only the owner or an admin can add members';
  END IF;
  SELECT id INTO target FROM auth.users WHERE email = be_invite_member.email LIMIT 1;
  IF target IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO be_members (business_id, user_id, role, can_bill)
  VALUES (biz, target, role, TRUE)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.be_invite_member(uuid, text, text) TO authenticated;

-- List members with their account emails (owner/admin only).
CREATE OR REPLACE FUNCTION public.be_list_members(biz uuid)
RETURNS TABLE(member_id uuid, user_id uuid, email text, role text, can_bill boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.user_id, u.email, m.role, m.can_bill, m.created_at
  FROM be_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.business_id = biz AND public.be_is_member(biz)
  ORDER BY u.email;
$$;

GRANT EXECUTE ON FUNCTION public.be_list_members(uuid) TO authenticated;

-- ===========================================================================
-- 1. Businesses (tenants)
-- ===========================================================================
CREATE TABLE be_businesses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  business_type    TEXT NOT NULL DEFAULT 'retail' CHECK (business_type IN
                    ('restaurant','cafe','cloud_kitchen','bakery','food_stall',
                     'juice_shop','takeaway','canteen','hotel','retail',
                     'wholesale','services','other')),
  gstin            TEXT DEFAULT '',
  fssai            TEXT DEFAULT '',            -- FSSAI licence (food businesses)
  phone            TEXT DEFAULT '',
  email            TEXT DEFAULT '',
  address          TEXT DEFAULT '',
  city             TEXT DEFAULT '',
  state            TEXT DEFAULT '',
  pincode          TEXT DEFAULT '',
  currency         TEXT NOT NULL DEFAULT 'INR',
  gst_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  loyalty_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_prefix   TEXT NOT NULL DEFAULT 'BE',
  invoice_seq      INTEGER NOT NULL DEFAULT 0,
  pos_prefix       TEXT NOT NULL DEFAULT 'POS',
  pos_seq          INTEGER NOT NULL DEFAULT 0,
  opening_cash     DECIMAL(14,2) NOT NULL DEFAULT 0,
  logo_url         TEXT DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE be_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business select" ON be_businesses FOR SELECT
  USING (owner_id = auth.uid() OR be_is_member(id));
CREATE POLICY "business insert" ON be_businesses FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "business update" ON be_businesses FOR UPDATE
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "business delete" ON be_businesses FOR DELETE
  USING (owner_id = auth.uid());

-- ===========================================================================
-- 2. Members (users of a business, with roles)
-- ===========================================================================
CREATE TABLE be_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','admin','staff')),
  can_bill    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id)
);
ALTER TABLE be_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members select" ON be_members FOR SELECT
  USING (user_id = auth.uid() OR be_is_member(business_id));
CREATE POLICY "members insert" ON be_members FOR INSERT
  WITH CHECK (be_can_manage(business_id) OR
    EXISTS (SELECT 1 FROM be_businesses WHERE id = business_id AND owner_id = auth.uid()));
CREATE POLICY "members update" ON be_members FOR UPDATE
  USING (be_can_manage(business_id));
CREATE POLICY "members delete" ON be_members FOR DELETE
  USING (be_can_manage(business_id));

-- ===========================================================================
-- 3. Products (catalogue + kitchen menu + ingredients)
-- ===========================================================================
CREATE TABLE be_products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sku            TEXT DEFAULT '',
  hsn            TEXT DEFAULT '',
  unit           TEXT NOT NULL DEFAULT 'pcs',
  category       TEXT DEFAULT '',
  purchase_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  selling_price  DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate       DECIMAL(5,2) NOT NULL DEFAULT 0,
  stock          DECIMAL(12,2) NOT NULL DEFAULT 0,
  low_stock_at   DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_service     BOOLEAN NOT NULL DEFAULT FALSE,
  is_ingredient  BOOLEAN NOT NULL DEFAULT FALSE,  -- raw material for recipes
  available      BOOLEAN NOT NULL DEFAULT TRUE,   -- menu availability (sold out)
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_be_products_biz ON be_products(business_id);
CREATE INDEX idx_be_products_cat ON be_products(business_id, category);
ALTER TABLE be_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products access" ON be_products FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 4. Recipes (dish -> ingredient bill of materials)
-- ===========================================================================
CREATE TABLE be_recipe_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES be_products(id) ON DELETE CASCADE,   -- dish
  ingredient_id UUID NOT NULL REFERENCES be_products(id) ON DELETE CASCADE,   -- ingredient
  qty           DECIMAL(12,4) NOT NULL DEFAULT 1,                             -- per dish unit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, ingredient_id)
);
CREATE INDEX idx_be_recipe_dish ON be_recipe_items(product_id);
ALTER TABLE be_recipe_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes access" ON be_recipe_items FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 5. Tables (dine-in)
-- ===========================================================================
CREATE TABLE be_tables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  seats       INTEGER NOT NULL DEFAULT 4,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, name)
);
ALTER TABLE be_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables access" ON be_tables FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 6. Parties (customers & suppliers)
-- ===========================================================================
CREATE TABLE be_parties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer','vendor')),
  name            TEXT NOT NULL,
  company         TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  gstin           TEXT DEFAULT '',
  billing_address TEXT DEFAULT '',
  credit_limit    DECIMAL(14,2) NOT NULL DEFAULT 0,
  opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  loyalty_points  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_be_parties_biz ON be_parties(business_id);
ALTER TABLE be_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties access" ON be_parties FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 7. Invoices / orders
--    status: open (running bill), sent (sent to kitchen / awaiting payment),
--            ready, served, draft, partially_paid, paid, overdue, cancelled
-- ===========================================================================
CREATE TABLE be_invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  invoice_number   TEXT NOT NULL,
  party_id         UUID REFERENCES be_parties(id) ON DELETE SET NULL,
  table_id         UUID REFERENCES be_tables(id) ON DELETE SET NULL,
  waiter           TEXT DEFAULT '',
  type             TEXT NOT NULL DEFAULT 'sale'
                     CHECK (type IN ('sale','purchase','quotation','pos')),
  dine_type        TEXT NOT NULL DEFAULT 'dine_in'
                     CHECK (dine_type IN ('dine_in','takeaway','delivery','online')),
  platform         TEXT DEFAULT '',            -- Swiggy / Zomato / Website
  platform_fee     DECIMAL(14,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('open','sent','ready','served','draft',
                                       'partially_paid','paid','overdue','cancelled')),
  sent_to_kitchen  BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date         DATE,
  place_of_supply  TEXT DEFAULT '',
  items_total      DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount  DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_amount       DECIMAL(14,2) NOT NULL DEFAULT 0,
  shipping_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
  total            DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes            TEXT DEFAULT '',
  eway_number      TEXT DEFAULT '',
  eway_status      TEXT DEFAULT '',
  irn              TEXT DEFAULT '',
  ack_no           TEXT DEFAULT '',
  ack_date         TEXT DEFAULT '',
  qr_data          TEXT DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, invoice_number)
);
CREATE INDEX idx_be_invoices_biz ON be_invoices(business_id);
CREATE INDEX idx_be_invoices_party ON be_invoices(party_id);
CREATE INDEX idx_be_invoices_table ON be_invoices(table_id);
CREATE INDEX idx_be_invoices_date ON be_invoices(invoice_date);
CREATE INDEX idx_be_invoices_status ON be_invoices(status);
ALTER TABLE be_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices access" ON be_invoices FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 8. Invoice items
-- ===========================================================================
CREATE TABLE be_invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  invoice_id    UUID NOT NULL REFERENCES be_invoices(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES be_products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  hsn           TEXT DEFAULT '',
  qty           DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit          TEXT NOT NULL DEFAULT 'pcs',
  rate          DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_rate      DECIMAL(5,2) NOT NULL DEFAULT 0,
  amount        DECIMAL(14,2) NOT NULL DEFAULT 0,
  special_notes TEXT DEFAULT '',               -- kitchen / prep / allergy notes
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_be_invoice_items_inv ON be_invoice_items(invoice_id);
ALTER TABLE be_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice items access" ON be_invoice_items FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 9. Payments / transactions
-- ===========================================================================
CREATE TABLE be_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  invoice_id   UUID REFERENCES be_invoices(id) ON DELETE CASCADE,
  party_id     UUID REFERENCES be_parties(id) ON DELETE CASCADE,
  direction    TEXT NOT NULL DEFAULT 'received' CHECK (direction IN ('received','paid')),
  amount       DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  method       TEXT NOT NULL DEFAULT 'cash'
                 CHECK (method IN ('cash','upi','bank','card','credit','online','other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_be_payments_biz ON be_payments(business_id);
CREATE INDEX idx_be_payments_invoice ON be_payments(invoice_id);
CREATE INDEX idx_be_payments_party ON be_payments(party_id);
ALTER TABLE be_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments access" ON be_payments FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 10. Expenses (bookkeeping)
-- ===========================================================================
CREATE TABLE be_expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  category       TEXT NOT NULL DEFAULT 'General',
  amount         DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash'
                   CHECK (payment_method IN ('cash','upi','bank','card','other')),
  vendor_name    TEXT DEFAULT '',
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_be_expenses_biz ON be_expenses(business_id);
CREATE INDEX idx_be_expenses_date ON be_expenses(expense_date);
ALTER TABLE be_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses access" ON be_expenses FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 11. e-Way bills
-- ===========================================================================
CREATE TABLE be_eway_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  invoice_id      UUID REFERENCES be_invoices(id) ON DELETE SET NULL,
  eway_number     TEXT NOT NULL,
  transporter_name TEXT DEFAULT '',
  transporter_id  TEXT DEFAULT '',
  vehicle_no      TEXT DEFAULT '',
  vehicle_type    TEXT DEFAULT '',
  from_state      TEXT DEFAULT '',
  to_state        TEXT DEFAULT '',
  from_pincode    TEXT DEFAULT '',
  to_pincode      TEXT DEFAULT '',
  distance_km     INTEGER DEFAULT 0,
  value           DECIMAL(14,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'generated'
                    CHECK (status IN ('generated','valid','extended','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE be_eway_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eway access" ON be_eway_bills FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 12. Marketing campaigns
-- ===========================================================================
CREATE TABLE be_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT DEFAULT '',
  channel       TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','email','sms')),
  audience      TEXT NOT NULL DEFAULT 'customers' CHECK (audience IN ('customers','vendors','loyalty')),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent')),
  sent_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE be_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns access" ON be_campaigns FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 13. Loyalty points ledger
-- ===========================================================================
CREATE TABLE be_loyalty_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  party_id    UUID NOT NULL REFERENCES be_parties(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,                 -- +earned / -redeemed
  reason      TEXT DEFAULT '',
  invoice_id  UUID REFERENCES be_invoices(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE be_loyalty_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty access" ON be_loyalty_ledger FOR ALL
  USING (be_is_member(business_id)) WITH CHECK (be_is_member(business_id));

-- ===========================================================================
-- 14. Notifications
-- ===========================================================================
CREATE TABLE be_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES be_businesses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','error')),
  link        TEXT DEFAULT '',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_be_notifications_biz ON be_notifications(business_id);
ALTER TABLE be_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications access" ON be_notifications FOR ALL
  USING (be_is_member(business_id) AND user_id = auth.uid());

-- ===========================================================================
-- Triggers
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_biz_updated BEFORE UPDATE ON be_businesses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_prod_updated BEFORE UPDATE ON be_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_party_updated BEFORE UPDATE ON be_parties
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON be_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_eway_updated BEFORE UPDATE ON be_eway_bills
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Keep be_invoices.paid_amount and status in sync with its payments.
-- Status is only auto-flipped to paid / partially_paid; other statuses
-- (open / sent / ready / served / overdue / cancelled) are preserved.
CREATE OR REPLACE FUNCTION public.sync_invoice_paid_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  inv_id UUID;
  inv_total DECIMAL(14,2);
  inv_paid DECIMAL(14,2);
  inv_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    inv_id := OLD.invoice_id;
  ELSE
    inv_id := NEW.invoice_id;
  END IF;

  IF inv_id IS NOT NULL THEN
    SELECT total INTO inv_total FROM be_invoices WHERE id = inv_id;
    SELECT COALESCE(SUM(amount), 0) INTO inv_paid
      FROM be_payments WHERE invoice_id = inv_id;
    IF inv_total IS NOT NULL AND inv_paid >= inv_total AND inv_total > 0 THEN
      inv_status := 'paid';
    ELSIF inv_paid > 0 THEN
      inv_status := 'partially_paid';
    END IF;
    UPDATE be_invoices
      SET paid_amount = inv_paid,
          status = CASE WHEN status = 'cancelled' THEN status
                        WHEN inv_status IS NOT NULL THEN inv_status
                        ELSE status END,
          updated_at = NOW()
      WHERE id = inv_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_payment_sync_insert AFTER INSERT ON be_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_paid_amount();
CREATE TRIGGER trg_payment_sync_delete AFTER DELETE ON be_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_paid_amount();

-- Grants
GRANT ALL ON be_businesses TO authenticated;
GRANT ALL ON be_members TO authenticated;
GRANT ALL ON be_products TO authenticated;
GRANT ALL ON be_recipe_items TO authenticated;
GRANT ALL ON be_tables TO authenticated;
GRANT ALL ON be_parties TO authenticated;
GRANT ALL ON be_invoices TO authenticated;
GRANT ALL ON be_invoice_items TO authenticated;
GRANT ALL ON be_payments TO authenticated;
GRANT ALL ON be_expenses TO authenticated;
GRANT ALL ON be_eway_bills TO authenticated;
GRANT ALL ON be_campaigns TO authenticated;
GRANT ALL ON be_loyalty_ledger TO authenticated;
GRANT ALL ON be_notifications TO authenticated;
