// Sends an email to the research lead every time a new submission of the
// "ยกเลิก พ.ร.บ.ค้าประเวณี 2539" survey is completed, with TWO CSV attachments:
//   1) the latest respondent's answers
//   2) the full cumulative dataset for that survey
// Failure to send email must NEVER break the user's submission flow:
// the client calls this function fire-and-forget and we always return 200.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SURVEY_ID = "6e5918db-d70a-4d7d-b978-e6711f2a4779";
const NOTIFY_TO = "adirek.rue@swingth.org";
const FROM_EMAIL =
  Deno.env.get("PREPOST_NOTIFY_FROM") || "testD <onboarding@resend.dev>";

const BOM = "\uFEFF";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const head = headers.map(csvEscape).join(",");
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return BOM + head + "\n" + body + "\n";
}

function fmtBkk(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Bangkok",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// Pull the human-readable answer for a single row from survey_answers
function answerText(
  ans: { answer_text: string | null; answer_options: any; answer_rating: number | null } | undefined,
  question: { options: any; question_type: string },
): string {
  if (!ans) return "";
  // Multiple choice: map selected ids to option text
  if (ans.answer_options && Array.isArray(ans.answer_options) && ans.answer_options.length) {
    const opts = (question.options as Array<{ id: string; text_th?: string; text_en?: string }>) || [];
    const labels = ans.answer_options
      .map((id: string) => {
        const o = opts.find((x) => x.id === id);
        return o?.text_th || o?.text_en || id;
      })
      .join(" | ");
    return labels;
  }
  if (ans.answer_rating !== null && ans.answer_rating !== undefined) {
    return String(ans.answer_rating);
  }
  return ans.answer_text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Always 200 to the client so a notification failure cannot break the submission.
  const ok = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ ok: true, ...extra }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: { response_id?: string };
  try {
    body = await req.json();
  } catch {
    return ok({ skipped: "bad_json" });
  }
  const responseId = body.response_id;
  if (!responseId) return ok({ skipped: "missing_response_id" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("[notify-pre-post] RESEND_API_KEY not configured");
    return ok({ skipped: "no_resend_key" });
  }

  const supa = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Verify the response belongs to this survey
    const { data: latest, error: latestErr } = await supa
      .from("survey_responses")
      .select("id, survey_id, completed_at, created_at, user_id, session_id, is_anonymous")
      .eq("id", responseId)
      .eq("survey_id", SURVEY_ID)
      .maybeSingle();

    if (latestErr || !latest) {
      console.warn("[notify-pre-post] response not found or wrong survey", responseId);
      return ok({ skipped: "not_target_survey" });
    }

    // 2. Questions for this survey (ordered)
    const { data: questions } = await supa
      .from("survey_questions")
      .select("id, display_order, question_text_th, question_text_en, question_type, options")
      .eq("survey_id", SURVEY_ID)
      .order("display_order", { ascending: true });

    const qList = questions || [];
    const qById = new Map(qList.map((q: any) => [q.id, q]));

    // Helpers to find nickname (Q2) and Pre/Post (Q1) by display_order
    const qPrePost = qList.find((q: any) => q.display_order === 1);
    const qNickname = qList.find((q: any) => q.display_order === 2);

    // 3. ALL responses for survey (cumulative)
    const { data: allResponses } = await supa
      .from("survey_responses")
      .select("id, completed_at, created_at, user_id, session_id, is_anonymous")
      .eq("survey_id", SURVEY_ID)
      .order("created_at", { ascending: true });

    const respList = allResponses || [];
    const respIds = respList.map((r: any) => r.id);

    // 4. All answers for those responses
    const { data: allAnswers } = await supa
      .from("survey_answers")
      .select("response_id, question_id, answer_text, answer_options, answer_rating")
      .in("response_id", respIds.length ? respIds : ["00000000-0000-0000-0000-000000000000"]);

    // Index: response_id -> question_id -> answer
    const ansIdx = new Map<string, Map<string, any>>();
    for (const a of allAnswers || []) {
      let m = ansIdx.get(a.response_id);
      if (!m) {
        m = new Map();
        ansIdx.set(a.response_id, m);
      }
      m.set(a.question_id, a);
    }

    const getCell = (respId: string, qId: string): string => {
      const q = qById.get(qId);
      if (!q) return "";
      const a = ansIdx.get(respId)?.get(qId);
      return answerText(a, q);
    };

    // 5. Build "latest" CSV (vertical: one question per row)
    const latestNickname = getCell(latest.id, qNickname?.id);
    const latestPrePost = getCell(latest.id, qPrePost?.id);
    const submittedAt = fmtBkk(latest.completed_at || latest.created_at);

    const latestHeaderRows: (string | number | null | undefined)[][] = [
      ["แบบทดสอบ", "ยกเลิก พ.ร.บ.ค้าประเวณี 2539"],
      ["Response ID", latest.id],
      ["ชื่อเล่น/รหัสผู้ตอบ", latestNickname || latest.session_id || latest.user_id || "(ไม่ระบุ)"],
      ["Pre/Post", latestPrePost],
      ["วันเวลาที่ส่ง (Asia/Bangkok)", submittedAt],
      [],
      ["ลำดับ", "คำถาม", "คำตอบ"],
    ];

    const latestQRows = qList.map((q: any) => [
      q.display_order,
      q.question_text_th || q.question_text_en || "",
      getCell(latest.id, q.id),
    ]);

    // Custom serialization since headers vary per section
    let latestCsv = BOM;
    for (const row of [...latestHeaderRows, ...latestQRows]) {
      latestCsv += row.map(csvEscape).join(",") + "\n";
    }

    // 6. Build cumulative CSV: one row per respondent, columns = each question
    const cumulativeHeaders = [
      "ลำดับ",
      "Response ID",
      "ชื่อเล่น/รหัสผู้ตอบ",
      "Pre/Post",
      "วันเวลาที่ส่ง (Asia/Bangkok)",
      ...qList.map((q: any) => `Q${q.display_order}. ${q.question_text_th || q.question_text_en || ""}`),
    ];

    const cumulativeRows = respList
      .map((r: any, idx: number) => {
        const nick = qNickname ? getCell(r.id, qNickname.id) : "";
        const pp = qPrePost ? getCell(r.id, qPrePost.id) : "";
        return [
          idx + 1,
          r.id,
          nick || r.session_id || r.user_id || "(ไม่ระบุ)",
          pp,
          fmtBkk(r.completed_at || r.created_at),
          ...qList.map((q: any) => getCell(r.id, q.id)),
        ];
      });

    const cumulativeCsv = rowsToCsv(cumulativeHeaders, cumulativeRows);

    // 7. Filenames
    const fileStamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const latestFilename = `latest-response-${fileStamp}.csv`;
    const allFilename = `all-responses-up-to-${fileStamp}.csv`;

    // 8. Build email
    const totalRespondents = respList.length;
    const subject = `[testD] ส่งคำตอบใหม่: ยกเลิก พ.ร.บ.ค้าประเวณี 2539 (${latestPrePost || "?"}) - ${latestNickname || "ไม่ระบุชื่อเล่น"}`;

    const html = `
<!doctype html>
<html lang="th"><head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#0f172a;padding:24px;">
  <div style="max-width:560px;margin:0 auto;">
    <h2 style="color:#c0275e;margin:0 0 12px;">ส่งคำตอบใหม่ - ยกเลิก พ.ร.บ.ค้าประเวณี 2539</h2>
    <p>มีผู้ส่งคำตอบใหม่เข้ามาในระบบ</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">
      <tr><td style="padding:6px 0;color:#64748b;width:180px;">ชื่อเล่น/รหัสผู้ตอบ</td><td><strong>${(latestNickname || "(ไม่ระบุ)").replace(/</g, "&lt;")}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Pre / Post</td><td><strong>${(latestPrePost || "-").replace(/</g, "&lt;")}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">วันเวลาที่ส่ง (Asia/Bangkok)</td><td>${submittedAt}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">จำนวนผู้ตอบรวมทั้งหมด</td><td><strong>${totalRespondents}</strong></td></tr>
    </table>
    <p style="font-size:14px;color:#475569;">
      ไฟล์แนบ:<br/>
      • <strong>${latestFilename}</strong> - คำตอบของผู้ตอบล่าสุด<br/>
      • <strong>${allFilename}</strong> - คำตอบสะสมของทุกคน (${totalRespondents} ราย)
    </p>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px;">
      ไฟล์ใช้ UTF-8 BOM เปิดในโปรแกรม Excel/Numbers ได้ภาษาไทยไม่เพี้ยน
    </p>
  </div>
</body></html>`.trim();

    // 9. Send via Resend with both attachments
    const toBase64 = (s: string) => {
      const bytes = new TextEncoder().encode(s);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    };

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFY_TO],
        subject,
        html,
        attachments: [
          {
            filename: latestFilename,
            content: toBase64(latestCsv),
          },
          {
            filename: allFilename,
            content: toBase64(cumulativeCsv),
          },
        ],
      }),
    });

    if (!resendResp.ok) {
      const txt = await resendResp.text();
      console.error("[notify-pre-post] resend send failed", resendResp.status, txt);
      return ok({ sent: false, status: resendResp.status, error: txt });
    }

    const data = await resendResp.json().catch(() => ({}));
    console.log("[notify-pre-post] email sent", { id: data?.id, to: NOTIFY_TO });
    return ok({ sent: true, id: data?.id, totalRespondents });
  } catch (e) {
    console.error("[notify-pre-post] unexpected error", e);
    return ok({ sent: false, error: String(e) });
  }
});
