CREATE OR REPLACE FUNCTION public.validate_selftest_lean_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.self_reported_result IS NOT NULL
     AND NEW.self_reported_result NOT IN ('negative','reactive','invalid','positive') THEN
    RAISE EXCEPTION 'invalid self_reported_result: %', NEW.self_reported_result;
  END IF;
  IF NEW.submission_path IS NOT NULL
     AND NEW.submission_path NOT IN ('lean_no_photo','lean_with_photo','legacy_full') THEN
    RAISE EXCEPTION 'invalid submission_path: %', NEW.submission_path;
  END IF;
  IF NEW.care_action IS NOT NULL
     AND NEW.care_action NOT IN (
       -- legacy values (kept for backward compatibility)
       'requested_callback','booked_clinic','chose_line_chat',
       'declined','requested_new_kit','subscribe_reminder',
       -- follow-up workflow values used by the admin UI
       'pending','contacted','scheduled','in_care','unreachable'
     ) THEN
    RAISE EXCEPTION 'invalid care_action: %', NEW.care_action;
  END IF;
  RETURN NEW;
END;
$function$;