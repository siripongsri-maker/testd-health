
CREATE OR REPLACE FUNCTION public.get_hr_demographic_stats()
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- total_profiles: unique people across hr_user_profile + profiles + selftest_pii
    (
      SELECT COUNT(*) FROM (
        SELECT user_id FROM hr_user_profile WHERE user_id IS NOT NULL
        UNION
        SELECT id FROM profiles
        UNION
        SELECT user_id FROM selftest_pii WHERE user_id IS NOT NULL
      ) combined
    ),
    -- msm / msw from hr_user_profile
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msm = true),
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msw = true),
    -- age_stats: from hr_user_profile + selftest_pii date_of_birth
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('range', age_range, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT age_range, SUM(cnt)::bigint AS cnt FROM (
          -- from hr_user_profile
          SELECT COALESCE(age_range, 'ไม่ระบุ') AS age_range, COUNT(*) AS cnt
          FROM hr_user_profile GROUP BY age_range
          UNION ALL
          -- from selftest_pii date_of_birth
          SELECT
            CASE
              WHEN age < 18 THEN '<18'
              WHEN age BETWEEN 18 AND 24 THEN '18-24'
              WHEN age BETWEEN 25 AND 34 THEN '25-34'
              WHEN age BETWEEN 35 AND 44 THEN '35-44'
              WHEN age BETWEEN 45 AND 54 THEN '45-54'
              WHEN age >= 55 THEN '55+'
              ELSE 'ไม่ระบุ'
            END AS age_range,
            COUNT(*) AS cnt
          FROM (
            SELECT EXTRACT(YEAR FROM age(now(), date_of_birth))::int AS age
            FROM selftest_pii
            WHERE date_of_birth IS NOT NULL
          ) ages
          GROUP BY 1
        ) combined
        GROUP BY age_range
        ORDER BY age_range
      ) a
    ),
    -- gender_stats: merged from hr_user_profile + selftest_pii
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('identity', identity, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT identity, SUM(cnt)::bigint AS cnt FROM (
          SELECT COALESCE(gender_identity, 'ไม่ระบุ') AS identity, COUNT(*) AS cnt
          FROM hr_user_profile GROUP BY gender_identity
          UNION ALL
          SELECT
            CASE
              WHEN LOWER(TRIM(gender)) IN ('male', 'm', 'ชาย') THEN 'ชาย'
              WHEN LOWER(TRIM(gender)) IN ('female', 'f', 'หญิง') THEN 'หญิง'
              WHEN LOWER(TRIM(gender)) LIKE 'transgender_male%' THEN 'ชายข้ามเพศ'
              WHEN LOWER(TRIM(gender)) LIKE 'transgender_female%' THEN 'หญิงข้ามเพศ'
              WHEN LOWER(TRIM(gender)) IN ('non_binary') THEN 'นอนไบนารี'
              WHEN LOWER(TRIM(gender)) IN ('prefer_not_to_say', 'na', 'n/a') THEN 'ไม่ระบุ'
              ELSE 'ไม่ระบุ'
            END AS identity,
            COUNT(*) AS cnt
          FROM selftest_pii
          GROUP BY 1
        ) combined
        GROUP BY identity
        ORDER BY cnt DESC
      ) g
    ),
    -- behavior_stats (hr_user_profile only)
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('category', sexual_behavior_category, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(sexual_behavior_category, 'ไม่ระบุ') AS sexual_behavior_category, COUNT(*) AS cnt FROM hr_user_profile GROUP BY sexual_behavior_category ORDER BY cnt DESC) s
    ),
    -- usage counts
    (SELECT COUNT(*) FROM hr_checkins),
    (SELECT COUNT(*) FROM hr_screenings),
    (SELECT COUNT(*) FROM hr_ai_conversations),
    (SELECT COUNT(*) FROM hiv_selftest_requests),
    (SELECT COUNT(*) FROM hr_peer_posts),
    (SELECT COUNT(*) FROM hr_distress_alerts),
    (SELECT COUNT(*) FROM hr_safer_plans),
    (SELECT COUNT(*) FROM hr_referrals),
    -- monthly_trend (6 months)
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
          FROM hr_checkins WHERE created_at >= date_trunc('month', now()) - interval '5 months'
          GROUP BY 1
        ) c ON c.month = d.month
        LEFT JOIN (
          SELECT date_trunc('month', created_at) AS month, COUNT(*) AS cnt
          FROM hr_screenings WHERE created_at >= date_trunc('month', now()) - interval '5 months'
          GROUP BY 1
        ) s ON s.month = d.month
        ORDER BY d.month
      ) t
    );
END;
$$;
