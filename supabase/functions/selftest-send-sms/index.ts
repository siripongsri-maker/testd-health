// Selftest Follow-up: Send SMS via SMSMKT
// Admin-only. Sends SMS to one or many selftest request recipients and logs every attempt.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SMSMKT_URL = "https://portal-otp.smsmkt.com/api/send-message";

interface Body {
  request_ids: string[];
  message: string;
  sender?: string;
}

function normalizeThaiPhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;
  // 0XXXXXXXXX (10 digits) -> 66XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("0")) return "66" + digits.slice(1);
  // 66XXXXXXXXX (11 digits)
  if (digits.length === 11 && digits.startsWith("66")) return digits;
  // +66XXXXXXXXX after stripping non-digits becomes 66...
  if (digits.length === 11 && digits.startsWith("66")) return digits;
  // Fallback: if 9 digits assume missing leading 0
  if (digits.length === 9) return "66" + digits;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const API_KEY = Deno.env.get("SMSMKT_API_KEY");
    const SECRET_KEY = Deno.env.get("SMSMKT_SECRET_KEY");
    const DEFAULT_SENDER = Deno.env.get("SMSMKT_SENDER");

    if (!API_KEY || !SECRET_KEY || !DEFAULT_SENDER) {
      return new Response(
        JSON.stringify({ error: "sms_not_configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth: verify caller is an authenticated admin
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles || []).some((r: any) =>
      ["admin", "super_admin", "clinic_admin", "me_analyst", "outreach_admin"].includes(r.role),
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const requestIds = Array.isArray(body.request_ids) ? body.request_ids.filter((x) => typeof x === "string") : [];
    const message = (body.message || "").trim();
    const sender = (body.sender || DEFAULT_SENDER).trim().slice(0, 11);

    if (requestIds.length === 0) {
      return new Response(JSON.stringify({ error: "no_recipients" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (requestIds.length > 200) {
      return new Response(JSON.stringify({ error: "too_many_recipients", max: 200 }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message || message.length < 2 || message.length > 459) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient phones from requests + pii
    const { data: reqs, error: reqErr } = await admin
      .from("hiv_selftest_requests")
      .select("id, phone, full_name, selftest_pii:selftest_pii(phone, full_name)")
      .in("id", requestIds);
    if (reqErr) {
      return new Response(JSON.stringify({ error: reqErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ request_id: string; ok: boolean; phone?: string; error?: string; sms_id?: string }> = [];

    for (const r of reqs || []) {
      const rawPhone = (r as any).selftest_pii?.phone || (r as any).phone || "";
      const normalized = normalizeThaiPhone(rawPhone);
      if (!normalized) {
        results.push({ request_id: r.id, ok: false, error: "invalid_phone" });
        await admin.from("selftest_tracking_events").insert({
          request_id: r.id,
          event_code: "sms_failed",
          event_description: "invalid_phone",
          raw: { phone_raw: rawPhone, sender, message_preview: message.slice(0, 80) },
        });
        continue;
      }

      try {
        const resp = await fetch(SMSMKT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api_key": API_KEY,
            "secret_key": SECRET_KEY,
          },
          body: JSON.stringify({
            message,
            phone: normalized,
            sender,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        const ok = resp.ok && (data?.status === "success" || data?.code === 200 || data?.success === true || resp.status === 200);
        results.push({
          request_id: r.id,
          ok,
          phone: normalized,
          sms_id: data?.message_id || data?.data?.message_id,
          error: ok ? undefined : (data?.message || `http_${resp.status}`),
        });
        await admin.from("selftest_tracking_events").insert({
          request_id: r.id,
          event_code: ok ? "sms_sent" : "sms_failed",
          event_description: ok ? "SMS sent via SMSMKT" : `SMS failed: ${data?.message || resp.status}`,
          raw: { sender, phone: normalized, response: data, http_status: resp.status, message_preview: message.slice(0, 80), sent_by: userData.user.id },
        });
      } catch (e: any) {
        results.push({ request_id: r.id, ok: false, error: e?.message || "network_error" });
        await admin.from("selftest_tracking_events").insert({
          request_id: r.id,
          event_code: "sms_failed",
          event_description: `network_error: ${e?.message || ""}`,
          raw: { sender, phone: normalized, sent_by: userData.user.id },
        });
      }
    }

    const sentCount = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ sent: sentCount, total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[selftest-send-sms] error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
