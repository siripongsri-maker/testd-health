
-- Function to get returning user flags for a set of appointments
-- "Returning" = user has at least one prior appointment (any status except cancelled)
CREATE OR REPLACE FUNCTION public.get_returning_flags(p_appointment_ids uuid[])
RETURNS TABLE(appointment_id uuid, is_returning boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id AS appointment_id,
    EXISTS(
      SELECT 1 FROM appointments a2
      WHERE a2.id != a.id
        AND a2.status != 'cancelled'
        AND a2.created_at < a.created_at
        AND (
          (a.user_id IS NOT NULL AND a2.user_id = a.user_id)
          OR (a.contact_email IS NOT NULL AND a.contact_email != '' AND a2.contact_email = a.contact_email)
        )
    ) AS is_returning
  FROM appointments a
  WHERE a.id = ANY(p_appointment_ids);
$$;

-- Function to get daily appointment density for a date range and optional branch
CREATE OR REPLACE FUNCTION public.get_appointment_density(
  p_start_date date,
  p_end_date date,
  p_branch_id uuid DEFAULT NULL
)
RETURNS TABLE(
  appointment_date date,
  total_count bigint,
  new_count bigint,
  returning_count bigint,
  cancelled_count bigint,
  completed_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.appointment_date,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE NOT EXISTS(
      SELECT 1 FROM appointments a2
      WHERE a2.id != a.id AND a2.status != 'cancelled' AND a2.created_at < a.created_at
        AND ((a.user_id IS NOT NULL AND a2.user_id = a.user_id)
             OR (a.contact_email IS NOT NULL AND a.contact_email != '' AND a2.contact_email = a.contact_email))
    )) AS new_count,
    COUNT(*) FILTER (WHERE EXISTS(
      SELECT 1 FROM appointments a2
      WHERE a2.id != a.id AND a2.status != 'cancelled' AND a2.created_at < a.created_at
        AND ((a.user_id IS NOT NULL AND a2.user_id = a.user_id)
             OR (a.contact_email IS NOT NULL AND a.contact_email != '' AND a2.contact_email = a.contact_email))
    )) AS returning_count,
    COUNT(*) FILTER (WHERE a.status = 'cancelled') AS cancelled_count,
    COUNT(*) FILTER (WHERE a.status = 'completed') AS completed_count
  FROM appointments a
  WHERE a.appointment_date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR a.branch_id = p_branch_id)
  GROUP BY a.appointment_date
  ORDER BY a.appointment_date;
$$;
