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

interface KitRecipient {
  id: string;        // kit_orders.id
  name?: string | null;
  phone: string;
}

interface Body {
  request_ids?: string[];
  kit_recipients?: KitRecipient[];
  message: string;
  sender?: string;
  template_key?: string;
  template_label?: string;
  track_links?: boolean;
}

const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://testd.website").replace(/\/+$/, "");

function makeToken(len = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function makeMagicToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Public landing URLs — short, clickable, no token required.
// Recipients can act directly: book a clinic visit, or open the self-test
// reporting / kit-ordering hub.
const BOOK_URL = `${APP_BASE_URL}/clinic/book`;
const SELFTEST_PUBLIC_URL = `${APP_BASE_URL}/th/hiv-selftest`;

// Pick the right CTA link for the legacy {{followup_link}} placeholder based
// on the template the admin chose. Booking-style templates -> /clinic/book.
// Reporting / kit / selftest templates -> /th/hiv-selftest.
function resolveFollowupLink(templateKey: string | null, kind: "selftest" | "kit_order", code: string): string {
  const key = (templateKey || "").toLowerCase();
  const bookingKeys = [
    "invite_clinic",
    "missed_appointment",
    "prep_info",
    "negative_prep_invite",
    "negative_prep_pickup",
    "first_reactive",
  ];
  if (bookingKeys.some((k) => key.includes(k))) return BOOK_URL;
  if (kind === "kit_order" && code) return `${APP_BASE_URL}/track-kit/${encodeURIComponent(code)}`;
  return SELFTEST_PUBLIC_URL;
}

// Only rewrite obviously-internal admin URLs that should never reach a
// recipient. Public marketing pages (testd.website, /clinic/book, /th/...,
// /track-kit/...) are kept verbatim so the CTA link the admin sees in the
// preview is exactly what the recipient receives.
function shouldRewriteInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url, APP_BASE_URL);
    const path = parsed.pathname.toLowerCase();
    return (
      path.startsWith("/admin") ||
      path.startsWith("/staff") ||
      path.startsWith("/internal") ||
      path.startsWith("/dev")
    );
  } catch {
    return false;
  }
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
    const kitRecipients = Array.isArray(body.kit_recipients)
      ? body.kit_recipients.filter((x) => x && typeof x.id === "string" && typeof x.phone === "string")
      : [];
    const message = (body.message || "").trim();
    const sender = (body.sender || DEFAULT_SENDER).trim().slice(0, 11);
    const templateKey = (body.template_key || "").trim().slice(0, 64) || null;
    const templateLabel = (body.template_label || "").trim().slice(0, 128) || null;
    const trackLinks = body.track_links !== false; // default ON

    const totalRecipients = requestIds.length + kitRecipients.length;
    if (totalRecipients === 0) {
      return new Response(JSON.stringify({ error: "no_recipients" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (totalRecipients > 200) {
      return new Response(JSON.stringify({ error: "too_many_recipients", max: 200 }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message || message.length < 2 || message.length > 459) {
      return new Response(JSON.stringify({ error: "invalid_message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipient phones from selftest requests + pii (if any)
    let reqs: any[] = [];
    if (requestIds.length > 0) {
      const { data, error: reqErr } = await admin
        .from("hiv_selftest_requests")
        .select("id, phone, full_name, selftest_pii:selftest_pii(phone, full_name)")
        .in("id", requestIds);
      if (reqErr) {
        return new Response(JSON.stringify({ error: reqErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      reqs = data || [];
    }

    // Build a unified list of send targets — selftest requests and/or kit-order recipients.
    type Target = {
      kind: "selftest" | "kit_order";
      ref_id: string;            // hiv_selftest_requests.id OR kit_orders.id
      rawPhone: string;
      recipientName: string;
      code: string;              // public tracking code (kit_orders.order_code) for {{code}}
    };
    const targets: Target[] = [
      ...reqs.map((r: any): Target => ({
        kind: "selftest",
        ref_id: r.id,
        rawPhone: r.selftest_pii?.phone || r.phone || "",
        recipientName: (r.selftest_pii?.full_name || r.full_name || "").trim(),
        code: "",
      })),
      ...kitRecipients.map((k): Target => ({
        kind: "kit_order",
        ref_id: k.id,
        rawPhone: k.phone || "",
        recipientName: (k.name || "").trim(),
        code: ((k as any).code || "").toString().trim(),
      })),
    ];

    const results: Array<{ request_id?: string; kit_order_id?: string; ok: boolean; phone?: string; error?: string; sms_id?: string }> = [];

    for (const tgt of targets) {
      const { kind, ref_id, rawPhone, recipientName, code } = tgt;
      const normalized = normalizeThaiPhone(rawPhone);
      // Helper to build sms_send_log row with the right FK column based on kind.
      const baseLog: Record<string, any> = {
        request_id: kind === "selftest" ? ref_id : null,
        kit_order_id: kind === "kit_order" ? ref_id : null,
        recipient_name: recipientName || null,
        template_key: templateKey,
        template_label: templateLabel,
        sender,
        sent_by: userData.user.id,
      };
      // selftest_tracking_events is selftest-scoped only; skip for kit-order sends.
      const logSelftestEvent = async (row: Record<string, any>) => {
        if (kind !== "selftest") return;
        await admin.from("selftest_tracking_events").insert({ request_id: ref_id, ...row });
      };

      if (!normalized) {
        results.push({ [kind === "selftest" ? "request_id" : "kit_order_id"]: ref_id, ok: false, error: "invalid_phone" } as any);
        await logSelftestEvent({
          event_code: "sms_failed",
          event_description: "invalid_phone",
          raw: { phone_raw: rawPhone, sender, message_preview: message.slice(0, 80) },
        });
        await admin.from("sms_send_log").insert({
          ...baseLog,
          phone: rawPhone || "",
          message,
          status: "failed",
          error_message: "invalid_phone",
        });
        continue;
      }

      // Public link — no token, no tracking redirect. Self-test sends go to the public HIV self-test page;
      // kit-order sends go to the public order-tracking page.
      const followupLink = kind === "selftest"
        ? SELFTEST_PUBLIC_URL
        : `${APP_BASE_URL}/track-kit/${encodeURIComponent(code || ref_id)}`;

      // Substitute per-recipient variables ({{name}}, {{phone}}, {{code}}, {{followup_link}}) in the template
      let personalized = message
        .replace(/\{\{\s*name\s*\}\}/gi, recipientName || "คุณ")
        .replace(/\{\{\s*phone\s*\}\}/gi, normalized)
        .replace(/\{\{\s*code\s*\}\}/gi, code || "")
        .replace(/\{\{\s*followup_link\s*\}\}/gi, followupLink);

      // Replace any internal site URLs in the template with the public follow-up link
      // so legacy admin/internal paths never reach the recipient.
      personalized = personalized.replace(/https?:\/\/[^\s]+/g, (url) => {
        return shouldReplaceWithSelftestFollowup(url) ? followupLink : url;
      });

      // No /r/ tracking rewrite — send the public URL as-is to avoid 404 redirects.
      const trackingToken: string | null = null;
      const originalUrl: string | null = null;

      try {
        const resp = await fetch(SMSMKT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api_key": API_KEY,
            "secret_key": SECRET_KEY,
          },
          body: JSON.stringify({
            message: personalized,
            phone: normalized,
            sender,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        // SMSMKT returns HTTP 200 even on failure — must check provider code/status in body.
        // Known success indicators: code "000" / status "success" / success:true.
        // Known failure example: {"code":"300","detail":"Not found this sender name."}
        const providerCode = data?.code != null ? String(data.code) : null;
        const providerStatus = (data?.status || "").toString().toLowerCase();
        const providerOk =
          providerCode === "000" ||
          providerCode === "0" ||
          providerStatus === "success" ||
          data?.success === true;
        const providerFail =
          (providerCode && providerCode !== "000" && providerCode !== "0") ||
          providerStatus === "error" ||
          providerStatus === "failed" ||
          data?.success === false;
        // If provider gave no recognisable signal, fall back to HTTP status.
        const ok = providerOk || (!providerFail && resp.ok);
        const smsProviderId = data?.message_id || data?.data?.message_id || null;
        const errMsg = ok
          ? null
          : (data?.detail || data?.message || (providerCode ? `provider_code_${providerCode}` : `http_${resp.status}`));


        results.push({
          [kind === "selftest" ? "request_id" : "kit_order_id"]: ref_id,
          ok,
          phone: normalized,
          sms_id: smsProviderId || undefined,
          error: errMsg || undefined,
        } as any);
        await logSelftestEvent({
          event_code: ok ? "sms_sent" : "sms_failed",
          event_description: ok ? "SMS sent via SMSMKT" : `SMS failed: ${data?.message || resp.status}`,
          raw: { sender, phone: normalized, response: data, http_status: resp.status, message_preview: personalized.slice(0, 80), sent_by: userData.user.id, tracking_token: trackingToken },
        });
        await admin.from("sms_send_log").insert({
          ...baseLog,
          phone: normalized,
          message: personalized,
          status: ok ? "sent" : "failed",
          sms_provider_id: smsProviderId,
          http_status: resp.status,
          error_message: errMsg,
          provider_response: data ?? null,
          tracking_token: trackingToken,
          original_url: originalUrl,
        });
      } catch (e: any) {
        results.push({ [kind === "selftest" ? "request_id" : "kit_order_id"]: ref_id, ok: false, error: e?.message || "network_error" } as any);
        await logSelftestEvent({
          event_code: "sms_failed",
          event_description: `network_error: ${e?.message || ""}`,
          raw: { sender, phone: normalized, sent_by: userData.user.id, tracking_token: trackingToken },
        });
        await admin.from("sms_send_log").insert({
          ...baseLog,
          phone: normalized,
          message: personalized,
          status: "failed",
          error_message: e?.message || "network_error",
          tracking_token: trackingToken,
          original_url: originalUrl,
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
