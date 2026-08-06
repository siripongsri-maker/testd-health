CREATE TABLE public.agent_connect_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id text NOT NULL UNIQUE,
  user_id uuid,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_connect_settings_anon_len CHECK (char_length(anonymous_id) BETWEEN 8 AND 128),
  CONSTRAINT agent_connect_settings_size CHECK (pg_column_size(settings) < 8000)
);

GRANT ALL ON public.agent_connect_settings TO service_role;
ALTER TABLE public.agent_connect_settings ENABLE ROW LEVEL SECURITY;

-- No direct table access for anon/authenticated: all reads/writes go through the
-- security definer RPCs below, which scope strictly to one anonymous_id.
CREATE POLICY "agent_connect_settings_owner_read" ON public.agent_connect_settings
FOR SELECT TO authenticated USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_agent_connect_settings(p_anonymous_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT s.settings FROM public.agent_connect_settings s
      WHERE s.anonymous_id = p_anonymous_id
      LIMIT 1),
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.save_agent_connect_settings(p_anonymous_id text, p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings jsonb;
BEGIN
  IF p_anonymous_id IS NULL OR char_length(p_anonymous_id) < 8 OR char_length(p_anonymous_id) > 128 THEN
    RAISE EXCEPTION 'invalid anonymous_id';
  END IF;
  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'settings must be a json object';
  END IF;
  IF pg_column_size(p_settings) >= 8000 THEN
    RAISE EXCEPTION 'settings too large';
  END IF;

  INSERT INTO public.agent_connect_settings (anonymous_id, user_id, settings)
  VALUES (p_anonymous_id, auth.uid(), p_settings)
  ON CONFLICT (anonymous_id) DO UPDATE
    SET settings = EXCLUDED.settings,
        user_id = COALESCE(public.agent_connect_settings.user_id, EXCLUDED.user_id),
        updated_at = now()
  RETURNING settings INTO v_settings;

  RETURN v_settings;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agent_connect_settings(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_agent_connect_settings(text, jsonb) TO anon, authenticated;