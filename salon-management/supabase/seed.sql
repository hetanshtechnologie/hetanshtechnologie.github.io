insert into public.glowly_plans (id, name, description, price, features, stylist_limit, appointment_limit, analytics_enabled)
values
  ('00000000-0000-0000-0000-000000000101', 'Basic', 'A thoughtful start for new studios.', 79, '["Booking page", "3 stylist seats", "Email reminders"]'::jsonb, 3, 100, false),
  ('00000000-0000-0000-0000-000000000102', 'Premium', 'Everything a growing salon needs.', 149, '["Advanced analytics", "10 stylist seats", "Priority support"]'::jsonb, 10, 500, true),
  ('00000000-0000-0000-0000-000000000103', 'Enterprise', 'Scale beautifully across locations.', 299, '["Multi-location insights", "Unlimited seats", "Dedicated success manager"]'::jsonb, 0, 0, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  features = excluded.features,
  stylist_limit = excluded.stylist_limit,
  appointment_limit = excluded.appointment_limit,
  analytics_enabled = excluded.analytics_enabled,
  active = true;
