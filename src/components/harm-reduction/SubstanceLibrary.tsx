import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SubstanceProfile } from "./SubstanceProfile";

interface Substance {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  category_th: string;
  category_en: string;
  icon: string;
  overview_th: string | null;
  overview_en: string | null;
  routes_of_use: any;
  duration_timeline: any;
  short_effects_th: string[];
  short_effects_en: string[];
  mid_effects_th: string[];
  mid_effects_en: string[];
  long_effects_th: string[];
  long_effects_en: string[];
  withdrawal_th: string[];
  withdrawal_en: string[];
  harm_reduction_tips_th: string[];
  harm_reduction_tips_en: string[];
  emergency_signs_th: string[];
  emergency_signs_en: string[];
  addiction_risk: number;
  heart_risk: number;
  mental_health_risk: number;
  display_order: number;
}

export interface SubstanceInteraction {
  id: string;
  substance_a_id: string;
  substance_b_id: string;
  risk_level: string;
  description_th: string | null;
  description_en: string | null;
}

interface Props {
  onNavigate: (tab: string) => void;
}

export type { Substance };

export function SubstanceLibrary({ onNavigate }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [interactions, setInteractions] = useState<SubstanceInteraction[]>([]);
  const [selected, setSelected] = useState<Substance | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: ints }] = await Promise.all([
        supabase.from("hr_substances").select("*").eq("is_active", true).order("display_order"),
        supabase.from("hr_substance_interactions").select("*"),
      ]);
      setSubstances((subs as Substance[]) || []);
      setInteractions((ints as SubstanceInteraction[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = substances.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.name_th.toLowerCase().includes(q) ||
      s.name_en.toLowerCase().includes(q) ||
      s.category_th.toLowerCase().includes(q) ||
      s.category_en.toLowerCase().includes(q)
    );
  });

  const categories = [...new Set(filtered.map((s) => (isEn ? s.category_en : s.category_th)))];

  if (selected) {
    const relatedInteractions = interactions.filter(
      (i) => i.substance_a_id === selected.id || i.substance_b_id === selected.id
    );
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 text-muted-foreground"
          onClick={() => setSelected(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {isEn ? "All Substances" : "สารทั้งหมด"}
        </Button>
        <SubstanceProfile
          substance={selected}
          interactions={relatedInteractions}
          allSubstances={substances}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {isEn ? "Substance Knowledge Library" : "คลังความรู้เรื่องสาร"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isEn
            ? "Evidence-based harm reduction information"
            : "ข้อมูลลดอันตรายจากหลักฐานเชิงวิชาการ"}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isEn ? "Search substances..." : "ค้นหาสาร..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm rounded-xl"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-border/30 animate-pulse">
              <CardContent className="p-4 h-28" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {isEn ? "No substances found" : "ไม่พบข้อมูลสาร"}
        </p>
      ) : (
        categories.map((cat) => (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {cat}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {filtered
                .filter((s) => (isEn ? s.category_en : s.category_th) === cat)
                .map((s) => {
                  const maxRisk = Math.max(s.addiction_risk, s.heart_risk, s.mental_health_risk);
                  const riskColor =
                    maxRisk >= 4
                      ? "bg-destructive/10 text-destructive"
                      : maxRisk >= 3
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
                  return (
                    <Card
                      key={s.id}
                      className="border border-border/30 cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
                      onClick={() => setSelected(s)}
                    >
                      <CardContent className="p-3.5 flex flex-col gap-2 min-h-[100px]">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{s.icon}</span>
                          <h3 className="font-semibold text-sm text-foreground leading-tight">
                            {isEn ? s.name_en : s.name_th}
                          </h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {isEn
                            ? s.overview_en?.slice(0, 80)
                            : s.overview_th?.slice(0, 80)}
                          ...
                        </p>
                        <Badge variant="outline" className={`text-[9px] w-fit px-1.5 py-0 ${riskColor} border-0`}>
                          {maxRisk >= 4
                            ? isEn ? "High Risk" : "เสี่ยงสูง"
                            : maxRisk >= 3
                            ? isEn ? "Moderate" : "ปานกลาง"
                            : isEn ? "Lower Risk" : "เสี่ยงต่ำ"}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))
      )}

      {/* Disclaimer */}
      <div className="rounded-2xl bg-muted/40 p-3.5 mt-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isEn
            ? "⚕️ This information is provided for harm reduction and health education. It does not promote or encourage substance use. Always consult a healthcare professional."
            : "⚕️ ข้อมูลนี้จัดทำเพื่อการลดอันตรายและสุขศึกษา ไม่ได้ส่งเสริมหรือสนับสนุนการใช้สาร ควรปรึกษาแพทย์เสมอ"}
        </p>
      </div>
    </div>
  );
}
