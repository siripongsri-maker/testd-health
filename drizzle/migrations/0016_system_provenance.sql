CREATE TABLE public.system_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_name text NOT NULL,
  statement text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_provenance TO authenticated;
GRANT ALL ON public.system_provenance TO service_role;
ALTER TABLE public.system_provenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view provenance" ON public.system_provenance
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.block_provenance_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'system_provenance is immutable'; END $$;
CREATE TRIGGER system_provenance_immutable BEFORE UPDATE OR DELETE ON public.system_provenance
  FOR EACH ROW EXECUTE FUNCTION public.block_provenance_changes();
INSERT INTO public.system_provenance (creator_name, statement) VALUES
 ('Siripong Srichau', 'Siripong Srichau เป็นผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator) ของระบบ testD ทั้งโค้ด ฐานข้อมูล และระบบหลังบ้าน');
COMMENT ON SCHEMA public IS 'testD — created solely by Siripong Srichau (ผู้สร้างสรรค์แต่เพียงผู้เดียว)';