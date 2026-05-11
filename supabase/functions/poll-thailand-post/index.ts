// Poll Thailand Post tracking API for shipped self-test kits.
// Updates status from shipped -> delivered when carrier confirms.
// Stores raw events in selftest_tracking_events.
// Gracefully no-ops if THAILAND_POST_API_KEY is not configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Thailand Post Track & Trace API (TrackParcel)
// Docs: https://track.thailandpost.co.th/developerGuide
const TP_TOKEN_URL = "https://trackapi.thailandpost.co.th/post/api/v1/authenticate/token";
const TP_TRACK_URL = "https://trackapi.thailandpost.co.th/post/api/v1/track";

async function getTpAccessToken(apiKey: string): Promise<string | null> {
  try {
    const r = await fetch(TP_TOKEN_URL, {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!r.ok) {
      console.error("[tp] token fail", r.status, await r.text());
      return null;
    }
    const j = await r.json();
    return j?.token?.access_token || null;
  } catch (e) {
    console.error("[tp] token err", e);
    return null;
  }
}

interface TpItem { status?: string; status_description?: string; status_date?: string; }

async function trackBatch(token: string, barcodes: string[]): Promise<Record<string, TpItem[]>> {
  const r = await fetch(TP_TRACK_URL, {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "all", language: "TH", barcode: barcodes }),
  });
  if (!r.ok) {
    console.error("[tp] track fail", r.status, await r.text());
    return {};
  }
  const j = await r.json();
  return j?.response?.items || {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const apiKey = Deno.env.get("THAILAND_POST_API_KEY");

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_api_key" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary = { checked: 0, updated_to_delivered: 0, events_logged: 0, errors: 0 };

  try {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: rows, error } = await supa
      .from("hiv_selftest_requests")
      .select("id, tracking_number, status, last_tracking_check_at")
      .eq("status", "shipped")
      .not("tracking_number", "is", null)
      .or(`last_tracking_check_at.is.null,last_tracking_check_at.lt.${oneHourAgo}`)
      .limit(50);
    if (error) throw error;
    if (!rows?.length) return new Response(JSON.stringify({ ok: true, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = await getTpAccessToken(apiKey);
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "tp_auth_failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const barcodes = rows.map((r) => r.tracking_number as string).filter(Boolean);
    const items = await trackBatch(token, barcodes);

    const nowIso = new Date().toISOString();
    for (const r of rows) {
      summary.checked++;
      const events = items[r.tracking_number as string] || [];
      const eventInserts = events.map((ev) => ({
        request_id: r.id,
        tracking_number: r.tracking_number,
        carrier: "thailand_post",
        event_code: ev.status || null,
        event_description: ev.status_description || null,
        event_at: ev.status_date ? new Date(ev.status_date).toISOString() : null,
        raw: ev as unknown as Record<string, unknown>,
      }));
      if (eventInserts.length) {
        await supa.from("selftest_tracking_events").insert(eventInserts);
        summary.events_logged += eventInserts.length;
      }
      // Detect delivered status
      const deliveredEv = events.find((e) => /delivered|นำจ่ายสำเร็จ|ส่งสำเร็จ/i.test(e.status_description || ""));
      const update: Record<string, unknown> = {
        last_tracking_check_at: nowIso,
        tracking_carrier: "thailand_post",
      };
      if (deliveredEv) {
        update.status = "delivered";
        update.delivered_at = deliveredEv.status_date
          ? new Date(deliveredEv.status_date).toISOString()
          : nowIso;
        summary.updated_to_delivered++;
      }
      const { error: upErr } = await supa
        .from("hiv_selftest_requests")
        .update(update)
        .eq("id", r.id);
      if (upErr) summary.errors++;
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[poll-tp]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
