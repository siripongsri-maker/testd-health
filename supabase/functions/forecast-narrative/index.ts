import { corsHeaders } from "npm:@supabase/supabase-js@^2.95.0/cors";

interface NarrativeRequest {
  language: 'th' | 'en';
  scope: 'daily' | 'weekly' | 'monthly';
  context: {
    target_date?: string;
    forecast_arrivals?: number;
    forecast_completed?: number;
    peak_hours?: { start: number; end: number };
    confidence?: 'low' | 'medium' | 'high';
    pct_vs_previous?: number | null;
    pct_vs_baseline?: number | null;
    peak_day?: { date: string; n: number } | null;
    drivers: { label_th: string; label_en: string; effect: 'up' | 'down' | 'neutral' }[];
    branch_name?: string | null;
  };
}

const SYSTEM_TH = `คุณเป็นนักวิเคราะห์ข้อมูลคลินิกสุขภาพเพศ SWING Clinic (ภาษาไทยทางการ).
หน้าที่: เขียนสรุป forecast เป็นภาษาไทย 2-4 บรรทัด ให้ทีมแอดมินอ่านเข้าใจง่าย และ actionable.
ห้ามใช้ตัวเลขที่ไม่ได้ให้ใน context. ห้าม claim ว่าแม่นยำ 100%. ใช้คำว่า "คาดว่า", "น่าจะ", "มีแนวโน้ม".
เน้นปัจจัย (drivers) ที่ให้มา และคำแนะนำ capacity เช่น เตรียมเจ้าหน้าที่เพิ่มในช่วงพีค.`;

const SYSTEM_EN = `You are a clinic data analyst for SWING Clinic.
Task: Write a 2-4 sentence forecast narrative in concise English for admin operations team.
Do not invent numbers not in context. Do not claim 100% accuracy. Use language like "expected", "likely", "trending".
Focus on the supplied drivers and capacity recommendations like staffing for peak hours.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as NarrativeRequest;
    if (!body?.context || !body?.scope) {
      return new Response(JSON.stringify({ error: "missing scope/context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = body.language === 'en' ? 'en' : 'th';
    const system = lang === 'th' ? SYSTEM_TH : SYSTEM_EN;

    const driverLines = body.context.drivers
      .slice(0, 5)
      .map(d => `- [${d.effect}] ${lang === 'th' ? d.label_th : d.label_en}`)
      .join('\n');

    const userPrompt = lang === 'th'
      ? `Scope: ${body.scope}\nสาขา: ${body.context.branch_name ?? 'ทุกสาขา'}\n` +
        (body.context.target_date ? `วันที่: ${body.context.target_date}\n` : '') +
        (body.context.forecast_arrivals != null ? `คาดผู้รับบริการ: ${body.context.forecast_arrivals} คน\n` : '') +
        (body.context.forecast_completed != null ? `คาดเคสที่จบ: ${body.context.forecast_completed} เคส\n` : '') +
        (body.context.peak_hours ? `ช่วงพีค: ${String(body.context.peak_hours.start).padStart(2,'0')}:00-${String(body.context.peak_hours.end).padStart(2,'0')}:00\n` : '') +
        (body.context.peak_day ? `วันพีค: ${body.context.peak_day.date} (${body.context.peak_day.n} คน)\n` : '') +
        (body.context.pct_vs_previous != null ? `เทียบช่วงก่อน: ${body.context.pct_vs_previous > 0 ? '+' : ''}${body.context.pct_vs_previous}%\n` : '') +
        (body.context.pct_vs_baseline != null ? `เทียบ baseline วันเดียวกัน: ${body.context.pct_vs_baseline > 0 ? '+' : ''}${body.context.pct_vs_baseline}%\n` : '') +
        `ความมั่นใจ: ${body.context.confidence ?? 'medium'}\n\nปัจจัยหลัก:\n${driverLines}\n\nกรุณาสรุปเป็น 2-4 บรรทัดภาษาไทย พร้อมคำแนะนำ capacity 1 ข้อ.`
      : `Scope: ${body.scope}\nBranch: ${body.context.branch_name ?? 'All'}\n` +
        (body.context.target_date ? `Date: ${body.context.target_date}\n` : '') +
        (body.context.forecast_arrivals != null ? `Forecast arrivals: ${body.context.forecast_arrivals}\n` : '') +
        (body.context.forecast_completed != null ? `Forecast completed: ${body.context.forecast_completed}\n` : '') +
        (body.context.peak_hours ? `Peak band: ${String(body.context.peak_hours.start).padStart(2,'0')}:00-${String(body.context.peak_hours.end).padStart(2,'0')}:00\n` : '') +
        (body.context.peak_day ? `Peak day: ${body.context.peak_day.date} (${body.context.peak_day.n})\n` : '') +
        (body.context.pct_vs_previous != null ? `vs previous period: ${body.context.pct_vs_previous > 0 ? '+' : ''}${body.context.pct_vs_previous}%\n` : '') +
        (body.context.pct_vs_baseline != null ? `vs same-weekday baseline: ${body.context.pct_vs_baseline > 0 ? '+' : ''}${body.context.pct_vs_baseline}%\n` : '') +
        `Confidence: ${body.context.confidence ?? 'medium'}\n\nDrivers:\n${driverLines}\n\nWrite a 2-4 sentence narrative + 1 capacity recommendation.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited", narrative: null }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "credits_required", narrative: null }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "ai_error", narrative: null }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const narrative = aiData?.choices?.[0]?.message?.content?.trim() ?? null;

    return new Response(JSON.stringify({ narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forecast-narrative error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
