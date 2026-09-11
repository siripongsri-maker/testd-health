// Daily job: poll the Thailand Post Track & Trace API for shipped self-test kits,
// update the delivery stage, store raw events, and web-push the requester when the
// stage changes. No-ops gracefully when THAILAND_POST_API_KEY is not configured.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

const TP_TOKEN_URL = "https://trackapi.thailandpost.co.th/post/api/v1/authenticate/token";
const TP_TRACK_URL = "https://trackapi.thailandpost.co.th/post/api/v1/track";

const POLL_STATUSES = ["shipped", "confirmed", "approved"];
// Keep a single run short enough to answer within the platform request timeout;
// the 15-minute cron drains the rest of the queue over subsequent runs.
const MAX_ROWS = 200;
const BATCH = 100;
// The carrier quota is limited, so ignore parcels older than this.
const RECENT_DAYS = 45;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
    // The API returns { expire, token: "<jwt>" }; older docs show token.access_token.
    if (typeof j?.token === "string") return j.token;
    return j?.token?.access_token || j?.access_token || null;
  } catch (e) {
    console.error("[tp] token err", e);
    return null;
  }
}

// Thailand Post returns "DD/MM/YYYY HH:mm:ss+07:00" with a Buddhist-era year.
function parseTpDate(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})([+-]\d{2}:\d{2})?$/);
  if (m) {
    const year = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]);
    const iso = `${year}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}${m[7] ?? "+07:00"}`;
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface TpItem {
  status?: string;
  status_description?: string;
  status_date?: string;
}

type TrackOutcome =
  | { kind: "ok"; items: Record<string, TpItem[]> }
  | { kind: "auth_failed" }
  | { kind: "quota" };

async function trackBatch(token: string, barcodes: string[]): Promise<TrackOutcome> {
  const r = await fetch(TP_TRACK_URL, {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "all", language: "TH", barcode: barcodes }),
  });
  if (!r.ok) {
    console.error("[tp] track fail", r.status, (await r.text()).slice(0, 200));
    // 401/403 mean the credential is bad — stop the whole run instead of retrying every batch.
    if (r.status === 401 || r.status === 403) return { kind: "auth_failed" };
    return { kind: "ok", items: {} };
  }
  const j = await r.json();
  // The API answers 200 with {"status":false,"message":"blocked, your request over quota!!"}
  if (j?.status === false || /quota/i.test(String(j?.message ?? ""))) {
    console.error("[tp] quota blocked", String(j?.message ?? ""));
    return { kind: "quota" };
  }
  return { kind: "ok", items: j?.response?.items || {} };
}

type Stage = "accepted" | "in_transit" | "out_for_delivery" | "delivered" | "failed";

const STAGE_ORDER: Record<Stage, number> = {
  accepted: 1,
  in_transit: 2,
  out_for_delivery: 3,
  delivered: 4,
  failed: 5,
};

const STAGE_TEXT: Record<Stage, { title: string; body: string }> = {
  accepted: { title: "📦 พัสดุเข้าระบบไปรษณีย์แล้ว", body: "ชุดตรวจของคุณถูกฝากส่งเรียบร้อย" },
  in_transit: { title: "🚚 พัสดุกำลังเดินทาง", body: "ชุดตรวจของคุณอยู่ระหว่างการขนส่ง" },
  out_for_delivery: { title: "🛵 กำลังนำจ่ายวันนี้", body: "เจ้าหน้าที่กำลังนำชุดตรวจไปส่งให้คุณ" },
  delivered: { title: "✅ ส่งถึงมือแล้ว", body: "ชุดตรวจถูกนำจ่ายเรียบร้อย เมื่อตรวจเสร็จอย่าลืมรายงานผล" },
  failed: { title: "⚠️ นำจ่ายไม่สำเร็จ", body: "พัสดุถูกตีกลับหรือนำจ่ายไม่สำเร็จ กรุณาติดต่อเจ้าหน้าที่" },
};

function classify(desc: string, code: string): Stage | null {
  const t = `${desc} ${code}`.toLowerCase();
  if (/ตีกลับ|นำจ่ายไม่สำเร็จ|ส่งคืน|return|undeliver|fail/.test(t)) return "failed";
  if (/นำจ่ายสำเร็จ|ส่งสำเร็จ|จ่ายสำเร็จ|deliver(ed)?\b|delivery success/.test(t)) return "delivered";
  if (/อยู่ระหว่างการนำจ่าย|กำลังนำจ่าย|out for delivery|นำจ่าย/.test(t)) return "out_for_delivery";
  if (/ระหว่างการขนส่ง|ส่งต่อ|ถึงที่ทำการ|ออกจากที่ทำการ|in transit|transit|arrive|depart/.test(t)) {
    return "in_transit";
  }
  if (/รับฝาก|accept|posted/.test(t)) return "accepted";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const CRON_SECRET = Deno.env.get("POST_EVAL_CRON_SECRET");
  const apiKey = Deno.env.get("THAILAND_POST_API_KEY");
  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
  const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@testd.website";

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Authorize: cron secret, or an admin user token (manual run from the console).
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
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
        authorized = !!isAdmin;
      }
    }
  }
  if (!authorized) return json({ error: "forbidden" }, 403);

  if (!apiKey) return json({ ok: true, skipped: "no_api_key" });

  const summary = {
    checked: 0,
    events_logged: 0,
    stage_changed: 0,
    delivered: 0,
    notified: 0,
    errors: 0,
  };

  try {
    const cutoff = new Date(Date.now() - 20 * 3600_000).toISOString();
    // The carrier API has a daily barcode quota, so only poll parcels that are
    // recent and not finished yet.
    const recent = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
    const { data: allRows, error } = await admin
      .from("hiv_selftest_requests")
      .select("id, user_id, tracking_number, status, tracking_stage, last_tracking_check_at")
      .in("status", POLL_STATUSES)
      .not("tracking_number", "is", null)
      // 13-char Thailand Post barcodes only (2 letters + 9 digits + TH)
      .ilike("tracking_number", "___________TH")
      .gte("created_at", recent)
      .or("tracking_stage.is.null,tracking_stage.in.(accepted,in_transit,out_for_delivery)")
      .or(`last_tracking_check_at.is.null,last_tracking_check_at.lt.${cutoff}`)
      .order("last_tracking_check_at", { ascending: true, nullsFirst: true })
      .limit(MAX_ROWS);
    if (error) throw error;
    // Only real Thailand Post barcodes (2 letters + 9 digits + TH); staff sometimes
    // type placeholders like "sidebkk" that the API rejects.
    const rows = (allRows ?? []).filter((r) =>
      /^[A-Z]{2}\d{9}TH$/i.test(String(r.tracking_number ?? "").trim())
    );
    if (!rows.length) return json({ ok: true, summary });

    // Some accounts hand out a long-lived access token instead of an API key;
    // fall back to using the stored value directly if the auth call is rejected.
    const token = (await getTpAccessToken(apiKey)) ?? apiKey;

    const pushReady = !!VAPID_PUBLIC_KEY && !!VAPID_PRIVATE_KEY;
    if (pushReady) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);

    const nowIso = new Date().toISOString();

    const deadline = Date.now() + 50_000;
    const barcode = (r: { tracking_number: string | null }) =>
      String(r.tracking_number ?? "").trim().toUpperCase();

    type Row = typeof rows[number];

    const processRow = async (r: Row, items: Record<string, TpItem[]>) => {
      summary.checked++;
      const events = items[barcode(r)] || [];

      if (events.length) {
        const inserts = events.map((ev) => ({
          request_id: r.id,
          tracking_number: r.tracking_number,
          carrier: "thailand_post",
          event_code: ev.status || null,
          event_description: ev.status_description || null,
          event_at: parseTpDate(ev.status_date),
          raw: ev as unknown as Record<string, unknown>,
        }));
        const { error: insErr } = await admin
          .from("selftest_tracking_events")
          .upsert(inserts, {
            onConflict: "request_id,tracking_number,event_code,event_at",
            ignoreDuplicates: true,
          });
        if (!insErr) summary.events_logged += inserts.length;
      }

      // Newest classified stage wins.
      let stage: Stage | null = null;
      let stageAt: string | null = null;
      for (const ev of events) {
        const s = classify(ev.status_description || "", ev.status || "");
        if (!s) continue;
        if (!stage || STAGE_ORDER[s] >= STAGE_ORDER[stage]) {
          stage = s;
          stageAt = parseTpDate(ev.status_date) ?? nowIso;
        }
      }

      const update: Record<string, unknown> = {
        last_tracking_check_at: nowIso,
        tracking_carrier: "thailand_post",
      };

      const changed = !!stage && stage !== r.tracking_stage;
      if (stage) {
        update.tracking_stage = stage;
        update.tracking_stage_at = stageAt ?? nowIso;
        if (stage === "delivered") {
          update.status = "delivered";
          update.delivered_at = stageAt ?? nowIso;
          summary.delivered++;
        }
      }

      const { error: upErr } = await admin
        .from("hiv_selftest_requests")
        .update(update)
        .eq("id", r.id);
      if (upErr) {
        summary.errors++;
        return;
      }
      if (!changed) return;
      summary.stage_changed++;

      // Notify the requester (web push only; anonymous requests have no user_id).
      if (!pushReady || !r.user_id) return;
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", r.user_id);
      if (!subs?.length) return;

      const text = STAGE_TEXT[stage as Stage];
      const payload = JSON.stringify({
        title: text.title,
        body: `${text.body} • เลขพัสดุ ${r.tracking_number}`,
        url: "/kit-status",
        tag: `kit-${r.id}-${stage}`,
      });

      let delivered = 0;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          delivered++;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
      if (delivered > 0) summary.notified++;
    };

    for (let i = 0; i < rows.length; i += BATCH) {
      if (Date.now() > deadline) break;
      const slice = rows.slice(i, i + BATCH);
      const outcome = await trackBatch(token, slice.map(barcode));
      if (outcome.kind === "auth_failed") {
        return json({ ok: false, error: "tp_auth_failed", summary }, 502);
      }
      // Daily barcode quota is exhausted; stop and let the next run continue.
      if (outcome.kind === "quota") return json({ ok: true, quota_blocked: true, summary });

      // Run row updates with bounded concurrency to stay inside the request budget.
      const CONCURRENCY = 10;
      for (let j = 0; j < slice.length; j += CONCURRENCY) {
        await Promise.all(
          slice.slice(j, j + CONCURRENCY).map((r) => processRow(r, outcome.items)),
        );
      }
    }

    return json({ ok: true, summary });
  } catch (e) {
    console.error("[poll-tp]", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
