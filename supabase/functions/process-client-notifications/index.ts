// Sends queued client status notifications (claim received / approved / paid / rejected).
// Triggered by a scheduled job (x-cron-secret header) or manually by an admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SMSMKT_URL = "https://portal-otp.smsmkt.com/api/send-message";
const BATCH = 25;
const MAX_ATTEMPTS = 3;

function normalizeThaiPhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return "66" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("66")) return digits;
  if (digits.length === 9) return "66" + digits;
  return null;
}

async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const API_KEY = Deno.env.get("SMSMKT_API_KEY");
    const SECRET_KEY = Deno.env.get("SMSMKT_SECRET_KEY");
    const SENDER = Deno.env.get("SMSMKT_SENDER");
    const CRON_SECRET = Deno.env.get("POST_EVAL_CRON_SECRET");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    let authorized = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    if (!authorized) {
      const authHeader = req.headers.get("Authorization") || "";
      const userClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
        authorized = !!isAdmin;
      }
    }
    if (!authorized) return json({ error: "forbidden" }, 403);
    if (!API_KEY || !SECRET_KEY || !SENDER) return json({ error: "sms_not_configured" }, 500);

    const { data: queued } = await admin
      .from("client_status_notifications")
      .select("id, note_id, appointment_id, message, attempts")
      .eq("status", "queued")
      .eq("channel", "sms")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(BATCH);

    let sent = 0, failed = 0, skipped = 0;

    for (const row of queued ?? []) {
      let apptId = row.appointment_id as string | null;
      if (!apptId && row.note_id) {
        const { data: resolved } = await admin.rpc("note_appointment_id", { _note_id: row.note_id });
        apptId = (resolved as string | null) ?? null;
      }

      let phoneRaw: string | null = null;
      if (apptId) {
        const { data: appt } = await admin
          .from("appointments").select("contact_phone").eq("id", apptId).maybeSingle();
        phoneRaw = appt?.contact_phone ?? null;
      }
      const phone = phoneRaw ? normalizeThaiPhone(phoneRaw) : null;

      if (!phone) {
        await admin.from("client_status_notifications")
          .update({ status: "failed", error_message: "missing_phone", attempts: (row.attempts ?? 0) + 1 })
          .eq("id", row.id);
        skipped++;
        continue;
      }

      const resp = await fetch(SMSMKT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", api_key: API_KEY, secret_key: SECRET_KEY },
        body: JSON.stringify({ message: row.message, phone, sender: SENDER }),
      });
      const data = await resp.json().catch(() => ({}));
      const code = data?.code != null ? String(data.code) : null;
      const ok = resp.ok && (code === "000" || code === "0" ||
        String(data?.status || "").toLowerCase() === "success" || data?.success === true);

      const attempts = (row.attempts ?? 0) + 1;
      await admin.from("client_status_notifications").update({
        status: ok ? "sent" : (attempts >= MAX_ATTEMPTS ? "failed" : "queued"),
        attempts,
        appointment_id: apptId,
        phone_last4: phone.slice(-4),
        phone_hash: await sha256Hex(phone),
        provider_message_id: data?.message_id ?? data?.transaction_id ?? null,
        error_message: ok ? null : JSON.stringify(data).slice(0, 300),
        sent_at: ok ? new Date().toISOString() : null,
        scheduled_for: ok ? new Date().toISOString() : new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }).eq("id", row.id);

      ok ? sent++ : failed++;
    }

    return json({ ok: true, processed: (queued ?? []).length, sent, failed, skipped });
  } catch (err) {
    console.error("CLIENT_NOTIFICATIONS_ERROR", err);
    return json({ error: "server_error" }, 500);
  }
});
