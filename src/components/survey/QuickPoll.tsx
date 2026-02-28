import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle, BarChart3, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SurveyQuestion } from "./types";

interface QuickPollProps {
  surveyId: string;
  question: SurveyQuestion;
  totalResponses: number;
}

interface PollResults {
  [optionId: string]: number;
}

export function QuickPoll({ surveyId, question, totalResponses: initialTotal }: QuickPollProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<PollResults>({});
  const [totalVotes, setTotalVotes] = useState(0);

  // Check if user already voted (from localStorage)
  useEffect(() => {
    const voted = localStorage.getItem(`poll-voted-${surveyId}`);
    if (voted) {
      setHasVoted(true);
      setSelectedOption(voted);
      fetchResults();
    }
  }, [surveyId]);

  const fetchResults = async () => {
    try {
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('survey_id', surveyId);

      if (!responses || responses.length === 0) return;

      const responseIds = responses.map(r => r.id);
      const { data: answers } = await supabase
        .from('survey_answers')
        .select('answer_options')
        .eq('question_id', question.id)
        .in('response_id', responseIds);

      const counts: PollResults = {};
      question.options.forEach(opt => { counts[opt.id] = 0; });

      let total = 0;
      (answers || []).forEach(a => {
        const opts = a.answer_options as string[] || [];
        opts.forEach(optId => {
          if (counts[optId] !== undefined) {
            counts[optId]++;
            total++;
          }
        });
      });

      setResults(counts);
      setTotalVotes(total);
    } catch (err) {
      console.error('Error fetching poll results:', err);
    }
  };

  const handleVote = async () => {
    if (!selectedOption) return;

    setSubmitting(true);
    try {
      const sessionId = `poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create response
      const { data: response, error: respError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          user_id: user?.id || null,
          session_id: user ? null : sessionId,
          is_anonymous: !user,
          consent_given: true,
          consent_given_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (respError) throw respError;

      // Insert answer
      const { error: ansError } = await supabase
        .from('survey_answers')
        .insert({
          response_id: response.id,
          question_id: question.id,
          answer_options: [selectedOption],
        });

      if (ansError) throw ansError;

      // Track completion
      if (user) {
        await supabase.rpc('complete_survey', {
          p_survey_id: surveyId,
          p_session_id: null,
        });
      }

      localStorage.setItem(`poll-voted-${surveyId}`, selectedOption);
      setHasVoted(true);
      await fetchResults();

      toast.success(language === 'th' ? 'โหวตสำเร็จ!' : 'Vote submitted!');
    } catch (err) {
      console.error('Error voting:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const questionText = language === 'th' ? question.question_text_th : question.question_text_en;

  return (
    <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">
          {language === 'th' ? 'โพลด่วน' : 'Quick Poll'}
        </span>
      </div>

      <h3 className="font-semibold text-foreground text-sm mb-3">{questionText}</h3>

      <div className="space-y-2">
        {question.options.map((option) => {
          const optionText = language === 'th' ? option.text_th : option.text_en;
          const count = results[option.id] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = selectedOption === option.id;

          if (hasVoted) {
            return (
              <div key={option.id} className="relative">
                <div
                  className={cn(
                    "relative z-10 flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                    isSelected
                      ? "border-primary/40 bg-primary/5 font-medium"
                      : "border-border/50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                    {optionText}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
                </div>
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isSelected ? "bg-primary/10" : "bg-muted/50"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 font-medium"
                  : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              {optionText}
            </button>
          );
        })}
      </div>

      {!hasVoted ? (
        <Button
          onClick={handleVote}
          disabled={!selectedOption || submitting}
          className="w-full mt-3 h-9 text-sm"
          size="sm"
        >
          {submitting
            ? (language === 'th' ? 'กำลังส่ง...' : 'Voting...')
            : (language === 'th' ? 'โหวต' : 'Vote')}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {totalVotes} {language === 'th' ? 'โหวต' : 'votes'}
        </div>
      )}
    </Card>
  );
}
