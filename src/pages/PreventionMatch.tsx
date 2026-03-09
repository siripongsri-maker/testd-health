import { useState, useCallback } from 'react';
import { PreventionMatchIntro } from '@/components/prevention-match/PreventionMatchIntro';
import { PreventionMatchQuiz } from '@/components/prevention-match/PreventionMatchQuiz';
import { PreventionPhotoUpload } from '@/components/prevention-match/PreventionPhotoUpload';
import { PreventionMatchResult } from '@/components/prevention-match/PreventionMatchResult';
import { calculateResult, getResultScore, RESULT_DATA, AVATAR_MAP } from '@/components/prevention-match/types';
import type { ResultType } from '@/components/prevention-match/types';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/hooks/useAnalytics';
import { PageHeader } from '@/components/PageHeader';

type Step = 'intro' | 'quiz' | 'photo' | 'result';

export default function PreventionMatch() {
  const [step, setStep] = useState<Step>('intro');
  const [resultType, setResultType] = useState<ResultType | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<Record<number, string> | null>(null);

  const handleStart = useCallback(() => {
    setStep('quiz');
    trackEvent('prevention_match_started');
  }, []);

  const handleQuizComplete = useCallback((answers: Record<number, string>) => {
    setPendingAnswers(answers);
    setStep('photo');
  }, []);

  const handlePhotoComplete = useCallback(async (photoUrl: string | null) => {
    setUserPhoto(photoUrl);
    if (!pendingAnswers) return;

    const answers = pendingAnswers;
    const type = calculateResult(answers);
    const score = getResultScore(answers);
    const resultData = RESULT_DATA[type];
    setResultType(type);
    setStep('result');
    trackEvent('prevention_match_completed');

    // Save result to DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { count } = await supabase
          .from('prevention_match_results' as any)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        await supabase.from('prevention_match_results' as any).insert({
          user_id: user.id,
          result_type: type,
          avatar_type: AVATAR_MAP[type],
          compatible_type: resultData.compatibleType,
          dating_behavior: resultData.datingBehavior.join(' | '),
          partner_preference: resultData.partnerPreference.join(' | '),
          score,
          answers,
        });

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
  }, [pendingAnswers]);

  const handleRetake = useCallback(() => {
    setResultType(null);
    setUserPhoto(null);
    setPendingAnswers(null);
    setStep('intro');
  }, []);

  return (
    <div className="pb-24">
      {step !== 'result' && <PageHeader title="Prevention Match" />}
      {step === 'intro' && <PreventionMatchIntro onStart={handleStart} />}
      {step === 'quiz' && (
        <PreventionMatchQuiz
          onComplete={handleQuizComplete}
          onBack={() => setStep('intro')}
        />
      )}
      {step === 'photo' && (
        <PreventionPhotoUpload
          onComplete={handlePhotoComplete}
          onBack={() => setStep('quiz')}
        />
      )}
      {step === 'result' && resultType && (
        <PreventionMatchResult
          result={RESULT_DATA[resultType]}
          onRetake={handleRetake}
          userPhoto={userPhoto}
        />
      )}
    </div>
  );
}
