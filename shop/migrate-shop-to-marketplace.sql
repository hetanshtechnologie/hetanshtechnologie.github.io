-- ============================================================
-- Migration: Move Shop (Tutorial E-Books) to Marketplace
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add pdf_url and tutorial_slug columns to ec_products
ALTER TABLE ec_products ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE ec_products ADD COLUMN IF NOT EXISTS tutorial_slug TEXT;

-- 2. Insert all shop products into the existing "Books" category (slug='books')
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
SELECT
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  title, slug, description, 500.00, 9999, slug, 0, true, true, pdf_url, tutorial_slug, '[]'::jsonb
FROM shop_products
ON CONFLICT (slug) DO UPDATE SET
  vendor_id = 1,
  category_id = (SELECT id FROM ec_categories WHERE slug = 'books'),
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;
