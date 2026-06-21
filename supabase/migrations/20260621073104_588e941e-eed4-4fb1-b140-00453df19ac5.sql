ALTER TABLE public.sms_send_log
  ADD COLUMN IF NOT EXISTS kit_order_id uuid REFERENCES public.kit_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sms_send_log_kit_order_id ON public.sms_send_log(kit_order_id);