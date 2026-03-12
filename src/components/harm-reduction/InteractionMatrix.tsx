import { useState, useEffect, useMemo, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/* ── Premium risk badge system ── */
const riskMeta: Record<string, {
  labelEn: string; labelTh: string;
  badge: string; cell: string;
  Icon: React.ElementType; dot: string;
}> = {
  critical: {
    labelEn: "Critical risk", labelTh: "ความเสี่ยงวิกฤต",
    badge: "bg-rose-900/90 text-rose-50 dark:bg-rose-900 dark:text-rose-100",
    cell: "bg-rose-800/80 hover:bg-rose-800/95",
    Icon: ShieldAlert, dot: "bg-rose-600",
  },
  high: {
    labelEn: "High risk", labelTh: "ความเสี่ยงสูง",
    badge: "bg-red-600/85 text-red-50 dark:bg-red-700/90 dark:text-red-100",
    cell: "bg-red-500/70 hover:bg-red-500/90",
    Icon: AlertTriangle, dot: "bg-red-500",
  },
  moderate: {
    labelEn: "Caution", labelTh: "ควรระวัง",
    badge: "bg-amber-500/80 text-amber-950 dark:bg-amber-600/70 dark:text-amber-100",
    cell: "bg-amber-400/60 hover:bg-amber-400/80",
    Icon: Shield, dot: "bg-amber-500",
  },
  low: {
    labelEn: "Lower relative risk", labelTh: "ความเสี่ยงต่ำกว่าเมื่อเทียบกัน",
    badge: "bg-emerald-600/20 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-200",
    cell: "bg-emerald-400/50 hover:bg-emerald-400/70",
    Icon: ShieldCheck, dot: "bg-emerald-500",
  },
  unknown: {
    labelEn: "Limited evidence", labelTh: "ข้อมูลยังจำกัด",
    badge: "bg-muted text-muted-foreground",
    cell: "bg-muted/30 hover:bg-muted/50",
    Icon: HelpCircle, dot: "bg-muted-foreground/50",
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

/* ── Risk badge pill component ── */
function RiskBadgePill({ level, size = "sm" }: { level: string; size?: "sm" | "md" }) {
  const r = getRisk(level);
  const RIcon = r.Icon;
  const sizeClasses = size === "md"
    ? "text-xs px-2.5 py-1 gap-1.5"
    : "text-[10px] px-2 py-0.5 gap-1";
  return (
    <Badge className={`${r.badge} ${sizeClasses} font-medium rounded-full border-0 inline-flex items-center`}>
      <RIcon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      <span>{size === "md" ? (r.labelEn.length > 12 ? r.labelEn : r.labelEn) : r.labelEn}</span>
    </Badge>
  );
}

export { RiskBadgePill };

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
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  const hasSelection = subA || subB;
  const hasBoth = subA && subB && subA !== subB;

  return (
    <div className="space-y-5">
      {/* ── Disclaimer ── */}
      <div className="flex gap-3 items-start px-1">
        <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          {isEn
            ? "This information is provided for harm reduction and health education. Lower relative risk does not mean no risk."
            : "ข้อมูลนี้จัดทำเพื่อการลดอันตรายและการดูแลสุขภาพ ความเสี่ยงที่ต่ำกว่าไม่ได้หมายความว่าไม่มีความเสี่ยง"}
        </p>
      </div>

      {/* ── Risk legend ── */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {(["critical", "high", "moderate", "low"] as const).map(key => {
          const r = riskMeta[key];
          return (
            <div key={key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${r.dot}`} />
              {isEn ? r.labelEn : r.labelTh}
            </div>
          );
        })}
      </div>

      {/* ── Substance checker card ── */}
      <Card className="border border-border/30 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            {isEn ? "Check a combination" : "เช็กความเสี่ยงเมื่อใช้สารร่วมกัน"}
          </h3>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-medium">
                {isEn ? "Substance 1" : "สารตัวที่ 1"}
              </label>
              <Select value={subA} onValueChange={setSubA}>
                <SelectTrigger className="h-11 text-xs rounded-xl border-border/50">
                  <SelectValue placeholder={isEn ? "Select..." : "เลือก..."} />
                </SelectTrigger>
                <SelectContent>
                  {substances.map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.icon} {isEn ? s.name_en : s.name_th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
              onClick={handleSwap}
              disabled={!subA && !subB}
              aria-label="Swap substances"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground font-medium">
                {isEn ? "Substance 2" : "สารตัวที่ 2"}
              </label>
              <Select value={subB} onValueChange={setSubB}>
                <SelectTrigger className="h-11 text-xs rounded-xl border-border/50">
                  <SelectValue placeholder={isEn ? "Select..." : "เลือก..."} />
                </SelectTrigger>
                <SelectContent>
                  {substances.filter(s => s.id !== subA).map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
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
              className="text-[10px] h-7 px-3 text-muted-foreground rounded-full"
              onClick={handleReset}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {isEn ? "Reset" : "ล้าง"}
            </Button>
          )}

          {/* ── Single selection hint ── */}
          {subA && !subB && (
            <p className="text-[11px] text-muted-foreground/70 text-center py-2">
              {isEn ? "Select one more substance to see the result" : "เลือกสารอีก 1 ตัวเพื่อดูผลลัพธ์"}
            </p>
          )}
          {!subA && subB && (
            <p className="text-[11px] text-muted-foreground/70 text-center py-2">
              {isEn ? "Select one more substance to see the result" : "เลือกสารอีก 1 ตัวเพื่อดูผลลัพธ์"}
            </p>
          )}

          {/* ── Result card ── */}
          {hasBoth && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              {checkerResult ? (
                <Card
                  className="border border-border/20 cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-[0.98] overflow-hidden"
                  onClick={() => openDetail(checkerResult)}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top: icons + name + badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{getIcon(subA)}</span>
                        <span className="text-muted-foreground/40 text-sm">+</span>
                        <span className="text-xl">{getIcon(subB)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {getName(subA)} + {getName(subB)}
                          </p>
                        </div>
                      </div>
                      <RiskBadgePill level={checkerResult.risk_level} size="md" />
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isEn ? checkerResult.summary_en || checkerResult.description_en : checkerResult.summary_th || checkerResult.description_th}
                    </p>

                    {/* Warning signs preview (top 3) */}
                    {(() => {
                      const signs = isEn ? checkerResult.warning_signs_en : checkerResult.warning_signs_th;
                      if (!signs || signs.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {signs.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                              {s}
                            </span>
                          ))}
                          {signs.length > 3 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60">
                              +{signs.length - 3}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Tap hint */}
                    <div className="flex items-center gap-1 text-[10px] text-primary/70 font-medium pt-1">
                      <span>{isEn ? "View full details" : "ดูรายละเอียดทั้งหมด"}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* ── No data fallback ── */
                <Card className="border border-border/20">
                  <CardContent className="p-5 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                      <HelpCircle className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">
                        {isEn ? "No data available yet" : "ยังไม่มีข้อมูลเพียงพอสำหรับคู่นี้"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-xs mx-auto">
                        {isEn
                          ? "This does not mean there is no risk. Always exercise caution and consider talking to support."
                          : "ไม่ได้แปลว่าไม่มีความเสี่ยง ควรระมัดระวังเสมอ และสามารถปรึกษาผู้เชี่ยวชาญได้"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Empty state: suggested + recent (only when no selection) ── */}
      {!hasSelection && (
        <div className="space-y-5 animate-in fade-in-0 duration-300">
          {/* ── Suggested common checks ── */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Sparkles className="h-3 w-3" />
              {isEn ? "Common checks" : "การตรวจสอบที่พบบ่อย"}
            </h4>
            <div className="flex flex-wrap gap-2">
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
                    className="text-[11px] px-3 py-2 rounded-xl border border-border/30 bg-card hover:bg-muted/40 transition-all duration-150 active:scale-[0.97] flex items-center gap-2 shadow-sm"
                    onClick={() => handleSuggestion(sc.slugA, sc.slugB)}
                  >
                    {r && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.dot}`} />}
                    <span className="text-foreground/80">{isEn ? sc.labelEn : sc.labelTh}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Recently checked ── */}
          {recentCombos.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Clock className="h-3 w-3" />
                {isEn ? "Recently checked" : "ตรวจสอบล่าสุด"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {recentCombos.map((rc, i) => {
                  const nameA = getName(rc.a);
                  const nameB = getName(rc.b);
                  if (nameA === "?" || nameB === "?") return null;
                  const int = findInteraction(rc.a, rc.b);
                  const r = int ? getRisk(int.risk_level) : null;
                  return (
                    <button
                      key={i}
                      className="text-[11px] px-3 py-2 rounded-xl border border-border/30 bg-card hover:bg-muted/40 transition-all duration-150 active:scale-[0.97] flex items-center gap-2 shadow-sm"
                      onClick={() => { setSubA(rc.a); setSubB(rc.b); }}
                    >
                      {r && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.dot}`} />}
                      <span className="text-foreground/80">{getIcon(rc.a)} {nameA} + {getIcon(rc.b)} {nameB}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Helper text ── */}
          <div className="text-center py-3 space-y-1.5">
            <p className="text-xs text-muted-foreground/60">
              {isEn
                ? "Choose 2 substances above to view combination risks and warning signs."
                : "เลือกสาร 2 ตัวเพื่อดูความเสี่ยงเมื่อใช้ร่วมกัน"}
            </p>
            <p className="text-[10px] text-muted-foreground/40">
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
        className="w-full text-[11px] h-9 rounded-xl text-muted-foreground hover:text-foreground"
        onClick={() => setShowMatrix(!showMatrix)}
      >
        <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
        {showMatrix
          ? (isEn ? "Hide full matrix" : "ซ่อนตารางเต็ม")
          : (isEn ? "Show full matrix" : "แสดงตารางเต็ม")}
      </Button>

      {/* ── Matrix grid ── */}
      {showMatrix && (
        <div className="overflow-x-auto -mx-4 px-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
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
                        return <td key={col.id} className="p-0.5"><div className="w-7 h-7 bg-muted/20 rounded" /></td>;
                      }
                      const int = findInteraction(row.id, col.id);
                      const r = int ? getRisk(int.risk_level) : null;
                      return (
                        <td key={col.id} className="p-0.5">
                          <button
                            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                              r ? r.cell : "bg-muted/10 hover:bg-muted/30"
                            }`}
                            onClick={() => int && openDetail(int)}
                            aria-label={int ? `${getName(row.id)} + ${getName(col.id)}: ${int.risk_level}` : undefined}
                          >
                            {r ? <span className={`w-2.5 h-2.5 rounded-full ${r.dot}`} /> : <span className="text-muted-foreground/20 text-[8px]">·</span>}
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
      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500/70" />
          {isEn ? "Priority warnings" : "คำเตือนสำคัญ"}
        </h3>
        <div className="space-y-2">
          {interactions
            .filter(i => i.is_priority)
            .sort((a, b) => {
              const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
              return (order[a.risk_level] ?? 4) - (order[b.risk_level] ?? 4);
            })
            .map(int => (
              <Card
                key={int.id}
                className="border border-border/20 cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => openDetail(int)}
              >
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-lg">{getIcon(int.substance_a_id)}</span>
                    <span className="text-muted-foreground/30 text-xs">+</span>
                    <span className="text-lg">{getIcon(int.substance_b_id)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {getName(int.substance_a_id)} + {getName(int.substance_b_id)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                      {isEn ? int.summary_en || int.description_en : int.summary_th || int.description_th}
                    </p>
                  </div>
                  <RiskBadgePill level={int.risk_level} />
                </CardContent>
              </Card>
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
