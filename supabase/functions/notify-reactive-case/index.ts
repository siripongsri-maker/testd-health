// Notify the team when a self-test result comes back reactive (2 lines).
// Uses the existing transactional email infrastructure (send-transactional-email).
// Idempotent via reactive_notified_at column.
// Requires REACTIVE_NOTIFY_EMAILS env var (comma-separated list).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_BASE_URL =
  Deno.env.get("ADMIN_BASE_URL") || "https://testd.website/admin";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { request_id?: string; has_photo?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.request_id || typeof body.request_id !== "string") {
    return new Response(JSON.stringify({ error: "missing_request_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const NOTIFY_EMAILS = (Deno.env.get("REACTIVE_NOTIFY_EMAILS") ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!NOTIFY_EMAILS.length) {
    console.warn("[notify-reactive-case] REACTIVE_NOTIFY_EMAILS not configured");
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: "no_recipients" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(supabaseUrl, serviceKey);

  // Verify it's truly reactive and not already notified
  const { data: request, error } = await supa
    .from("hiv_selftest_requests")
    .select(
      "id, delivery_mode, self_reported_result, reactive_notified_at, result_submitted_at, photo_provided"
    )
    .eq("id", body.request_id)
    .maybeSingle();

  if (error || !request) {
    return new Response(JSON.stringify({ error: "request_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (request.self_reported_result !== "reactive") {
    return new Response(JSON.stringify({ ok: true, skipped: "not_reactive" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (request.reactive_notified_at) {
    return new Response(JSON.stringify({ ok: true, skipped: "already_notified" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const shortId = String(request.id).slice(0, 8);
  const templateData = {
    shortId,
    requestId: request.id,
    submittedAt: request.result_submitted_at || new Date().toISOString(),
    deliveryMode: request.delivery_mode || "unknown",
    photoAttached: !!request.photo_provided,
    adminUrl: `${ADMIN_BASE_URL}?tab=selftest-results&request=${request.id}`,
  };

  // Send to each recipient through send-transactional-email (uses internal queue)
  let sent = 0;
  const errors: string[] = [];
  for (const email of NOTIFY_EMAILS) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName: "selftest-reactive-alert",
          recipientEmail: email,
          templateData,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("[notify-reactive-case] send fail", email, resp.status, txt);
        errors.push(`${email}: ${resp.status}`);
      } else {
        sent++;
      }
    } catch (e) {
      console.error("[notify-reactive-case] send err", email, e);
      errors.push(`${email}: ${String(e)}`);
    }
  }

  if (sent > 0) {
    await supa
      .from("hiv_selftest_requests")
      .update({
        reactive_notified_at: new Date().toISOString(),
        reactive_notified_to: NOTIFY_EMAILS.join(","),
      })
      .eq("id", request.id);
  }

  return new Response(
    JSON.stringify({ ok: sent > 0, sent, total: NOTIFY_EMAILS.length, errors }),
    {
      status: sent > 0 ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
