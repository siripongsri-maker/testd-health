// Hybrid moderation + smart FAQ matcher for community posts.
// 1) Hard keyword block (sales/sourcing) - reject immediately
// 2) AI safety check (Lovable AI) - approve / flag
// 3) AI semantic FAQ + service match - return suggestions for popup

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const HARD_BLOCK = [
  "ขาย", "sell", "selling", "dealer", "ซื้อยา", "buy drug",
  "wickr", "telegram group", "signal group", "หาของ", "plug me",
];

interface FaqItem { id: string; q_th: string; q_en: string; path?: string; label_en?: string; label_th?: string; }

const FAQ_CATALOG: FaqItem[] = [
  { id: "booking", q_th: "จองนัดหมายยังไง วิธีจอง walk-in", q_en: "How to book appointment walk-in", path: "/booking", label_en: "Book Appointment", label_th: "จองนัดหมาย" },
  { id: "prep", q_th: "PrEP ยาป้องกัน HIV เริ่มยังไง", q_en: "PrEP HIV prevention how to start", path: "/info", label_en: "Learn about PrEP", label_th: "เรียนรู้เกี่ยวกับ PrEP" },
  { id: "pep", q_th: "PEP ฉุกเฉิน เพิ่งเสี่ยง 72 ชั่วโมง", q_en: "PEP emergency just exposed 72 hours", path: "/pep-emergency", label_en: "PEP Emergency", label_th: "PEP ฉุกเฉิน" },
  { id: "self-test", q_th: "ชุดตรวจ HIV ที่บ้าน self test", q_en: "HIV self test kit home", path: "/self-test", label_en: "HIV Self-Test", label_th: "ชุดตรวจ HIV" },
  { id: "test", q_th: "ตรวจ HIV ที่ไหน ฟรี", q_en: "HIV testing where free", path: "/booking", label_en: "Book HIV Test", label_th: "จองตรวจ HIV" },
  { id: "harm-reduction", q_th: "ลดอันตราย ใช้สาร ปลอดภัย", q_en: "harm reduction substance safer use", path: "/harm-reduction", label_en: "Harm Reduction Hub", label_th: "ลดอันตราย" },
  { id: "support", q_th: "ปรึกษาเจ้าหน้าที่ counselor chat", q_en: "talk to counselor chat support", path: "/support", label_en: "Talk to Counselor", label_th: "ปรึกษาผู้เชี่ยวชาญ" },
  { id: "mental", q_th: "สุขภาพจิต เครียด ซึมเศร้า ตรวจ", q_en: "mental health depression screening", path: "/check", label_en: "Mental Health Check", label_th: "ตรวจสุขภาพจิต" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { content } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length < 2) {
      return new Response(JSON.stringify({ error: "invalid content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = content.trim();
    const lower = text.toLowerCase();

    // Layer 1: hard keyword block
    if (HARD_BLOCK.some((k) => lower.includes(k))) {
      return new Response(JSON.stringify({
        decision: "reject",
        reason: "Selling, sourcing, or off-platform contact is not allowed.",
        suggestions: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Layer 2 + 3: combined AI call (moderation + FAQ semantic match)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const faqList = FAQ_CATALOG.map((f) => `- ${f.id}: ${f.q_en}`).join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You moderate posts for an anonymous Thai sexual-health community (HIV, PrEP, PEP, harm reduction, mental health). Posts may be in Thai or English.
Rules:
- safety="safe" if respectful question/sharing, even sensitive personal topics.
- safety="flag" if hate, doxxing, suicide instructions, drug sales, illegal services, spam, or self-promotion.
Then match the user's intent to relevant FAQ topics from this list (return up to 3 IDs, ordered by relevance, empty if none clearly match):
${faqList}`,
          },
          { role: "user", content: text },
        ],
        tools: [{
          type: "function",
          function: {
            name: "moderate",
            description: "Return moderation decision and matched FAQ topic ids",
            parameters: {
              type: "object",
              properties: {
                safety: { type: "string", enum: ["safe", "flag"] },
                reason: { type: "string" },
                faq_ids: { type: "array", items: { type: "string" } },
              },
              required: ["safety", "faq_ids"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "moderate" } },
      }),
    });

    if (!aiResp.ok) {
      console.error("AI gateway error", aiResp.status, await aiResp.text());
      // Fail-open to manual review (insert as not approved, no suggestions)
      return new Response(JSON.stringify({ decision: "review", suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : {};
    const safety = args.safety || "flag";
    const faqIds: string[] = Array.isArray(args.faq_ids) ? args.faq_ids : [];

    const suggestions = faqIds
      .map((id) => FAQ_CATALOG.find((f) => f.id === id))
      .filter(Boolean)
      .slice(0, 3)
      .map((f) => ({ id: f!.id, path: f!.path, label_en: f!.label_en, label_th: f!.label_th }));

    return new Response(JSON.stringify({
      decision: safety === "safe" ? "approve" : "review",
      reason: args.reason || null,
      suggestions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("moderate-community-post error", e);
    return new Response(JSON.stringify({ decision: "review", suggestions: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
