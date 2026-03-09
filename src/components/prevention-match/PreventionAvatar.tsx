import { Shield, Calendar, Pill, Star, Heart, BookOpen, Sparkles, Zap } from 'lucide-react';
import type { ResultType } from './types';

interface PreventionAvatarProps {
  resultType: ResultType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_CONFIG: Record<ResultType, {
  icons: typeof Shield[];
  bg: string;
  ring: string;
  glow: string;
}> = {
  smart_planner: {
    icons: [Shield, Calendar, Pill],
    bg: 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500',
    ring: 'ring-blue-400/40',
    glow: 'shadow-[0_0_40px_rgba(139,92,246,0.35)]',
  },
  social_explorer: {
    icons: [Star, Heart, Sparkles],
    bg: 'bg-gradient-to-br from-pink-500 via-orange-400 to-purple-500',
    ring: 'ring-pink-400/40',
    glow: 'shadow-[0_0_40px_rgba(236,72,153,0.35)]',
  },
  careful_learner: {
    icons: [BookOpen, Sparkles, Heart],
    bg: 'bg-gradient-to-br from-emerald-400 via-teal-400 to-violet-400',
    ring: 'ring-emerald-400/40',
    glow: 'shadow-[0_0_40px_rgba(52,211,153,0.35)]',
  },
  chill_adventurer: {
    icons: [Zap, Shield, Heart],
    bg: 'bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-500',
    ring: 'ring-orange-400/40',
    glow: 'shadow-[0_0_40px_rgba(251,146,60,0.35)]',
  },
};

const SIZES = {
  sm: { container: 'w-20 h-20', icon: 16, orbitSize: 'w-7 h-7', orbitRadius: 36 },
  md: { container: 'w-32 h-32', icon: 24, orbitSize: 'w-9 h-9', orbitRadius: 56 },
  lg: { container: 'w-44 h-44', icon: 32, orbitSize: 'w-11 h-11', orbitRadius: 76 },
};

export function PreventionAvatar({ resultType, size = 'md', className = '' }: PreventionAvatarProps) {
  const config = AVATAR_CONFIG[resultType];
  const s = SIZES[size];
  const MainIcon = config.icons[0];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Glow */}
      <div className={`absolute ${s.container} rounded-full ${config.bg} opacity-30 blur-xl animate-pulse`} />
      
      {/* Main circle */}
      <div className={`relative ${s.container} rounded-full ${config.bg} ${config.glow} ring-4 ${config.ring} flex items-center justify-center`}>
        <MainIcon className="text-white drop-shadow-lg" size={s.icon} strokeWidth={1.8} />
        
        {/* Orbiting icons */}
        {config.icons.slice(1).map((Icon, i) => {
          const angle = (i * 180) + 45;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * s.orbitRadius;
          const y = Math.sin(rad) * s.orbitRadius;
          return (
            <div
              key={i}
              className={`absolute ${s.orbitSize} rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30`}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <Icon className="text-white" size={s.icon * 0.5} strokeWidth={2} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
