-- ============================================================
-- Add all tutorial books generated today to the Marketplace.
-- Run once in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- Covers all 8 tutorial folders:
--   AI-1, CCAR-F, ccao-f-complete-exam-prep, ccao-f-exam-guide,
--   ccar-f-full-prep, ccar-p-exam-guide, ccdv-f-course, ccdv-f-exam-guide
--
-- All are free (price 0, GST 0), active and approved. tutorial_slug points
-- at the exact folder name under /tutorials so each card shows
-- "FREE / Start Reading". Re-running this file is safe (ON CONFLICT).
-- ============================================================

-- 1. Marketplace products (powers the catalog grid, search and FREE cards)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free study guide: AI-1 - Building Production AI Agents',
    'ai-1',
    'An independent, self-paced study companion that turns a one-day AI conference into a structured learning path. Covers agent frameworks, retrieval, tool calling, MCP, evaluation, inference engineering, guardrails, and production deployment patterns. Read online chapter by chapter.',
    0.00, 9999, 'ai-1', 0, true, true,
    '/tutorials/AI-1/index.html', 'AI-1', '[]'::jsonb
  ),
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free study guide: Claude Certified Architect (CCAR-F)',
    'ccar-f',
    'An independent study guide for agentic system design, tool design, coding-assistant workflows, prompting, and context management. The published syllabus is deliberately reorganized into a learning path with worked examples, design trade-offs, exercises, and review questions.',
    0.00, 9999, 'ccar-f', 0, true, true,
    '/tutorials/CCAR-F/index.html', 'CCAR-F', '[]'::jsonb
  ),
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free study guide: Claude Certified Associate (CCAO-F): Complete Exam Prep',
    'ccao-f-complete-exam-prep',
    'An independent, original ebook of about 200 pages covering the CCAO-F exam domains, prompting, verification, models, workflow design, governance, and exam practice. Read online or print it to PDF.',
    0.00, 9999, 'ccao-f-complete-exam-prep', 0, true, true,
    '/tutorials/ccao-f-complete-exam-prep/ebook.html', 'ccao-f-complete-exam-prep', '[]'::jsonb
  ),
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free study guide: Claude Certified Associate Foundations (CCAO-F) Exam Guide',
    'ccao-f-exam-guide',
    'An independent, original 20-chapter study guide for a foundations-level assistant exam. Covers workspace orientation, prompting foundations, output verification, models and context, workflow design, governance, and full practice preparation. Read online or download the PDF.',
    0.00, 9999, 'ccao-f-exam-guide', 0, true, true,
    '/tutorials/ccao-f-exam-guide/ccao-f-exam-guide.pdf', 'ccao-f-exam-guide', '[]'::jsonb
  ),
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free full-prep course: Claude Certified Architect - Foundations (CCAR-F)',
    'ccar-f-full-prep',
    'An independent, original 200-page full-prep course covering the five architectural layers, cross-layer patterns, two practice papers, applied case studies, and a managed agent workspace. Read online or print to PDF.',
    0.00, 9999, 'ccar-f-full-prep', 0, true, true,
    '/tutorials/ccar-f-full-prep/ebook.html', 'ccar-f-full-prep', '[]'::jsonb
  ),
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free study guide: Claude Certified Architect - Professional (CCAR-P)',
    'ccar-p-exam-guide',
    'An independent, original study guide for professional-level AI solution architecture. Covers architecture patterns, model and prompt design, guardrails, context, retrieval, observability, evaluation, operations, governance, and full practice preparation.',
    0.00, 9999, 'ccar-p-exam-guide', 0, true, true,
    '/tutorials/ccar-p-exam-guide/index.html', 'ccar-p-exam-guide', '[]'::jsonb
  ),
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free course: Claude Certified Developer - Foundations (CCDV-F)',
    'ccdv-f-course',
    'An independent, original 200-page course in 30 chapters covering exam orientation, model foundations, API requests, evaluations, prompts and structured output, tools and MCP, agents and workflows, model choice and cost, coding-assistant configuration, debugging, security, and exam readiness. Read online or download the PDF.',
    0.00, 9999, 'ccdv-f-course', 0, true, true,
    '/tutorials/ccdv-f-course/ccdv-f-course.pdf', 'ccdv-f-course', '[]'::jsonb
  ),
  (
    1, (SELECT id FROM ec_categories WHERE slug = 'books'),
    'Free study guide: Claude Certified Developer Foundations (CCDV-F) Exam Guide',
    'ccdv-f-exam-guide',
    'An independent, original study guide with about 203 printed pages covering the CCDV-F exam domains. Written from first principles with no course material reproduced. Read online or print to PDF.',
    0.00, 9999, 'ccdv-f-exam-guide', 0, true, true,
    '/tutorials/ccdv-f-exam-guide/ebook.html', 'ccdv-f-exam-guide', '[]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  vendor_id = EXCLUDED.vendor_id,
  category_id = EXCLUDED.category_id,
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

-- 2. Legacy shop_products table (used by older paywall / purchase checks)
INSERT INTO shop_products (title, slug, description, price, pdf_url, cover_image, tutorial_slug)
VALUES
  ('Free study guide: AI-1 - Building Production AI Agents', 'ai-1', 'An independent, self-paced study companion for building production AI agents.', 0.00, '/tutorials/AI-1/index.html', '', 'AI-1'),
  ('Free study guide: Claude Certified Architect (CCAR-F)', 'ccar-f', 'An independent study guide for agentic system design, tool design, prompting, and context management.', 0.00, '/tutorials/CCAR-F/index.html', '', 'CCAR-F'),
  ('Free study guide: Claude Certified Associate (CCAO-F): Complete Exam Prep', 'ccao-f-complete-exam-prep', 'An independent, original ebook of about 200 pages. Read it online or print it to PDF.', 0.00, '/tutorials/ccao-f-complete-exam-prep/ebook.html', '', 'ccao-f-complete-exam-prep'),
  ('Free study guide: Claude Certified Associate Foundations (CCAO-F) Exam Guide', 'ccao-f-exam-guide', 'An independent, original 20-chapter study guide. Read online or download the PDF.', 0.00, '/tutorials/ccao-f-exam-guide/ccao-f-exam-guide.pdf', '', 'ccao-f-exam-guide'),
  ('Free full-prep course: Claude Certified Architect - Foundations (CCAR-F)', 'ccar-f-full-prep', 'An independent, original 200-page full-prep course. Read online or print to PDF.', 0.00, '/tutorials/ccar-f-full-prep/ebook.html', '', 'ccar-f-full-prep'),
  ('Free study guide: Claude Certified Architect - Professional (CCAR-P)', 'ccar-p-exam-guide', 'An independent, original study guide for professional-level AI solution architecture.', 0.00, '/tutorials/ccar-p-exam-guide/index.html', '', 'ccar-p-exam-guide'),
  ('Free course: Claude Certified Developer - Foundations (CCDV-F)', 'ccdv-f-course', 'An independent, original 200-page course in 30 chapters. Read online or download the PDF.', 0.00, '/tutorials/ccdv-f-course/ccdv-f-course.pdf', '', 'ccdv-f-course'),
  ('Free study guide: Claude Certified Developer Foundations (CCDV-F) Exam Guide', 'ccdv-f-exam-guide', 'An independent, original study guide covering the CCDV-F exam domains.', 0.00, '/tutorials/ccdv-f-exam-guide/ebook.html', '', 'ccdv-f-exam-guide')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = 0.00,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;
