import { cn } from "@/lib/utils";

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
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-level">Level {level}</span>
          <span className="text-muted-foreground">{current} / {required} XP</span>
        </div>
      )}
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full gradient-xp rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
