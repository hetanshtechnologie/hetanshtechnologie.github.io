-- =============================================================
-- JobPortal seed data
-- Run AFTER schema.sql
-- =============================================================

-- ======= Plans =======
INSERT INTO jp_plans (name, target, price, duration_days, job_limit, highlight_jobs, resume_views, premium_visibility, priority_support, features) VALUES
('Free', 'company', 0, 0, 2, 0, 0, FALSE, FALSE,
 ARRAY['2 active job postings', 'Basic job listing', 'Standard visibility', 'Email support']),
('Premium', 'company', 49900, 30, 20, 5, 100, TRUE, FALSE,
 ARRAY['20 active job postings', '5 highlighted postings', '100 resume views', 'Premium visibility badge', 'Priority email support']),
('Enterprise', 'company', 199900, 30, 100, 999, 9999, TRUE, TRUE,
 ARRAY['100 active job postings', 'Unlimited highlighted postings', 'Unlimited resume views', 'Premium visibility badge', 'Dedicated account manager', 'Priority support']),
('Free', 'seeker', 0, 0, 0, 0, 0, FALSE, FALSE,
 ARRAY['Browse & search jobs', 'Apply to jobs', 'Upload resume', 'Basic profile']),
('Pro Seeker', 'seeker', 19900, 30, 0, 0, 9999, TRUE, TRUE,
 ARRAY['Everything in Free', 'Premium visibility to recruiters', 'Resume highlighted', 'Profile review boost', 'Priority support'])
ON CONFLICT (id) DO NOTHING;

-- ======= Demo company (user_id NULL => system demo, bypasses owner RLS) =======
INSERT INTO jp_companies (id, user_id, name, industry, website, description, location, size, plan, status, rating) VALUES
(1, NULL, 'Hetansh Technologie', 'Information Technology',
 'https://hetanshtechnologie.github.io',
 'Hetansh Technologie is a product engineering studio building modern web apps, cloud solutions and AI-powered tools for the digital era.',
 'Ahmedabad, Gujarat', '11-50', 'premium', 'approved', 4.5),
(2, NULL, 'CloudNova Solutions', 'Cloud & DevOps',
 'https://cloudnova.example.com',
 'CloudNova helps enterprises modernise with cloud-native architecture, Kubernetes and serverless platforms.',
 'Bengaluru, Karnataka', '51-200', 'free', 'approved', 4.0),
(3, NULL, 'DataSphere AI', 'Artificial Intelligence',
 'https://datasphere.example.com',
 'DataSphere builds LLM-powered products, RAG pipelines and autonomous AI agents for enterprise clients.',
 'Remote', '51-200', 'premium', 'approved', 4.2)
ON CONFLICT (id) DO NOTHING;

-- ======= Demo jobs =======
INSERT INTO jp_jobs (id, company_id, title, description, type, location, experience_min, experience_max, salary_min, salary_max, skills, is_highlighted, status) VALUES
(1, 1, 'Senior Full-Stack Developer (.NET + Angular)',
 'Build scalable full-stack web applications with .NET Core APIs and Angular SPA front-ends. Work with cloud (Azure), write clean code and mentor juniors.',
 'Full-time', 'Remote', 5, 9, 18, 30, ARRAY['.NET Core','Angular','C#','SQL Server','Azure'], TRUE, 'active'),
(2, 1, 'Cloud Solutions Architect',
 'Design and implement scalable, secure and cost-effective cloud architectures on Azure/AWS/GCP. Lead migration and modernization programs.',
 'Full-time', 'Hybrid', 8, 14, 28, 45, ARRAY['Azure','AWS','Kubernetes','Terraform','Microservices'], TRUE, 'active'),
(3, 2, 'DevOps Engineer',
 'Manage CI/CD pipelines, Kubernetes clusters and infrastructure automation. Implement monitoring, logging and disaster recovery.',
 'Full-time', 'On-site', 4, 8, 12, 22, ARRAY['Kubernetes','Docker','Terraform','CI/CD','Prometheus'], FALSE, 'active'),
(4, 3, 'AI/ML Engineer (LLM Focus)',
 'Develop and deploy AI/ML models focused on LLMs and generative AI. Build RAG pipelines with LangChain and vector databases.',
 'Full-time', 'Remote', 3, 8, 20, 40, ARRAY['Python','LangChain','RAG','PyTorch','Vector DB'], TRUE, 'active'),
(5, 3, 'Prompt Engineer / AI Agent Developer',
 'Design prompts, workflows and multi-agent systems for production AI applications. Evaluate model outputs and implement monitoring.',
 'Contract', 'Remote', 2, 6, 15, 30, ARRAY['Prompt Engineering','Python','LLM','Agents'], FALSE, 'active'),
(6, 2, 'React Developer',
 'Develop modern, responsive UIs using React, TypeScript and Redux. Build reusable component libraries and design systems.',
 'Full-time', 'Remote', 3, 6, 10, 18, ARRAY['React','TypeScript','Redux','GraphQL','CSS'], FALSE, 'active')
ON CONFLICT (id) DO NOTHING;

-- ======= Sample CVs (admin can seed & view; seeker_id NULL => demo records) =======
INSERT INTO jp_cvs (seeker_id, full_name, email, phone, skills, experience_years, file_url, summary) VALUES
(NULL, 'Ananya Sharma', 'ananya.sharma@example.com', '+91 98765 00001',
 ARRAY['React','TypeScript','Node.js','GraphQL'], 5,
 'https://vgipghqejzbcoighktij.supabase.co/storage/v1/object/public/resumes/ananya-sharma.pdf',
 'Frontend engineer with 5 years building large-scale React applications.'),
(NULL, 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00002',
 ARRAY['Kubernetes','Docker','Terraform','AWS'], 6,
 'https://vgipghqejzbcoighktij.supabase.co/storage/v1/object/public/resumes/rohan-mehta.pdf',
 'DevOps engineer experienced in cloud infra and CI/CD at scale.'),
(NULL, 'Priya Nair', 'priya.nair@example.com', '+91 98765 00003',
 ARRAY['Python','LangChain','LLMs','PyTorch'], 4,
 'https://vgipghqejzbcoighktij.supabase.co/storage/v1/object/public/resumes/priya-nair.pdf',
 'AI/ML engineer focused on LLM applications and RAG systems.')
ON CONFLICT (id) DO NOTHING;
