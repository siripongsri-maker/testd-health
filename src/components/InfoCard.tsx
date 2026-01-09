import { cn } from "@/lib/utils";
import { ChevronRight, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  className?: string;
}

export function InfoCard({ icon: Icon, title, description, to, className }: InfoCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg active:scale-[0.98]",
        className
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors duration-200">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
    </Link>
  );
}
