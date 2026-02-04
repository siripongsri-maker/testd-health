-- Enable realtime for selftest_pii table to support real-time statistics
ALTER PUBLICATION supabase_realtime ADD TABLE public.selftest_pii;