import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ServiceCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
  variant?: "default" | "featured" | "accent" | "success" | "muted";
  badge?: string | number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ServiceCard({
  icon,
  title,
  description,
  onClick,
  variant = "default",
  badge,
  className,
  size = "md",
}: ServiceCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeConfig = {
    sm: {
      wrapper: "p-3",
      iconWrapper: "h-10 w-10",
      iconSize: "h-5 w-5",
      title: "text-sm font-semibold",
      description: "text-xs",
    },
    md: {
      wrapper: "p-4",
      iconWrapper: "h-12 w-12",
      iconSize: "h-6 w-6",
      title: "text-base font-semibold",
      description: "text-sm",
    },
    lg: {
      wrapper: "p-5",
      iconWrapper: "h-14 w-14",
      iconSize: "h-7 w-7",
      title: "text-lg font-bold",
      description: "text-sm",
    },
  };

  const variantConfig = {
    default: {
      wrapper: "bg-card hover:bg-card/80 border border-border",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    featured: {
      wrapper: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg",
      iconBg: "bg-white/20",
      iconColor: "text-white",
    },
    accent: {
      wrapper: "bg-accent/10 hover:bg-accent/20 border border-accent/20",
      iconBg: "bg-accent/20",
      iconColor: "text-accent",
    },
    success: {
      wrapper: "bg-success/10 hover:bg-success/20 border border-success/20",
      iconBg: "bg-success/20",
      iconColor: "text-success",
    },
    muted: {
      wrapper: "bg-muted hover:bg-muted/80 border border-border",
      iconBg: "bg-muted-foreground/10",
      iconColor: "text-muted-foreground",
    },
  };

  const config = sizeConfig[size];
  const variantStyles = variantConfig[variant];

  const handleClick = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative w-full rounded-2xl transition-all duration-200 text-left",
        "active:scale-[0.98] hover:shadow-md",
        variantStyles.wrapper,
        config.wrapper,
        isPressed && "scale-[0.98]",
        className
      )}
    >
      {/* Badge */}
      {badge && (
        <span className={cn(
          "absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold",
          variant === "featured" 
            ? "bg-accent text-accent-foreground" 
            : "bg-primary text-primary-foreground"
        )}>
          {badge}
        </span>
      )}

      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={cn(
          "flex items-center justify-center rounded-xl flex-shrink-0 transition-transform group-hover:scale-110",
          variantStyles.iconBg,
          config.iconWrapper
        )}>
          <div className={cn(variantStyles.iconColor, config.iconSize)}>
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            config.title,
            variant === "featured" ? "text-white" : "text-foreground"
          )}>
            {title}
          </h3>
          {description && (
            <p className={cn(
              config.description,
              variant === "featured" ? "text-white/80" : "text-muted-foreground"
            )}>
              {description}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className={cn(
          "h-5 w-5 flex-shrink-0 transition-transform",
          variant === "featured" ? "text-white/60" : "text-muted-foreground"
        )} />
      </div>
    </button>
  );
}

// Quick action button for smaller actions
interface QuickActionProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "accent";
}

export function QuickAction({ icon, label, onClick, variant = "default" }: QuickActionProps) {
  const variantStyles = {
    default: "bg-card border border-border hover:bg-muted text-foreground",
    primary: "bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary",
    accent: "bg-accent/10 border border-accent/20 hover:bg-accent/20 text-accent",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200",
        "active:scale-95 hover:shadow-sm",
        variantStyles[variant]
      )}
    >
      <div className="h-6 w-6">{icon}</div>
      <span className="text-xs font-medium text-center">{label}</span>
    </button>
  );
}
