import { useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Loader2 } from "lucide-react";

const OutreachInteractiveMap = lazy(() => import("./OutreachInteractiveMap"));

interface DataRecord {
  city: string;
  map_lat: number | null;
  map_lng: number | null;
  area: string;
  venue: string;
  raw: any;
  date?: string;
}

interface Props {
  records: DataRecord[];
}

// Parse MSW/MSM range strings like "1-5", "6-10", "11-20", "21-50", "50+" into midpoint numbers
function parseRange(val: string | null | undefined): number {
  if (!val || val === "unknown" || val === "ไม่ทราบ" || val === "") return 0;
  if (val.includes("+")) return parseInt(val) || 0;
  if (val.includes("-")) {
    const [lo, hi] = val.split("-").map(Number);
    return Math.round((lo + hi) / 2);
  }
  return parseInt(val) || 0;
}

export default function OutreachPopulationMap({ records }: Props) {
    const cities: Record<string, { msw: number; msm: number; count: number }> = {};
    records.forEach((r) => {
      const raw = r.raw;
      const mswVal = parseRange(raw?.msw_estimated_range || raw?.estimated_msw_count);
      const msmVal = parseRange(raw?.estimated_msm_count);
      if (mswVal === 0 && msmVal === 0) return;
      const city = r.city || "อื่นๆ";
      if (!cities[city]) cities[city] = { msw: 0, msm: 0, count: 0 };
      cities[city].msw += mswVal;
      cities[city].msm += msmVal;
      cities[city].count++;
    });
    return Object.entries(cities).sort((a, b) => (b[1].msw + b[1].msm) - (a[1].msw + a[1].msm));
  }, [records]);

  // Pins with lat/lng
  const pins = useMemo(() => {
    return records
      .filter((r) => r.map_lat && r.map_lng)
      .map((r) => ({
        lat: r.map_lat!,
        lng: r.map_lng!,
        city: r.city,
        area: r.area,
        venue: r.venue,
      }));
  }, [records]);

  const totalMsw = populationData.reduce((s, [, d]) => s + d.msw, 0);
  const totalMsm = populationData.reduce((s, [, d]) => s + d.msm, 0);
  const maxPop = Math.max(...populationData.map(([, d]) => Math.max(d.msw, d.msm)), 1);

  if (populationData.length === 0 && pins.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* MSW vs MSM Bar Chart */}
      {populationData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              สัดส่วน MSW / MSM ตามพื้นที่
            </CardTitle>
            <CardDescription className="text-xs">
              ประมาณการจำนวนประชากรจากการสำรวจภาคสนาม (MSW: {totalMsw.toLocaleString()} | MSM: {totalMsm.toLocaleString()})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {populationData.map(([city, data]) => {
              const total = data.msw + data.msm;
              const mswPct = total > 0 ? (data.msw / total) * 100 : 0;
              const msmPct = total > 0 ? (data.msm / total) * 100 : 0;
              const barMax = Math.max(data.msw, data.msm, 1);
              return (
                <div key={city} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{city}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {data.count} surveys | Total ~{total}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-8 text-right text-muted-foreground">MSW</span>
                      <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
                        <div
                          className="h-full bg-rose-500 rounded-sm transition-all duration-500"
                          style={{ width: `${Math.max((data.msw / maxPop) * 100, 2)}%` }}
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-foreground">
                          {data.msw} ({mswPct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-8 text-right text-muted-foreground">MSM</span>
                      <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
                        <div
                          className="h-full bg-blue-500 rounded-sm transition-all duration-500"
                          style={{ width: `${Math.max((data.msm / maxPop) * 100, 2)}%` }}
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-foreground">
                          {data.msm} ({msmPct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 pt-2 text-[10px] text-muted-foreground border-t">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />MSW (Male Sex Workers)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />MSM (Men who have Sex with Men)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pin Map */}
      {pins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              แผนที่จุดสำรวจ ({pins.length} จุด)
            </CardTitle>
            <CardDescription className="text-xs">
              ตำแหน่ง GPS ที่บันทึกจากการลงพื้นที่ กรุงเทพฯ และ พัทยา
            </CardDescription>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 620 300" className="w-full h-auto" style={{ maxHeight: 400 }}>
              {/* Background */}
              <rect x="0" y="0" width="620" height="300" rx="8" className="fill-muted/30" />

              {/* Bangkok region */}
              <rect x="50" y="40" width="200" height="220" rx="6" className="fill-muted/50 stroke-border" strokeWidth="1" />
              <text x="150" y="30" textAnchor="middle" className="fill-foreground text-[11px] font-semibold">กรุงเทพฯ</text>

              {/* Pattaya region */}
              <rect x="410" y="40" width="140" height="220" rx="6" className="fill-muted/50 stroke-border" strokeWidth="1" />
              <text x="480" y="30" textAnchor="middle" className="fill-foreground text-[11px] font-semibold">พัทยา</text>

              {/* Plot pins */}
              {pins.map((pin, i) => {
                let svgX = 310, svgY = 150; // default center for unknown
                const region = Object.entries(REGIONS).find(([name]) => pin.city === name);
                if (region) {
                  const [, cfg] = region;
                  const { bounds, mapW, mapH, offsetX, offsetY } = cfg;
                  const pctX = (pin.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
                  const pctY = 1 - (pin.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat);
                  svgX = offsetX + pctX * mapW;
                  svgY = offsetY + pctY * mapH;
                  // Clamp inside region box
                  svgX = Math.max(offsetX + 4, Math.min(offsetX + mapW - 4, svgX));
                  svgY = Math.max(offsetY + 4, Math.min(offsetY + mapH - 4, svgY));
                }
                return (
                  <g key={i}>
                    <circle cx={svgX} cy={svgY} r="4" className="fill-primary/80 stroke-primary-foreground" strokeWidth="1">
                      <title>{`${pin.area || pin.venue || pin.city}\n${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`}</title>
                    </circle>
                    {/* Pulse effect */}
                    <circle cx={svgX} cy={svgY} r="4" className="fill-primary/30" strokeWidth="0">
                      <animate attributeName="r" values="4;10;4" dur="3s" begin={`${(i % 5) * 0.6}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" begin={`${(i % 5) * 0.6}s`} repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              })}

              {/* Stats labels */}
              <text x="150" y="275" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {pins.filter(p => p.city === "กรุงเทพฯ").length} pins
              </text>
              <text x="480" y="275" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {pins.filter(p => p.city === "พัทยา").length} pins
              </text>
            </svg>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
