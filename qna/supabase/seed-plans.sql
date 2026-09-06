-- Seed default plans
INSERT INTO qna_plans (id, name, max_categories, max_questions, max_tags, max_jobs, price, active, created_at) VALUES
(1, 'Free', 5, 25, 5, 3, 0, true, '2026-01-01 00:00:00'),
(2, 'Bronze', 20, 100, 20, 15, 19900, true, '2026-01-01 00:00:00'),
(3, 'Silver', 50, 500, 50, 50, 49900, true, '2026-01-01 00:00:00'),
(4, 'Gold', 999999, 999999, 999999, 999999, 99900, true, '2026-01-01 00:00:00')
ON CONFLICT (id) DO NOTHING;
