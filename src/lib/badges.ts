import { Pill, Shield, Flame, Award, Calendar, Star, Heart, TestTube, Zap, Trophy, Target, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface BadgeDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  category: 'prevention' | 'streak' | 'milestone' | 'testing' | 'engagement';
  checkCriteria: (data: BadgeCheckData) => boolean;
}

export interface BadgeCheckData {
  mode: string | null;
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  checkInsCount: number;
  pepCompleted: boolean;
  hivTestCompleted: boolean;
  articlesRead: number;
  daysActive: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Prevention badges
  {
    id: "started_prep",
    nameKey: "badge.startedPrep",
    descriptionKey: "badge.startedPrep.desc",
    icon: Pill,
    category: "prevention",
    checkCriteria: (data) => data.mode === 'prep-daily' || data.mode === 'prep-ondemand',
  },
  {
    id: "pep_warrior",
    nameKey: "badge.pepWarrior",
    descriptionKey: "badge.pepWarrior.desc",
    icon: Shield,
    category: "prevention",
    checkCriteria: (data) => data.mode === 'pep',
  },
  {
    id: "completed_pep",
    nameKey: "badge.completedPep",
    descriptionKey: "badge.completedPep.desc",
    icon: Award,
    category: "prevention",
    checkCriteria: (data) => data.pepCompleted,
  },

  // Streak badges
  {
    id: "streak_3",
    nameKey: "badge.3dayStreak",
    descriptionKey: "badge.3dayStreak.desc",
    icon: Flame,
    category: "streak",
    checkCriteria: (data) => data.streak >= 3,
  },
  {
    id: "streak_7",
    nameKey: "badge.7dayStreak",
    descriptionKey: "badge.7dayStreak.desc",
    icon: Flame,
    category: "streak",
    checkCriteria: (data) => data.streak >= 7,
  },
  {
    id: "streak_14",
    nameKey: "badge.14dayStreak",
    descriptionKey: "badge.14dayStreak.desc",
    icon: Flame,
    category: "streak",
    checkCriteria: (data) => data.streak >= 14,
  },
  {
    id: "streak_30",
    nameKey: "badge.30dayStreak",
    descriptionKey: "badge.30dayStreak.desc",
    icon: Calendar,
    category: "streak",
    checkCriteria: (data) => data.streak >= 30,
  },

  // Testing badges
  {
    id: "first_test",
    nameKey: "badge.firstTest",
    descriptionKey: "badge.firstTest.desc",
    icon: TestTube,
    category: "testing",
    checkCriteria: (data) => data.hivTestCompleted,
  },

  // Milestone badges
  {
    id: "level_5",
    nameKey: "badge.level5",
    descriptionKey: "badge.level5.desc",
    icon: Star,
    category: "milestone",
    checkCriteria: (data) => data.level >= 5,
  },
  {
    id: "level_10",
    nameKey: "badge.level10",
    descriptionKey: "badge.level10.desc",
    icon: Trophy,
    category: "milestone",
    checkCriteria: (data) => data.level >= 10,
  },
  {
    id: "xp_500",
    nameKey: "badge.xp500",
    descriptionKey: "badge.xp500.desc",
    icon: Zap,
    category: "milestone",
    checkCriteria: (data) => data.xp >= 500,
  },
  {
    id: "xp_1000",
    nameKey: "badge.xp1000",
    descriptionKey: "badge.xp1000.desc",
    icon: Sparkles,
    category: "milestone",
    checkCriteria: (data) => data.xp >= 1000,
  },

  // Engagement badges
  {
    id: "knowledge_seeker",
    nameKey: "badge.knowledgeSeeker",
    descriptionKey: "badge.knowledgeSeeker.desc",
    icon: Heart,
    category: "engagement",
    checkCriteria: (data) => data.articlesRead >= 5,
  },
  {
    id: "dedicated",
    nameKey: "badge.dedicated",
    descriptionKey: "badge.dedicated.desc",
    icon: Target,
    category: "engagement",
    checkCriteria: (data) => data.daysActive >= 7,
  },
];

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}

export function getEarnedBadges(data: BadgeCheckData): string[] {
  return BADGE_DEFINITIONS
    .filter(badge => badge.checkCriteria(data))
    .map(badge => badge.id);
}

export function getNewlyEarnedBadges(currentBadges: string[], data: BadgeCheckData): string[] {
  const earnedNow = getEarnedBadges(data);
  return earnedNow.filter(id => !currentBadges.includes(id));
}

export function getBadgesByCategory(category: BadgeDefinition['category']): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter(b => b.category === category);
}
