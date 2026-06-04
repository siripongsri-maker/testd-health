import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, CheckCircle, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  SurveyConsentDialog, 
  SurveyTaker, 
  type SurveyQuestion, 
  type AnswerData,
  type NativeSurvey 
} from "@/components/survey";

export default function SurveyTake() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<NativeSurvey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSurvey();
    }
  }, [id]);

  const fetchSurvey = async () => {
    try {
      // Fetch survey
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData as NativeSurvey);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;
      
      // Parse options from JSON
      const parsedQuestions = (questionsData || []).map(q => ({
        ...q,
        options: (q.options as unknown as Array<{ id: string; text_th: string; text_en: string }>) || [],
        skip_condition: (q.skip_condition as unknown as SurveyQuestion['skip_condition']) || null,
      })) as unknown as SurveyQuestion[];
      
      setQuestions(parsedQuestions);

      // Show consent dialog if required
      if (surveyData.require_consent) {
        setShowConsent(true);
      } else {
        // Create response directly
        await createResponse(true);
      }
    } catch (err) {
      console.error('Error fetching survey:', err);
      toast.error(language === 'th' ? 'ไม่พบแบบสำรวจ' : 'Survey not found');
      navigate('/surveys');
    } finally {
      setLoading(false);
    }
  };

  const createResponse = async (anonymous: boolean) => {
    try {
      const sessionId = anonymous ? `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : null;
      const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const { error } = await supabase
        .from('survey_responses')
        .insert({
          id: newId,
          survey_id: id,
          user_id: anonymous ? null : user?.id,
          session_id: sessionId,
          is_anonymous: anonymous,
          consent_given: true,
          consent_given_at: new Date().toISOString(),
        });

      if (error) throw error;
      setResponseId(newId);
      setIsAnonymous(anonymous);
    } catch (err) {
      console.error('Error creating response:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    }
  };


  const handleConsent = async (anonymous: boolean) => {
    setShowConsent(false);
    await createResponse(anonymous);
  };

  const handleSubmit = async (answers: AnswerData[]) => {
    if (!responseId) return;

    setIsSubmitting(true);
    try {
      // Insert all answers
      const answersToInsert = answers.map((a) => ({
        response_id: responseId,
        question_id: a.question_id,
        answer_text: a.answer_text || null,
        answer_options: a.answer_options || [],
        answer_rating: a.answer_rating ?? null,
      }));

      const { error: answersError } = await supabase
        .from('survey_answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      // Mark response as completed
      const { error: updateError } = await supabase
        .from('survey_responses')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', responseId);

      if (updateError) throw updateError;

      // Award XP if user is logged in (only first completion awards XP)
      if (user && survey?.xp_reward && survey.xp_reward > 0) {
        const { data: xpAwarded } = await supabase.rpc('complete_survey', {
          p_survey_id: id,
          p_session_id: null,
        });
        if (xpAwarded && xpAwarded > 0) {
          toast.success(
            language === 'th' 
              ? `ได้รับ ${xpAwarded} XP! 🎉` 
              : `Earned ${xpAwarded} XP! 🎉`
          );
        } else {
          toast.info(
            language === 'th'
              ? 'ขอบคุณที่ตอบแบบสอบถามอีกครั้ง (XP ได้รับแล้วจากครั้งแรก)'
              : 'Thanks for completing again (XP was already awarded)'
          );
        }
      }

      // Fire-and-forget email notification for the
      // "ยกเลิก พ.ร.บ.ค้าประเวณี 2539" survey. Never block submission.
      if (id === '6e5918db-d70a-4d7d-b978-e6711f2a4779') {
        supabase.functions
          .invoke('notify-pre-post-submission', { body: { response_id: responseId } })
          .catch((err) => console.warn('[notify-pre-post] invoke failed', err));
      }

      setIsCompleted(true);
    } catch (err) {
      console.error('Error submitting survey:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาดในการส่งคำตอบ' : 'Failed to submit answers');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageContainer>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  if (isCompleted) {
    return (
      <>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-success/20 flex items-center justify-center mb-6 animate-scale-in">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {language === 'th' ? 'ส่งคำตอบสำเร็จ!' : 'Survey Completed!'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {language === 'th' 
                ? 'ขอบคุณที่สละเวลาทำแบบสำรวจ' 
                : 'Thank you for completing the survey'}
            </p>
            {survey?.xp_reward && survey.xp_reward > 0 && user && (
              <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-xp/20 rounded-full">
                <Sparkles className="h-5 w-5 text-xp" />
                <span className="font-bold text-xp">+{survey.xp_reward} XP</span>
              </div>
            )}
            <Button onClick={() => navigate('/surveys')}>
              {language === 'th' ? 'กลับไปหน้าแบบสำรวจ' : 'Back to Surveys'}
            </Button>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/surveys')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {language === 'th' ? survey?.title_th : survey?.title_en}
            </h1>
            {(survey?.description_th || survey?.description_en) && (
              <p className="text-sm text-muted-foreground">
                {language === 'th' ? survey?.description_th : survey?.description_en}
              </p>
            )}
          </div>
        </div>

        {responseId && questions.length > 0 ? (
          <SurveyTaker
            questions={questions}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            surveyId={id}
          />
        ) : questions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {language === 'th' ? 'แบบสำรวจนี้ยังไม่มีคำถาม' : 'This survey has no questions yet'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/surveys')}>
              {language === 'th' ? 'กลับ' : 'Go Back'}
            </Button>
          </Card>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </PageContainer>

      <SurveyConsentDialog
        open={showConsent}
        onOpenChange={setShowConsent}
        onConsent={handleConsent}
        consentTextTh={survey?.consent_text_th || undefined}
        consentTextEn={survey?.consent_text_en || undefined}
        allowAnonymous={survey?.allow_anonymous}
      />

      <BottomNav />
    </>
  );
}
