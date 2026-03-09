import { Heart, Sparkles } from 'lucide-react';
import { PreventionAvatar } from './PreventionAvatar';
import type { ResultData } from './types';
import { RESULT_DATA } from './types';

interface Props {
  result: ResultData;
}

export function CompatibilityCard({ result }: Props) {
  const compatible = RESULT_DATA[result.compatibleType];

  return (
    <div className="glass rounded-2xl p-5 space-y-4 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${compatible.gradient} opacity-[0.04]`} />
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-500" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            คุณอาจ Match ได้ดีกับ
          </p>
        </div>

        <div className="flex items-center gap-4">
          <PreventionAvatar resultType={result.compatibleType} size="sm" />
          <div className="flex-1 space-y-1">
            <p className="font-bold text-foreground">{compatible.title}</p>
            <p className="text-xs text-muted-foreground">{compatible.avatarName}</p>
          </div>
          <Sparkles className="h-5 w-5 text-primary/50" />
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">
          {result.compatibilityReason}
        </p>

        <p className="text-xs text-muted-foreground/70 italic text-center pt-1">
          "ต่างกันได้ แต่ไปกันได้ ถ้าสื่อสารกันดี"
        </p>
      </div>
    </div>
  );
}
