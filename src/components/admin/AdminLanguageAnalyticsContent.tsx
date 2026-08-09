import { useCallback, useEffect, useMemo, useState } from "react";
import { NationalityBreakdownCard } from "@/components/admin/NationalityBreakdownCard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Languages, RefreshCw, FileDown, Globe, Building2 } from "lucide-react";
import { toast } from "sonner";
import PrintButton from "@/components/admin/PrintButton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

interface OnlineRow {
  lang: string;
  events: number;
  reach: number;
  engaged: number;
  intent: number;
  converted: number;
}
interface ClinicRow {
  lang: string;
  source: string;
  total: number;
}

const LANG_LABEL: Record<string, string> = {
  th: "ไทย (th)",
  en: "อังกฤษ (en)",
  my: "พม่า (my)",
  km: "เขมร (km)",
  lo: "ลาว (lo)",
  zh: "จีน (zh)",
  ja: "ญี่ปุ่น (ja)",
  ko: "เกาหลี (ko)",
  vi: "เวียดนาม (vi)",
  ar: "อาหรับ (ar)",
};
const SOURCE_LABEL: Record<string, string> = {
  pre_service_survey: "แบบสอบถามก่อนรับบริการ",
  walkin: "Walk-in คลินิก",
  feedback: "แบบประเมินความพึงพอใจ",
  profile: "โปรไฟล์สมาชิก",
};

const langLabel = (l: string) => LANG_LABEL[l] ?? l;
const FUNNEL_COLORS = ["#3A6FF7", "#2FAFA3", "#F59E0B", "#c0275e"];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminLanguageAnalyticsContent() {
  const [start, setStart] = useState(() => toISODate(new Date(Date.now() - 89 * 86400000)));
  const [end, setEnd] = useState(() => toISODate(new Date()));
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState<OnlineRow[]>([]);
  const [clinic, setClinic] = useState<ClinicRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_language_analytics" as never, {
        p_start: start,
        p_end: end,
      } as never);
      if (error) throw error;
      const payload = (data ?? {}) as { online?: OnlineRow[]; clinic?: ClinicRow[] };
      const on = (payload.online ?? []).map((r) => ({
        lang: r.lang || "th",
        events: Number(r.events) || 0,
        reach: Number(r.reach) || 0,
        engaged: Number(r.engaged) || 0,
        intent: Number(r.intent) || 0,
        converted: Number(r.converted) || 0,
      }));
      setOnline(on);
      setClinic((payload.clinic ?? []).map((r) => ({ ...r, total: Number(r.total) || 0 })));
      setSelected((prev) => prev ?? on[0]?.lang ?? null);
    } catch (e) {
      console.error(e);
      toast.error("โหลดข้อมูลสถิติตามภาษาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    void load();
  }, [load]);

  const clinicByLang = useMemo(() => {
    const map = new Map<string, { lang: string; total: number; sources: Record<string, number> }>();
    for (const r of clinic) {
      const cur = map.get(r.lang) ?? { lang: r.lang, total: 0, sources: {} };
      cur.total += r.total;
      cur.sources[r.source] = (cur.sources[r.source] ?? 0) + r.total;
      map.set(r.lang, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [clinic]);

  const totals = useMemo(() => ({
    reach: online.reduce((s, r) => s + r.reach, 0),
    converted: online.reduce((s, r) => s + r.converted, 0),
    clinic: clinicByLang.reduce((s, r) => s + r.total, 0),
    langs: new Set([...online.map((o) => o.lang), ...clinicByLang.map((c) => c.lang)]).size,
  }), [online, clinicByLang]);

  const selectedRow = online.find((o) => o.lang === selected) ?? online[0];
  const funnelData = selectedRow
    ? [
        { stage: "เข้าถึง", value: selectedRow.reach },
        { stage: "มีปฏิสัมพันธ์", value: selectedRow.engaged },
        { stage: "สนใจบริการ", value: selectedRow.intent },
        { stage: "ใช้บริการ", value: selectedRow.converted },
      ]
    : [];

  const compareData = online.slice(0, 8).map((r) => ({
    lang: langLabel(r.lang),
    เข้าถึง: r.reach,
    มีปฏิสัมพันธ์: r.engaged,
    สนใจบริการ: r.intent,
    ใช้บริการ: r.converted,
  }));

  const exportCsv = () => {
    const rows = [
      ["ประเภท", "ภาษา", "เข้าถึง", "มีปฏิสัมพันธ์", "สนใจบริการ", "ใช้บริการ", "อีเวนต์", "อัตราแปลง %"],
      ...online.map((r) => [
        "ออนไลน์", r.lang, r.reach, r.engaged, r.intent, r.converted, r.events,
        r.reach ? ((r.converted / r.reach) * 100).toFixed(1) : "0",
      ]),
      ...clinic.map((r) => ["คลินิก", r.lang, "", "", "", r.total, "", ""]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `language-analytics-${start}-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            สถิติตามภาษาผู้ใช้ (ออนไลน์ / คลินิก)
          </h2>
          <p className="text-sm text-muted-foreground">
            เปรียบเทียบการเข้าถึงและการใช้บริการของผู้รับบริการแต่ละภาษา
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 no-print">
          <div>
            <label className="text-xs text-muted-foreground">เริ่ม</label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ถึง</label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-40" />
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileDown className="h-4 w-4 mr-1" /> CSV
          </Button>
          <PrintButton documentTitle="สถิติตามภาษาผู้ใช้" size="sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ผู้เข้าถึงออนไลน์", value: totals.reach, icon: Globe },
          { label: "ใช้บริการออนไลน์", value: totals.converted, icon: Globe },
          { label: "บันทึกฝั่งคลินิก", value: totals.clinic, icon: Building2 },
          { label: "จำนวนภาษา", value: totals.langs, icon: Languages },
        ].map((k) => (
          <Card key={k.label} className="print-block">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <k.icon className="h-4 w-4" /> {k.label}
              </div>
              <div className="text-2xl font-bold mt-1">{k.value.toLocaleString("th-TH")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="print-block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funnel การเข้าถึง → ใช้บริการ</CardTitle>
            <div className="flex flex-wrap gap-1 pt-2 no-print">
              {online.slice(0, 10).map((o) => (
                <Badge
                  key={o.lang}
                  variant={o.lang === selectedRow?.lang ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelected(o.lang)}
                >
                  {langLabel(o.lang)}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 24, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" width={90} />
                  <Tooltip formatter={(v: number) => v.toLocaleString("th-TH")} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลานี้</p>
            )}
          </CardContent>
        </Card>

        <Card className="print-block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">เปรียบเทียบภาษา (สูงสุด 8 ภาษา)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {compareData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="lang" tick={{ fontSize: 11 }} interval={0} angle={-15} height={50} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v: number) => v.toLocaleString("th-TH")} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="เข้าถึง" fill={FUNNEL_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="มีปฏิสัมพันธ์" fill={FUNNEL_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="สนใจบริการ" fill={FUNNEL_COLORS[2]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ใช้บริการ" fill={FUNNEL_COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงเวลานี้</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="print-block">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> ออนไลน์ – รายละเอียดตามภาษา
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2">ภาษา</th>
                <th className="py-2 text-right">เข้าถึง</th>
                <th className="py-2 text-right">มีปฏิสัมพันธ์</th>
                <th className="py-2 text-right">สนใจบริการ</th>
                <th className="py-2 text-right">ใช้บริการ</th>
                <th className="py-2 text-right">อัตราแปลง</th>
              </tr>
            </thead>
            <tbody>
              {online.map((r) => (
                <tr
                  key={r.lang}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelected(r.lang)}
                >
                  <td className="py-2 font-medium">{langLabel(r.lang)}</td>
                  <td className="py-2 text-right">{r.reach.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right">{r.engaged.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right">{r.intent.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right">{r.converted.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right">
                    {r.reach ? ((r.converted / r.reach) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              ))}
              {online.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="print-block">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> คลินิก – ภาษาที่บันทึกในระบบบริการ
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2">ภาษา</th>
                {Object.keys(SOURCE_LABEL).map((s) => (
                  <th key={s} className="py-2 text-right">{SOURCE_LABEL[s]}</th>
                ))}
                <th className="py-2 text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {clinicByLang.map((r) => (
                <tr key={r.lang} className="border-b last:border-0">
                  <td className="py-2 font-medium">{langLabel(r.lang)}</td>
                  {Object.keys(SOURCE_LABEL).map((s) => (
                    <td key={s} className="py-2 text-right">
                      {(r.sources[s] ?? 0).toLocaleString("th-TH")}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold">{r.total.toLocaleString("th-TH")}</td>
                </tr>
              ))}
              {clinicByLang.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <NationalityBreakdownCard start={start} end={end} />
    </div>
  );
}
