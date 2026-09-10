// Sends web-push appointment reminders:
//  - "day_before": the evening (19:00 Asia/Bangkok) before the appointment
//  - "hour_before": roughly one hour before the appointment start time
// Triggered by a scheduled job (x-cron-secret header) or manually by an admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

function bkkNow() {
  return new Date(Date.now() + BKK_OFFSET_MS);
}

function bkkDateString(offsetDays = 0) {
  return new Date(Date.now() + BKK_OFFSET_MS + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
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
    const CRON_SECRET = Deno.env.get("POST_EVAL_CRON_SECRET");
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@testd.website";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    let authorized = !!CRON_SECRET && req.headers.get("x-cron-secret") === CRON_SECRET;
    if (!authorized) {
      const authHeader = req.headers.get("Authorization") || "";
      if (authHeader.startsWith("Bearer ")) {
        const userClient = createClient(SUPABASE_URL, ANON, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const { data: isAdmin } = await admin.rpc("has_role", {
            _user_id: user.id,
            _role: "admin",
          });
          authorized = !!isAdmin;
        }
      }
    }
    if (!authorized) return json({ error: "forbidden" }, 403);
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({ error: "vapid_not_configured" }, 500);

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const now = bkkNow();
    const hour = now.getUTCHours();
    const today = bkkDateString(0);
    const tomorrow = bkkDateString(1);

    type Target = { id: string; user_id: string | null; kind: string; date: string; time: string };
    const targets: Target[] = [];

    // 1) Evening-before reminders — only in the 19:00–20:59 Bangkok window.
    if (hour >= 19 && hour < 21) {
      const { data } = await admin
        .from("appointments")
        .select("id, user_id, appointment_date, start_time, status")
        .eq("appointment_date", tomorrow)
        .in("status", ["booked", "confirmed"])
        .not("user_id", "is", null);
      for (const a of data ?? []) {
        targets.push({
          id: a.id,
          user_id: a.user_id,
          kind: "day_before",
          date: a.appointment_date,
          time: a.start_time,
        });
      }
    }

    // 2) One-hour-before reminders for appointments starting in 45–75 minutes.
    {
      const { data } = await admin
        .from("appointments")
        .select("id, user_id, appointment_date, start_time, status")
        .eq("appointment_date", today)
        .in("status", ["booked", "confirmed"])
        .not("user_id", "is", null);
      const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      for (const a of data ?? []) {
        const [h, m] = String(a.start_time).split(":").map(Number);
        const diff = h * 60 + m - nowMinutes;
        if (diff >= 45 && diff <= 75) {
          targets.push({
            id: a.id,
            user_id: a.user_id,
            kind: "hour_before",
            date: a.appointment_date,
            time: a.start_time,
          });
        }
      }
    }

    let sent = 0, skipped = 0, failed = 0;

    for (const t of targets) {
      // Dedupe: one reminder per appointment per kind.
      const { error: claimError } = await admin
        .from("appointment_reminder_sends")
        .insert({ appointment_id: t.id, kind: t.kind, channel: "push" });
      if (claimError) {
        skipped++;
        continue;
      }

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", t.user_id!);

      if (!subs?.length) {
        skipped++;
        continue;
      }

      const hhmm = String(t.time).slice(0, 5);
      const payload = JSON.stringify({
        title: t.kind === "day_before" ? "📋 พรุ่งนี้มีนัดที่คลินิก" : "⏰ อีก 1 ชั่วโมงถึงเวลานัด",
        body: `เวลา ${hhmm} น. • บัตรประชาชน (ตัวจริง) • ถุงสำหรับใส่ยากลับบ้าน`,
        url: "/my-appointments",
        tag: `apt-${t.kind}-${t.id}`,
      });

      let delivered = 0;
      let lastError: string | null = null;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          delivered++;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          lastError = err instanceof Error ? err.message : String(err);
          // Endpoint gone — drop the dead subscription.
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      await admin
        .from("appointment_reminder_sends")
        .update({ delivered, error_message: lastError?.slice(0, 300) ?? null })
        .eq("appointment_id", t.id)
        .eq("kind", t.kind)
        .eq("channel", "push");

      delivered > 0 ? sent++ : failed++;
    }

    return json({ ok: true, considered: targets.length, sent, skipped, failed });
  } catch (err) {
    console.error("APPOINTMENT_REMINDERS_ERROR", err);
    return json({ error: "server_error" }, 500);
  }
});
