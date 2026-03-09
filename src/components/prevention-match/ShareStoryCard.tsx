import { Shield, CheckCircle } from 'lucide-react';
import { PreventionAvatar } from './PreventionAvatar';
import type { ResultData } from './types';

interface Props {
  result: ResultData;
}

const THEME_BG: Record<string, string> = {
  smart_planner: 'from-slate-900 via-blue-900 to-purple-900',
  social_explorer: 'from-rose-900 via-pink-900 to-purple-900',
  careful_learner: 'from-emerald-900 via-teal-900 to-slate-900',
  chill_adventurer: 'from-orange-900 via-rose-900 to-slate-900',
};

export function ShareStoryCard({ result }: Props) {
  return (
    <div className="mx-auto" style={{ width: 320, aspectRatio: '9/16' }}>
      <div className={`relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-b ${THEME_BG[result.type]} p-6 flex flex-col justify-between`}>
        {/* Decorative circles */}
        <div className="absolute top-10 right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-20 left-6 w-24 h-24 rounded-full bg-white/5 blur-xl" />

        {/* Top - branding */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-white/70 text-xs font-medium tracking-wider">testD</span>
          <span className="text-white/40 text-[10px]">•</span>
          <span className="text-white/50 text-[10px]">Prevention Match</span>
        </div>

        {/* Middle - result */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-5">
          <PreventionAvatar resultType={result.type} size="md" />
          
          <div className="text-center space-y-2">
            <p className="text-white/60 text-xs tracking-widest uppercase">Your Prevention Style</p>
            <h2 className="text-2xl font-bold text-white">{result.title}</h2>
            <p className="text-white/50 text-xs font-medium">{result.avatarName}</p>
          </div>

          <p className="text-white/70 text-sm text-center leading-relaxed max-w-[240px]">
            {result.description}
          </p>
        </div>

        {/* Bottom - tips */}
        <div className="relative z-10 space-y-3">
          <div className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-white/80 text-xs leading-snug">{rec}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 text-center space-y-1">
            <p className="text-white/50 text-[10px]">Discover your prevention style on testD</p>
            <p className="text-white/30 text-[10px]">#testD #PreventionMatch</p>
          </div>
        </div>
      </div>
    </div>
  );
}
