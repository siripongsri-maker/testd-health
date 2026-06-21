// Public kit-order status lookup by order_code (no auth).
// Used by the SMS deep link /track-kit/:code so recipients can see shipment status
// and optionally confirm receipt without signing in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CARRIER_TRACKING_URLS: Record<string, string> = {
  thailand_post: "https://track.thailandpost.co.th/?trackNumber=",
  flash: "https://www.flashexpress.co.th/tracking/?se=",
  kerry: "https://th.kerryexpress.com/th/track/?track=",
  "j&t": "https://www.jtexpress.co.th/index/query/gzquery.html?bills=",
  scg: "https://www.scgexpress.co.th/tracking?tracking_no=",
};

function maskName(name: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  // Show first character, mask rest with •  (privacy-by-default since this endpoint is public)
  const parts = trimmed.split(/\s+/);
  return parts.map((p) => (p.length <= 1 ? p : p[0] + "•".repeat(Math.min(p.length - 1, 3)))).join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    let code = "";
    let action: "lookup" | "confirm_received" = "lookup";

    if (req.method === "GET") {
      const url = new URL(req.url);
      code = (url.searchParams.get("code") || "").trim().toUpperCase();
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      code = String(body?.code || "").trim().toUpperCase();
      action = body?.action === "confirm_received" ? "confirm_received" : "lookup";
    } else {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!code || code.length < 4 || code.length > 32 || !/^[A-Z0-9-]+$/.test(code)) {
      return new Response(JSON.stringify({ error: "invalid_code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error } = await admin
      .from("kit_orders")
      .select(
        "id, order_code, recipient_name, status, shipping_carrier, tracking_number, tracking_url, created_at, packed_at, shipped_at, out_for_delivery_at, delivered_at, received_at",
      )
      .eq("order_code", code)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!order) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional self-service confirm-received from public page
    let confirmed = false;
    if (action === "confirm_received") {
      if (order.status !== "delivered_unconfirmed" && order.status !== "out_for_delivery" && order.status !== "shipped") {
        return new Response(JSON.stringify({ error: "cannot_confirm_in_status", status: order.status }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const nowIso = new Date().toISOString();
      const { error: upErr } = await admin
        .from("kit_orders")
        .update({ status: "received_confirmed", received_at: nowIso })
        .eq("id", order.id);
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("kit_order_events").insert({
        order_id: order.id,
        event_type: "received",
        event_description: "Recipient confirmed receipt via public SMS link",
        is_admin_event: false,
      });
      order.status = "received_confirmed";
      (order as any).received_at = nowIso;
      confirmed = true;
    }

    const carrier = (order.shipping_carrier || "").toLowerCase();
    const carrierUrl = order.tracking_url
      || (carrier && order.tracking_number && CARRIER_TRACKING_URLS[carrier]
        ? CARRIER_TRACKING_URLS[carrier] + order.tracking_number
        : null);

    return new Response(JSON.stringify({
      ok: true,
      confirmed,
      order: {
        order_code: order.order_code,
        recipient_name_masked: maskName(order.recipient_name),
        status: order.status,
        shipping_carrier: order.shipping_carrier,
        tracking_number: order.tracking_number,
        carrier_tracking_url: carrierUrl,
        created_at: order.created_at,
        packed_at: order.packed_at,
        shipped_at: order.shipped_at,
        out_for_delivery_at: order.out_for_delivery_at,
        delivered_at: order.delivered_at,
        received_at: order.received_at,
      },
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[kit-public-status] error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
