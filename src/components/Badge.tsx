import { cn } from "@/lib/utils";
import { LucideIcon, Award } from "lucide-react";

interface BadgeProps {
  icon?: LucideIcon;
  name: string;
  earned?: boolean;
  className?: string;
}

export function BadgeComponent({ icon: Icon = Award, name, earned = false, className }: BadgeProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
        earned
          ? "border-primary/30 bg-primary/10 shadow-card"
          : "border-border bg-muted/50 opacity-50",
        className
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          earned ? "gradient-primary" : "bg-muted"
        )}
      >
        <Icon className={cn("h-6 w-6", earned ? "text-primary-foreground" : "text-muted-foreground")} />
      </div>
      <span className={cn("text-sm font-medium text-center", earned ? "text-foreground" : "text-muted-foreground")}>
        {name}
      </span>
    </div>
  );
}
