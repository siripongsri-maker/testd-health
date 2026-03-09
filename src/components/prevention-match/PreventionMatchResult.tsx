import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, TestTube, BookOpen, Share2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreventionAvatar } from './PreventionAvatar';
import { ShareStoryCard } from './ShareStoryCard';
import { CompatibilityCard } from './CompatibilityCard';
import { DatingStyleCard } from './DatingStyleCard';
import { PreventionMatchQrCard } from './PreventionMatchQrCard';
import { BrandHeader } from './BrandHeader';
import { useCelebration } from '@/hooks/useCelebration';
import { trackEvent } from '@/hooks/useAnalytics';
import type { ResultData } from './types';

interface Props {
  result: ResultData;
  onRetake: () => void;
  userPhoto?: string | null;
}

export function PreventionMatchResult({ result, onRetake, userPhoto }: Props) {
  const navigate = useNavigate();
  const { celebrateAchievement } = useCelebration();
  const [showStory, setShowStory] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealed(true);
      celebrateAchievement();
    }, 400);
    trackEvent('prevention_match_result_viewed');
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen px-4 py-8 space-y-6">
      {/* Result card */}
      <div className={`
        w-full max-w-md mx-auto glass rounded-3xl p-6 space-y-6 relative overflow-hidden
        transition-all duration-700 ease-out
        ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}>
        {/* Background gradient decoration */}
        <div className={`absolute inset-0 bg-gradient-to-br ${result.gradient} opacity-[0.07]`} />

        <div className="relative z-10 space-y-6">
          {/* Branding */}
          <BrandHeader size="md" />

          {/* Eyebrow */}
          <div className={`text-center transition-all duration-500 delay-100 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
            <span className="inline-block text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/60 bg-muted/40 px-3 py-1 rounded-full">
              Your Prevention Style
            </span>
          </div>

          {/* Avatar + optional photo */}
          <div className={`flex justify-center transition-all duration-700 delay-200 ${revealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <div className="relative">
              {userPhoto && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-[3px] ring-white/60 shadow-xl">
                    <img src={userPhoto} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <PreventionAvatar resultType={result.type} size="lg" />
            </div>
          </div>

          {/* Type + description */}
          <div className={`text-center space-y-3 transition-all duration-500 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              {result.title}
            </h1>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">
              {result.avatarName}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed max-w-[280px] mx-auto">
              {result.description}
            </p>
          </div>

          {/* Tagline */}
          <div className={`text-center transition-all duration-500 delay-[400ms] ${revealed ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-xs italic text-muted-foreground/70 bg-muted/30 inline-block px-4 py-2 rounded-full">
              "{result.avatarTagline}"
            </p>
          </div>

          {/* Recommendations */}
          <div className={`space-y-2 transition-all duration-500 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] mb-3">
              คำแนะนำสำหรับคุณ
            </p>
            {result.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <span className="text-sm font-medium text-foreground">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dating Style Card */}
      <div className={`w-full max-w-md mx-auto transition-all duration-500 delay-600 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <DatingStyleCard result={result} />
      </div>

      {/* Compatibility Card */}
      <div className={`w-full max-w-md mx-auto transition-all duration-500 delay-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <CompatibilityCard result={result} />
      </div>

      {/* QR Code */}
      <div className={`w-full max-w-md mx-auto glass rounded-2xl p-5 transition-all duration-500 delay-[800ms] ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        <PreventionMatchQrCard size={80} />
      </div>

      {/* CTAs */}
      <div className={`w-full max-w-md mx-auto space-y-2.5 pt-2 transition-all duration-500 delay-[900ms] ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        <Button className="w-full rounded-xl h-11" onClick={() => navigate('/hiv-selftest')}>
          <TestTube className="h-4 w-4 mr-2" />
          ดูบริการตรวจ
        </Button>
        <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => navigate('/info')}>
          <BookOpen className="h-4 w-4 mr-2" />
          เรียนรู้เรื่อง PrEP
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            className="rounded-xl h-11"
            onClick={() => {
              setShowStory(!showStory);
              if (!showStory) trackEvent('prevention_match_story_opened');
            }}
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            แชร์ผลลัพธ์
          </Button>
          <Button variant="ghost" className="rounded-xl h-11" onClick={onRetake}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            ทำใหม่อีกครั้ง
          </Button>
        </div>
      </div>

      {/* Share Story preview */}
      {showStory && (
        <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in">
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Story Preview</p>
            <p className="text-xs text-muted-foreground">บันทึกเป็นรูปภาพเพื่อแชร์ใน IG Story</p>
          </div>
          <ShareStoryCard result={result} userPhoto={userPhoto} />
        </div>
      )}
    </div>
  );
}
