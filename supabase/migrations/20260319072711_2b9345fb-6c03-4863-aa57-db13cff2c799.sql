
-- Virtual greetings: ephemeral chat messages in the virtual space
CREATE TABLE public.virtual_greetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL CHECK (length(message) <= 100),
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  avatar_seed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-delete old messages (keep last 1 hour only)
CREATE INDEX idx_virtual_greetings_created ON public.virtual_greetings (created_at DESC);

-- RLS: anyone can read, anyone can insert (anonymous-friendly)
ALTER TABLE public.virtual_greetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read greetings"
  ON public.virtual_greetings FOR SELECT
  TO anon, authenticated
  USING (created_at > now() - interval '1 hour');

CREATE POLICY "Anyone can insert greetings"
  ON public.virtual_greetings FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(message) <= 100);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_greetings;
