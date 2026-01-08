import { ReactNode, useState, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { playBuildingTap, playBuildingHover } from "@/lib/sounds";

interface TownBuildingProps {
  icon: ReactNode;
  name: string;
  description?: string;
  onClick: () => void;
  variant?: "default" | "featured" | "locked";
  badge?: string | number;
  roofColor?: string;
  wallColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TownBuilding({
  icon,
  name,
  description,
  onClick,
  variant = "default",
  badge,
  roofColor = "from-orange-600 to-orange-700",
  wallColor = "from-amber-100 to-amber-200",
  size = "md",
  className,
}: TownBuildingProps) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeConfig = {
    sm: { 
      wrapper: "w-20", 
      roof: "h-6 -top-3", 
      body: "h-12 w-14",
      iconBox: "w-8 h-8",
      iconSize: "h-4 w-4",
      label: "text-[9px] px-1.5 py-0.5"
    },
    md: { 
      wrapper: "w-24", 
      roof: "h-8 -top-4", 
      body: "h-14 w-16",
      iconBox: "w-10 h-10",
      iconSize: "h-5 w-5",
      label: "text-[10px] px-2 py-1"
    },
    lg: { 
      wrapper: "w-32", 
      roof: "h-10 -top-5", 
      body: "h-[72px] w-[88px]",
      iconBox: "w-14 h-14",
      iconSize: "h-7 w-7",
      label: "text-xs px-3 py-1.5"
    },
  };

  const config = sizeConfig[size];

  const handleClick = () => {
    if (variant === "locked") return;
    playBuildingTap();
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => variant !== "locked" && playBuildingHover()}
      className={cn(
        "group relative flex flex-col items-center transition-all duration-200 touch-manipulation",
        config.wrapper,
        isPressed ? "scale-90" : "hover:scale-105 hover:-translate-y-1",
        "active:scale-95",
        variant === "locked" && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
      disabled={variant === "locked"}
    >
      {/* Glow for featured */}
      {variant === "featured" && (
        <div className="absolute inset-0 -z-10 rounded-full bg-amber-400/40 blur-2xl animate-pulse scale-150" />
      )}

      {/* Badge */}
      {badge && (
        <div className="absolute -top-2 -right-0 z-20 flex h-6 min-w-6 px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-lg border-2 border-white animate-bounce-gentle">
          {badge}
        </div>
      )}

      {/* Building */}
      <div className="relative">
        {/* Chimney */}
        <div className="absolute -top-6 right-2 w-3 h-4 bg-gradient-to-b from-stone-400 to-stone-500 rounded-t-sm z-10">
          {/* Smoke */}
          <div className="absolute -top-2 left-0.5 w-2 h-2 bg-white/40 rounded-full animate-float blur-[1px]" />
        </div>

        {/* Roof */}
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 w-full",
          config.roof,
          "z-10"
        )}>
          <div className={cn(
            "w-full h-full bg-gradient-to-b rounded-t-lg",
            variant === "featured" ? "from-amber-500 to-amber-600" : roofColor,
            "shadow-md"
          )} 
          style={{
            clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)"
          }}
          />
          {/* Roof edge */}
          <div className={cn(
            "absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-b rounded-sm",
            variant === "featured" ? "from-amber-600 to-amber-700" : "from-orange-700 to-orange-800"
          )} />
        </div>

        {/* Building body */}
        <div className={cn(
          "relative rounded-md shadow-lg overflow-hidden",
          config.body,
          "bg-gradient-to-b",
          variant === "featured" ? "from-amber-50 to-amber-100 border-2 border-amber-300" : cn(wallColor, "border-2 border-amber-200/50")
        )}>
          {/* Window */}
          <div className="absolute top-1 left-1 w-2.5 h-3 rounded-sm bg-sky-300 border border-sky-400">
            <div className="absolute inset-0.5 bg-gradient-to-br from-white/50 to-transparent" />
          </div>
          <div className="absolute top-1 right-1 w-2.5 h-3 rounded-sm bg-sky-300 border border-sky-400">
            <div className="absolute inset-0.5 bg-gradient-to-br from-white/50 to-transparent" />
          </div>

          {/* Door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-5 rounded-t-md bg-gradient-to-b from-amber-700 to-amber-800 border-t-2 border-x-2 border-amber-600">
            <div className="absolute top-2 right-0.5 w-1 h-1 rounded-full bg-amber-400" />
          </div>

          {/* Icon overlay */}
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            config.iconBox,
            "rounded-lg flex items-center justify-center",
            "bg-white/90 shadow-inner border-2 border-white",
            "group-hover:scale-110 transition-transform"
          )}>
            <div className={cn(
              config.iconSize,
              variant === "featured" ? "text-amber-600" : "text-primary"
            )}>
              {icon}
            </div>
          </div>
        </div>

        {/* Ground shadow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-black/20 rounded-full blur-sm" />
      </div>

      {/* Label */}
      <div className={cn(
        "mt-3 rounded-md font-bold bg-stone-800/90 text-white shadow-lg",
        "border border-stone-600 whitespace-nowrap",
        config.label
      )}>
        {name}
      </div>

      {/* Description on hover */}
      {description && (
        <div className={cn(
          "mt-1 rounded text-[8px] text-center whitespace-nowrap transition-all duration-200",
          variant === "featured" 
            ? "opacity-100 bg-amber-500/90 text-white px-2 py-0.5 font-medium" 
            : "opacity-0 group-hover:opacity-100 bg-stone-700/90 text-white px-1.5 py-0.5"
        )}>
          {description}
        </div>
      )}
    </button>
  );
}

// Pixel-style tree component
interface PixelTreeProps {
  variant?: "oak" | "pine" | "bush";
  className?: string;
  style?: CSSProperties;
}

export function PixelTree({ variant = "oak", className = "", style }: PixelTreeProps) {
  if (variant === "pine") {
    return (
      <div className={`relative ${className}`} style={style}>
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-green-700 absolute -top-3 left-1/2 -translate-x-1/2" />
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[14px] border-l-transparent border-r-transparent border-b-green-600 absolute -top-1 left-1/2 -translate-x-1/2" />
        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[16px] border-l-transparent border-r-transparent border-b-green-500" />
        <div className="w-2 h-3 bg-amber-800 mx-auto -mt-1" />
      </div>
    );
  }
  
  if (variant === "bush") {
    return (
      <div className={`relative ${className}`} style={style}>
        <div className="w-6 h-4 bg-green-500 rounded-full shadow-inner" />
        <div className="w-4 h-3 bg-green-600 rounded-full absolute -top-1 left-1" />
      </div>
    );
  }

  // Oak tree
  return (
    <div className={`relative ${className}`} style={style}>
      <div className="w-10 h-8 bg-gradient-to-b from-green-400 to-green-600 rounded-full shadow-lg" />
      <div className="w-8 h-6 bg-gradient-to-b from-green-500 to-green-700 rounded-full absolute -top-2 left-1" />
      <div className="w-3 h-4 bg-gradient-to-b from-amber-700 to-amber-900 mx-auto -mt-1 rounded-b" />
    </div>
  );
}

// Water/pond component
export function Pond({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="w-20 h-10 bg-gradient-to-b from-sky-400 to-blue-500 rounded-full shadow-inner border-2 border-sky-300">
        <div className="absolute top-1 left-2 w-4 h-2 bg-white/30 rounded-full" />
        <div className="absolute top-2 right-3 w-2 h-1 bg-white/20 rounded-full" />
      </div>
      {/* Lily pads */}
      <div className="absolute top-2 left-4 w-3 h-2 bg-green-500 rounded-full opacity-80" />
      <div className="absolute bottom-2 right-5 w-2 h-1.5 bg-green-600 rounded-full opacity-70" />
    </div>
  );
}

// Fence component
export function Fence({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-0.5 relative ${className}`}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-2 h-4 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-sm" />
      ))}
      <div className="absolute top-1 left-0 right-0 h-1 bg-amber-700" />
    </div>
  );
}
