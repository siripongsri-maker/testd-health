import { ReactNode, useState, CSSProperties, useEffect } from "react";
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
  roofColor = "bg-orange-600",
  wallColor = "bg-amber-100",
  size = "md",
  className,
}: TownBuildingProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [smokeFrame, setSmokeFrame] = useState(0);

  // Animate smoke
  useEffect(() => {
    const interval = setInterval(() => {
      setSmokeFrame(prev => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const sizeConfig = {
    sm: { 
      wrapper: "w-[72px]", 
      roof: "h-8 w-16", 
      body: "h-12 w-14",
      iconSize: "text-lg",
      label: "text-[8px] px-1.5"
    },
    md: { 
      wrapper: "w-[88px]", 
      roof: "h-10 w-20", 
      body: "h-16 w-[72px]",
      iconSize: "text-xl",
      label: "text-[10px] px-2"
    },
    lg: { 
      wrapper: "w-[120px]", 
      roof: "h-14 w-28", 
      body: "h-24 w-24",
      iconSize: "text-3xl",
      label: "text-xs px-3"
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

  const smokePositions = [
    { x: 0, y: -4, opacity: 0.6, scale: 1 },
    { x: 2, y: -8, opacity: 0.4, scale: 1.2 },
    { x: -1, y: -12, opacity: 0.2, scale: 1.4 },
    { x: 1, y: -16, opacity: 0.1, scale: 1.6 },
  ];

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => {
        setIsHovered(true);
        variant !== "locked" && playBuildingHover();
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex flex-col items-center touch-manipulation",
        config.wrapper,
        "transition-transform duration-100",
        isPressed ? "translate-y-1" : isHovered ? "-translate-y-1" : "",
        variant === "locked" && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
      style={{ imageRendering: "pixelated" }}
      disabled={variant === "locked"}
    >
      {/* Pixel glow for featured */}
      {variant === "featured" && (
        <>
          <div className="absolute inset-0 -z-10 bg-yellow-400/30 blur-xl scale-[2] animate-pulse" />
          {/* Sparkle particles */}
          <div className="absolute -top-4 left-2 text-yellow-300 text-xs animate-bounce" style={{ animationDelay: '0ms' }}>✦</div>
          <div className="absolute -top-2 right-2 text-yellow-200 text-[10px] animate-bounce" style={{ animationDelay: '200ms' }}>✦</div>
          <div className="absolute top-4 -left-2 text-yellow-300 text-[8px] animate-bounce" style={{ animationDelay: '400ms' }}>✦</div>
        </>
      )}

      {/* Badge */}
      {badge && (
        <div className="absolute -top-3 -right-1 z-20 px-1.5 py-0.5 bg-red-500 text-[8px] font-bold text-white border-2 border-red-700 shadow-[2px_2px_0_#7f1d1d]"
          style={{ fontFamily: "'VT323', monospace" }}>
          {badge}
        </div>
      )}

      {/* Building Structure */}
      <div className="relative">
        {/* Chimney with animated smoke */}
        <div className="absolute -top-4 right-1 z-20">
          {/* Chimney block */}
          <div className="w-3 h-5 bg-stone-600 border-l-2 border-t-2 border-stone-500 border-r-2 border-b-2 border-r-stone-700 border-b-stone-700" />
          {/* Animated smoke puffs */}
          {smokePositions.map((pos, i) => (
            <div 
              key={i}
              className="absolute left-0.5 w-2 h-2 bg-white/50 rounded-full transition-all duration-400"
              style={{
                transform: `translate(${pos.x}px, ${pos.y + (smokeFrame === i ? -2 : 0)}px) scale(${pos.scale})`,
                opacity: (smokeFrame + i) % 4 === 0 ? pos.opacity * 1.5 : pos.opacity,
              }}
            />
          ))}
        </div>

        {/* Roof - Pixel style with stepped edges */}
        <div className={cn("relative z-10 -mb-1", config.roof)}>
          {/* Roof layers for 64-bit look */}
          <div className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[40%]",
            variant === "featured" ? "bg-yellow-500" : roofColor.replace("from-", "bg-").split(" ")[0]
          )} style={{ boxShadow: "inset -3px 0 0 rgba(0,0,0,0.2), inset 3px 0 0 rgba(255,255,255,0.1)" }} />
          <div className={cn(
            "absolute bottom-[40%] left-1/2 -translate-x-1/2 w-[85%] h-[30%]",
            variant === "featured" ? "bg-yellow-400" : roofColor.replace("to-", "bg-").split(" ").pop()
          )} style={{ boxShadow: "inset -2px 0 0 rgba(0,0,0,0.2), inset 2px 0 0 rgba(255,255,255,0.1)" }} />
          <div className={cn(
            "absolute bottom-[70%] left-1/2 -translate-x-1/2 w-[65%] h-[30%]",
            variant === "featured" ? "bg-yellow-300" : "bg-orange-400"
          )} style={{ boxShadow: "inset -2px 0 0 rgba(0,0,0,0.15)" }} />
          {/* Roof edge shadow */}
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-orange-900/60" />
        </div>

        {/* Building body - Pixel art style */}
        <div className={cn(
          "relative border-4",
          config.body,
          variant === "featured" 
            ? "bg-amber-50 border-l-amber-200 border-t-amber-200 border-r-amber-400 border-b-amber-400" 
            : cn(wallColor.replace("from-", "bg-").split(" ")[0], "border-l-amber-100 border-t-amber-100 border-r-amber-300 border-b-amber-300")
        )} style={{ boxShadow: "4px 4px 0 rgba(0,0,0,0.3)" }}>
          
          {/* Pixel windows */}
          <div className="absolute top-1 left-1 w-3 h-4 bg-sky-600 border-2 border-l-sky-400 border-t-sky-400 border-r-sky-800 border-b-sky-800">
            <div className="absolute top-0 left-0 w-1 h-1 bg-white/60" />
          </div>
          <div className="absolute top-1 right-1 w-3 h-4 bg-sky-600 border-2 border-l-sky-400 border-t-sky-400 border-r-sky-800 border-b-sky-800">
            <div className="absolute top-0 left-0 w-1 h-1 bg-white/60" />
          </div>

          {/* Pixel door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-amber-700 border-2 border-l-amber-600 border-t-amber-600 border-r-amber-900 border-b-amber-900">
            <div className="absolute top-2 right-0.5 w-1 h-1 bg-yellow-400" />
          </div>

          {/* Icon with pixel border */}
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "bg-white/90 border-2 border-l-white border-t-white border-r-gray-400 border-b-gray-400",
            "p-1.5 transition-transform duration-100",
            isHovered && "scale-110"
          )}>
            <div className={cn(
              config.iconSize,
              variant === "featured" ? "text-amber-600" : "text-primary",
              "flex items-center justify-center"
            )}>
              {icon}
            </div>
          </div>
        </div>

        {/* Ground shadow - pixel style */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-full h-2 bg-black/25" 
          style={{ clipPath: "ellipse(50% 50% at 50% 50%)" }} />
      </div>

      {/* Pixel-style label */}
      <div className={cn(
        "mt-3 font-bold bg-stone-800 text-white border-2",
        "border-l-stone-600 border-t-stone-600 border-r-stone-900 border-b-stone-900",
        "whitespace-nowrap shadow-[2px_2px_0_#1c1917]",
        config.label
      )} style={{ fontFamily: "'VT323', monospace" }}>
        {name}
      </div>

      {/* Description */}
      {description && (
        <div className={cn(
          "mt-1 text-[9px] text-center whitespace-nowrap transition-opacity duration-100",
          variant === "featured" 
            ? "opacity-100 bg-yellow-500 text-black px-2 py-0.5 font-bold border border-yellow-700" 
            : cn("opacity-0 group-hover:opacity-100 bg-stone-700 text-white px-1.5 py-0.5"),
        )} style={{ fontFamily: "'VT323', monospace" }}>
          {description}
        </div>
      )}
    </button>
  );
}

// 64-bit style pixel tree
interface PixelTreeProps {
  variant?: "oak" | "pine" | "bush" | "flower";
  className?: string;
  style?: CSSProperties;
}

export function PixelTree({ variant = "oak", className = "", style }: PixelTreeProps) {
  const [frame, setFrame] = useState(0);
  
  // Subtle sway animation
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % 2);
    }, 800 + Math.random() * 400);
    return () => clearInterval(interval);
  }, []);

  if (variant === "pine") {
    return (
      <div className={cn("relative flex flex-col items-center", className)} style={{ ...style, imageRendering: "pixelated" }}>
        {/* Pine layers with pixel shading */}
        <div className="relative" style={{ transform: `translateX(${frame === 0 ? 0 : 1}px)` }}>
          <div className="w-4 h-3 bg-green-700" style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
          <div className="w-6 h-4 bg-green-600 -mt-1" style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
          <div className="w-8 h-5 bg-green-500 -mt-1" style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
          {/* Highlight */}
          <div className="absolute top-1 left-1/2 w-2 h-2 bg-green-400/50" />
        </div>
        <div className="w-2 h-4 bg-amber-800 border-r border-amber-900" />
        <div className="w-4 h-1 bg-black/20 rounded-full" />
      </div>
    );
  }
  
  if (variant === "bush") {
    return (
      <div className={cn("relative", className)} style={{ ...style, imageRendering: "pixelated" }}>
        <div className="relative" style={{ transform: `scaleX(${frame === 0 ? 1 : 1.02})` }}>
          <div className="w-8 h-5 bg-green-500 rounded-full border-2 border-l-green-400 border-t-green-400 border-r-green-700 border-b-green-700" />
          <div className="absolute -top-1 left-2 w-4 h-3 bg-green-400 rounded-full" />
          {/* Flowers on bush */}
          <div className="absolute top-0 left-1 w-1.5 h-1.5 bg-pink-400 rounded-full" />
          <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-300 rounded-full" />
        </div>
        <div className="w-6 h-1 bg-black/15 rounded-full mx-auto" />
      </div>
    );
  }

  if (variant === "flower") {
    return (
      <div className={cn("relative flex flex-col items-center", className)} style={style}>
        <div className="relative" style={{ transform: `rotate(${frame === 0 ? -2 : 2}deg)` }}>
          <div className="w-4 h-4 flex flex-wrap">
            <div className="w-2 h-2 bg-pink-400 rounded-full" />
            <div className="w-2 h-2 bg-pink-400 rounded-full" />
            <div className="w-2 h-2 bg-pink-400 rounded-full" />
            <div className="w-2 h-2 bg-pink-400 rounded-full" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
        </div>
        <div className="w-0.5 h-4 bg-green-600" />
        <div className="absolute bottom-2 left-0 w-2 h-1 bg-green-500 rounded-full origin-right -rotate-45" />
      </div>
    );
  }

  // Oak tree - 64-bit style
  return (
    <div className={cn("relative flex flex-col items-center", className)} style={{ ...style, imageRendering: "pixelated" }}>
      <div className="relative" style={{ transform: `translateX(${frame === 0 ? 0 : 1}px)` }}>
        {/* Layered foliage */}
        <div className="w-12 h-10 bg-green-500 rounded-full border-2 border-l-green-400 border-t-green-400 border-r-green-700 border-b-green-700" />
        <div className="absolute -top-2 left-2 w-8 h-7 bg-green-400 rounded-full" />
        <div className="absolute top-1 -left-1 w-5 h-5 bg-green-600 rounded-full" />
        <div className="absolute top-1 -right-1 w-5 h-5 bg-green-600 rounded-full" />
        {/* Highlights */}
        <div className="absolute top-0 left-3 w-2 h-2 bg-green-300/60 rounded-full" />
      </div>
      {/* Trunk with pixel shading */}
      <div className="w-4 h-5 bg-amber-700 -mt-2 border-r-2 border-amber-900" />
      <div className="w-8 h-1 bg-black/20 rounded-full" />
    </div>
  );
}

// 64-bit style pond
export function Pond({ className = "" }: { className?: string }) {
  const [ripple, setRipple] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRipple(prev => (prev + 1) % 3);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("relative", className)} style={{ imageRendering: "pixelated" }}>
      {/* Water with pixel border */}
      <div className="w-24 h-12 bg-blue-500 rounded-full border-4 border-l-sky-400 border-t-sky-400 border-r-blue-700 border-b-blue-700"
        style={{ boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.2)" }}>
        {/* Animated ripples */}
        <div className="absolute top-2 left-4 w-4 h-1 bg-sky-300/60 rounded-full transition-all"
          style={{ transform: `scaleX(${1 + ripple * 0.1})`, opacity: 1 - ripple * 0.2 }} />
        <div className="absolute top-4 right-5 w-3 h-0.5 bg-sky-200/40 rounded-full" 
          style={{ transform: `scaleX(${1 + ((ripple + 1) % 3) * 0.1})` }} />
      </div>
      {/* Lily pads */}
      <div className="absolute top-3 left-5 w-4 h-3 bg-green-500 rounded-full border border-green-700">
        <div className="absolute top-0 right-0 w-1 h-full bg-green-700" style={{ clipPath: "polygon(100% 0%, 100% 100%, 0% 50%)" }} />
      </div>
      <div className="absolute bottom-2 right-6 w-3 h-2 bg-green-600 rounded-full" />
      {/* Water reflection */}
      <div className="absolute top-1 left-3 w-2 h-1 bg-white/30" />
    </div>
  );
}

// 64-bit style fence
export function Fence({ className = "" }: { className?: string }) {
  return (
    <div className={cn("flex relative", className)} style={{ imageRendering: "pixelated" }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="relative">
          <div className="w-2 h-6 bg-amber-600 border-l border-amber-500 border-r border-amber-800" />
          <div className="absolute -top-1 left-0 w-2 h-2 bg-amber-500" style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
        </div>
      ))}
      {/* Horizontal bars */}
      <div className="absolute top-1 left-0 right-0 h-1 bg-amber-700 border-t border-amber-600" />
      <div className="absolute top-3 left-0 right-0 h-1 bg-amber-700 border-t border-amber-600" />
    </div>
  );
}

// Decorative pixel rock
export function PixelRock({ size = "md", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) {
  const sizes = {
    sm: "w-4 h-3",
    md: "w-6 h-4",
    lg: "w-8 h-5"
  };
  
  return (
    <div className={cn("relative", sizes[size], className)} style={{ imageRendering: "pixelated" }}>
      <div className={cn("w-full h-full bg-stone-500 rounded-sm border-2 border-l-stone-400 border-t-stone-400 border-r-stone-600 border-b-stone-600")} />
      <div className="absolute top-0.5 left-0.5 w-1/3 h-1/3 bg-stone-400/50" />
    </div>
  );
}

// Animated pixel character
export function PixelCharacter({ className = "", onClick }: { className?: string, onClick?: () => void }) {
  const [walkFrame, setWalkFrame] = useState(0);
  const [bounce, setBounce] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setWalkFrame(prev => (prev + 1) % 2);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    setBounce(true);
    setTimeout(() => setBounce(false), 300);
    onClick?.();
  };

  return (
    <button 
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-center transition-transform",
        bounce && "animate-bounce",
        className
      )}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Shadow */}
      <div className="absolute bottom-0 w-8 h-2 bg-black/25 rounded-full" />
      
      {/* Character body - pixel art style */}
      <div className="relative" style={{ transform: `translateY(${walkFrame === 0 ? 0 : -1}px)` }}>
        {/* Head */}
        <div className="w-8 h-8 bg-amber-200 border-2 border-l-amber-100 border-t-amber-100 border-r-amber-400 border-b-amber-400 rounded-sm">
          {/* Hair */}
          <div className="absolute -top-1 left-0 right-0 h-2 bg-amber-800 rounded-t-sm" />
          {/* Eyes */}
          <div className="absolute top-3 left-1 w-1.5 h-1.5 bg-stone-800 rounded-full" />
          <div className="absolute top-3 right-1 w-1.5 h-1.5 bg-stone-800 rounded-full" />
          {/* Mouth */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-red-400 rounded-full" />
        </div>
        {/* Body */}
        <div className="w-8 h-10 bg-blue-500 border-2 border-l-blue-400 border-t-blue-400 border-r-blue-700 border-b-blue-700 -mt-1">
          {/* Shirt detail */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-400" />
        </div>
        {/* Legs */}
        <div className="flex gap-0.5 justify-center -mt-1">
          <div className={cn(
            "w-3 h-4 bg-stone-700 border border-stone-800",
            walkFrame === 0 ? "origin-top rotate-[5deg]" : "origin-top -rotate-[5deg]"
          )} />
          <div className={cn(
            "w-3 h-4 bg-stone-700 border border-stone-800",
            walkFrame === 0 ? "origin-top -rotate-[5deg]" : "origin-top rotate-[5deg]"
          )} />
        </div>
      </div>
    </button>
  );
}

// Walking NPC Villager
interface WalkingVillagerProps {
  variant?: "farmer" | "merchant" | "villager";
  direction?: "left" | "right";
  startX?: number;
  className?: string;
}

export function WalkingVillager({ 
  variant = "villager", 
  direction = "right",
  startX = 0,
  className = "" 
}: WalkingVillagerProps) {
  const [walkFrame, setWalkFrame] = useState(0);
  const [position, setPosition] = useState(startX);
  
  const colors = {
    farmer: { hair: "bg-amber-700", shirt: "bg-green-600", pants: "bg-amber-800" },
    merchant: { hair: "bg-stone-800", shirt: "bg-red-500", pants: "bg-stone-600" },
    villager: { hair: "bg-amber-600", shirt: "bg-purple-500", pants: "bg-stone-700" }
  };

  const { hair, shirt, pants } = colors[variant];

  useEffect(() => {
    const walkInterval = setInterval(() => {
      setWalkFrame(prev => (prev + 1) % 4);
    }, 200);
    
    const moveInterval = setInterval(() => {
      setPosition(prev => {
        const newPos = direction === "right" ? prev + 0.5 : prev - 0.5;
        // Reset position when off screen
        if (newPos > 110) return -10;
        if (newPos < -10) return 110;
        return newPos;
      });
    }, 50);
    
    return () => {
      clearInterval(walkInterval);
      clearInterval(moveInterval);
    };
  }, [direction]);

  return (
    <div 
      className={cn("absolute bottom-4 z-10", className)}
      style={{ 
        left: `${position}%`,
        transform: direction === "left" ? "scaleX(-1)" : "scaleX(1)",
        imageRendering: "pixelated"
      }}
    >
      {/* Shadow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-black/20 rounded-full" />
      
      <div style={{ transform: `translateY(${walkFrame % 2 === 0 ? 0 : -1}px)` }}>
        {/* Head */}
        <div className="w-6 h-6 bg-amber-200 border border-amber-400 rounded-sm mx-auto">
          <div className={cn("absolute -top-0.5 left-0.5 right-0.5 h-1.5 rounded-t-sm", hair)} />
          <div className="absolute top-2 left-1 w-1 h-1 bg-stone-800 rounded-full" />
          <div className="absolute top-2 right-1 w-1 h-1 bg-stone-800 rounded-full" />
        </div>
        {/* Body */}
        <div className={cn("w-6 h-6 mx-auto -mt-0.5 border", shirt)} />
        {/* Legs with walking animation */}
        <div className="flex justify-center -mt-0.5">
          <div 
            className={cn("w-2 h-3 border", pants)}
            style={{ transform: `rotate(${(walkFrame === 0 || walkFrame === 2) ? 10 : -10}deg)` }}
          />
          <div 
            className={cn("w-2 h-3 border", pants)}
            style={{ transform: `rotate(${(walkFrame === 0 || walkFrame === 2) ? -10 : 10}deg)` }}
          />
        </div>
      </div>
    </div>
  );
}

// Flying Bird
interface FlyingBirdProps {
  variant?: "sparrow" | "bluebird" | "cardinal";
  startX?: number;
  startY?: number;
  speed?: number;
  className?: string;
}

export function FlyingBird({ 
  variant = "sparrow",
  startX = 0,
  startY = 20,
  speed = 1,
  className = ""
}: FlyingBirdProps) {
  const [wingFrame, setWingFrame] = useState(0);
  const [position, setPosition] = useState({ x: startX, y: startY });
  
  const colors = {
    sparrow: "bg-amber-700",
    bluebird: "bg-blue-500",
    cardinal: "bg-red-500"
  };

  useEffect(() => {
    const flapInterval = setInterval(() => {
      setWingFrame(prev => (prev + 1) % 3);
    }, 100);
    
    const flyInterval = setInterval(() => {
      setPosition(prev => {
        const newX = prev.x + speed;
        const wobble = Math.sin(prev.x * 0.05) * 0.5;
        return {
          x: newX > 120 ? -20 : newX,
          y: startY + wobble * 5
        };
      });
    }, 30);
    
    return () => {
      clearInterval(flapInterval);
      clearInterval(flyInterval);
    };
  }, [speed, startY]);

  const wingPositions = ["rotate-[-20deg]", "rotate-[0deg]", "rotate-[20deg]"];

  return (
    <div 
      className={cn("absolute z-30 pointer-events-none", className)}
      style={{ 
        left: `${position.x}%`,
        top: `${position.y}%`,
        imageRendering: "pixelated"
      }}
    >
      <div className="relative">
        {/* Body */}
        <div className={cn("w-4 h-2 rounded-full", colors[variant])} />
        {/* Head */}
        <div className={cn("absolute -left-1 top-0 w-2 h-2 rounded-full", colors[variant])} />
        {/* Beak */}
        <div className="absolute -left-2 top-0.5 w-1 h-0.5 bg-orange-400" />
        {/* Wings */}
        <div 
          className={cn("absolute top-0 left-1 w-3 h-1.5 rounded-full origin-left", colors[variant])}
          style={{ 
            transform: wingPositions[wingFrame],
            filter: "brightness(0.9)"
          }} 
        />
        {/* Tail */}
        <div className={cn("absolute right-0 top-0.5 w-1.5 h-1 rounded-r", colors[variant])} 
          style={{ filter: "brightness(0.8)" }} />
      </div>
    </div>
  );
}

// Butterfly
interface ButterflyProps {
  color?: "pink" | "blue" | "yellow" | "purple";
  startX?: number;
  startY?: number;
  className?: string;
}

export function Butterfly({ 
  color = "pink",
  startX = 50,
  startY = 50,
  className = ""
}: ButterflyProps) {
  const [wingFrame, setWingFrame] = useState(0);
  const [position, setPosition] = useState({ x: startX, y: startY });
  const [targetPos, setTargetPos] = useState({ x: startX + 5, y: startY + 2 });
  
  const colors = {
    pink: { wing: "bg-pink-400", spot: "bg-pink-600" },
    blue: { wing: "bg-sky-400", spot: "bg-sky-600" },
    yellow: { wing: "bg-yellow-400", spot: "bg-yellow-600" },
    purple: { wing: "bg-purple-400", spot: "bg-purple-600" }
  };

  const { wing, spot } = colors[color];

  useEffect(() => {
    const flapInterval = setInterval(() => {
      setWingFrame(prev => (prev + 1) % 2);
    }, 80);
    
    // Random flutter movement
    const moveInterval = setInterval(() => {
      setPosition(prev => {
        const dx = (targetPos.x - prev.x) * 0.02;
        const dy = (targetPos.y - prev.y) * 0.02;
        return {
          x: prev.x + dx + (Math.random() - 0.5) * 0.3,
          y: prev.y + dy + (Math.random() - 0.5) * 0.3
        };
      });
    }, 30);
    
    // New target every few seconds
    const targetInterval = setInterval(() => {
      setTargetPos({
        x: startX + (Math.random() - 0.5) * 15,
        y: startY + (Math.random() - 0.5) * 10
      });
    }, 2000);
    
    return () => {
      clearInterval(flapInterval);
      clearInterval(moveInterval);
      clearInterval(targetInterval);
    };
  }, [startX, startY, targetPos]);

  return (
    <div 
      className={cn("absolute z-20 pointer-events-none", className)}
      style={{ 
        left: `${position.x}%`,
        top: `${position.y}%`,
        imageRendering: "pixelated"
      }}
    >
      <div className="relative flex items-center">
        {/* Left wings */}
        <div 
          className="origin-right"
          style={{ transform: `scaleY(${wingFrame === 0 ? 1 : 0.3})` }}
        >
          <div className={cn("w-2 h-3 rounded-full", wing)}>
            <div className={cn("absolute top-0.5 left-0.5 w-1 h-1 rounded-full", spot)} />
          </div>
          <div className={cn("w-1.5 h-2 rounded-full -mt-1 ml-0.5", wing)} />
        </div>
        {/* Body */}
        <div className="w-0.5 h-3 bg-stone-800 rounded-full" />
        {/* Right wings */}
        <div 
          className="origin-left"
          style={{ transform: `scaleY(${wingFrame === 0 ? 1 : 0.3})` }}
        >
          <div className={cn("w-2 h-3 rounded-full", wing)}>
            <div className={cn("absolute top-0.5 right-0.5 w-1 h-1 rounded-full", spot)} />
          </div>
          <div className={cn("w-1.5 h-2 rounded-full -mt-1 mr-0.5", wing)} />
        </div>
      </div>
    </div>
  );
}