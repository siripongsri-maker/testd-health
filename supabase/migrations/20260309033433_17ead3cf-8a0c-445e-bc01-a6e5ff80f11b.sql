-- Direct chat threads between admin and user
CREATE TABLE public.direct_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'archived')),
  subject text,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Direct chat messages
CREATE TABLE public.direct_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.direct_chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'user' CHECK (sender_role IN ('admin', 'moderator', 'user', 'system')),
  message_text text NOT NULL CHECK (length(trim(message_text)) > 0),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Read state tracking
CREATE TABLE public.direct_chat_read_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.direct_chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

-- Indexes
CREATE INDEX idx_dct_user ON public.direct_chat_threads(user_id);
CREATE INDEX idx_dct_status ON public.direct_chat_threads(status);
CREATE INDEX idx_dct_last_msg ON public.direct_chat_threads(last_message_at DESC);
CREATE INDEX idx_dcm_thread ON public.direct_chat_messages(thread_id, created_at);
CREATE INDEX idx_dcm_sender ON public.direct_chat_messages(sender_id);
CREATE INDEX idx_dcrs_thread ON public.direct_chat_read_states(thread_id, user_id);

-- Enable RLS
ALTER TABLE public.direct_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_chat_read_states ENABLE ROW LEVEL SECURITY;

-- RLS: threads
CREATE POLICY "Users see own threads" ON public.direct_chat_threads
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins create threads" ON public.direct_chat_threads
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update threads" ON public.direct_chat_threads
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS: messages
CREATE POLICY "Thread participants read messages" ON public.direct_chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.direct_chat_threads t WHERE t.id = thread_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Thread participants send messages" ON public.direct_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.direct_chat_threads t WHERE t.id = thread_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- RLS: read states
CREATE POLICY "Own read states" ON public.direct_chat_read_states
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admin read states" ON public.direct_chat_read_states
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_chat_threads;

-- Function: get or create thread for a user (admin use)
CREATE OR REPLACE FUNCTION public.get_or_create_chat_thread(p_user_id uuid, p_subject text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_thread_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  
  SELECT id INTO v_thread_id FROM direct_chat_threads
  WHERE user_id = p_user_id AND status = 'open'
  ORDER BY last_message_at DESC LIMIT 1;
  
  IF v_thread_id IS NULL THEN
    INSERT INTO direct_chat_threads (user_id, subject)
    VALUES (p_user_id, p_subject)
    RETURNING id INTO v_thread_id;
  END IF;
  
  RETURN v_thread_id;
END;
$$;

-- Function: send message and update thread metadata
CREATE OR REPLACE FUNCTION public.send_chat_message(p_thread_id uuid, p_message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_thread record;
  v_role text;
  v_msg_id uuid;
  v_trimmed text;
BEGIN
  v_trimmed := trim(p_message);
  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  IF length(v_trimmed) > 5000 THEN
    RAISE EXCEPTION 'Message too long';
  END IF;
  
  SELECT * INTO v_thread FROM direct_chat_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Thread not found'; END IF;
  
  IF v_thread.user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  v_role := CASE WHEN has_role(auth.uid(), 'admin') THEN 'admin' ELSE 'user' END;
  
  INSERT INTO direct_chat_messages (thread_id, sender_id, sender_role, message_text)
  VALUES (p_thread_id, auth.uid(), v_role, v_trimmed)
  RETURNING id INTO v_msg_id;
  
  UPDATE direct_chat_threads
  SET last_message_at = now(),
      last_message_preview = left(v_trimmed, 100),
      updated_at = now(),
      status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END
  WHERE id = p_thread_id;
  
  -- Auto-update sender's read state
  INSERT INTO direct_chat_read_states (thread_id, user_id, last_read_at)
  VALUES (p_thread_id, auth.uid(), now())
  ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_at = now();
  
  RETURN v_msg_id;
END;
$$;