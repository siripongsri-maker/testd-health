UPDATE public.branch_working_hours w
SET close_time = '19:00:00', updated_at = now()
FROM public.booking_branches b
WHERE b.id = w.branch_id AND b.close_time = '20:00:00' AND w.close_time > '19:00:00';

UPDATE public.branch_working_hours w
SET close_time = '17:00:00', updated_at = now()
FROM public.booking_branches b
WHERE b.id = w.branch_id AND b.close_time = '18:00:00' AND w.close_time > '17:00:00';