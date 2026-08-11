// Notify all clients booked on a closed (blackout) day via email, SMS and in-app notification.
// Staff/admin only. Includes a reschedule link (guest token link for anonymous bookings).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SMSMKT_URL = "https://portal-otp.smsmkt.com/api/send-message";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://testd.website").replace(/\/+$/, "");
const ACTIVE_STATUSES = ["booked", "confirmed", "pending", "rescheduled"];

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeThaiPhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return "66" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("66")) return digits;
  return null;
}

function maskPhone(raw: string): string {
  const d = (raw || "").replace(/\D/g, "");
  return d.length < 6 ? "xxx" : `${d.slice(0, 3)}xxx${d.slice(-3)}`;
}

function thaiDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T00:00:00+07:00`);
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok",
    }).format(d);
  } catch {
    return dateStr;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Staff-only auth ---
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
    if (!isAdmin && !staff) return json({ error: "forbidden" }, 403);

    // --- Input ---
    const body = await req.json().catch(() => null);
    const date = String(body?.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "invalid_date" }, 400);
    const branchIds: string[] | null = Array.isArray(body?.branch_ids) && body.branch_ids.length
      ? body.branch_ids.map(String) : null;
    const dryRun = body?.dry_run === true;
    const closureTitle = String(body?.title || "ปิดทำการ").slice(0, 160);
    const closureReason = String(body?.reason || "").slice(0, 500);
    const channels = {
      email: body?.channels?.email !== false,
      sms: body?.channels?.sms !== false,
      inapp: body?.channels?.inapp !== false,
    };

    // --- Target appointments ---
    let q = admin
      .from("appointments")
      .select("id, user_id, branch_id, appointment_date, start_time, status, contact_email, contact_phone")
      .eq("appointment_date", date)
      .in("status", ACTIVE_STATUSES);
    if (branchIds) q = q.in("branch_id", branchIds);
    const { data: appts, error: apptErr } = await q;
    if (apptErr) return json({ error: "query_failed", details: apptErr.message }, 500);

    const targets = appts || [];
    const { data: branches } = await admin.from("booking_branches").select("id, name_th, name_en");
    const branchName = (id: string) =>
      branches?.find((b: any) => b.id === id)?.name_th || "SWING Service Point";

    if (dryRun) {
      return json({
        dry_run: true,
        date,
        total: targets.length,
        with_email: targets.filter((a: any) => a.contact_email).length,
        with_phone: targets.filter((a: any) => a.contact_phone).length,
        with_account: targets.filter((a: any) => a.user_id).length,
        by_branch: targets.reduce((acc: Record<string, number>, a: any) => {
          const n = branchName(a.branch_id); acc[n] = (acc[n] || 0) + 1; return acc;
        }, {}),
      });
    }

    const API_KEY = Deno.env.get("SMSMKT_API_KEY");
    const SECRET_KEY = Deno.env.get("SMSMKT_SECRET_KEY");
    const SENDER = Deno.env.get("SMSMKT_SENDER");
    const smsReady = Boolean(API_KEY && SECRET_KEY && SENDER);

    const dateTh = thaiDate(date);
    const results = { email: 0, sms: 0, inapp: 0, failed: [] as any[] };

    for (const a of targets as any[]) {
      const bName = branchName(a.branch_id);
      const time = String(a.start_time || "").slice(0, 5);

      // Reschedule link: account holders -> /my-appointments, guests -> tokenized guest page
      let rescheduleUrl = `${APP_BASE_URL}/my-appointments`;
      if (!a.user_id) {
        const { data: token } = await admin.rpc("generate_guest_access_token", { p_appointment_id: a.id });
        rescheduleUrl = token
          ? `${APP_BASE_URL}/guest-appointments?token=${token}`
          : `${APP_BASE_URL}/guest-appointments`;
      }

      // 1) Email
      if (channels.email && a.contact_email) {
        try {
          const { error } = await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "appointment-closure-notice",
              recipientEmail: a.contact_email,
              idempotencyKey: `closure-${date}-${a.id}`,
              templateData: {
                branchName: bName,
                appointmentDate: dateTh,
                appointmentTime: time,
                closureTitle,
                closureReason,
                rescheduleUrl,
              },
            },
          });
          if (error) throw error;
          results.email++;
        } catch (e) {
          results.failed.push({ id: a.id, channel: "email", error: String(e) });
        }
      }

      // 2) SMS
      if (channels.sms && smsReady && a.contact_phone) {
        const phone = normalizeThaiPhone(a.contact_phone);
        if (phone) {
          const message =
            `testD: ${bName} ปิดทำการ ${dateTh}${time ? ` (นัด ${time} น.)` : ""} ` +
            `ขออภัยในความไม่สะดวก ย้ายวันนัดได้ที่ ${rescheduleUrl}`;
          let status = "failed", httpStatus = 0, providerId: string | null = null, errMsg: string | null = null;
          try {
            const res = await fetch(SMSMKT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "api_key": API_KEY!, "secret_key": SECRET_KEY! },
              body: JSON.stringify({ sender: SENDER, phone, message }),
            });
            httpStatus = res.status;
            const payload = await res.json().catch(() => ({}));
            if (res.ok && (payload?.code === "000000" || payload?.status === "success")) {
              status = "sent";
              providerId = payload?.detail?.[0]?.transaction_id ?? null;
              results.sms++;
            } else {
              errMsg = JSON.stringify(payload).slice(0, 400);
              results.failed.push({ id: a.id, channel: "sms", error: errMsg });
            }
          } catch (e) {
            errMsg = String(e);
            results.failed.push({ id: a.id, channel: "sms", error: errMsg });
          }
          await admin.from("sms_send_log").insert({
            phone: maskPhone(a.contact_phone),
            template_key: "appointment-closure-notice",
            template_label: "แจ้งปิดทำการ / ย้ายวันนัด",
            message,
            sender: SENDER,
            status,
            sms_provider_id: providerId,
            http_status: httpStatus,
            error_message: errMsg,
            sent_by: user.id,
            original_url: rescheduleUrl,
          });
        }
      }

      // 3) In-app notification
      if (channels.inapp && a.user_id) {
        const { error } = await admin.from("notifications").insert({
          title: `แจ้งปิดทำการ ${dateTh}`,
          message:
            `${bName} ปิดทำการวันที่ ${dateTh}${time ? ` (นัดหมายเดิม ${time} น.)` : ""} — ${closureTitle}. ` +
            `กรุณาย้ายวันนัดหมายที่ ${rescheduleUrl}`,
          notification_type: "direct",
          recipient_user_id: a.user_id,
          created_by: user.id,
          expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        });
        if (error) results.failed.push({ id: a.id, channel: "inapp", error: error.message });
        else results.inapp++;
      }

      // Audit trail
      await admin.from("appointment_logs").insert({
        appointment_id: a.id,
        action: "closure_notified",
        performed_by: user.id,
        details: { date, closureTitle, channels },
      }).then(() => {}, () => {});
    }

    return json({ ok: true, date, total: targets.length, ...results });
  } catch (e) {
    console.error("notify-blackout-closure error", e);
    return json({ error: "internal_error", details: String(e) }, 500);
  }
});
