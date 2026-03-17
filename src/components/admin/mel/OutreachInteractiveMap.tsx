import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter } from "lucide-react";
import { format } from "date-fns";

// Lazy-load Leaflet CSS + components
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in bundled environments
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom colored icons
function createColorIcon(color: "blue" | "orange" | "red") {
  const hue = color === "blue" ? "210" : color === "orange" ? "30" : "0";
  return L.divIcon({
    className: "custom-map-pin",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:hsl(${hue},90%,55%);
      border:2.5px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

const BKK_ICON = createColorIcon("blue");
const PTY_ICON = createColorIcon("orange");

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

// Bangkok center ~13.75, 100.5 | Pattaya center ~12.93, 100.88
const CENTERS: Record<string, [number, number]> = {
  all: [13.45, 100.6],
  กรุงเทพฯ: [13.75, 100.52],
  พัทยา: [12.93, 100.88],
};
const ZOOMS: Record<string, number> = { all: 8, กรุงเทพฯ: 12, พัทยา: 13 };

function detectCity(lat: number, lng: number, cityField: string): string {
  if (cityField.includes("กรุงเทพ")) return "กรุงเทพฯ";
  if (cityField.includes("พัทยา")) return "พัทยา";
  // Coordinate-based detection
  if (lat > 13.4 && lat < 14.1 && lng > 100.2 && lng < 100.9) return "กรุงเทพฯ";
  if (lat > 12.7 && lat < 13.2 && lng > 100.7 && lng < 101.1) return "พัทยา";
  return "อื่นๆ";
}

// Component to recenter map when filter changes + fix tile loading in tabs
function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    // Fix tiles not rendering when map is inside a hidden tab
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

export default function OutreachInteractiveMap({ records }: Props) {
  const [cityFilter, setCityFilter] = useState("all");

  const pins = useMemo(() => {
    return records
      .filter((r) => r.map_lat && r.map_lng)
      .map((r) => {
        const detectedCity = detectCity(r.map_lat!, r.map_lng!, r.city);
        return {
          lat: r.map_lat!,
          lng: r.map_lng!,
          city: detectedCity,
          area: r.area,
          venue: r.venue || r.raw?.venue_name || "-",
          date: r.date,
          mswRange: r.raw?.msw_estimated_range || r.raw?.estimated_msw_count || "-",
          offsiteProportion: r.raw?.offsite_proportion || "-",
        };
      });
  }, [records]);

  const filteredPins = useMemo(
    () => (cityFilter === "all" ? pins : pins.filter((p) => p.city === cityFilter)),
    [pins, cityFilter]
  );

  const bkkCount = pins.filter((p) => p.city === "กรุงเทพฯ").length;
  const ptyCount = pins.filter((p) => p.city === "พัทยา").length;

  const center = CENTERS[cityFilter] || CENTERS.all;
  const zoom = ZOOMS[cityFilter] || ZOOMS.all;

  if (pins.length === 0) return null;

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
              ตำแหน่ง GPS ที่บันทึกจากการลงพื้นที่
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด ({pins.length})</SelectItem>
                <SelectItem value="กรุงเทพฯ">กรุงเทพฯ ({bkkCount})</SelectItem>
                <SelectItem value="พัทยา">พัทยา ({ptyCount})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />กรุงเทพฯ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />พัทยา
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:px-6 sm:pb-6">
        <div className="w-full rounded-lg overflow-hidden" style={{ height: "clamp(300px, 50vw, 500px)" }}>
          <MapContainer
            center={center}
            zoom={zoom}
            className="w-full h-full z-0"
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecenter center={center} zoom={zoom} />
            {filteredPins.map((pin, i) => (
              <Marker
                key={`${pin.lat}-${pin.lng}-${i}`}
                position={[pin.lat, pin.lng]}
                icon={pin.city === "พัทยา" ? PTY_ICON : BKK_ICON}
              >
                <Popup maxWidth={260} className="outreach-popup">
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-sm">{pin.venue}</p>
                    <p className="text-muted-foreground">📍 {pin.area}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">{pin.city}</Badge>
                      {pin.date && (
                        <Badge variant="outline" className="text-[10px]">
                          {format(new Date(pin.date), "dd/MM/yyyy")}
                        </Badge>
                      )}
                    </div>
                    {pin.mswRange !== "-" && (
                      <p>👥 MSW โดยประมาณ: <strong>{pin.mswRange}</strong></p>
                    )}
                    {pin.offsiteProportion !== "-" && (
                      <p>🏠 รับงานนอกสถานที่: <strong>{pin.offsiteProportion}</strong></p>
                    )}
                    <p className="text-[10px] text-muted-foreground pt-1">
                      {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
