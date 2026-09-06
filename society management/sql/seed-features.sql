-- =====================================================
-- Society Management — Seed Data for New Features
-- Run AFTER schema-features.sql
-- =====================================================

-- =====================================================
-- DOCUMENTS (meeting minutes, legal docs, etc.)
-- =====================================================
INSERT INTO documents (title, description, category, file_url, file_name, uploaded_by, is_pinned, created_at) VALUES
('AGM Minutes 2026', 'Annual General Meeting minutes covering budget review, maintenance fee revision, and new facility plans.', 'meeting_minutes', 'https://drive.google.com/file/d/sample1', 'agm-minutes-2026.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), true, now() - interval '15 days'),
('Maintenance Fee Policy 2026', 'Revised maintenance fee structure effective April 2026. ₹1500/month for 1BHK, ₹2000 for 2BHK, ₹2500 for 3BHK.', 'policy', 'https://drive.google.com/file/d/sample2', 'maintenance-fee-policy-2026.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), false, now() - interval '10 days'),
('Society Registration Certificate', 'Official registration certificate under Maharashtra Co-operative Societies Act.', 'legal', 'https://drive.google.com/file/d/sample3', 'registration-certificate.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), true, now() - interval '30 days'),
('Q3 Financial Report', 'Quarterly financial report showing income, expenses, and reserve fund balance.', 'financial', 'https://drive.google.com/file/d/sample4', 'q3-financial-report.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), false, now() - interval '5 days'),
('Parking Rules Notice', 'Updated parking rules: No visitor parking after 10PM. Two-wheeler slots on ground floor only.', 'notice', 'https://drive.google.com/file/d/sample5', 'parking-rules-2026.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), false, now() - interval '3 days'),
('Bylaws Amendment', 'Proposed amendment to society bylaws regarding pet policy and common area usage.', 'legal', 'https://drive.google.com/file/d/sample6', 'bylaws-amendment-v3.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), false, now() - interval '7 days'),
('Fire Safety Certificate', 'Annual fire safety audit certificate from certified auditor.', 'legal', 'https://drive.google.com/file/d/sample7', 'fire-safety-cert-2026.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), false, now() - interval '20 days'),
('EMC Meeting Minutes March', 'Emergency Maintenance Committee meeting discussing water supply issues and lift repair.', 'meeting_minutes', 'https://drive.google.com/file/d/sample8', 'emc-march-minutes.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), false, now() - interval '8 days'),
('Insurance Policy Renewal', 'Building insurance policy renewed for 2026-27. Coverage includes fire, flood, and earthquake.', 'financial', 'https://drive.google.com/file/d/sample9', 'insurance-renewal-2026.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), false, now() - interval '2 days'),
('Water Supply Schedule', 'Revised water supply timing: 6AM-8AM and 6PM-8PM. Tanker backup on Wednesdays.', 'notice', 'https://drive.google.com/file/d/sample10', 'water-schedule.pdf', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), true, now() - interval '1 day');

-- =====================================================
-- STAFF DUTIES
-- =====================================================
INSERT INTO staff_duties (staff_id, title, description, priority, status, assigned_date, due_date, created_by) VALUES
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), 'Lobby Cleaning', 'Deep clean lobby area and reception', 'medium', 'completed', CURRENT_DATE - 1, CURRENT_DATE - 1, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), 'Garden Maintenance', 'Trim hedges and water plants in compound', 'low', 'completed', CURRENT_DATE - 2, CURRENT_DATE - 1, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), 'Staircase Mopping', 'Mop all staircases from G to 10th floor', 'medium', 'in_progress', CURRENT_DATE, CURRENT_DATE, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), 'Garbage Collection', 'Collect and segregate garbage from all floors', 'high', 'pending', CURRENT_DATE, CURRENT_DATE, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), 'Water Tank Cleaning', 'Quarterly water tank cleaning and sanitization', 'high', 'pending', CURRENT_DATE, CURRENT_DATE + 3, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), 'Night Patrol Report', 'Submit night patrol report for shift handover', 'high', 'in_progress', CURRENT_DATE, CURRENT_DATE, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), 'CCTV Check', 'Verify all CCTV cameras are operational', 'medium', 'pending', CURRENT_DATE, CURRENT_DATE, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), 'Elevator Maintenance Coordination', 'Coordinate with Otis for quarterly elevator service', 'medium', 'pending', CURRENT_DATE, CURRENT_DATE + 5, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));

-- =====================================================
-- STAFF ATTENDANCE (last 5 days for realism)
-- =====================================================
INSERT INTO staff_attendance (staff_id, attendance_date, check_in, check_out, status) VALUES
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE - 4, NOW() - interval '4 days' + interval '6 hours', NOW() - interval '4 days' + interval '14 hours', 'present'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE - 3, NOW() - interval '3 days' + interval '6 hours', NOW() - interval '3 days' + interval '14 hours', 'present'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE - 2, NOW() - interval '2 days' + interval '6 hours', NOW() - interval '2 days' + interval '14 hours', 'present'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE - 1, NOW() - interval '1 day' + interval '6 hours', NOW() - interval '1 day' + interval '14 hours', 'present'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE - 4, NOW() - interval '4 days' + interval '22 hours', NOW() - interval '3 days' + interval '6 hours', 'present'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE - 3, NOW() - interval '3 days' + interval '22 hours', NOW() - interval '2 days' + interval '6 hours', 'present'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE - 2, NOW() - interval '2 days' + interval '22 hours', NOW() - interval '1 day' + interval '6 hours', 'present'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE - 1, NOW() - interval '1 day' + interval '22 hours', NOW() + interval '6 hours', 'present');

-- =====================================================
-- STAFF SHIFTS (next 7 days)
-- =====================================================
INSERT INTO staff_shifts (staff_id, shift_date, start_time, end_time, shift_type, notes) VALUES
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE, '06:00', '14:00', 'morning', 'Regular morning shift'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE + 1, '06:00', '14:00', 'morning', 'Regular morning shift'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE + 2, '14:00', '22:00', 'afternoon', 'Cover for evening shift'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE + 3, '06:00', '14:00', 'morning', 'Regular morning shift'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE + 4, '06:00', '14:00', 'morning', 'Regular morning shift'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE + 5, '14:00', '22:00', 'afternoon', 'Weekend coverage'),
((SELECT id FROM profiles WHERE role = 'staff' LIMIT 1), CURRENT_DATE + 6, '06:00', '14:00', 'morning', 'Weekend morning'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE, '22:00', '06:00', 'night', 'Night security duty'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE + 1, '22:00', '06:00', 'night', 'Night security duty'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE + 2, '14:00', '22:00', 'afternoon', 'Afternoon gate duty'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE + 3, '22:00', '06:00', 'night', 'Night security duty'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE + 4, '22:00', '06:00', 'night', 'Night security duty'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE + 5, '06:00', '14:00', 'morning', 'Weekend morning gate'),
((SELECT id FROM profiles WHERE role = 'security' LIMIT 1), CURRENT_DATE + 6, '14:00', '22:00', 'afternoon', 'Weekend afternoon gate');
