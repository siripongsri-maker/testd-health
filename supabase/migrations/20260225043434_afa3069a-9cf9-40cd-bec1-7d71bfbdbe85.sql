-- Universal guest lookup RPC: handles email, referral code (SWG-...), or magic token
CREATE OR REPLACE FUNCTION public.guest_universal_lookup(p_identifier text)
RETURNS TABLE (
  appointment_id uuid,
  appointment_date date,
  start_time time,
  status text,
  referral_code text,
  branch_name_th text,
  branch_name_en text,
  branch_slug text,
  services_summary text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_input text;
  v_is_email boolean;
  v_is_referral boolean;
  v_hash text;
  v_recent_count integer;
BEGIN
  v_input := trim(p_identifier);

  IF v_input IS NULL OR v_input = '' THEN
    RAISE EXCEPTION 'empty_identifier';
  END IF;

  -- Detect type
  v_is_email := v_input ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  v_is_referral := v_input ~* '^SWG-[A-Z0-9]+$';

  -- === CASE 1: Referral code (SWG-...) ===
  IF v_is_referral THEN
    -- Rate limit by referral code
    SELECT COUNT(*) INTO v_recent_count
    FROM guest_lookup_attempts
    WHERE referral_code = upper(v_input)
      AND created_at > now() - interval '15 minutes';

    INSERT INTO guest_lookup_attempts (referral_code)
    VALUES (upper(v_input));

    IF v_recent_count >= 15 THEN
      RAISE EXCEPTION 'rate_limit_exceeded';
    END IF;

    RETURN QUERY
    SELECT
      a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
      bb.name_th, bb.name_en, bb.slug,
      COALESCE(
        (SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ')
         FROM appointment_services aps
         JOIN booking_services bs ON bs.id = aps.service_id
         WHERE aps.appointment_id = a.id),
        COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')
      ),
      a.created_at
    FROM appointments a
    JOIN booking_branches bb ON bb.id = a.branch_id
    LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
    WHERE upper(a.referral_code) = upper(v_input)
      AND a.status != 'cancelled'
    ORDER BY a.appointment_date DESC, a.start_time DESC;
    RETURN;
  END IF;

  -- === CASE 2: Email ===
  IF v_is_email THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM guest_lookup_attempts
    WHERE email = lower(v_input)
      AND created_at > now() - interval '15 minutes';

    INSERT INTO guest_lookup_attempts (email)
    VALUES (lower(v_input));

    IF v_recent_count >= 10 THEN
      RAISE EXCEPTION 'rate_limit_exceeded';
    END IF;

    RETURN QUERY
    SELECT
      a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
      bb.name_th, bb.name_en, bb.slug,
      COALESCE(
        (SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ')
         FROM appointment_services aps
         JOIN booking_services bs ON bs.id = aps.service_id
         WHERE aps.appointment_id = a.id),
        COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')
      ),
      a.created_at
    FROM appointments a
    JOIN booking_branches bb ON bb.id = a.branch_id
    LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
    WHERE lower(a.contact_email) = lower(v_input)
      AND a.status != 'cancelled'
    ORDER BY a.appointment_date DESC, a.start_time DESC;
    RETURN;
  END IF;

  -- === CASE 3: Magic token (anything else) ===
  v_hash := encode(digest(v_input, 'sha256'), 'hex');

  RETURN QUERY
  SELECT
    a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
    bb.name_th, bb.name_en, bb.slug,
    COALESCE(
      (SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ')
       FROM appointment_services aps
       JOIN booking_services bs ON bs.id = aps.service_id
       WHERE aps.appointment_id = a.id),
      COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')
    ),
    a.created_at
  FROM appointments a
  JOIN booking_branches bb ON bb.id = a.branch_id
  LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
  WHERE a.guest_access_hash = v_hash
    AND a.guest_access_expires_at > now()
    AND a.status != 'cancelled'
  ORDER BY a.appointment_date DESC, a.start_time DESC;

  -- If we reach here with no rows for a token, the caller gets empty result
  -- which the frontend interprets as expired/invalid
END;
$$;