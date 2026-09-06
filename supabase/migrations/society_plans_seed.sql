INSERT INTO society_plans (name, slug, price, features)
VALUES
  ('Free', 'free', 0, '["Up to 10 residents","Basic maintenance tracking","Notice board access","Email support"]'),
  ('Standard', 'standard', 49900, '["Unlimited residents","Maintenance and billing","Facility booking","Visitor management","Complaint tracking","Community forum","Priority support"]'),
  ('Premium', 'premium', 99900, '["Everything in Standard","Advanced analytics and reports","Parking management","Emergency directory","API access","Dedicated account manager"]')
ON CONFLICT (slug) DO NOTHING;
