import { cn } from "@/lib/utils";
import { LucideIcon, Award, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeProps {
  icon?: LucideIcon;
  name: string;
  description?: string;
  earned?: boolean;
  className?: string;
}

export function BadgeComponent({ icon: Icon = Award, name, description, earned = false, className }: BadgeProps) {
  const badgeContent = (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all relative",
        earned
          ? "border-primary/30 bg-primary/10 shadow-card"
          : "border-border bg-muted/50 opacity-60",
        className
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full relative",
          earned ? "gradient-primary" : "bg-muted"
        )}
      >
        <Icon className={cn("h-6 w-6", earned ? "text-primary-foreground" : "text-muted-foreground")} />
        {!earned && (
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-muted-foreground/20 flex items-center justify-center">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className={cn("text-xs font-medium text-center leading-tight", earned ? "text-foreground" : "text-muted-foreground")}>
        {name}
      </span>
      {earned && (
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
          <span className="text-[10px] text-white">✓</span>
        </div>
      )}
    </div>
  );

  if (description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}
