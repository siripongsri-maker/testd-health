export function pickFirstNonEmpty(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function parsePopulationRange(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (["unknown", "ไม่ทราบ", "n/a", "na", "null", "-"].includes(lower)) return null;

  const compact = normalized.replace(/\s+/g, "");

  if (/^<\d+$/.test(compact)) {
    const upperBound = Number.parseInt(compact.slice(1), 10);
    return Number.isFinite(upperBound) ? Math.max(1, Math.round(upperBound / 2)) : null;
  }

  if (/^\d+\+$/.test(compact)) {
    const lowerBound = Number.parseInt(compact, 10);
    return Number.isFinite(lowerBound) ? lowerBound : null;
  }

  const rangeMatch = compact.match(/^(\d+)[-–—](\d+)$/);
  if (rangeMatch) {
    const lowerBound = Number.parseInt(rangeMatch[1], 10);
    const upperBound = Number.parseInt(rangeMatch[2], 10);
    if (Number.isFinite(lowerBound) && Number.isFinite(upperBound)) {
      return Math.round((lowerBound + upperBound) / 2);
    }
  }

  const numeric = Number.parseInt(compact, 10);
  return Number.isFinite(numeric) ? numeric : null;
}

export function toValidCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function hasValidCoordinates(record: { map_lat: unknown; map_lng: unknown }): boolean {
  return toValidCoordinate(record.map_lat) !== null && toValidCoordinate(record.map_lng) !== null;
}

export function detectOutreachCity(lat: number, lng: number, cityField: string): string {
  if (cityField.includes("กรุงเทพ")) return "กรุงเทพฯ";
  if (cityField.includes("พัทยา")) return "พัทยา";

  if (lat > 13.4 && lat < 14.1 && lng > 100.2 && lng < 100.9) return "กรุงเทพฯ";
  if (lat > 12.7 && lat < 13.2 && lng > 100.7 && lng < 101.1) return "พัทยา";

  return "อื่นๆ";
}
