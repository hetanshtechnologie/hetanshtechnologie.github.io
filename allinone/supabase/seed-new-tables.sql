-- Seed data for new modules: e-way bills, cost centres, budgets, TDS certificates/challans
-- Applied 26-Jun-2026

-- 1. Distance master for common routes
INSERT INTO eway_distance (from_pincode, to_pincode, distance_km, route_desc) VALUES
('411001', '400001', 150, 'Pune to Mumbai'),
('411001', '380001', 650, 'Pune to Ahmedabad'),
('411001', '110001', 1500, 'Pune to Delhi'),
('411001', '700001', 2000, 'Pune to Kolkata'),
('411001', '600001', 1100, 'Pune to Chennai'),
('411001', '500001', 550, 'Pune to Hyderabad'),
('411001', '560001', 880, 'Pune to Bangalore'),
('411001', '682001', 1300, 'Pune to Kochi'),
('411001', '302001', 1100, 'Pune to Jaipur'),
('411001', '226001', 1400, 'Pune to Lucknow'),
('400001', '411001', 150, 'Mumbai to Pune'),
('400001', '380001', 550, 'Mumbai to Ahmedabad'),
('400001', '110001', 1400, 'Mumbai to Delhi'),
('400001', '700001', 2100, 'Mumbai to Kolkata'),
('400001', '600001', 1300, 'Mumbai to Chennai'),
('110001', '411001', 1500, 'Delhi to Pune'),
('110001', '400001', 1400, 'Delhi to Mumbai'),
('110001', '700001', 1400, 'Delhi to Kolkata'),
('110001', '600001', 2200, 'Delhi to Chennai'),
('380001', '411001', 650, 'Ahmedabad to Pune'),
('380001', '400001', 550, 'Ahmedabad to Mumbai'),
('560001', '411001', 880, 'Bangalore to Pune'),
('560001', '400001', 1000, 'Bangalore to Mumbai'),
('560001', '600001', 350, 'Bangalore to Chennai'),
('500001', '411001', 550, 'Hyderabad to Pune'),
('500001', '400001', 720, 'Hyderabad to Mumbai'),
('500001', '600001', 650, 'Hyderabad to Chennai'),
('700001', '411001', 2000, 'Kolkata to Pune'),
('700001', '400001', 2100, 'Kolkata to Mumbai'),
('600001', '411001', 1100, 'Chennai to Pune'),
('600001', '400001', 1300, 'Chennai to Mumbai'),
('600001', '560001', 350, 'Chennai to Bangalore'),
('682001', '411001', 1300, 'Kochi to Pune'),
('682001', '560001', 550, 'Kochi to Bangalore'),
('302001', '110001', 280, 'Jaipur to Delhi'),
('226001', '110001', 550, 'Lucknow to Delhi')
ON CONFLICT DO NOTHING;

-- 2. Sample E-Way Bills
-- Invoice 1 → TechWorld (Pune→Mumbai, active, Part-B done)
INSERT INTO eway_bills (org_id, ewb_no, ewb_date, invoice_id, invoice_no, invoice_date, doc_type,
  from_gstin, from_name, from_pincode, from_state_code,
  to_gstin, to_name, to_pincode, to_state_code,
  total_value, hsn_code, status, part_b_generated,
  vehicle_no, transporter_name, transporter_doc_no, distance_km)
SELECT 12, 'EWB482618293847', '2026-06-16', invoices.id, invoices.invoice_no, invoices.invoice_date, 'INV',
  '27AABCS1234E1Z5', 'Hetansh Technologie Solutions', '411001', 27,
  parties.gstin, parties.name, '400001', 27,
  invoices.total, '8471', 'active', true,
  'MH-12-AB-5678', 'FastTrack Logistics', 'LR-2026-0615-001', 150
FROM invoices JOIN parties ON invoices.customer_id = parties.id WHERE invoices.id = 1;

-- Invoice 2 → GreenLeaf (Pune→Bangalore, active, no Part-B)
INSERT INTO eway_bills (org_id, ewb_no, ewb_date, invoice_id, invoice_no, invoice_date, doc_type,
  from_gstin, from_name, from_pincode, from_state_code,
  to_gstin, to_name, to_pincode, to_state_code,
  total_value, hsn_code, status, part_b_generated)
SELECT 12, 'EWB938451726304', '2026-06-01', invoices.id, invoices.invoice_no, invoices.invoice_date, 'INV',
  '27AABCS1234E1Z5', 'Hetansh Technologie Solutions', '411001', 27,
  parties.gstin, parties.name, '560001', 29,
  invoices.total, '8471', 'active', false
FROM invoices JOIN parties ON invoices.customer_id = parties.id WHERE invoices.id = 2;

-- Invoice 10 → GreenLeaf POS (expired, Part-B done)
INSERT INTO eway_bills (org_id, ewb_no, ewb_date, invoice_id, invoice_no, invoice_date, doc_type,
  from_gstin, from_name, from_pincode, from_state_code,
  to_gstin, to_name, to_pincode, to_state_code,
  total_value, hsn_code, status, part_b_generated,
  vehicle_no, transporter_name, distance_km)
SELECT 12, 'EWB784512093846', '2026-06-10', invoices.id, invoices.invoice_no, invoices.invoice_date, 'INV',
  '27AABCS1234E1Z5', 'Hetansh Technologie Solutions', '411001', 27,
  parties.gstin, parties.name, '560001', 29,
  invoices.total, '8471', 'expired', true,
  'KA-05-XY-1234', 'GreenMove Logistics', 880
FROM invoices JOIN parties ON invoices.customer_id = parties.id WHERE invoices.id = 10;

UPDATE invoices SET eway_bill_no = 'EWB482618293847' WHERE id = 1;
UPDATE invoices SET eway_bill_no = 'EWB938451726304' WHERE id = 2;
UPDATE invoices SET eway_bill_no = 'EWB784512093846' WHERE id = 10;

-- 3. Cost Centres
INSERT INTO cost_centres (org_id, name, code, description) VALUES
(12, 'Corporate HQ', 'HQ-001', 'Head office administration and management'),
(12, 'Sales & Marketing', 'SALES-001', 'Sales team, advertising, promotions'),
(12, 'Research & Development', 'RD-001', 'Product R&D and innovation'),
(12, 'Manufacturing', 'MFG-001', 'Production and factory operations'),
(12, 'IT & Technology', 'IT-001', 'Software, hardware, IT infrastructure'),
(12, 'Human Resources', 'HR-001', 'Recruitment, training, payroll'),
(12, 'Finance & Accounts', 'FIN-001', 'Accounting, compliance, taxation'),
(12, 'Warehouse & Logistics', 'WHS-001', 'Godown, inventory, dispatches'),
(12, 'Customer Support', 'SUPPORT-001', 'Post-sales support and service'),
(12, 'Quality Assurance', 'QA-001', 'Quality control and audits')
ON CONFLICT (org_id, name) DO NOTHING;

-- 4. Budgets (FY 2025-26)
INSERT INTO budgets (org_id, fiscal_year, account_id, cost_centre_id, budget_amount, spent_amount, notes)
SELECT 12, '2025-26', ca.id, cc.id, 500000, 325000, 'Annual marketing budget'
FROM chart_of_accounts ca, cost_centres cc
WHERE ca.org_id = 12 AND (ca.code = '40009' OR ca.name LIKE '%Advertising%')
  AND cc.org_id = 12 AND cc.name = 'Sales & Marketing'
  AND NOT EXISTS (SELECT 1 FROM budgets b WHERE b.org_id=12 AND b.fiscal_year='2025-26' AND b.account_id=ca.id AND b.cost_centre_id=cc.id);

INSERT INTO budgets (org_id, fiscal_year, account_id, cost_centre_id, budget_amount, spent_amount, notes)
SELECT 12, '2025-26', ca.id, cc.id, 800000, 420000, 'IT infrastructure and software'
FROM chart_of_accounts ca, cost_centres cc
WHERE ca.org_id = 12 AND ca.name LIKE '%Office%'
  AND cc.org_id = 12 AND cc.name = 'IT & Technology'
  AND NOT EXISTS (SELECT 1 FROM budgets b WHERE b.org_id=12 AND b.fiscal_year='2025-26' AND b.account_id=ca.id AND b.cost_centre_id=cc.id);

INSERT INTO budgets (org_id, fiscal_year, cost_centre_id, budget_amount, spent_amount, notes)
SELECT 12, '2025-26', cc.id, 2000000, 1100000, 'Company-wide contingency'
FROM cost_centres cc WHERE cc.org_id = 12 AND cc.name = 'Corporate HQ'
  AND NOT EXISTS (SELECT 1 FROM budgets b WHERE b.org_id=12 AND b.fiscal_year='2025-26' AND b.cost_centre_id=cc.id AND b.account_id IS NULL);

-- 5. TDS Certificates
INSERT INTO tds_certificates (org_id, party_id, certificate_type, financial_year, quarter, section, total_amount, tds_amount, certificate_no, issue_date, status)
SELECT 12, id, 'form16a', '2024-25', 'Q4', '194C', 450000, 4500, 'TDS-2425-Q4-001', '2025-05-15', 'received'
FROM parties WHERE org_id = 12 AND name = 'Prime Components Ltd';

INSERT INTO tds_certificates (org_id, party_id, certificate_type, financial_year, quarter, section, total_amount, tds_amount, certificate_no, issue_date, status)
SELECT 12, id, 'form16a', '2024-25', 'Q3', '194C', 325000, 3250, 'TDS-2425-Q3-002', '2025-02-10', 'received'
FROM parties WHERE org_id = 12 AND name = 'Prime Components Ltd';

INSERT INTO tds_certificates (org_id, party_id, certificate_type, financial_year, quarter, section, total_amount, tds_amount, certificate_no, issue_date, status)
SELECT 12, id, 'form16', '2024-25', 'Annual', '192', 600000, 15000, 'F16-2425-EMP-001', '2025-06-30', 'issued'
FROM parties WHERE org_id = 12 AND name = 'TechWorld Solutions';

INSERT INTO tds_certificates (org_id, party_id, certificate_type, financial_year, quarter, section, total_amount, tds_amount, certificate_no, issue_date, status)
SELECT 12, id, 'form16a', '2024-25', 'Q2', '194I', 240000, 24000, 'TDS-2425-Q2-003', '2024-11-20', 'issued'
FROM parties WHERE org_id = 12 AND name = 'GreenLeaf Traders';

INSERT INTO tds_certificates (org_id, party_id, certificate_type, financial_year, quarter, section, total_amount, tds_amount, status)
SELECT 12, id, 'form27d', '2025-26', 'Q1', '194Q', 550000, 550, 'pending'
FROM parties WHERE org_id = 12 AND name = 'Prime Components Ltd';

-- 6. TDS Challans
INSERT INTO tds_challans (org_id, challan_no, section, tds_type, amount, deposit_date, mode, status) VALUES
(12, 'ITNS281-0625-001', '194C', 'tds', 7750.00, '2025-07-07', 'online', 'paid'),
(12, 'ITNS281-0625-002', '194I', 'tds', 24000.00, '2025-07-07', 'online', 'paid'),
(12, 'ITNS281-0925-001', '194C', 'tds', 3250.00, '2025-10-07', 'online', 'paid'),
(12, 'ITNS281-0925-002', '194Q', 'tds', 550.00, '2025-10-07', 'online', 'paid'),
(12, 'ITNS282-0326-001', '206C', 'tcs', 1280.00, '2026-03-07', 'online', 'paid');
