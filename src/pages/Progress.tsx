import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { XPBar } from "@/components/XPBar";
import { StatCard } from "@/components/StatCard";
import { BadgeComponent } from "@/components/Badge";
import { getUserData, getXPForLevel } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { BADGE_DEFINITIONS, getBadgesByCategory, type BadgeCheckData } from "@/lib/badges";
import { Zap, Flame, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Progress() {
  const { t } = useLanguage();
  const userData = getUserData();
  const xpInfo = getXPForLevel(userData.level);

  // Build badge check data from user data
  const badgeCheckData: BadgeCheckData = {
    mode: userData.mode,
    xp: userData.xp,
    level: userData.level,
    streak: userData.streak,
    badges: userData.badges,
    checkInsCount: Object.keys(userData.checkIns).filter(k => userData.checkIns[k] === 'taken').length,
    pepCompleted: userData.badges.includes('completed_pep'),
    hivTestCompleted: userData.badges.includes('first_test'),
    articlesRead: 0, // Would need to track this
    daysActive: Object.keys(userData.checkIns).length,
  };

  const categories = [
    { key: 'all', label: t('badge.category.all') || 'All' },
    { key: 'prevention', label: t('badge.category.prevention') },
    { key: 'streak', label: t('badge.category.streak') },
    { key: 'milestone', label: t('badge.category.milestone') },
    { key: 'testing', label: t('badge.category.testing') },
    { key: 'engagement', label: t('badge.category.engagement') },
  ] as const;

  const getBadgesForCategory = (category: string) => {
    if (category === 'all') return BADGE_DEFINITIONS;
    return getBadgesByCategory(category as any);
  };

  const earnedCount = BADGE_DEFINITIONS.filter(badge => 
    badge.checkCriteria(badgeCheckData)
  ).length;

  return (
    <>
      <PageContainer>
        <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle')} />
        
        <div className="mb-6 rounded-2xl bg-card border border-border p-6 shadow-card animate-scale-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-soft">
              <Award className="h-8 w-8 text-primary-foreground" />
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
          <StatCard icon={Award} label={t('stats.badges')} value={`${earnedCount}/${BADGE_DEFINITIONS.length}`} variant="level" />
        </div>
        
        <div className="animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {t('progress.achievements')}
          </h2>
          
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full mb-4 flex-wrap h-auto gap-1">
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat.key} 
                  value={cat.key}
                  className="text-xs px-3 py-1.5"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {categories.map(cat => (
              <TabsContent key={cat.key} value={cat.key}>
                <div className="grid grid-cols-3 gap-3">
                  {getBadgesForCategory(cat.key).map((badge) => {
                    const isEarned = badge.checkCriteria(badgeCheckData);
                    return (
                      <BadgeComponent 
                        key={badge.id} 
                        icon={badge.icon} 
                        name={t(badge.nameKey)} 
                        description={t(badge.descriptionKey)}
                        earned={isEarned}
                      />
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
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
