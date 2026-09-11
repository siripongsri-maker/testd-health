/**
 * Helpers for the admin "upload tracking numbers" screen.
 *
 * Staff upload either
 *  - a CSV exported from the courier (tracking number + recipient name/phone), or
 *  - the Thailand Post e-Parcel label PDFs (one label per page),
 * and we match each tracking number back to the kit request automatically.
 */

export interface ParsedShipment {
  tracking: string;
  name?: string;
  phone?: string;
  source: string;
}

export const TRACKING_RE = /\b[A-Z]{2}\d{9}[A-Z]{2}\b/g;

export function normalizePhone(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function phoneKey(value?: string | null): string {
  const digits = normalizePhone(value);
  return digits.length >= 9 ? digits.slice(-9) : '';
}

/** Thai text in PDF labels often loses tone marks — strip them on both sides before comparing. */
export function nameKey(value?: string | null): string {
  return (value ?? '')
    .normalize('NFC')
    .replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\s]/g, '')
    .toLowerCase()
    .trim();
}

function pickTracking(text: string): string[] {
  const found = text.toUpperCase().match(TRACKING_RE);
  return found ? Array.from(new Set(found)) : [];
}

/** Thai marks/whitespace that PDF extraction scatters around; ignore them when searching. */
const NOISE_RE = /[\s\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\uF700-\uF71F]/;

/**
 * Find where the recipient block starts ("กรุณานำส่ง") even when the PDF splits
 * every glyph onto its own line and mangles tone marks. Returns -1 if absent.
 */
function findRecipientIndex(text: string): number {
  const target = 'กรณานาสง';
  let stripped = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    if (NOISE_RE.test(ch)) continue;
    if (ch === '\u0E33') ch = 'า'; // ำ -> า
    stripped += ch;
    map.push(i);
  }
  const at = stripped.indexOf(target);
  if (at === -1) return -1;
  return map[Math.min(at + target.length, map.length - 1)] + 1;
}

/** Extract one shipment per Thailand Post label page. */
export function parseLabelText(pageText: string, source: string): ParsedShipment | null {
  const [tracking] = pickTracking(pageText);
  if (!tracking) return null;

  const at = findRecipientIndex(pageText);
  const afterRecipient = at >= 0 ? pageText.slice(at) : pageText;

  // Phones never wrap across lines — keep the match on a single line.
  const phones = afterRecipient.match(/0\d[\d-]{7,11}/g) ?? [];
  const phone = phones.length ? normalizePhone(phones[0]) : undefined;

  const nameLine = afterRecipient
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 1 && !/^โทร/.test(l) && !/^\d/.test(l));

  return { tracking, name: nameLine, phone, source };
}

/** Parse a CSV/TSV where any column may hold the tracking number, name or phone. */
export function parseDelimitedText(text: string, source: string): ParsedShipment[] {
  const rows = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: ParsedShipment[] = [];

  for (const row of rows) {
    const cells = row.split(/[,;\t|]/).map((c) => c.replace(/^"|"$/g, '').trim());
    const joined = cells.join(' ');
    const [tracking] = pickTracking(joined);
    if (!tracking) continue;

    const phoneCell = cells.find((c) => {
      const d = normalizePhone(c);
      return d.length >= 9 && d.length <= 11 && d.startsWith('0');
    });
    const nameCell = cells.find(
      (c) => c && !/\d/.test(c) && c.toUpperCase() !== tracking && c.length > 1,
    );

    out.push({
      tracking,
      name: nameCell,
      phone: phoneCell ? normalizePhone(phoneCell) : undefined,
      source,
    });
  }

  return out;
}

/** Read every page of a PDF and return one shipment per label found. */
export async function parsePdfFile(file: File): Promise<ParsedShipment[]> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const shipments: ParsedShipment[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join('\n');
    const parsed = parseLabelText(text, `${file.name} · หน้า ${i}`);
    if (parsed) shipments.push(parsed);
  }

  doc.cleanup();
  return shipments;
}

export interface RequestCandidate {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  tracking_number: string | null;
  created_at: string;
}

export type MatchConfidence = 'phone' | 'name' | 'none';

export interface MatchResult extends ParsedShipment {
  requestId?: string;
  matchedName?: string | null;
  matchedPhone?: string | null;
  currentTracking?: string | null;
  confidence: MatchConfidence;
}

/** Match parsed shipments to open requests: phone first, then name. */
export function matchShipments(
  shipments: ParsedShipment[],
  candidates: RequestCandidate[],
): MatchResult[] {
  const byPhone = new Map<string, RequestCandidate>();
  const byName = new Map<string, RequestCandidate[]>();

  for (const c of candidates) {
    const pk = phoneKey(c.phone);
    if (pk && !byPhone.has(pk)) byPhone.set(pk, c);
    const nk = nameKey(c.full_name);
    if (nk) byName.set(nk, [...(byName.get(nk) ?? []), c]);
  }

  const used = new Set<string>();

  return shipments.map((s) => {
    const pk = phoneKey(s.phone);
    let hit = pk ? byPhone.get(pk) : undefined;
    let confidence: MatchConfidence = hit ? 'phone' : 'none';

    if (!hit && s.name) {
      const nk = nameKey(s.name);
      const exact = byName.get(nk);
      const partial =
        exact ??
        (nk.length > 3
          ? Array.from(byName.entries())
              .filter(([key]) => key.includes(nk) || nk.includes(key))
              .flatMap(([, v]) => v)
          : []);
      if (partial && partial.length === 1) {
        hit = partial[0];
        confidence = 'name';
      }
    }

    if (hit && used.has(hit.id)) {
      return { ...s, confidence: 'none' };
    }
    if (hit) used.add(hit.id);

    return {
      ...s,
      requestId: hit?.id,
      matchedName: hit?.full_name ?? null,
      matchedPhone: hit?.phone ?? null,
      currentTracking: hit?.tracking_number ?? null,
      confidence: hit ? confidence : 'none',
    };
  });
}
