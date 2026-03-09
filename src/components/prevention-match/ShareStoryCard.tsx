import { Shield, CheckCircle, Heart } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PreventionAvatar } from './PreventionAvatar';
import type { ResultData } from './types';
import { RESULT_DATA } from './types';
import testdLogo from '@/assets/testd-logo.png';
import swingLogo from '@/assets/swing-logo.webp';

interface Props {
  result: ResultData;
  userPhoto?: string | null;
}

const THEME_BG: Record<string, string> = {
  smart_planner: 'from-slate-900 via-blue-900 to-purple-900',
  social_explorer: 'from-rose-900 via-pink-900 to-purple-900',
  careful_learner: 'from-emerald-900 via-teal-900 to-slate-900',
  chill_adventurer: 'from-orange-900 via-rose-900 to-slate-900',
};

const DATING_VIBE: Record<string, string> = {
  smart_planner: 'You like clarity and trust.',
  social_explorer: 'You vibe with openness and fun.',
  careful_learner: 'You value comfort and care.',
  chill_adventurer: 'You ride the vibe, your way.',
};

function getQuizUrl() {
  return typeof window !== 'undefined' ? `${window.location.origin}/prevention-match` : 'https://testd-health.lovable.app/prevention-match';
}

export function ShareStoryCard({ result, userPhoto }: Props) {
  const compatible = RESULT_DATA[result.compatibleType];

  return (
    <div className="mx-auto" style={{ width: 320, aspectRatio: '9/16' }}>
      <div className={`relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-b ${THEME_BG[result.type]} p-5 flex flex-col justify-between`}>
        {/* Decorative circles */}
        <div className="absolute top-10 right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-20 left-6 w-24 h-24 rounded-full bg-white/5 blur-xl" />

        {/* Top - branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={testdLogo} alt="testD" className="h-5 object-contain brightness-200" />
            <span className="text-white/30 text-[10px]">×</span>
            <img src={swingLogo} alt="SWING" className="h-5 object-contain brightness-200" />
          </div>
          <span className="text-white/40 text-[9px]">Prevention Match</span>
        </div>

        {/* Middle - result */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase">Your Prevention Style</p>

          <div className="relative">
            {userPhoto && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/40">
                  <img src={userPhoto} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <PreventionAvatar resultType={result.type} size="md" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-white">{result.title}</h2>
            <p className="text-white/50 text-xs">{result.avatarName}</p>
          </div>

          <p className="text-white/60 text-xs text-center max-w-[220px]">
            {DATING_VIBE[result.type]}
          </p>

          {/* Compatible type */}
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <Heart className="h-3 w-3 text-pink-400" />
            <span className="text-white/80 text-[10px]">Best match: {compatible.title}</span>
          </div>
        </div>

        {/* Bottom - tips + QR */}
        <div className="relative z-10 space-y-3">
          <div className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-white/70 text-[10px] leading-snug">{rec}</span>
              </div>
            ))}
          </div>

          <div className="flex items-end justify-between pt-2 border-t border-white/10">
            <div className="space-y-1">
              <p className="text-white/40 text-[9px]">Scan to discover your style</p>
              <p className="text-white/25 text-[8px]">#testD #PreventionMatch</p>
            </div>
            <div className="bg-white rounded-lg p-1.5">
              <QRCodeSVG value={getQuizUrl()} size={44} level="M" bgColor="#ffffff" fgColor="#1a1a2e" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
