// Admin-only: create a magic link so a self-test user can re-enter their Thai ID.
// Returns { token, url, expires_at }. Token is stored hashed in selftest_magic_tokens.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_ROLES = new Set([
  "admin", "super_admin", "clinic_admin", "moderator", "outreach_admin",
]);
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://testd.website").replace(/\/+$/, "");

function makeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles || []).some((r: any) => ADMIN_ROLES.has(r.role));
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const { request_id } = await req.json();
    if (!request_id || typeof request_id !== "string") {
      return json({ error: "missing_request_id" }, 400);
    }

    const { data: reqRow, error: reqErr } = await admin
      .from("hiv_selftest_requests")
      .select("id, pii_id")
      .eq("id", request_id)
      .maybeSingle();
    if (reqErr || !reqRow) return json({ error: "request_not_found" }, 404);

    const token = makeToken();
    const token_hash = await sha256Hex(token);
    const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days

    const { error: insErr } = await admin.from("selftest_magic_tokens").insert({
      request_id: reqRow.id,
      token_hash,
      purpose: "update_thai_id",
      expires_at,
    });
    if (insErr) {
      console.error("[create-update-id-link] insert failed", insErr);
      return json({ error: "token_insert_failed", detail: insErr.message }, 500);
    }

    return json({
      token,
      url: `${APP_BASE_URL}/selftest/update-id/${token}`,
      expires_at,
    });
  } catch (e) {
    console.error("[create-update-id-link]", e);
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});
