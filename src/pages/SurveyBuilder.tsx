import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Plus, Save, Eye, BarChart3, Settings, Trash2, AlertTriangle, Send } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  QuestionBuilder, 
  SurveyAnalytics,
  type QuestionFormData, 
  type SurveyQuestion,
  type NativeSurvey 
} from "@/components/survey";

export default function SurveyBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [survey, setSurvey] = useState<NativeSurvey | null>(null);
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [existingQuestionIds, setExistingQuestionIds] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Survey settings form
  const [settings, setSettings] = useState({
    title_th: '',
    title_en: '',
    description_th: '',
    description_en: '',
    xp_reward: 10,
    is_hot: false,
    is_new: true,
    consent_text_th: 'ข้อมูลของคุณจะถูกเก็บรักษาเป็นความลับและใช้เพื่อการวิจัยเท่านั้น',
    consent_text_en: 'Your data will be kept confidential and used for research purposes only.',
    allow_anonymous: true,
    require_consent: true,
  });

  useEffect(() => {
    checkAccess();
  }, [user, id]);

  const checkAccess = async () => {
    if (!user) {
      navigate('/surveys');
      return;
    }

    // Check if admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    const userIsAdmin = !!roleData;
    setIsAdmin(userIsAdmin);

    // Fetch survey to check ownership
    if (id) {
      const { data: surveyData, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !surveyData) {
        toast.error(language === 'th' ? 'ไม่พบแบบสำรวจ' : 'Survey not found');
        navigate('/surveys');
        return;
      }

      const userIsOwner = surveyData.created_by === user.id;
      setIsOwner(userIsOwner);

      // Check if user has access (admin or owner)
      if (!userIsAdmin && !userIsOwner) {
        toast.error(language === 'th' ? 'คุณไม่มีสิทธิ์แก้ไขแบบสำรวจนี้' : 'You do not have permission to edit this survey');
        navigate('/surveys');
        return;
      }

      // Load survey data
      setSurvey(surveyData as NativeSurvey);
      setSettings({
        title_th: surveyData.title_th,
        title_en: surveyData.title_en,
        description_th: surveyData.description_th || '',
        description_en: surveyData.description_en || '',
        xp_reward: surveyData.xp_reward,
        is_hot: surveyData.is_hot,
        is_new: surveyData.is_new,
        consent_text_th: surveyData.consent_text_th || '',
        consent_text_en: surveyData.consent_text_en || '',
        allow_anonymous: surveyData.allow_anonymous ?? true,
        require_consent: surveyData.require_consent ?? true,
      });

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('display_order', { ascending: true });

      const parsedQuestions: QuestionFormData[] = (questionsData || []).map((q) => ({
        question_type: q.question_type as QuestionFormData['question_type'],
        question_text_th: q.question_text_th,
        question_text_en: q.question_text_en,
        options: (q.options as unknown as QuestionFormData['options']) || [],
        rating_min: q.rating_min || 1,
        rating_max: q.rating_max || 5,
        rating_label_min_th: q.rating_label_min_th || '',
        rating_label_min_en: q.rating_label_min_en || '',
        rating_label_max_th: q.rating_label_max_th || '',
        rating_label_max_en: q.rating_label_max_en || '',
        is_required: q.is_required,
      }));

      setQuestions(parsedQuestions);
      setExistingQuestionIds(questionsData?.map((q) => q.id) || []);
    }

    setLoading(false);
  };

  const fetchSurvey = async () => {
    setLoading(true);
    try {
      // Fetch survey
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData as NativeSurvey);
      
      setSettings({
        title_th: surveyData.title_th,
        title_en: surveyData.title_en,
        description_th: surveyData.description_th || '',
        description_en: surveyData.description_en || '',
        xp_reward: surveyData.xp_reward,
        is_hot: surveyData.is_hot,
        is_new: surveyData.is_new,
        consent_text_th: surveyData.consent_text_th || '',
        consent_text_en: surveyData.consent_text_en || '',
        allow_anonymous: surveyData.allow_anonymous ?? true,
        require_consent: surveyData.require_consent ?? true,
      });

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', id)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;

      const parsedQuestions: QuestionFormData[] = (questionsData || []).map((q) => ({
        question_type: q.question_type as QuestionFormData['question_type'],
        question_text_th: q.question_text_th,
        question_text_en: q.question_text_en,
        options: (q.options as unknown as QuestionFormData['options']) || [],
        rating_min: q.rating_min || 1,
        rating_max: q.rating_max || 5,
        rating_label_min_th: q.rating_label_min_th || '',
        rating_label_min_en: q.rating_label_min_en || '',
        rating_label_max_th: q.rating_label_max_th || '',
        rating_label_max_en: q.rating_label_max_en || '',
        is_required: q.is_required,
      }));

      setQuestions(parsedQuestions);
      setExistingQuestionIds(questionsData?.map((q) => q.id) || []);
    } catch (err) {
      console.error('Error fetching survey:', err);
      toast.error(language === 'th' ? 'ไม่พบแบบสำรวจ' : 'Survey not found');
      navigate('/surveys');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: QuestionFormData = {
      question_type: 'multiple_choice',
      question_text_th: '',
      question_text_en: '',
      options: [
        { id: crypto.randomUUID(), text_th: '', text_en: '' },
        { id: crypto.randomUUID(), text_th: '', text_en: '' },
      ],
      rating_min: 1,
      rating_max: 5,
      rating_label_min_th: '',
      rating_label_min_en: '',
      rating_label_max_th: '',
      rating_label_max_en: '',
      is_required: true,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, question: QuestionFormData) => {
    const updated = [...questions];
    updated[index] = question;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!id) return;

    // Validate
    if (!settings.title_th || !settings.title_en) {
      toast.error(language === 'th' ? 'กรุณากรอกชื่อแบบสำรวจ' : 'Please fill in survey title');
      return;
    }

    if (questions.length === 0) {
      toast.error(language === 'th' ? 'กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ' : 'Please add at least one question');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text_th || !q.question_text_en) {
        toast.error(
          language === 'th' 
            ? `กรุณากรอกคำถามข้อที่ ${i + 1}` 
            : `Please fill in question ${i + 1}`
        );
        return;
      }
    }

    setSaving(true);
    try {
      // Update survey - only admin can set XP, tags
      const updateData: Record<string, unknown> = {
        title_th: settings.title_th,
        title_en: settings.title_en,
        description_th: settings.description_th || null,
        description_en: settings.description_en || null,
        consent_text_th: settings.consent_text_th,
        consent_text_en: settings.consent_text_en,
        allow_anonymous: settings.allow_anonymous,
        require_consent: settings.require_consent,
        is_native: true,
      };

      // Only admin can set XP and tags
      if (isAdmin) {
        updateData.xp_reward = settings.xp_reward;
        updateData.is_hot = settings.is_hot;
        updateData.is_new = settings.is_new;
      }

      const { error: surveyError } = await supabase
        .from('surveys')
        .update(updateData)
        .eq('id', id);

      if (surveyError) throw surveyError;

      // Delete existing questions and recreate
      if (existingQuestionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('survey_questions')
          .delete()
          .eq('survey_id', id);

        if (deleteError) throw deleteError;
      }

      // Insert new questions
      const questionsToInsert = questions.map((q, index) => ({
        survey_id: id,
        question_type: q.question_type,
        question_text_th: q.question_text_th,
        question_text_en: q.question_text_en,
        options: JSON.parse(JSON.stringify(q.options)), // Convert to plain JSON
        rating_min: q.rating_min,
        rating_max: q.rating_max,
        rating_label_min_th: q.rating_label_min_th || null,
        rating_label_min_en: q.rating_label_min_en || null,
        rating_label_max_th: q.rating_label_max_th || null,
        rating_label_max_en: q.rating_label_max_en || null,
        is_required: q.is_required,
        display_order: index,
      }));

      const { error: insertError } = await supabase
        .from('survey_questions')
        .insert(questionsToInsert);

      if (insertError) throw insertError;

      // Re-fetch to get updated question IDs
      const { data: updatedQuestions } = await supabase
        .from('survey_questions')
        .select('id')
        .eq('survey_id', id)
        .order('display_order', { ascending: true });
      
      setExistingQuestionIds(updatedQuestions?.map((q) => q.id) || []);

      toast.success(language === 'th' ? 'บันทึกสำเร็จ!' : 'Survey saved!');
    } catch (err) {
      console.error('Error saving survey:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id) return;

    // Validate before submitting
    if (!settings.title_th || !settings.title_en) {
      toast.error(language === 'th' ? 'กรุณากรอกชื่อแบบสำรวจ' : 'Please fill in survey title');
      return;
    }

    if (questions.length === 0) {
      toast.error(language === 'th' ? 'กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ' : 'Please add at least one question');
      return;
    }

    setSubmitting(true);
    try {
      // Save first
      await handleSave();

      // Then submit for review
      const { error } = await supabase
        .from('surveys')
        .update({
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(
        language === 'th' 
          ? 'ส่งตรวจสอบสำเร็จ! รอ Admin อนุมัติ' 
          : 'Submitted for review! Waiting for admin approval'
      );
      navigate('/surveys');
    } catch (err) {
      console.error('Error submitting for review:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setSubmitting(false);
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

  if (!isAdmin && !isOwner) {
    return null;
  }

  const canEdit = isAdmin || (isOwner && survey?.status !== 'published');
  const canSubmit = isOwner && (survey?.status === 'draft' || survey?.status === 'rejected');

  // Prepare questions for analytics
  const analyticsQuestions: SurveyQuestion[] = questions.map((q, index) => ({
    id: existingQuestionIds[index] || `temp-${index}`,
    survey_id: id || '',
    question_type: q.question_type,
    question_text_th: q.question_text_th,
    question_text_en: q.question_text_en,
    options: q.options,
    rating_min: q.rating_min,
    rating_max: q.rating_max,
    rating_label_min_th: q.rating_label_min_th,
    rating_label_min_en: q.rating_label_min_en,
    rating_label_max_th: q.rating_label_max_th,
    rating_label_max_en: q.rating_label_max_en,
    is_required: q.is_required,
    display_order: index,
    created_at: '',
    updated_at: '',
  }));

  return (
    <>
      <PageContainer>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/surveys')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {language === 'th' ? 'สร้างแบบสำรวจ' : 'Survey Builder'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {settings.title_th || settings.title_en || (language === 'th' ? 'แบบสำรวจใหม่' : 'New Survey')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {language === 'th' ? '⚙️ ตั้งค่าแบบสำรวจ' : '⚙️ Survey Settings'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{language === 'th' ? 'ชื่อ (TH) *' : 'Title (TH) *'}</Label>
                      <Input
                        value={settings.title_th}
                        onChange={(e) => setSettings({ ...settings, title_th: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{language === 'th' ? 'ชื่อ (EN) *' : 'Title (EN) *'}</Label>
                      <Input
                        value={settings.title_en}
                        onChange={(e) => setSettings({ ...settings, title_en: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{language === 'th' ? 'คำอธิบาย (TH)' : 'Description (TH)'}</Label>
                      <Textarea
                        value={settings.description_th}
                        onChange={(e) => setSettings({ ...settings, description_th: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{language === 'th' ? 'คำอธิบาย (EN)' : 'Description (EN)'}</Label>
                      <Textarea
                        value={settings.description_en}
                        onChange={(e) => setSettings({ ...settings, description_en: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* XP Reward - Only visible to admin */}
                  {isAdmin && (
                    <div className="space-y-1.5">
                      <Label>{language === 'th' ? 'XP Reward (Admin)' : 'XP Reward (Admin)'}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.xp_reward}
                        onChange={(e) => setSettings({ ...settings, xp_reward: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">
                      {language === 'th' ? 'ขอ Consent ก่อนทำ' : 'Require Consent'}
                    </span>
                    <Switch
                      checked={settings.require_consent}
                      onCheckedChange={(checked) => setSettings({ ...settings, require_consent: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">
                      {language === 'th' ? 'อนุญาตตอบแบบไม่ระบุตัวตน' : 'Allow Anonymous'}
                    </span>
                    <Switch
                      checked={settings.allow_anonymous}
                      onCheckedChange={(checked) => setSettings({ ...settings, allow_anonymous: checked })}
                    />
                  </div>

                  {/* Tags - Only visible to admin */}
                  {isAdmin && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Hot Tag</span>
                        <Switch
                          checked={settings.is_hot}
                          onCheckedChange={(checked) => setSettings({ ...settings, is_hot: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">New Tag</span>
                        <Switch
                          checked={settings.is_new}
                          onCheckedChange={(checked) => setSettings({ ...settings, is_new: checked })}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label>{language === 'th' ? 'ข้อความ Consent (TH)' : 'Consent Text (TH)'}</Label>
                    <Textarea
                      value={settings.consent_text_th}
                      onChange={(e) => setSettings({ ...settings, consent_text_th: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>{language === 'th' ? 'ข้อความ Consent (EN)' : 'Consent Text (EN)'}</Label>
                    <Textarea
                      value={settings.consent_text_en}
                      onChange={(e) => setSettings({ ...settings, consent_text_en: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={handleSave} disabled={saving} variant="outline">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {language === 'th' ? 'บันทึก' : 'Save'}
            </Button>

            {/* Submit for Review button - only for owners with draft/rejected surveys */}
            {canSubmit && (
              <Button onClick={handleSubmitForReview} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {language === 'th' ? 'ส่งตรวจสอบ' : 'Submit'}
              </Button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {survey?.status && survey.status !== 'published' && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            survey.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-700' :
            survey.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
            'bg-muted text-muted-foreground'
          }`}>
            {survey.status === 'pending_review' && (language === 'th' ? '⏳ รอ Admin ตรวจสอบและอนุมัติ' : '⏳ Waiting for admin review')}
            {survey.status === 'rejected' && (language === 'th' ? `❌ ถูกปฏิเสธ: ${survey.rejection_feedback || 'ไม่มีเหตุผล'}` : `❌ Rejected: ${survey.rejection_feedback || 'No reason given'}`)}
            {survey.status === 'draft' && (language === 'th' ? '📝 ร่าง - กด "ส่งตรวจสอบ" เมื่อพร้อม' : '📝 Draft - Click "Submit" when ready')}
          </div>
        )}

        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="builder">
              {language === 'th' ? '✏️ สร้างคำถาม' : '✏️ Builder'}
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={!isAdmin}>
              {language === 'th' ? '📊 ผลลัพธ์' : '📊 Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            {questions.length === 0 ? (
              <Card className="p-8 text-center border-2 border-dashed">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">
                  {language === 'th' ? 'ยังไม่มีคำถาม กดปุ่มด้านล่างเพื่อเพิ่ม' : 'No questions yet. Click below to add one.'}
                </p>
                <Button onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'th' ? 'เพิ่มคำถามแรก' : 'Add First Question'}
                </Button>
              </Card>
            ) : (
              questions.map((question, index) => (
                <QuestionBuilder
                  key={index}
                  question={question}
                  index={index}
                  onChange={(q) => updateQuestion(index, q)}
                  onRemove={() => removeQuestion(index)}
                />
              ))
            )}

            {questions.length > 0 && (
              <Button variant="outline" onClick={addQuestion} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" />
                {language === 'th' ? 'เพิ่มคำถาม' : 'Add Question'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {id && analyticsQuestions.length > 0 ? (
              <SurveyAnalytics surveyId={id} questions={analyticsQuestions} />
            ) : (
              <Card className="p-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {language === 'th' ? 'บันทึกคำถามก่อนเพื่อดู Analytics' : 'Save questions first to see analytics'}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
      <BottomNav />
    </>
  );
}
