-- Seed data for Society Management System
-- Run this AFTER applying schema.sql

-- Emergency Contacts
INSERT INTO emergency_contacts (name, designation, department, phone) VALUES
('Fire Station', 'Station Officer', 'Fire', '101'),
('Police Station', 'SHO', 'Police', '100'),
('City Hospital', 'Emergency', 'Medical', '102'),
('Ambulance Service', 'EMT', 'Medical', '108');

-- Facilities
INSERT INTO facilities (name, description, capacity, hourly_rate) VALUES
('Clubhouse', 'Community clubhouse with party hall and kitchen', 100, 2000),
('Gymnasium', 'Fully equipped modern gym', 20, 200),
('Swimming Pool', 'Heated olympic-size swimming pool', 30, 500),
('Guest Room', 'Fully furnished guest accommodation', 4, 1500),
('Children''s Play Area', 'Indoor and outdoor play equipment', 30, 0),
('Community Garden', 'Rooftop garden with seating', 50, 300),
('Party Hall', 'Large hall for events and celebrations', 200, 5000),
('Badminton Court', 'Indoor badminton court', 4, 300);

-- Parking Slots
INSERT INTO parking_slots (slot_number, wing, type) VALUES
('P-001', 'A', 'car'), ('P-002', 'A', 'car'), ('P-003', 'A', 'car'),
('P-004', 'A', 'bike'), ('P-005', 'A', 'bike'),
('P-006', 'B', 'car'), ('P-007', 'B', 'car'), ('P-008', 'B', 'car'),
('P-009', 'B', 'bike'), ('P-010', 'B', 'bike'),
('V-001', 'A', 'visitor'), ('V-002', 'B', 'visitor');

-- Sample Announcements
INSERT INTO announcements (title, content, category, priority, is_pinned) VALUES
('Welcome to Our Society', 'Welcome to all residents! Please use this portal for all society-related services.', 'general', 'normal', true),
('Monthly Maintenance Due', 'Monthly maintenance fees for July are due by 10th. Please pay on time to avoid late fees.', 'maintenance', 'high', false),
('Water Supply Schedule', 'Water supply will be available from 6-8 AM and 6-8 PM daily.', 'notice', 'normal', false),
('Security Alert', 'Please ensure all main doors are locked. Report any suspicious activity to security.', 'emergency', 'urgent', true);

-- Sample expense categories
INSERT INTO expenses (category, description, amount, bill_date) VALUES
('Electricity', 'Common area electricity bill - June', 45000, '2026-06-01'),
('Water', 'Water supply bill - June', 12000, '2026-06-05'),
('Cleaning', 'Housekeeping staff salary - June', 25000, '2026-06-01'),
('Security', 'Security staff salary - June', 35000, '2026-06-01'),
('Maintenance', 'Lift maintenance AMC', 8000, '2026-06-15'),
('Gardening', 'Garden maintenance supplies', 5000, '2026-06-10');
