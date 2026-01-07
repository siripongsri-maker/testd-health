import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { TaskCard } from "@/components/TaskCard";
import { StatCard } from "@/components/StatCard";
import { XPBar } from "@/components/XPBar";
import { Button } from "@/components/ui/button";
import { getUserData, recordCheckIn, getTodayKey, getPEPDay, getXPForLevel, setUserData } from "@/lib/store";
import { Zap, Flame, Star, Settings, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
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
    
    toast.success("Great job! +10 XP earned", {
      description: `Streak: ${data.streak} days 🔥`,
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
        return "Take PrEP today";
      case "prep-ondemand":
        return "On-demand PrEP active";
      case "pep":
        return `PEP Day ${pepDay} of 28`;
      default:
        return "Set up your journey";
    }
  };

  const getTaskSubtitle = () => {
    switch (userData.mode) {
      case "prep-daily":
        return userData.prepReminderTime || "Daily reminder";
      case "prep-ondemand":
        return "Protection period";
      case "pep":
        return `${28 - pepDay} days remaining`;
      default:
        return "Choose your path";
    }
  };

  const needsSetup = !userData.mode || userData.mode === "exploring";

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground">You're doing great</p>
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
          <StatCard icon={Zap} label="XP" value={userData.xp} variant="xp" />
          <StatCard icon={Flame} label="Streak" value={userData.streak} variant="streak" />
          <StatCard icon={Star} label="Level" value={userData.level} variant="level" />
        </div>
        
        {/* Today's Task */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">Today</h2>
          {needsSetup ? (
            <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-card">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  Set up your prevention journey to start tracking
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
                    Start Daily PrEP
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setUserData({ mode: "prep-ondemand" });
                      navigate("/setup/prep-ondemand");
                    }}
                  >
                    Start On-demand PrEP
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/pep")}
                  >
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    I need PEP
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
              I need emergency PEP
            </Button>
          </div>
        )}
        
        {/* PEP Progress (if on PEP) */}
        {userData.mode === "pep" && pepDay > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4 shadow-card animate-scale-in">
            <h3 className="font-bold text-foreground mb-3">PEP Progress</h3>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${(pepDay / 28) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Day {pepDay} of 28 — You're doing great! 💪
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
