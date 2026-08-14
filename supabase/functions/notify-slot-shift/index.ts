// One-off / repeatable maintenance job: cancel appointments that fall outside the new
// closing-hour rules and tell the client they can still walk in, but 20 minutes earlier.
// Auth: staff/admin JWT, or the ADMIN_TASK_KEY header for scripted maintenance runs.
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

function minus20(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m - 20;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // --- Auth: maintenance key or staff/admin session ---
    const taskKey = Deno.env.get("ADMIN_TASK_KEY") || "";
    const providedKey = req.headers.get("x-admin-task-key") || "";
    let actorId: string | null = null;

    if (!(taskKey && providedKey && providedKey === taskKey)) {
      const authHeader = req.headers.get("Authorization") || "";
      const userClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      const { data: staff } = await admin
        .from("staff_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
      if (!isAdmin && !staff) return json({ error: "forbidden" }, 403);
      actorId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    // --- Branches + their new last bookable time ---
    const { data: branches } = await admin
      .from("booking_branches").select("id, name_th, close_time");
    const cutoffs = new Map<string, { name: string; cutoff: string }>();
    for (const b of (branches || []) as any[]) {
      const close = String(b.close_time || "").slice(0, 5);
      // Slots at or after this time no longer exist under the new closing rules.
      const cutoff = close === "20:00" ? "19:00" : close === "18:00" ? "17:00" : null;
      if (cutoff) cutoffs.set(b.id, { name: b.name_th || "SWING Service Point", cutoff });
    }

    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: appts, error: apptErr } = await admin
      .from("appointments")
      .select("id, user_id, branch_id, appointment_date, start_time, status, contact_email, contact_phone")
      .gte("appointment_date", today)
      .in("status", ACTIVE_STATUSES);
    if (apptErr) return json({ error: "query_failed", details: apptErr.message }, 500);

    const targets = (appts || []).filter((a: any) => {
      const c = cutoffs.get(a.branch_id);
      return c ? String(a.start_time).slice(0, 5) >= c.cutoff : false;
    });

    if (dryRun) {
      return json({ dry_run: true, total: targets.length, targets: targets.map((a: any) => ({
        id: a.id, date: a.appointment_date, time: String(a.start_time).slice(0, 5),
        branch: cutoffs.get(a.branch_id)?.name,
      })) });
    }

    const API_KEY = Deno.env.get("SMSMKT_API_KEY");
    const SECRET_KEY = Deno.env.get("SMSMKT_SECRET_KEY");
    const SENDER = Deno.env.get("SMSMKT_SENDER");
    const smsReady = Boolean(API_KEY && SECRET_KEY && SENDER);

    const results = { cancelled: 0, email: 0, sms: 0, inapp: 0, failed: [] as any[] };

    for (const a of targets as any[]) {
      const bName = cutoffs.get(a.branch_id)?.name || "SWING Service Point";
      const time = String(a.start_time || "").slice(0, 5);
      const dateTh = thaiDate(a.appointment_date);
      const arriveBy = minus20(time);

      const noteTitle = "ปรับเวลาให้บริการ — คิวรอบสุดท้ายถูกยกเลิก";
      const noteReason =
        `คิวเวลา ${time} น. ถูกยกเลิกเนื่องจากคลินิกปรับเวลาปิดบริการ ` +
        `แต่คุณยังมารับบริการในวันเดิมได้ตามปกติ รบกวนมาก่อนเวลานัดเดิม 20 นาที (ประมาณ ${arriveBy} น.) ` +
        `สอบถามเพิ่มเติม โทร 02 632 9501`;

      // 1) Cancel the slot
      const { error: cancelErr } = await admin
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "ปรับเวลาปิดบริการ — ยกเลิกคิวรอบสุดท้าย (ยังมารับบริการได้ โดยมาก่อน 20 นาที)",
        })
        .eq("id", a.id);
      if (cancelErr) {
        results.failed.push({ id: a.id, channel: "cancel", error: cancelErr.message });
        continue;
      }
      results.cancelled++;
      await admin.from("appointment_logs").insert({
        appointment_id: a.id,
        action: "cancelled",
        performed_by: actorId,
        details: noteReason,
      });

      let infoUrl = `${APP_BASE_URL}/my-appointments`;
      if (!a.user_id) {
        const { data: token } = await admin.rpc("generate_guest_access_token", { p_appointment_id: a.id });
        infoUrl = token ? `${APP_BASE_URL}/guest-appointments?token=${token}` : `${APP_BASE_URL}/booking`;
      }

      // 2) Email
      if (a.contact_email) {
        try {
          const { error } = await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "appointment-closure-notice",
              recipientEmail: a.contact_email,
              idempotencyKey: `slotshift-${a.appointment_date}-${a.id}`,
              templateData: {
                branchName: bName,
                appointmentDate: dateTh,
                appointmentTime: time,
                closureTitle: noteTitle,
                closureReason: noteReason,
                rescheduleUrl: infoUrl,
              },
            },
          });
          if (error) throw error;
          results.email++;
        } catch (e) {
          results.failed.push({ id: a.id, channel: "email", error: String(e) });
        }
      }

      // 3) SMS
      if (smsReady && a.contact_phone) {
        const phone = normalizeThaiPhone(a.contact_phone);
        if (phone) {
          const message =
            `testD: ${bName} ปรับเวลาปิดบริการ คิว ${time} น. วันที่ ${dateTh} ถูกยกเลิก ` +
            `แต่ยังมารับบริการได้ รบกวนมาก่อน 20 นาที (${arriveBy} น.) สอบถาม 026329501`;
          let status = "failed", httpStatus = 0, providerId: string | null = null, errMsg: string | null = null;
          try {
            const res = await fetch(SMSMKT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "api_key": API_KEY!, "secret_key": SECRET_KEY! },
              body: JSON.stringify({ sender: SENDER, phone, message }),
            });
            httpStatus = res.status;
            const payload = await res.json().catch(() => ({}));
            if (res.ok && (payload?.code === "000" || payload?.code === "000000" || payload?.status === "success")) {
              status = "sent";
              providerId = payload?.result?.transaction_id ?? payload?.detail?.[0]?.transaction_id ?? null;
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
            template_key: "appointment-slot-shift",
            template_label: "แจ้งยกเลิกคิวรอบสุดท้าย / มาก่อน 20 นาที",
            message,
            sender: SENDER,
            status,
            sms_provider_id: providerId,
            http_status: httpStatus,
            error_message: errMsg,
            sent_by: actorId,
            original_url: infoUrl,
          });
        }
      }

      // 4) In-app
      if (a.user_id) {
        const { error } = await admin.from("notifications").insert({
          user_id: a.user_id,
          appointment_id: a.id,
          type: "appointment_closure",
          title: noteTitle,
          message: `${bName} — ${dateTh} ${time} น. ${noteReason}`,
        });
        if (!error) results.inapp++;
      }
    }

    return json({ ok: true, ...results });
  } catch (e) {
    return json({ error: "unexpected", details: String(e) }, 500);
  }
});
