import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

type QuestTrigger = 
  | 'medication_setup'
  | 'profile_complete'
  | 'article_created'
  | 'article_read'
  | 'article_comment'
  | 'survey_complete'
  | 'social_visit'
  | 'clinic_booking'
  | 'selftest_request';

interface Quest {
  id: string;
  quest_type: string;
  target_count: number;
  reward_xp: number;
  trigger_type: string;
  title_en: string;
  title_th: string;
}

interface UserQuest {
  id: string;
  quest_id: string;
  progress: number;
  completed: boolean;
  last_reset_at: string | null;
}

// Get start of day in Asia/Bangkok timezone
const getBangkokDayStart = (): Date => {
  const now = new Date();
  // Convert to Bangkok time (UTC+7)
  const bangkokOffset = 7 * 60; // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const bangkokMinutes = utcMinutes + bangkokOffset;
  
  const bangkokDate = new Date(now);
  if (bangkokMinutes >= 24 * 60) {
    bangkokDate.setUTCDate(bangkokDate.getUTCDate() + 1);
  }
  bangkokDate.setUTCHours(0, 0, 0, 0);
  bangkokDate.setUTCHours(bangkokDate.getUTCHours() - 7); // Convert back to UTC
  return bangkokDate;
};

// Get start of month in Asia/Bangkok timezone
const getBangkokMonthStart = (): Date => {
  const now = new Date();
  const bangkokOffset = 7 * 60 * 60 * 1000; // milliseconds
  const bangkokNow = new Date(now.getTime() + bangkokOffset);
  const monthStart = new Date(bangkokNow.getFullYear(), bangkokNow.getMonth(), 1);
  return new Date(monthStart.getTime() - bangkokOffset);
};

// Check if quest needs reset based on type
const needsReset = (questType: string, lastResetAt: string | null): boolean => {
  if (!lastResetAt) return false; // Never completed, no reset needed
  
  const lastReset = new Date(lastResetAt);
  
  if (questType === 'daily') {
    const dayStart = getBangkokDayStart();
    return lastReset < dayStart;
  }
  
  if (questType === 'monthly') {
    const monthStart = getBangkokMonthStart();
    return lastReset < monthStart;
  }
  
  return false; // one-time quests never reset
};

export function useQuestProgress() {
  const { user } = useAuth();

  const completeQuest = useCallback(async (trigger: QuestTrigger, language: 'th' | 'en' = 'th') => {
    if (!user) return null;

    try {
      // 1. Find the quest matching this trigger
      const { data: quests, error: questError } = await supabase
        .from('quests')
        .select('id, quest_type, target_count, reward_xp, trigger_type, title_en, title_th')
        .eq('trigger_type', trigger)
        .eq('is_active', true);

      if (questError || !quests || quests.length === 0) {
        console.log('No active quest found for trigger:', trigger);
        return null;
      }

      const quest = quests[0] as Quest;

      // 2. Get or create user quest progress
      let { data: userQuest, error: uqError } = await supabase
        .from('user_quests')
        .select('id, quest_id, progress, completed, last_reset_at')
        .eq('user_id', user.id)
        .eq('quest_id', quest.id)
        .maybeSingle();

      if (uqError) {
        console.error('Error fetching user quest:', uqError);
        return null;
      }

      const typedUserQuest = userQuest as UserQuest | null;

      // 3. Check if already completed and doesn't need reset
      if (typedUserQuest?.completed) {
        const shouldReset = needsReset(quest.quest_type, typedUserQuest.last_reset_at);
        
        if (!shouldReset) {
          // Already completed and not reset time yet
          return null;
        }
        
        // Reset the quest for daily/monthly
        await supabase
          .from('user_quests')
          .update({
            progress: 0,
            completed: false,
            last_reset_at: new Date().toISOString(),
          })
          .eq('id', typedUserQuest.id);
        
        typedUserQuest.progress = 0;
        typedUserQuest.completed = false;
      }

      // 4. Update progress
      const newProgress = (typedUserQuest?.progress || 0) + 1;
      const isNowComplete = newProgress >= quest.target_count;

      if (!typedUserQuest) {
        // Create new user quest entry
        await supabase.from('user_quests').insert({
          user_id: user.id,
          quest_id: quest.id,
          progress: newProgress,
          completed: isNowComplete,
          started_at: new Date().toISOString(),
          completed_at: isNowComplete ? new Date().toISOString() : null,
          last_reset_at: new Date().toISOString(),
        });
      } else {
        // Update existing
        await supabase
          .from('user_quests')
          .update({
            progress: newProgress,
            completed: isNowComplete,
            completed_at: isNowComplete ? new Date().toISOString() : null,
            last_reset_at: isNowComplete ? new Date().toISOString() : typedUserQuest.last_reset_at,
          })
          .eq('id', typedUserQuest.id);
      }

      // 5. Award XP if completed
      if (isNowComplete && quest.reward_xp > 0) {
        // Get current XP and increment
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', user.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ xp: (profile.xp || 0) + quest.reward_xp })
            .eq('id', user.id);
        }

        const questTitle = language === 'th' ? quest.title_th : quest.title_en;
        toast.success(
          language === 'th' 
            ? `✅ เควส "${questTitle}" สำเร็จ! +${quest.reward_xp} XP`
            : `✅ Quest "${questTitle}" completed! +${quest.reward_xp} XP`,
          { duration: 4000 }
        );

        return { quest, xpAwarded: quest.reward_xp };
      }

      return null;
    } catch (error) {
      console.error('Error completing quest:', error);
      return null;
    }
  }, [user]);

  // Convenience methods for each trigger type
  const trackMedicationSetup = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('medication_setup', lang), [completeQuest]);
  
  const trackProfileComplete = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('profile_complete', lang), [completeQuest]);
  
  const trackArticleCreated = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('article_created', lang), [completeQuest]);
  
  const trackArticleRead = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('article_read', lang), [completeQuest]);
  
  const trackArticleComment = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('article_comment', lang), [completeQuest]);
  
  const trackSurveyComplete = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('survey_complete', lang), [completeQuest]);
  
  const trackSocialVisit = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('social_visit', lang), [completeQuest]);
  
  const trackClinicBooking = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('clinic_booking', lang), [completeQuest]);
  
  const trackSelftestRequest = useCallback((lang: 'th' | 'en' = 'th') => 
    completeQuest('selftest_request', lang), [completeQuest]);

  return {
    completeQuest,
    trackMedicationSetup,
    trackProfileComplete,
    trackArticleCreated,
    trackArticleRead,
    trackArticleComment,
    trackSurveyComplete,
    trackSocialVisit,
    trackClinicBooking,
    trackSelftestRequest,
  };
}
