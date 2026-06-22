// Public (verify_jwt=false). Submit a Thai national ID via a one-time magic link.
// Validates token (purpose=update_thai_id), normalizes the ID to 13 digits,
// updates selftest_pii.thai_id, and marks the token used.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Mirror of public.is_valid_thai_id — 13 digits + mod-11 checksum.
function isValidThaiId(input: string): boolean {
  const v = (input ?? "").replace(/\D/g, "");
  if (v.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(v[i]!, 10) * (13 - i);
  return ((11 - (sum % 11)) % 10) === parseInt(v[12]!, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, thai_id, mode } = await req.json();
    if (!token || typeof token !== "string" || token.length < 16) {
      return json({ error: "invalid_token" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const hash = await sha256Hex(token);
    const { data: tk } = await admin
      .from("selftest_magic_tokens")
      .select("id, request_id, purpose, expires_at, used_at")
      .eq("token_hash", hash)
      .maybeSingle();

    if (!tk) return json({ error: "not_found" }, 404);
    if (tk.purpose !== "update_thai_id") return json({ error: "wrong_purpose" }, 410);
    if (tk.used_at) return json({ error: "already_used" }, 410);
    if (new Date(tk.expires_at) < new Date()) return json({ error: "expired" }, 410);

    const { data: reqRow } = await admin
      .from("hiv_selftest_requests")
      .select("id, pii_id")
      .eq("id", tk.request_id)
      .maybeSingle();
    if (!reqRow?.pii_id) return json({ error: "pii_missing" }, 404);

    // Lookup mode: just confirm the link is valid + show masked name so the user knows it's theirs.
    if (mode === "lookup") {
      const { data: pii } = await admin
        .from("selftest_pii")
        .select("full_name, thai_id")
        .eq("id", reqRow.pii_id)
        .maybeSingle();
      const name = pii?.full_name || "";
      const maskedName = name
        ? name.split(" ").map((w) => (w.length > 1 ? w[0] + "•".repeat(Math.max(1, w.length - 1)) : w)).join(" ")
        : "";
      return json({
        ok: true,
        masked_name: maskedName,
        already_filled: Boolean(pii?.thai_id),
      });
    }

    const normalized = (thai_id ?? "").toString().replace(/\D/g, "").slice(0, 13);
    if (!isValidThaiId(normalized)) {
      return json({ error: "invalid_thai_id", message: "เลขบัตรประชาชนไม่ถูกต้อง" }, 400);
    }

    const { error: updErr } = await admin
      .from("selftest_pii")
      .update({ thai_id: normalized, updated_at: new Date().toISOString() })
      .eq("id", reqRow.pii_id);
    if (updErr) {
      console.error("[submit-thai-id] update failed", updErr);
      return json({ error: "update_failed", detail: updErr.message }, 500);
    }

    await admin
      .from("selftest_magic_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tk.id);

    return json({ ok: true });
  } catch (e) {
    console.error("[submit-thai-id]", e);
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});
