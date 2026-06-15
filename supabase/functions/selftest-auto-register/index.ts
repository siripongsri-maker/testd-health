// Auto-register guest selftest user using admin API (no email confirmation needed).
// Public (verify_jwt=false). Avoids the auth signup email rate limit on synthetic
// @swingth.local addresses by creating the user with email_confirm=true.
//
// Two modes:
//  - mode: "register" (default) — create user + return user_id
//  - mode: "submit" — create user (if needed) + insert PII + insert request row
//    using service role (bypasses RLS race conditions on freshly-issued JWT).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { email, password, display_name, mode = "register", user_id, pii, request } = body ?? {};

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let resolvedUserId: string | null = user_id || null;
    let isNew = false;

    // Create user if email + password are provided and no user_id yet
    if (!resolvedUserId) {
      if (
        !email || typeof email !== "string" || !email.endsWith("@swingth.local") ||
        !password || typeof password !== "string" || password.length < 12
      ) {
        return json({ error: "invalid_payload" }, 400);
      }

      const { data: created, error: createErr } = await supa.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: display_name || email.split("@")[0] },
      });

      if (createErr) {
        const msg = createErr.message || "";
        if (/already|exists|registered|duplicate/i.test(msg)) {
          return json({ error: "already_exists" }, 409);
        }
        console.error("admin.createUser failed", createErr);
        return json({ error: "create_failed", detail: msg }, 500);
      }

      resolvedUserId = created.user?.id ?? null;
      isNew = true;
    }

    if (!resolvedUserId) return json({ error: "no_user" }, 500);

    // Register-only mode
    if (mode === "register") {
      return json({ user_id: resolvedUserId, email, is_new: isNew });
    }

    // Submit mode: insert PII + request server-side with service role
    if (mode === "submit") {
      if (!pii || typeof pii !== "object") return json({ error: "missing_pii" }, 400);
      if (!request || typeof request !== "object") return json({ error: "missing_request" }, 400);

      const { data: piiRow, error: piiErr } = await supa
        .from("selftest_pii")
        .insert({ ...pii, user_id: resolvedUserId })
        .select()
        .single();

      if (piiErr) {
        console.error("selftest_pii insert failed", piiErr);
        return json({ error: "pii_insert_failed", detail: piiErr.message }, 500);
      }

      const { data: reqRow, error: reqErr } = await supa
        .from("hiv_selftest_requests")
        .insert({ ...request, user_id: resolvedUserId, pii_id: piiRow.id })
        .select()
        .single();

      if (reqErr) {
        console.error("hiv_selftest_requests insert failed", reqErr);
        return json({ error: "request_insert_failed", detail: reqErr.message }, 500);
      }

      return json({
        user_id: resolvedUserId,
        is_new: isNew,
        pii_id: piiRow.id,
        request: reqRow,
      });
    }

    return json({ error: "unknown_mode" }, 400);
  } catch (e) {
    console.error("selftest-auto-register exception", e);
    return json({ error: "exception", detail: String(e) }, 500);
  }
});
