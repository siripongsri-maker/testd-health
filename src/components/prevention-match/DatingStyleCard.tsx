import { Heart, Users } from 'lucide-react';
import type { ResultData } from './types';

interface Props {
  result: ResultData;
}

export function DatingStyleCard({ result }: Props) {
  return (
    <div className="space-y-4">
      {/* Dating behavior */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center">
            <Heart className="h-3 w-3 text-pink-500" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">
            สไตล์การเดทของคุณ
          </p>
        </div>
        <div className="space-y-2">
          {result.datingBehavior.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/25 border border-border/30">
              <span className="text-pink-400 text-sm">♡</span>
              <span className="text-sm font-medium text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Partner preference */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Users className="h-3 w-3 text-purple-500" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">
            คนที่เข้ากับคุณ
          </p>
        </div>
        <div className="space-y-2">
          {result.partnerPreference.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/25 border border-border/30">
              <span className="text-purple-400 text-sm">✦</span>
              <span className="text-sm font-medium text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
