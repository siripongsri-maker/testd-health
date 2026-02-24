
-- Function to claim anonymous appointments by matching contact_email to the user's email
CREATE OR REPLACE FUNCTION public.claim_anonymous_appointments(p_user_id uuid, p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_count integer;
BEGIN
  UPDATE appointments
  SET user_id = p_user_id,
      updated_at = now()
  WHERE user_id IS NULL
    AND lower(contact_email) = lower(p_email)
    AND status NOT IN ('cancelled');

  GET DIAGNOSTICS claimed_count = ROW_COUNT;
  RETURN claimed_count;
END;
$$;
