-- 1. Bridge columns on hr_referrals
ALTER TABLE public.hr_referrals
  ADD COLUMN IF NOT EXISTS screening_id uuid REFERENCES public.hr_screenings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.booking_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS handled_by uuid,
  ADD COLUMN IF NOT EXISTS handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS counselor_notes text;

CREATE INDEX IF NOT EXISTS hr_referrals_branch_idx ON public.hr_referrals(branch_id);
CREATE INDEX IF NOT EXISTS hr_referrals_status_idx ON public.hr_referrals(status);
CREATE INDEX IF NOT EXISTS hr_referrals_screening_idx ON public.hr_referrals(screening_id);
CREATE INDEX IF NOT EXISTS hr_screenings_user_idx ON public.hr_screenings(user_id);
CREATE INDEX IF NOT EXISTS hr_screenings_anon_idx ON public.hr_screenings(anonymous_token);

GRANT SELECT, INSERT, UPDATE ON public.hr_referrals TO authenticated;
GRANT INSERT ON public.hr_referrals TO anon;
GRANT ALL ON public.hr_referrals TO service_role;

-- 2. Counselors / branch staff can work the HR referral queue
DROP POLICY IF EXISTS "Counselors read hr referrals" ON public.hr_referrals;
CREATE POLICY "Counselors read hr referrals"
ON public.hr_referrals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.is_branch_counselor(auth.uid())
    AND (branch_id IS NULL OR public.user_can_access_branch(auth.uid(), branch_id))
  )
);

DROP POLICY IF EXISTS "Counselors update hr referrals" ON public.hr_referrals;
CREATE POLICY "Counselors update hr referrals"
ON public.hr_referrals FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.is_branch_counselor(auth.uid())
    AND (branch_id IS NULL OR public.user_can_access_branch(auth.uid(), branch_id))
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.is_branch_counselor(auth.uid())
    AND (branch_id IS NULL OR public.user_can_access_branch(auth.uid(), branch_id))
  )
);

-- 3. Can the current staff member see this client's HR context?
CREATE OR REPLACE FUNCTION public.can_view_client_hr_context(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _client_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        public.is_branch_counselor(auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.user_id = _client_id
              AND a.branch_id IS NOT NULL
              AND public.user_can_access_branch(auth.uid(), a.branch_id)
          )
          OR EXISTS (
            SELECT 1 FROM public.hr_referrals r
            WHERE r.user_id = _client_id
              AND (r.branch_id IS NULL OR public.user_can_access_branch(auth.uid(), r.branch_id))
          )
        )
      )
    );
$$;

-- 4. Aggregated harm-reduction context for a client, with PDPA audit trail
CREATE OR REPLACE FUNCTION public.get_client_hr_context(_client_id uuid, _reason text DEFAULT 'pre_counselling_review')
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_screening public.hr_screenings%ROWTYPE;
  v_result jsonb;
BEGIN
  IF NOT public.can_view_client_hr_context(_client_id) THEN
    INSERT INTO public.pdpa_audit_logs (actor_type, actor_id, action_type, target_type, target_id,
      target_classification, reason, result)
    VALUES ('staff', auth.uid(), 'view_hr_context', 'hr_screening', _client_id::text,
      'sensitive_health', _reason, 'denied');
    RAISE EXCEPTION 'Not authorized to view harm reduction context for this client';
  END IF;

  SELECT * INTO v_screening
  FROM public.hr_screenings
  WHERE user_id = _client_id
  ORDER BY COALESCE(completed_at, created_at) DESC NULLS LAST
  LIMIT 1;

  v_result := jsonb_build_object(
    'has_data', v_screening.id IS NOT NULL,
    'screening', CASE WHEN v_screening.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_screening.id,
      'status', v_screening.status,
      'risk_level', v_screening.risk_level,
      'recommendations', v_screening.recommendations,
      'completed_at', v_screening.completed_at,
      'created_at', v_screening.created_at
    ) END,
    'mental_health', (
      SELECT to_jsonb(m) FROM public.hr_mental_health m
      WHERE m.screening_id = v_screening.id ORDER BY m.created_at DESC LIMIT 1
    ),
    'sexual_health', (
      SELECT to_jsonb(s) FROM public.hr_sexual_health s
      WHERE s.screening_id = v_screening.id ORDER BY s.created_at DESC LIMIT 1
    ),
    'substance_use', (
      SELECT to_jsonb(su) FROM public.hr_substance_use su
      WHERE su.screening_id = v_screening.id ORDER BY su.created_at DESC LIMIT 1
    ),
    'harm_history', (
      SELECT to_jsonb(h) FROM public.hr_harm_history h
      WHERE h.screening_id = v_screening.id ORDER BY h.created_at DESC LIMIT 1
    ),
    'profile', (
      SELECT jsonb_build_object(
        'age_range', p.age_range,
        'gender_identity', p.gender_identity,
        'sexual_behavior_category', p.sexual_behavior_category,
        'is_msm', p.is_msm,
        'is_msw', p.is_msw
      )
      FROM public.hr_user_profile p WHERE p.user_id = _client_id
      ORDER BY p.created_at DESC LIMIT 1
    ),
    'referrals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'referral_type', r.referral_type,
        'status', r.status,
        'priority', r.priority,
        'risk_level', r.risk_level,
        'created_at', r.created_at
      ) ORDER BY r.created_at DESC)
      FROM public.hr_referrals r WHERE r.user_id = _client_id
    ), '[]'::jsonb),
    'screening_count', (SELECT count(*) FROM public.hr_screenings hs WHERE hs.user_id = _client_id)
  );

  INSERT INTO public.pdpa_audit_logs (actor_type, actor_id, action_type, target_type, target_id,
    target_classification, reason, result, metadata)
  VALUES ('staff', auth.uid(), 'view_hr_context', 'hr_screening', _client_id::text,
    'sensitive_health', _reason, 'allowed',
    jsonb_build_object('screening_id', v_screening.id));

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_hr_context(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_hr_context(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_client_hr_context(uuid) TO authenticated;