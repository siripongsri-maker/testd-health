// SMS link redirector with click tracking.
// Public endpoint (no auth). Records each visit into sms_send_log
// then 302-redirects to the original URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const FALLBACK_URL = (Deno.env.get("APP_BASE_URL") || "https://testd.website").replace(/\/+$/, "");

function redirect(to: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: to,
      "Cache-Control": "no-store, max-age=0",
    },
  });
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

async function createFollowupUrl(admin: any, origin: string, requestId: string): Promise<string> {
  const token = makeMagicToken();
  const tokenHash = await sha256Hex(token);
  const { error } = await admin.from("selftest_magic_tokens").insert({
    request_id: requestId,
    token_hash: tokenHash,
    purpose: "followup",
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
  if (error) throw error;
  return `${origin.replace(/\/+$/, "")}/selftest/followup/${token}`;
}

async function normalizeLegacyUrl(admin: any, originalUrl: string, requestId?: string | null): Promise<string> {
  try {
    const target = new URL(originalUrl, FALLBACK_URL);
    const normalizedPath = target.pathname.replace(/\/+$/, "") || "/";
    const pathWithoutLocale = normalizedPath.replace(/^\/(th|en)(?=\/)/, "");

    if (pathWithoutLocale === "/admin" || pathWithoutLocale.startsWith("/admin/") || pathWithoutLocale === "/dashboard" || pathWithoutLocale.startsWith("/dashboard/")) {
      return requestId ? await createFollowupUrl(admin, target.origin, requestId) : FALLBACK_URL;
    }

    if (["/selftest", "/submit-result", "/submit-hiv-result", "/submit"].includes(pathWithoutLocale)) {
      if (requestId) return await createFollowupUrl(admin, target.origin, requestId);
      return `${target.origin}/hiv-selftest?action=submit`;
    }

    if (pathWithoutLocale === "/clinic/book" || pathWithoutLocale === "/booking" || pathWithoutLocale === "/hiv-selftest") {
      if (requestId) return await createFollowupUrl(admin, target.origin, requestId);
      return `${target.origin}/booking${target.search}`;
    }

    return target.toString();
  } catch {
    return FALLBACK_URL;
  }
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Accept either /functions/v1/sms-redirect?t=TOKEN or trailing path /sms-redirect/TOKEN
    let token = url.searchParams.get("t") || "";
    if (!token) {
      const parts = url.pathname.split("/").filter(Boolean);
      token = parts[parts.length - 1] || "";
    }
    token = token.trim();

    if (!token || token.length > 64) {
      return redirect(FALLBACK_URL);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: row } = await admin
      .from("sms_send_log")
      .select("id, request_id, original_url, click_count, first_clicked_at")
      .eq("tracking_token", token)
      .maybeSingle();

    if (!row || !row.original_url) {
      return redirect(FALLBACK_URL);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "";
    const ua = (req.headers.get("user-agent") || "").slice(0, 256);
    const ipHash = ip ? await hashIp(ip, SERVICE_ROLE.slice(0, 16)) : null;
    const now = new Date().toISOString();

    await admin
      .from("sms_send_log")
      .update({
        click_count: (row.click_count || 0) + 1,
        first_clicked_at: row.first_clicked_at || now,
        last_clicked_at: now,
        last_click_user_agent: ua || null,
        last_click_ip_hash: ipHash,
      })
      .eq("id", row.id);

    return redirect(await normalizeLegacyUrl(admin, row.original_url, row.request_id));
  } catch (e) {
    console.error("[sms-redirect] error", e);
    return redirect(FALLBACK_URL);
  }
});
