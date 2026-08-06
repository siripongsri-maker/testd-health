import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Maintenance endpoint: auto-checks-out stale appointments.
 * Restricted to trusted callers only (service-role bearer, e.g. cron, or an
 * authenticated admin). The threshold is clamped server-side so it can never be
 * abused to force-close visits that are still in progress.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    let allowed = token.length > 0 && token === serviceKey;

    if (!allowed && token) {
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const { data: isAdmin } = await supabase.rpc("has_role", {
            _user_id: user.id,
            _role: "admin",
          });
          allowed = isAdmin === true;
        }
      } catch {
        allowed = false;
      }
    }

    if (!allowed) {
      return json({ error: "forbidden" }, 403);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    // Clamp: never below 1 hour, never above 24 hours.
    const requested = Number(body?.threshold_hours);
    const thresholdHours = Number.isFinite(requested)
      ? Math.min(24, Math.max(1, requested))
      : 1;

    const { data, error } = await supabase.rpc("auto_checkout_stale_appointments", {
      p_threshold_hours: thresholdHours,
    });

    if (error) throw error;

    return json({ success: true, threshold_hours: thresholdHours, auto_checked_out_count: data });
  } catch (err) {
    console.error("[auto-checkout] failed", err);
    return json({ error: "internal_error" }, 500);
  }
});
