import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Provider Abstraction ─────────────────────────────────────────────────────
interface SmsProvider {
  name: string;
  send(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  diagnostics(): Record<string, unknown>;
}

// ─── Twilio Provider ──────────────────────────────────────────────────────────
function createTwilioProvider(): SmsProvider | null {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  if (!accountSid) return null;

  // Auth: prefer API Key if set, otherwise Account SID + Auth Token
  const apiKey = Deno.env.get("TWILIO_API_KEY");
  const apiSecret = Deno.env.get("TWILIO_API_SECRET");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  let authUser: string;
  let authPass: string;
  let authMode: string;

  if (apiKey && apiSecret) {
    authUser = apiKey;
    authPass = apiSecret;
    authMode = "api_key";
  } else if (authToken) {
    authUser = accountSid;
    authPass = authToken;
    authMode = "account_sid_auth_token";
  } else {
    return null; // no valid auth
  }

  // Send mode: prefer Messaging Service SID, fallback to From number
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!messagingServiceSid && !fromNumber) return null; // need at least one sender

  const sendMode = messagingServiceSid ? "messaging_service" : "from_number";
  const senderId = messagingServiceSid || fromNumber!;

  return {
    name: "twilio",

    async send(to: string, body: string) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

      const params: Record<string, string> = { To: to, Body: body };
      if (messagingServiceSid) {
        params.MessagingServiceSid = messagingServiceSid;
      } else {
        params.From = fromNumber!;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${authUser}:${authPass}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params),
      });

      const data = await res.json();

      if (res.ok) {
        return { success: true, messageId: data.sid };
      }

      return {
        success: false,
        error: data.message || data.error_message || `HTTP ${res.status}: ${data.code}`,
      };
    },

    diagnostics() {
      return {
        configured: true,
        auth_mode: authMode,
        send_mode: sendMode,
        sender_id: sendMode === "messaging_service"
          ? `MSID:${messagingServiceSid!.slice(0, 6)}...`
          : fromNumber!,
        account_sid_prefix: accountSid.slice(0, 6) + "...",
      };
    },
  };
}

// ─── Provider Registry (add Vonage, etc. here later) ──────────────────────────
function getProvider(): SmsProvider | null {
  return createTwilioProvider();
}

function getProviderDiagnostics(): Record<string, unknown> {
  const provider = createTwilioProvider();
  if (provider) return provider.diagnostics();

  // Show which secrets are missing
  const missing: string[] = [];
  if (!Deno.env.get("TWILIO_ACCOUNT_SID")) missing.push("TWILIO_ACCOUNT_SID");
  const hasApiKey = !!(Deno.env.get("TWILIO_API_KEY") && Deno.env.get("TWILIO_API_SECRET"));
  const hasAuthToken = !!Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!hasApiKey && !hasAuthToken) missing.push("TWILIO_AUTH_TOKEN (or TWILIO_API_KEY + TWILIO_API_SECRET)");
  const hasSender = !!(Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || Deno.env.get("TWILIO_FROM_NUMBER"));
  if (!hasSender) missing.push("TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID)");

  return { configured: false, missing_secrets: missing };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (/^0[0-9]{8,9}$/.test(cleaned)) return "+66" + cleaned.slice(1);
  if (/^\+[0-9]{10,14}$/.test(cleaned)) return cleaned;
  return null;
}

async function hashPhone(phone: string): Promise<string> {
  const data = new TextEncoder().encode(phone);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
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

    // ── ACTION: provider_diagnostics (admin only) ─────────────────────────────
    if (body.action === "provider_diagnostics") {
      if (!isAdmin) return json({ error: "admin_required" }, 403);

      const provider = getProvider();
      const diag = getProviderDiagnostics();

      // Get last relay attempt
      const { data: lastRelay } = await supabase
        .from("partner_invite_relays")
        .select("relay_status, provider, provider_message_id, block_reason, created_at, is_test_mode")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return json({
        provider_configured: !!provider,
        provider_name: provider?.name ?? null,
        twilio: diag,
        last_relay: lastRelay || null,
      });
    }

    // ── ACTION: admin_test_sms (admin only) ───────────────────────────────────
    if (body.action === "admin_test_sms") {
      if (!isAdmin) return json({ error: "admin_required" }, 403);

      const { test_phone, test_message } = body;
      if (!test_phone) return json({ error: "test_phone required" }, 400);

      const normalizedPhone = normalizePhone(test_phone);
      if (!normalizedPhone) return json({ error: "Invalid phone number format" }, 400);

      const provider = getProvider();
      if (!provider) {
        return json({
          status: "failed",
          reason: "no_provider_configured",
          twilio: getProviderDiagnostics(),
        });
      }

      const smsBody = test_message || `[testD admin test] SMS provider is working. Sent at ${new Date().toISOString()}`;
      const result = await provider.send(normalizedPhone, smsBody);

      // Log as test relay
      await supabase.from("partner_invite_relays").insert({
        invite_id: body.invite_id || null,
        relay_type: "sms",
        recipient_hash: await hashPhone(normalizedPhone),
        relay_status: result.success ? "sent" : "failed",
        provider: provider.name,
        provider_message_id: result.messageId || null,
        block_reason: result.error || null,
        is_test_mode: true,
        metadata: { admin_test: true, phone_prefix: normalizedPhone.slice(0, 5) },
      });

      return json({
        status: result.success ? "sent" : "failed",
        provider: provider.name,
        message_id: result.messageId,
        error: result.error,
      });
    }

    // ── Standard SMS send flow ────────────────────────────────────────────────
    const { invite_id, phone, language: lang = "th", is_test_mode = false } = body;

    if (!invite_id || !phone) throw new Error("invite_id and phone are required");
    if (is_test_mode && !isAdmin) throw new Error("Test mode is admin-only");

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) throw new Error("Invalid phone number format");

    const phoneHash = await hashPhone(normalizedPhone);

    // Verify invite belongs to user
    const { data: invite } = await supabase
      .from("partner_invites")
      .select("id, code, created_by")
      .eq("id", invite_id)
      .eq("created_by", user.id)
      .maybeSingle();
    if (!invite) throw new Error("Invite not found");

    // === CREDIT CHECK (skip for admin test mode) ===
    let creditDeducted = false;
    if (!isAdmin || !is_test_mode) {
      const { data: balanceData } = await supabase
        .from("sms_credit_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentBalance = balanceData?.balance ?? 0;
      if (currentBalance < 1) {
        return json({ error: "insufficient_credits", status: "blocked", balance: 0 }, 402);
      }
    }

    // Cooldown check (non-admin only)
    if (!isAdmin) {
      const { data: recent } = await supabase
        .from("partner_invite_relays")
        .select("id")
        .eq("recipient_hash", phoneHash)
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (recent && recent.length > 0) {
        await supabase.from("partner_invite_relays").insert({
          invite_id,
          relay_type: "sms",
          recipient_hash: phoneHash,
          relay_status: "blocked",
          block_reason: "cooldown_24h",
          is_test_mode,
        });
        return json({ error: "relay_cooldown", status: "blocked" }, 429);
      }
    }

    // === DEDUCT CREDIT before dispatch (skip for admin test mode) ===
    let relayId: string;
    if (!isAdmin || !is_test_mode) {
      const { error: deductErr } = await supabase.rpc("deduct_sms_credit", {
        p_user_id: user.id,
        p_relay_id: null,
      });
      if (deductErr) {
        if (deductErr.message?.includes("insufficient_sms_credits")) {
          return json({ error: "insufficient_credits", status: "blocked", balance: 0 }, 402);
        }
        throw deductErr;
      }
      creditDeducted = true;
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
    relayId = relay.id;

    // Update the transaction with relay_id if we deducted
    if (creditDeducted) {
      await supabase
        .from("sms_credit_transactions")
        .update({ relay_id: relayId })
        .eq("user_id", user.id)
        .eq("transaction_type", "deduct")
        .is("relay_id", null)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    // Build SMS body — never include inviter identity
    const inviteUrl = `https://testd-health.lovable.app/invite/${invite.code}`;
    const smsBody =
      lang === "th"
        ? `มีคนที่ห่วงใยสุขภาพของคุณชวนมาตรวจผ่าน testD\nคุณสามารถนัดตรวจได้แบบส่วนตัวที่นี่: ${inviteUrl}`
        : `Someone who cares about your health invited you to test through testD.\nYou can book privately here: ${inviteUrl}`;

    // Attempt SMS dispatch
    const provider = getProvider();
    if (!provider) {
      if (creditDeducted) {
        await supabase.rpc("refund_sms_credit", {
          p_user_id: user.id,
          p_relay_id: relayId,
          p_reason: "no_provider_configured",
        });
      }
      await supabase
        .from("partner_invite_relays")
        .update({
          relay_status: "failed",
          block_reason: "no_provider_configured",
          provider: "none",
          updated_at: new Date().toISOString(),
        })
        .eq("id", relayId);

      const { data: balData } = await supabase
        .from("sms_credit_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      return json({
        relay_id: relayId,
        status: "failed",
        reason: "no_sms_provider_configured",
        message: "SMS provider not yet configured. Credit has been refunded.",
        credit_refunded: creditDeducted,
        balance: balData?.balance ?? 0,
      });
    }

    const result = await provider.send(normalizedPhone, smsBody);

    // If provider rejected before acceptance, refund
    if (!result.success && creditDeducted) {
      await supabase.rpc("refund_sms_credit", {
        p_user_id: user.id,
        p_relay_id: relayId,
        p_reason: "provider_send_failed",
      });
    }

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
      .eq("id", relayId);

    // Record event
    await supabase.from("partner_invite_events").insert({
      invite_id,
      visitor_session_id: `sms-relay-${relayId}`,
      event_type: result.success ? "sms_sent" : "sms_failed",
      is_test_mode,
    });

    // Get final balance
    const { data: finalBal } = await supabase
      .from("sms_credit_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    return json({
      relay_id: relayId,
      status: result.success ? "sent" : "failed",
      provider: provider.name,
      message_id: result.messageId,
      error: result.error,
      credit_used: result.success && creditDeducted,
      credit_refunded: !result.success && creditDeducted,
      balance: finalBal?.balance ?? 0,
    });
  } catch (err) {
    console.error("send-partner-sms error:", err);
    return json({ error: (err as Error).message }, 400);
  }
});
