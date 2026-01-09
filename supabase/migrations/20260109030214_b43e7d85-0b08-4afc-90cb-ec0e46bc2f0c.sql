-- Create a function to validate Thai National ID using checksum algorithm
CREATE OR REPLACE FUNCTION public.validate_thai_id(thai_id text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  i integer;
  sum_val integer := 0;
  check_digit integer;
BEGIN
  -- Allow NULL values (optional field)
  IF thai_id IS NULL OR thai_id = '' THEN
    RETURN true;
  END IF;
  
  -- Check length is exactly 13 digits
  IF length(thai_id) != 13 THEN
    RETURN false;
  END IF;
  
  -- Check all characters are digits
  IF thai_id !~ '^[0-9]{13}$' THEN
    RETURN false;
  END IF;
  
  -- Calculate checksum using Thai ID algorithm
  -- Sum of (digit * (14 - position)) for first 12 digits
  FOR i IN 1..12 LOOP
    sum_val := sum_val + (substring(thai_id, i, 1)::integer * (14 - i));
  END LOOP;
  
  -- Check digit is (11 - (sum mod 11)) mod 10
  check_digit := (11 - (sum_val % 11)) % 10;
  
  -- Compare with the 13th digit
  RETURN check_digit = substring(thai_id, 13, 1)::integer;
END;
$$;

-- Create trigger function to validate Thai ID before insert/update
CREATE OR REPLACE FUNCTION public.validate_thai_id_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT validate_thai_id(NEW.thai_id) THEN
    RAISE EXCEPTION 'Invalid Thai National ID: checksum validation failed';
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger to selftest_pii table
DROP TRIGGER IF EXISTS validate_thai_id_before_insert ON public.selftest_pii;
CREATE TRIGGER validate_thai_id_before_insert
  BEFORE INSERT OR UPDATE ON public.selftest_pii
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_thai_id_trigger();

-- Also add trigger to hiv_selftest_requests table (legacy column)
DROP TRIGGER IF EXISTS validate_thai_id_before_insert ON public.hiv_selftest_requests;
CREATE TRIGGER validate_thai_id_before_insert
  BEFORE INSERT OR UPDATE ON public.hiv_selftest_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_thai_id_trigger();