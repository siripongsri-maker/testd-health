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
        "flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-soft active:scale-[0.98]",
        className
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
