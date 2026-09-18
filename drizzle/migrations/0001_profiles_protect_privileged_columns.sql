CREATE OR REPLACE FUNCTION public.tg_profiles_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role / backend jobs and admins may change everything.
  IF auth.uid() IS NULL
     OR coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- A user editing their own profile may only change presentation/preference
  -- fields. Reward, trust and participation fields are server-controlled.
  NEW.trust_tier            := OLD.trust_tier;
  NEW.xp                    := OLD.xp;
  NEW.level                 := OLD.level;
  NEW.streak                := OLD.streak;
  NEW.badges                := OLD.badges;
  NEW.participant_code      := OLD.participant_code;
  NEW.is_active_participant := OLD.is_active_participant;
  NEW.consent_mel_data      := OLD.consent_mel_data;
  NEW.id                    := OLD.id;
  NEW.created_at            := OLD.created_at;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_protect_privileged_columns ON public.profiles;
CREATE TRIGGER trg_profiles_protect_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_protect_privileged_columns();