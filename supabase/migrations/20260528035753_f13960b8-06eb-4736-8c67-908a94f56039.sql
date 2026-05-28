DROP POLICY IF EXISTS "Anyone can insert peer posts" ON public.hr_peer_posts;
CREATE POLICY "Anyone can insert peer posts unmoderated" ON public.hr_peer_posts
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_approved = false AND is_flagged = false);

DROP POLICY IF EXISTS "Anyone can insert peer replies" ON public.hr_peer_replies;
CREATE POLICY "Anyone can insert peer replies unmoderated" ON public.hr_peer_replies
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_approved = false);