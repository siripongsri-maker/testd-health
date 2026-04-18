
-- 1. Add status column to booking_branches
ALTER TABLE public.booking_branches
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS coming_soon_message_th text,
  ADD COLUMN IF NOT EXISTS coming_soon_message_en text;

ALTER TABLE public.booking_branches
  DROP CONSTRAINT IF EXISTS booking_branches_status_check;
ALTER TABLE public.booking_branches
  ADD CONSTRAINT booking_branches_status_check
  CHECK (status IN ('active', 'coming_soon', 'closed'));

-- 2. Insert SWING Udomsuk branch (coming soon)
INSERT INTO public.booking_branches (
  slug, name_th, name_en, address_th, address_en,
  open_days, open_time, close_time, slot_duration_minutes, counselor_count,
  is_active, status,
  coming_soon_message_th, coming_soon_message_en,
  phone
) VALUES (
  'udomsuk',
  'สาขาอุดมสุข',
  'Udomsuk',
  'ใกล้ BTS อุดมสุข / Udom Suk area',
  'Near BTS Udom Suk / Udom Suk area',
  ARRAY[1,2,3,4,5]::int[],
  '10:00',
  '18:00',
  30,
  2,
  true,
  'coming_soon',
  'เปิดให้บริการเร็ว ๆ นี้ — การจองจะเปิดใช้งานในอีกไม่ช้า',
  'Opening soon – booking will be available shortly',
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  status = EXCLUDED.status,
  coming_soon_message_th = EXCLUDED.coming_soon_message_th,
  coming_soon_message_en = EXCLUDED.coming_soon_message_en;

-- 3. Create branch interest signups table
CREATE TABLE IF NOT EXISTS public.branch_interest_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.booking_branches(id) ON DELETE CASCADE,
  contact_email text,
  contact_phone text,
  language text NOT NULL DEFAULT 'th',
  user_id uuid,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branch_interest_contact_required CHECK (
    contact_email IS NOT NULL OR contact_phone IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_branch_interest_branch ON public.branch_interest_signups(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_interest_created ON public.branch_interest_signups(created_at DESC);

ALTER TABLE public.branch_interest_signups ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous) can submit interest
DROP POLICY IF EXISTS "Anyone can register interest" ON public.branch_interest_signups;
CREATE POLICY "Anyone can register interest"
ON public.branch_interest_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read
DROP POLICY IF EXISTS "Admins can read interest signups" ON public.branch_interest_signups;
CREATE POLICY "Admins can read interest signups"
ON public.branch_interest_signups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update/delete
DROP POLICY IF EXISTS "Admins can update interest signups" ON public.branch_interest_signups;
CREATE POLICY "Admins can update interest signups"
ON public.branch_interest_signups
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete interest signups" ON public.branch_interest_signups;
CREATE POLICY "Admins can delete interest signups"
ON public.branch_interest_signups
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
