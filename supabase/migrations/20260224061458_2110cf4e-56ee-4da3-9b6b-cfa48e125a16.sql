
-- Phase 1A: Add referral_code column + trigger, make user_id nullable, relax service_id NOT NULL
-- Add referral_code column
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS referral_code text;

-- Create unique index on referral_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_referral_code ON public.appointments(referral_code) WHERE referral_code IS NOT NULL;

-- Make user_id nullable for anonymous bookings
ALTER TABLE public.appointments ALTER COLUMN user_id DROP NOT NULL;

-- Make service_id nullable (join table is source of truth)
ALTER TABLE public.appointments ALTER COLUMN service_id DROP NOT NULL;

-- Add unique constraint to prevent duplicate bookings
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_duplicate
ON public.appointments(user_id, branch_id, appointment_date, start_time)
WHERE status != 'cancelled' AND user_id IS NOT NULL;

-- Generate referral code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  attempts int := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    code := 'SWG-';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE referral_code = code) THEN
      NEW.referral_code := code;
      RETURN NEW;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
END;
$$;

-- Trigger to auto-generate referral code on INSERT
DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.appointments;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing appointments with referral codes
DO $$
DECLARE
  rec RECORD;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  FOR rec IN SELECT id FROM public.appointments WHERE referral_code IS NULL LOOP
    LOOP
      code := 'SWG-';
      FOR i IN 1..6 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      BEGIN
        UPDATE public.appointments SET referral_code = code WHERE id = rec.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- retry
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- Allow anonymous INSERT (user_id is null but contact_email required)
CREATE POLICY "Anonymous can create appointments with contact email"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND contact_email IS NOT NULL);

-- Allow anonymous SELECT by referral code (handled via RPC below)
-- RPC: lookup appointment by referral_code + contact_email
CREATE OR REPLACE FUNCTION public.lookup_appointment_by_code(
  p_referral_code text,
  p_contact_email text
)
RETURNS TABLE (
  id uuid,
  referral_code text,
  branch_id uuid,
  appointment_date date,
  start_time time,
  status text,
  contact_email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.referral_code, a.branch_id, a.appointment_date, a.start_time,
         a.status, a.contact_email, a.created_at
  FROM public.appointments a
  WHERE a.referral_code = p_referral_code
    AND a.contact_email = p_contact_email
  LIMIT 1;
$$;
