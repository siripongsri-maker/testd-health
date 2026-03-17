import { useEffect, useRef } from "react";
import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function createColorIcon(color: "blue" | "orange" | "red") {
  const hue = color === "blue" ? "210" : color === "orange" ? "30" : "0";
  return L.divIcon({
    className: "custom-map-pin",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(${hue},90%,55%);border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

const BKK_ICON = createColorIcon("blue");
const PTY_ICON = createColorIcon("orange");
const OTHER_ICON = createColorIcon("red");

interface OutreachLeafletPin {
  lat: number;
  lng: number;
  city: string;
  area: string;
  venue: string;
  date?: string;
  mswRange: string;
  msmRange: string;
  offsiteProportion: string;
}

interface OutreachLeafletCanvasProps {
  center: [number, number];
  zoom: number;
  pins: OutreachLeafletPin[];
  syncKey: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatPopupDate = (value?: string) => {
  if (!value) return "";

  try {
    return format(new Date(value), "dd/MM/yyyy");
  } catch {
    return "";
  }
};

function buildPopupHtml(pin: OutreachLeafletPin) {
  const dateLabel = formatPopupDate(pin.date);
  const badges = [
    `<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:999px;background:hsla(var(--secondary));color:hsl(var(--secondary-foreground));font-size:10px;">${escapeHtml(pin.city)}</span>`,
    dateLabel
      ? `<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:999px;border:1px solid hsl(var(--border));font-size:10px;">${escapeHtml(dateLabel)}</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const mswLine = pin.mswRange
    ? `👥 MSW โดยประมาณ: <strong>${escapeHtml(pin.mswRange)}</strong>`
    : '<span style="color:hsl(var(--muted-foreground));">👥 ยังไม่มีข้อมูล MSW</span>';

  const msmLine = pin.msmRange
    ? `👥 MSM โดยประมาณ: <strong>${escapeHtml(pin.msmRange)}</strong>`
    : '<span style="color:hsl(var(--muted-foreground));">👥 ยังไม่มีข้อมูล MSM</span>';

  const offsiteLine = pin.offsiteProportion
    ? `<p style="margin:0;">🏠 รับงานนอกสถานที่: <strong>${escapeHtml(pin.offsiteProportion)}</strong></p>`
    : "";

  return `
    <div style="min-width:180px;font-size:12px;line-height:1.5;color:hsl(var(--foreground));">
      <p style="margin:0 0 4px 0;font-size:14px;font-weight:600;">${escapeHtml(pin.venue)}</p>
      <p style="margin:0 0 6px 0;color:hsl(var(--muted-foreground));">📍 ${escapeHtml(pin.area)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">${badges}</div>
      <p style="margin:0 0 4px 0;">${mswLine}</p>
      <p style="margin:0 0 4px 0;">${msmLine}</p>
      ${offsiteLine}
      <p style="margin:6px 0 0 0;font-size:10px;color:hsl(var(--muted-foreground));">${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}</p>
    </div>
  `;
}

export default function OutreachLeafletCanvas({ center, zoom, pins, syncKey }: OutreachLeafletCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      preferCanvas: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      layerRef.current?.clearLayers();
      layerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    const container = containerRef.current;

    if (!map || !layer || !container) return;

    layer.clearLayers();

    const points: [number, number][] = [];

    pins.forEach((pin) => {
      const position: [number, number] = [pin.lat, pin.lng];
      points.push(position);

      L.marker(position, {
        icon: pin.city === "พัทยา" ? PTY_ICON : pin.city === "กรุงเทพฯ" ? BKK_ICON : OTHER_ICON,
      })
        .bindPopup(buildPopupHtml(pin), { maxWidth: 260 })
        .addTo(layer);
    });

    const syncView = () => {
      map.invalidateSize(false);

      if (points.length === 1) {
        map.setView(points[0], Math.max(zoom, 14), { animate: false });
        return;
      }

      if (points.length > 1) {
        const bounds = L.latLngBounds(points);
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.18), { animate: false, maxZoom: 14 });
          return;
        }
      }

      map.setView(center, zoom, { animate: false });
    };

    syncView();

    const frame = window.requestAnimationFrame(syncView);
    const timers = [0, 120, 320, 700].map((delay) => window.setTimeout(syncView, delay));
    const resizeObserver = new ResizeObserver(syncView);
    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      resizeObserver.disconnect();
    };
  }, [center, zoom, pins, syncKey]);

  return <div ref={containerRef} className="h-full w-full" aria-label="outreach-leaflet-map" />;
}
