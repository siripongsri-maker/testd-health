// Survey Builder Types

export type QuestionType = 'multiple_choice' | 'checkbox' | 'text_short' | 'text_long' | 'rating';

export interface QuestionOption {
  id: string;
  text_th: string;
  text_en: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_type: QuestionType;
  question_text_th: string;
  question_text_en: string;
  options: QuestionOption[];
  rating_min: number;
  rating_max: number;
  rating_label_min_th: string | null;
  rating_label_min_en: string | null;
  rating_label_max_th: string | null;
  rating_label_max_en: string | null;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  user_id: string | null;
  session_id: string | null;
  is_anonymous: boolean;
  consent_given: boolean;
  consent_given_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_options: unknown; // JSONB from database
  answer_rating: number | null;
  created_at: string;
}

export interface NativeSurvey {
  id: string;
  title_th: string;
  title_en: string;
  description_th: string | null;
  description_en: string | null;
  url: string;
  xp_reward: number;
  is_hot: boolean;
  is_new: boolean;
  view_count: number;
  completion_count: number;
  created_at: string;
  is_active: boolean;
  is_native: boolean;
  consent_text_th: string | null;
  consent_text_en: string | null;
  allow_anonymous: boolean;
  require_consent: boolean;
  status: string;
  rejection_feedback: string | null;
  created_by: string | null;
  submitted_at: string | null;
}

// For building new questions
export interface QuestionFormData {
  question_type: QuestionType;
  question_text_th: string;
  question_text_en: string;
  options: QuestionOption[];
  rating_min: number;
  rating_max: number;
  rating_label_min_th: string;
  rating_label_min_en: string;
  rating_label_max_th: string;
  rating_label_max_en: string;
  is_required: boolean;
}

// For taking surveys
export interface AnswerData {
  question_id: string;
  answer_text?: string;
  answer_options?: string[];
  answer_rating?: number;
}
