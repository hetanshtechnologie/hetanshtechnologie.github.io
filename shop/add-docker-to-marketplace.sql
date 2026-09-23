-- ============================================================
-- Add "Complete Docker Tutorial" to the Marketplace (FREE listing)
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Complete Docker Tutorial - Containers from Zero to Production',
  'docker-tutorial',
  'A complete, hands-on Docker tutorial for developers and DevOps engineers: what Docker is and why to use it, installing on Windows/Linux/macOS, images and containers and how layers work, the Docker CLI, building custom images with Dockerfiles and multi-stage builds, volumes and persistent storage, networking (bridge, host, overlay), Docker Compose, best practices for image optimization and security, a real-world web app deployment with Compose, troubleshooting common issues, and advanced topics including registries, CI/CD integration, and orchestration basics. Every section includes commands, configuration files, diagrams, best practices, and a summary checklist.',
  0.00, 9999, 'docker-tutorial', 0, true, true,
  '/tutorials/docker/docker-complete-guide.pdf',
  'docker',
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