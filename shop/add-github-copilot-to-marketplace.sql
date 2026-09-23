-- ============================================================
-- Add "GitHub Copilot for Beginners" ebook to the Marketplace
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'GitHub Copilot for Beginners - Complete Guide',
  'github-copilot-tutorial',
  'A complete, hands-on tutorial for developers of every level: what GitHub Copilot is and how it works, installation and plans, building a real income-and-expense web app (the CashTrack project) with charts and downloads, prompt engineering and every Copilot Chat tool, server-side and Python skills, React and Agent Mode, and the wider AI-coding landscape. Every chapter includes concrete walkthroughs, tables, and exercises.',
  500.00, 9999, 'github-copilot-tutorial', 0, true, true,
  '/tutorials/github-copilot/github-copilot-complete-guide.pdf',
  'github-copilot',
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
  'GitHub Copilot for Beginners - Complete Guide',
  'github-copilot-tutorial',
  'A complete, hands-on tutorial: what GitHub Copilot is and how it works, installation and plans, the CashTrack web app, prompt engineering and Copilot Chat tools, server-side and Python, React and Agent Mode, and the wider AI-coding landscape.',
  500.00,
  '/tutorials/github-copilot/github-copilot-complete-guide.pdf',
  '',
  'github-copilot'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;