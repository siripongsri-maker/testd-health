import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { playBuildingTap, playBuildingHover } from "@/lib/sounds";

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
  size = "md",
  className,
}: IsometricBuildingProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  const sizeClasses = {
    sm: { container: "w-24", building: "w-16 h-16", icon: "w-10 h-10", iconInner: "h-5 w-5", roof: "border-l-[30px] border-r-[30px] border-b-[20px]", roofTop: "w-3 h-3 -top-4" },
    md: { container: "w-28", building: "w-20 h-20", icon: "w-12 h-12", iconInner: "h-6 w-6", roof: "border-l-[38px] border-r-[38px] border-b-[24px]", roofTop: "w-4 h-4 -top-5" },
    lg: { container: "w-36", building: "w-24 h-24", icon: "w-14 h-14", iconInner: "h-8 w-8", roof: "border-l-[46px] border-r-[46px] border-b-[28px]", roofTop: "w-5 h-5 -top-6" },
  };

  const sizes = sizeClasses[size];

  const handleClick = () => {
    if (variant === "locked") return;
    playBuildingTap();
    setIsPressed(true);
    setShowRipple(true);
    setTimeout(() => setIsPressed(false), 150);
    setTimeout(() => setShowRipple(false), 400);
    onClick();
  };

  const handleHover = () => {
    if (variant !== "locked") {
      playBuildingHover();
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleHover}
      className={cn(
        "group relative flex flex-col items-center transition-all duration-300 touch-manipulation",
        isPressed ? "scale-90" : "hover:scale-110 hover:-translate-y-3",
        "active:scale-95",
        variant === "locked" && "opacity-60 cursor-not-allowed grayscale",
        className
      )}
      disabled={variant === "locked"}
    >
      {/* Tap ripple effect */}
      {showRipple && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-full h-full rounded-full bg-white/40 animate-ping" />
        </div>
      )}

      {/* Glow effect for featured */}
      {variant === "featured" && (
        <>
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-amber-400/50 to-orange-400/50 blur-3xl animate-pulse scale-150" />
          <div className="absolute inset-0 -z-10 rounded-full bg-amber-300/30 blur-xl animate-bounce-gentle" />
        </>
      )}

      {/* Floating particles for featured */}
      {variant === "featured" && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          <div className="absolute -top-4 left-1/4 w-2 h-2 bg-amber-400 rounded-full animate-float opacity-70" style={{ animationDelay: '0s' }} />
          <div className="absolute -top-2 right-1/4 w-1.5 h-1.5 bg-orange-300 rounded-full animate-float opacity-60" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-0 left-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-float opacity-80" style={{ animationDelay: '1s' }} />
        </div>
      )}
      
      {/* Badge */}
      {badge && (
        <div className="absolute -top-3 -right-1 z-20 flex h-8 min-w-8 px-1.5 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-[10px] font-bold text-accent-foreground shadow-lg border-2 border-white animate-bounce-gentle">
          {badge}
        </div>
      )}

      {/* Building container */}
      <div className={cn("relative", sizes.container)}>
        {/* Roof */}
        <div className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 z-10",
          "w-0 h-0",
          sizes.roof,
          "border-l-transparent border-r-transparent",
          variant === "featured" 
            ? "border-b-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" 
            : "border-b-orange-400",
          "transition-all duration-300 group-hover:drop-shadow-lg"
        )} />
        
        {/* Roof ridge detail */}
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 rounded-full z-20",
          sizes.roofTop,
          variant === "featured" ? "bg-amber-300" : "bg-orange-300",
          "border-2 border-orange-500/50",
          "group-hover:animate-bounce-gentle"
        )} />

        {/* Building body */}
        <div className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-xl",
          sizes.building,
          "bg-gradient-to-b shadow-lg",
          variant === "featured" 
            ? "from-amber-100 to-amber-200 border-2 border-amber-300 shadow-amber-200/50" 
            : cn(buildingColor, "border-2 border-white/50"),
          "overflow-hidden transition-shadow duration-300",
          "group-hover:shadow-xl"
        )}>
          {/* Window glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Windows */}
          <div className="absolute top-2 left-1.5 w-2.5 h-3 rounded-sm bg-sky-300/80 border border-sky-400 group-hover:bg-yellow-200/90 transition-colors" />
          <div className="absolute top-2 right-1.5 w-2.5 h-3 rounded-sm bg-sky-300/80 border border-sky-400 group-hover:bg-yellow-200/90 transition-colors" />
          
          {/* Door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-7 rounded-t-lg bg-amber-700 border-2 border-amber-800">
            <div className="absolute top-2.5 right-0.5 w-1 h-1 rounded-full bg-amber-400" />
          </div>
        </div>

        {/* Icon display area */}
        <div className={cn(
          "absolute top-5 left-1/2 -translate-x-1/2 z-10",
          sizes.icon,
          "rounded-xl flex items-center justify-center",
          "bg-gradient-to-br from-white/95 to-white/80 shadow-lg",
          "border-2 border-white/90 backdrop-blur-sm",
          "transition-all duration-300",
          "group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3"
        )}>
          <div className={cn(
            sizes.iconInner,
            variant === "featured" ? "text-amber-600" : "text-primary",
            "transition-transform group-hover:scale-110"
          )}>
            {icon}
          </div>
        </div>
      </div>

      {/* Ground shadow */}
      <div className={cn(
        "bg-black/15 rounded-full blur-sm -mt-1 transition-all duration-300",
        size === "lg" ? "w-20 h-4" : size === "md" ? "w-16 h-3" : "w-12 h-2",
        "group-hover:w-12 group-hover:bg-black/10"
      )} />

      {/* Name label */}
      <div className={cn(
        "mt-2 px-3 py-1.5 rounded-full font-bold",
        "bg-card/95 shadow-lg border border-border/50 backdrop-blur-sm",
        "text-center whitespace-nowrap",
        "transition-all duration-300 group-hover:shadow-xl group-hover:bg-card",
        size === "lg" ? "text-sm" : size === "md" ? "text-xs" : "text-[10px]"
      )}>
        {name}
      </div>

      {/* Description - always visible for featured, hover for others */}
      {description && (
        <div className={cn(
          "mt-1 px-2 py-0.5 rounded-lg text-[10px] text-center whitespace-nowrap transition-all duration-300",
          variant === "featured" 
            ? "opacity-100 bg-accent/20 text-accent-foreground font-medium" 
            : "opacity-0 group-hover:opacity-100 bg-foreground/80 text-background"
        )}>
          {description}
        </div>
      )}
    </button>
  );
}
