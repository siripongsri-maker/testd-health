import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, TestTube, BookOpen, Share2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreventionAvatar } from './PreventionAvatar';
import { ShareStoryCard } from './ShareStoryCard';
import { useCelebration } from '@/hooks/useCelebration';
import type { ResultData } from './types';

interface Props {
  result: ResultData;
  onRetake: () => void;
}

export function PreventionMatchResult({ result, onRetake }: Props) {
  const navigate = useNavigate();
  const { celebrateAchievement } = useCelebration();
  const [showStory, setShowStory] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealed(true);
      celebrateAchievement();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen px-4 py-8 space-y-8">
      {/* Result card */}
      <div className={`
        w-full max-w-md mx-auto glass rounded-3xl p-6 space-y-6 relative overflow-hidden
        transition-all duration-700 ease-out
        ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
      `}>
        {/* Background gradient decoration */}
        <div className={`absolute inset-0 bg-gradient-to-br ${result.gradient} opacity-[0.07]`} />

        <div className="relative z-10 space-y-6">
          {/* Avatar */}
          <div className={`flex justify-center transition-all duration-700 delay-200 ${revealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
            <PreventionAvatar resultType={result.type} size="lg" />
          </div>

          {/* Type + description */}
          <div className={`text-center space-y-2 transition-all duration-500 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-xs text-muted-foreground tracking-widest uppercase">Your Prevention Style</p>
            <h1 className="text-2xl font-bold text-foreground">{result.title}</h1>
            <p className="text-sm text-muted-foreground font-medium">{result.avatarName}</p>
            <p className="text-sm text-foreground/80 leading-relaxed pt-1">{result.description}</p>
          </div>

          {/* Tagline */}
          <div className={`text-center transition-all duration-500 delay-400 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-xs italic text-muted-foreground">"{result.avatarTagline}"</p>
          </div>

          {/* Recommendations */}
          <div className={`space-y-2.5 transition-all duration-500 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">คำแนะนำสำหรับคุณ</p>
            {result.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50"
                style={{ animationDelay: `${600 + i * 100}ms` }}
              >
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{rec}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className={`space-y-2.5 pt-2 transition-all duration-500 delay-700 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
            <Button
              className="w-full rounded-xl h-11"
              onClick={() => navigate('/hiv-selftest')}
            >
              <TestTube className="h-4 w-4 mr-2" />
              ดูบริการตรวจ
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl h-11"
              onClick={() => navigate('/info')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              เรียนรู้เรื่อง PrEP
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="outline"
                className="rounded-xl h-11"
                onClick={() => setShowStory(!showStory)}
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                แชร์ผลลัพธ์
              </Button>
              <Button
                variant="ghost"
                className="rounded-xl h-11"
                onClick={onRetake}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                ทำใหม่อีกครั้ง
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Story preview */}
      {showStory && (
        <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in">
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Story Preview</p>
            <p className="text-xs text-muted-foreground">Screenshot เพื่อแชร์ใน IG Story</p>
          </div>
          <ShareStoryCard result={result} />
        </div>
      )}
    </div>
  );
}
