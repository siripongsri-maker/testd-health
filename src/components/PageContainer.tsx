import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  showNav?: boolean;
}

export function PageContainer({ children, className, showNav = true }: PageContainerProps) {
  return (
    <div
      className={cn(
        "min-h-screen gradient-hero",
        showNav && "pb-24",
        className
      )}
    >
      <div className="mx-auto max-w-lg px-4 py-6 safe-top">
        {children}
      </div>
    </div>
  );
}
