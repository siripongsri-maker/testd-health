import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Check, X, Pill, Clock } from "lucide-react";

interface TaskCardProps {
  title: string;
  subtitle?: string;
  onTaken: () => void;
  onSkipped: () => void;
  status?: "pending" | "taken" | "skipped";
  className?: string;
}

export function TaskCard({ title, subtitle, onTaken, onSkipped, status = "pending", className }: TaskCardProps) {
  if (status !== "pending") {
    return (
      <div
        className={cn(
          "rounded-2xl border-2 p-6 shadow-card animate-scale-in",
          status === "taken" ? "border-success/30 bg-success/10" : "border-muted bg-muted/50",
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              status === "taken" ? "bg-success" : "bg-muted"
            )}
          >
            {status === "taken" ? (
              <Check className="h-7 w-7 text-primary-foreground" />
            ) : (
              <X className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {status === "taken" ? "Great job! +10 XP" : "Skipped today"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-card animate-scale-in",
        className
      )}
    >
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary animate-glow">
          <Pill className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
          {subtitle && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button variant="success" size="lg" onClick={onTaken} className="gap-2">
          <Check className="h-5 w-5" />
          Taken
        </Button>
        <Button variant="secondary" size="lg" onClick={onSkipped} className="gap-2">
          <X className="h-5 w-5" />
          Skipped
        </Button>
      </div>
    </div>
  );
}
