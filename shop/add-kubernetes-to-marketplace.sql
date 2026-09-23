-- ============================================================
-- Add "Kubernetes for Beginners" ebook to the Marketplace
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Add to marketplace products (powers marketplace search & listing)
INSERT INTO ec_products (vendor_id, category_id, name, slug, description, price, stock, sku, gst_rate, is_active, is_approved, pdf_url, tutorial_slug, images)
VALUES (
  1,
  (SELECT id FROM ec_categories WHERE slug = 'books'),
  'Kubernetes for Beginners - Complete Guide',
  'kubernetes-tutorial',
  'A complete, beginners-first tutorial: what Kubernetes is and why it is used, core concepts (Pods, Deployments, ReplicaSets, Services, ConfigMaps, Secrets), installing a local cluster with Minikube and kind, deploying and scaling Nginx, NodePort and LoadBalancer services, rolling updates and rollbacks, Persistent Volumes, Ingress controllers, monitoring and logging, and best practices (resource limits, namespaces, RBAC, Network Policies). Every chapter includes commands, YAML, tables, and exercises.',
  500.00, 9999, 'kubernetes-tutorial', 0, true, true,
  '/tutorials/kubernetes/kubernetes-complete-guide.pdf',
  'kubernetes',
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
  'Kubernetes for Beginners - Complete Guide',
  'kubernetes-tutorial',
  'A complete, beginners-first tutorial: what Kubernetes is, core concepts, local setup with Minikube and kind, deploying and scaling Nginx, Services, rolling updates, Persistent Volumes, Ingress, monitoring, and security best practices.',
  500.00,
  '/tutorials/kubernetes/kubernetes-complete-guide.pdf',
  '',
  'kubernetes'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  pdf_url = EXCLUDED.pdf_url,
  tutorial_slug = EXCLUDED.tutorial_slug;