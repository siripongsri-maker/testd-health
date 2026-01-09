import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface XPBarProps {
  current: number;
  required: number;
  level: number;
  className?: string;
  showLabel?: boolean;
}

export function XPBar({ current, required, level, className, showLabel = true }: XPBarProps) {
  const percentage = Math.min((current / required) * 100, 100);
  
  return (
    <div className={cn("space-y-3", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
              <Star className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Level {level}</span>
          </div>
          <span className="text-sm text-muted-foreground font-medium">{current} / {required} XP</span>
        </div>
      )}
      <div className="h-3 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
