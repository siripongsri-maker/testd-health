// Resolve a magic link token for self-test result re-entry.
// Public (verify_jwt=false). Returns request_id + status if token valid+unused+unexpired.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string" || token.length < 16) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const hash = await sha256Hex(token);

    const { data: tk, error } = await supa
      .from("selftest_magic_tokens")
      .select("id, request_id, purpose, expires_at, used_at")
      .eq("token_hash", hash)
      .maybeSingle();

    if (error || !tk) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (tk.used_at && tk.purpose !== "followup") {
      return new Response(JSON.stringify({ error: "already_used" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Date(tk.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (tk.purpose !== "followup") {
      await supa.from("selftest_magic_tokens").update({ used_at: new Date().toISOString() }).eq("id", tk.id);
    }

    const { data: reqRow } = await supa
      .from("hiv_selftest_requests")
      .select("id, status, delivery_mode, user_id, pii_id, assigned_branch, self_reported_result, test_result, care_action, created_at")
      .eq("id", tk.request_id)
      .maybeSingle();

    let phone: string | null = null;
    if (reqRow?.pii_id) {
      const { data: pii } = await supa
        .from("selftest_pii")
        .select("phone")
        .eq("id", reqRow.pii_id)
        .maybeSingle();
      phone = pii?.phone ?? null;
    }

    return new Response(
      JSON.stringify({
        request: reqRow
          ? {
              id: reqRow.id,
              status: reqRow.status,
              delivery_mode: reqRow.delivery_mode,
              user_id: reqRow.user_id,
              assigned_branch: reqRow.assigned_branch,
              self_reported_result: reqRow.self_reported_result,
              test_result: reqRow.test_result,
              care_action: reqRow.care_action,
              created_at: reqRow.created_at,
              phone,
            }
          : null,
        purpose: tk.purpose,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[magic-resolve]", e);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
