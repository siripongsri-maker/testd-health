import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TownBuildingProps {
  icon: ReactNode;
  name: string;
  description?: string;
  onClick: () => void;
  variant?: "default" | "featured" | "locked";
  glowing?: boolean;
  badge?: string | number;
  className?: string;
}

export function TownBuilding({
  icon,
  name,
  description,
  onClick,
  variant = "default",
  glowing = false,
  badge,
  className,
}: TownBuildingProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center p-4 rounded-2xl transition-all duration-300",
        "hover:scale-105 active:scale-95",
        variant === "default" && "bg-card/80 border-2 border-border hover:border-primary/50 shadow-card",
        variant === "featured" && "bg-gradient-to-br from-accent/20 to-primary/20 border-2 border-accent shadow-lg hover:shadow-xl",
        variant === "locked" && "bg-muted/50 border-2 border-border/50 opacity-60 cursor-not-allowed",
        glowing && "animate-glow",
        className
      )}
      disabled={variant === "locked"}
    >
      {/* Roof decoration */}
      <div className={cn(
        "absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0",
        "border-l-[20px] border-r-[20px] border-b-[15px]",
        "border-l-transparent border-r-transparent",
        variant === "featured" ? "border-b-accent" : "border-b-primary/60"
      )} />
      
      {/* Badge */}
      {badge && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-md">
          {badge}
        </div>
      )}
      
      {/* Icon */}
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-xl mb-2 transition-transform group-hover:scale-110",
        variant === "featured" ? "bg-accent/20" : "bg-primary/10",
      )}>
        <div className={cn(
          "h-8 w-8",
          variant === "featured" ? "text-accent" : "text-primary"
        )}>
          {icon}
        </div>
      </div>
      
      {/* Name */}
      <span className={cn(
        "text-sm font-bold text-center",
        variant === "locked" ? "text-muted-foreground" : "text-foreground"
      )}>
        {name}
      </span>
      
      {/* Description */}
      {description && (
        <span className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
          {description}
        </span>
      )}
    </button>
  );
}
