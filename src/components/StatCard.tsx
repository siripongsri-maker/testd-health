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
  xp: "border-xp/30 bg-xp/10",
  streak: "border-streak/30 bg-streak/10",
  level: "border-level/30 bg-level/10",
  default: "border-border bg-card",
};

const iconStyles = {
  xp: "text-xp",
  streak: "text-streak",
  level: "text-level",
  default: "text-primary",
};

export function StatCard({ icon: Icon, label, value, variant = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border-2 p-3 shadow-card",
        variantStyles[variant],
        className
      )}
    >
      <Icon className={cn("h-5 w-5", iconStyles[variant])} />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
