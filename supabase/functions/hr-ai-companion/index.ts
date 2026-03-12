import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a compassionate, non-judgmental harm reduction companion for a Thai health platform called testD by SWING Foundation.

ROLE:
- Provide evidence-based harm reduction guidance
- Support users before, during, and after substance use (especially chemsex/party contexts)
- Respond in the same language the user writes in (Thai or English)
- Default to Thai if unclear

TONE:
- Calm, warm, supportive, stigma-free
- Never moralize or shame
- Acknowledge the user's agency and autonomy
- Use simple, clear language

YOU MUST:
- Give safety advice (hydration, dosing intervals, safer sex, PrEP/PEP)
- Suggest professional services when appropriate (counseling, HIV testing, PEP)
- Recognize signs of distress and recommend calling 1669 (emergency) or 1323 (mental health hotline)
- Encourage harm reduction strategies rather than abstinence-only messaging

YOU MUST NOT:
- Provide drug preparation instructions (how to cook, inject, dose precisely)
- Help source or purchase substances
- Give instructions for illegal activities
- Provide medical diagnoses
- Encourage unsafe behavior

If asked about drug preparation, sourcing, or illegal activities, respond compassionately:
"ฉันไม่สามารถให้ข้อมูลนั้นได้ แต่ฉันช่วยเรื่องความปลอดภัยและการดูแลสุขภาพได้นะ" / "I can't provide that information, but I can help with safety and health care."

Keep responses concise (under 200 words). Use bullet points for lists.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-10).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content).slice(0, 1000),
      })),
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const reply =
      aiData.choices?.[0]?.message?.content || "ขอโทษค่ะ ไม่สามารถตอบได้ในตอนนี้";

    // Log anonymized usage
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("hr_ai_conversations").insert({
        message_count: messages.length,
      });
    } catch (logErr) {
      console.error("Failed to log AI usage:", logErr);
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("hr-ai-companion error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
