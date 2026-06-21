import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, MapPin, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { THAI_PROVINCE_CENTROIDS } from "@/data/thaiProvinceCentroids";
import { toast } from "sonner";

type Row = {
  province: string;
  assigned_branch: string;
  total: number;
  distributed: number;
  results_returned: number;
  reactive: number;
  non_reactive: number;
  invalid_count: number;
};

type AggRow = {
  province: string;
  lat: number | null;
  lng: number | null;
  total: number;
  distributed: number;
  results_returned: number;
  reactive: number;
  non_reactive: number;
  invalid: number;
};

type BranchFilter = "all" | "silom" | "pattaya";

// Color scale by reactive ratio of results returned
function colorForReactiveRate(reactive: number, returned: number): string {
  if (returned === 0) return "hsl(220, 15%, 70%)"; // gray
  const rate = reactive / returned;
  if (rate >= 0.05) return "hsl(0, 84%, 55%)";     // red
  if (rate >= 0.02) return "hsl(20, 90%, 55%)";    // orange
  if (rate >= 0.005) return "hsl(45, 95%, 55%)";   // amber
  return "hsl(150, 60%, 45%)";                     // green
}

function radiusForTotal(total: number, max: number): number {
  if (total <= 0) return 0;
  const minR = 6;
  const maxR = 38;
  // sqrt scale to keep area proportional
  const ratio = Math.sqrt(total) / Math.sqrt(Math.max(max, 1));
  return Math.max(minR, Math.round(minR + (maxR - minR) * ratio));
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function AdminSelftestMapContent() {
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<BranchFilter>("all");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_selftest_geo_stats");
    if (error) {
      toast.error(t("โหลดข้อมูลไม่สำเร็จ", "Failed to load") + ": " + error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Aggregate by province (filter by branch), join centroids
  const aggregated: AggRow[] = useMemo(() => {
    const map = new Map<string, AggRow>();
    for (const r of rows) {
      if (branch !== "all" && r.assigned_branch !== branch) continue;
      const key = r.province;
      const centroid = THAI_PROVINCE_CENTROIDS[key];
      const existing = map.get(key) ?? {
        province: key,
        lat: centroid?.lat ?? null,
        lng: centroid?.lng ?? null,
        total: 0,
        distributed: 0,
        results_returned: 0,
        reactive: 0,
        non_reactive: 0,
        invalid: 0,
      };
      existing.total += Number(r.total) || 0;
      existing.distributed += Number(r.distributed) || 0;
      existing.results_returned += Number(r.results_returned) || 0;
      existing.reactive += Number(r.reactive) || 0;
      existing.non_reactive += Number(r.non_reactive) || 0;
      existing.invalid += Number(r.invalid_count) || 0;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows, branch]);

  const totals = useMemo(() => {
    return aggregated.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.distributed += r.distributed;
        acc.reactive += r.reactive;
        acc.non_reactive += r.non_reactive;
        acc.results_returned += r.results_returned;
        return acc;
      },
      { total: 0, distributed: 0, reactive: 0, non_reactive: 0, results_returned: 0 }
    );
  }, [aggregated]);

  // Init Leaflet
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      preferCanvas: true,
    }).setView([13.5, 101.0], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Render bubbles
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const plottable = aggregated.filter((r) => r.lat != null && r.lng != null && r.total > 0);
    const maxTotal = plottable.reduce((m, r) => Math.max(m, r.total), 0);

    for (const r of plottable) {
      const color = colorForReactiveRate(r.reactive, r.results_returned);
      const radius = radiusForTotal(r.total, maxTotal);
      const circle = L.circleMarker([r.lat as number, r.lng as number], {
        radius,
        color: "white",
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.78,
      });
      const rate = r.results_returned > 0 ? ((r.reactive / r.results_returned) * 100).toFixed(1) : "—";
      circle.bindPopup(
        `<div style="min-width:200px;font-size:12px;line-height:1.55;">
           <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;">${escapeHtml(r.province)}</p>
           <p style="margin:0;">${t("ส่งทั้งหมด", "Total kits")}: <strong>${r.total.toLocaleString()}</strong></p>
           <p style="margin:0;">${t("กระจายแล้ว", "Distributed")}: <strong>${r.distributed.toLocaleString()}</strong></p>
           <p style="margin:0;">${t("ส่งผลกลับ", "Results returned")}: <strong>${r.results_returned.toLocaleString()}</strong></p>
           <p style="margin:0;color:#dc2626;">${t("Reactive", "Reactive")}: <strong>${r.reactive.toLocaleString()}</strong> (${rate}%)</p>
           <p style="margin:0;color:#059669;">${t("Non-reactive", "Non-reactive")}: <strong>${r.non_reactive.toLocaleString()}</strong></p>
         </div>`
      );
      circle.addTo(layer);
    }
  }, [aggregated, language]);

  const exportCsv = () => {
    const header = ["province", "total", "distributed", "results_returned", "reactive", "non_reactive", "invalid"];
    const lines = [header.join(",")];
    for (const r of aggregated) {
      lines.push([r.province, r.total, r.distributed, r.results_returned, r.reactive, r.non_reactive, r.invalid].join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selftest-by-province-${branch}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unknown = aggregated.find((r) => r.province === "(ไม่ระบุ)");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("แผนที่กระจายชุดตรวจ HIV Self-test", "HIV Self-test Distribution Map")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t(
                "Bubble map รายจังหวัด — ขนาดวงกลม = จำนวนคำขอ, สี = อัตรา reactive จากผลที่ส่งกลับ",
                "Province bubble map — size = total requests, color = reactive rate of returned results"
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={branch} onValueChange={(v) => setBranch(v as BranchFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ทุกสาขา", "All branches")}</SelectItem>
                <SelectItem value="silom">Silom</SelectItem>
                <SelectItem value="pattaya">Pattaya</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <StatCard label={t("คำขอทั้งหมด", "Total")} value={totals.total} />
            <StatCard label={t("กระจายแล้ว", "Distributed")} value={totals.distributed} />
            <StatCard label={t("ส่งผลกลับ", "Returned")} value={totals.results_returned} />
            <StatCard label={t("Reactive", "Reactive")} value={totals.reactive} accent="rose" />
            <StatCard label={t("Non-reactive", "Non-reactive")} value={totals.non_reactive} accent="emerald" />
          </div>

          <div className="relative rounded-xl overflow-hidden border" style={{ height: 520 }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur rounded-md border p-2 text-xs space-y-1 shadow">
              <div className="font-semibold mb-1">{t("อัตรา Reactive", "Reactive rate")}</div>
              <LegendDot color="hsl(150, 60%, 45%)" label="< 0.5%" />
              <LegendDot color="hsl(45, 95%, 55%)" label="0.5 – 2%" />
              <LegendDot color="hsl(20, 90%, 55%)" label="2 – 5%" />
              <LegendDot color="hsl(0, 84%, 55%)" label="≥ 5%" />
              <LegendDot color="hsl(220, 15%, 70%)" label={t("ยังไม่มีผล", "No results")} />
            </div>
          </div>

          {unknown && unknown.total > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              ⚠️ {t(
                `${unknown.total.toLocaleString()} คำขอไม่มีจังหวัด — ไม่ได้แสดงบนแผนที่`,
                `${unknown.total.toLocaleString()} requests have no province — not plotted on map`
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Top 20 จังหวัด", "Top 20 provinces")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">{t("จังหวัด", "Province")}</th>
                  <th className="py-2 px-3 text-right">{t("ทั้งหมด", "Total")}</th>
                  <th className="py-2 px-3 text-right">{t("กระจาย", "Distributed")}</th>
                  <th className="py-2 px-3 text-right">{t("ส่งผลกลับ", "Returned")}</th>
                  <th className="py-2 px-3 text-right">Reactive</th>
                  <th className="py-2 px-3 text-right">Non-reactive</th>
                  <th className="py-2 pl-3 text-right">{t("อัตรา %", "Rate %")}</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.slice(0, 20).map((r) => {
                  const rate = r.results_returned > 0 ? (r.reactive / r.results_returned) * 100 : 0;
                  return (
                    <tr key={r.province} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {r.province}
                        {!THAI_PROVINCE_CENTROIDS[r.province] && r.province !== "(ไม่ระบุ)" && (
                          <Badge variant="outline" className="ml-2 text-[10px]">{t("ไม่มีพิกัด", "no geo")}</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">{r.total.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{r.distributed.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{r.results_returned.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-rose-600 font-semibold">{r.reactive.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-emerald-600">{r.non_reactive.toLocaleString()}</td>
                      <td className="py-2 pl-3 text-right">{r.results_returned > 0 ? rate.toFixed(1) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "rose" | "emerald" }) {
  const tone =
    accent === "rose" ? "text-rose-600" : accent === "emerald" ? "text-emerald-600" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${tone}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block rounded-full" style={{ width: 12, height: 12, background: color }} />
      <span>{label}</span>
    </div>
  );
}
