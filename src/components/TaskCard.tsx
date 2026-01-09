import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Check, X, Pill, Clock, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface TaskCardProps {
  title: string;
  subtitle?: string;
  onTaken: () => void;
  onSkipped: () => void;
  status?: "pending" | "taken" | "skipped";
  className?: string;
}

export function TaskCard({ title, subtitle, onTaken, onSkipped, status = "pending", className }: TaskCardProps) {
  const { language } = useLanguage();

  if (status !== "pending") {
    return (
      <div
        className={cn(
          "rounded-2xl border p-6 transition-all duration-300",
          status === "taken" 
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 dark:border-emerald-800/30" 
            : "border-border bg-muted/30",
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300",
              status === "taken" 
                ? "bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30" 
                : "bg-muted"
            )}
          >
            {status === "taken" ? (
              <Check className="h-7 w-7 text-white" />
            ) : (
              <X className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className={cn(
              "text-sm flex items-center gap-1",
              status === "taken" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}>
              {status === "taken" ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  {language === 'th' ? 'เยี่ยมมาก! +10 XP' : 'Great job! +10 XP'}
                </>
              ) : (
                language === 'th' ? 'ข้ามไปวันนี้' : 'Skipped today'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 transition-all duration-200",
        className
      )}
    >
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
          <Pill className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {subtitle && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          size="lg" 
          onClick={onTaken} 
          className="gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 rounded-xl h-12"
        >
          <Check className="h-5 w-5" />
          {language === 'th' ? 'กินแล้ว' : 'Taken'}
        </Button>
        <Button 
          variant="secondary" 
          size="lg" 
          onClick={onSkipped} 
          className="gap-2 rounded-xl h-12"
        >
          <X className="h-5 w-5" />
          {language === 'th' ? 'ข้าม' : 'Skipped'}
        </Button>
      </div>
    </div>
  );
}
