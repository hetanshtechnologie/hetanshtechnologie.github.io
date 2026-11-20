-- ============================================================
-- Set all 8 tutorial books generated today to Rs 500 with a
-- five-chapter free preview.
-- Run once in Supabase SQL Editor (https://supabase.com/dashboard)
--
--  * ec_products / shop_products price -> 500.00, GST 0
--  * names no longer say "Free"
--  * creates the check_tutorial_purchase RPC used by
--    tutorials/js/access.js so paying customers can unlock
--    chapters 6 onward (first 5 chapters stay public).
-- ============================================================

-- 1. Marketplace products
WITH wanted(slug, new_name, new_desc) AS (
  VALUES
    ('ai-1',
     'AI-1 - Building Production AI Agents',
     'An independent, self-paced study companion that turns a one-day AI conference into a structured learning path. Covers agent frameworks, retrieval, tool calling, MCP, evaluation, inference engineering, guardrails, and production deployment patterns. First five chapters are free to preview.'),
    ('ccar-f',
     'Claude Certified Architect (CCAR-F) - Study Guide',
     'An independent study guide for agentic system design, tool design, coding-assistant workflows, prompting, and context management. Reorganized into a learning path with worked examples, design trade-offs, exercises, and review questions. First five chapters are free to preview.'),
    ('ccao-f-complete-exam-prep',
     'Claude Certified Associate (CCAO-F): Complete Exam Prep',
     'An independent, original ebook of about 200 pages covering the CCAO-F exam domains, prompting, verification, models, workflow design, governance, and exam practice. First five chapters are free to preview.'),
    ('ccao-f-exam-guide',
     'Claude Certified Associate Foundations (CCAO-F) Exam Guide',
     'An independent, original 20-chapter study guide for a foundations-level assistant exam. Covers workspace orientation, prompting foundations, output verification, models and context, workflow design, governance, and full practice preparation. First five chapters are free to preview.'),
    ('ccar-f-full-prep',
     'Claude Certified Architect - Foundations (CCAR-F) Full Prep',
     'An independent, original 200-page full-prep course covering the five architectural layers, cross-layer patterns, two practice papers, applied case studies, and a managed agent workspace. First five chapters are free to preview.'),
    ('ccar-p-exam-guide',
     'Claude Certified Architect - Professional (CCAR-P) Exam Prep',
     'An independent, original study guide for professional-level AI solution architecture. Covers architecture patterns, model and prompt design, guardrails, context, retrieval, observability, evaluation, operations, governance, and full practice preparation. First five chapters are free to preview.'),
    ('ccdv-f-course',
     'Claude Certified Developer - Foundations (CCDV-F) Course',
     'An independent, original 200-page course in 30 chapters covering exam orientation, model foundations, API requests, evaluations, prompts and structured output, tools and MCP, agents and workflows, model choice and cost, coding-assistant configuration, debugging, security, and exam readiness. First five chapters are free to preview.'),
    ('ccdv-f-exam-guide',
     'Claude Certified Developer Foundations (CCDV-F) Exam Guide',
     'An independent, original study guide with about 203 printed pages covering the CCDV-F exam domains. Written from first principles with no course material reproduced. First five chapters are free to preview.')
)
UPDATE ec_products p
SET name = w.new_name,
    description = w.new_desc,
    price = 500.00,
    gst_rate = 0,
    sku = w.slug,
    is_active = true,
    is_approved = true
FROM wanted w
WHERE p.slug = w.slug;

-- 2. Legacy shop_products table
WITH wanted(slug, new_name) AS (
  VALUES
    ('ai-1', 'AI-1 - Building Production AI Agents'),
    ('ccar-f', 'Claude Certified Architect (CCAR-F) - Study Guide'),
    ('ccao-f-complete-exam-prep', 'Claude Certified Associate (CCAO-F): Complete Exam Prep'),
    ('ccao-f-exam-guide', 'Claude Certified Associate Foundations (CCAO-F) Exam Guide'),
    ('ccar-f-full-prep', 'Claude Certified Architect - Foundations (CCAR-F) Full Prep'),
    ('ccar-p-exam-guide', 'Claude Certified Architect - Professional (CCAR-P) Exam Prep'),
    ('ccdv-f-course', 'Claude Certified Developer - Foundations (CCDV-F) Course'),
    ('ccdv-f-exam-guide', 'Claude Certified Developer Foundations (CCDV-F) Exam Guide')
)
UPDATE shop_products sp
SET title = w.new_name,
    price = 500.00
FROM wanted w
WHERE sp.slug = w.slug;

-- 3. Purchase check used by the five-chapter preview paywall.
--    Returns true only when the signed-in user has a paid order
--    containing the requested product.
CREATE OR REPLACE FUNCTION public.check_tutorial_purchase(p_product_slug text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ec_order_items oi
    JOIN ec_orders o ON o.id = oi.order_id
    JOIN ec_products p ON p.id = oi.product_id
    WHERE o.user_id = auth.uid()
      AND p.slug = p_product_slug
      AND o.payment_status = 'paid'
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_tutorial_purchase(text) TO anon, authenticated;
