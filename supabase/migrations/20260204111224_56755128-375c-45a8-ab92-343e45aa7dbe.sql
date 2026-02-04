-- Drop the existing check constraint on quest_type
ALTER TABLE public.quests DROP CONSTRAINT IF EXISTS quests_quest_type_check;

-- Add new columns to quests table for the quest system
ALTER TABLE public.quests 
ADD COLUMN IF NOT EXISTS reward_xp integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_count integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS trigger_type text;

-- Add last_reset_at and claimed_at to user_quests for daily/monthly tracking
ALTER TABLE public.user_quests 
ADD COLUMN IF NOT EXISTS last_reset_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone;

-- Clear existing quests and seed new ones
DELETE FROM public.user_quests;
DELETE FROM public.quests;

-- Seed ONE-TIME quests
INSERT INTO public.quests (slug, title_en, title_th, description_en, description_th, quest_type, target_count, reward_xp, badge_id, trigger_type, is_active) VALUES
('setup-medication', 'Set up Medication Tracking', 'ตั้งค่าการกินยา', 'Configure your medication reminder to stay on track', 'ตั้งค่าการแจ้งเตือนกินยาเพื่อไม่พลาดทุกมื้อ', 'one-time', 1, 50, 'medication-setup', 'medication_setup', true),
('complete-profile', 'Complete Personal Info', 'กรอกข้อมูลส่วนตัว', 'Fill in your personal information to personalize your experience', 'กรอกข้อมูลส่วนตัวเพื่อประสบการณ์ที่ดีขึ้น', 'one-time', 1, 50, 'profile-complete', 'profile_complete', true),
('write-article', 'Write One Article', 'เขียนบทความ 1 เรื่อง', 'Share your knowledge by writing an article', 'แบ่งปันความรู้ด้วยการเขียนบทความ', 'one-time', 1, 150, 'author-badge', 'article_created', true);

-- Seed DAILY quests
INSERT INTO public.quests (slug, title_en, title_th, description_en, description_th, quest_type, target_count, reward_xp, badge_id, trigger_type, is_active) VALUES
('read-article', 'Read 1 Article', 'อ่านบทความ 1 เรื่อง', 'Read an article to expand your knowledge', 'อ่านบทความเพื่อเพิ่มพูนความรู้', 'daily', 1, 20, 'reader', 'article_read', true),
('comment-article', 'Comment on an Article', 'คอมเมนต์ 1 ครั้ง', 'Share your thoughts by commenting on an article', 'แสดงความคิดเห็นในบทความ', 'daily', 1, 30, 'commenter', 'article_comment', true),
('complete-survey', 'Do 1 Survey', 'ทำแบบสอบถาม 1 ครั้ง', 'Complete a survey to help improve our services', 'ทำแบบสอบถามเพื่อช่วยพัฒนาบริการ', 'daily', 1, 40, 'surveyor', 'survey_complete', true),
('visit-social', 'Visit SWING Social Media', 'เข้าโซเชียลมีเดียของ SWING', 'Check out our social media for updates', 'ติดตามข่าวสารผ่านโซเชียลมีเดีย', 'daily', 1, 10, 'social-visitor', 'social_visit', true);

-- Seed MONTHLY quests
INSERT INTO public.quests (slug, title_en, title_th, description_en, description_th, quest_type, target_count, reward_xp, badge_id, trigger_type, is_active) VALUES
('book-clinic', 'Book Clinic Appointment', 'จองนัดคลินิก', 'Schedule your regular health check-up', 'นัดหมายตรวจสุขภาพประจำ', 'monthly', 1, 100, 'clinic-visitor', 'clinic_booking', true),
('request-selftest', 'Request HIV Self-Test', 'ขอรับชุดตรวจ HIV ด้วยตนเอง', 'Order a free HIV self-test kit', 'ขอรับชุดตรวจ HIV ฟรี', 'monthly', 1, 120, 'selftest-requester', 'selftest_request', true);

-- Add a new check constraint with the new values
ALTER TABLE public.quests ADD CONSTRAINT quests_quest_type_check CHECK (quest_type IN ('one-time', 'daily', 'monthly'));