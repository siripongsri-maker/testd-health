import { useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Loader2 } from "lucide-react";

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

function parseRange(val: string | null | undefined): number {
  if (!val || val === "unknown" || val === "ไม่ทราบ" || val === "") return 0;
  // Handle "<10" style
  if (val.startsWith("<")) return Math.max(Math.floor((parseInt(val.slice(1)) || 0) / 2), 1);
  // Handle "50+" style
  if (val.includes("+")) return parseInt(val) || 0;
  // Handle ranges with hyphen (-) or en-dash (–) or em-dash (—)
  const rangeMatch = val.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1]);
    const hi = parseInt(rangeMatch[2]);
    return Math.round((lo + hi) / 2);
  }
  return parseInt(val) || 0;
}

export default function OutreachPopulationMap({ records }: Props) {
  const populationData = useMemo(() => {
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

  const hasPins = records.some((r) => r.map_lat && r.map_lng);
  const totalMsw = populationData.reduce((s, [, d]) => s + d.msw, 0);
  const totalMsm = populationData.reduce((s, [, d]) => s + d.msm, 0);
  const maxPop = Math.max(...populationData.map(([, d]) => Math.max(d.msw, d.msm)), 1);

  if (populationData.length === 0 && !hasPins) return null;

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

      {/* Interactive Leaflet Map */}
      {hasPins && (
        <Suspense fallback={
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">กำลังโหลดแผนที่...</span>
            </CardContent>
          </Card>
        }>
          <OutreachInteractiveMap records={records} />
        </Suspense>
      )}
    </div>
  );
}
