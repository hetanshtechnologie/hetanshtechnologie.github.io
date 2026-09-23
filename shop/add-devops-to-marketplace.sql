-- ============================================================
-- Add "DevOps Engineer's Handbook" to the Marketplace (FREE listing)
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'DevOps Engineer''s Handbook - Complete Guide',
  'devops-tutorial',
  'A complete, hands-on DevOps eBook: introduction to DevOps culture and DORA metrics, CI/CD pipelines (GitHub Actions, Jenkins, Azure DevOps), infrastructure as code with Terraform and Ansible, containerization with Docker, Kubernetes orchestration, monitoring and logging, cloud-native best practices, DevSecOps and shift-left security, automation and GitOps with Argo CD, collaboration workflows and ChatOps, pitfalls and troubleshooting, real-world case studies, and the future of DevOps and platform engineering. Every chapter includes code, YAML, diagrams, best practices, summaries, and checklists.',
  0.00, 9999, 'devops-tutorial', 0, true, true,
  '/tutorials/devops/devops-complete-guide.pdf',
  'devops',
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