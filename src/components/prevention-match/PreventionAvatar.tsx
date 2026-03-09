import { Shield, Calendar, Pill, Star, Heart, BookOpen, Sparkles, Zap, Leaf } from 'lucide-react';
import type { ResultType } from './types';

interface PreventionAvatarProps {
  resultType: ResultType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AVATAR_CONFIG: Record<ResultType, {
  mainIcon: typeof Shield;
  orbitIcons: typeof Shield[];
  bg: string;
  ring: string;
  glow: string;
  innerGlow: string;
  sparkleColor: string;
}> = {
  smart_planner: {
    mainIcon: Shield,
    orbitIcons: [Calendar, Pill, Sparkles],
    bg: 'bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500',
    ring: 'ring-blue-400/50',
    glow: 'shadow-[0_0_60px_rgba(139,92,246,0.5)]',
    innerGlow: 'from-blue-400/30 via-transparent to-violet-400/20',
    sparkleColor: 'text-blue-200',
  },
  social_explorer: {
    mainIcon: Star,
    orbitIcons: [Heart, Sparkles, Star],
    bg: 'bg-gradient-to-br from-pink-500 via-rose-400 to-orange-400',
    ring: 'ring-pink-400/50',
    glow: 'shadow-[0_0_60px_rgba(236,72,153,0.5)]',
    innerGlow: 'from-pink-400/30 via-transparent to-orange-400/20',
    sparkleColor: 'text-pink-200',
  },
  careful_learner: {
    mainIcon: BookOpen,
    orbitIcons: [Leaf, Sparkles, Heart],
    bg: 'bg-gradient-to-br from-emerald-400 via-teal-400 to-violet-400',
    ring: 'ring-emerald-400/50',
    glow: 'shadow-[0_0_60px_rgba(52,211,153,0.5)]',
    innerGlow: 'from-emerald-400/30 via-transparent to-teal-400/20',
    sparkleColor: 'text-emerald-200',
  },
  chill_adventurer: {
    mainIcon: Zap,
    orbitIcons: [Shield, Heart, Sparkles],
    bg: 'bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-500',
    ring: 'ring-orange-400/50',
    glow: 'shadow-[0_0_60px_rgba(251,146,60,0.5)]',
    innerGlow: 'from-orange-400/30 via-transparent to-rose-400/20',
    sparkleColor: 'text-orange-200',
  },
};

const SIZES = {
  sm: { container: 80, icon: 20, orbitIcon: 12, orbitRadius: 46, sparkleSize: 8 },
  md: { container: 128, icon: 32, orbitIcon: 14, orbitRadius: 72, sparkleSize: 10 },
  lg: { container: 176, icon: 44, orbitIcon: 18, orbitRadius: 100, sparkleSize: 14 },
};

const SPARKLE_POSITIONS = [
  { angle: 30, dist: 0.85 },
  { angle: 110, dist: 0.92 },
  { angle: 200, dist: 0.78 },
  { angle: 290, dist: 0.88 },
  { angle: 160, dist: 0.95 },
  { angle: 340, dist: 0.82 },
];

export function PreventionAvatar({ resultType, size = 'md', className = '' }: PreventionAvatarProps) {
  const config = AVATAR_CONFIG[resultType];
  const s = SIZES[size];
  const MainIcon = config.mainIcon;
  const half = s.container / 2;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: s.container + 40, height: s.container + 40 }}>
      {/* Outer glow pulse */}
      <div
        className={`absolute rounded-full ${config.bg} opacity-20 blur-2xl animate-pulse`}
        style={{ width: s.container + 30, height: s.container + 30 }}
      />

      {/* Sparkle dots */}
      {SPARKLE_POSITIONS.map((sp, i) => {
        const rad = (sp.angle * Math.PI) / 180;
        const dist = (s.container / 2 + 16) * sp.dist;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        return (
          <div
            key={i}
            className={`absolute ${config.sparkleColor} animate-pulse`}
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${1.5 + i * 0.2}s`,
            }}
          >
            <Sparkles size={s.sparkleSize} strokeWidth={2.5} />
          </div>
        );
      })}

      {/* Orbit ring */}
      <div
        className="absolute rounded-full border border-white/10"
        style={{ width: s.orbitRadius * 2 + 8, height: s.orbitRadius * 2 + 8 }}
      />

      {/* Orbiting icons */}
      {config.orbitIcons.map((Icon, i) => {
        const angle = (i * 120) + 30;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * s.orbitRadius;
        const y = Math.sin(rad) * s.orbitRadius;
        const orbSize = s.orbitIcon * 2.2;
        return (
          <div
            key={i}
            className="absolute rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-lg"
            style={{
              width: orbSize,
              height: orbSize,
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            <Icon className="text-white drop-shadow-sm" size={s.orbitIcon} strokeWidth={2} />
          </div>
        );
      })}

      {/* Main circle */}
      <div
        className={`relative rounded-full ${config.bg} ${config.glow} ring-[3px] ${config.ring} flex items-center justify-center overflow-hidden`}
        style={{ width: s.container, height: s.container }}
      >
        {/* Inner radial glow */}
        <div className={`absolute inset-0 bg-gradient-radial ${config.innerGlow}`} />
        {/* Glossy top highlight */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-white/20 rounded-full blur-sm"
          style={{ width: s.container * 0.6, height: s.container * 0.3 }}
        />
        <MainIcon className="text-white drop-shadow-lg relative z-10" size={s.icon} strokeWidth={1.5} />
      </div>
    </div>
  );
}
