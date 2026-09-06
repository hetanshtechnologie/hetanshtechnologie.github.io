-- Society Management - Plans & Purchase Schema
-- Run this AFTER society management\sql\schema.sql

-- Plans
CREATE TABLE IF NOT EXISTS society_plans (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  features    JSONB DEFAULT '[]',
  price       INTEGER NOT NULL DEFAULT 0,   -- in paise (₹ = price/100)
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User plan purchases
CREATE TABLE IF NOT EXISTS society_purchases (
  id                       SERIAL PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                  INTEGER NOT NULL REFERENCES society_plans(id),
  status                   TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'blocked', 'expired')),
  razorpay_payment_id      TEXT,
  razorpay_order_id        TEXT,
  current_period_start     TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE society_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE society_purchases ENABLE ROW LEVEL SECURITY;

-- Anyone can read active plans
DROP POLICY IF EXISTS "anyone_read_active_society_plans" ON society_plans;
CREATE POLICY "anyone_read_active_society_plans"
  ON society_plans FOR SELECT
  USING (active = true);

-- Admin can manage plans
DROP POLICY IF EXISTS "admin_manage_society_plans" ON society_plans;
CREATE POLICY "admin_manage_society_plans"
  ON society_plans FOR ALL
  USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

-- Users read own purchase
DROP POLICY IF EXISTS "users_read_own_society_purchase" ON society_purchases;
CREATE POLICY "users_read_own_society_purchase"
  ON society_purchases FOR SELECT
  USING (user_id = auth.uid());

-- Users insert own purchase
DROP POLICY IF EXISTS "users_insert_own_society_purchase" ON society_purchases;
CREATE POLICY "users_insert_own_society_purchase"
  ON society_purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users update own purchase
DROP POLICY IF EXISTS "users_update_own_society_purchase" ON society_purchases;
CREATE POLICY "users_update_own_society_purchase"
  ON society_purchases FOR UPDATE
  USING (user_id = auth.uid());

-- Seed plans
INSERT INTO society_plans (id, name, slug, description, features, price, active) VALUES
  (1, 'Free', 'free', 'Basic society management for small communities',
   '["Up to 10 residents","Basic maintenance tracking","Notice board access","Email support"]'::jsonb,
   0, true),
  (2, 'Standard', 'standard', 'Complete solution for growing societies',
   '["Unlimited residents","Maintenance & billing","Facility booking","Visitor management","Complaint tracking","Community forum","Priority support"]'::jsonb,
   49900, true),
  (3, 'Premium', 'premium', 'Enterprise-grade with all features',
   '["Everything in Standard","Advanced analytics & reports","Parking management","Emergency directory","API access","Dedicated account manager","99.9% uptime SLA"]'::jsonb,
   99900, true)
ON CONFLICT (id) DO NOTHING;

-- Grants
GRANT SELECT ON society_plans TO anon, authenticated;
GRANT ALL ON society_plans TO authenticated;
GRANT USAGE ON SEQUENCE society_plans_id_seq TO authenticated;

GRANT SELECT, INSERT, UPDATE ON society_purchases TO authenticated;
GRANT USAGE ON SEQUENCE society_purchases_id_seq TO authenticated;
