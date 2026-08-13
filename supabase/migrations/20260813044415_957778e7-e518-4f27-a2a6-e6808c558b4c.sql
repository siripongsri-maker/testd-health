CREATE TABLE public.safe_space_quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  event_code text NOT NULL DEFAULT 'safespace',
  session_id uuid REFERENCES public.support_sessions(id) ON DELETE SET NULL,
  nickname text NOT NULL,
  age int NOT NULL,
  phone text NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 6,
  outcome text NOT NULL DEFAULT 'finished',
  test_kit_request_id uuid,
  source text
);

CREATE INDEX idx_ssqr_created_at ON public.safe_space_quiz_responses (created_at DESC);
CREATE INDEX idx_ssqr_session ON public.safe_space_quiz_responses (session_id);
CREATE INDEX idx_ssqr_event ON public.safe_space_quiz_responses (event_code);

GRANT INSERT ON public.safe_space_quiz_responses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.safe_space_quiz_responses TO authenticated;
GRANT ALL ON public.safe_space_quiz_responses TO service_role;

ALTER TABLE public.safe_space_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit quiz responses"
ON public.safe_space_quiz_responses FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff can view quiz responses"
ON public.safe_space_quiz_responses FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'me_analyst'::app_role)
  OR public.is_branch_counselor(auth.uid())
);

CREATE POLICY "Staff can update quiz responses"
ON public.safe_space_quiz_responses FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_branch_counselor(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_branch_counselor(auth.uid())
);

CREATE TRIGGER trg_ssqr_updated_at
BEFORE UPDATE ON public.safe_space_quiz_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();