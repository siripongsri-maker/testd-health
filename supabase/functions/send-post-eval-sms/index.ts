// Send the post-counseling evaluation magic link by SMS.
// Uses the project's existing SMSMKT provider and logs every attempt to
// post_eval_sms_dispatches (phone is never stored in clear text).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SMSMKT_URL = "https://portal-otp.smsmkt.com/api/send-message";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://testd.website").replace(/\/+$/, "");

function normalizeThaiPhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return "66" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("66")) return digits;
  if (digits.length === 9) return "66" + digits;
  return null;
}

async function sha256Hex(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const API_KEY = Deno.env.get("SMSMKT_API_KEY");
    const SECRET_KEY = Deno.env.get("SMSMKT_SECRET_KEY");
    const SENDER = Deno.env.get("SMSMKT_SENDER");
    if (!API_KEY || !SECRET_KEY || !SENDER) return json({ error: "sms_not_configured" }, 500);

    // Staff-only: validate the caller's JWT in code
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: staff } = await admin
      .from("staff_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    const { data: counselor } = await admin
      .from("counselor_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (!isAdmin && !staff && !counselor) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => null);
    const noteId = typeof body?.note_id === "string" ? body.note_id : "";
    const phone = normalizeThaiPhone(String(body?.phone || ""));
    if (!noteId || !phone) return json({ error: "invalid_request" }, 400);

    const { data: note } = await admin
      .from("pre_service_counseling_notes")
      .select("id, branch_id, post_eval_token")
      .eq("id", noteId)
      .maybeSingle();
    if (!note) return json({ error: "note_not_found" }, 404);

    let token = note.post_eval_token as string | null;
    if (!token) {
      token = crypto.randomUUID();
      const { error: tokErr } = await admin
        .from("pre_service_counseling_notes")
        .update({ post_eval_token: token })
        .eq("id", noteId);
      if (tokErr) return json({ error: "token_failed", details: tokErr.message }, 500);
    }

    const link = `${APP_BASE_URL}/post-counseling/${token}`;
    const message = String(body?.message || "").trim() ||
      `testD: ขอบคุณที่มารับบริการ ช่วยประเมิน 1 นาที รับค่าเดินทาง 200 บาท ${link}`;

    const phoneHash = await sha256Hex(phone);
    const { data: dispatch } = await admin
      .from("post_eval_sms_dispatches")
      .insert({
        note_id: noteId,
        branch_id: note.branch_id,
        phone_last4: phone.slice(-4),
        phone_hash: phoneHash,
        status: "queued",
        sent_by: user.id,
      })
      .select("id")
      .single();

    const resp = await fetch(SMSMKT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", api_key: API_KEY, secret_key: SECRET_KEY },
      body: JSON.stringify({ message, phone, sender: SENDER }),
    });
    const data = await resp.json().catch(() => ({}));
    const code = data?.code != null ? String(data.code) : null;
    const ok = resp.ok && (code === "000" || code === "0" ||
      String(data?.status || "").toLowerCase() === "success" || data?.success === true);

    if (dispatch?.id) {
      await admin.from("post_eval_sms_dispatches").update({
        status: ok ? "sent" : "failed",
        provider_message_id: data?.message_id ?? data?.transaction_id ?? null,
        error_message: ok ? null : JSON.stringify(data).slice(0, 300),
        sent_at: ok ? new Date().toISOString() : null,
      }).eq("id", dispatch.id);
    }

    if (!ok) {
      console.error("POST_EVAL_SMS_FAILED", resp.status, JSON.stringify(data).slice(0, 300));
      return json({ error: "sms_failed", status: resp.status, details: data }, 502);
    }

    return json({ ok: true, link });
  } catch (err) {
    console.error("POST_EVAL_SMS_ERROR", err);
    return json({ error: "server_error" }, 500);
  }
});
