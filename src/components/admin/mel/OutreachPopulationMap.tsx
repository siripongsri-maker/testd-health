import { useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Loader2, AlertCircle } from "lucide-react";
import { hasValidCoordinates, parsePopulationRange, pickFirstNonEmpty } from "./outreachAnalytics";

const OutreachInteractiveMap = lazy(() => import("./OutreachInteractiveMap"));

interface DataRecord {
  city: string;
  map_lat: number | null;
  map_lng: number | null;
  area: string;
  venue: string;
  venue_name?: string;
  raw: any;
  date?: string;
  msw_estimated_range?: string;
  estimated_msw_count?: string;
  estimated_msm_count?: string;
  offsite_proportion?: string;
}

export default function OutreachPopulationMap({ records }: { records: DataRecord[] }) {
  const {
    populationData,
    totalMsw,
    totalMsm,
    surveyCountWithPopulation,
    mswSurveyCount,
    msmSurveyCount,
    missingMswCount,
    missingMsmCount,
  } = useMemo(() => {
    const cities: Record<
      string,
      {
        msw: number;
        msm: number;
        count: number;
        mswSources: number;
        msmSources: number;
      }
    > = {};

    let totalMswValue = 0;
    let totalMsmValue = 0;
    let totalSurveyCountWithPopulation = 0;
    let totalMswSources = 0;
    let totalMsmSources = 0;
    let totalMissingMsw = 0;
    let totalMissingMsm = 0;

    records.forEach((record) => {
      const city = record.city || "อื่นๆ";
      const mswRaw = pickFirstNonEmpty([
        record.msw_estimated_range,
        record.estimated_msw_count,
        record.raw?.msw_estimated_range,
        record.raw?.estimated_msw_count,
      ]);
      const msmRaw = pickFirstNonEmpty([
        record.estimated_msm_count,
        record.raw?.estimated_msm_count,
      ]);

      const mswValue = parsePopulationRange(mswRaw);
      const msmValue = parsePopulationRange(msmRaw);

      if (mswValue === null && msmValue === null) return;

      if (!cities[city]) {
        cities[city] = { msw: 0, msm: 0, count: 0, mswSources: 0, msmSources: 0 };
      }

      cities[city].count += 1;
      totalSurveyCountWithPopulation += 1;

      if (mswValue !== null) {
        cities[city].msw += mswValue;
        cities[city].mswSources += 1;
        totalMswValue += mswValue;
        totalMswSources += 1;
      } else {
        totalMissingMsw += 1;
      }

      if (msmValue !== null) {
        cities[city].msm += msmValue;
        cities[city].msmSources += 1;
        totalMsmValue += msmValue;
        totalMsmSources += 1;
      } else {
        totalMissingMsm += 1;
      }
    });

    return {
      populationData: Object.entries(cities).sort((a, b) => (b[1].msw + b[1].msm) - (a[1].msw + a[1].msm)),
      totalMsw: totalMswValue,
      totalMsm: totalMsmValue,
      surveyCountWithPopulation: totalSurveyCountWithPopulation,
      mswSurveyCount: totalMswSources,
      msmSurveyCount: totalMsmSources,
      missingMswCount: totalMissingMsw,
      missingMsmCount: totalMissingMsm,
    };
  }, [records]);

  const hasPins = records.some((record) => hasValidCoordinates(record));
  const maxPop = Math.max(...populationData.flatMap(([, data]) => [data.msw, data.msm]), 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            สัดส่วน MSW / MSM ตามพื้นที่
          </CardTitle>
          <CardDescription className="text-xs">
            ใช้ข้อมูลประชากรที่บันทึกจริงจากแบบฟอร์มที่มีอยู่ในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {populationData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
              <AlertCircle className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">ยังไม่มีข้อมูลเปรียบเทียบ MSM และ MSW</p>
              <p className="mt-1 text-xs text-muted-foreground">
                โปรดตรวจสอบว่ามีการบันทึกข้อมูลจำนวนประชากรในแบบฟอร์มแล้ว
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>MSW รวม: {totalMsw.toLocaleString()}</span>
                  <span>MSM รวม: {totalMsm.toLocaleString()}</span>
                  <span>แบบฟอร์มที่ใช้คำนวณ: {surveyCountWithPopulation}</span>
                </div>
                {(missingMsmCount > 0 || missingMswCount > 0) && (
                  <p className="mt-1">
                    หมายเหตุ: ข้อมูลที่ยังไม่ถูกบันทึกจะไม่ถูกนับรวม — MSW ขาด {missingMswCount} แบบฟอร์ม, MSM ขาด {missingMsmCount} แบบฟอร์ม
                  </p>
                )}
              </div>

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
                            style={{ width: `${data.msw > 0 ? Math.max((data.msw / maxPop) * 100, 2) : 0}%` }}
                          />
                          <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-foreground">
                            {data.mswSources > 0 ? `${data.msw.toLocaleString()} (${mswPct.toFixed(0)}%)` : "ไม่มีข้อมูล"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] w-8 text-right text-muted-foreground">MSM</span>
                        <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
                          <div
                            className="h-full bg-blue-500 rounded-sm transition-all duration-500"
                            style={{ width: `${data.msm > 0 ? Math.max((data.msm / maxPop) * 100, 2) : 0}%` }}
                          />
                          <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-semibold text-foreground">
                            {data.msmSources > 0 ? `${data.msm.toLocaleString()} (${msmPct.toFixed(0)}%)` : "ไม่มีข้อมูล"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-4 pt-2 text-[10px] text-muted-foreground border-t">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />MSW (Male Sex Workers)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />MSM (Men who have Sex with Men)</span>
                <span>MSW data points: {mswSurveyCount}</span>
                <span>MSM data points: {msmSurveyCount}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasPins ? (
        <Suspense
          fallback={
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">กำลังโหลดแผนที่...</span>
              </CardContent>
            </Card>
          }
        >
          <OutreachInteractiveMap records={records} />
        </Suspense>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">แผนที่จุดสำรวจ</CardTitle>
            <CardDescription className="text-xs">แสดงผลเฉพาะข้อมูลพิกัดที่บันทึกจริงจากแบบฟอร์ม</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
              <AlertCircle className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">ยังไม่มีข้อมูลพิกัดแผนที่</p>
              <p className="mt-1 text-xs text-muted-foreground">
                กรุณาปักหมุดสถานที่ในแบบฟอร์มเพื่อแสดงผลบนแผนที่
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
