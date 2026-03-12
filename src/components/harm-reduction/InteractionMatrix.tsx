import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Grid3X3, ListChecks, Info } from "lucide-react";
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

const riskColors: Record<string, string> = {
  critical: "bg-red-700 text-white",
  high: "bg-destructive text-destructive-foreground",
  moderate: "bg-amber-400 text-amber-900",
  low: "bg-emerald-400 text-emerald-900",
  unknown: "bg-muted text-muted-foreground",
};

const riskCellColors: Record<string, string> = {
  critical: "bg-red-700/90 hover:bg-red-700",
  high: "bg-destructive/80 hover:bg-destructive",
  moderate: "bg-amber-400/70 hover:bg-amber-400",
  low: "bg-emerald-400/60 hover:bg-emerald-400",
};

const riskIcons: Record<string, string> = {
  critical: "☠️",
  high: "🔴",
  moderate: "🟡",
  low: "🟢",
};

export function InteractionMatrix({ onNavigate }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const isMobile = useIsMobile();

  const [substances, setSubstances] = useState<Substance[]>([]);
  const [interactions, setInteractions] = useState<InteractionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [subA, setSubA] = useState<string>("");
  const [subB, setSubB] = useState<string>("");
  const [selectedInteraction, setSelectedInteraction] = useState<InteractionDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

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

  const getName = (id: string) => {
    const s = substances.find(x => x.id === id);
    return s ? (isEn ? s.name_en : s.name_th) : "?";
  };

  const getIcon = (id: string) => substances.find(x => x.id === id)?.icon || "💊";

  const findInteraction = (aId: string, bId: string) =>
    interactions.find(i =>
      (i.substance_a_id === aId && i.substance_b_id === bId) ||
      (i.substance_a_id === bId && i.substance_b_id === aId)
    );

  const checkerResult = useMemo(() => {
    if (!subA || !subB || subA === subB) return null;
    return findInteraction(subA, subB);
  }, [subA, subB, interactions]);

  const openDetail = (int: InteractionDetail) => {
    setSelectedInteraction(int);
    setDrawerOpen(true);
    trackEvent("hr_combo_view", {
      combo: `${getName(int.substance_a_id)}+${getName(int.substance_b_id)}`,
      risk: int.risk_level,
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border border-border/30 animate-pulse">
            <CardContent className="p-4 h-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Card className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-3 flex gap-2">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isEn
              ? "This information is provided for harm reduction and health education. Lower relative risk does not mean no risk."
              : "ข้อมูลนี้จัดทำเพื่อการลดอันตรายและการดูแลสุขภาพ การมีความเสี่ยงต่ำกว่าไม่ได้หมายความว่าไม่มีความเสี่ยง"}
          </p>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "critical", labelEn: "Critical", labelTh: "วิกฤต" },
          { key: "high", labelEn: "High", labelTh: "สูง" },
          { key: "moderate", labelEn: "Caution", labelTh: "ระวัง" },
          { key: "low", labelEn: "Lower", labelTh: "ต่ำกว่า" },
        ].map(l => (
          <Badge key={l.key} className={`text-[9px] px-1.5 py-0 ${riskColors[l.key]}`}>
            {riskIcons[l.key]} {isEn ? l.labelEn : l.labelTh}
          </Badge>
        ))}
      </div>

      {/* Substance Checker — always shown on mobile, toggle on desktop */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            {isEn ? "Check a Combination" : "ตรวจสอบการผสมสาร"}
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <Select value={subA} onValueChange={setSubA}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder={isEn ? "Substance 1" : "สารที่ 1"} />
              </SelectTrigger>
              <SelectContent>
                {substances.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.icon} {isEn ? s.name_en : s.name_th}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subB} onValueChange={setSubB}>
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder={isEn ? "Substance 2" : "สารที่ 2"} />
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

          {/* Result */}
          {subA && subB && subA !== subB && (
            <div className="mt-2">
              {checkerResult ? (
                <Card
                  className="border border-border/30 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openDetail(checkerResult)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getIcon(subA)}</span>
                      <span className="text-muted-foreground">+</span>
                      <span className="text-lg">{getIcon(subB)}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ml-auto ${riskColors[checkerResult.risk_level] || riskColors.unknown}`}>
                        {riskIcons[checkerResult.risk_level] || "❓"}{" "}
                        {checkerResult.risk_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isEn ? checkerResult.summary_en || checkerResult.description_en : checkerResult.summary_th || checkerResult.description_th}
                    </p>
                    <p className="text-[10px] text-primary">
                      {isEn ? "Tap for details →" : "แตะเพื่อดูรายละเอียด →"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground text-center">
                      {isEn
                        ? "No specific interaction data available for this combination. This does not mean it is safe — always exercise caution."
                        : "ไม่มีข้อมูลปฏิกิริยาเฉพาะสำหรับการผสมนี้ ไม่ได้หมายความว่าปลอดภัย — ควรระมัดระวังเสมอ"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle matrix view */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs h-8 rounded-xl"
        onClick={() => setShowMatrix(!showMatrix)}
      >
        <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
        {showMatrix
          ? (isEn ? "Hide Full Matrix" : "ซ่อนตารางเต็ม")
          : (isEn ? "Show Full Matrix" : "แสดงตารางเต็ม")}
      </Button>

      {/* Matrix grid */}
      {showMatrix && (
        <div className="overflow-x-auto -mx-4 px-4">
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
                        return <td key={col.id} className="p-0.5"><div className="w-7 h-7 bg-muted/30 rounded-sm" /></td>;
                      }
                      // Only show lower triangle to avoid duplicates, mirror upper
                      const int = findInteraction(row.id, col.id);
                      return (
                        <td key={col.id} className="p-0.5">
                          <button
                            className={`w-7 h-7 rounded-sm text-[9px] flex items-center justify-center transition-colors ${
                              int ? riskCellColors[int.risk_level] || "bg-muted/30" : "bg-muted/20 hover:bg-muted/40"
                            }`}
                            onClick={() => int && openDetail(int)}
                            title={int ? `${getName(row.id)} + ${getName(col.id)}: ${int.risk_level}` : ""}
                          >
                            {int ? riskIcons[int.risk_level] || "?" : "·"}
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

      {/* Priority combos list */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          {isEn ? "Priority Warnings" : "คำเตือนสำคัญ"}
        </h3>
        {interactions
          .filter(i => i.is_priority)
          .sort((a, b) => {
            const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
            return (order[a.risk_level] ?? 4) - (order[b.risk_level] ?? 4);
          })
          .map(int => (
            <Card
              key={int.id}
              className="border border-border/30 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
              onClick={() => openDetail(int)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-base">{getIcon(int.substance_a_id)}</span>
                  <span className="text-muted-foreground text-xs">+</span>
                  <span className="text-base">{getIcon(int.substance_b_id)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {getName(int.substance_a_id)} + {getName(int.substance_b_id)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {isEn ? int.summary_en || int.description_en : int.summary_th || int.description_th}
                  </p>
                </div>
                <Badge className={`text-[9px] px-1.5 py-0 flex-shrink-0 ${riskColors[int.risk_level] || riskColors.unknown}`}>
                  {int.risk_level}
                </Badge>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Detail drawer */}
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
