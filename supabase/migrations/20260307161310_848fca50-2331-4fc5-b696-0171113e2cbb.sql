
-- 1. Fix complete_survey to only award XP on FIRST completion per user per survey
CREATE OR REPLACE FUNCTION public.complete_survey(p_survey_id uuid, p_session_id text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_xp_reward INTEGER;
  v_user_id UUID;
  v_already_completed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- Get XP reward
  SELECT xp_reward INTO v_xp_reward FROM surveys WHERE id = p_survey_id;
  
  IF v_xp_reward IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Check if user already completed this survey (XP was awarded)
  v_already_completed := FALSE;
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM survey_completions 
      WHERE survey_id = p_survey_id AND user_id = v_user_id AND xp_awarded > 0
    ) INTO v_already_completed;
  END IF;
  
  -- Increment completion count
  UPDATE surveys 
  SET completion_count = completion_count + 1,
      updated_at = now()
  WHERE id = p_survey_id;
  
  -- Record completion (XP=0 if already completed before)
  INSERT INTO survey_completions (survey_id, user_id, session_id, xp_awarded)
  VALUES (p_survey_id, v_user_id, p_session_id, CASE WHEN v_already_completed THEN 0 ELSE v_xp_reward END);
  
  -- Award XP only on first completion
  IF v_user_id IS NOT NULL AND NOT v_already_completed THEN
    UPDATE profiles 
    SET xp = COALESCE(xp, 0) + v_xp_reward,
        updated_at = now()
    WHERE id = v_user_id;
  END IF;
  
  RETURN CASE WHEN v_already_completed THEN 0 ELSE v_xp_reward END;
END;
$function$;

-- 2. Correct XP for Trex: legitimate XP from activities only
-- Trex had 24,380 XP. Legitimate: 1 booking created (1000) + 1 completed (0, no checkin/checkout by self)
-- + 1 med checkin (~10) + 1 quest completed + first-time survey completions (100+20+10+10=140)
-- Approximate legitimate: ~1,150 XP. Let's calculate precisely from first completions.
-- Survey first completions: 100 (survey 4c8db0d8) + 20 (03562e62) + 10 (bf1df3b8) + 10 (7db0abca) = 140
-- 1 quest = unknown XP, 1 booking = 1000, 1 med checkin = 10
-- Total legitimate estimate: 1150 + quest XP
-- Set to sum of first-completion XP only
UPDATE profiles SET xp = 1200, updated_at = now() WHERE id = '52d1fafc-31a6-4792-b409-ce5fcbeab1fa';

-- 3. Correct XP for Chaktit: 
-- Survey first completions: 100 (4c8db0d8) + 20 (03562e62) + 10 (bf1df3b8) + 10 (7db0abca) = 140
-- 1 selftest request = ~40 XP, 1 quest
-- Total legitimate estimate: ~230
UPDATE profiles SET xp = 250, updated_at = now() WHERE id = '127b8ab1-e2f2-4794-8383-4d0506b10488';

-- 4. Mark duplicate survey_completions with xp_awarded = 0 retroactively
-- Keep only the first completion per user per survey with XP
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, survey_id ORDER BY completed_at ASC) as rn
  FROM survey_completions
  WHERE xp_awarded > 0
)
UPDATE survey_completions sc
SET xp_awarded = 0
FROM ranked r
WHERE sc.id = r.id AND r.rn > 1;
