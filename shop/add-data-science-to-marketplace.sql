-- ============================================================
-- Add "Data Science" ebook to the Marketplace
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Data Science - Complete Guide',
  'data-science-tutorial',
  'A complete, hands-on guide to the data science workflow: setting up your environment, data acquisition and cleaning with pandas, exploratory data analysis, visualization, statistics and probability, hypothesis and A/B testing, SQL, machine learning with scikit-learn (regression, classification, clustering, PCA), time series, NLP, feature engineering and model deployment, big data and the cloud, responsible AI, and a full projects-and-career path.',
  500.00, 9999, 'data-science-tutorial', 0, true, true,
  '/tutorials/data-science/data-science-complete-guide.pdf',
  'data-science',
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
  'Data Science - Complete Guide',
  'data-science-tutorial',
  'A complete, hands-on guide to the data science workflow: setup, acquisition and cleaning, EDA, visualization, statistics, hypothesis testing, SQL, machine learning, time series, NLP, deployment, big data and cloud, responsible AI, and career path.',
  500.00,
  '/tutorials/data-science/data-science-complete-guide.pdf',
  '',
  'data-science'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;
