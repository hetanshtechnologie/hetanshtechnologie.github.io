-- ============================================================
-- Add "Claude Certified Architect - Professional (CCAR-P) Exam Prep"
-- ebook to the Marketplace
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Claude Certified Architect - Professional (CCAR-P) Exam Prep',
  'ccar-p-exam-guide',
  'An original, independently written professional-level study guide for designing, evaluating, securing, operating, and governing AI-enabled systems. Thirty chapters across eight parts cover outcome framing, orchestration patterns, decomposition, model and instruction design, guardrails, context engineering, caching, tool and retrieval architecture, interoperability, tracing, observability, evaluation, experimentation, reliability, governance, delivery, and integrated capstone practice with full practice exams. Written from first principles with reorganized structure and no reproduced course material.',
  500.00, 9999, 'ccar-p-exam-guide', 0, true, true,
  '/tutorials/ccar-p-exam-guide/ccar-p-exam-prep.pdf',
  'ccar-p-exam-guide',
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

-- 2. Add to shop products (used by the tutorial paywall/purchase check)
INSERT INTO shop_products (title, slug, description, price, pdf_url, cover_image, tutorial_slug)
VALUES (
  'Claude Certified Architect - Professional (CCAR-P) Exam Prep',
  'ccar-p-exam-guide',
  'An original, independent 30-chapter professional exam prep guide covering AI architecture, orchestration, prompting, guardrails, context, retrieval, observability, evaluation, operations, governance, delivery, and practice exams.',
  500.00,
  '/tutorials/ccar-p-exam-guide/ccar-p-exam-prep.pdf',
  '',
  'ccar-p-exam-guide'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;
