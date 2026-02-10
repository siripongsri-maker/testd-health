
-- Create an RPC function to award XP to a user (for article likes)
-- This uses SECURITY DEFINER to bypass RLS since the liker awards XP to the author
CREATE OR REPLACE FUNCTION public.award_xp_to_user(target_user_id uuid, xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow positive XP amounts up to 100
  IF xp_amount <= 0 OR xp_amount > 100 THEN
    RAISE EXCEPTION 'Invalid XP amount';
  END IF;
  
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Cannot award XP to yourself
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Cannot award XP to yourself';
  END IF;

  UPDATE public.profiles 
  SET xp = COALESCE(xp, 0) + xp_amount,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;
