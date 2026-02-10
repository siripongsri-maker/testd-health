import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function: import-existing-selftest-csv
 * 
 * Imports HIV self-test CSV data into existing tables:
 * - selftest_pii (PII: name, thai_id, phone, gender, dob, line_id, address)
 * - hiv_selftest_requests (request record linked to selftest_pii)
 * 
 * Supports two CSV formats:
 * 1. Bangkok Google Form style (UTF-8)
 * 2. Pattaya Reach style (CP874/Windows-874)
 */

type CsvType = "bangkok" | "pattaya_reach" | "unknown";

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  insertedIds: string[];
  updatedIds: string[];
  csvType: CsvType;
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

// ── Encoding ──

// Windows-874 (CP874) decode table for bytes 0x80-0xFF
const CP874_MAP: Record<number, string> = {
  0x80: '\u20AC', // Euro sign
  // 0x81-0x84 undefined
  0x85: '\u2026', // Ellipsis
  // 0x86-0x90 undefined
  0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D',
  0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
  // 0x98-0x9F undefined
  0xA0: '\u00A0', // Non-breaking space
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
  // 0xDB-0xDE undefined
  0xDF: '\u0E3F', // Thai Baht sign
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
      result += CP874_MAP[b] || '\uFFFD'; // replacement char for unmapped
    }
  }
  return result;
}

function isValidUtf8Thai(text: string): boolean {
  // If decoding as UTF-8 produced replacement chars or no Thai chars in header, it's not UTF-8
  const firstLine = text.split('\n')[0] || '';
  const hasReplacementChars = firstLine.includes('\uFFFD');
  // Check if the header contains recognizable Thai Unicode range (U+0E01-U+0E5B)
  const thaiCharCount = (firstLine.match(/[\u0E01-\u0E5B]/g) || []).length;
  return !hasReplacementChars && thaiCharCount > 3;
}

async function decodeCSVFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  
  // Try UTF-8 first
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const utf8Text = decoder.decode(bytes);
  
  if (isValidUtf8Thai(utf8Text)) {
    return utf8Text;
  }
  
  // Fallback: CP874
  const cp874Text = decodeCp874(bytes);
  const cp874FirstLine = cp874Text.split('\n')[0] || '';
  const thaiCount = (cp874FirstLine.match(/[\u0E01-\u0E5B]/g) || []).length;
  
  if (thaiCount > 3) {
    console.log("Decoded CSV as CP874/Windows-874");
    return cp874Text;
  }
  
  throw new Error("Unsupported CSV encoding");
}

// ── CSV Type Detection ──

function detectCsvType(headers: string[]): CsvType {
  const joined = headers.join(' ');
  
  // Bangkok Google Form markers
  if (joined.includes('ประทับเวลา') && joined.includes('ชื่อ-นามสกุล')) {
    return 'bangkok';
  }
  
  // Pattaya Reach markers
  if (joined.includes('วันที่รับบริการ') && (joined.includes('ชื่อจริง') || joined.includes('นามสกุล'))) {
    return 'pattaya_reach';
  }
  
  // Fallback heuristics
  if (joined.includes('ประทับเวลา') || joined.includes('Line id') || joined.includes('ที่อยู่ในการจัดส่ง')) {
    return 'bangkok';
  }
  if (joined.includes('UIC') || joined.includes('HNID') || joined.includes('กลุ่มประชากร')) {
    return 'pattaya_reach';
  }
  
  return 'unknown';
}

// ── Column Helpers ──

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
  if (!digits) return null;
  return digits;
}

function normalizeThaiId(raw: string | undefined): { value: string | null; valid: boolean } {
  if (!raw) return { value: null, valid: false };
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 13) return { value: digits || null, valid: false };
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  const valid = check === parseInt(digits[12]);
  return { value: digits, valid };
}

function parseBuddhistDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  
  const slashMatch = cleaned.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
  if (slashMatch) {
    let day = parseInt(slashMatch[1]);
    let month = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);
    if (year > 2400) year -= 543;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const thaiMonths: Record<string, number> = {
    'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4,
    'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8,
    'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
    'กพ': 2, 'มค': 1, 'มีค': 3, 'เมย': 4,
    'พค': 5, 'มิย': 6, 'กค': 7, 'สค': 8,
    'กย': 9, 'ตค': 10, 'พย': 11, 'ธค': 12,
  };
  
  for (const [abbr, monthNum] of Object.entries(thaiMonths)) {
    if (cleaned.includes(abbr)) {
      const dayMatch = cleaned.match(/(\d{1,2})/);
      const yearMatch = cleaned.match(/(\d{4})/);
      if (dayMatch && yearMatch) {
        let year = parseInt(yearMatch[1]);
        if (year > 2400) year -= 543;
        const day = parseInt(dayMatch[1]);
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

function parseConsent(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === 'ยินยอม' || v === 'yes' || v === 'true' || v === '1';
}

function parseTimestamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (!match) return null;
  const [, day, month, year, hour, min, sec] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${(sec || '00').padStart(2, '0')}+07:00`;
}

// Parse DD/MM/YYYY date (Pattaya style, Gregorian) -> ISO timestamp
function parseDateToTimestamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  const match = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  let y = parseInt(year);
  if (y > 2400) y -= 543;
  return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00+07:00`;
}

// ── Bangkok Format Processing ──

function processBangkokRow(
  cells: string[],
  headers: string[],
  colMap: Record<string, number>,
): { fullName: string | null; thaiId: ReturnType<typeof normalizeThaiId>; phone: string | null; lineId: string | null; gender: string | null; dob: string | null; address: string | null; timestamp: string | null } {
  const get = (key: string) => {
    const idx = colMap[key];
    return idx >= 0 && idx < cells.length ? cells[idx]?.trim() : undefined;
  };
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

// ── Pattaya Reach Format Processing ──

function processPattayaReachRow(
  cells: string[],
  colMap: Record<string, number>,
): { fullName: string | null; thaiId: ReturnType<typeof normalizeThaiId>; phone: null; lineId: null; gender: string | null; dob: string | null; address: null; timestamp: string | null } {
  const get = (key: string) => {
    const idx = colMap[key];
    return idx >= 0 && idx < cells.length ? cells[idx]?.trim() : undefined;
  };
  
  const firstName = get('firstName') || '';
  const lastName = get('lastName') || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

  // Derive approximate DOB from อายุ (age) column using the service date as reference
  let dob: string | null = null;
  const ageRaw = get('age');
  if (ageRaw) {
    const age = parseInt(ageRaw, 10);
    if (!isNaN(age) && age > 0 && age < 120) {
      // Use service date as reference point, fallback to today
      const serviceDateRaw = get('serviceDate');
      const refTimestamp = parseDateToTimestamp(serviceDateRaw);
      const refDate = refTimestamp ? new Date(refTimestamp) : new Date();
      const birthYear = refDate.getFullYear() - age;
      // Approximate: use July 1 as midpoint
      dob = `${birthYear}-07-01`;
    }
  }
  
  return {
    fullName,
    thaiId: normalizeThaiId(get('thaiId')),
    phone: null,
    lineId: null,
    gender: normalizeGender(get('gender')),
    dob,
    address: null,
    timestamp: parseDateToTimestamp(get('serviceDate')),
  };
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const csvFile = formData.get("csv") as File;
    const dryRun = formData.get("dry_run") === "true";
    const branch = (formData.get("branch") as string) || "silom";

    if (!csvFile) {
      return new Response(JSON.stringify({ error: "No CSV file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Robust decoding: UTF-8 → CP874 fallback
    let csvText: string;
    try {
      csvText = await decodeCSVFile(csvFile);
    } catch (encErr: any) {
      return new Response(JSON.stringify({ error: encErr.message || "Unsupported CSV encoding" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV has no data rows" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rows[0].map(h => h.replace(/\s+/g, ' ').trim());
    const csvType = detectCsvType(headers);
    console.log("Detected CSV type:", csvType, "Headers:", headers.slice(0, 10));

    if (csvType === 'unknown') {
      return new Response(JSON.stringify({ error: "Unrecognized CSV format. Expected Bangkok Form or Pattaya Reach headers." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build column maps per format
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
      // pattaya_reach
      colMap = {
        serviceDate: findCol(headers, 'วันที่รับบริการ'),
        firstName: findCol(headers, 'ชื่อจริง'),
        lastName: findCol(headers, 'นามสกุล'),
        gender: findCol(headers, 'เพศ'),
        age: findCol(headers, 'อายุ'),
        thaiId: findCol(headers, 'เลขบัตรประชาชน'),
        hivst: findCol(headers, 'ตรวจเอชไอวี หรือชุดตรวจ', 'HIVST', 'ตรวจเอชไอวี'),
        hivResult: findCol(headers, 'ผลตรวจ HIV'),
      };
    }

    console.log("Column map:", colMap);

    // Pre-fetch existing data for deduplication (paginate to avoid 1000-row limit)
    const fetchAll = async (table: string, select: string) => {
      const allRows: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await adminClient
          .from(table)
          .select(select)
          .range(from, from + pageSize - 1);
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

    const result: ImportResult = {
      total: rows.length - 1,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      insertedIds: [],
      updatedIds: [],
      csvType,
    };

    // Process rows
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const rowNum = i + 1;

      try {
        let fullName: string | null;
        let thaiId: ReturnType<typeof normalizeThaiId>;
        let phone: string | null;
        let lineId: string | null;
        let gender: string | null;
        let dob: string | null;
        let address: string | null;
        let timestamp: string | null;

        if (csvType === 'bangkok') {
          const parsed = processBangkokRow(cells, headers, colMap);
          fullName = parsed.fullName;
          thaiId = parsed.thaiId;
          phone = parsed.phone;
          lineId = parsed.lineId;
          gender = parsed.gender;
          dob = parsed.dob;
          address = parsed.address;
          timestamp = parsed.timestamp;
        } else {
          // pattaya_reach
          const parsed = processPattayaReachRow(cells, colMap);
          fullName = parsed.fullName;
          thaiId = parsed.thaiId;
          phone = null;
          lineId = null;
          gender = parsed.gender;
          dob = parsed.dob;
          address = null;
          timestamp = parsed.timestamp;
        }

        // ── Dedupe ──
        let existingPiiRecord: any = null;

        if (thaiId.value && thaiId.valid) {
          existingPiiRecord = piiByThaiId.get(thaiId.value);
        }
        // For Bangkok: also match by phone/lineId
        if (csvType === 'bangkok') {
          if (!existingPiiRecord && phone) {
            existingPiiRecord = piiByPhone.get(phone);
          }
          if (!existingPiiRecord && lineId) {
            existingPiiRecord = piiByLineId.get(lineId.toLowerCase());
          }
        }

        // ── Skip logic per format ──
        if (csvType === 'pattaya_reach') {
          // Pattaya Reach: MUST have valid thai_id to insert or match
          if (!thaiId.value || !thaiId.valid) {
            result.skipped++;
            result.errors.push({
              row: rowNum,
              reason: `Skipped: ${!thaiId.value ? 'Missing Thai ID' : 'Invalid Thai ID checksum'} (Pattaya Reach requires valid Thai ID)`,
            });
            continue;
          }

          // Only import rows that received an HIV self-test kit (HIVST column)
          const hivstIdx = colMap['hivst'];
          const hivstVal = (hivstIdx >= 0 && hivstIdx < cells.length) ? cells[hivstIdx]?.trim().toLowerCase() : '';
          const hasHivst = hivstVal === '1' || hivstVal === 'yes' || hivstVal === 'ใช่' || hivstVal === 'มี' || hivstVal.includes('ตรวจ') || hivstVal.includes('hivst');
          if (!hasHivst) {
            result.skipped++;
            result.errors.push({
              row: rowNum,
              reason: `Skipped: No HIV self-test indicated (HIVST column value: "${hivstVal || 'empty'}")`,
            });
            continue;
          }
        } else {
          // Bangkok: need at least one identifier
          if (!existingPiiRecord && !thaiId.value && !phone && !lineId) {
            result.skipped++;
            result.errors.push({ row: rowNum, reason: "No identifiers (Thai ID, phone, or Line ID)" });
            continue;
          }
        }

        if (dryRun) {
          if (existingPiiRecord) {
            result.updated++;
            result.updatedIds.push(existingPiiRecord.id);
          } else {
            if (csvType === 'pattaya_reach') {
              // Will insert (no phone/address but schema allows nulls)
              result.inserted++;
            } else {
              result.inserted++;
            }
          }
          continue;
        }

        // ── REAL IMPORT ──
        if (existingPiiRecord) {
          // UPDATE existing PII - never overwrite non-null with null
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
            const { error: updateErr } = await adminClient
              .from('selftest_pii')
              .update(updates)
              .eq('id', existingPiiRecord.id);
            if (updateErr) throw updateErr;
          }

          // Check if request already exists
          if (!requestByPiiId.has(existingPiiRecord.id)) {
            const { data: reqData, error: reqErr } = await adminClient
              .from('hiv_selftest_requests')
              .insert({
                user_id: existingPiiRecord.user_id,
                pii_id: existingPiiRecord.id,
                status: 'delivered',
                assigned_branch: branch,
                created_at: timestamp || new Date().toISOString(),
              })
              .select('id')
              .single();
            if (reqErr) throw reqErr;
            result.updatedIds.push(reqData.id);
          } else {
            result.updatedIds.push(requestByPiiId.get(existingPiiRecord.id).id);
          }

          result.updated++;
        } else {
          // INSERT new record
          const importUserId = user.id;

          const { data: piiData, error: piiErr } = await adminClient
            .from('selftest_pii')
            .insert({
              user_id: importUserId,
              full_name: fullName,
              thai_id: thaiId.value,
              gender,
              date_of_birth: dob,
              phone,
              line_id: lineId,
              address,
            })
            .select('id')
            .single();
          if (piiErr) throw piiErr;

          const { data: reqData, error: reqErr } = await adminClient
            .from('hiv_selftest_requests')
            .insert({
              user_id: importUserId,
              pii_id: piiData.id,
              status: 'delivered',
              assigned_branch: branch,
              created_at: timestamp || new Date().toISOString(),
            })
            .select('id')
            .single();
          if (reqErr) throw reqErr;

          // Update lookup maps
          if (thaiId.value && thaiId.valid) piiByThaiId.set(thaiId.value, { ...piiData, user_id: importUserId, thai_id: thaiId.value, phone, line_id: lineId });
          if (phone) piiByPhone.set(phone, { ...piiData, user_id: importUserId });
          if (lineId) piiByLineId.set(lineId.toLowerCase(), { ...piiData, user_id: importUserId });
          requestByPiiId.set(piiData.id, reqData);

          result.inserted++;
          result.insertedIds.push(reqData.id);
        }
      } catch (err: any) {
        result.errors.push({ row: rowNum, reason: err.message || String(err) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dry_run: dryRun,
      result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Import error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
