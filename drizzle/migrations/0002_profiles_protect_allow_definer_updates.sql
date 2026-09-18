CREATE OR REPLACE FUNCTION public.tg_profiles_protect_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Server-side paths keep full control: service role, backend jobs, admins,
  -- and SECURITY DEFINER routines (award_xp_to_user, complete_survey,
  -- update_user_trust_tier, assign_staff_to_appointment) which execute as the
  -- function owner rather than as the "authenticated" role.
  IF auth.uid() IS NULL
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), '') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

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