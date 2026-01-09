import { useCallback } from "react";
import { toast } from "sonner";
import { getUserData, setUserData } from "@/lib/store";
import { getNewlyEarnedBadges, getBadgeById, BadgeCheckData } from "@/lib/badges";
import { useLanguage } from "@/lib/i18n";

export function useBadgeNotifications() {
  const { t } = useLanguage();

  const checkAndAwardBadges = useCallback((additionalData?: Partial<BadgeCheckData>) => {
    const userData = getUserData();
    
    const checkData: BadgeCheckData = {
      mode: userData.mode,
      xp: userData.xp,
      level: userData.level,
      streak: userData.streak,
      badges: userData.badges,
      checkInsCount: Object.keys(userData.checkIns).length,
      pepCompleted: userData.mode === 'pep' && Object.values(userData.checkIns).filter(v => v === 'taken').length >= 28,
      hivTestCompleted: false, // Will be set by caller if needed
      articlesRead: 0, // Will be set by caller if needed
      daysActive: Object.keys(userData.checkIns).length,
      ...additionalData,
    };

    const newBadges = getNewlyEarnedBadges(userData.badges, checkData);

    if (newBadges.length > 0) {
      // Save new badges
      setUserData({ badges: [...userData.badges, ...newBadges] });

      // Show toast for each new badge
      newBadges.forEach((badgeId, index) => {
        const badge = getBadgeById(badgeId);
        if (badge) {
          setTimeout(() => {
            toast.success(t('badge.earned'), {
              description: t(badge.nameKey),
              duration: 5000,
              icon: "🏆",
            });
          }, index * 800); // Stagger notifications
        }
      });
    }

    return newBadges;
  }, [t]);

  return { checkAndAwardBadges };
}
