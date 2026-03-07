import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Provider abstraction — currently supports Twilio; easy to add Vonage
interface SmsProvider {
  name: string;
  send(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

function createTwilioProvider(): SmsProvider | null {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) return null;

  return {
    name: "twilio",
    async send(to: string, body: string) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, messageId: data.sid };
      }
      return { success: false, error: data.message || `HTTP ${res.status}` };
    },
  };
}

function getProvider(): SmsProvider | null {
  return createTwilioProvider();
}

// Normalize Thai phone number to E.164
function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (/^0[0-9]{8,9}$/.test(cleaned)) {
    return "+66" + cleaned.slice(1);
  }
  if (/^\+[0-9]{10,14}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Hash phone for abuse tracking
async function hashPhone(phone: string): Promise<string> {
  const data = new TextEncoder().encode(phone);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleData;

    const body = await req.json();
    const { invite_id, phone, language: lang = "th", is_test_mode = false } = body;

    if (!invite_id || !phone) {
      throw new Error("invite_id and phone are required");
    }

    if (is_test_mode && !isAdmin) {
      throw new Error("Test mode is admin-only");
    }

    // Normalize
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      throw new Error("Invalid phone number format");
    }

    const phoneHash = await hashPhone(normalizedPhone);

    // Verify invite belongs to user
    const { data: invite } = await supabase
      .from("partner_invites")
      .select("id, code, created_by")
      .eq("id", invite_id)
      .eq("created_by", user.id)
      .maybeSingle();
    if (!invite) throw new Error("Invite not found");

    // Cooldown check (non-admin only)
    if (!isAdmin) {
      const { data: recent } = await supabase
        .from("partner_invite_relays")
        .select("id")
        .eq("recipient_hash", phoneHash)
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (recent && recent.length > 0) {
        // Create blocked relay
        await supabase.from("partner_invite_relays").insert({
          invite_id,
          relay_type: "sms",
          recipient_hash: phoneHash,
          relay_status: "blocked",
          block_reason: "cooldown_24h",
          is_test_mode,
        });
        return new Response(JSON.stringify({ error: "relay_cooldown", status: "blocked" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create relay record
    const { data: relay, error: relayErr } = await supabase
      .from("partner_invite_relays")
      .insert({
        invite_id,
        relay_type: "sms",
        recipient_hash: phoneHash,
        relay_status: "pending",
        is_test_mode,
      })
      .select("id")
      .single();
    if (relayErr) throw relayErr;

    // Build SMS body
    const inviteUrl = `https://testd-health.lovable.app/invite/${invite.code}`;
    const smsBody =
      lang === "th"
        ? `มีคนที่ห่วงใยสุขภาพของคุณชวนมาตรวจผ่าน testD\nคุณสามารถนัดตรวจได้แบบส่วนตัวที่นี่: ${inviteUrl}`
        : `Someone who cares about your health invited you to test through testD.\nYou can book privately here: ${inviteUrl}`;

    // Attempt SMS dispatch
    const provider = getProvider();
    if (!provider) {
      // No provider configured — mark as failed with clear reason
      await supabase
        .from("partner_invite_relays")
        .update({
          relay_status: "failed",
          block_reason: "no_provider_configured",
          provider: "none",
          updated_at: new Date().toISOString(),
        })
        .eq("id", relay.id);

      return new Response(
        JSON.stringify({
          relay_id: relay.id,
          status: "failed",
          reason: "no_sms_provider_configured",
          message: "SMS provider not yet configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER secrets to enable.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await provider.send(normalizedPhone, smsBody);

    await supabase
      .from("partner_invite_relays")
      .update({
        relay_status: result.success ? "sent" : "failed",
        provider: provider.name,
        provider_message_id: result.messageId || null,
        block_reason: result.error || null,
        metadata: { phone_prefix: normalizedPhone.slice(0, 5), lang },
        updated_at: new Date().toISOString(),
      })
      .eq("id", relay.id);

    // Record event
    await supabase.from("partner_invite_events").insert({
      invite_id,
      visitor_session_id: `sms-relay-${relay.id}`,
      event_type: result.success ? "sms_sent" : "sms_failed",
      is_test_mode,
    });

    return new Response(
      JSON.stringify({
        relay_id: relay.id,
        status: result.success ? "sent" : "failed",
        provider: provider.name,
        message_id: result.messageId,
        error: result.error,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-partner-sms error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
