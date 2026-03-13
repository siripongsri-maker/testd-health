import { useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Grid3X3, Info, ArrowLeftRight, RotateCcw, Sparkles, Clock,
  Shield, AlertTriangle, ShieldAlert, ShieldCheck, HelpCircle, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useAnalytics";
import { useIsMobile } from "@/hooks/use-mobile";
import { InteractionDetailDrawer, type InteractionDetail } from "./InteractionDetailDrawer";

interface Substance {
  id: string;
  name_th: string;
  name_en: string;
  icon: string;
  slug: string;
}

interface Props {
  onNavigate: (tab: string) => void;
}

/* ── Calm health risk system using design tokens ── */
const riskMeta: Record<string, {
  labelEn: string; labelTh: string;
  badgeBg: string; badgeText: string;
  cellBg: string; dotColor: string;
  Icon: React.ElementType;
}> = {
  critical: {
    labelEn: "Critical risk", labelTh: "ความเสี่ยงวิกฤต",
    badgeBg: "bg-hr-risk-critical/15", badgeText: "text-hr-risk-critical",
    cellBg: "bg-hr-risk-critical/20 hover:bg-hr-risk-critical/30",
    dotColor: "bg-hr-risk-critical",
    Icon: ShieldAlert,
  },
  high: {
    labelEn: "High risk", labelTh: "ความเสี่ยงสูง",
    badgeBg: "bg-hr-risk-high/12", badgeText: "text-hr-risk-high",
    cellBg: "bg-hr-risk-high/18 hover:bg-hr-risk-high/28",
    dotColor: "bg-hr-risk-high",
    Icon: AlertTriangle,
  },
  moderate: {
    labelEn: "Caution", labelTh: "ควรระวัง",
    badgeBg: "bg-hr-risk-caution/15", badgeText: "text-hr-risk-high-caution",
    cellBg: "bg-hr-risk-caution/20 hover:bg-hr-risk-caution/30",
    dotColor: "bg-hr-risk-caution",
    Icon: Shield,
  },
  low: {
    labelEn: "Lower relative risk", labelTh: "ความเสี่ยงต่ำกว่าเมื่อเทียบกัน",
    badgeBg: "bg-hr-risk-low/15", badgeText: "text-hr-risk-low",
    cellBg: "bg-hr-risk-low/18 hover:bg-hr-risk-low/28",
    dotColor: "bg-hr-risk-low",
    Icon: ShieldCheck,
  },
  unknown: {
    labelEn: "Limited evidence", labelTh: "ข้อมูลยังจำกัด",
    badgeBg: "bg-hr-risk-unknown/12", badgeText: "text-hr-risk-unknown",
    cellBg: "bg-hr-risk-unknown/10 hover:bg-hr-risk-unknown/20",
    dotColor: "bg-hr-risk-unknown",
    Icon: HelpCircle,
  },
};

const getRisk = (level: string) => riskMeta[level] || riskMeta.unknown;

const RECENT_KEY = "hr_recent_combos";
const MAX_RECENT = 5;

interface RecentCombo { a: string; b: string; ts: number; }

function getRecentCombos(): RecentCombo[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}

function saveRecentCombo(a: string, b: string) {
  const recent = getRecentCombos().filter(r => !(r.a === a && r.b === b) && !(r.a === b && r.b === a));
  recent.unshift({ a, b, ts: Date.now() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const SUGGESTED_COMBOS = [
  { slugA: "ghb", slugB: "alcohol", labelEn: "GHB + Alcohol", labelTh: "GHB + แอลกอฮอล์" },
  { slugA: "poppers", slugB: "sildenafil", labelEn: "Poppers + Viagra", labelTh: "Poppers + ไวอากร้า" },
  { slugA: "methamphetamine", slugB: "ghb", labelEn: "Meth + GHB", labelTh: "ยาไอซ์ + GHB" },
  { slugA: "ketamine", slugB: "alcohol", labelEn: "Ketamine + Alcohol", labelTh: "เคตามีน + แอลกอฮอล์" },
  { slugA: "mdma", slugB: "cocaine", labelEn: "MDMA + Cocaine", labelTh: "MDMA + โคเคน" },
  { slugA: "methamphetamine", slugB: "sildenafil", labelEn: "Meth + Viagra", labelTh: "ยาไอซ์ + ไวอากร้า" },
];

/* ── Risk badge pill ── */
export function RiskBadgePill({ level, size = "sm", lang }: { level: string; size?: "sm" | "md"; lang?: string }) {
  const r = getRisk(level);
  const RIcon = r.Icon;
  const isEn = lang !== "th";
  const sizeClasses = size === "md"
    ? "text-[13px] px-3 py-1.5 gap-1.5"
    : "text-[11px] px-2.5 py-1 gap-1";
  return (
    <span className={`${r.badgeBg} ${r.badgeText} ${sizeClasses} font-medium rounded-full inline-flex items-center`}>
      <RIcon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      <span>{isEn ? r.labelEn : r.labelTh}</span>
    </span>
  );
}

export function InteractionMatrix({ onNavigate }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const isMobile = useIsMobile();

  const [substances, setSubstances] = useState<Substance[]>([]);
  const [interactions, setInteractions] = useState<InteractionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [subA, setSubA] = useState("");
  const [subB, setSubB] = useState("");
  const [selectedInteraction, setSelectedInteraction] = useState<InteractionDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [recentCombos, setRecentCombos] = useState<RecentCombo[]>(getRecentCombos());

  useEffect(() => {
    trackEvent("hr_matrix_view", {});
    (async () => {
      const [{ data: subs }, { data: ints }] = await Promise.all([
        supabase.from("hr_substances").select("id, name_th, name_en, icon, slug").eq("is_active", true).order("display_order"),
        supabase.from("hr_substance_interactions").select("*"),
      ]);
      setSubstances((subs as Substance[]) || []);
      setInteractions((ints as InteractionDetail[]) || []);
      setLoading(false);
    })();
  }, []);

  const getName = useCallback((id: string) => {
    const s = substances.find(x => x.id === id);
    return s ? (isEn ? s.name_en : s.name_th) : "?";
  }, [substances, isEn]);

  const getIcon = useCallback((id: string) => substances.find(x => x.id === id)?.icon || "💊", [substances]);

  const findInteraction = useCallback((aId: string, bId: string) =>
    interactions.find(i =>
      (i.substance_a_id === aId && i.substance_b_id === bId) ||
      (i.substance_a_id === bId && i.substance_b_id === aId)
    ), [interactions]);

  const checkerResult = useMemo(() => {
    if (!subA || !subB || subA === subB) return null;
    return findInteraction(subA, subB);
  }, [subA, subB, findInteraction]);

  useEffect(() => {
    if (subA && subB && subA !== subB) {
      saveRecentCombo(subA, subB);
      setRecentCombos(getRecentCombos());
      trackEvent("hr_combo_check", {
        subA: getName(subA),
        subB: getName(subB),
        risk: checkerResult?.risk_level || "no_data",
      });
    }
  }, [subA, subB]);

  const handleSwap = () => { setSubA(subB); setSubB(subA); };
  const handleReset = () => { setSubA(""); setSubB(""); };

  const handleSuggestion = (slugA: string, slugB: string) => {
    const a = substances.find(s => s.slug === slugA);
    const b = substances.find(s => s.slug === slugB);
    if (a && b) { setSubA(a.id); setSubB(b.id); }
  };

  const openDetail = (int: InteractionDetail) => {
    setSelectedInteraction(int);
    setDrawerOpen(true);
    trackEvent("hr_combo_view", {
      combo: `${getName(int.substance_a_id)}+${getName(int.substance_b_id)}`,
      risk: int.risk_level,
    });
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="flex gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-28 rounded-full" />)}
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const hasSelection = subA || subB;
  const hasBoth = subA && subB && subA !== subB;

  return (
    <div className="space-y-6">
      {/* ── Disclaimer ── */}
      <div className="rounded-2xl bg-hr-surface p-4 flex gap-3 items-start" style={{ boxShadow: "var(--hr-card-shadow)" }}>
        <div className="w-9 h-9 rounded-xl bg-hr-teal/10 flex items-center justify-center flex-shrink-0">
          <Info className="h-[18px] w-[18px] text-hr-teal" />
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed pt-1">
          {isEn
            ? "This information is provided for harm reduction and health education. Lower relative risk does not mean no risk."
            : "ข้อมูลนี้จัดทำเพื่อการลดอันตรายและการดูแลสุขภาพ ความเสี่ยงที่ต่ำกว่าไม่ได้หมายความว่าไม่มีความเสี่ยง"}
        </p>
      </div>

      {/* ── Risk legend ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
        {(["critical", "high", "moderate", "low", "unknown"] as const).map(key => {
          const r = riskMeta[key];
          return (
            <div key={key} className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-full ${r.dotColor}`} />
              {isEn ? r.labelEn : r.labelTh}
            </div>
          );
        })}
      </div>

      {/* ── Substance checker ── */}
      <div className="rounded-2xl bg-card p-5 space-y-5" style={{ boxShadow: "var(--hr-card-shadow)" }}>
        <h3 className="text-[15px] font-semibold text-foreground">
          {isEn ? "Check a combination" : "ตรวจสอบปฏิกิริยาเมื่อใช้สารร่วมกัน"}
        </h3>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="space-y-2">
            <label className="text-[12px] text-muted-foreground font-medium">
              {isEn ? "Substance 1" : "สารตัวที่ 1"}
            </label>
            <Select value={subA} onValueChange={setSubA}>
              <SelectTrigger className="h-12 text-[14px] rounded-2xl border-hr-divider bg-hr-surface">
                <SelectValue placeholder={isEn ? "Select..." : "เลือก..."} />
              </SelectTrigger>
              <SelectContent>
                {substances.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-[14px]">
                    {s.icon} {isEn ? s.name_en : s.name_th}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full text-muted-foreground hover:text-hr-teal hover:bg-hr-teal/10 transition-colors duration-200"
            onClick={handleSwap}
            disabled={!subA && !subB}
            aria-label="Swap substances"
          >
            <ArrowLeftRight className="h-[18px] w-[18px]" />
          </Button>

          <div className="space-y-2">
            <label className="text-[12px] text-muted-foreground font-medium">
              {isEn ? "Substance 2" : "สารตัวที่ 2"}
            </label>
            <Select value={subB} onValueChange={setSubB}>
              <SelectTrigger className="h-12 text-[14px] rounded-2xl border-hr-divider bg-hr-surface">
                <SelectValue placeholder={isEn ? "Select..." : "เลือก..."} />
              </SelectTrigger>
              <SelectContent>
                {substances.filter(s => s.id !== subA).map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-[14px]">
                    {s.icon} {isEn ? s.name_en : s.name_th}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[12px] h-8 px-3 text-muted-foreground rounded-full hover:bg-hr-surface"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            {isEn ? "Reset" : "ล้าง"}
          </Button>
        )}

        {/* Single selection hint */}
        {((subA && !subB) || (!subA && subB)) && (
          <p className="text-[13px] text-muted-foreground/60 text-center py-3">
            {isEn ? "Select one more substance to see the result" : "เลือกสารอีก 1 ตัวเพื่อดูผลลัพธ์"}
          </p>
        )}

        {/* ── Result ── */}
        {hasBoth && (
          <div className="animate-fade-in">
            {checkerResult ? (
              <button
                className="w-full text-left rounded-2xl bg-hr-surface p-5 space-y-4 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                onClick={() => openDetail(checkerResult)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{getIcon(subA)}</span>
                    <span className="text-muted-foreground/30 text-base font-light">+</span>
                    <span className="text-2xl">{getIcon(subB)}</span>
                    <p className="text-[15px] font-semibold text-foreground truncate ml-1">
                      {getName(subA)} + {getName(subB)}
                    </p>
                  </div>
                </div>

                <RiskBadgePill level={checkerResult.risk_level} size="md" lang={language} />

                {/* Summary */}
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  {isEn ? checkerResult.summary_en || checkerResult.description_en : checkerResult.summary_th || checkerResult.description_th}
                </p>

                {/* Warning sign chips */}
                {(() => {
                  const signs = isEn ? checkerResult.warning_signs_en : checkerResult.warning_signs_th;
                  if (!signs || signs.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-2">
                      {signs.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-[12px] px-3 py-1 rounded-full bg-background text-muted-foreground border border-hr-divider">
                          {s}
                        </span>
                      ))}
                      {signs.length > 3 && (
                        <span className="text-[12px] px-3 py-1 rounded-full bg-background text-muted-foreground/50 border border-hr-divider">
                          +{signs.length - 3}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Tap hint */}
                <div className="flex items-center gap-1.5 text-[13px] text-hr-teal font-medium pt-1">
                  <span>{isEn ? "View full details" : "ดูรายละเอียดทั้งหมด"}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            ) : (
              /* No data */
              <div className="rounded-2xl bg-hr-surface p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-hr-risk-unknown/10 flex items-center justify-center mx-auto">
                  <HelpCircle className="h-6 w-6 text-hr-risk-unknown" />
                </div>
                <p className="text-[14px] font-medium text-foreground">
                  {isEn ? "No data available yet" : "ยังไม่มีข้อมูลเพียงพอสำหรับคู่นี้"}
                </p>
                <p className="text-[13px] text-muted-foreground/70 leading-relaxed max-w-xs mx-auto">
                  {isEn
                    ? "This does not mean there is no risk. Always exercise caution and consider talking to support."
                    : "ไม่ได้แปลว่าไม่มีความเสี่ยง ควรระมัดระวังเสมอ และสามารถปรึกษาผู้เชี่ยวชาญได้"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!hasSelection && (
        <div className="space-y-6 animate-fade-in">
          {/* Suggested */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2 px-1">
              <Sparkles className="h-3.5 w-3.5" />
              {isEn ? "Common checks" : "การตรวจสอบที่พบบ่อย"}
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {SUGGESTED_COMBOS.map((sc, i) => {
                const intForSuggestion = substances.length > 0 ? (() => {
                  const a = substances.find(s => s.slug === sc.slugA);
                  const b = substances.find(s => s.slug === sc.slugB);
                  return a && b ? findInteraction(a.id, b.id) : null;
                })() : null;
                const r = intForSuggestion ? getRisk(intForSuggestion.risk_level) : null;
                return (
                  <button
                    key={i}
                    className="text-[13px] px-4 py-2.5 rounded-full border border-hr-divider bg-card hover:bg-hr-surface transition-all duration-200 active:scale-[0.97] flex items-center gap-2"
                    style={{ boxShadow: "0 2px 8px hsl(0 0% 0% / 0.04)" }}
                    onClick={() => handleSuggestion(sc.slugA, sc.slugB)}
                  >
                    {r && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.dotColor}`} />}
                    <span className="text-foreground/80">{isEn ? sc.labelEn : sc.labelTh}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent */}
          {recentCombos.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2 px-1">
                <Clock className="h-3.5 w-3.5" />
                {isEn ? "Recently checked" : "ตรวจสอบล่าสุด"}
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {recentCombos.map((rc, i) => {
                  const nameA = getName(rc.a);
                  const nameB = getName(rc.b);
                  if (nameA === "?" || nameB === "?") return null;
                  const int = findInteraction(rc.a, rc.b);
                  const r = int ? getRisk(int.risk_level) : null;
                  return (
                    <button
                      key={i}
                      className="text-[13px] px-4 py-2.5 rounded-full border border-hr-divider bg-card hover:bg-hr-surface transition-all duration-200 active:scale-[0.97] flex items-center gap-2"
                      onClick={() => { setSubA(rc.a); setSubB(rc.b); }}
                    >
                      {r && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.dotColor}`} />}
                      <span className="text-foreground/80">{getIcon(rc.a)} {nameA} + {getIcon(rc.b)} {nameB}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Helper text */}
          <div className="text-center py-4 space-y-2">
            <p className="text-[14px] text-muted-foreground/50">
              {isEn
                ? "Choose 2 substances above to view combination risks and warning signs."
                : "เลือกสาร 2 ตัวเพื่อดูความเสี่ยงเมื่อใช้ร่วมกัน"}
            </p>
            <p className="text-[12px] text-muted-foreground/35">
              {isEn
                ? "This tool helps you notice warning signs and take better care of yourself."
                : "ข้อมูลนี้ช่วยให้คุณสังเกตสัญญาณเตือนและดูแลตัวเองได้ดีขึ้น"}
            </p>
          </div>
        </div>
      )}

      {/* ── Toggle matrix ── */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-[13px] h-10 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-hr-surface"
        onClick={() => setShowMatrix(!showMatrix)}
      >
        <Grid3X3 className="h-4 w-4 mr-2" />
        {showMatrix
          ? (isEn ? "Hide full matrix" : "ซ่อนตารางเต็ม")
          : (isEn ? "Show full matrix" : "แสดงตารางเต็ม")}
      </Button>

      {/* ── Matrix grid ── */}
      {showMatrix && (
        <div className="overflow-x-auto -mx-4 px-4 animate-fade-in">
          <div className="min-w-[600px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background p-1 text-[8px] text-muted-foreground w-20" />
                  {substances.map(s => (
                    <th key={s.id} className="p-1 text-[7px] text-muted-foreground font-normal text-center w-8 max-w-8">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">{s.icon}</span>
                        <span className="leading-tight line-clamp-2">{isEn ? s.name_en?.split(" ")[0] : s.name_th?.split(" ")[0]}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {substances.map((row, ri) => (
                  <tr key={row.id}>
                    <td className="sticky left-0 z-10 bg-background p-1 text-[8px] text-muted-foreground font-medium truncate max-w-20">
                      {row.icon} {isEn ? row.name_en?.split("(")[0]?.trim()?.split("/")[0]?.trim() : row.name_th?.split("(")[0]?.trim()}
                    </td>
                    {substances.map((col, ci) => {
                      if (ri === ci) {
                        return <td key={col.id} className="p-0.5"><div className="w-7 h-7 bg-hr-surface rounded" /></td>;
                      }
                      const int = findInteraction(row.id, col.id);
                      const r = int ? getRisk(int.risk_level) : null;
                      return (
                        <td key={col.id} className="p-0.5">
                          <button
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-150 ${
                              r ? r.cellBg : "bg-hr-surface/50 hover:bg-hr-surface"
                            }`}
                            onClick={() => int && openDetail(int)}
                            aria-label={int ? `${getName(row.id)} + ${getName(col.id)}: ${int.risk_level}` : undefined}
                          >
                            {r ? <span className={`w-2.5 h-2.5 rounded-full ${r.dotColor}`} /> : <span className="text-muted-foreground/15 text-[8px]">·</span>}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Priority warnings ── */}
      <div className="space-y-4">
        <h3 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2 px-1">
          <ShieldAlert className="h-4 w-4 text-hr-risk-critical/60" />
          {isEn ? "Priority warnings" : "คำเตือนสำคัญ"}
        </h3>
        <div className="space-y-2.5">
          {interactions
            .filter(i => i.is_priority)
            .sort((a, b) => {
              const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
              return (order[a.risk_level] ?? 4) - (order[b.risk_level] ?? 4);
            })
            .map(int => (
              <button
                key={int.id}
                className="w-full text-left rounded-2xl bg-card p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                style={{ boxShadow: "var(--hr-card-shadow)" }}
                onClick={() => openDetail(int)}
              >
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xl">{getIcon(int.substance_a_id)}</span>
                  <span className="text-muted-foreground/25 text-sm">+</span>
                  <span className="text-xl">{getIcon(int.substance_b_id)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground truncate">
                    {getName(int.substance_a_id)} + {getName(int.substance_b_id)}
                  </p>
                  <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5">
                    {isEn ? int.summary_en || int.description_en : int.summary_th || int.description_th}
                  </p>
                </div>
                <RiskBadgePill level={int.risk_level} lang={language} />
              </button>
            ))}
        </div>
      </div>

      {/* ── Detail drawer ── */}
      <InteractionDetailDrawer
        interaction={selectedInteraction}
        nameA={selectedInteraction ? getName(selectedInteraction.substance_a_id) : ""}
        nameB={selectedInteraction ? getName(selectedInteraction.substance_b_id) : ""}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
}
