
DROP FUNCTION IF EXISTS public.get_hr_demographic_stats();

CREATE FUNCTION public.get_hr_demographic_stats()
RETURNS TABLE (
  total_profiles bigint,
  msm_count bigint,
  msw_count bigint,
  age_stats jsonb,
  gender_stats jsonb,
  behavior_stats jsonb,
  total_checkins bigint,
  total_screenings bigint,
  total_ai_conversations bigint,
  total_selftest_requests bigint,
  total_peer_posts bigint,
  total_distress_alerts bigint,
  total_safer_plans bigint,
  total_referrals bigint,
  monthly_trend jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM hr_user_profile),
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msm = true),
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msw = true),
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('range', age_range, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(age_range, 'unknown') AS age_range, COUNT(*) AS cnt FROM hr_user_profile GROUP BY age_range ORDER BY age_range) a
    ),
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('identity', gender_identity, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(gender_identity, 'unknown') AS gender_identity, COUNT(*) AS cnt FROM hr_user_profile GROUP BY gender_identity ORDER BY cnt DESC) g
    ),
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('category', sexual_behavior_category, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(sexual_behavior_category, 'unknown') AS sexual_behavior_category, COUNT(*) AS cnt FROM hr_user_profile GROUP BY sexual_behavior_category ORDER BY cnt DESC) s
    ),
    (SELECT COUNT(*) FROM hr_checkins),
    (SELECT COUNT(*) FROM hr_screenings),
    (SELECT COUNT(*) FROM hr_ai_conversations),
    (SELECT COUNT(*) FROM hiv_selftest_requests),
    (SELECT COUNT(*) FROM hr_peer_posts),
    (SELECT COUNT(*) FROM hr_distress_alerts),
    (SELECT COUNT(*) FROM hr_safer_plans),
    (SELECT COUNT(*) FROM hr_referrals),
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('month', m, 'checkins', ci, 'screenings', sc)), '[]'::jsonb)
      FROM (
        SELECT
          to_char(d.month, 'YYYY-MM') AS m,
          COALESCE(c.cnt, 0) AS ci,
          COALESCE(s.cnt, 0) AS sc
        FROM (
          SELECT generate_series(
            date_trunc('month', now()) - interval '5 months',
            date_trunc('month', now()),
            interval '1 month'
          ) AS month
        ) d
        LEFT JOIN (
          SELECT date_trunc('month', created_at) AS month, COUNT(*) AS cnt
          FROM hr_checkins
          WHERE created_at >= date_trunc('month', now()) - interval '5 months'
          GROUP BY 1
        ) c ON c.month = d.month
        LEFT JOIN (
          SELECT date_trunc('month', created_at) AS month, COUNT(*) AS cnt
          FROM hr_screenings
          WHERE created_at >= date_trunc('month', now()) - interval '5 months'
          GROUP BY 1
        ) s ON s.month = d.month
        ORDER BY d.month
      ) t
    );
$$;
