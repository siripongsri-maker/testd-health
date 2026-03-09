import { useState, useCallback } from 'react';
import { PreventionMatchIntro } from '@/components/prevention-match/PreventionMatchIntro';
import { PreventionMatchQuiz } from '@/components/prevention-match/PreventionMatchQuiz';
import { PreventionMatchResult } from '@/components/prevention-match/PreventionMatchResult';
import { calculateResult, getResultScore, RESULT_DATA, AVATAR_MAP } from '@/components/prevention-match/types';
import type { ResultType } from '@/components/prevention-match/types';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/hooks/useAnalytics';
import { PageHeader } from '@/components/PageHeader';

type Step = 'intro' | 'quiz' | 'result';

export default function PreventionMatch() {
  const [step, setStep] = useState<Step>('intro');
  const [resultType, setResultType] = useState<ResultType | null>(null);

  const handleStart = useCallback(() => {
    setStep('quiz');
    trackEvent('quiz_started');
  }, []);

  const handleComplete = useCallback(async (answers: Record<number, string>) => {
    const type = calculateResult(answers);
    const score = getResultScore(answers);
    setResultType(type);
    setStep('result');
    trackEvent('quiz_completed');
    trackEvent('result_type_generated');

    // Save result to DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if first completion for XP
        const { count } = await supabase
          .from('prevention_match_results' as any)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        await supabase.from('prevention_match_results' as any).insert({
          user_id: user.id,
          result_type: type,
          avatar_type: AVATAR_MAP[type],
          score,
          answers,
        });

        // Award XP on first completion only
        if (count === 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', user.id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ xp: (profile.xp || 0) + 20 })
              .eq('id', user.id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to save prevention match result:', e);
    }
  }, []);

  const handleRetake = useCallback(() => {
    setResultType(null);
    setStep('intro');
  }, []);

  return (
    <div className="pb-24">
      {step !== 'result' && <PageHeader title="Prevention Match" />}
      {step === 'intro' && <PreventionMatchIntro onStart={handleStart} />}
      {step === 'quiz' && (
        <PreventionMatchQuiz
          onComplete={handleComplete}
          onBack={() => setStep('intro')}
        />
      )}
      {step === 'result' && resultType && (
        <PreventionMatchResult
          result={RESULT_DATA[resultType]}
          onRetake={handleRetake}
        />
      )}
    </div>
  );
}
