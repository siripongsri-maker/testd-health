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
          <Heart className="h-4 w-4 text-pink-500" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            สไตล์การเดทของคุณ
          </p>
        </div>
        <div className="space-y-2">
          {result.datingBehavior.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/20">
              <span className="text-pink-400 text-sm mt-0.5">♡</span>
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Partner preference */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            คนที่เข้ากับคุณ
          </p>
        </div>
        <div className="space-y-2">
          {result.partnerPreference.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/20">
              <span className="text-purple-400 text-sm mt-0.5">✦</span>
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
