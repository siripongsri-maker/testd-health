import { useRef, useCallback } from 'react';
import { CheckCircle, Heart, Sparkles, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { PreventionAvatar } from './PreventionAvatar';
import { Button } from '@/components/ui/button';
import type { ResultData } from './types';
import { RESULT_DATA } from './types';
import testdLogo from '@/assets/testd-logo.png';
import swingLogo from '@/assets/swing-logo.png';

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

const THEME_ACCENT: Record<string, string> = {
  smart_planner: 'from-blue-500/20 to-violet-500/20',
  social_explorer: 'from-pink-500/20 to-orange-500/20',
  careful_learner: 'from-emerald-500/20 to-teal-500/20',
  chill_adventurer: 'from-orange-500/20 to-rose-500/20',
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
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `testd-prevention-match-${result.type}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    }
  }, [result.type]);

  return (
    <div className="space-y-3">
      {/* Export frame */}
      <div
        ref={cardRef}
        className="mx-auto"
        style={{ width: 360, height: 640 }}
      >
        <div
          className={`w-full h-full bg-gradient-to-b ${THEME_BG[result.type]} p-8 flex flex-col gap-3`}
          style={{ borderRadius: 24 }}
        >
          {/* Decorative blobs (inside safe area) */}
          <div className="absolute top-20 right-10 w-32 h-32 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />

          {/* === TOP — testD only === */}
          <div className="flex items-center justify-between shrink-0">
            <img src={testdLogo} alt="testD" className="h-7 object-contain brightness-200" />
            <div className="flex items-center gap-1 text-white/30">
              <Sparkles className="h-3 w-3" />
              <span className="text-[8px] tracking-[0.15em] uppercase font-medium">Prevention Match</span>
            </div>
          </div>

          {/* === HERO — Avatar + Title === */}
          <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
            <span className="text-white/35 text-[8px] tracking-[0.25em] uppercase font-semibold">
              Your Prevention Style
            </span>
            <div className="relative">
              {userPhoto && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/50 shadow-lg">
                    <img src={userPhoto} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <PreventionAvatar resultType={result.type} size="sm" />
            </div>
            <h2 className="text-[28px] font-extrabold text-white leading-none tracking-tight text-center">
              {result.title}
            </h2>
            <p className="text-white/35 text-[9px] tracking-[0.2em] uppercase font-semibold">
              {result.avatarName}
            </p>
          </div>

          {/* === BENTO GRID === */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            {/* Tips block */}
            <div className={`bg-gradient-to-br ${THEME_ACCENT[result.type]} rounded-2xl p-3 space-y-1.5 backdrop-blur-sm border border-white/[0.06]`}>
              <p className="text-white/40 text-[7px] tracking-[0.2em] uppercase font-bold">Prevention Tips</p>
              {result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="text-white/70 text-[10px] leading-snug">{rec}</span>
                </div>
              ))}
            </div>

            {/* Dating + Match row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Dating style */}
              <div className="bg-white/[0.06] rounded-2xl p-3 border border-white/[0.06]">
                <p className="text-white/40 text-[7px] tracking-[0.2em] uppercase font-bold mb-1.5">Dating Style</p>
                <div className="flex items-start gap-1.5">
                  <Heart className="h-3 w-3 text-pink-400 shrink-0 mt-0.5" />
                  <span className="text-white/65 text-[9px] leading-snug">{DATING_VIBE[result.type]}</span>
                </div>
              </div>
              {/* Best match */}
              <div className="bg-white/[0.06] rounded-2xl p-3 border border-white/[0.06]">
                <p className="text-white/40 text-[7px] tracking-[0.2em] uppercase font-bold mb-1.5">Best Match</p>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />
                  <span className="text-white/75 text-[11px] font-bold leading-tight">{compatible.title}</span>
                </div>
                <p className="text-white/35 text-[8px] mt-1">{compatible.avatarName}</p>
              </div>
            </div>
          </div>

          {/* === FOOTER — QR + SWING === */}
          <div className="shrink-0 flex items-end gap-3 pt-1">
            {/* QR block */}
            <div className="bg-white rounded-xl p-2 shadow-lg shrink-0">
              <QRCodeSVG
                value={getQuizUrl()}
                size={64}
                level="M"
                bgColor="#ffffff"
                fgColor="#1a1a2e"
              />
            </div>
            {/* Text + SWING */}
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-white/50 text-[9px] font-medium leading-tight">
                  Scan to discover your prevention style
                </p>
                <p className="text-white/25 text-[7px] mt-0.5">#testD #PreventionMatch</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white/20 text-[8px]">powered by</span>
                <img src={swingLogo} alt="SWING" className="h-4 object-contain brightness-200 opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-2"
          onClick={handleSave}
        >
          <Download className="h-4 w-4" />
          Save Story Card
        </Button>
      </div>
    </div>
  );
}
