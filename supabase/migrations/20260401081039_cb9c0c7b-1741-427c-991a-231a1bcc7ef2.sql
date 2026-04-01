
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
    (
      SELECT COUNT(*) FROM (
        SELECT user_id FROM hr_user_profile WHERE user_id IS NOT NULL
        UNION
        SELECT id FROM profiles
        UNION
        SELECT user_id FROM selftest_pii WHERE user_id IS NOT NULL
      ) combined
    ),
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msm = true),
    (SELECT COUNT(*) FROM hr_user_profile WHERE is_msw = true),
    -- age_stats
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('range', age_range, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT age_range, SUM(cnt)::bigint AS cnt FROM (
          SELECT COALESCE(age_range, 'ไม่ระบุ') AS age_range, COUNT(*) AS cnt
          FROM hr_user_profile GROUP BY age_range
          UNION ALL
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
            FROM selftest_pii WHERE date_of_birth IS NOT NULL
          ) ages
          GROUP BY 1
        ) combined
        GROUP BY age_range
        ORDER BY
          CASE age_range
            WHEN '<18' THEN 1
            WHEN '18-24' THEN 2
            WHEN '25-34' THEN 3
            WHEN '35-44' THEN 4
            WHEN '45-54' THEN 5
            WHEN '55+' THEN 6
            ELSE 7
          END
      ) a
    ),
    -- gender_stats: normalize all sources to Thai labels
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('identity', norm_gender, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT norm_gender, SUM(cnt)::bigint AS cnt FROM (
          -- hr_user_profile
          SELECT
            CASE
              WHEN LOWER(TRIM(gender_identity)) IN ('male', 'm', 'man', 'ชาย', 'ผู้ชาย') THEN 'ชาย'
              WHEN LOWER(TRIM(gender_identity)) IN ('female', 'f', 'woman', 'หญิง', 'ผู้หญิง') THEN 'หญิง'
              WHEN LOWER(TRIM(gender_identity)) LIKE 'transgender_male%' OR LOWER(TRIM(gender_identity)) = 'ชายข้ามเพศ' THEN 'ชายข้ามเพศ'
              WHEN LOWER(TRIM(gender_identity)) LIKE 'transgender_female%' OR LOWER(TRIM(gender_identity)) = 'หญิงข้ามเพศ' THEN 'หญิงข้ามเพศ'
              WHEN LOWER(TRIM(gender_identity)) IN ('non_binary', 'นอนไบนารี') THEN 'นอนไบนารี'
              ELSE 'ไม่ระบุ'
            END AS norm_gender,
            COUNT(*) AS cnt
          FROM hr_user_profile GROUP BY 1
          UNION ALL
          -- selftest_pii
          SELECT
            CASE
              WHEN LOWER(TRIM(regexp_replace(gender, '[^a-zA-Z\u0E00-\u0E7F_]', '', 'g'))) IN ('male', 'm', 'ชาย', 'ผู้ชาย') THEN 'ชาย'
              WHEN LOWER(TRIM(regexp_replace(gender, '[^a-zA-Z\u0E00-\u0E7F_]', '', 'g'))) IN ('female', 'f', 'หญิง', 'ผู้หญิง') THEN 'หญิง'
              WHEN LOWER(TRIM(regexp_replace(gender, '[^a-zA-Z\u0E00-\u0E7F_]', '', 'g'))) LIKE 'transgender_male%' THEN 'ชายข้ามเพศ'
              WHEN LOWER(TRIM(regexp_replace(gender, '[^a-zA-Z\u0E00-\u0E7F_]', '', 'g'))) LIKE 'transgender_female%' THEN 'หญิงข้ามเพศ'
              WHEN LOWER(TRIM(regexp_replace(gender, '[^a-zA-Z\u0E00-\u0E7F_]', '', 'g'))) IN ('non_binary', 'นอนไบนารี') THEN 'นอนไบนารี'
              WHEN LOWER(TRIM(regexp_replace(gender, '[^a-zA-Z\u0E00-\u0E7F_]', '', 'g'))) IN ('prefer_not_to_say', 'ไม่ระบุ') THEN 'ไม่ระบุ'
              ELSE 'ไม่ระบุ'
            END AS norm_gender,
            COUNT(*) AS cnt
          FROM selftest_pii GROUP BY 1
        ) combined
        GROUP BY norm_gender
        ORDER BY cnt DESC
      ) g
    ),
    -- behavior_stats
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('category', sexual_behavior_category, 'count', cnt)), '[]'::jsonb)
      FROM (SELECT COALESCE(sexual_behavior_category, 'ไม่ระบุ') AS sexual_behavior_category, COUNT(*) AS cnt FROM hr_user_profile GROUP BY sexual_behavior_category ORDER BY cnt DESC) s
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
