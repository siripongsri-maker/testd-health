import { cn } from "@/lib/utils";
import { ReactNode, useState, useEffect } from "react";
import { ResponsiveViewToggle } from "./ResponsiveViewToggle";
import { useIsMobile } from "@/hooks/use-mobile";


type ViewMode = "mobile" | "tablet" | "desktop";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  showNav?: boolean;
  showViewToggle?: boolean;
}

export function PageContainer({ children, className, showNav = true, showViewToggle = false }: PageContainerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("mobile");
  const isMobile = useIsMobile();

  useEffect(() => {
    const saved = localStorage.getItem("responsive-view-mode") as ViewMode | null;
    if (saved) setViewMode(saved);
  }, []);

  // On actual mobile/tablet devices, use full width. Only apply constraints on desktop for preview purposes.
  const getContainerClass = () => {
    // If on actual mobile device, don't constrain width
    if (isMobile) {
      return "max-w-full";
    }
    
    switch (viewMode) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
        return "max-w-[1200px]";
      default:
        return "max-w-full";
    }
  };

  // Only show toggle on desktop screens (for preview purposes)
  const shouldShowToggle = showViewToggle && !isMobile;

  return (
    <div
      className={cn(
        "min-h-screen gradient-hero relative",
        className
      )}
    >
      {shouldShowToggle && (
        <div className="sticky top-0 z-50 flex justify-center py-2 glass-heavy border-b border-border/30">
          <ResponsiveViewToggle onViewChange={setViewMode} />
        </div>
      )}
      <div className={cn("mx-auto px-4 py-6 safe-top transition-all duration-300", getContainerClass())}>
        {children}
      </div>
    </div>
  );
}
