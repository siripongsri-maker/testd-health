import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { XPBar } from "@/components/XPBar";
import { StatCard } from "@/components/StatCard";
import { BadgeComponent } from "@/components/Badge";
import { getUserData, getXPForLevel } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { Zap, Flame, Star, Award, Pill, Shield, Calendar } from "lucide-react";

export default function Progress() {
  const { t } = useLanguage();
  const userData = getUserData();
  const xpInfo = getXPForLevel(userData.level);

  const allBadges = [
    { id: "Started PrEP Journey", name: t('badge.startedPrep'), icon: Pill },
    { id: "7 Day Streak", name: t('badge.7dayStreak'), icon: Flame },
    { id: "PEP Warrior", name: t('badge.pepWarrior'), icon: Shield },
    { id: "Completed PEP", name: t('badge.completedPep'), icon: Award },
    { id: "30 Day Streak", name: t('badge.30dayStreak'), icon: Calendar },
    { id: "Level 5", name: t('badge.level5'), icon: Star },
  ];

  return (
    <>
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('progress.title')}</h1>
          <p className="text-muted-foreground">{t('progress.subtitle')}</p>
        </div>
        
        <div className="mb-6 rounded-2xl bg-card border border-border p-6 shadow-card animate-scale-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-soft">
              <Star className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('progress.currentLevel')}</p>
              <p className="text-3xl font-bold text-foreground">{userData.level}</p>
            </div>
          </div>
          <XPBar current={xpInfo.current} required={xpInfo.required} level={userData.level} showLabel={false} />
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {xpInfo.required - xpInfo.current} {t('progress.xpToNext')}
          </p>
        </div>
        
        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard icon={Zap} label={t('stats.totalXp')} value={userData.xp} variant="xp" />
          <StatCard icon={Flame} label={t('stats.streak')} value={userData.streak} variant="streak" />
          <StatCard icon={Award} label={t('stats.badges')} value={userData.badges.length} variant="level" />
        </div>
        
        <div className="animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {t('progress.achievements')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {allBadges.map((badge) => (
              <BadgeComponent key={badge.id} icon={badge.icon} name={badge.name} earned={userData.badges.includes(badge.id)} />
            ))}
          </div>
        </div>
        
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-lg font-medium text-foreground">
            {userData.streak >= 7 ? t('progress.motivation.streak') : userData.xp >= 100 ? t('progress.motivation.xp') : t('progress.motivation.default')}
          </p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
