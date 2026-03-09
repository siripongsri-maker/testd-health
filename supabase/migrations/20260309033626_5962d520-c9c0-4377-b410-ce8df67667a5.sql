-- Allow users to create their own support threads
CREATE POLICY "Users create own threads" ON public.direct_chat_threads
  FOR INSERT WITH CHECK (user_id = auth.uid());