-- ============================================================
-- Add the two free Claude certification ebooks to the Marketplace
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- Both entries mirror the "html tutorial - complete guide" pattern:
-- price 0, GST 0, active and approved, with tutorial_slug pointing at
-- the folder under /tutorials so the card shows "FREE / Start Reading".
-- ============================================================

-- 1. Free study guide: Claude Certified Associate (CCAO-F)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Free study guide: Claude Certified Associate (CCAO-F): Complete Exam Prep',
  'ccao-f-complete-exam-prep',
  'An independent, original ebook of about 200 pages covering the CCAO-F exam domains, prompting, verification, models, workflow design, governance, and exam practice. Read it online or print it to PDF.',
  0.00, 9999, 'ccao-f-complete-exam-prep', 0, true, true,
  '/tutorials/ccao-f-complete-exam-prep/ebook.html',
  'ccao-f-complete-exam-prep',
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

-- 2. Free full-prep course: Claude Certified Architect — Foundations (CCAR-F)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Free full-prep course: Claude Certified Architect — Foundations (CCAR-F)',
  'ccar-f-full-prep',
  'An independent, original 200-page full-prep course covering the five architectural layers (agentic, tool, workflow, prompt, context), cross-layer patterns, two practice papers, applied case studies, and a managed agent workspace. Read online or print to PDF.',
  0.00, 9999, 'ccar-f-full-prep', 0, true, true,
  '/tutorials/ccar-f-full-prep/ebook.html',
  'ccar-f-full-prep',
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

-- 3. Keep the legacy shop_products table in sync (used by older paywall code).
INSERT INTO shop_products (title, slug, description, price, pdf_url, cover_image, tutorial_slug)
VALUES (
  'Free study guide: Claude Certified Associate (CCAO-F): Complete Exam Prep',
  'ccao-f-complete-exam-prep',
  'An independent, original ebook of about 200 pages. Read it online or print it to PDF.',
  0.00,
  '/tutorials/ccao-f-complete-exam-prep/ebook.html',
  '',
  'ccao-f-complete-exam-prep'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = 0.00,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;

INSERT INTO shop_products (title, slug, description, price, pdf_url, cover_image, tutorial_slug)
VALUES (
  'Free full-prep course: Claude Certified Architect — Foundations (CCAR-F)',
  'ccar-f-full-prep',
  'An independent, original 200-page full-prep course. Read it online or print it to PDF.',
  0.00,
  '/tutorials/ccar-f-full-prep/ebook.html',
  '',
  'ccar-f-full-prep'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = 0.00,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;
