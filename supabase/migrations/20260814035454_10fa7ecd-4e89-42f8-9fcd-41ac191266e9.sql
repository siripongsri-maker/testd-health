-- 1. Audit log table
CREATE TABLE public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  actor_id uuid,
  actor_is_staff boolean NOT NULL DEFAULT false,
  branch_id uuid,
  record_date date,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_audit_log_created_at ON public.staff_audit_log (created_at DESC);
CREATE INDEX idx_staff_audit_log_table ON public.staff_audit_log (table_name, created_at DESC);
CREATE INDEX idx_staff_audit_log_record ON public.staff_audit_log (record_id);
CREATE INDEX idx_staff_audit_log_actor ON public.staff_audit_log (actor_id);

GRANT SELECT ON public.staff_audit_log TO authenticated;
GRANT ALL ON public.staff_audit_log TO service_role;

ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
ON public.staff_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Generic audit trigger: records old/new for changed columns only
CREATE OR REPLACE FUNCTION public.tg_record_staff_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_j jsonb := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  new_j jsonb := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  diff jsonb := '{}'::jsonb;
  k text;
  ignored text[] := ARRAY['updated_at','created_at','last_updated_by'];
  rec_id text;
  rec_branch uuid;
  rec_date date;
BEGIN
  FOR k IN SELECT key FROM jsonb_each(old_j || new_j) LOOP
    CONTINUE WHEN k = ANY(ignored);
    IF (old_j -> k) IS DISTINCT FROM (new_j -> k) THEN
      diff := diff || jsonb_build_object(k, jsonb_build_object('old', old_j -> k, 'new', new_j -> k));
    END IF;
  END LOOP;

  IF TG_OP = 'UPDATE' AND diff = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  rec_id := COALESCE(new_j ->> 'id', old_j ->> 'id');
  BEGIN
    rec_branch := COALESCE(new_j ->> 'branch_id', old_j ->> 'branch_id')::uuid;
  EXCEPTION WHEN others THEN rec_branch := NULL;
  END;
  BEGIN
    rec_date := COALESCE(new_j ->> 'appointment_date', old_j ->> 'appointment_date')::date;
  EXCEPTION WHEN others THEN rec_date := NULL;
  END;

  INSERT INTO public.staff_audit_log (
    table_name, record_id, action, actor_id, actor_is_staff, branch_id, record_date, changed_fields
  ) VALUES (
    TG_TABLE_NAME, rec_id, lower(TG_OP), auth.uid(),
    COALESCE(public.is_privileged_staff(auth.uid()), false),
    rec_branch, rec_date, diff
  );

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_appointments
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.tg_record_staff_audit();

CREATE TRIGGER trg_audit_hiv_selftest_requests
AFTER INSERT OR UPDATE OR DELETE ON public.hiv_selftest_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_record_staff_audit();

CREATE TRIGGER trg_audit_case_notes
AFTER INSERT OR UPDATE OR DELETE ON public.case_notes
FOR EACH ROW EXECUTE FUNCTION public.tg_record_staff_audit();

CREATE TRIGGER trg_audit_counseling_payout_claims
AFTER INSERT OR UPDATE OR DELETE ON public.counseling_payout_claims
FOR EACH ROW EXECUTE FUNCTION public.tg_record_staff_audit();

CREATE TRIGGER trg_audit_kit_orders
AFTER INSERT OR UPDATE OR DELETE ON public.kit_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_record_staff_audit();

-- 3. Security fix: block clients from editing staff-managed kit_orders columns
CREATE OR REPLACE FUNCTION public.tg_kit_orders_protect_staff_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_privileged_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Clients may only confirm receipt of a delivered kit.
  IF NOT (OLD.status = 'delivered_unconfirmed'::kit_order_status
          AND NEW.status = 'received_confirmed'::kit_order_status) THEN
    NEW.status := OLD.status;
    NEW.received_at := OLD.received_at;
  END IF;

  NEW.order_code          := OLD.order_code;
  NEW.user_id             := OLD.user_id;
  NEW.order_type          := OLD.order_type;
  NEW.shipping_carrier    := OLD.shipping_carrier;
  NEW.tracking_number     := OLD.tracking_number;
  NEW.tracking_url        := OLD.tracking_url;
  NEW.internal_notes      := OLD.internal_notes;
  NEW.packed_at           := OLD.packed_at;
  NEW.shipped_at          := OLD.shipped_at;
  NEW.out_for_delivery_at := OLD.out_for_delivery_at;
  NEW.delivered_at        := OLD.delivered_at;
  NEW.created_by          := OLD.created_by;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kit_orders_protect_staff_columns
BEFORE UPDATE ON public.kit_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_kit_orders_protect_staff_columns();