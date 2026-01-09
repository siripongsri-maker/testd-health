import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { TaskCard } from "@/components/TaskCard";
import { StatCard } from "@/components/StatCard";
import { XPBar } from "@/components/XPBar";
import { Button } from "@/components/ui/button";
import { getUserData, recordCheckIn, getTodayKey, getPEPDay, getXPForLevel, setUserData } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { useBadgeNotifications } from "@/hooks/useBadgeNotifications";
import { Zap, Flame, Star, Settings, AlertTriangle, TestTube, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { checkAndAwardBadges } = useBadgeNotifications();
  const [userData, setLocalUserData] = useState(getUserData());
  const [todayStatus, setTodayStatus] = useState<"pending" | "taken" | "skipped">("pending");
  
  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
    
    if (!data.onboardingComplete) {
      navigate("/");
      return;
    }
    
    const today = getTodayKey();
    if (data.checkIns[today]) {
      setTodayStatus(data.checkIns[today]);
    }
  }, [navigate]);

  const handleTaken = () => {
    const today = getTodayKey();
    recordCheckIn(today, "taken");
    setTodayStatus("taken");
    
    const data = getUserData();
    setLocalUserData(data);
    
    toast.success(t('dashboard.greatJob'), {
      description: `${t('stats.streak')}: ${data.streak} 🔥`,
    });

    // Check for newly earned badges after a short delay
    setTimeout(() => {
      checkAndAwardBadges();
    }, 1500);
  };

  const handleSkipped = () => {
    const today = getTodayKey();
    recordCheckIn(today, "skipped");
    setTodayStatus("skipped");
    
    const data = getUserData();
    setLocalUserData(data);
  };

  const xpInfo = getXPForLevel(userData.level);
  const pepDay = userData.mode === "pep" ? getPEPDay() : 0;
  
  const getTaskTitle = () => {
    switch (userData.mode) {
      case "prep-daily":
        return t('dashboard.takePrep');
      case "prep-ondemand":
        return t('onboarding.ondemand');
      case "pep":
        return `${t('dashboard.pepDay')} ${pepDay} ${t('dashboard.of28')}`;
      default:
        return t('dashboard.setupJourney');
    }
  };

  const getTaskSubtitle = () => {
    switch (userData.mode) {
      case "prep-daily":
        return userData.prepReminderTime || t('settings.dailyPrep.desc');
      case "prep-ondemand":
        return t('settings.ondemandPrep.desc');
      case "pep":
        return `${28 - pepDay} ${t('dashboard.daysRemaining')}`;
      default:
        return t('dashboard.setupSubtitle');
    }
  };

  const needsSetup = !userData.mode || userData.mode === "exploring";

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")}
              className="rounded-xl hover:bg-muted/80 h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('dashboard.welcome')}</h1>
              <p className="text-muted-foreground text-sm">{t('dashboard.doingGreat')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/settings")}
            className="rounded-xl hover:bg-muted/80 h-10 w-10"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        
        {/* XP Progress */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200/50 dark:border-violet-800/30 p-5">
          <XPBar
            current={xpInfo.current}
            required={xpInfo.required}
            level={userData.level}
          />
        </div>
        
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard icon={Zap} label={t('stats.xp')} value={userData.xp} variant="xp" />
          <StatCard icon={Flame} label={t('stats.streak')} value={userData.streak} variant="streak" />
          <StatCard icon={Star} label={t('stats.level')} value={userData.level} variant="level" />
        </div>
        
        {/* Today's Task */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('dashboard.today')}
          </h2>
          {needsSetup ? (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
              <div className="text-center">
                <p className="mb-5 text-muted-foreground">
                  {t('dashboard.setupSubtitle')}
                </p>
                <div className="space-y-3">
                  <Button
                    className="w-full rounded-xl h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                    onClick={() => {
                      setUserData({ mode: "prep-daily" });
                      navigate("/setup/prep-daily");
                    }}
                  >
                    {t('dashboard.startDaily')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full rounded-xl h-12"
                    onClick={() => {
                      setUserData({ mode: "prep-ondemand" });
                      navigate("/setup/prep-ondemand");
                    }}
                  >
                    {t('dashboard.startOndemand')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl h-12 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                    onClick={() => navigate("/pep")}
                  >
                    <AlertTriangle className="h-5 w-5" />
                    {t('dashboard.needPep')}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <TaskCard
              title={getTaskTitle()}
              subtitle={getTaskSubtitle()}
              status={todayStatus}
              onTaken={handleTaken}
              onSkipped={handleSkipped}
            />
          )}
        </div>

        {/* HIV Self-Test Quick Link */}
        <div className="mb-6">
          <Button
            variant="outline"
            className="w-full gap-3 rounded-xl h-14 border-primary/30 hover:bg-primary/5 hover:border-primary/50 transition-all duration-200"
            onClick={() => navigate("/hiv-selftest")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TestTube className="h-5 w-5 text-primary" />
            </div>
            <span className="flex-1 text-left font-medium">
              {userData.mode === "exploring" || !userData.mode
                ? (t('selfCare.hivTestReminder') || 'HIV Self-Test Kit')
                : (t('selfCare.hivTestReminder') || 'Get Free HIV Self-Test Kit')
              }
            </span>
          </Button>
        </div>
        
        {/* Quick Actions */}
        {!needsSetup && userData.mode !== "pep" && (
          <div className="mb-6">
            <Button
              variant="outline"
              className="w-full gap-3 rounded-xl h-14 border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-950/30 transition-all duration-200"
              onClick={() => navigate("/pep")}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="flex-1 text-left font-medium text-amber-700 dark:text-amber-400">
                {t('dashboard.emergencyPep')}
              </span>
            </Button>
          </div>
        )}
        
        {/* PEP Progress (if on PEP) */}
        {userData.mode === "pep" && pepDay > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-5">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              {t('dashboard.pepProgress')}
            </h3>
            <div className="h-3 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/50">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(pepDay / 28) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300 text-center font-medium">
              {t('dashboard.pepDay')} {pepDay} {t('dashboard.of28')} — {t('dashboard.doingGreat')}! 💪
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
