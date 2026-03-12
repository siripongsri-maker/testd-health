import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Timer, Plus } from "lucide-react";
import { trackEvent } from "@/hooks/useAnalytics";

interface DoseLog {
  substance: string;
  time: string; // ISO
}

const SUBSTANCE_INTERVALS: Record<string, { minutes: number; labelTh: string; labelEn: string }> = {
  meth: { minutes: 240, labelTh: "ไอซ์ / เมท", labelEn: "Crystal Meth" },
  ghb: { minutes: 90, labelTh: "GHB / G", labelEn: "GHB / G" },
  mdma: { minutes: 180, labelTh: "MDMA / Ecstasy", labelEn: "MDMA / Ecstasy" },
  poppers: { minutes: 15, labelTh: "Poppers", labelEn: "Poppers" },
  ketamine: { minutes: 60, labelTh: "คีตามีน", labelEn: "Ketamine" },
  alcohol: { minutes: 60, labelTh: "แอลกอฮอล์", labelEn: "Alcohol" },
};

const STORAGE_KEY = "hr_dose_logs";

export function DoseTimer() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [logs, setLogs] = useState<DoseLog[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  });
  const [selectedSubstance, setSelectedSubstance] = useState("ghb");
  const [now, setNow] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-20)));
  }, [logs]);

  const lastLog = logs.filter((l) => l.substance === selectedSubstance).slice(-1)[0];
  const interval = SUBSTANCE_INTERVALS[selectedSubstance];
  const safeTime = lastLog ? new Date(lastLog.time).getTime() + interval.minutes * 60000 : 0;
  const remaining = Math.max(0, safeTime - now);
  const isSafe = remaining <= 0;

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const mins = m % 60;
    if (h > 0) return `${h}h ${mins}m`;
    return `${mins}m`;
  };

  const logDose = () => {
    if (!isSafe && lastLog) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
      return;
    }
    const entry: DoseLog = { substance: selectedSubstance, time: new Date().toISOString() };
    setLogs((prev) => [...prev, entry]);
    trackEvent("hr_dose_logged", { substance: selectedSubstance });
  };

  return (
    <Card className="border border-border/40">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">
            {isEn ? "Dose Timer" : "ตัวจับเวลาโดส"}
          </h3>
        </div>

        {/* Substance selector */}
        <select
          value={selectedSubstance}
          onChange={(e) => setSelectedSubstance(e.target.value)}
          className="w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm"
        >
          {Object.entries(SUBSTANCE_INTERVALS).map(([key, val]) => (
            <option key={key} value={key}>
              {isEn ? val.labelEn : val.labelTh} ({val.minutes} min)
            </option>
          ))}
        </select>

        {/* Timer display */}
        {lastLog && (
          <div className={`p-4 rounded-2xl text-center space-y-1 ${
            isSafe
              ? "bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30"
              : "bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30"
          }`}>
            <p className="text-xs text-muted-foreground">
              {isEn ? "Last dose" : "โดสล่าสุด"}: {new Date(lastLog.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            {isSafe ? (
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {isEn ? "Safe interval passed" : "พ้นระยะเวลาที่แนะนำแล้ว"}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatTime(remaining)}</p>
                <p className="text-xs text-muted-foreground">
                  {isEn ? "recommended wait remaining" : "ระยะเวลาที่แนะนำให้รอ"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Warning */}
        {showWarning && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 animate-in fade-in duration-200">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive font-medium">
              {isEn
                ? "Please wait longer before taking another dose."
                : "กรุณารอก่อนใช้โดสถัดไป"}
            </p>
          </div>
        )}

        {/* Log button */}
        <Button onClick={logDose} variant="outline" className="w-full rounded-xl">
          <Plus className="h-4 w-4 mr-1" />
          {isEn ? "Log Dose Now" : "บันทึกโดส"}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          {isEn
            ? "Intervals are general safety guidelines, not medical advice. Data stored locally on your device."
            : "ระยะเวลาเป็นแนวทางความปลอดภัยทั่วไป ไม่ใช่คำแนะนำทางการแพทย์ ข้อมูลเก็บในเครื่องของคุณ"}
        </p>
      </CardContent>
    </Card>
  );
}
