CREATE OR REPLACE FUNCTION public.generate_selftest_fingerprints()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_address text;
  v_name_norm text;
  v_address_norm text;
  v_name_fp text;
  v_address_fp text;
  v_name_address_fp text;
  v_dup_count int;
  v_name_freq int;
  v_addr_freq int;
  v_abuse_reasons text[];
  v_score int := 0;
BEGIN
  SELECT full_name, COALESCE(address, '') || ' ' || COALESCE(district, '') || ' ' || COALESCE(province, '') || ' ' || COALESCE(postal_code, '')
  INTO v_name, v_address
  FROM public.selftest_pii
  WHERE id = NEW.pii_id;

  IF v_name IS NULL AND v_address IS NULL THEN
    RETURN NEW;
  END IF;

  v_name_norm := normalize_text_for_fp(v_name);
  v_address_norm := normalize_text_for_fp(v_address);

  -- convert_to() instead of a ::bytea cast: the cast parsed the text as a
  -- bytea literal, so any backslash in an address (e.g. "24\199") raised
  -- 22P02 invalid input syntax for type bytea and blocked registration.
  v_name_fp := CASE WHEN v_name_norm != '' THEN encode(extensions.digest(convert_to(v_name_norm, 'UTF8'), 'sha256'), 'hex') ELSE NULL END;
  v_address_fp := CASE WHEN v_address_norm != '' THEN encode(extensions.digest(convert_to(v_address_norm, 'UTF8'), 'sha256'), 'hex') ELSE NULL END;
  v_name_address_fp := CASE WHEN v_name_norm != '' AND v_address_norm != ''
    THEN encode(extensions.digest(convert_to(v_name_norm || '|' || v_address_norm, 'UTF8'), 'sha256'), 'hex')
    ELSE NULL END;

  NEW.name_fp := v_name_fp;
  NEW.address_fp := v_address_fp;
  NEW.name_address_fp := v_name_address_fp;

  v_abuse_reasons := ARRAY[]::text[];

  IF v_name_address_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_dup_count
    FROM public.hiv_selftest_requests
    WHERE name_address_fp = v_name_address_fp
      AND id != NEW.id
      AND created_at > now() - interval '30 days'
      AND status != 'rejected';
    IF v_dup_count > 0 THEN
      v_abuse_reasons := array_append(v_abuse_reasons, 'duplicate_30d');
      v_score := v_score + 10;
    END IF;
  END IF;

  IF v_name_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_name_freq
    FROM public.hiv_selftest_requests
    WHERE name_fp = v_name_fp
      AND id != NEW.id
      AND created_at > now() - interval '14 days';
    IF v_name_freq >= 2 THEN
      v_abuse_reasons := array_append(v_abuse_reasons, 'high_freq_name');
      v_score := v_score + 5;
    END IF;
  END IF;

  IF v_address_fp IS NOT NULL THEN
    SELECT COUNT(*) INTO v_addr_freq
    FROM public.hiv_selftest_requests
    WHERE address_fp = v_address_fp
      AND id != NEW.id
      AND created_at > now() - interval '14 days';
    IF v_addr_freq >= 2 THEN
      v_abuse_reasons := array_append(v_abuse_reasons, 'high_freq_address');
      v_score := v_score + 5;
    END IF;
  END IF;

  IF array_length(v_abuse_reasons, 1) > 0 THEN
    NEW.abuse_flag := true;
    NEW.abuse_reason := array_to_string(v_abuse_reasons, ', ');
    NEW.abuse_score := v_score;
    NEW.abuse_checked_at := now();
  ELSE
    NEW.abuse_checked_at := now();
  END IF;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Fingerprinting is anti-abuse convenience: never let it block registration.
  NEW.abuse_checked_at := now();
  RETURN NEW;
END;
$function$;