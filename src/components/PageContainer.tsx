import { cn } from "@/lib/utils";
import { ReactNode, useState, useEffect } from "react";
import { ResponsiveViewToggle } from "./ResponsiveViewToggle";

type ViewMode = "mobile" | "tablet" | "desktop";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  showNav?: boolean;
  showViewToggle?: boolean;
}

export function PageContainer({ children, className, showNav = true, showViewToggle = true }: PageContainerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("mobile");

  useEffect(() => {
    const saved = localStorage.getItem("responsive-view-mode") as ViewMode | null;
    if (saved) setViewMode(saved);
  }, []);

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

  return (
    <div
      className={cn(
        "min-h-screen gradient-hero",
        showNav && "pb-24",
        className
      )}
    >
      {showViewToggle && (
        <div className="sticky top-0 z-50 flex justify-center py-2 bg-background/80 backdrop-blur-sm border-b border-border/30">
          <ResponsiveViewToggle onViewChange={setViewMode} />
        </div>
      )}
      <div className={cn("mx-auto px-4 py-6 safe-top transition-all duration-300", getContainerClass())}>
        {children}
      </div>
    </div>
  );
}
