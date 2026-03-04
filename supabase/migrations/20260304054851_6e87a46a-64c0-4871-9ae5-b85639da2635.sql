-- Add a rate-limiting trigger to prevent analytics flooding per session
CREATE OR REPLACE FUNCTION public.check_analytics_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.session_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM analytics_events
  WHERE session_id = NEW.session_id
    AND created_at > now() - interval '1 hour';

  IF v_count >= 500 THEN
    RAISE EXCEPTION 'Analytics rate limit exceeded for session';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER analytics_rate_limit_trigger
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_analytics_rate_limit();