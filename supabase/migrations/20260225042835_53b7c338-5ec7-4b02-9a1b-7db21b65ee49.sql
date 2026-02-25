-- Enable pgcrypto extension for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add guest access columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS guest_access_hash text,
  ADD COLUMN IF NOT EXISTS guest_access_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS guest_access_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_appointments_guest_access_hash ON public.appointments (guest_access_hash) WHERE guest_access_hash IS NOT NULL;

-- 2. Create guest lookup attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.guest_lookup_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  referral_code text,
  ip_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_lookup_attempts ENABLE ROW LEVEL SECURITY;

-- 3. RPC: get_guest_appointments_by_token
CREATE OR REPLACE FUNCTION public.get_guest_appointments_by_token(p_token text)
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
  v_hash text;
BEGIN
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.referral_code,
    bb.name_th AS branch_name_th,
    bb.name_en AS branch_name_en,
    bb.slug AS branch_slug,
    COALESCE(
      (SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ')
       FROM appointment_services aps
       JOIN booking_services bs ON bs.id = aps.service_id
       WHERE aps.appointment_id = a.id),
      COALESCE(bs_primary.name_th || ' / ' || bs_primary.name_en, '')
    ) AS services_summary,
    a.created_at
  FROM appointments a
  JOIN booking_branches bb ON bb.id = a.branch_id
  LEFT JOIN booking_services bs_primary ON bs_primary.id = a.service_id
  WHERE a.guest_access_hash = v_hash
    AND a.guest_access_expires_at > now()
    AND a.status != 'cancelled'
  ORDER BY a.appointment_date DESC, a.start_time DESC;
END;
$$;

-- 4. RPC: guest_lookup_appointment
CREATE OR REPLACE FUNCTION public.guest_lookup_appointment(p_email text, p_referral_code text)
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
  v_recent_count integer;
BEGIN
  SELECT COUNT(*) INTO v_recent_count
  FROM guest_lookup_attempts
  WHERE email = lower(trim(p_email))
    AND created_at > now() - interval '15 minutes';

  INSERT INTO guest_lookup_attempts (email, referral_code)
  VALUES (lower(trim(p_email)), upper(trim(p_referral_code)));

  IF v_recent_count >= 10 THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  RETURN QUERY
  SELECT
    a.id AS appointment_id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.referral_code,
    bb.name_th AS branch_name_th,
    bb.name_en AS branch_name_en,
    bb.slug AS branch_slug,
    COALESCE(
      (SELECT string_agg(bs.name_th || ' / ' || bs.name_en, ', ')
       FROM appointment_services aps
       JOIN booking_services bs ON bs.id = aps.service_id
       WHERE aps.appointment_id = a.id),
      COALESCE(bs_primary.name_th || ' / ' || bs_primary.name_en, '')
    ) AS services_summary,
    a.created_at
  FROM appointments a
  JOIN booking_branches bb ON bb.id = a.branch_id
  LEFT JOIN booking_services bs_primary ON bs_primary.id = a.service_id
  WHERE lower(a.contact_email) = lower(trim(p_email))
    AND upper(a.referral_code) = upper(trim(p_referral_code))
    AND a.status != 'cancelled'
  ORDER BY a.appointment_date DESC, a.start_time DESC;
END;
$$;

-- 5. RPC: generate_guest_access_token
CREATE OR REPLACE FUNCTION public.generate_guest_access_token(p_appointment_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text;
  v_hash text;
BEGIN
  v_token := replace(replace(encode(gen_random_bytes(32), 'base64'), '+', '-'), '/', '_');
  v_token := rtrim(v_token, '=');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  UPDATE appointments
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
$$;