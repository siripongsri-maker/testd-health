import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { XPBar } from "@/components/XPBar";
import { StatCard } from "@/components/StatCard";
import { BadgeComponent } from "@/components/Badge";
import { getUserData, getXPForLevel } from "@/lib/store";
import { Zap, Flame, Star, Award, Pill, Shield, Calendar } from "lucide-react";

const allBadges = [
  { id: "Started PrEP Journey", name: "Started PrEP", icon: Pill },
  { id: "7 Day Streak", name: "7-Day Streak", icon: Flame },
  { id: "PEP Warrior", name: "PEP Warrior", icon: Shield },
  { id: "Completed PEP", name: "Completed PEP", icon: Award },
  { id: "30 Day Streak", name: "30-Day Streak", icon: Calendar },
  { id: "Level 5", name: "Level 5", icon: Star },
];

export default function Progress() {
  const userData = getUserData();
  const xpInfo = getXPForLevel(userData.level);

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Your Progress</h1>
          <p className="text-muted-foreground">Keep up the great work!</p>
        </div>
        
        {/* Level Progress */}
        <div className="mb-6 rounded-2xl bg-card border border-border p-6 shadow-card animate-scale-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary shadow-soft">
              <Star className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Level</p>
              <p className="text-3xl font-bold text-foreground">{userData.level}</p>
            </div>
          </div>
          <XPBar
            current={xpInfo.current}
            required={xpInfo.required}
            level={userData.level}
            showLabel={false}
          />
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {xpInfo.required - xpInfo.current} XP to next level
          </p>
        </div>
        
        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard icon={Zap} label="Total XP" value={userData.xp} variant="xp" />
          <StatCard icon={Flame} label="Streak" value={userData.streak} variant="streak" />
          <StatCard icon={Award} label="Badges" value={userData.badges.length} variant="level" />
        </div>
        
        {/* Badges */}
        <div className="animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Achievements
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {allBadges.map((badge) => (
              <BadgeComponent
                key={badge.id}
                icon={badge.icon}
                name={badge.name}
                earned={userData.badges.includes(badge.id)}
              />
            ))}
          </div>
        </div>
        
        {/* Motivation */}
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-lg font-medium text-foreground">
            {userData.streak >= 7
              ? "🔥 Amazing streak! You're on fire!"
              : userData.xp >= 100
              ? "⭐ Great progress! Keep going!"
              : "💪 Every day counts. You've got this!"}
          </p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
