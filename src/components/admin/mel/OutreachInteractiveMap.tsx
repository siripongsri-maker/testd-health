import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Filter, AlertCircle } from "lucide-react";
import { detectOutreachCity, hasValidCoordinates, pickFirstNonEmpty, toValidCoordinate } from "./outreachAnalytics";
import OutreachLeafletCanvas from "./OutreachLeafletCanvas";

interface DataRecord {
  city: string;
  map_lat: number | null;
  map_lng: number | null;
  area: string;
  venue: string;
  venue_name?: string;
  raw: any;
  date?: string;
  estimated_msw_count?: string;
  estimated_msm_count?: string;
  msw_estimated_range?: string;
  offsite_proportion?: string;
}

const CENTERS: Record<string, [number, number]> = {
  all: [13.45, 100.6],
  กรุงเทพฯ: [13.75, 100.52],
  พัทยา: [12.93, 100.88],
  อื่นๆ: [13.45, 100.6],
};
const ZOOMS: Record<string, number> = { all: 8, กรุงเทพฯ: 12, พัทยา: 13, อื่นๆ: 8 };

export default function OutreachInteractiveMap({ records }: { records: DataRecord[] }) {
  const [cityFilter, setCityFilter] = useState("all");

  const pins = useMemo(() => {
    return records.reduce<
      Array<{
        lat: number;
        lng: number;
        city: string;
        area: string;
        venue: string;
        date?: string;
        mswRange: string;
        msmRange: string;
        offsiteProportion: string;
      }>
    >((acc, record) => {
      if (!hasValidCoordinates(record)) return acc;

      const lat = toValidCoordinate(record.map_lat);
      const lng = toValidCoordinate(record.map_lng);
      if (lat === null || lng === null) return acc;

      acc.push({
        lat,
        lng,
        city: detectOutreachCity(lat, lng, record.city || ""),
        area: pickFirstNonEmpty([record.area, record.raw?.area_name, record.raw?.area]) || "ไม่ระบุพื้นที่",
        venue:
          pickFirstNonEmpty([
            record.venue_name,
            record.venue,
            record.raw?.venue_name,
            record.raw?.venue_alias,
            record.raw?.venue_type,
          ]) || "ไม่ระบุสถานที่",
        date: record.date,
        mswRange:
          pickFirstNonEmpty([
            record.msw_estimated_range,
            record.estimated_msw_count,
            record.raw?.msw_estimated_range,
            record.raw?.estimated_msw_count,
          ]) || "",
        msmRange: pickFirstNonEmpty([record.estimated_msm_count, record.raw?.estimated_msm_count]) || "",
        offsiteProportion: pickFirstNonEmpty([record.offsite_proportion, record.raw?.offsite_proportion]) || "",
      });

      return acc;
    }, []);
  }, [records]);

  const filteredPins = useMemo(
    () => (cityFilter === "all" ? pins : pins.filter((pin) => pin.city === cityFilter)),
    [pins, cityFilter]
  );

  const cityCounts = useMemo(
    () => ({
      กรุงเทพฯ: pins.filter((pin) => pin.city === "กรุงเทพฯ").length,
      พัทยา: pins.filter((pin) => pin.city === "พัทยา").length,
      อื่นๆ: pins.filter((pin) => pin.city === "อื่นๆ").length,
    }),
    [pins]
  );

  const center = CENTERS[cityFilter] || CENTERS.all;
  const zoom = ZOOMS[cityFilter] || ZOOMS.all;
  const pointList = filteredPins.map((pin) => [pin.lat, pin.lng] as [number, number]);
  const mapSyncKey = `${cityFilter}-${pointList.map(([lat, lng]) => `${lat.toFixed(4)}:${lng.toFixed(4)}`).join("|")}`;

  if (pins.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            แผนที่จุดสำรวจ
          </CardTitle>
          <CardDescription className="text-xs">แสดงผลเฉพาะข้อมูลพิกัดที่บันทึกจริงจากแบบฟอร์ม</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <AlertCircle className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">ยังไม่มีข้อมูลแผนที่</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ระบบยังไม่พบข้อมูลพิกัดจากแบบฟอร์มที่บันทึกไว้
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              แผนที่จุดสำรวจ ({filteredPins.length} จุด)
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              ตำแหน่ง GPS ที่บันทึกจากการลงพื้นที่จริง
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด ({pins.length})</SelectItem>
                <SelectItem value="กรุงเทพฯ">กรุงเทพฯ ({cityCounts["กรุงเทพฯ"]})</SelectItem>
                <SelectItem value="พัทยา">พัทยา ({cityCounts["พัทยา"]})</SelectItem>
                {cityCounts["อื่นๆ"] > 0 && <SelectItem value="อื่นๆ">อื่นๆ ({cityCounts["อื่นๆ"]})</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />กรุงเทพฯ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />พัทยา
          </span>
          {cityCounts["อื่นๆ"] > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />อื่นๆ
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:px-6 sm:pb-6">
        {filteredPins.length === 0 ? (
          <div className="mx-4 mb-4 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center sm:mx-0 sm:mb-0">
            <AlertCircle className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">ยังไม่มีข้อมูลพิกัดแผนที่ในตัวกรองนี้</p>
            <p className="mt-1 text-xs text-muted-foreground">กรุณาเปลี่ยนตัวกรองเมืองเพื่อแสดงผลจุดสำรวจ</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden rounded-lg border border-border bg-muted/20" style={{ height: "clamp(320px, 52vw, 500px)" }}>
            <OutreachLeafletCanvas center={center} zoom={zoom} pins={filteredPins} syncKey={mapSyncKey} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
