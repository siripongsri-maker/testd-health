import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  variant?: "xp" | "streak" | "level" | "default";
  className?: string;
}

const variantStyles = {
  xp: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30",
  streak: "bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border-rose-200/50 dark:border-rose-800/30",
  level: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200/50 dark:border-violet-800/30",
  default: "bg-card border-border",
};

const iconStyles = {
  xp: "text-amber-500 dark:text-amber-400",
  streak: "text-rose-500 dark:text-rose-400",
  level: "text-violet-500 dark:text-violet-400",
  default: "text-primary",
};

const valueStyles = {
  xp: "text-amber-700 dark:text-amber-300",
  streak: "text-rose-700 dark:text-rose-300",
  level: "text-violet-700 dark:text-violet-300",
  default: "text-foreground",
};

export function StatCard({ icon: Icon, label, value, variant = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200 hover:shadow-md",
        variantStyles[variant],
        className
      )}
    >
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl",
        variant === "xp" && "bg-amber-100 dark:bg-amber-900/50",
        variant === "streak" && "bg-rose-100 dark:bg-rose-900/50",
        variant === "level" && "bg-violet-100 dark:bg-violet-900/50",
        variant === "default" && "bg-primary/10"
      )}>
        <Icon className={cn("h-5 w-5", iconStyles[variant])} />
      </div>
      <span className={cn("text-2xl font-bold", valueStyles[variant])}>{value}</span>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
