import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  showNav?: boolean;
  /** Use wide layout for tablet/desktop (default: true) */
  wide?: boolean;
}

export function PageContainer({ children, className, showNav = true, wide = true }: PageContainerProps) {
  return (
    <div
      className={cn(
        "min-h-screen gradient-hero",
        showNav && "pb-24 sm:pb-28",
        className
      )}
    >
      <div className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 safe-top",
        wide 
          ? "max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl" 
          : "max-w-lg"
      )}>
        {children}
      </div>
    </div>
  );
}
