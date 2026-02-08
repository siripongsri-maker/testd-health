-- Add status column to surveys table for approval workflow
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_review' 
CHECK (status IN ('draft', 'pending_review', 'published', 'rejected'));

-- Add rejection feedback column
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- Add submitted_at column for tracking when user submitted for review
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

-- Update existing surveys to be published (since they were already visible)
UPDATE public.surveys SET status = 'published' WHERE is_active = true;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Anyone can view active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can delete surveys" ON public.surveys;

-- New RLS policies for user-submitted surveys

-- Anyone can view published surveys
CREATE POLICY "Anyone can view published surveys"
  ON public.surveys FOR SELECT
  USING (status = 'published' AND is_active = true);

-- Users can view their own surveys (any status)
CREATE POLICY "Users can view own surveys"
  ON public.surveys FOR SELECT
  USING (created_by = auth.uid());

-- Admins can view all surveys
CREATE POLICY "Admins can view all surveys"
  ON public.surveys FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can create surveys (as pending_review)
CREATE POLICY "Authenticated users can create surveys"
  ON public.surveys FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Users can update their own draft/pending surveys (but not XP)
CREATE POLICY "Users can update own pending surveys"
  ON public.surveys FOR UPDATE
  USING (created_by = auth.uid() AND status IN ('draft', 'pending_review', 'rejected'))
  WITH CHECK (created_by = auth.uid() AND status IN ('draft', 'pending_review', 'rejected'));

-- Admins can update any survey (for approval, XP setting, etc.)
CREATE POLICY "Admins can update all surveys"
  ON public.surveys FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Users can delete their own draft/pending surveys
CREATE POLICY "Users can delete own pending surveys"
  ON public.surveys FOR DELETE
  USING (created_by = auth.uid() AND status IN ('draft', 'pending_review', 'rejected'));

-- Admins can delete any survey
CREATE POLICY "Admins can delete all surveys"
  ON public.surveys FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Update survey_questions policies to allow creators to manage their survey questions
DROP POLICY IF EXISTS "Admins can manage survey questions" ON public.survey_questions;

-- Survey creators can manage their survey questions
CREATE POLICY "Survey creators can manage questions"
  ON public.survey_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s 
      WHERE s.id = survey_questions.survey_id 
      AND (s.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );