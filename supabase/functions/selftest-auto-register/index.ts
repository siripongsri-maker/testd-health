// Auto-register guest selftest user using admin API (no email confirmation needed).
// Public (verify_jwt=false). Avoids the auth signup email rate limit on synthetic
// @swingth.local addresses by creating the user with email_confirm=true.
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
    const { email, password, display_name } = await req.json();
    if (
      !email || typeof email !== "string" || !email.endsWith("@swingth.local") ||
      !password || typeof password !== "string" || password.length < 12
    ) {
      return json({ error: "invalid_payload" }, 400);
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try to create the user with email pre-confirmed (no email sent).
    const { data: created, error: createErr } = await supa.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name || email.split("@")[0] },
    });

    if (createErr) {
      const msg = createErr.message || "";
      // If somehow the email exists, treat as already-registered (different password).
      if (/already|exists|registered|duplicate/i.test(msg)) {
        return json({ error: "already_exists" }, 409);
      }
      console.error("admin.createUser failed", createErr);
      return json({ error: "create_failed", detail: msg }, 500);
    }

    return json({
      user_id: created.user?.id,
      email,
      is_new: true,
    });
  } catch (e) {
    console.error("selftest-auto-register exception", e);
    return json({ error: "exception", detail: String(e) }, 500);
  }
});
