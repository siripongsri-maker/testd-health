import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CsvType = "bangkok" | "pattaya_reach" | "legacy_hivst_combined" | "unknown";

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  insertedIds: string[];
  updatedIds: string[];
  csvType: CsvType;
  reactiveFlagged?: number;
}

// ── CSV Parsing ──
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    
    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current.trim());
        current = '';
      } else if (char === '\n' || (char === '\r' && next === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.some(cell => cell !== '')) {
          rows.push(row);
        }
        row = [];
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }
  if (current !== '' || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== '')) {
      rows.push(row);
    }
  }
  
  return rows;
}

const CP874_MAP: Record<number, string> = {
  0x80: '\u20AC',
  0x85: '\u2026',
  0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D',
  0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  0xA0: '\u00A0',
  0xA1: '\u0E01', 0xA2: '\u0E02', 0xA3: '\u0E03', 0xA4: '\u0E04',
  0xA5: '\u0E05', 0xA6: '\u0E06', 0xA7: '\u0E07', 0xA8: '\u0E08',
  0xA9: '\u0E09', 0xAA: '\u0E0A', 0xAB: '\u0E0B', 0xAC: '\u0E0C',
  0xAD: '\u0E0D', 0xAE: '\u0E0E', 0xAF: '\u0E0F',
  0xB0: '\u0E10', 0xB1: '\u0E11', 0xB2: '\u0E12', 0xB3: '\u0E13',
  0xB4: '\u0E14', 0xB5: '\u0E15', 0xB6: '\u0E16', 0xB7: '\u0E17',
  0xB8: '\u0E18', 0xB9: '\u0E19', 0xBA: '\u0E1A', 0xBB: '\u0E1B',
  0xBC: '\u0E1C', 0xBD: '\u0E1D', 0xBE: '\u0E1E', 0xBF: '\u0E1F',
  0xC0: '\u0E20', 0xC1: '\u0E21', 0xC2: '\u0E22', 0xC3: '\u0E23',
  0xC4: '\u0E24', 0xC5: '\u0E25', 0xC6: '\u0E26', 0xC7: '\u0E27',
  0xC8: '\u0E28', 0xC9: '\u0E29', 0xCA: '\u0E2A', 0xCB: '\u0E2B',
  0xCC: '\u0E2C', 0xCD: '\u0E2D', 0xCE: '\u0E2E', 0xCF: '\u0E2F',
  0xD0: '\u0E30', 0xD1: '\u0E31', 0xD2: '\u0E32', 0xD3: '\u0E33',
  0xD4: '\u0E34', 0xD5: '\u0E35', 0xD6: '\u0E36', 0xD7: '\u0E37',
  0xD8: '\u0E38', 0xD9: '\u0E39', 0xDA: '\u0E3A',
  0xDF: '\u0E3F',
  0xE0: '\u0E40', 0xE1: '\u0E41', 0xE2: '\u0E42', 0xE3: '\u0E43',
  0xE4: '\u0E44', 0xE5: '\u0E45', 0xE6: '\u0E46', 0xE7: '\u0E47',
  0xE8: '\u0E48', 0xE9: '\u0E49', 0xEA: '\u0E4A', 0xEB: '\u0E4B',
  0xEC: '\u0E4C', 0xED: '\u0E4D', 0xEE: '\u0E4E', 0xEF: '\u0E4F',
  0xF0: '\u0E50', 0xF1: '\u0E51', 0xF2: '\u0E52', 0xF3: '\u0E53',
  0xF4: '\u0E54', 0xF5: '\u0E55', 0xF6: '\u0E56', 0xF7: '\u0E57',
  0xF8: '\u0E58', 0xF9: '\u0E59', 0xFA: '\u0E5A', 0xFB: '\u0E5B',
};

function decodeCp874(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      result += String.fromCharCode(b);
    } else {
      result += CP874_MAP[b] || '\uFFFD';
    }
  }
  return result;
}

function isValidUtf8Thai(text: string): boolean {
  const firstLine = text.split('\n')[0] || '';
  const hasReplacementChars = firstLine.includes('\uFFFD');
  const thaiCharCount = (firstLine.match(/[\u0E01-\u0E5B]/g) || []).length;
  return !hasReplacementChars && thaiCharCount > 3;
}

async function decodeCSVFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let utf8Text = decoder.decode(bytes);
  // Strip UTF-8 BOM if present
  if (utf8Text.charCodeAt(0) === 0xFEFF) utf8Text = utf8Text.slice(1);
  if (isValidUtf8Thai(utf8Text)) return utf8Text;
  const cp874Text = decodeCp874(bytes);
  const cp874FirstLine = cp874Text.split('\n')[0] || '';
  const thaiCount = (cp874FirstLine.match(/[\u0E01-\u0E5B]/g) || []).length;
  if (thaiCount > 3) {
    console.log("Decoded CSV as CP874/Windows-874");
    return cp874Text;
  }
  // Fallback: ASCII / English-only CSV (legacy exports with no Thai in headers)
  const firstLine = utf8Text.split('\n')[0] || '';
  if (!firstLine.includes('\uFFFD') && firstLine.length > 0) {
    console.log("Decoded CSV as UTF-8/ASCII (no Thai detected)");
    return utf8Text;
  }
  throw new Error("Unsupported CSV encoding");
}

function detectCsvType(headers: string[]): CsvType {
  const joined = headers.join(' ');
  // Pre-processed legacy export: hivst_results_clean.csv
  // Pre-processed legacy export: hivst_results_clean.csv (English headers)
  if (joined.includes('result_id') && (joined.includes('submitted_at') || joined.includes('result_raw') || joined.includes('result_normalized'))) return 'legacy_hivst_combined';
  if (joined.includes('ประทับเวลา') && joined.includes('ชื่อ-นามสกุล')) return 'bangkok';
  if (joined.includes('วันที่รับบริการ') && (joined.includes('ชื่อจริง') || joined.includes('นามสกุล'))) return 'pattaya_reach';
  if (joined.includes('ประทับเวลา') || joined.includes('Line id') || joined.includes('ที่อยู่ในการจัดส่ง')) return 'bangkok';
  if (joined.includes('UIC') || joined.includes('HNID') || joined.includes('กลุ่มประชากร')) return 'pattaya_reach';
  return 'unknown';
}

// ── Legacy combined helpers ──
function normalizeLegacyResult(v: string | undefined): "non_reactive" | "reactive" | "invalid" | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s === 'non_reactive' || s === 'reactive' || s === 'invalid') return s as any;
  return null;
}

function parseIsoTimestamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  // Already ISO-ish: "2025-10-23 15:17:53.087"
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    return `${y}-${mo}-${d}T${h}:${mi}:${se}+07:00`;
  }
  return null;
}

function buildLegacyPiiIndex(piiCsv: string | null): Map<string, Record<string, string>> {
  const idx = new Map<string, Record<string, string>>();
  if (!piiCsv) return idx;
  const rows = parseCSV(piiCsv);
  if (rows.length < 2) return idx;
  const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim());
  const ridIdx = headers.findIndex(h => h === 'result_id');
  if (ridIdx < 0) return idx;
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const rid = cells[ridIdx]?.trim();
    if (!rid) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (cells[c] ?? '').trim();
    }
    idx.set(rid, obj);
  }
  return idx;
}


function findCol(headers: string[], ...patterns: string[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex(h => h.includes(pattern));
    if (idx !== -1) return idx;
  }
  return -1;
}

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits || null;
}

function normalizeThaiId(raw: string | undefined): { value: string | null; valid: boolean } {
  if (!raw) return { value: null, valid: false };
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 13) return { value: digits || null, valid: false };
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (13 - i);
  const check = (11 - (sum % 11)) % 10;
  return { value: digits, valid: check === parseInt(digits[12]) };
}

function parseBuddhistDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  const slashMatch = cleaned.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
  if (slashMatch) {
    let day = parseInt(slashMatch[1]), month = parseInt(slashMatch[2]), year = parseInt(slashMatch[3]);
    if (year > 2400) year -= 543;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const thaiMonths: Record<string, number> = {
    'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
    'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
    'กพ': 2, 'มค': 1, 'มีค': 3, 'เมย': 4, 'พค': 5, 'มิย': 6,
    'กค': 7, 'สค': 8, 'กย': 9, 'ตค': 10, 'พย': 11, 'ธค': 12,
  };
  for (const [abbr, monthNum] of Object.entries(thaiMonths)) {
    if (cleaned.includes(abbr)) {
      const dayMatch = cleaned.match(/(\d{1,2})/);
      const yearMatch = cleaned.match(/(\d{4})/);
      if (dayMatch && yearMatch) {
        let year = parseInt(yearMatch[1]);
        if (year > 2400) year -= 543;
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(parseInt(dayMatch[1])).padStart(2, '0')}`;
      }
    }
  }
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return cleaned;
  return null;
}

function normalizeGender(raw: string | undefined): string | null {
  if (!raw) return null;
  const g = raw.trim().toLowerCase();
  if (g === 'ชาย' || g === 'male') return 'male';
  if (g === 'หญิง' || g === 'female') return 'female';
  if (g.includes('ข้ามเพศ') && g.includes('ชาย')) return 'transgender_male';
  if (g.includes('ข้ามเพศ') && g.includes('หญิง')) return 'transgender_female';
  if (g.includes('ไม่ระบุ') || g.includes('non')) return 'non_binary';
  return raw.trim() || null;
}

function parseTimestamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (!match) return null;
  const [, day, month, year, hour, min, sec] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${(sec || '00').padStart(2, '0')}+07:00`;
}

function parseDateToTimestamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  let y = parseInt(year);
  if (y > 2400) y -= 543;
  return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00+07:00`;
}

function processBangkokRow(cells: string[], headers: string[], colMap: Record<string, number>) {
  const get = (key: string) => { const idx = colMap[key]; return idx >= 0 && idx < cells.length ? cells[idx]?.trim() : undefined; };
  return {
    fullName: get('fullName') || null,
    thaiId: normalizeThaiId(get('thaiId')),
    phone: normalizePhone(get('phone')),
    lineId: get('lineId') || null,
    gender: normalizeGender(get('gender')),
    dob: parseBuddhistDate(get('dob')),
    address: get('address') || null,
    timestamp: parseTimestamp(get('timestamp')),
  };
}

function processPattayaReachRow(cells: string[], colMap: Record<string, number>) {
  const get = (key: string) => { const idx = colMap[key]; return idx >= 0 && idx < cells.length ? cells[idx]?.trim() : undefined; };
  const firstName = get('firstName') || '';
  const lastName = get('lastName') || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
  let dob: string | null = null;
  const ageRaw = get('age');
  if (ageRaw) {
    const age = parseInt(ageRaw, 10);
    if (!isNaN(age) && age > 0 && age < 120) {
      const serviceDateRaw = get('serviceDate');
      const refTimestamp = parseDateToTimestamp(serviceDateRaw);
      const refDate = refTimestamp ? new Date(refTimestamp) : new Date();
      dob = `${refDate.getFullYear() - age}-07-01`;
    }
  }
  return { fullName, thaiId: normalizeThaiId(get('thaiId')), phone: null, lineId: null, gender: normalizeGender(get('gender')), dob, address: null, timestamp: parseDateToTimestamp(get('serviceDate')) };
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const csvFile = formData.get("csv") as File;
    const piiFile = formData.get("pii_csv") as File | null;
    const dryRun = formData.get("dry_run") === "true";
    const branch = (formData.get("branch") as string) || "silom";

    if (!csvFile) {
      return new Response(JSON.stringify({ error: "No CSV file provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let csvText: string;
    try {
      csvText = await decodeCSVFile(csvFile);
    } catch (encErr: any) {
      return new Response(JSON.stringify({ error: encErr.message || "Unsupported CSV encoding" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV has no data rows" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim());
    const csvType = detectCsvType(headers);
    console.log("Detected CSV type:", csvType, "Headers:", headers.slice(0, 10));

    if (csvType === 'unknown') {
      return new Response(JSON.stringify({ error: "Unrecognized CSV format. Expected Bangkok Form, Pattaya Reach, or Legacy HIVST combined headers.", detectedHeaders: headers.slice(0, 20) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────────────────────────────────────
    // LEGACY HIVST COMBINED PATH (pre-processed Google Form exports)
    // ─────────────────────────────────────────────────────────────────
    if (csvType === 'legacy_hivst_combined') {
      const piiText = piiFile ? await decodeCSVFile(piiFile).catch(() => null) : null;
      const piiIndex = buildLegacyPiiIndex(piiText);
      console.log(`Legacy import: ${rows.length - 1} result rows, ${piiIndex.size} PII rows`);

      const col = (name: string) => headers.indexOf(name);
      const c = {
        result_id: col('result_id'),
        source: col('source'),
        submitted_at: col('submitted_at'),
        result: col('result'),
        result_raw: col('result_raw'),
        is_reactive: col('is_reactive'),
        legacy_photo_url: col('legacy_photo_url'),
        hospital_confirmed: col('hospital_confirmed'),
        hospital_name: col('hospital_name'),
        treatment_status: col('treatment_status'),
        art_status: col('art_status'),
        staff_note: col('staff_note'),
        pdpa_consent: col('pdpa_consent'),
        national_id_hash: col('national_id_hash'),
        has_pii: col('has_pii'),
      };
      if (c.result_id < 0) {
        return new Response(JSON.stringify({ error: "Missing required column: result_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Pre-fetch already-imported legacy_result_ids for idempotency
      const existingLegacy = await (async () => {
        const all: any[] = [];
        let from = 0; const ps = 1000;
        while (true) {
          const { data, error } = await adminClient.from('hiv_selftest_requests').select('legacy_result_id').not('legacy_result_id', 'is', null).range(from, from + ps - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...data);
          if (data.length < ps) break;
          from += ps;
        }
        return new Set(all.map(r => r.legacy_result_id));
      })();

      const legacyResult: ImportResult = { total: rows.length - 1, inserted: 0, updated: 0, skipped: 0, errors: [], insertedIds: [], updatedIds: [], csvType, reactiveFlagged: 0 };
      const legacyRowResults: Array<{ row_number: number; outcome: string; error_message: string | null; external_ref: string | null }> = [];

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i];
        const rowNum = i + 1;
        const g = (idx: number) => idx >= 0 && idx < cells.length ? (cells[idx] || '').trim() : '';
        const resultId = g(c.result_id);
        try {
          if (!resultId) {
            legacyResult.skipped++;
            legacyRowResults.push({ row_number: rowNum, outcome: 'skipped', error_message: 'Missing result_id', external_ref: null });
            continue;
          }
          if (existingLegacy.has(resultId)) {
            legacyResult.skipped++;
            legacyRowResults.push({ row_number: rowNum, outcome: 'duplicate', error_message: 'Already imported', external_ref: resultId });
            continue;
          }

          const result = normalizeLegacyResult(g(c.result));
          const submittedAt = parseIsoTimestamp(g(c.submitted_at)) || new Date().toISOString();
          const source = g(c.source) || 'legacy_hivst_form';
          const rawResult = g(c.result_raw) || null;
          const isReactive = result === 'reactive';
          const legacyPhotoUrl = g(c.legacy_photo_url) || null;
          const pdpaRaw = g(c.pdpa_consent);
          const pdpaConsent = pdpaRaw === 'True' ? true : pdpaRaw === 'False' ? false : null;
          const nidHash = g(c.national_id_hash) || null;
          const hasPii = g(c.has_pii) === 'True';

          // Build staff_notes from legacy follow-up fields
          const followup: string[] = [];
          const hc = g(c.hospital_confirmed); if (hc) followup.push(`รพ.ยืนยันผล: ${hc}`);
          const hn = g(c.hospital_name); if (hn) followup.push(`ชื่อ รพ.: ${hn}`);
          const ts = g(c.treatment_status); if (ts) followup.push(`การรักษา: ${ts}`);
          const ars = g(c.art_status); if (ars) followup.push(`ART: ${ars}`);
          const sn = g(c.staff_note); if (sn) followup.push(`บันทึก: ${sn}`);
          const staffNotes = followup.length ? followup.join(' | ') : null;

          if (dryRun) {
            legacyResult.inserted++;
            if (isReactive) legacyResult.reactiveFlagged!++;
            legacyRowResults.push({ row_number: rowNum, outcome: 'will_insert', error_message: null, external_ref: resultId });
            continue;
          }

          // 1) Insert PII row first if we have identity
          let piiId: string | null = null;
          if (hasPii && pdpaConsent !== false) {
            const piiRow = piiIndex.get(resultId);
            if (piiRow) {
              const rawNid = (piiRow.national_id || '').replace(/\D/g, '');
              const nidCheck = rawNid ? normalizeThaiId(rawNid) : { value: null, valid: false };
              const piiInsert: Record<string, any> = {
                user_id: user.id,
                full_name: piiRow.full_name || null,
                phone: piiRow.phone || null,
                gender: piiRow.sex_at_birth || null,
                date_of_birth: piiRow.dob_iso || null,
              };
              // Only set thai_id if checksum is valid (validator trigger will reject otherwise)
              if (nidCheck.valid && nidCheck.value) piiInsert.thai_id = nidCheck.value;
              const { data: piiData, error: piiErr } = await adminClient.from('selftest_pii').insert(piiInsert).select('id').single();
              if (piiErr) {
                console.warn(`Row ${rowNum} PII insert failed, continuing without PII: ${piiErr.message}`);
              } else {
                piiId = piiData.id;
              }
            }
          }

          // 2) Insert request row
          const reqInsert: Record<string, any> = {
            user_id: user.id,
            pii_id: piiId,
            status: 'completed',
            assigned_branch: branch,
            created_at: submittedAt,
            result_submitted_at: submittedAt,
            self_reported_result: result,
            test_result: result,
            result_photo_url: legacyPhotoUrl,
            photo_provided: !!legacyPhotoUrl,
            submission_path: 'legacy_import',
            staff_notes: staffNotes,
            legacy_result_id: resultId,
            legacy_source: source,
            legacy_raw_result: rawResult,
            legacy_hospital_confirmed: g(c.hospital_confirmed) || null,
            legacy_hospital_name: g(c.hospital_name) || null,
            legacy_treatment_status: g(c.treatment_status) || null,
            legacy_art_status: g(c.art_status) || null,
            legacy_pdpa_consent: pdpaConsent,
            national_id_hash: nidHash,
          };
          const { data: reqData, error: reqErr } = await adminClient.from('hiv_selftest_requests').insert(reqInsert).select('id').single();
          if (reqErr) throw reqErr;

          legacyResult.inserted++;
          legacyResult.insertedIds.push(reqData.id);
          if (isReactive) legacyResult.reactiveFlagged!++;
          legacyRowResults.push({ row_number: rowNum, outcome: 'inserted', error_message: null, external_ref: resultId });
          existingLegacy.add(resultId);
        } catch (err: any) {
          legacyResult.errors.push({ row: rowNum, reason: err.message || String(err) });
          legacyRowResults.push({ row_number: rowNum, outcome: 'error', error_message: err.message || String(err), external_ref: resultId || null });
        }
      }

      // Record batch
      const batchStatus = legacyResult.errors.length === 0 ? 'success' : (legacyResult.inserted > 0) ? 'partial' : 'failed';
      try {
        const { data: batchData } = await adminClient.from('selftest_import_batches').insert({
          branch,
          uploaded_by: user.id,
          filename: csvFile.name || 'legacy_hivst.csv',
          source_type: 'legacy_hivst_combined',
          total_rows: legacyResult.total,
          inserted_rows: legacyResult.inserted,
          duplicate_rows: 0,
          error_rows: legacyResult.errors.length,
          skipped_rows: legacyResult.skipped,
          status: batchStatus,
          is_dry_run: dryRun,
          notes: `Reactive cases flagged (silent, no notify): ${legacyResult.reactiveFlagged}. PII pairs: ${piiIndex.size}`,
        }).select('id').single();
        if (batchData && legacyRowResults.length > 0) {
          const chunkSize = 500;
          for (let cc = 0; cc < legacyRowResults.length; cc += chunkSize) {
            const chunk = legacyRowResults.slice(cc, cc + chunkSize).map(r => ({ ...r, batch_id: batchData.id }));
            await adminClient.from('selftest_import_rows').insert(chunk);
          }
        }
      } catch (batchErr) {
        console.error("Failed to record legacy batch history:", batchErr);
      }

      return new Response(JSON.stringify({ success: true, dry_run: dryRun, result: legacyResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    let colMap: Record<string, number> = {};
    if (csvType === 'bangkok') {
      colMap = {
        timestamp: findCol(headers, 'ประทับเวลา'),
        consent: findCol(headers, 'ยินยอม', 'PDPA'),
        nickname: findCol(headers, 'ชื่อเล่น'),
        fullName: findCol(headers, 'ชื่อ-นามสกุล'),
        gender: findCol(headers, 'เพศกำเนิด'),
        dob: findCol(headers, 'วันเดือนปีเกิด'),
        thaiId: findCol(headers, 'เลขที่บัตรปปช', 'บัตรปปช'),
        phone: findCol(headers, 'เบอร์โทรศัพท์'),
        lineId: findCol(headers, 'Line id', 'line id', 'Line ID'),
        address: findCol(headers, 'ที่อยู่ในการจัดส่ง', 'ที่อยู่'),
      };
    } else {
      colMap = {
        serviceDate: findCol(headers, 'วันที่รับบริการ'),
        firstName: findCol(headers, 'ชื่อจริง'),
        lastName: findCol(headers, 'นามสกุล'),
        gender: findCol(headers, 'เพศ'),
        age: findCol(headers, 'อายุ'),
        thaiId: findCol(headers, 'เลขบัตรประชาชน'),
        hivst: findCol(headers, 'ตรวจเอชไอวี หรือชุดตรวจ', 'HIVST', 'ตรวจเอชไอวี'),
        hivSelfTest: findCol(headers, 'ได้รับการตรวจ HIV ด้วยตนเอง', 'ตรวจ HIV ด้วยตนเอง'),
        hivResult: findCol(headers, 'ผลตรวจ HIV ด้วยตนเอง', 'ผลตรวจ HIV'),
      };
    }

    console.log("Column map:", colMap);

    const fetchAll = async (table: string, select: string) => {
      const allRows: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await adminClient.from(table).select(select).range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allRows;
    };

    const existingPii = await fetchAll('selftest_pii', 'id, user_id, thai_id, phone, line_id, full_name, gender, date_of_birth, address, province, postal_code, district, subdistrict');
    const piiByThaiId = new Map<string, any>();
    const piiByPhone = new Map<string, any>();
    const piiByLineId = new Map<string, any>();
    for (const p of existingPii || []) {
      if (p.thai_id) piiByThaiId.set(p.thai_id, p);
      if (p.phone) piiByPhone.set(p.phone, p);
      if (p.line_id) piiByLineId.set(p.line_id.toLowerCase(), p);
    }

    const existingRequests = await fetchAll('hiv_selftest_requests', 'id, pii_id, user_id');
    const requestByPiiId = new Map<string, any>();
    for (const r of existingRequests || []) {
      if (r.pii_id) requestByPiiId.set(r.pii_id, r);
    }

    const result: ImportResult = { total: rows.length - 1, inserted: 0, updated: 0, skipped: 0, errors: [], insertedIds: [], updatedIds: [], csvType };

    // Collect row-level results for batch recording
    const rowResults: Array<{ row_number: number; outcome: string; error_message: string | null; external_ref: string | null }> = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const rowNum = i + 1;

      try {
        let fullName: string | null, thaiId: ReturnType<typeof normalizeThaiId>, phone: string | null, lineId: string | null, gender: string | null, dob: string | null, address: string | null, timestamp: string | null;

        if (csvType === 'bangkok') {
          const parsed = processBangkokRow(cells, headers, colMap);
          ({ fullName, thaiId, phone, lineId, gender, dob, address, timestamp } = parsed);
        } else {
          const parsed = processPattayaReachRow(cells, colMap);
          ({ fullName, thaiId, gender, dob, address, timestamp } = parsed);
          phone = null; lineId = null;
        }

        let existingPiiRecord: any = null;
        if (thaiId.value && thaiId.valid) existingPiiRecord = piiByThaiId.get(thaiId.value);
        if (csvType === 'bangkok') {
          if (!existingPiiRecord && phone) existingPiiRecord = piiByPhone.get(phone);
          if (!existingPiiRecord && lineId) existingPiiRecord = piiByLineId.get(lineId.toLowerCase());
        }

        if (csvType === 'pattaya_reach') {
          if (!thaiId.value || !thaiId.valid) {
            const reason = `Skipped: ${!thaiId.value ? 'Missing Thai ID' : 'Invalid Thai ID checksum'} (Pattaya Reach requires valid Thai ID)`;
            result.skipped++;
            result.errors.push({ row: rowNum, reason });
            rowResults.push({ row_number: rowNum, outcome: 'skipped', error_message: reason, external_ref: thaiId.value });
            continue;
          }
          const getVal = (key: string) => { const idx = colMap[key]; return (idx >= 0 && idx < cells.length) ? cells[idx]?.trim().toLowerCase() : ''; };
          const hivstVal = getVal('hivst');
          const hivSelfTestVal = getVal('hivSelfTest');
          if (i <= 5) console.log(`Row ${rowNum} HIVST values: hivst="${hivstVal}", hivSelfTest="${hivSelfTestVal}"`);
          const isYes = (v: string) => v === '1' || v === 'yes' || v === 'ใช่' || v === 'มี' || v.includes('ตรวจ') || v.includes('hivst') || v.includes('รับ');
          if (!isYes(hivstVal) && !isYes(hivSelfTestVal)) {
            const reason = `Skipped: No HIV self-test (hivst="${hivstVal}", hivSelfTest="${hivSelfTestVal}")`;
            result.skipped++;
            result.errors.push({ row: rowNum, reason });
            rowResults.push({ row_number: rowNum, outcome: 'skipped', error_message: reason, external_ref: thaiId.value });
            continue;
          }
        } else {
          if (!existingPiiRecord && !thaiId.value && !phone && !lineId) {
            const reason = "No identifiers (Thai ID, phone, or Line ID)";
            result.skipped++;
            result.errors.push({ row: rowNum, reason });
            rowResults.push({ row_number: rowNum, outcome: 'skipped', error_message: reason, external_ref: null });
            continue;
          }
        }

        if (dryRun) {
          if (existingPiiRecord) {
            result.updated++;
            result.updatedIds.push(existingPiiRecord.id);
            rowResults.push({ row_number: rowNum, outcome: 'will_update', error_message: null, external_ref: thaiId.value });
          } else {
            result.inserted++;
            rowResults.push({ row_number: rowNum, outcome: 'will_insert', error_message: null, external_ref: thaiId.value });
          }
          continue;
        }

        // ── REAL IMPORT ──
        if (existingPiiRecord) {
          const updates: Record<string, any> = {};
          if (fullName && !existingPiiRecord.full_name) updates.full_name = fullName;
          if (gender && !existingPiiRecord.gender) updates.gender = gender;
          if (dob && !existingPiiRecord.date_of_birth) updates.date_of_birth = dob;
          if (thaiId.value && !existingPiiRecord.thai_id) updates.thai_id = thaiId.value;
          if (phone && !existingPiiRecord.phone) updates.phone = phone;
          if (lineId && !existingPiiRecord.line_id) updates.line_id = lineId;
          if (address && !existingPiiRecord.address) updates.address = address;

          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            const { error: updateErr } = await adminClient.from('selftest_pii').update(updates).eq('id', existingPiiRecord.id);
            if (updateErr) throw updateErr;
          }

          if (!requestByPiiId.has(existingPiiRecord.id)) {
            const { data: reqData, error: reqErr } = await adminClient.from('hiv_selftest_requests').insert({
              user_id: existingPiiRecord.user_id, pii_id: existingPiiRecord.id, status: 'delivered', assigned_branch: branch, created_at: timestamp || new Date().toISOString(),
            }).select('id').single();
            if (reqErr) throw reqErr;
            result.updatedIds.push(reqData.id);
          } else {
            result.updatedIds.push(requestByPiiId.get(existingPiiRecord.id).id);
          }
          result.updated++;
          rowResults.push({ row_number: rowNum, outcome: 'updated', error_message: null, external_ref: thaiId.value });
        } else {
          const importUserId = user.id;
          const { data: piiData, error: piiErr } = await adminClient.from('selftest_pii').insert({
            user_id: importUserId, full_name: fullName, thai_id: thaiId.value, gender, date_of_birth: dob, phone, line_id: lineId, address,
          }).select('id').single();
          if (piiErr) throw piiErr;

          const { data: reqData, error: reqErr } = await adminClient.from('hiv_selftest_requests').insert({
            user_id: importUserId, pii_id: piiData.id, status: 'delivered', assigned_branch: branch, created_at: timestamp || new Date().toISOString(),
          }).select('id').single();
          if (reqErr) throw reqErr;

          if (thaiId.value && thaiId.valid) piiByThaiId.set(thaiId.value, { ...piiData, user_id: importUserId, thai_id: thaiId.value, phone, line_id: lineId });
          if (phone) piiByPhone.set(phone, { ...piiData, user_id: importUserId });
          if (lineId) piiByLineId.set(lineId.toLowerCase(), { ...piiData, user_id: importUserId });
          requestByPiiId.set(piiData.id, reqData);

          result.inserted++;
          result.insertedIds.push(reqData.id);
          rowResults.push({ row_number: rowNum, outcome: 'inserted', error_message: null, external_ref: thaiId.value });
        }
      } catch (err: any) {
        result.errors.push({ row: rowNum, reason: err.message || String(err) });
        rowResults.push({ row_number: rowNum, outcome: 'error', error_message: err.message || String(err), external_ref: null });
      }
    }

    // ── Record batch + row results ──
    const batchStatus = result.errors.length === 0 ? 'success' : (result.inserted > 0 || result.updated > 0) ? 'partial' : 'failed';
    
    try {
      const { data: batchData } = await adminClient.from('selftest_import_batches').insert({
        branch,
        uploaded_by: user.id,
        filename: csvFile.name || 'unknown.csv',
        source_type: csvType,
        total_rows: result.total,
        inserted_rows: result.inserted,
        duplicate_rows: result.updated,
        error_rows: result.errors.length,
        skipped_rows: result.skipped,
        status: batchStatus,
        is_dry_run: dryRun,
      }).select('id').single();

      // Insert row results in chunks of 500
      if (batchData && rowResults.length > 0) {
        const chunkSize = 500;
        for (let c = 0; c < rowResults.length; c += chunkSize) {
          const chunk = rowResults.slice(c, c + chunkSize).map(r => ({ ...r, batch_id: batchData.id }));
          await adminClient.from('selftest_import_rows').insert(chunk);
        }
      }
    } catch (batchErr) {
      console.error("Failed to record batch history:", batchErr);
      // Don't fail the import itself if batch recording fails
    }

    return new Response(JSON.stringify({ success: true, dry_run: dryRun, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
