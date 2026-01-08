// Simple in-memory store for anonymous-first approach
// Data persists in localStorage for convenience

export interface PersonalInfo {
  fullName: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say' | '';
  birthDate: string;
  phone: string;
  lineId: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface AvatarConfig {
  skinTone: number;
  hairStyle: number;
  hairColor: number;
  outfit: number;
  accessory: number;
  background: number;
}

export interface UserData {
  mode: 'prep-daily' | 'prep-ondemand' | 'pep' | 'exploring' | null;
  prepStartDate?: string;
  prepStopDate?: string;
  prepReminderTime?: string;
  onDemandEventDate?: string;
  pepExposureTime?: string;
  pepStartDate?: string;
  xp: number;
  level: number;
  streak: number;
  checkIns: Record<string, 'taken' | 'skipped'>;
  badges: string[];
  consentGiven: boolean;
  onboardingComplete: boolean;
  personalInfo: PersonalInfo;
  avatarConfig: AvatarConfig;
  notificationSettings: {
    dailyPrep: boolean;
    onDemandPrep: boolean;
    pepDaily: boolean;
    reminderTime: string;
  };
}

const DEFAULT_DATA: UserData = {
  mode: null,
  xp: 0,
  level: 1,
  streak: 0,
  checkIns: {},
  badges: [],
  consentGiven: false,
  onboardingComplete: false,
  personalInfo: {
    fullName: '',
    gender: '',
    birthDate: '',
    phone: '',
    lineId: '',
    address: '',
    subdistrict: '',
    district: '',
    province: '',
    postalCode: '',
  },
  avatarConfig: {
    skinTone: 0,
    hairStyle: 0,
    hairColor: 0,
    outfit: 0,
    accessory: 0,
    background: 0,
  },
  notificationSettings: {
    dailyPrep: true,
    onDemandPrep: true,
    pepDaily: true,
    reminderTime: '09:00',
  },
};

const STORAGE_KEY = 'testd-user-data';

export function getUserData(): UserData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_DATA, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_DATA };
}

export function setUserData(data: Partial<UserData>): void {
  const current = getUserData();
  const updated = { ...current, ...data };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function addXP(amount: number): { newXP: number; newLevel: number; leveledUp: boolean } {
  const data = getUserData();
  const newXP = data.xp + amount;
  const xpPerLevel = 100;
  const newLevel = Math.floor(newXP / xpPerLevel) + 1;
  const leveledUp = newLevel > data.level;
  
  setUserData({ xp: newXP, level: newLevel });
  
  return { newXP, newLevel, leveledUp };
}

export function recordCheckIn(date: string, status: 'taken' | 'skipped'): void {
  const data = getUserData();
  const checkIns = { ...data.checkIns, [date]: status };
  
  // Calculate streak
  let streak = 0;
  if (status === 'taken') {
    const today = new Date();
    let checkDate = new Date(date);
    
    while (checkIns[checkDate.toISOString().split('T')[0]] === 'taken') {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  
  setUserData({ checkIns, streak });
  
  // Award XP
  if (status === 'taken') {
    addXP(10);
  }
}

export function addBadge(badge: string): void {
  const data = getUserData();
  if (!data.badges.includes(badge)) {
    setUserData({ badges: [...data.badges, badge] });
  }
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function getPEPDay(): number {
  const data = getUserData();
  if (!data.pepStartDate) return 0;
  
  const start = new Date(data.pepStartDate);
  const today = new Date();
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.min(diffDays, 28);
}

export function getXPForLevel(level: number): { current: number; required: number } {
  const data = getUserData();
  const xpPerLevel = 100;
  const currentLevelXP = data.xp % xpPerLevel;
  return { current: currentLevelXP, required: xpPerLevel };
}

export function resetUserData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
