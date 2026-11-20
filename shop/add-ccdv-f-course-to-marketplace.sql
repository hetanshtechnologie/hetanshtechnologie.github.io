-- ============================================================
-- Add the free "Claude Certified Developer - Foundations (CCDV-F) Course"
-- to the Marketplace.
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- The public anon key cannot INSERT into ec_products (row-level security),
-- so this script must be executed once by a project owner.
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Free course: Claude Certified Developer - Foundations (CCDV-F)',
  'ccdv-f-course',
  'An independent, original 200-page course in 30 chapters covering exam orientation, model foundations, API requests, evaluations, images and streaming, prompting and structured output, tools and MCP, agents and workflows, model choice and cost, coding-assistant configuration, debugging, security, and exam readiness. Includes navigation on every page, practice labs, worked scenarios, and checkpoint questions. Read online or download the PDF.',
  0.00, 9999, 'ccdv-f-course', 0, true, true,
  '/tutorials/ccdv-f-course/ccdv-f-course.pdf',
  'ccdv-f-course',
  '[]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  vendor_id = 1,
  category_id = (SELECT id FROM ec_categories WHERE slug = 'books'),
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = 0.00,
  stock = EXCLUDED.stock,
  sku = EXCLUDED.sku,
  gst_rate = 0,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug,
  is_active = true,
  is_approved = true;

-- 2. Add to shop products (used by the older paywall purchase check)
INSERT INTO shop_products (title, slug, description, price, pdf_url, cover_image, tutorial_slug)
VALUES (
  'Free course: Claude Certified Developer - Foundations (CCDV-F)',
  'ccdv-f-course',
  'An independent, original 200-page course in 30 chapters with navigation on every page, practice labs, and checkpoint questions. Read online or download the PDF.',
  0.00,
  '/tutorials/ccdv-f-course/ccdv-f-course.pdf',
  '',
  'ccdv-f-course'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = 0.00,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;
