-- Create user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Interest tags table
CREATE TABLE public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, tag)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own interests"
ON public.user_interests FOR ALL
USING (auth.uid() = user_id);

-- Journey quests definition table
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_th TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_th TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('journey', 'campaign')),
  target_days INTEGER NOT NULL DEFAULT 30,
  badge_id TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active quests"
ON public.quests FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage quests"
ON public.quests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- User quest progress
CREATE TABLE public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, quest_id)
);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own quest progress"
ON public.user_quests FOR ALL
USING (auth.uid() = user_id);

-- Chat rooms
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_th TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active chat rooms"
ON public.chat_rooms FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage chat rooms"
ON public.chat_rooms FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Chat messages (anonymous)
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chat messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Self-care reminders
CREATE TABLE public.self_care_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('hiv_test', 'condom_refill', 'harm_reduction')),
  enabled BOOLEAN DEFAULT true,
  last_reminded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, reminder_type)
);

ALTER TABLE public.self_care_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reminders"
ON public.self_care_reminders FOR ALL
USING (auth.uid() = user_id);

-- Health profile (optional)
CREATE TABLE public.health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  prep_history JSONB DEFAULT '[]'::jsonb,
  pep_history JSONB DEFAULT '[]'::jsonb,
  testing_history JSONB DEFAULT '[]'::jsonb,
  side_effects JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own health profile"
ON public.health_profiles FOR ALL
USING (auth.uid() = user_id);

-- Pre-consultation forms
CREATE TABLE public.consultation_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prevention_use TEXT,
  recent_testing JSONB,
  questions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.consultation_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own consultation forms"
ON public.consultation_forms FOR ALL
USING (auth.uid() = user_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Insert default chat rooms
INSERT INTO public.chat_rooms (slug, name_en, name_th, description_en, description_th, icon) VALUES
('prep-pep', 'PrEP & PEP', 'PrEP และ PEP', 'Discuss prevention medications', 'พูดคุยเรื่องยาป้องกัน', 'pill'),
('testing', 'Testing & Results', 'การตรวจและผลตรวจ', 'Share testing experiences', 'แบ่งปันประสบการณ์การตรวจ', 'test-tube'),
('dating', 'Dating & Relationships', 'การเดตและความสัมพันธ์', 'Talk about relationships safely', 'พูดคุยเรื่องความสัมพันธ์อย่างปลอดภัย', 'heart'),
('harm-reduction', 'Harm Reduction', 'การลดอันตราย', 'Support each other', 'สนับสนุนซึ่งกันและกัน', 'shield');

-- Insert default quests
INSERT INTO public.quests (slug, title_en, title_th, description_en, description_th, quest_type, target_days, badge_id) VALUES
('first-30-prep', 'First 30 Days on PrEP', '30 วันแรกกับ PrEP', 'Complete your first month on daily PrEP', 'เสร็จสิ้นเดือนแรกของคุณกับ PrEP รายวัน', 'journey', 30, 'prep-30'),
('pep-complete', 'Completed PEP Safely', 'สำเร็จ PEP อย่างปลอดภัย', 'Complete a full PEP course', 'เสร็จสิ้นคอร์ส PEP เต็มรูปแบบ', 'journey', 28, 'pep-complete'),
('testing-3m', '3 Months Regular Testing', 'การตรวจสม่ำเสมอ 3 เดือน', 'Test regularly for 3 months', 'ตรวจสม่ำเสมอเป็นเวลา 3 เดือน', 'journey', 90, 'tester-3m');

-- Insert campaign quests
INSERT INTO public.quests (slug, title_en, title_th, description_en, description_th, quest_type, target_days, badge_id, start_date, end_date) VALUES
('pride-2026', 'Pride Month Care Challenge', 'ความท้าทายดูแลตัวเอง Pride Month', 'Celebrate Pride by taking care of yourself', 'ฉลอง Pride ด้วยการดูแลตัวเอง', 'campaign', 30, 'pride-2026', '2026-06-01', '2026-06-30'),
('wad-2026', 'World AIDS Day Quest', 'ภารกิจวันเอดส์โลก', 'Get tested in December', 'ตรวจในเดือนธันวาคม', 'campaign', 31, 'wad-2026', '2026-12-01', '2026-12-31');