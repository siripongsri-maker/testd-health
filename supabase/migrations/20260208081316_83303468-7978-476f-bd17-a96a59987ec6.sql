-- Create survey questions table
CREATE TABLE public.survey_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'checkbox', 'text_short', 'text_long', 'rating')),
  question_text_th TEXT NOT NULL,
  question_text_en TEXT NOT NULL,
  options JSONB DEFAULT '[]'::jsonb, -- For multiple choice/checkbox: [{"id": "uuid", "text_th": "", "text_en": ""}]
  rating_min INTEGER DEFAULT 1,
  rating_max INTEGER DEFAULT 5,
  rating_label_min_th TEXT,
  rating_label_min_en TEXT,
  rating_label_max_th TEXT,
  rating_label_max_en TEXT,
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey responses table (stores each submission)
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id UUID, -- NULL for anonymous responses
  session_id TEXT, -- For tracking anonymous users
  is_anonymous BOOLEAN DEFAULT true,
  consent_given BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create survey answers table (stores individual answers)
CREATE TABLE public.survey_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_text TEXT, -- For text questions
  answer_options JSONB DEFAULT '[]'::jsonb, -- For multiple choice/checkbox: ["option_id1", "option_id2"]
  answer_rating INTEGER, -- For rating questions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to existing surveys table for native surveys
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS is_native BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_text_th TEXT DEFAULT 'ข้อมูลของคุณจะถูกเก็บรักษาเป็นความลับและใช้เพื่อการวิจัยเท่านั้น คุณสามารถเลือกตอบแบบไม่ระบุตัวตนได้',
ADD COLUMN IF NOT EXISTS consent_text_en TEXT DEFAULT 'Your data will be kept confidential and used for research purposes only. You can choose to respond anonymously.',
ADD COLUMN IF NOT EXISTS allow_anonymous BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_consent BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_questions
CREATE POLICY "Anyone can view published survey questions"
  ON public.survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s 
      WHERE s.id = survey_id AND s.is_active = true
    )
  );

CREATE POLICY "Admins can manage survey questions"
  ON public.survey_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for survey_responses
CREATE POLICY "Users can view their own responses"
  ON public.survey_responses FOR SELECT
  USING (user_id = auth.uid() OR session_id IS NOT NULL);

CREATE POLICY "Anyone can create responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all responses"
  ON public.survey_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for survey_answers
CREATE POLICY "Users can view their own answers"
  ON public.survey_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = response_id AND (sr.user_id = auth.uid() OR sr.session_id IS NOT NULL)
    )
  );

CREATE POLICY "Anyone can create answers"
  ON public.survey_answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all answers"
  ON public.survey_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_questions_display_order ON public.survey_questions(survey_id, display_order);
CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX idx_survey_answers_response_id ON public.survey_answers(response_id);
CREATE INDEX idx_survey_answers_question_id ON public.survey_answers(question_id);

-- Add trigger for updated_at
CREATE TRIGGER update_survey_questions_updated_at
  BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();