CREATE TABLE IF NOT EXISTS location_history (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy REAL,
  battery_level REAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_history_phone ON location_history(phone);
CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at ON location_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_location_history_phone_time ON location_history(phone, recorded_at DESC);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert location" ON location_history;
DROP POLICY IF EXISTS "anon read location" ON location_history;

CREATE POLICY "enable insert for anon" ON location_history FOR INSERT WITH CHECK (true);
CREATE POLICY "enable select for anon" ON location_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "enable delete for anon" ON location_history;
CREATE POLICY "enable delete for anon" ON location_history FOR DELETE USING (true);

-- Stored procedure to delete by IDs (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION delete_location_history(ids bigint[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt int;
BEGIN
  DELETE FROM location_history WHERE id = ANY(ids);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- Phone messages (SMS + notification capture)
CREATE TABLE IF NOT EXISTS phone_messages (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  address TEXT,
  type TEXT,
  source TEXT,
  message_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_messages_phone ON phone_messages(phone);
CREATE INDEX IF NOT EXISTS idx_phone_messages_time ON phone_messages(message_timestamp DESC);

ALTER TABLE phone_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enable insert for anon" ON phone_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "enable select for anon" ON phone_messages FOR SELECT USING (true);

-- Phone calls
CREATE TABLE IF NOT EXISTS phone_calls (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  number TEXT,
  name TEXT,
  type TEXT,
  duration INT,
  call_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_calls_phone ON phone_calls(phone);
CREATE INDEX IF NOT EXISTS idx_phone_calls_time ON phone_calls(call_timestamp DESC);

ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enable insert for anon" ON phone_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "enable select for anon" ON phone_calls FOR SELECT USING (true);

-- Phone contacts
CREATE TABLE IF NOT EXISTS phone_contacts (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  name TEXT,
  number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_contacts_phone ON phone_contacts(phone);

ALTER TABLE phone_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enable insert for anon" ON phone_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "enable select for anon" ON phone_contacts FOR SELECT USING (true);
