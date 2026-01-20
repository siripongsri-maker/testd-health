-- Fix overly permissive RLS policy on survey_completions
DROP POLICY IF EXISTS "Anyone can insert completions" ON public.survey_completions;

-- Allow authenticated users to insert their own completions
CREATE POLICY "Users can insert own completions"
ON public.survey_completions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR user_id IS NULL
);