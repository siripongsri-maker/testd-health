import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { CalendarIcon, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangeWithCompare {
  current: DateRange;
  previous: DateRange | null;
  preset: string;
  compareEnabled: boolean;
}

const PRESETS = [
  { value: "this_month", labelEn: "This Month", labelTh: "เดือนนี้" },
  { value: "last_month", labelEn: "Last Month", labelTh: "เดือนก่อน" },
  { value: "last_3_months", labelEn: "Last 3 Months", labelTh: "3 เดือนล่าสุด" },
  { value: "last_6_months", labelEn: "Last 6 Months", labelTh: "6 เดือนล่าสุด" },
  { value: "this_year", labelEn: "This Year", labelTh: "ปีนี้" },
  { value: "last_7_days", labelEn: "Last 7 Days", labelTh: "7 วันล่าสุด" },
  { value: "last_30_days", labelEn: "Last 30 Days", labelTh: "30 วันล่าสุด" },
  { value: "custom", labelEn: "Custom Range", labelTh: "กำหนดเอง" },
];

/** Compute date range from preset key */
export function getPresetRange(preset: string): DateRange {
  const now = new Date();
  switch (preset) {
    case "this_month":
      return { from: startOfMonth(now), to: now };
    case "last_month": {
      const last = subMonths(now, 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    }
    case "last_3_months":
      return { from: startOfMonth(subMonths(now, 2)), to: now };
    case "last_6_months":
      return { from: startOfMonth(subMonths(now, 5)), to: now };
    case "this_year":
      return { from: startOfYear(now), to: now };
    case "last_7_days":
      return { from: subDays(now, 6), to: now };
    case "last_30_days":
      return { from: subDays(now, 29), to: now };
    default:
      return { from: startOfMonth(now), to: now };
  }
}

/** Calculate previous comparable period for trend comparison */
export function getPreviousPeriod(range: DateRange): DateRange {
  const durationMs = range.to.getTime() - range.from.getTime();
  const prevTo = new Date(range.from.getTime() - 1); // day before current start
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: prevFrom, to: prevTo };
}

interface Props {
  value: DateRangeWithCompare;
  onChange: (value: DateRangeWithCompare) => void;
  showCompare?: boolean;
  className?: string;
}

export function AdminDateRangeFilter({ value, onChange, showCompare = true, className }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";

  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      onChange({ ...value, preset });
      return;
    }
    const current = getPresetRange(preset);
    const previous = value.compareEnabled ? getPreviousPeriod(current) : null;
    onChange({ current, previous, preset, compareEnabled: value.compareEnabled });
  };

  const handleCompareToggle = (enabled: boolean) => {
    const previous = enabled ? getPreviousPeriod(value.current) : null;
    onChange({ ...value, compareEnabled: enabled, previous });
  };

  const handleCustomFrom = (date: Date | undefined) => {
    if (!date) return;
    const current = { from: date, to: value.current.to };
    const previous = value.compareEnabled ? getPreviousPeriod(current) : null;
    onChange({ ...value, current, previous, preset: "custom" });
  };

  const handleCustomTo = (date: Date | undefined) => {
    if (!date) return;
    const current = { from: value.current.from, to: date };
    const previous = value.compareEnabled ? getPreviousPeriod(current) : null;
    onChange({ ...value, current, previous, preset: "custom" });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* Preset selector */}
      <Select value={value.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {isTh ? p.labelTh : p.labelEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom date pickers */}
      {value.preset === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(value.current.from, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.current.from}
                onSelect={handleCustomFrom}
                disabled={(d) => d > value.current.to || d > new Date()}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(value.current.to, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.current.to}
                onSelect={handleCustomTo}
                disabled={(d) => d < value.current.from || d > new Date()}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Compare toggle */}
      {showCompare && (
        <div className="flex items-center gap-2 ml-auto">
          <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="compare-toggle" className="text-xs text-muted-foreground cursor-pointer">
            {isTh ? "เปรียบเทียบ" : "Compare"}
          </Label>
          <Switch
            id="compare-toggle"
            checked={value.compareEnabled}
            onCheckedChange={handleCompareToggle}
            className="scale-75"
          />
        </div>
      )}

      {/* Display range info */}
      <span className="text-[10px] text-muted-foreground hidden md:inline">
        {format(value.current.from, "d MMM yyyy")} – {format(value.current.to, "d MMM yyyy")}
        {value.compareEnabled && value.previous && (
          <> vs {format(value.previous.from, "d MMM")} – {format(value.previous.to, "d MMM")}</>
        )}
      </span>
    </div>
  );
}

/** Hook to initialize date range state with default preset */
export function useAdminDateRange(defaultPreset = "this_month") {
  const current = getPresetRange(defaultPreset);
  const [range, setRange] = useState<DateRangeWithCompare>({
    current,
    previous: null,
    preset: defaultPreset,
    compareEnabled: false,
  });
  return [range, setRange] as const;
}
