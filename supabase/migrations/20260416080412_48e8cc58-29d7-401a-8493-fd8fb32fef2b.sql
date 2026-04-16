-- Admin chat notification preferences
CREATE TABLE public.admin_chat_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_cooldown_minutes INTEGER NOT NULL DEFAULT 15,
  last_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_chat_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own prefs"
ON public.admin_chat_notification_prefs
FOR SELECT TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upsert own prefs"
ON public.admin_chat_notification_prefs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update own prefs"
ON public.admin_chat_notification_prefs
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_admin_chat_notification_prefs_updated_at
BEFORE UPDATE ON public.admin_chat_notification_prefs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();