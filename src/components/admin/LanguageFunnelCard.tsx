import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell,
} from "recharts";

interface Props {
  start: string;
  end: string;
  /** language code to analyse — defaults to Khmer */
  language?: string;
  title?: string;
}

interface EventRow {
  event_type: string;
  session_id: string | null;
  anonymous_id: string | null;
  page_path: string | null;
  metadata: Record<string, unknown> | null;
}

type StageKey = "landing" | "harm_reduction" | "selftest" | "prep_pep";

const STAGES: { key: StageKey; label: string; color: string }[] = [
  { key: "landing", label: "เข้าถึงหน้าเริ่มต้น", color: "hsl(var(--primary))" },
  { key: "harm_reduction", label: "อ่าน Harm Reduction", color: "hsl(var(--primary) / 0.8)" },
  { key: "selftest", label: "กดรับชุดตรวจฟรี", color: "hsl(var(--primary) / 0.6)" },
  { key: "prep_pep", label: "ไปยัง PrEP / PEP", color: "hsl(var(--primary) / 0.45)" },
];

function stageOf(e: EventRow): StageKey | null {
  const meta = (e.metadata ?? {}) as Record<string, string>;
  const action = String(meta.action ?? "");
  const topic = String(meta.topic ?? "");
  const rec = String(meta.recommendation ?? "");

  if (e.event_type === "lite_landing_view") return "landing";
  if (["lite_hr_view", "lite_hr_search", "lite_hr_cta"].includes(e.event_type)) {
    if (e.event_type === "lite_hr_cta" && topic === "prevention") return "selftest";
    return "harm_reduction";
  }
  if (e.event_type === "lite_landing_cta") {
    if (action === "selftest" || action === "start") return "selftest";
    if (action === "prep" || action === "pep") return "prep_pep";
    if (["hr_hub", "chemsex", "ghb"].includes(action)) return "harm_reduction";
    return null;
  }
  if (e.event_type === "km_triage_cta") {
    if (rec === "test") return "selftest";
    if (rec === "prep" || rec === "pep") return "prep_pep";
    return null;
  }
  return null;
}

export function LanguageFunnelCard({
  start,
  end,
  language = "km",
  title = "Funnel ภาษาเขมร (เข้าถึง → อ่าน HR → ขอชุดตรวจ → PrEP/PEP)",
}: Props) {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type, session_id, anonymous_id, page_path, metadata")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)
        .in("event_type", [
          "lite_landing_view",
          "lite_landing_cta",
          "lite_hr_view",
          "lite_hr_search",
          "lite_hr_cta",
          "km_triage_started",
          "km_triage_completed",
          "km_triage_cta",
        ])
        .limit(20000);
      if (error) throw error;

      const prefix = `/${language}`;
      setRows(
        ((data ?? []) as EventRow[]).filter((r) => {
          const meta = (r.metadata ?? {}) as Record<string, unknown>;
          return meta.language === language || (r.page_path ?? "").startsWith(prefix);
        }),
      );
    } catch (e) {
      console.error(e);
      toast.error("โหลดข้อมูล funnel ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [start, end, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const chart = useMemo(() => {
    const sets: Record<StageKey, Set<string>> = {
      landing: new Set(),
      harm_reduction: new Set(),
      selftest: new Set(),
      prep_pep: new Set(),
    };
    for (const r of rows) {
      const stage = stageOf(r);
      if (!stage) continue;
      const id = r.session_id || r.anonymous_id;
      if (!id) continue;
      sets[stage].add(id);
    }
    const top = sets.landing.size || 1;
    let prev = 0;
    return STAGES.map((s, i) => {
      const value = sets[s.key].size;
      const row = {
        key: s.key,
        label: s.label,
        value,
        color: s.color,
        pctOfTop: Math.round((value / top) * 100),
        pctOfPrev: i === 0 ? 100 : prev ? Math.round((value / prev) * 100) : 0,
      };
      prev = value;
      return row;
    });
  }, [rows]);

  const exportCsv = () => {
    const csv =
      "\uFEFFstage,label,users,pct_of_entry,pct_of_previous\n" +
      chart.map((c) => `${c.key},${c.label},${c.value},${c.pctOfTop},${c.pctOfPrev}`).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `funnel-${language}-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="print-block">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {chart.map((c) => (
            <div key={c.key} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold">{c.value.toLocaleString("th-TH")}</p>
              <p className="text-[11px] text-muted-foreground">
                {c.pctOfTop}% ของผู้เข้าถึง · ต่อจากขั้นก่อน {c.pctOfPrev}%
              </p>
            </div>
          ))}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ left: 24, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString("th-TH")} คน`, "จำนวน"]}
                labelFormatter={(l) => String(l)}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {chart.map((c) => (
                  <Cell key={c.key} fill={c.color} />
                ))}
                <LabelList dataKey="value" position="right" className="fill-foreground text-xs" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {chart[0].value === 0 && (
          <p className="text-xs text-muted-foreground">
            ยังไม่มีข้อมูลในช่วงวันที่เลือก (เริ่มเก็บเมื่อผู้ใช้เข้าหน้า /{language})
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default LanguageFunnelCard;
