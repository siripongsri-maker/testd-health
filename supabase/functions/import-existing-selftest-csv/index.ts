import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge Function: import-existing-selftest-csv
 * 
 * Imports Bangkok HIV self-test CSV data into existing tables:
 * - selftest_pii (PII: name, thai_id, phone, gender, dob, line_id, address)
 * - hiv_selftest_requests (request record linked to selftest_pii)
 * 
 * Supports dry_run mode (no DB writes) and full import with dedupe.
 */

interface ParsedRow {
  rowNum: number;
  timestamp: string | null;
  consent: boolean;
  nickname: string | null;
  fullName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  thaiId: string | null;
  phone: string | null;
  lineId: string | null;
  address: string | null;
  // Extra fields from CSV that don't map to existing columns are ignored
}

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  insertedIds: string[];
  updatedIds: string[];
}

// Parse CSV handling quoted fields with commas and newlines
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
        i++; // skip next quote
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
        if (char === '\r') i++; // skip \n

      } else {
        current += char;
      }
    }
  }
  // Last row
  if (current !== '' || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== '')) {
      rows.push(row);
    }
  }
  
  return rows;
}

// Find column index by partial Thai header match
function findCol(headers: string[], ...patterns: string[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex(h => h.includes(pattern));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Normalize phone: keep digits, preserve leading 0
function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\\d]/g, '');
  if (!digits) return null;
  return digits;
}

// Normalize Thai ID: keep digits, validate 13 digits
function normalizeThaiId(raw: string | undefined): { value: string | null; valid: boolean } {
  if (!raw) return { value: null, valid: false };
  const digits = raw.replace(/[^\\d]/g, '');
  if (digits.length !== 13) return { value: digits || null, valid: false };
  // Checksum validation
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  const valid = check === parseInt(digits[12]);
  return { value: digits, valid };
}

// Parse Thai Buddhist date format to Gregorian YYYY-MM-DD
function parseBuddhistDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  
  // Try DD/MM/YYYY format (Buddhist or Gregorian)
  const slashMatch = cleaned.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
  if (slashMatch) {
    let day = parseInt(slashMatch[1]);
    let month = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);
    // Buddhist year > 2400
    if (year > 2400) year -= 543;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try "3ม.ค.2526" Thai short month format
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

  // Try YYYY-MM-DD or DD/MM/YY
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return cleaned;

  return null;
}

// Normalize gender to match existing enum values in selftest_pii
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

// Parse consent value
function parseConsent(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === 'ยินยอม' || v === 'yes' || v === 'true' || v === '1';
}

// Parse timestamp "19/11/2025, 13:30:42" → ISO string
function parseTimestamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):?(\d{2})?/);
  if (!match) return null;
  const [, day, month, year, hour, min, sec] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${(sec || '00').padStart(2, '0')}+07:00`;
}

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

    // Verify the caller is admin using their token
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

    // Check admin role
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

    // Use service role client for DB operations (bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const formData = await req.formData();
    const csvFile = formData.get("csv") as File;
    const dryRun = formData.get("dry_run") === "true";

    if (!csvFile) {
      return new Response(JSON.stringify({ error: "No CSV file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvText = await csvFile.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: "CSV has no data rows" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map headers
    const headers = rows[0].map(h => h.replace(/\s+/g, ' ').trim());
    
    const colTimestamp = findCol(headers, 'ประทับเวลา');
    const colConsent = findCol(headers, 'ยินยอม', 'PDPA');
    const colNickname = findCol(headers, 'ชื่อเล่น');
    const colFullName = findCol(headers, 'ชื่อ-นามสกุล');
    const colGender = findCol(headers, 'เพศกำเนิด');
    const colDOB = findCol(headers, 'วันเดือนปีเกิด');
    const colThaiId = findCol(headers, 'เลขที่บัตรปปช', 'บัตรปปช');
    const colPhone = findCol(headers, 'เบอร์โทรศัพท์');
    const colLineId = findCol(headers, 'Line id', 'line id', 'Line ID');
    const colAddress = findCol(headers, 'ที่อยู่ในการจัดส่ง', 'ที่อยู่');

    console.log("Column mapping:", {
      colTimestamp, colConsent, colNickname, colFullName, colGender,
      colDOB, colThaiId, colPhone, colLineId, colAddress
    });

    // Pre-fetch existing PII records for deduplication
    const { data: existingPii } = await adminClient
      .from('selftest_pii')
      .select('id, user_id, thai_id, phone, line_id, full_name, gender, date_of_birth, address, province, postal_code, district, subdistrict');

    // Build lookup maps
    const piiByThaiId = new Map<string, any>();
    const piiByPhone = new Map<string, any>();
    const piiByLineId = new Map<string, any>();
    
    for (const p of existingPii || []) {
      if (p.thai_id) piiByThaiId.set(p.thai_id, p);
      if (p.phone) piiByPhone.set(p.phone, p);
      if (p.line_id) piiByLineId.set(p.line_id.toLowerCase(), p);
    }

    // Also fetch existing hiv_selftest_requests pii_ids to avoid duplicate requests
    const { data: existingRequests } = await adminClient
      .from('hiv_selftest_requests')
      .select('id, pii_id, user_id');
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
    };

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const rowNum = i + 1;

      try {
        const get = (idx: number) => idx >= 0 && idx < cells.length ? cells[idx]?.trim() : undefined;

        const fullName = get(colFullName) || null;
        const thaiIdRaw = get(colThaiId);
        const thaiId = normalizeThaiId(thaiIdRaw);
        const phone = normalizePhone(get(colPhone));
        const lineId = get(colLineId) || null;
        const gender = normalizeGender(get(colGender));
        const dob = parseBuddhistDate(get(colDOB));
        const address = get(colAddress) || null;
        const timestamp = parseTimestamp(get(colTimestamp));

        // Dedupe: find existing record
        let existingPiiRecord: any = null;

        if (thaiId.value && thaiId.valid) {
          existingPiiRecord = piiByThaiId.get(thaiId.value);
        }
        if (!existingPiiRecord && phone) {
          existingPiiRecord = piiByPhone.get(phone);
        }
        if (!existingPiiRecord && lineId) {
          existingPiiRecord = piiByLineId.get(lineId.toLowerCase());
        }

        // Skip rows with no identifiers
        if (!existingPiiRecord && !thaiId.value && !phone && !lineId) {
          result.skipped++;
          result.errors.push({ row: rowNum, reason: "No identifiers (Thai ID, phone, or Line ID)" });
          continue;
        }

        if (dryRun) {
          // Just count what would happen
          if (existingPiiRecord) {
            result.updated++;
            result.updatedIds.push(existingPiiRecord.id);
          } else {
            result.inserted++;
          }
          continue;
        }

        // REAL IMPORT
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

          // Check if request already exists for this PII
          if (!requestByPiiId.has(existingPiiRecord.id)) {
            // Create request record
            const { data: reqData, error: reqErr } = await adminClient
              .from('hiv_selftest_requests')
              .insert({
                user_id: existingPiiRecord.user_id,
                pii_id: existingPiiRecord.id,
                status: 'pending',
                assigned_branch: 'silom',
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
          // INSERT new records - need a system user_id for imported records
          // Use a deterministic approach: create PII without user_id won't work (NOT NULL constraint)
          // We'll use a service-level import user or the admin's ID
          const importUserId = user.id; // Admin user as owner for imported records

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
              status: 'pending',
              assigned_branch: 'silom',
              created_at: timestamp || new Date().toISOString(),
            })
            .select('id')
            .single();
          if (reqErr) throw reqErr;

          // Update lookup maps to avoid duplicate inserts within same batch
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
