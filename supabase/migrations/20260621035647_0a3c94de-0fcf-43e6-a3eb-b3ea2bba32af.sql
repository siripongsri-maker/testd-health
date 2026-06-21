
-- 1) Fix privilege escalation: remove the authenticated INSERT policy on reward_transactions
-- so users can no longer insert arbitrary point grants for themselves. All point grants
-- already flow through SECURITY DEFINER RPCs (add_reward_points / award_xp_to_user) which
-- bypass RLS via the function owner.
DROP POLICY IF EXISTS "Authenticated can insert own transactions" ON public.reward_transactions;

-- 2) Reduce Realtime exposure surface: remove sensitive tables from the supabase_realtime
-- publication. None of these have active postgres_changes subscribers in the app, so
-- removing them does not change user-facing behavior. This eliminates the Realtime
-- channel leakage flagged by the scanner for these specific tables.
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_internal_notes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.hr_referrals;
ALTER PUBLICATION supabase_realtime DROP TABLE public.service_pathways;
ALTER PUBLICATION supabase_realtime DROP TABLE public.partner_invite_relays;
