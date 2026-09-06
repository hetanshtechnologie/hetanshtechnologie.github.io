-- ProjectPro Seed Data
-- Run this in Supabase SQL Editor (swap 'hetanshtechnologie@gmail.com' with your email)

DO $$
DECLARE
  uid UUID;
  pid1 INT := 1001; pid2 INT := 1002; pid3 INT := 1003; pid4 INT := 1004; pid5 INT := 1005;
  tid_start INT := 2001;
BEGIN
  -- Get your user ID
  SELECT id INTO uid FROM auth.users WHERE email = 'hetanshtechnologie@gmail.com' LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found. Run with your email.';
  END IF;

  -- Ensure admin role
  INSERT INTO pm_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- ===== Projects =====
  INSERT INTO pm_projects (id, user_id, title, description, status, priority, start_date, end_date, budget, spent, client_name, client_email, created_at) VALUES
    (pid1, uid, 'E-Commerce Platform Redesign', 'Complete redesign of the customer-facing e-commerce platform with modern UI, improved checkout flow, and mobile responsiveness.', 'active', 'high', '2026-06-01', '2026-09-30', 1200000, 450000, 'TechRetail Inc.', 'contact@techretail.com', '2026-06-01 09:00:00+00'),
    (pid2, uid, 'Mobile Banking App', 'Cross-platform mobile banking application with secure authentication, transaction history, fund transfers, and bill payments.', 'active', 'critical', '2026-05-15', '2026-11-30', 2500000, 980000, 'FinSecure Bank', 'pm@finsecure.com', '2026-05-15 10:00:00+00'),
    (pid3, uid, 'Internal HR Portal', 'Employee self-service portal for leave management, payroll access, performance reviews, and company announcements.', 'completed', 'medium', '2026-01-10', '2026-06-15', 450000, 445000, 'Acme Corp', 'hr@acmecorp.com', '2026-01-10 08:00:00+00'),
    (pid4, uid, 'IoT Dashboard - Smart Factory', 'Real-time monitoring dashboard for factory IoT sensors with alerts, historical analytics, and predictive maintenance.', 'on_hold', 'high', '2026-04-01', '2026-12-31', 1800000, 320000, 'MfgPro Ltd.', 'iot@mfgpro.com', '2026-04-01 11:00:00+00'),
    (pid5, uid, 'AI Chatbot - Customer Support', 'ML-powered chatbot for customer support automation with intent recognition, knowledge base integration, and human handoff.', 'active', 'medium', '2026-07-01', '2026-10-15', 750000, 120000, 'SupportHub', 'hello@supporthub.io', '2026-07-01 07:00:00+00');

  -- ===== Tasks for Project 1: E-Commerce Redesign =====
  INSERT INTO pm_tasks (id, project_id, user_id, title, description, status, priority, estimated_hours, due_date, order_index, created_at) VALUES
    (tid_start,    pid1, uid, 'User research & personas', 'Conduct user interviews and create persona documents', 'done', 'high', 40, '2026-06-20', 0, '2026-06-01 09:00:00+00'),
    (tid_start+1,  pid1, uid, 'Wireframe all pages', 'Create low-fidelity wireframes for all 15 screens', 'done', 'high', 60, '2026-07-10', 1, '2026-06-01 09:00:00+00'),
    (tid_start+2,  pid1, uid, 'Design system & component library', 'Build reusable design system with Figma', 'done', 'medium', 80, '2026-07-25', 2, '2026-06-01 09:00:00+00'),
    (tid_start+3,  pid1, uid, 'Homepage & product listing', 'Implement responsive homepage and PLP', 'in_progress', 'high', 100, '2026-08-20', 3, '2026-06-01 09:00:00+00'),
    (tid_start+4,  pid1, uid, 'Product detail page', 'Implement PDP with image gallery and specs', 'in_progress', 'high', 60, '2026-08-30', 4, '2026-06-01 09:00:00+00'),
    (tid_start+5,  pid1, uid, 'Shopping cart & checkout', 'Implement cart, address, payment flow', 'todo', 'critical', 120, '2026-09-15', 5, '2026-06-01 09:00:00+00'),
    (tid_start+6,  pid1, uid, 'Order management', 'Admin order listing, status updates, invoices', 'todo', 'medium', 80, '2026-09-25', 6, '2026-06-01 09:00:00+00'),
    (tid_start+7,  pid1, uid, 'Performance optimization', 'Lighthouse score > 90, image optimization, caching', 'todo', 'medium', 40, '2026-09-30', 7, '2026-06-01 09:00:00+00'),
    (tid_start+8,  pid1, uid, 'User acceptance testing', 'Coordinate UAT with client stakeholders', 'todo', 'high', 60, '2026-09-30', 8, '2026-06-01 09:00:00+00');

  -- ===== Tasks for Project 2: Mobile Banking App =====
  INSERT INTO pm_tasks (id, project_id, user_id, title, description, status, priority, estimated_hours, due_date, order_index, created_at) VALUES
    (tid_start+10, pid2, uid, 'Security architecture review', 'Third-party security audit of auth flow', 'done', 'critical', 30, '2026-06-01', 0, '2026-05-15 10:00:00+00'),
    (tid_start+11, pid2, uid, 'Login & biometric auth', 'Implement fingerprint and face ID login', 'done', 'critical', 70, '2026-06-30', 1, '2026-05-15 10:00:00+00'),
    (tid_start+12, pid2, uid, 'Dashboard & account summary', 'Home screen with balances and quick actions', 'in_progress', 'high', 80, '2026-07-20', 2, '2026-05-15 10:00:00+00'),
    (tid_start+13, pid2, uid, 'Transaction history', 'Paginated list with filters and search', 'in_progress', 'high', 60, '2026-08-10', 3, '2026-05-15 10:00:00+00'),
    (tid_start+14, pid2, uid, 'Fund transfer UI', 'IMPS/NEFT/RTGS transfer screens', 'todo', 'high', 90, '2026-09-01', 4, '2026-05-15 10:00:00+00'),
    (tid_start+15, pid2, uid, 'Bill payments', 'Utility biller integration and payment scheduling', 'todo', 'medium', 70, '2026-09-20', 5, '2026-05-15 10:00:00+00'),
    (tid_start+16, pid2, uid, 'Push notifications', 'Transaction alerts, OTP, promotional messages', 'todo', 'medium', 50, '2026-10-10', 6, '2026-05-15 10:00:00+00'),
    (tid_start+17, pid2, uid, 'App store deployment', 'Prepare assets, testflight, play console', 'todo', 'high', 40, '2026-11-15', 7, '2026-05-15 10:00:00+00');

  -- ===== Tasks for Project 3: HR Portal (completed) =====
  INSERT INTO pm_tasks (id, project_id, user_id, title, description, status, priority, estimated_hours, due_date, order_index, created_at) VALUES
    (tid_start+20, pid3, uid, 'Requirements gathering', 'Workshops with HR team', 'done', 'high', 30, '2026-01-25', 0, '2026-01-10 08:00:00+00'),
    (tid_start+21, pid3, uid, 'Leave management module', 'Apply, approve, calendar view', 'done', 'high', 80, '2026-03-01', 1, '2026-01-10 08:00:00+00'),
    (tid_start+22, pid3, uid, 'Payroll integration', 'Connect with existing payroll API', 'done', 'critical', 60, '2026-04-15', 2, '2026-01-10 08:00:00+00'),
    (tid_start+23, pid3, uid, 'Performance review system', 'Self-assessment, manager review, ratings', 'done', 'medium', 100, '2026-05-15', 3, '2026-01-10 08:00:00+00'),
    (tid_start+24, pid3, uid, 'Announcements & notifications', 'Company-wide broadcast system', 'done', 'low', 30, '2026-05-30', 4, '2026-01-10 08:00:00+00'),
    (tid_start+25, pid3, uid, 'Go-live & training', 'Deploy, train HR team, documentation', 'done', 'high', 40, '2026-06-15', 5, '2026-01-10 08:00:00+00');

  -- ===== Tasks for Project 4: IoT Dashboard (on hold) =====
  INSERT INTO pm_tasks (id, project_id, user_id, title, description, status, priority, estimated_hours, due_date, order_index, created_at) VALUES
    (tid_start+30, pid4, uid, 'Sensor data pipeline', 'Ingestion from MQTT brokers', 'done', 'high', 50, '2026-05-01', 0, '2026-04-01 11:00:00+00'),
    (tid_start+31, pid4, uid, 'Real-time dashboard UI', 'Gauges, charts, live feed', 'in_progress', 'high', 100, '2026-07-15', 1, '2026-04-01 11:00:00+00'),
    (tid_start+32, pid4, uid, 'Alert engine', 'Rule-based alerts via email and SMS', 'todo', 'critical', 60, '2026-08-01', 2, '2026-04-01 11:00:00+00'),
    (tid_start+33, pid4, uid, 'Historical analytics', 'Time-series charts with date range picker', 'todo', 'medium', 80, '2026-09-01', 3, '2026-04-01 11:00:00+00');

  -- ===== Tasks for Project 5: AI Chatbot =====
  INSERT INTO pm_tasks (id, project_id, user_id, title, description, status, priority, estimated_hours, due_date, order_index, created_at) VALUES
    (tid_start+40, pid5, uid, 'Intent classification model', 'Train NLP model on support tickets', 'in_progress', 'high', 60, '2026-08-01', 0, '2026-07-01 07:00:00+00'),
    (tid_start+41, pid5, uid, 'Knowledge base integration', 'Connect to existing KB API', 'todo', 'high', 40, '2026-08-20', 1, '2026-07-01 07:00:00+00'),
    (tid_start+42, pid5, uid, 'Chat UI component', 'Floating widget with message history', 'done', 'medium', 30, '2026-07-25', 2, '2026-07-01 07:00:00+00'),
    (tid_start+43, pid5, uid, 'Human handoff flow', 'Escalation to live agent with context', 'todo', 'high', 50, '2026-09-15', 3, '2026-07-01 07:00:00+00'),
    (tid_start+44, pid5, uid, 'Analytics dashboard', 'Conversation metrics, satisfaction scores', 'todo', 'low', 40, '2026-10-01', 4, '2026-07-01 07:00:00+00');

  -- ===== Milestones =====
  INSERT INTO pm_milestones (id, project_id, user_id, title, description, due_date, status, created_at) VALUES
    (3001, pid1, uid, 'Design Phase Complete', 'All wireframes and mockups approved by client', '2026-07-30', 'completed', '2026-06-01 09:00:00+00'),
    (3002, pid1, uid, 'Frontend Beta Release', 'All customer-facing pages ready for testing', '2026-08-30', 'in_progress', '2026-06-01 09:00:00+00'),
    (3003, pid1, uid, 'UAT Sign-off', 'Client signs off after acceptance testing', '2026-09-25', 'pending', '2026-06-01 09:00:00+00'),
    (3004, pid2, uid, 'MVP Launch', 'Basic banking features: login, balance, transfer', '2026-08-31', 'in_progress', '2026-05-15 10:00:00+00'),
    (3005, pid2, uid, 'Full Feature Release', 'All features including bill payments and notifications', '2026-11-15', 'pending', '2026-05-15 10:00:00+00'),
    (3006, pid4, uid, 'Data Pipeline Go-live', 'Sensor ingestion pipeline operational', '2026-05-15', 'completed', '2026-04-01 11:00:00+00'),
    (3007, pid5, uid, 'Chatbot MVP', 'Basic Q&A chatbot operational on staging', '2026-08-25', 'pending', '2026-07-01 07:00:00+00');

  -- ===== Risks =====
  INSERT INTO pm_risks (id, project_id, user_id, title, description, severity, status, mitigation, created_at) VALUES
    (4001, pid1, uid, 'Third-party payment gateway delay', 'Payment gateway API integration may be delayed due to vendor compliance requirements.', 'high', 'mitigating', 'Started compliance paperwork early. Have backup gateway (Razorpay).', '2026-06-15 10:00:00+00'),
    (4002, pid1, uid, 'Mobile responsiveness issues', 'Complex product cards may not render well on older mobile devices.', 'medium', 'open', 'Progressive enhancement approach. Will test on top 10 devices.', '2026-07-01 10:00:00+00'),
    (4003, pid2, uid, 'Regulatory compliance change', 'RBI may introduce new KYC norms mid-project affecting auth flow.', 'critical', 'open', 'Legal team monitoring. Modular auth design allows swapping providers.', '2026-06-01 10:00:00+00'),
    (4004, pid2, uid, 'Key developer attrition', 'Senior iOS developer has submitted resignation.', 'high', 'mitigating', 'Hiring replacement. Cross-training Android dev on iOS basics.', '2026-06-20 10:00:00+00'),
    (4005, pid4, uid, 'Hardware procurement delay', 'IoT sensor shipment from Germany delayed by 6 weeks.', 'high', 'open', 'Using simulation layer for development. Evaluating alternative sensor vendors.', '2026-05-01 10:00:00+00'),
    (4006, pid5, uid, 'NLP model accuracy below threshold', 'Initial model accuracy at 72% vs required 85%.', 'medium', 'mitigating', 'Collecting more training data. Exploring few-shot learning with GPT-4.', '2026-07-15 10:00:00+00');

  -- ===== Comments =====
  INSERT INTO pm_comments (id, project_id, user_id, content, created_at) VALUES
    (5001, pid1, uid, 'Client shared the brand guidelines PDF. Uploaded to the shared drive.', '2026-06-05 14:30:00+00'),
    (5002, pid1, uid, 'Wireframes review scheduled for July 12. Please have all screens ready by July 10.', '2026-07-01 11:00:00+00'),
    (5003, pid1, uid, 'Homepage design has been approved by the client! Moving to PLP now.', '2026-07-28 16:00:00+00'),
    (5004, pid2, uid, 'Security audit report received. 3 critical issues identified - assigned to team leads.', '2026-06-05 09:00:00+00'),
    (5005, pid2, uid, 'Dashboard API response time optimized from 2.3s to 400ms. Good work team!', '2026-07-10 15:00:00+00'),
    (5006, pid3, uid, 'HR team loved the new leave dashboard. Training completed for all managers.', '2026-06-10 12:00:00+00'),
    (5007, pid5, uid, 'Preliminary testing shows intent classification at 78%. Need more training data for edge cases.', '2026-07-20 14:00:00+00');

  -- ===== Notifications =====
  INSERT INTO pm_notifications (id, user_id, title, message, type, created_at) VALUES
    (6001, uid, 'Project Created', 'E-Commerce Platform Redesign project has been created.', 'success', '2026-06-01 09:00:00+00'),
    (6002, uid, 'Task Completed', 'Task "User research & personas" marked as done.', 'success', '2026-06-20 18:00:00+00'),
    (6003, uid, 'Milestone Reached', 'Design Phase Complete milestone achieved for E-Commerce project.', 'success', '2026-07-30 10:00:00+00'),
    (6004, uid, 'Risk Logged', 'New critical risk added to Mobile Banking App: Regulatory compliance change.', 'warning', '2026-06-01 10:00:00+00'),
    (6005, uid, 'Project Status Changed', 'IoT Dashboard project moved to On Hold status.', 'warning', '2026-07-15 09:00:00+00'),
    (6006, uid, 'New Comment', 'New comment on E-Commerce Platform Redesign from you.', 'info', '2026-07-28 16:00:00+00'),
    (6007, uid, 'Budget Alert', 'E-Commerce project has spent ₹4.5L of ₹12L budget (37.5%).', 'info', '2026-07-01 09:00:00+00');

  -- ===== Time Logs =====
  INSERT INTO pm_time_logs (id, task_id, user_id, hours, description, log_date, created_at) VALUES
    (7001, 2001, uid, 8, 'User interviews with 4 participants', '2026-06-05', '2026-06-05 17:00:00+00'),
    (7002, 2001, uid, 6, 'Persona document creation', '2026-06-10', '2026-06-10 17:00:00+00'),
    (7003, 2001, uid, 4, 'Research synthesis and presentation', '2026-06-15', '2026-06-15 17:00:00+00'),
    (7004, 2003, uid, 8, 'Homepage layout implementation', '2026-07-20', '2026-07-20 17:00:00+00'),
    (7005, 2003, uid, 6, 'Responsive grid and filters', '2026-07-25', '2026-07-25 17:00:00+00'),
    (7006, 2012, uid, 7, 'Dashboard chart components', '2026-07-05', '2026-07-05 17:00:00+00'),
    (7007, 2021, uid, 6, 'Leave module requirements workshop', '2026-01-15', '2026-01-15 17:00:00+00'),
    (7008, 2042, uid, 4, 'Chat widget HTML/CSS scaffolding', '2026-07-10', '2026-07-10 17:00:00+00');

  RAISE NOTICE 'Seeded 5 projects, 32 tasks, 7 milestones, 6 risks, 7 comments, 7 notifications, 8 time logs for user %', uid;
END $$;
