
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.guest_universal_lookup(p_identifier text)
 RETURNS TABLE(appointment_id uuid, appointment_date date, start_time time without time zone, status text, referral_code text, branch_name_th text, branch_name_en text, branch_slug text, services_summary text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_is_email := v_input ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  v_is_referral := v_input ~* '^SWG-[A-Z0-9]+$';

  IF v_is_referral THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM guest_lookup_attempts gla
    WHERE gla.referral_code = upper(v_input)
      AND gla.created_at > now() - interval '15 minutes';
    INSERT INTO guest_lookup_attempts (referral_code) VALUES (upper(v_input));
    IF v_recent_count >= 15 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;

    RETURN QUERY
    SELECT a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
      bb.name_th, bb.name_en, bb.slug,
      COALESCE((SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ') FROM appointment_services aps JOIN booking_services bs ON bs.id = aps.service_id WHERE aps.appointment_id = a.id), COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')),
      a.created_at
    FROM appointments a JOIN booking_branches bb ON bb.id = a.branch_id LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
    WHERE upper(a.referral_code) = upper(v_input) AND a.status != 'cancelled'
    ORDER BY a.appointment_date DESC, a.start_time DESC;
    RETURN;
  END IF;

  IF v_is_email THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM guest_lookup_attempts gla
    WHERE gla.email = lower(v_input)
      AND gla.created_at > now() - interval '15 minutes';
    INSERT INTO guest_lookup_attempts (email) VALUES (lower(v_input));
    IF v_recent_count >= 10 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;

    RETURN QUERY
    SELECT a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
      bb.name_th, bb.name_en, bb.slug,
      COALESCE((SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ') FROM appointment_services aps JOIN booking_services bs ON bs.id = aps.service_id WHERE aps.appointment_id = a.id), COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')),
      a.created_at
    FROM appointments a JOIN booking_branches bb ON bb.id = a.branch_id LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
    WHERE lower(a.contact_email) = lower(v_input) AND a.status != 'cancelled'
    ORDER BY a.appointment_date DESC, a.start_time DESC;
    RETURN;
  END IF;

  v_hash := encode(extensions.digest(v_input::bytea, 'sha256'), 'hex');
  RETURN QUERY
  SELECT a.id, a.appointment_date, a.start_time, a.status, a.referral_code,
    bb.name_th, bb.name_en, bb.slug,
    COALESCE((SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ') FROM appointment_services aps JOIN booking_services bs ON bs.id = aps.service_id WHERE aps.appointment_id = a.id), COALESCE(bs_p.name_th || ' / ' || bs_p.name_en, '')),
    a.created_at
  FROM appointments a JOIN booking_branches bb ON bb.id = a.branch_id LEFT JOIN booking_services bs_p ON bs_p.id = a.service_id
  WHERE a.guest_access_hash = v_hash AND a.guest_access_expires_at > now() AND a.status != 'cancelled'
  ORDER BY a.appointment_date DESC, a.start_time DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_guest_access_token(p_appointment_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_token text;
  v_hash text;
BEGIN
  v_token := replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_');
  v_token := rtrim(v_token, '=');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE public.appointments
  SET guest_access_hash = v_hash,
      guest_access_created_at = now(),
      guest_access_expires_at = now() + interval '30 days'
  WHERE id = p_appointment_id
    AND user_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_found_or_not_guest';
  END IF;

  RETURN v_token;
END;
$function$;
