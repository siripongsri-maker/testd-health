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

// Retry an insert when PostgREST's schema cache is stale (PGRST204 / "schema cache").
// This can happen briefly right after a migration adds a new column.
async function insertWithSchemaRetry<T = any>(
  build: () => any,
  label: string,
  attempts = 4,
): Promise<{ data: T | null; error: any }> {
  let lastErr: any = null;
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await build();
    if (!error) return { data, error: null };
    lastErr = error;
    const msg = String(error?.message ?? "");
    const code = String(error?.code ?? "");
    const isSchemaCache =
      code === "PGRST204" || msg.toLowerCase().includes("schema cache");
    if (!isSchemaCache) return { data: null, error };
    const delay = 400 * (i + 1);
    console.warn(`[${label}] schema cache miss, retry ${i + 1}/${attempts} in ${delay}ms`, msg);
    await new Promise((r) => setTimeout(r, delay));
  }
  return { data: null, error: lastErr };
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

      // Province is required for analytics/map coverage — block submissions without it.
      const provinceRaw = (pii as any).province;
      const province = typeof provinceRaw === "string" ? provinceRaw.trim() : "";
      if (!province || province.length > 100) {
        return json({ error: "province_required", message: "กรุณาเลือกจังหวัด" }, 400);
      }
      (pii as any).province = province;


      // Whitelist PII fields — never spread raw client input into service-role insert
      const safePii: Record<string, unknown> = {
        user_id: resolvedUserId,
        full_name: (pii as any).full_name ?? null,
        phone: (pii as any).phone ?? null,
        address: (pii as any).address ?? null,
        province: (pii as any).province ?? null,
        district: (pii as any).district ?? null,
        subdistrict: (pii as any).subdistrict ?? null,
        postal_code: (pii as any).postal_code ?? null,
        date_of_birth: (pii as any).date_of_birth ?? null,
        gender: (pii as any).gender ?? null,
        national_id: (pii as any).national_id ?? null,
        email: (pii as any).email ?? null,
      };

      const { data: piiRow, error: piiErr } = await insertWithSchemaRetry<any>(
        () => supa.from("selftest_pii").insert(safePii).select().single(),
        "selftest_pii",
      );

      if (piiErr) {
        console.error("selftest_pii insert failed", piiErr);
        return json({ error: "pii_insert_failed", detail: piiErr.message }, 500);
      }

      // Whitelist request fields — block client from injecting status/test_result/abuse_*
      const r = request as Record<string, any>;
      const safeRequest: Record<string, unknown> = {
        user_id: resolvedUserId,
        pii_id: piiRow.id,
        last_risk_date: r.last_risk_date ?? null,
        delivery_mode: r.delivery_mode ?? "ship",
        assigned_branch: r.assigned_branch ?? "silom",
        wants_callback: r.wants_callback ?? false,
        callback_phone: r.callback_phone ?? null,
        submission_path: r.submission_path ?? null,
        pickup_branch: r.pickup_branch ?? null,
        pickup_date: r.pickup_date ?? null,
        notes: r.notes ?? null,
        consent_given: r.consent_given ?? null,
        risk_level: r.risk_level ?? null,
        prior_test: r.prior_test ?? null,
      };

      const { data: reqRow, error: reqErr } = await supa
        .from("hiv_selftest_requests")
        .insert(safeRequest)
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
