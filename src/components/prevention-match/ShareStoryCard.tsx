import { CheckCircle, Heart, Sparkles } from 'lucide-react';
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
  smart_planner: 'from-slate-950 via-blue-950 to-violet-950',
  social_explorer: 'from-rose-950 via-pink-950 to-purple-950',
  careful_learner: 'from-emerald-950 via-teal-950 to-slate-950',
  chill_adventurer: 'from-orange-950 via-rose-950 to-slate-950',
};

const DATING_VIBE: Record<string, string> = {
  smart_planner: 'You like clarity, trust, and intentional connection.',
  social_explorer: 'You enjoy open energy, new connections, and easy conversation.',
  careful_learner: 'You open up gently and value comfort, care, and emotional safety.',
  chill_adventurer: 'You follow the vibe, enjoy spontaneity, and like low-pressure connection.',
};

function getQuizUrl() {
  return typeof window !== 'undefined'
    ? `${window.location.origin}/prevention-match`
    : 'https://testd-health.lovable.app/prevention-match';
}

export function ShareStoryCard({ result, userPhoto }: Props) {
  const compatible = RESULT_DATA[result.compatibleType];

  return (
    <div className="mx-auto" style={{ width: 340, aspectRatio: '9/16' }}>
      <div
        className={`relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-b ${THEME_BG[result.type]} flex flex-col`}
      >
        {/* Decorative blobs */}
        <div className="absolute top-16 right-4 w-40 h-40 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute bottom-32 left-2 w-28 h-28 rounded-full bg-white/[0.04] blur-2xl" />

        {/* === TOP — Branding === */}
        <div className="relative z-10 px-5 pt-5 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 bg-white/[0.08] rounded-full px-3.5 py-1.5">
              <img src={testdLogo} alt="testD" className="h-6 object-contain brightness-200" />
              <span className="text-white/30 text-[10px] font-medium">×</span>
              <img src={swingLogo} alt="SWING" className="h-6 object-contain brightness-200" />
            </div>
            <div className="flex items-center gap-1 text-white/30">
              <Sparkles className="h-3 w-3" />
              <span className="text-[9px] tracking-wider uppercase">Prevention Match</span>
            </div>
          </div>
        </div>

        {/* === MIDDLE — Result === */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3 px-5">
          {/* Eyebrow */}
          <span className="text-white/40 text-[9px] tracking-[0.25em] uppercase font-semibold">
            Your Prevention Style
          </span>

          {/* Avatar */}
          <div className="relative my-1">
            {userPhoto && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-14 h-14 rounded-full overflow-hidden ring-[2.5px] ring-white/50 shadow-lg">
                  <img src={userPhoto} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <PreventionAvatar resultType={result.type} size="md" />
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-[26px] font-extrabold text-white leading-tight tracking-tight">
              {result.title}
            </h2>
            <p className="text-white/40 text-[10px] tracking-widest uppercase font-semibold">
              {result.avatarName}
            </p>
          </div>

          {/* Personality */}
          <p className="text-white/55 text-[11px] text-center max-w-[240px] leading-relaxed">
            {result.description}
          </p>

          {/* Dating vibe */}
          <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl px-3 py-2 mt-1">
            <Heart className="h-3 w-3 text-pink-400 shrink-0" />
            <span className="text-white/60 text-[10px] leading-snug">
              {DATING_VIBE[result.type]}
            </span>
          </div>

          {/* Best match */}
          <div className="flex items-center gap-1.5 bg-white/[0.08] rounded-full px-3 py-1.5">
            <Sparkles className="h-2.5 w-2.5 text-purple-400" />
            <span className="text-white/70 text-[10px] font-medium">
              Best match: {compatible.title}
            </span>
          </div>
        </div>

        {/* === BOTTOM — Tips + QR === */}
        <div className="relative z-10 px-5 pb-5 space-y-3">
          {/* Tips */}
          <div className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                </div>
                <span className="text-white/65 text-[10px] leading-snug">{rec}</span>
              </div>
            ))}
          </div>

          {/* QR + footer */}
          <div className="flex items-end justify-between pt-3 border-t border-white/[0.08]">
            <div className="space-y-1.5 flex-1">
              <p className="text-white/50 text-[9px] font-medium">
                Scan to discover your style
              </p>
              <p className="text-white/25 text-[8px]">#testD #PreventionMatch</p>
            </div>
            <div className="bg-white rounded-xl p-1.5 shadow-lg">
              <QRCodeSVG
                value={getQuizUrl()}
                size={48}
                level="M"
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
