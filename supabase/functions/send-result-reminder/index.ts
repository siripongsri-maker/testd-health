// Daily reminder for delivered self-test kits with no submitted result.
// Sends SMS at D+2, D+7, D+14 with magic link to result submission.
// Trigger via cron (daily). Idempotent via selftest_result_reminders log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATES: Record<string, { sms: string }> = {
  first_check_in: {
    sms: "testD: ชุดตรวจน่าจะถึงแล้ว แค่บอกว่าผลขึ้นกี่ขีด 30 วินาทีจบ {link}",
  },
  gentle_nudge: {
    sms: "testD: ส่งผลให้เราดูสักหน่อย ใช้แค่คลิกเดียว ไม่ต้องถ่ายรูป {link}",
  },
  final_offer: {
    sms: "testD: ถ้าชุดตรวจยังอยู่ ส่งผลที่นี่ {link} หรือทักเราขอชุดใหม่ก็ได้",
  },
  soft_check_in: {
    sms: "testD: พร้อมเมื่อไหร่มาทักได้เลย ไม่มีกำหนดเวลา หรือคุยกับทีม {link}",
  },
};

const SCHEDULE = [
  { daysAfter: 2, template: "first_check_in" },
  { daysAfter: 7, template: "gentle_nudge" },
  { daysAfter: 14, template: "final_offer" },
];

const POSTPONE_COOLDOWN_DAYS = 3;
const FREQUENT_POSTPONER_THRESHOLD = 3;

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://testd-health.lovable.app";

function generateToken(): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("66")) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+66" + digits.slice(1);
  if (digits.length === 9) return "+66" + digits;
  return null;
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  if (!accountSid) {
    console.warn("[reminder] no Twilio configured, skipping send");
    return false;
  }
  const apiKey = Deno.env.get("TWILIO_API_KEY");
  const apiSecret = Deno.env.get("TWILIO_API_SECRET");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  let user: string, pass: string;
  if (apiKey && apiSecret) { user = apiKey; pass = apiSecret; }
  else if (authToken) { user = accountSid; pass = authToken; }
  else return false;

  const msgService = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const fromNum = Deno.env.get("TWILIO_FROM_NUMBER");
  const params: Record<string, string> = { To: to, Body: body };
  if (msgService) params.MessagingServiceSid = msgService;
  else if (fromNum) params.From = fromNum;
  else return false;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    console.error("[reminder] twilio fail", res.status, await res.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const summary = { eligible: 0, sent: 0, skipped: 0, failed: 0 };

  try {
    // Pull all delivered/shipped requests with no result_submitted_at, with delivered_at present
    const { data: rows, error } = await supa
      .from("hiv_selftest_requests")
      .select("id, status, delivered_at, phone, callback_phone, result_submitted_at, last_postponed_at, postpone_count")
      .in("status", ["delivered", "shipped", "received", "confirmed"])
      .is("result_submitted_at", null)
      .not("delivered_at", "is", null)
      .limit(500);
    if (error) throw error;

    const now = Date.now();
    for (const r of rows || []) {
      const deliveredAt = new Date(r.delivered_at as string).getTime();
      const ageDays = Math.floor((now - deliveredAt) / 86400000);
      const slot = SCHEDULE.find((s) => s.daysAfter === ageDays);
      if (!slot) { summary.skipped++; continue; }
      summary.eligible++;

      // Skip if user just postponed within cooldown window
      if (r.last_postponed_at) {
        const daysSincePostpone =
          (now - new Date(r.last_postponed_at as string).getTime()) / 86400000;
        if (daysSincePostpone < POSTPONE_COOLDOWN_DAYS) {
          summary.skipped++;
          continue;
        }
      }

      // Use softer template for frequent postponers
      const isFrequentPostponer = ((r.postpone_count as number | null) ?? 0) >= FREQUENT_POSTPONER_THRESHOLD;
      const templateKey = isFrequentPostponer ? "soft_check_in" : slot.template;

      // Idempotency
      const { data: existing } = await supa
        .from("selftest_result_reminders")
        .select("id")
        .eq("request_id", r.id)
        .eq("template", templateKey)
        .maybeSingle();
      if (existing) { summary.skipped++; continue; }

      const phone = normalizePhone(r.callback_phone || r.phone);
      if (!phone) { summary.skipped++; continue; }

      // Generate magic token
      const token = generateToken();
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      await supa.from("selftest_magic_tokens").insert({
        request_id: r.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

      const link = `${APP_BASE_URL}/hiv-selftest?token=${token}`;
      const body = TEMPLATES[slot.template].sms.replace("{link}", link);
      const ok = await sendSms(phone, body);
      await supa.from("selftest_result_reminders").insert({
        request_id: r.id,
        template: slot.template,
        channel: "sms",
        meta: { phone_masked: phone.slice(0, 4) + "***" + phone.slice(-3), ok },
      });
      if (ok) summary.sent++;
      else summary.failed++;
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[reminder]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
