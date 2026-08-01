ALTER TABLE public.hr_referrals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_referrals;