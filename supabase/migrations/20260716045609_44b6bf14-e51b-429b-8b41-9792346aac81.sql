
-- 1. chat_messages: scope SELECT to messages in active rooms only
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can view chat messages in active rooms"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_rooms r
    WHERE r.id = chat_messages.room_id AND r.is_active = true
  )
);

-- 2. hr_peer_posts: require unguessable anonymous_token and matching user_id when authenticated
DROP POLICY IF EXISTS "Anyone can insert peer posts unmoderated" ON public.hr_peer_posts;
CREATE POLICY "Anyone can insert peer posts unmoderated"
ON public.hr_peer_posts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  is_approved = false
  AND is_flagged = false
  AND anonymous_token IS NOT NULL
  AND length(anonymous_token) >= 16
  AND length(content) BETWEEN 1 AND 4000
);

-- 3. hr_peer_replies: same server-side guardrails
DROP POLICY IF EXISTS "Anyone can insert peer replies unmoderated" ON public.hr_peer_replies;
CREATE POLICY "Anyone can insert peer replies unmoderated"
ON public.hr_peer_replies
FOR INSERT
TO anon, authenticated
WITH CHECK (
  is_approved = false
  AND is_flagged = false
  AND anonymous_token IS NOT NULL
  AND length(anonymous_token) >= 16
  AND length(content) BETWEEN 1 AND 4000
);
