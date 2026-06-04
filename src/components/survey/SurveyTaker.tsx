import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Send, Loader2, RotateCcw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { SurveyQuestion, AnswerData, SkipCondition } from "./types";
import { cn } from "@/lib/utils";

function shouldShowQuestion(question: SurveyQuestion, allQuestions: SurveyQuestion[], answers: Record<string, AnswerData>): boolean {
  const condition = question.skip_condition as SkipCondition | null | undefined;
  if (!condition) return true;
  const depQuestion = allQuestions[condition.depends_on_question_index];
  if (!depQuestion) return true;
  const depAnswer = answers[depQuestion.id];
  if (!depAnswer?.answer_options || depAnswer.answer_options.length === 0) return false;
  return condition.show_if_option_ids.some(id => depAnswer.answer_options!.includes(id));
}

interface SurveyTakerProps {
  questions: SurveyQuestion[];
  onSubmit: (answers: AnswerData[]) => Promise<void>;
  isSubmitting?: boolean;
  /** If provided, enables autosave/resume */
  surveyId?: string;
}

const STORAGE_PREFIX = "survey-progress-";

export function SurveyTaker({ questions, onSubmit, isSubmitting = false, surveyId }: SurveyTakerProps) {
  const { language } = useLanguage();
  const storageKey = surveyId ? `${STORAGE_PREFIX}${surveyId}` : null;

  // Load saved progress
  const loadSaved = useCallback(() => {
    if (!storageKey) return { answers: {} as Record<string, AnswerData>, index: 0 };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.answers) return { answers: parsed.answers as Record<string, AnswerData>, index: parsed.currentIndex ?? 0 };
      }
    } catch {}
    return { answers: {} as Record<string, AnswerData>, index: 0 };
  }, [storageKey]);

  const saved = loadSaved();
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(saved.index);
  const [answers, setAnswers] = useState<Record<string, AnswerData>>(saved.answers);
  const [showResumePrompt, setShowResumePrompt] = useState(() => Object.keys(saved.answers).length > 0);

  // Filter questions based on skip conditions
  const visibleQuestions = useMemo(() => {
    return questions.filter(q => shouldShowQuestion(q, questions, answers));
  }, [questions, answers]);

  const currentIndex = Math.min(currentVisibleIndex, visibleQuestions.length - 1);

  // Autosave on change
  useEffect(() => {
    if (!storageKey || Object.keys(answers).length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, currentIndex: currentVisibleIndex, savedAt: Date.now() }));
    } catch {}
  }, [answers, currentVisibleIndex, storageKey]);

  const clearSaved = useCallback(() => {
    if (storageKey) localStorage.removeItem(storageKey);
  }, [storageKey]);

  const currentQuestion = visibleQuestions[currentIndex];
  const progress = visibleQuestions.length > 0 ? ((currentIndex + 1) / visibleQuestions.length) * 100 : 0;

  const updateAnswer = (data: Partial<AnswerData>) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        question_id: currentQuestion.id,
        ...prev[currentQuestion.id],
        ...data,
      },
    }));
  };

  const currentAnswer = answers[currentQuestion?.id];

  const isCurrentAnswerValid = () => {
    if (!currentQuestion.is_required) return true;
    if (!currentAnswer) return false;
    switch (currentQuestion.question_type) {
      case 'multiple_choice':
      case 'checkbox':
        return currentAnswer.answer_options && currentAnswer.answer_options.length > 0;
      case 'text_short':
      case 'text_long':
        return currentAnswer.answer_text && currentAnswer.answer_text.trim().length > 0;
      case 'rating':
        return currentAnswer.answer_rating !== undefined && currentAnswer.answer_rating !== null;
      default:
        return true;
    }
  };

  const handleNext = () => { if (currentIndex < visibleQuestions.length - 1) setCurrentVisibleIndex(currentIndex + 1); };
  const handlePrev = () => { if (currentIndex > 0) setCurrentVisibleIndex(currentIndex - 1); };

  const handleSubmit = async () => {
    // Only submit answers for visible questions
    const visibleIds = new Set(visibleQuestions.map(q => q.id));
    const allAnswers = Object.values(answers).filter(a => visibleIds.has(a.question_id));
    await onSubmit(allAnswers);
    clearSaved();
  };

  const handleStartFresh = () => {
    setAnswers({});
    setCurrentVisibleIndex(0);
    setShowResumePrompt(false);
    clearSaved();
  };

  const handleResume = () => {
    setShowResumePrompt(false);
  };

  const isLastQuestion = currentIndex === visibleQuestions.length - 1;

  if (!currentQuestion) return null;

  // Resume prompt
  if (showResumePrompt) {
    const answeredCount = Object.keys(saved.answers).length;
    return (
      <Card className="p-6 text-center space-y-4">
        <RotateCcw className="h-10 w-10 text-primary mx-auto" />
        <div>
          <h3 className="font-semibold text-foreground mb-1">
            {language === 'th' ? 'มีคำตอบที่บันทึกไว้' : 'Saved Progress Found'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'th'
              ? `คุณตอบไปแล้ว ${answeredCount} จาก ${visibleQuestions.length} ข้อ`
              : `You answered ${answeredCount} of ${visibleQuestions.length} questions`}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={handleStartFresh} size="sm">
            {language === 'th' ? 'เริ่มใหม่' : 'Start Fresh'}
          </Button>
          <Button onClick={handleResume} size="sm">
            {language === 'th' ? 'ทำต่อ' : 'Resume'}
          </Button>
        </div>
      </Card>
    );
  }

  const questionText = language === 'th' ? currentQuestion.question_text_th : currentQuestion.question_text_en;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {language === 'th' ? `คำถามที่ ${currentIndex + 1} จาก ${visibleQuestions.length}` : `Question ${currentIndex + 1} of ${visibleQuestions.length}`}
          </span>
          <span className="font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {questionText?.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < questionText.split('\n').length - 1 && <br />}
                </span>
              ))}
              {currentQuestion.is_required && <span className="text-destructive ml-1">*</span>}
            </h2>
          </div>

          {/* Multiple Choice */}
          {currentQuestion.question_type === 'multiple_choice' && (
            <RadioGroup
              value={currentAnswer?.answer_options?.[0] || ''}
              onValueChange={(value) => updateAnswer({ answer_options: [value] })}
              className="space-y-3"
            >
              {currentQuestion.options.map((option) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer flex-1 py-2">
                    {language === 'th' ? option.text_th : option.text_en}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Checkbox */}
          {currentQuestion.question_type === 'checkbox' && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isChecked = currentAnswer?.answer_options?.includes(option.id) || false;
                return (
                  <div key={option.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={option.id}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentOptions = currentAnswer?.answer_options || [];
                        if (checked) {
                          updateAnswer({ answer_options: [...currentOptions, option.id] });
                        } else {
                          updateAnswer({ answer_options: currentOptions.filter((id) => id !== option.id) });
                        }
                      }}
                    />
                    <Label htmlFor={option.id} className="cursor-pointer flex-1 py-2">
                      {language === 'th' ? option.text_th : option.text_en}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}

          {/* Short Text */}
          {currentQuestion.question_type === 'text_short' && (
            <Input
              value={currentAnswer?.answer_text || ''}
              onChange={(e) => updateAnswer({ answer_text: e.target.value })}
              placeholder={language === 'th' ? 'พิมพ์คำตอบของคุณ...' : 'Type your answer...'}
            />
          )}

          {/* Long Text */}
          {currentQuestion.question_type === 'text_long' && (
            <Textarea
              value={currentAnswer?.answer_text || ''}
              onChange={(e) => updateAnswer({ answer_text: e.target.value })}
              placeholder={language === 'th' ? 'พิมพ์คำตอบของคุณ...' : 'Type your answer...'}
              rows={4}
            />
          )}

          {/* Rating */}
          {currentQuestion.question_type === 'rating' && (
            <div className="space-y-4">
              <div className="flex justify-center gap-2">
                {Array.from(
                  { length: currentQuestion.rating_max - currentQuestion.rating_min + 1 },
                  (_, i) => currentQuestion.rating_min + i
                ).map((rating) => {
                  const isSelected = currentAnswer?.answer_rating === rating;
                  return (
                    <button
                      key={rating}
                      onClick={() => updateAnswer({ answer_rating: rating })}
                      className={cn(
                        "h-12 w-12 rounded-full border-2 font-bold transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary scale-110"
                          : "bg-card border-border hover:border-primary/50 hover:bg-muted"
                      )}
                    >
                      {rating}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {language === 'th'
                    ? currentQuestion.rating_label_min_th || `${currentQuestion.rating_min}`
                    : currentQuestion.rating_label_min_en || `${currentQuestion.rating_min}`}
                </span>
                <span>
                  {language === 'th'
                    ? currentQuestion.rating_label_max_th || `${currentQuestion.rating_max}`
                    : currentQuestion.rating_label_max_en || `${currentQuestion.rating_max}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Autosave indicator */}
      {storageKey && Object.keys(answers).length > 0 && (
        <p className="text-[10px] text-center text-muted-foreground/60">
          {language === 'th' ? '💾 บันทึกอัตโนมัติ — ปิดแล้วกลับมาทำต่อได้' : '💾 Auto-saved — you can close and resume later'}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-2" />
          {language === 'th' ? 'ย้อนกลับ' : 'Previous'}
        </Button>

        {isLastQuestion ? (
          <Button onClick={handleSubmit} disabled={!isCurrentAnswerValid() || isSubmitting} className="flex-1">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{language === 'th' ? 'กำลังส่ง...' : 'Submitting...'}</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />{language === 'th' ? 'ส่งคำตอบ' : 'Submit'}</>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!isCurrentAnswerValid()} className="flex-1">
            {language === 'th' ? 'ถัดไป' : 'Next'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
