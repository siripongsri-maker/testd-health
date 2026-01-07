import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/TaskCard";
import { getUserData, recordCheckIn, getTodayKey, getPEPDay, addBadge } from "@/lib/store";
import { ArrowLeft, Calendar, Check, Award } from "lucide-react";
import { toast } from "sonner";

export default function PEPTracker() {
  const navigate = useNavigate();
  const [userData, setLocalUserData] = useState(getUserData());
  const [todayStatus, setTodayStatus] = useState<"pending" | "taken" | "skipped">("pending");
  
  const pepDay = getPEPDay();

  useEffect(() => {
    const data = getUserData();
    setLocalUserData(data);
    
    const today = getTodayKey();
    if (data.checkIns[today]) {
      setTodayStatus(data.checkIns[today]);
    }
    
    // Check for completion badge
    if (pepDay >= 28 && !data.badges.includes("Completed PEP")) {
      addBadge("Completed PEP");
      toast.success("🎉 Congratulations!", {
        description: "You completed your 28-day PEP course!",
      });
    }
  }, [pepDay]);

  const handleTaken = () => {
    const today = getTodayKey();
    recordCheckIn(today, "taken");
    setTodayStatus("taken");
    
    const data = getUserData();
    setLocalUserData(data);
    
    toast.success("Keep going! +10 XP", {
      description: getEncouragementMessage(),
    });
  };

  const handleSkipped = () => {
    const today = getTodayKey();
    recordCheckIn(today, "skipped");
    setTodayStatus("skipped");
    
    const data = getUserData();
    setLocalUserData(data);
  };

  const getEncouragementMessage = () => {
    if (pepDay <= 7) return "Great start! The first week is crucial.";
    if (pepDay <= 14) return "You're halfway there!";
    if (pepDay <= 21) return "Almost done, keep pushing!";
    return "Final stretch — you've got this!";
  };

  const progressPercentage = (pepDay / 28) * 100;

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">PEP Tracker</h1>
        </div>
        
        {/* Progress Ring */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4">
            <svg className="h-40 w-40 -rotate-90 transform">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * progressPercentage) / 100}
                className="text-success transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-foreground">{pepDay}</span>
              <span className="text-sm text-muted-foreground">of 28 days</span>
            </div>
          </div>
          <p className="text-center text-muted-foreground animate-slide-up">
            {getEncouragementMessage()}
          </p>
        </div>
        
        {/* Today's Task */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-foreground">Today's Dose</h2>
          <TaskCard
            title={`PEP Day ${pepDay}`}
            subtitle={`${28 - pepDay} days remaining`}
            status={todayStatus}
            onTaken={handleTaken}
            onSkipped={handleSkipped}
          />
        </div>
        
        {/* Week Overview */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card animate-scale-in">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            This Week
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const dayNum = pepDay - (6 - i);
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              const dateKey = date.toISOString().split('T')[0];
              const status = userData.checkIns[dateKey];
              const isToday = i === 6;
              const isFuture = dayNum > pepDay;
              const isPast = dayNum <= pepDay && !isToday;
              
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                    isToday
                      ? "bg-primary/10 border border-primary/30"
                      : isPast && status === "taken"
                      ? "bg-success/10"
                      : "bg-muted/50"
                  }`}
                >
                  <span className="text-xs text-muted-foreground">
                    {date.toLocaleDateString("en-US", { weekday: "short" }).charAt(0)}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isPast && status === "taken"
                        ? "bg-success"
                        : isPast && status === "skipped"
                        ? "bg-muted"
                        : isToday
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  >
                    {isPast && status === "taken" ? (
                      <Check className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <span className={`text-xs font-bold ${
                        isToday ? "text-primary-foreground" : "text-muted-foreground"
                      }`}>
                        {dayNum > 0 && dayNum <= 28 ? dayNum : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Completion Message */}
        {pepDay >= 28 && (
          <div className="mt-6 rounded-2xl bg-success/10 border border-success/30 p-6 text-center animate-scale-in">
            <Award className="h-12 w-12 mx-auto text-success mb-3" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              Congratulations! 🎉
            </h3>
            <p className="text-muted-foreground">
              You've completed your 28-day PEP course. Remember to get tested.
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
