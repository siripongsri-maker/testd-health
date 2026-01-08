import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IsometricBuildingProps {
  icon: ReactNode;
  name: string;
  description?: string;
  onClick: () => void;
  variant?: "default" | "featured" | "locked";
  glowing?: boolean;
  badge?: string | number;
  buildingColor?: string;
  roofColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function IsometricBuilding({
  icon,
  name,
  description,
  onClick,
  variant = "default",
  glowing = false,
  badge,
  buildingColor = "from-blue-100 to-blue-200",
  roofColor = "from-orange-400 to-orange-500",
  size = "md",
  className,
}: IsometricBuildingProps) {
  const sizeClasses = {
    sm: "w-20 h-24",
    md: "w-28 h-32",
    lg: "w-36 h-40",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center transition-all duration-300",
        "hover:scale-110 hover:-translate-y-2 active:scale-95",
        variant === "locked" && "opacity-60 cursor-not-allowed grayscale",
        glowing && "animate-pulse",
        className
      )}
      disabled={variant === "locked"}
    >
      {/* Glow effect for featured */}
      {variant === "featured" && (
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-accent/40 to-primary/40 blur-2xl animate-pulse" />
      )}
      
      {/* Badge */}
      {badge && (
        <div className="absolute -top-2 -right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground shadow-lg border-2 border-card animate-bounce">
          {badge}
        </div>
      )}

      {/* Building container */}
      <div className={cn("relative", sizeClasses[size])}>
        {/* Roof */}
        <div className={cn(
          "absolute -top-4 left-1/2 -translate-x-1/2 z-10",
          "w-0 h-0 border-l-[40px] border-r-[40px] border-b-[25px]",
          "border-l-transparent border-r-transparent",
          variant === "featured" 
            ? "border-b-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
            : "border-b-orange-400"
        )} />
        
        {/* Roof ridge detail */}
        <div className={cn(
          "absolute -top-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-20",
          variant === "featured" ? "bg-amber-300" : "bg-orange-300",
          "border-2 border-orange-500/50"
        )} />

        {/* Building body */}
        <div className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-20 rounded-xl",
          "bg-gradient-to-b shadow-lg",
          variant === "featured" 
            ? "from-amber-100 to-amber-200 border-2 border-amber-300" 
            : cn(buildingColor, "border-2 border-white/50"),
          "overflow-hidden"
        )}>
          {/* Windows */}
          <div className="absolute top-3 left-2 w-3 h-4 rounded-sm bg-sky-300/80 border border-sky-400" />
          <div className="absolute top-3 right-2 w-3 h-4 rounded-sm bg-sky-300/80 border border-sky-400" />
          
          {/* Door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-8 rounded-t-lg bg-amber-700 border-2 border-amber-800">
            <div className="absolute top-3 right-1 w-1 h-1 rounded-full bg-amber-400" />
          </div>
        </div>

        {/* Icon display area */}
        <div className={cn(
          "absolute top-6 left-1/2 -translate-x-1/2 z-10",
          "w-12 h-12 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br from-white/90 to-white/70 shadow-lg",
          "border-2 border-white/80 backdrop-blur-sm",
          "group-hover:scale-110 transition-transform"
        )}>
          <div className={cn(
            "h-7 w-7",
            variant === "featured" ? "text-amber-600" : "text-primary"
          )}>
            {icon}
          </div>
        </div>
      </div>

      {/* Ground shadow */}
      <div className="w-16 h-3 bg-black/10 rounded-full blur-sm -mt-1" />

      {/* Name label */}
      <div className={cn(
        "mt-2 px-3 py-1 rounded-full text-xs font-bold",
        "bg-card/95 shadow-md border border-border/50 backdrop-blur-sm",
        "max-w-[100px] truncate text-center"
      )}>
        {name}
      </div>

      {/* Description tooltip on hover */}
      {description && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="px-2 py-1 rounded-lg bg-foreground/90 text-background text-[10px] whitespace-nowrap">
            {description}
          </div>
        </div>
      )}
    </button>
  );
}