-- Schedule payment reminders via pg_net (requires pg_net extension)
-- Run this if pg_net is available, otherwise use keepalive.py to call the function

-- Create a helper to call the Edge Function (for keepalive.py to use)
CREATE OR REPLACE FUNCTION trigger_payment_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT content::JSONB INTO result FROM extensions.http_post(
    'https://vgipghqejzbcoighktij.supabase.co/functions/v1/send-payment-reminders',
    '{}'::TEXT,
    'application/json'
  );
  RETURN result;
END;
$$;
