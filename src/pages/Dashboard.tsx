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
import { Zap, Flame, Star, Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('dashboard.welcome')}</h1>
            <p className="text-muted-foreground">{t('dashboard.doingGreat')}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="h-6 w-6" />
          </Button>
        </div>
        
        {/* XP Progress */}
        <div className="mb-6 rounded-2xl bg-card border border-border p-4 shadow-card animate-scale-in">
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
          <h2 className="mb-3 text-lg font-bold text-foreground">{t('dashboard.today')}</h2>
          {needsSetup ? (
            <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-card">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  {t('dashboard.setupSubtitle')}
                </p>
                <div className="space-y-3">
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => {
                      setUserData({ mode: "prep-daily" });
                      navigate("/setup/prep-daily");
                    }}
                  >
                    {t('dashboard.startDaily')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setUserData({ mode: "prep-ondemand" });
                      navigate("/setup/prep-ondemand");
                    }}
                  >
                    {t('dashboard.startOndemand')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/pep")}
                  >
                    <AlertTriangle className="h-5 w-5 text-warning" />
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
        
        {/* Quick Actions */}
        {!needsSetup && userData.mode !== "pep" && (
          <div className="mb-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/pep")}
            >
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t('dashboard.emergencyPep')}
            </Button>
          </div>
        )}
        
        {/* PEP Progress (if on PEP) */}
        {userData.mode === "pep" && pepDay > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card animate-scale-in">
            <h3 className="font-bold text-foreground mb-3">{t('dashboard.pepProgress')}</h3>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${(pepDay / 28) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              {t('dashboard.pepDay')} {pepDay} {t('dashboard.of28')} — {t('dashboard.doingGreat')}! 💪
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
