-- ============================================================
-- ZippyRide Database Schema for Supabase (PostgreSQL)
-- ============================================================

-- 1. PROFILES (extends Supabase Auth users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('rider', 'driver', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

-- 2. DRIVER DETAILS (only for role='driver')
CREATE TABLE public.driver_details (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL,
  license_photo_url TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'sedan',
  vehicle_number TEXT NOT NULL,
  vehicle_color TEXT,
  vehicle_photo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating DECIMAL(2,1) DEFAULT 5.0,
  total_rides INT DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  bank_account TEXT,
  bank_ifsc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_driver_online ON public.driver_details(is_online) WHERE is_online = TRUE;
CREATE INDEX idx_driver_verified ON public.driver_details(is_verified) WHERE is_verified = TRUE;

-- 3. RIDER DETAILS (only for role='rider')
CREATE TABLE public.rider_details (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_locations JSONB DEFAULT '[]'::jsonb,
  rating DECIMAL(2,1) DEFAULT 5.0,
  total_rides INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TRIPS
CREATE TYPE trip_status AS ENUM ('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.trips (
  id BIGSERIAL PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES public.profiles(id),
  driver_id UUID REFERENCES public.profiles(id),
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  drop_lat DOUBLE PRECISION,
  drop_lng DOUBLE PRECISION,
  drop_address TEXT,
  status trip_status NOT NULL DEFAULT 'requested',
  fare_estimate DECIMAL(10,2),
  fare_final DECIMAL(10,2),
  distance_km DECIMAL(6,2),
  duration_min INT,
  payment_method TEXT DEFAULT 'cash',
  driver_rating INT CHECK (driver_rating >= 1 AND driver_rating <= 5),
  rider_rating INT CHECK (rider_rating >= 1 AND rider_rating <= 5),
  rider_comment TEXT,
  driver_comment TEXT,
  cancellation_reason TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('rider', 'driver')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_trips_rider ON public.trips(rider_id);
CREATE INDEX idx_trips_driver ON public.trips(driver_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_created ON public.trips(created_at DESC);

-- 5. RIDE PAYMENTS (named ride_payments to avoid conflict with existing payments table)
CREATE TYPE ride_payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE public.ride_payments (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES public.trips(id),
  rider_id UUID NOT NULL REFERENCES public.profiles(id),
  driver_id UUID REFERENCES public.profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) DEFAULT 0.00,
  driver_earnings DECIMAL(10,2) DEFAULT 0.00,
  method TEXT NOT NULL DEFAULT 'cash',
  gateway TEXT,
  gateway_txn_id TEXT,
  status ride_payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX idx_rpayments_trip ON public.ride_payments(trip_id);
CREATE INDEX idx_rpayments_status ON public.ride_payments(status);
CREATE INDEX idx_rpayments_rider ON public.ride_payments(rider_id);
CREATE INDEX idx_rpayments_driver ON public.ride_payments(driver_id);

-- 6. SUPPORT TICKETS
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

CREATE TABLE public.support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  trip_id BIGINT REFERENCES public.trips(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);

-- 7. TICKET MESSAGES
CREATE TABLE public.ticket_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES public.support_tickets(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles: users can read all profiles (for lookup), update own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Driver details: drivers can manage own, anyone can read (for ride requests)
CREATE POLICY "driver_select" ON public.driver_details FOR SELECT USING (true);
CREATE POLICY "driver_insert" ON public.driver_details FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "driver_update_own" ON public.driver_details FOR UPDATE USING (id = auth.uid());
CREATE POLICY "driver_update_admin" ON public.driver_details FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Rider details
CREATE POLICY "rider_select" ON public.rider_details FOR SELECT USING (true);
CREATE POLICY "rider_insert" ON public.rider_details FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "rider_update" ON public.rider_details FOR UPDATE USING (id = auth.uid());

-- Trips: riders see own trips, drivers see assigned/open trips, admin sees all
CREATE POLICY "trips_select_rider" ON public.trips FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "trips_select_driver" ON public.trips FOR SELECT USING (
  driver_id = auth.uid() OR (status = 'requested' AND EXISTS (
    SELECT 1 FROM public.driver_details WHERE id = auth.uid() AND is_verified = TRUE
  ))
);
CREATE POLICY "trips_select_admin" ON public.trips FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "trips_insert" ON public.trips FOR INSERT WITH CHECK (rider_id = auth.uid());
CREATE POLICY "trips_update_rider" ON public.trips FOR UPDATE USING (rider_id = auth.uid());
CREATE POLICY "trips_update_driver" ON public.trips FOR UPDATE USING (driver_id = auth.uid());
CREATE POLICY "trips_update_admin" ON public.trips FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Ride Payments: users see own, admin sees all
CREATE POLICY "rpayments_select_own" ON public.ride_payments FOR SELECT USING (
  rider_id = auth.uid() OR driver_id = auth.uid()
);
CREATE POLICY "rpayments_select_admin" ON public.ride_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "rpayments_insert_admin" ON public.ride_payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "rpayments_update_admin" ON public.ride_payments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Support tickets
CREATE POLICY "tickets_select_own" ON public.support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tickets_select_admin" ON public.support_tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "tickets_insert" ON public.support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_update_admin" ON public.support_tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Ticket messages
CREATE POLICY "ticket_msgs_select" ON public.ticket_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND (user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')))
);
CREATE POLICY "ticket_msgs_insert" ON public.ticket_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- SUPABASE REALTIME: enable realtime for trips table
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_details;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_payments;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Fare estimation: base + per_km * distance + per_min * duration
CREATE OR REPLACE FUNCTION public.estimate_fare(
  p_distance_km DOUBLE PRECISION,
  p_duration_min INT,
  p_vehicle_type TEXT DEFAULT 'sedan'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base DECIMAL(10,2);
  v_per_km DECIMAL(10,2);
  v_per_min DECIMAL(10,2);
  v_fare DECIMAL(10,2);
BEGIN
  -- Fare rates by vehicle type
  SELECT
    CASE p_vehicle_type
      WHEN 'auto' THEN 25
      WHEN 'sedan' THEN 50
      WHEN 'suv' THEN 75
      WHEN 'premium' THEN 100
      ELSE 50
    END,
    CASE p_vehicle_type
      WHEN 'auto' THEN 8
      WHEN 'sedan' THEN 12
      WHEN 'suv' THEN 18
      WHEN 'premium' THEN 25
      ELSE 12
    END,
    CASE p_vehicle_type
      WHEN 'auto' THEN 1
      WHEN 'sedan' THEN 2
      WHEN 'suv' THEN 3
      WHEN 'premium' THEN 4
      ELSE 2
    END
  INTO v_base, v_per_km, v_per_min;

  v_fare := v_base + (v_per_km * p_distance_km) + (v_per_min * p_duration_min);
  v_fare := GREATEST(v_fare, v_base); -- minimum fare = base

  RETURN jsonb_build_object(
    'base_fare', v_base,
    'per_km', v_per_km,
    'per_min', v_per_min,
    'distance_km', p_distance_km,
    'duration_min', p_duration_min,
    'total_fare', ROUND(v_fare, 2),
    'vehicle_type', p_vehicle_type
  );
END;
$$;

-- Get nearby drivers (within radius km)
CREATE OR REPLACE FUNCTION public.get_nearby_drivers(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 5
)
RETURNS TABLE(
  driver_id UUID,
  name TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT,
  vehicle_color TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating DECIMAL(2,1),
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dd.id,
    p.name,
    dd.vehicle_type,
    dd.vehicle_number,
    dd.vehicle_color,
    dd.current_lat,
    dd.current_lng,
    dd.rating,
    ROUND(
      (6371 * acos(
        cos(radians(p_lat)) * cos(radians(dd.current_lat)) *
        cos(radians(dd.current_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(dd.current_lat))
      ))::DECIMAL, 2
    ) AS distance_km
  FROM public.driver_details dd
  JOIN public.profiles p ON p.id = dd.id
  WHERE dd.is_online = TRUE
    AND dd.is_verified = TRUE
    AND dd.current_lat IS NOT NULL
    AND dd.current_lng IS NOT NULL
  HAVING distance_km <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$;

-- Dashboard stats for admin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_drivers', (SELECT COUNT(*) FROM public.profiles WHERE role = 'driver'),
    'verified_drivers', (SELECT COUNT(*) FROM public.driver_details WHERE is_verified = TRUE),
    'online_drivers', (SELECT COUNT(*) FROM public.driver_details WHERE is_online = TRUE),
    'total_riders', (SELECT COUNT(*) FROM public.profiles WHERE role = 'rider'),
    'total_trips', (SELECT COUNT(*) FROM public.trips),
    'completed_trips', (SELECT COUNT(*) FROM public.trips WHERE status = 'completed'),
    'cancelled_trips', (SELECT COUNT(*) FROM public.trips WHERE status = 'cancelled'),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM public.ride_payments WHERE status = 'completed'),
    'pending_payouts', (SELECT COALESCE(SUM(amount), 0) FROM public.ride_payments WHERE status = 'pending'),
    'open_tickets', (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress')),
    'today_trips', (SELECT COUNT(*) FROM public.trips WHERE created_at >= CURRENT_DATE)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
