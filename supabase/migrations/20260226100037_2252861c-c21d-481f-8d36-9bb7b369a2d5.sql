
-- Translation cache table
CREATE TABLE public.translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL DEFAULT 'ui',
  key text NOT NULL,
  source_lang text NOT NULL,
  source_text text NOT NULL,
  target_lang text NOT NULL,
  translated_text text NOT NULL,
  hash text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_translation_cache_hash ON public.translation_cache (hash);
CREATE INDEX idx_translation_cache_key_lang ON public.translation_cache (key, target_lang);
CREATE INDEX idx_translation_cache_namespace ON public.translation_cache (namespace);

-- RLS
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

-- Public read for ui namespace
CREATE POLICY "Public can read ui translations"
  ON public.translation_cache
  FOR SELECT
  USING (namespace = 'ui');

-- Only service role can insert/update (edge functions use service role)
-- No insert/update/delete policies for anon/authenticated = blocked by default
