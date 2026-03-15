/**
 * Export Watermark Utility
 * Embeds invisible watermarks in CSV exports for traceability.
 * Uses zero-width Unicode characters to encode actor identity.
 */

const ZERO_WIDTH_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF']; // ZWS, ZWNJ, ZWJ, BOM

/** Encode a string into zero-width characters (base-4 encoding) */
function encodeToZeroWidth(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return Array.from(bytes)
    .flatMap(b => {
      const digits = [];
      let val = b;
      for (let i = 0; i < 4; i++) {
        digits.unshift(val % 4);
        val = Math.floor(val / 4);
      }
      return digits;
    })
    .map(d => ZERO_WIDTH_CHARS[d])
    .join('');
}

/** Decode zero-width characters back to the original string */
export function decodeFromZeroWidth(encoded: string): string {
  const digits = [...encoded]
    .filter(c => ZERO_WIDTH_CHARS.includes(c))
    .map(c => ZERO_WIDTH_CHARS.indexOf(c));

  const bytes: number[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    if (i + 3 >= digits.length) break;
    bytes.push(digits[i] * 64 + digits[i + 1] * 16 + digits[i + 2] * 4 + digits[i + 3]);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export interface WatermarkPayload {
  userId: string;
  role: string;
  timestamp: number;
  module: string;
}

/** Build a compact watermark string */
function buildWatermark(payload: WatermarkPayload): string {
  const short = [
    payload.userId.slice(0, 8),
    payload.role.slice(0, 3),
    payload.timestamp.toString(36),
    payload.module.slice(0, 10),
  ].join('|');
  return short;
}

/** Inject invisible watermark into the first header cell of a CSV string */
export function watermarkCsv(csv: string, payload: WatermarkPayload): string {
  const marker = encodeToZeroWidth(buildWatermark(payload));
  // Insert after the first cell of the header row
  const firstComma = csv.indexOf(',');
  if (firstComma === -1) return csv;

  // Check for BOM
  const bom = csv.startsWith('\uFEFF') ? '\uFEFF' : '';
  const content = bom ? csv.slice(1) : csv;
  const idx = content.indexOf(',');
  if (idx === -1) return csv;

  return bom + content.slice(0, idx) + marker + content.slice(idx);
}

/** Extract watermark payload from a CSV string (for forensic analysis) */
export function extractWatermark(csv: string): string | null {
  const zwChars = [...csv].filter(c => ZERO_WIDTH_CHARS.includes(c)).join('');
  if (zwChars.length < 4) return null;
  try {
    return decodeFromZeroWidth(zwChars);
  } catch {
    return null;
  }
}
