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
  size?: "sm" | "md" | "lg" | "xl";
  buildingStyle?: "cottage" | "tower" | "mansion" | "shop" | "castle" | "clinic" | "bank" | "blacksmith" | "inn";
  className?: string;
}

// Unique building architecture configurations
const BUILDING_STYLES = {
  cottage: {
    roofShape: "triangular",
    floors: 1,
    hasChimney: true,
    windowStyle: "round",
    decorations: ["flower-box", "lantern"],
  },
  tower: {
    roofShape: "pointed",
    floors: 3,
    hasChimney: false,
    windowStyle: "arched",
    decorations: ["flag", "clock"],
  },
  mansion: {
    roofShape: "flat",
    floors: 2,
    hasChimney: true,
    windowStyle: "large",
    decorations: ["columns", "balcony"],
  },
  shop: {
    roofShape: "awning",
    floors: 1,
    hasChimney: false,
    windowStyle: "display",
    decorations: ["sign", "crates"],
  },
  castle: {
    roofShape: "crenellated",
    floors: 2,
    hasChimney: false,
    windowStyle: "arched",
    decorations: ["banner", "towers"],
  },
  clinic: {
    roofShape: "cross",
    floors: 2,
    hasChimney: false,
    windowStyle: "large",
    decorations: ["cross-sign", "ambulance"],
  },
  bank: {
    roofShape: "dome",
    floors: 2,
    hasChimney: false,
    windowStyle: "vault",
    decorations: ["pillars", "coin-sign"],
  },
  blacksmith: {
    roofShape: "sloped",
    floors: 1,
    hasChimney: true,
    windowStyle: "forge",
    decorations: ["anvil", "bellows", "sparks"],
  },
  inn: {
    roofShape: "gambrel",
    floors: 2,
    hasChimney: true,
    windowStyle: "shuttered",
    decorations: ["hanging-sign", "barrel", "lamp"],
  },
};

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
  buildingStyle = "cottage",
  className,
}: TownBuildingProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [smokeFrame, setSmokeFrame] = useState(0);
  const [lightFrame, setLightFrame] = useState(0);

  const style = BUILDING_STYLES[buildingStyle];

  // Animate smoke and lights
  useEffect(() => {
    const smokeInterval = setInterval(() => {
      setSmokeFrame(prev => (prev + 1) % 4);
    }, 400);
    const lightInterval = setInterval(() => {
      setLightFrame(prev => (prev + 1) % 3);
    }, 600);
    return () => {
      clearInterval(smokeInterval);
      clearInterval(lightInterval);
    };
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
    xl: { 
      wrapper: "w-[150px]", 
      roof: "h-16 w-36", 
      body: "h-32 w-32",
      iconSize: "text-4xl",
      label: "text-sm px-4"
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

  // Render unique roof based on style
  const renderRoof = () => {
    switch (style.roofShape) {
      case "pointed":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Tall pointed spire */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: `${parseInt(config.roof.split(' ')[1]?.replace('w-', '') || '20') * 2}px solid transparent`,
                borderRight: `${parseInt(config.roof.split(' ')[1]?.replace('w-', '') || '20') * 2}px solid transparent`,
                borderBottom: `${parseInt(config.roof.split(' ')[0]?.replace('h-', '') || '10') * 6}px solid #7c3aed`,
              }} />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-2 h-8 bg-purple-600" />
            {style.decorations.includes("flag") && (
              <div className="absolute -top-10 left-1/2 ml-1 w-4 h-3 bg-red-500 animate-pulse"
                style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
            )}
          </div>
        );
      case "crenellated":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Castle battlements */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={cn("w-3 h-4", variant === "featured" ? "bg-yellow-500" : "bg-stone-500")} />
                  {i < 4 && <div className={cn("w-2 h-2", variant === "featured" ? "bg-yellow-600" : "bg-stone-600")} />}
                </div>
              ))}
            </div>
            {style.decorations.includes("banner") && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-4 bg-red-600 rounded-b"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full" />
              </div>
            )}
          </div>
        );
      case "awning":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Shop awning with stripes */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full rounded-t-lg overflow-hidden"
              style={{
                background: `repeating-linear-gradient(90deg, ${variant === "featured" ? "#fbbf24" : "#ef4444"} 0px, ${variant === "featured" ? "#fbbf24" : "#ef4444"} 8px, #fff 8px, #fff 16px)`,
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }} />
            {style.decorations.includes("sign") && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-amber-100 border-2 border-amber-800 rounded text-[8px] font-bold"
                style={{ fontFamily: "'VT323', monospace" }}>
                OPEN
              </div>
            )}
          </div>
        );
      case "flat":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Mansion flat roof with balustrade */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[60%] bg-stone-400"
              style={{ boxShadow: "inset -3px 0 0 rgba(0,0,0,0.2)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] flex justify-around">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1 h-3 bg-stone-300" />
              ))}
            </div>
            <div className="absolute bottom-[60%] left-1/2 -translate-x-1/2 w-[95%] h-1 bg-stone-500" />
            {style.decorations.includes("balcony") && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-stone-400 border-t-2 border-stone-500" />
            )}
          </div>
        );
      case "cross":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Clinic roof with cross */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[40%] bg-slate-100"
              style={{ boxShadow: "inset -3px 0 0 rgba(0,0,0,0.1)" }} />
            <div className="absolute bottom-[40%] left-1/2 -translate-x-1/2 w-[85%] h-[40%] bg-slate-200" />
            {/* Red cross */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="w-2 h-6 bg-red-500" />
              <div className="absolute top-2 -left-2 w-6 h-2 bg-red-500" />
            </div>
          </div>
        );
      case "dome":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Bank dome roof */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[50%] bg-amber-600"
              style={{ boxShadow: "inset -3px 0 0 rgba(0,0,0,0.2)" }} />
            <div className="absolute bottom-[50%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-amber-500 rounded-t-full"
              style={{ boxShadow: "inset -2px 0 0 rgba(0,0,0,0.15)" }} />
            <div className="absolute bottom-[80%] left-1/2 -translate-x-1/2 w-[50%] h-[30%] bg-amber-400 rounded-t-full" />
            {/* Gold ornament on top */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full border-2 border-yellow-600"
              style={{ boxShadow: '0 0 8px rgba(250, 204, 21, 0.6)' }} />
            {style.decorations.includes("coin-sign") && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-300 rounded-full" />
            )}
          </div>
        );
      case "sloped":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Blacksmith sloped roof with smoke vents */}
            <div className="absolute bottom-0 left-0 w-full h-[60%] bg-stone-700"
              style={{ 
                clipPath: 'polygon(0 100%, 10% 0, 90% 0, 100% 100%)',
                boxShadow: "inset -3px 0 0 rgba(0,0,0,0.3)" 
              }} />
            <div className="absolute bottom-[60%] left-[10%] w-[80%] h-[30%] bg-stone-600" />
            {/* Smoke vent */}
            <div className="absolute -top-2 right-[20%] w-4 h-3 bg-stone-800 border-2 border-stone-600" />
            {style.decorations.includes("sparks") && (
              <>
                <div className="absolute -top-4 right-[22%] w-1 h-1 bg-orange-500 rounded-full animate-ping" style={{ animationDuration: '0.8s' }} />
                <div className="absolute -top-6 right-[18%] w-1 h-1 bg-yellow-500 rounded-full animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
                <div className="absolute -top-3 right-[24%] w-1 h-1 bg-red-500 rounded-full animate-ping" style={{ animationDuration: '0.6s', animationDelay: '0.5s' }} />
              </>
            )}
          </div>
        );
      case "gambrel":
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            {/* Inn gambrel (barn-style) roof */}
            <div className="absolute bottom-0 left-0 w-full h-[40%] bg-red-800"
              style={{ boxShadow: "inset -3px 0 0 rgba(0,0,0,0.2)" }} />
            <div className="absolute bottom-[40%] left-[5%] w-[90%] h-[35%] bg-red-700"
              style={{ clipPath: 'polygon(0 100%, 15% 0, 85% 0, 100% 100%)' }} />
            <div className="absolute bottom-[75%] left-[20%] w-[60%] h-[30%] bg-red-600"
              style={{ clipPath: 'polygon(0 100%, 25% 0, 75% 0, 100% 100%)' }} />
            {/* Dormer window */}
            <div className="absolute bottom-[50%] left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-200 border-2 border-amber-800" />
            {style.decorations.includes("hanging-sign") && (
              <div className="absolute -left-4 top-2">
                <div className="w-1 h-4 bg-amber-800" />
                <div className="absolute top-3 left-0.5 w-6 h-4 bg-amber-200 border border-amber-700 rounded-sm text-[6px] flex items-center justify-center font-bold"
                  style={{ fontFamily: "'VT323', monospace" }}>
                  INN
                </div>
              </div>
            )}
          </div>
        );
      default: // triangular cottage
        return (
          <div className={cn("relative z-10 -mb-1", config.roof)}>
            <div className={cn(
              "absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[40%]",
              variant === "featured" ? "bg-yellow-500" : roofColor.replace("from-", "bg-").split(" ")[0]
            )} style={{ boxShadow: "inset -3px 0 0 rgba(0,0,0,0.2), inset 3px 0 0 rgba(255,255,255,0.1)" }} />
            <div className={cn(
              "absolute bottom-[40%] left-1/2 -translate-x-1/2 w-[85%] h-[30%]",
              variant === "featured" ? "bg-yellow-400" : roofColor.replace("to-", "bg-").split(" ").pop()
            )} style={{ boxShadow: "inset -2px 0 0 rgba(0,0,0,0.2)" }} />
            <div className={cn(
              "absolute bottom-[70%] left-1/2 -translate-x-1/2 w-[65%] h-[30%]",
              variant === "featured" ? "bg-yellow-300" : "bg-orange-400"
            )} style={{ boxShadow: "inset -2px 0 0 rgba(0,0,0,0.15)" }} />
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-orange-900/60" />
          </div>
        );
    }
  };

  // Render windows based on style
  const renderWindows = () => {
    const windowGlow = lightFrame === 0 ? 'bg-yellow-300/80' : lightFrame === 1 ? 'bg-yellow-200/60' : 'bg-sky-600';
    
    switch (style.windowStyle) {
      case "arched":
        return (
          <>
            <div className={cn("absolute top-1 left-1 w-3 h-5 rounded-t-full border-2 border-stone-700", windowGlow)}>
              <div className="absolute top-0 left-0 w-1 h-1 bg-white/60 rounded-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-stone-600" />
            </div>
            <div className={cn("absolute top-1 right-1 w-3 h-5 rounded-t-full border-2 border-stone-700", windowGlow)}>
              <div className="absolute top-0 left-0 w-1 h-1 bg-white/60 rounded-full" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-stone-600" />
            </div>
          </>
        );
      case "round":
        return (
          <>
            <div className={cn("absolute top-2 left-1.5 w-3 h-3 rounded-full border-2 border-amber-800", windowGlow)}>
              <div className="absolute top-0 left-0 w-1 h-1 bg-white/60 rounded-full" />
            </div>
            <div className={cn("absolute top-2 right-1.5 w-3 h-3 rounded-full border-2 border-amber-800", windowGlow)}>
              <div className="absolute top-0 left-0 w-1 h-1 bg-white/60 rounded-full" />
            </div>
          </>
        );
      case "display":
        return (
          <div className={cn("absolute top-1 left-1 right-1 h-6 border-2 border-amber-800", windowGlow)}>
            <div className="absolute top-0 left-0 w-2 h-1 bg-white/60" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-200" />
          </div>
        );
      case "large":
        return (
          <>
            <div className={cn("absolute top-1 left-1 w-4 h-5 border-2 border-l-stone-400 border-t-stone-400 border-r-stone-700 border-b-stone-700", windowGlow)}>
              <div className="absolute top-0 left-0 w-1.5 h-1 bg-white/60" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-600" />
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-stone-600" />
            </div>
            <div className={cn("absolute top-1 right-1 w-4 h-5 border-2 border-l-stone-400 border-t-stone-400 border-r-stone-700 border-b-stone-700", windowGlow)}>
              <div className="absolute top-0 left-0 w-1.5 h-1 bg-white/60" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-600" />
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-stone-600" />
            </div>
          </>
        );
      case "vault":
        return (
          <>
            {/* Bank vault-style windows with bars */}
            <div className={cn("absolute top-1 left-1 w-4 h-5 border-2 border-amber-900", windowGlow)}>
              <div className="absolute top-0 left-0 w-1.5 h-1 bg-white/60" />
              <div className="absolute inset-0 flex justify-around">
                <div className="w-0.5 h-full bg-amber-800" />
                <div className="w-0.5 h-full bg-amber-800" />
              </div>
            </div>
            <div className={cn("absolute top-1 right-1 w-4 h-5 border-2 border-amber-900", windowGlow)}>
              <div className="absolute top-0 left-0 w-1.5 h-1 bg-white/60" />
              <div className="absolute inset-0 flex justify-around">
                <div className="w-0.5 h-full bg-amber-800" />
                <div className="w-0.5 h-full bg-amber-800" />
              </div>
            </div>
            {/* Vault door */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-6 bg-stone-600 border-2 border-stone-800 rounded-t">
              <div className="absolute top-1/2 right-1 -translate-y-1/2 w-1.5 h-1.5 bg-yellow-500 rounded-full border border-yellow-700" />
            </div>
          </>
        );
      case "forge":
        return (
          <>
            {/* Blacksmith forge glow window */}
            <div className="absolute top-1 left-1 right-1 h-5 bg-orange-600 border-2 border-stone-800 animate-pulse"
              style={{ boxShadow: '0 0 12px rgba(234, 88, 12, 0.8)' }}>
              <div className="absolute inset-0 bg-gradient-to-t from-red-600 to-orange-400" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-700" />
            </div>
            {/* Tools silhouette */}
            <div className="absolute top-0 left-1 w-1 h-3 bg-stone-900 rounded-t" />
            <div className="absolute top-0 right-1 w-1 h-3 bg-stone-900 rounded-t" />
          </>
        );
      case "shuttered":
        return (
          <>
            {/* Inn shuttered windows */}
            <div className="absolute top-1 left-1 w-4 h-5 border-2 border-amber-900">
              <div className={cn("absolute inset-0.5", windowGlow)} />
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-700 border-r border-amber-900" />
              <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-700 border-l border-amber-900" />
            </div>
            <div className="absolute top-1 right-1 w-4 h-5 border-2 border-amber-900">
              <div className={cn("absolute inset-0.5", windowGlow)} />
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-700 border-r border-amber-900" />
              <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-700 border-l border-amber-900" />
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="absolute top-1 left-1 w-3 h-4 bg-sky-600 border-2 border-l-sky-400 border-t-sky-400 border-r-sky-800 border-b-sky-800">
              <div className="absolute top-0 left-0 w-1 h-1 bg-white/60" />
            </div>
            <div className="absolute top-1 right-1 w-3 h-4 bg-sky-600 border-2 border-l-sky-400 border-t-sky-400 border-r-sky-800 border-b-sky-800">
              <div className="absolute top-0 left-0 w-1 h-1 bg-white/60" />
            </div>
          </>
        );
    }
  };

  // Render decorations
  const renderDecorations = () => {
    return (
      <>
        {style.decorations.includes("flower-box") && (
          <div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-0.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: ['#ec4899', '#f59e0b', '#ef4444'][i], animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        )}
        {style.decorations.includes("lantern") && (
          <div className="absolute -left-2 top-2 w-2 h-3 bg-yellow-400 rounded animate-pulse" 
            style={{ boxShadow: '0 0 8px rgba(250, 204, 21, 0.6)' }} />
        )}
        {style.decorations.includes("clock") && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-stone-700">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-stone-800 origin-bottom"
              style={{ transform: `rotate(${smokeFrame * 90}deg)` }} />
          </div>
        )}
        {style.decorations.includes("columns") && (
          <>
            <div className="absolute -left-1 bottom-0 w-1.5 h-full bg-stone-300 border-l border-stone-400" />
            <div className="absolute -right-1 bottom-0 w-1.5 h-full bg-stone-300 border-r border-stone-200" />
          </>
        )}
        {style.decorations.includes("crates") && (
          <div className="absolute -right-3 bottom-0 w-3 h-3 bg-amber-600 border border-amber-800" />
        )}
        {style.decorations.includes("towers") && (
          <>
            <div className="absolute -left-3 -top-4 w-4 h-12 bg-stone-500 border-2 border-stone-600">
              <div className="absolute -top-2 left-0 w-full flex justify-center gap-0.5">
                <div className="w-1 h-2 bg-stone-400" />
                <div className="w-1 h-2 bg-stone-400" />
              </div>
            </div>
            <div className="absolute -right-3 -top-4 w-4 h-12 bg-stone-500 border-2 border-stone-600">
              <div className="absolute -top-2 left-0 w-full flex justify-center gap-0.5">
                <div className="w-1 h-2 bg-stone-400" />
                <div className="w-1 h-2 bg-stone-400" />
              </div>
            </div>
          </>
        )}
        {/* Bank decorations */}
        {style.decorations.includes("pillars") && (
          <>
            <div className="absolute -left-2 bottom-0 w-2 h-full flex flex-col items-center">
              <div className="w-3 h-1.5 bg-stone-300 border border-stone-400" />
              <div className="w-2 h-full bg-stone-200 border-x border-stone-300" />
              <div className="w-3 h-1.5 bg-stone-300 border border-stone-400" />
            </div>
            <div className="absolute -right-2 bottom-0 w-2 h-full flex flex-col items-center">
              <div className="w-3 h-1.5 bg-stone-300 border border-stone-400" />
              <div className="w-2 h-full bg-stone-200 border-x border-stone-300" />
              <div className="w-3 h-1.5 bg-stone-300 border border-stone-400" />
            </div>
          </>
        )}
        {/* Blacksmith decorations */}
        {style.decorations.includes("anvil") && (
          <div className="absolute -right-4 bottom-0">
            <div className="w-4 h-2 bg-stone-700 border border-stone-800" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-stone-600" />
          </div>
        )}
        {style.decorations.includes("bellows") && (
          <div className="absolute -left-3 bottom-1 w-3 h-4 bg-amber-700 rounded-t border border-amber-800">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-2 bg-amber-900" />
          </div>
        )}
        {/* Inn decorations */}
        {style.decorations.includes("barrel") && (
          <div className="absolute -right-4 bottom-0 w-4 h-5 bg-amber-700 rounded border-2 border-amber-900">
            <div className="absolute top-1 left-0 right-0 h-0.5 bg-amber-900" />
            <div className="absolute bottom-1 left-0 right-0 h-0.5 bg-amber-900" />
          </div>
        )}
        {style.decorations.includes("lamp") && (
          <div className="absolute -right-1 top-0 w-2 h-3 bg-yellow-300 rounded-b animate-pulse"
            style={{ boxShadow: '0 0 10px rgba(253, 224, 71, 0.7)' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-stone-600" />
          </div>
        )}
      </>
    );
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
        isPressed ? "translate-y-1" : isHovered ? "-translate-y-2" : "",
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
        {style.hasChimney && (
          <div className="absolute -top-4 right-1 z-20">
            <div className="w-3 h-5 bg-stone-600 border-l-2 border-t-2 border-stone-500 border-r-2 border-b-2 border-r-stone-700 border-b-stone-700" />
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
        )}

        {/* Roof */}
        {renderRoof()}

        {/* Building body with deep shading */}
        <div className={cn(
          "relative",
          config.body,
          variant === "featured" 
            ? "bg-amber-50" 
            : wallColor.replace("from-", "bg-").split(" ")[0]
        )} style={{ 
          boxShadow: `
            inset -6px 0 0 rgba(0,0,0,0.15),
            inset 6px 0 0 rgba(255,255,255,0.1),
            inset 0 -6px 0 rgba(0,0,0,0.1),
            inset 0 6px 0 rgba(255,255,255,0.05),
            6px 6px 0 rgba(0,0,0,0.35),
            3px 3px 0 rgba(0,0,0,0.2)
          `,
          border: '4px solid',
          borderColor: variant === "featured" 
            ? '#fde68a #d97706 #d97706 #fde68a'
            : '#fef3c7 #d97706 #d97706 #fef3c7'
        }}>
          {/* Windows */}
          {renderWindows()}

          {/* Pixel door with depth */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-7 bg-amber-700"
            style={{ 
              boxShadow: 'inset -2px 0 0 #92400e, inset 2px 0 0 #b45309, inset 0 -2px 0 #78350f',
              borderRadius: buildingStyle === "tower" ? '4px 4px 0 0' : '0'
            }}>
            <div className="absolute top-2.5 right-0.5 w-1 h-1 bg-yellow-400 rounded-full" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-900" />
          </div>

          {/* Icon with enhanced pixel border */}
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "bg-white/95 p-2 transition-transform duration-100",
            isHovered && "scale-110"
          )} style={{
            boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.1), 2px 2px 0 rgba(0,0,0,0.2)',
            border: '2px solid',
            borderColor: '#fff #9ca3af #9ca3af #fff'
          }}>
            <div className={cn(
              config.iconSize,
              variant === "featured" ? "text-amber-600" : "text-primary",
              "flex items-center justify-center drop-shadow-sm"
            )}>
              {icon}
            </div>
          </div>

          {/* Decorations */}
          {renderDecorations()}
        </div>

        {/* Ground shadow - enhanced depth */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[120%] h-3 bg-gradient-radial from-black/30 to-transparent rounded-full blur-sm" />
      </div>

      {/* Pixel-style label with depth */}
      <div className={cn(
        "mt-3 font-bold bg-stone-800 text-white",
        "whitespace-nowrap",
        config.label
      )} style={{ 
        fontFamily: "'VT323', monospace",
        boxShadow: '3px 3px 0 #0c0a09, inset -2px -2px 0 #44403c, inset 2px 2px 0 #57534e',
        border: '2px solid #292524'
      }}>
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

// Avatar customization data
const SKIN_TONES = ['#FFDBB4', '#E8B98D', '#D08B5B', '#AE5D29', '#614335', '#3D2314'];
const HAIR_COLORS = ['#2C1810', '#4A3728', '#8B4513', '#D4A574', '#FFD700', '#FF6B6B', '#9B59B6', '#3498DB'];
const OUTFIT_COLORS = [
  { primary: '#3B82F6', secondary: '#2563EB', accent: '#60A5FA' }, // Blue T-shirt
  { primary: '#FFFFFF', secondary: '#E5E7EB', accent: '#9CA3AF' }, // White Shirt
  { primary: '#F59E0B', secondary: '#D97706', accent: '#FCD34D' }, // Uniform
  { primary: '#1F2937', secondary: '#111827', accent: '#4B5563' }, // Jacket
  { primary: '#EC4899', secondary: '#DB2777', accent: '#F472B6' }, // Dress
  { primary: '#DC2626', secondary: '#B91C1C', accent: '#F87171' }, // Hero Cape
];
const ACCESSORY_ITEMS = ['none', 'glasses', 'bow', 'crown', 'halo', 'flame', 'diamond', 'wings'];

// Animated pixel character that reflects user's avatar config
interface TownAvatarProps {
  className?: string;
  onClick?: () => void;
  avatarConfig?: {
    skinTone: number;
    hairStyle: number;
    hairColor: number;
    outfit: number;
    accessory: number;
    background: number;
  };
}

export function TownAvatar({ className = "", onClick, avatarConfig }: TownAvatarProps) {
  const [walkFrame, setWalkFrame] = useState(0);
  const [bounce, setBounce] = useState(false);
  const [idleFrame, setIdleFrame] = useState(0);
  
  // Default config
  const config = avatarConfig || {
    skinTone: 0,
    hairStyle: 0,
    hairColor: 0,
    outfit: 0,
    accessory: 0,
    background: 0,
  };

  const skinColor = SKIN_TONES[config.skinTone] || SKIN_TONES[0];
  const hairColor = HAIR_COLORS[config.hairColor] || HAIR_COLORS[0];
  const outfit = OUTFIT_COLORS[config.outfit] || OUTFIT_COLORS[0];
  const accessory = ACCESSORY_ITEMS[config.accessory] || 'none';
  
  useEffect(() => {
    const interval = setInterval(() => {
      setWalkFrame(prev => (prev + 1) % 2);
    }, 400);
    const idleInterval = setInterval(() => {
      setIdleFrame(prev => (prev + 1) % 4);
    }, 800);
    return () => {
      clearInterval(interval);
      clearInterval(idleInterval);
    };
  }, []);

  const handleClick = () => {
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
    onClick?.();
  };

  // Hair style variations
  const renderHair = () => {
    const styles = [
      // Style 0: Short spiky
      <div key="hair" className="absolute -top-2 left-0 right-0 flex justify-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-1.5 h-3" style={{ backgroundColor: hairColor, transform: `rotate(${(i-2)*8}deg)` }} />
        ))}
      </div>,
      // Style 1: Slicked back
      <div key="hair" className="absolute -top-1 left-0 right-0 h-3 rounded-t" style={{ backgroundColor: hairColor }}>
        <div className="absolute top-0 right-0 w-2 h-4 rounded-br-lg" style={{ backgroundColor: hairColor }} />
      </div>,
      // Style 2: Long flowing
      <div key="hair" className="absolute -top-1 left-0 right-0">
        <div className="h-2 rounded-t-full" style={{ backgroundColor: hairColor }} />
        <div className="absolute -left-1 top-2 w-3 h-8 rounded-b" style={{ backgroundColor: hairColor, transform: `rotate(${idleFrame % 2 === 0 ? -3 : 3}deg)` }} />
        <div className="absolute -right-1 top-2 w-3 h-8 rounded-b" style={{ backgroundColor: hairColor, transform: `rotate(${idleFrame % 2 === 0 ? 3 : -3}deg)` }} />
      </div>,
      // Style 3: Beard style
      <div key="hair" className="absolute -top-1 left-0 right-0">
        <div className="h-2 rounded-t" style={{ backgroundColor: hairColor }} />
        <div className="absolute -bottom-6 left-1 right-1 h-3 rounded-b" style={{ backgroundColor: hairColor, opacity: 0.8 }} />
      </div>,
      // Style 4: Blonde wavy
      <div key="hair" className="absolute -top-2 left-0 right-0 flex justify-center">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-2 h-4 rounded-full -mx-0.5" style={{ backgroundColor: hairColor }} />
        ))}
      </div>,
      // Style 5: Young/short
      <div key="hair" className="absolute -top-1 left-1 right-1 h-2 rounded-t-full" style={{ backgroundColor: hairColor }} />,
    ];
    return styles[config.hairStyle % styles.length];
  };

  // Accessory rendering
  const renderAccessory = () => {
    switch (accessory) {
      case 'glasses':
        return (
          <div className="absolute top-3.5 left-0 right-0 flex justify-center gap-0.5">
            <div className="w-2.5 h-2 rounded-sm border-2 border-stone-800 bg-sky-200/30" />
            <div className="w-1 h-0.5 bg-stone-800 self-center" />
            <div className="w-2.5 h-2 rounded-sm border-2 border-stone-800 bg-sky-200/30" />
          </div>
        );
      case 'bow':
        return (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div className="w-4 h-2 flex">
              <div className="w-2 h-2 bg-pink-400 rounded-full border border-pink-600" />
              <div className="w-2 h-2 bg-pink-400 rounded-full border border-pink-600 -ml-0.5" />
            </div>
            <div className="w-1 h-1 bg-pink-500 rounded-full mx-auto -mt-1.5" />
          </div>
        );
      case 'crown':
        return (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="flex gap-0.5 items-end">
              <div className="w-1 h-3 bg-yellow-400 border-l border-yellow-500" />
              <div className="w-1.5 h-4 bg-yellow-400 border-l border-yellow-500" />
              <div className="w-1 h-3 bg-yellow-400 border-r border-yellow-600" />
            </div>
            <div className="w-4 h-1 bg-yellow-500 -mt-0.5" />
          </div>
        );
      case 'halo':
        return (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full border-2 border-yellow-300 bg-yellow-200/30 animate-pulse" />
        );
      case 'flame':
        return (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" style={{ animationDuration: '0.3s' }}>
            <div className="w-2 h-4 bg-gradient-to-t from-red-500 via-orange-400 to-yellow-300 rounded-t-full" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          </div>
        );
      case 'diamond':
        return (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-300 rotate-45 border border-cyan-500 animate-pulse" />
        );
      case 'wings':
        return (
          <>
            <div className="absolute top-8 -left-4 w-5 h-8 bg-gradient-to-r from-purple-400 to-pink-300 rounded-l-full opacity-80" 
              style={{ transform: `rotate(${idleFrame % 2 === 0 ? -10 : -5}deg)` }} />
            <div className="absolute top-8 -right-4 w-5 h-8 bg-gradient-to-l from-purple-400 to-pink-300 rounded-r-full opacity-80"
              style={{ transform: `rotate(${idleFrame % 2 === 0 ? 10 : 5}deg)` }} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={cn(
        "relative flex flex-col items-center transition-transform cursor-pointer",
        bounce && "animate-bounce",
        className
      )}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Ground shadow with gradient */}
      <div className="absolute bottom-0 w-12 h-3 bg-gradient-radial from-black/40 to-transparent rounded-full blur-sm" />
      
      {/* Character body - detailed pixel art style */}
      <div className="relative" style={{ transform: `translateY(${walkFrame === 0 ? 0 : -2}px)` }}>
        {/* Accessory behind */}
        {accessory === 'wings' && renderAccessory()}
        
        {/* Head with detailed shading */}
        <div 
          className="relative w-10 h-10 rounded-sm"
          style={{ 
            backgroundColor: skinColor,
            boxShadow: `
              inset -4px 0 0 rgba(0,0,0,0.15),
              inset 0 -4px 0 rgba(0,0,0,0.1),
              inset 4px 0 0 rgba(255,255,255,0.1),
              inset 0 4px 0 rgba(255,255,255,0.1),
              2px 2px 4px rgba(0,0,0,0.2)
            `
          }}
        >
          {/* Hair */}
          {renderHair()}
          
          {/* Eye whites */}
          <div className="absolute top-4 left-1.5 w-2.5 h-2 bg-white rounded-full" />
          <div className="absolute top-4 right-1.5 w-2.5 h-2 bg-white rounded-full" />
          
          {/* Pupils with shine */}
          <div className="absolute top-4.5 left-2 w-1.5 h-1.5 bg-stone-900 rounded-full">
            <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-white rounded-full" />
          </div>
          <div className="absolute top-4.5 right-2 w-1.5 h-1.5 bg-stone-900 rounded-full">
            <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-white rounded-full" />
          </div>
          
          {/* Blush */}
          <div className="absolute top-6 left-0.5 w-2 h-1 bg-pink-300/50 rounded-full" />
          <div className="absolute top-6 right-0.5 w-2 h-1 bg-pink-300/50 rounded-full" />
          
          {/* Mouth - changes with idle */}
          {idleFrame === 0 ? (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-1 bg-red-400 rounded-full" />
          ) : (
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-1.5 bg-red-400 rounded-b-full" />
          )}
          
          {/* Nose highlight */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-1 h-1.5 bg-black/10 rounded-full" />
        </div>
        
        {/* Body with outfit */}
        <div 
          className="w-10 h-12 -mt-1 relative"
          style={{ 
            backgroundColor: outfit.primary,
            boxShadow: `
              inset -4px 0 0 ${outfit.secondary},
              inset 4px 0 0 ${outfit.accent},
              inset 0 -4px 0 ${outfit.secondary},
              2px 2px 4px rgba(0,0,0,0.2)
            `
          }}
        >
          {/* Collar/neckline */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2" 
            style={{ backgroundColor: outfit.accent, borderRadius: '0 0 4px 4px' }} />
          
          {/* Outfit details based on type */}
          {config.outfit === 1 && ( // Shirt buttons
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col gap-1">
              <div className="w-1 h-1 rounded-full bg-stone-400" />
              <div className="w-1 h-1 rounded-full bg-stone-400" />
            </div>
          )}
          {config.outfit === 5 && ( // Cape
            <div className="absolute -left-2 top-0 w-14 h-14 bg-red-600 rounded-b-lg -z-10 opacity-90"
              style={{ transform: `skewX(${idleFrame % 2 === 0 ? -3 : 3}deg)` }} />
          )}
          
          {/* Arms with shading */}
          <div className="absolute -left-2 top-1 w-2 h-8 rounded-b"
            style={{ 
              backgroundColor: outfit.primary,
              boxShadow: `inset -1px 0 0 ${outfit.secondary}`,
              transform: `rotate(${walkFrame === 0 ? 5 : -5}deg)`
            }} />
          <div className="absolute -right-2 top-1 w-2 h-8 rounded-b"
            style={{ 
              backgroundColor: outfit.primary,
              boxShadow: `inset 1px 0 0 ${outfit.accent}`,
              transform: `rotate(${walkFrame === 0 ? -5 : 5}deg)`
            }} />
          
          {/* Hands */}
          <div className="absolute -left-2 top-8 w-2 h-2 rounded-full" style={{ backgroundColor: skinColor }} />
          <div className="absolute -right-2 top-8 w-2 h-2 rounded-full" style={{ backgroundColor: skinColor }} />
        </div>
        
        {/* Legs with walking animation */}
        <div className="flex gap-1 justify-center -mt-0.5">
          <div 
            className="w-3.5 h-6 bg-stone-700 rounded-b"
            style={{ 
              boxShadow: 'inset -2px 0 0 #1f2937, inset 2px 0 0 #4b5563',
              transform: `rotate(${walkFrame === 0 ? 8 : -8}deg)`,
              transformOrigin: 'top'
            }} 
          />
          <div 
            className="w-3.5 h-6 bg-stone-700 rounded-b"
            style={{ 
              boxShadow: 'inset -2px 0 0 #1f2937, inset 2px 0 0 #4b5563',
              transform: `rotate(${walkFrame === 0 ? -8 : 8}deg)`,
              transformOrigin: 'top'
            }}
          />
        </div>
        
        {/* Shoes */}
        <div className="flex gap-2 justify-center -mt-0.5">
          <div className="w-4 h-2 bg-amber-800 rounded-sm" style={{ boxShadow: 'inset -1px 0 0 #78350f' }} />
          <div className="w-4 h-2 bg-amber-800 rounded-sm" style={{ boxShadow: 'inset 1px 0 0 #92400e' }} />
        </div>
        
        {/* Accessory in front */}
        {accessory !== 'wings' && renderAccessory()}
      </div>
      
      {/* Name tag */}
      <div className="mt-2 px-2 py-0.5 bg-stone-800 text-yellow-400 text-[10px] font-bold rounded border-2 border-l-stone-600 border-t-stone-600 border-r-stone-900 border-b-stone-900"
        style={{ fontFamily: "'VT323', monospace", boxShadow: '2px 2px 0 #1c1917' }}>
        YOU
      </div>
    </button>
  );
}

// Legacy PixelCharacter for backward compatibility
export function PixelCharacter({ className = "", onClick }: { className?: string, onClick?: () => void }) {
  return <TownAvatar className={className} onClick={onClick} />;
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