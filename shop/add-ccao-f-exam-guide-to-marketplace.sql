-- ============================================================
-- Add "Claude Certified Associate Foundations (CCAO-F) Exam Guide"
-- ebook to the Marketplace
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Claude Certified Associate Foundations (CCAO-F) Exam Guide',
  'ccao-f-exam-guide',
  'An original, independently written 200-page study guide for a foundations-level exam on using an AI assistant effectively, accurately, and responsibly. Twenty chapters across eight parts cover workspace orientation, prompting foundations, output verification, models and context, business analysis and workflow design, projects and data governance, scenario practice with two full practice papers, and final revision strategy. Written from first principles with no course material reproduced.',
  500.00, 9999, 'ccao-f-exam-guide', 0, true, true,
  '/tutorials/ccao-f-exam-guide/ccao-f-exam-guide.pdf',
  'ccao-f-exam-guide',
  '[]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  vendor_id = 1,
  category_id = (SELECT id FROM ec_categories WHERE slug = 'books'),
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug,
  is_active = true,
  is_approved = true;

-- 2. Add to shop products (used by the tutorial paywall purchase check)
INSERT INTO shop_products (title, slug, description, price, pdf_url, cover_image, tutorial_slug)
VALUES (
  'Claude Certified Associate Foundations (CCAO-F) Exam Guide',
  'ccao-f-exam-guide',
  'An original, independent study guide with 20 chapters and two full practice papers, covering prompting, verification, models, context, governance, and exam strategy.',
  500.00,
  '/tutorials/ccao-f-exam-guide/ccao-f-exam-guide.pdf',
  '',
  'ccao-f-exam-guide'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;
