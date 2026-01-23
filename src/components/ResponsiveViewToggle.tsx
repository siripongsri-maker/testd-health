import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Tablet, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "mobile" | "tablet" | "desktop";

const VIEW_MODES: { mode: ViewMode; icon: typeof Smartphone; label: string; width: string }[] = [
  { mode: "mobile", icon: Smartphone, label: "Mobile", width: "max-w-[375px]" },
  { mode: "tablet", icon: Tablet, label: "iPad", width: "max-w-[768px]" },
  { mode: "desktop", icon: Monitor, label: "Desktop", width: "max-w-full" },
];

interface ResponsiveViewToggleProps {
  onViewChange?: (mode: ViewMode) => void;
}

export function ResponsiveViewToggle({ onViewChange }: ResponsiveViewToggleProps) {
  const [activeMode, setActiveMode] = useState<ViewMode>("mobile");

  const handleModeChange = (mode: ViewMode) => {
    setActiveMode(mode);
    onViewChange?.(mode);
    
    // Store preference
    localStorage.setItem("responsive-view-mode", mode);
  };

  useEffect(() => {
    const saved = localStorage.getItem("responsive-view-mode") as ViewMode | null;
    if (saved && VIEW_MODES.some(v => v.mode === saved)) {
      setActiveMode(saved);
      onViewChange?.(saved);
    }
  }, [onViewChange]);

  return (
    <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50">
      {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
        <Button
          key={mode}
          variant="ghost"
          size="sm"
          onClick={() => handleModeChange(mode)}
          className={cn(
            "h-8 px-3 gap-1.5 rounded-lg transition-all",
            activeMode === mode
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}

export function useResponsiveView() {
  const [viewMode, setViewMode] = useState<ViewMode>("mobile");
  
  const getContainerClass = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
        return "max-w-[1200px]";
      default:
        return "max-w-lg";
    }
  };

  return { viewMode, setViewMode, getContainerClass };
}
