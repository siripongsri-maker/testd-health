import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'casual' | 'pride' | 'lesbian' | 'youth';

interface ThemeState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'casual',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'testd-theme',
    }
  )
);

export const themeConfig: Record<ThemeType, {
  name: string;
  nameTh: string;
  primary: string;
  accent: string;
  background: string;
  gradientHero: string;
  gradientPrimary: string;
  pattern: string;
}> = {
  casual: {
    name: 'Casual',
    nameTh: 'ทั่วไป',
    primary: '174 58% 39%',
    accent: '16 85% 66%',
    background: '180 20% 98%',
    gradientHero: 'linear-gradient(180deg, hsl(180 20% 98%) 0%, hsl(174 30% 95%) 100%)',
    gradientPrimary: 'linear-gradient(135deg, hsl(174 58% 39%) 0%, hsl(180 50% 50%) 100%)',
    pattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314a8a8' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
  pride: {
    name: 'Pride',
    nameTh: 'ไพรด์',
    primary: '280 70% 50%',
    accent: '45 100% 55%',
    background: '280 30% 98%',
    gradientHero: 'linear-gradient(180deg, hsl(350 100% 95%) 0%, hsl(45 100% 95%) 25%, hsl(120 60% 95%) 50%, hsl(200 100% 95%) 75%, hsl(280 70% 95%) 100%)',
    gradientPrimary: 'linear-gradient(135deg, hsl(350 80% 60%) 0%, hsl(45 100% 55%) 25%, hsl(120 60% 50%) 50%, hsl(200 100% 50%) 75%, hsl(280 70% 55%) 100%)',
    pattern: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239333ea' fill-opacity='0.06'%3E%3Cpath d='M40 40c0-11.046-8.954-20-20-20S0 28.954 0 40s8.954 20 20 20 20-8.954 20-20zm40 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
  lesbian: {
    name: 'Sapphic',
    nameTh: 'แซฟฟิก',
    primary: '330 70% 50%',
    accent: '15 90% 65%',
    background: '330 30% 98%',
    gradientHero: 'linear-gradient(180deg, hsl(15 80% 95%) 0%, hsl(330 60% 95%) 50%, hsl(280 50% 95%) 100%)',
    gradientPrimary: 'linear-gradient(135deg, hsl(15 90% 65%) 0%, hsl(330 70% 55%) 50%, hsl(280 60% 50%) 100%)',
    pattern: `url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ec4899' fill-opacity='0.06'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
  youth: {
    name: 'Youth',
    nameTh: 'วัยรุ่น',
    primary: '200 100% 50%',
    accent: '160 84% 45%',
    background: '200 40% 98%',
    gradientHero: 'linear-gradient(180deg, hsl(200 50% 97%) 0%, hsl(160 40% 95%) 100%)',
    gradientPrimary: 'linear-gradient(135deg, hsl(200 100% 50%) 0%, hsl(160 84% 45%) 100%)',
    pattern: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%230ea5e9' fill-opacity='0.06' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
  },
};
