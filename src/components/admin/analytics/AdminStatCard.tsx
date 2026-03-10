import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  label: string;
  value: number;
  previousValue?: number | null;
  icon?: React.ElementType;
  iconColor?: string;
  loading?: boolean;
  suffix?: string;
  /** Format value as percentage */
  isRate?: boolean;
}

export function AdminStatCard({
  label,
  value,
  previousValue,
  icon: Icon,
  iconColor = "text-primary",
  loading,
  suffix,
  isRate,
}: Props) {
  if (loading) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-3">
          <Skeleton className="h-4 w-4 mb-2" />
          <Skeleton className="h-6 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  // Calculate trend
  let trendPct: number | null = null;
  let trendDirection: "up" | "down" | "flat" = "flat";
  if (previousValue !== undefined && previousValue !== null) {
    if (previousValue === 0) {
      trendPct = value > 0 ? 100 : 0;
    } else {
      trendPct = Math.round(((value - previousValue) / previousValue) * 100);
    }
    trendDirection = trendPct > 0 ? "up" : trendPct < 0 ? "down" : "flat";
  }

  return (
    <Card className="border border-border/50 relative overflow-hidden">
      <CardContent className="p-3">
        {Icon && (
          <div className="flex items-center justify-between mb-1">
            <Icon className={cn("h-4 w-4", iconColor)} />
            {trendPct !== null && (
              <div className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium",
                trendDirection === "up" ? "text-emerald-600" :
                trendDirection === "down" ? "text-red-500" :
                "text-muted-foreground"
              )}>
                {trendDirection === "up" && <TrendingUp className="h-3 w-3" />}
                {trendDirection === "down" && <TrendingDown className="h-3 w-3" />}
                {trendDirection === "flat" && <Minus className="h-3 w-3" />}
                {trendPct > 0 ? "+" : ""}{trendPct}%
              </div>
            )}
          </div>
        )}
        <div className="text-xl font-bold text-foreground">
          {isRate ? `${value}%` : <AnimatedCounter value={value} duration={600} />}
          {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
        {previousValue !== undefined && previousValue !== null && (
          <p className="text-[9px] text-muted-foreground mt-0.5">
            prev: {isRate ? `${previousValue}%` : previousValue.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
