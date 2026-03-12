
-- Add priority, assignment, and SLA columns to direct_chat_threads
ALTER TABLE public.direct_chat_threads
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_to uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sla_deadline_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_user_message_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz DEFAULT NULL;

-- Create chat internal notes table (staff-only notes not visible to user)
CREATE TABLE IF NOT EXISTS public.chat_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.direct_chat_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage internal notes"
  ON public.chat_internal_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create canned responses table
CREATE TABLE IF NOT EXISTS public.chat_canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_th text NOT NULL,
  content_en text NOT NULL,
  content_th text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage canned responses"
  ON public.chat_canned_responses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default canned responses
INSERT INTO public.chat_canned_responses (title_en, title_th, content_en, content_th, category, display_order) VALUES
('Greeting', 'ทักทาย', 'Hello! Thank you for reaching out. How can I help you today?', 'สวัสดีค่ะ/ครับ! ขอบคุณที่ติดต่อเข้ามา มีอะไรให้ช่วยเหลือคะ/ครับ?', 'greeting', 1),
('Ask for details', 'ขอรายละเอียดเพิ่มเติม', 'Could you please provide more details so I can assist you better?', 'ช่วยให้รายละเอียดเพิ่มเติมได้ไหมคะ/ครับ เพื่อจะได้ช่วยเหลือได้ดียิ่งขึ้น?', 'follow-up', 2),
('Booking issue', 'ปัญหาการจอง', 'I understand you''re having an issue with your booking. Let me look into it for you.', 'เข้าใจว่ามีปัญหาเกี่ยวกับการจอง ขอตรวจสอบให้นะคะ/ครับ', 'booking', 3),
('Self-test issue', 'ปัญหาชุดตรวจ', 'I''m sorry to hear about the issue with your self-test kit. Let me help you resolve this.', 'เสียใจที่ทราบเรื่องปัญหาชุดตรวจ ขอช่วยแก้ไขให้นะคะ/ครับ', 'selftest', 4),
('Result follow-up', 'ติดตามผลตรวจ', 'Thank you for sharing your results. Our team will follow up with you shortly.', 'ขอบคุณที่แจ้งผลตรวจ ทีมงานจะติดต่อกลับในเร็วๆ นี้ค่ะ/ครับ', 'follow-up', 5),
('Delivery issue', 'ปัญหาการจัดส่ง', 'I''ll check the delivery status of your order and get back to you.', 'ขอตรวจสอบสถานะการจัดส่งให้นะคะ/ครับ', 'delivery', 6),
('Escalation', 'ส่งต่อเจ้าหน้าที่', 'I''m connecting you with a specialized team member who can help further.', 'กำลังส่งต่อให้เจ้าหน้าที่ผู้เชี่ยวชาญดูแลต่อนะคะ/ครับ', 'escalation', 7),
('Closing', 'ปิดการสนทนา', 'Thank you for contacting us. If you need anything else, feel free to reach out anytime!', 'ขอบคุณที่ติดต่อเข้ามาค่ะ/ครับ หากต้องการความช่วยเหลือเพิ่มเติม สามารถติดต่อได้ตลอดนะคะ/ครับ', 'closing', 8);

-- Enable realtime for internal notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_internal_notes;
