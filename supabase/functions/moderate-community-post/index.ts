// Hybrid moderation + smart FAQ matcher for community posts.
// Flow:
//  1) Hard keyword block (sales/sourcing) → reject (do not insert)
//  2) AI safety check + FAQ match (Lovable AI, single tool call)
//  3) Insert with service role; auto-set is_approved=true if AI says safe
//
// Body: { content, anonymous_token, kind: "post" | "reply", post_id? }
// Returns: { decision: "approve"|"review"|"reject", suggestions: [...] }

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const HARD_BLOCK = [
  "ขาย", "sell", "selling", "dealer", "ซื้อยา", "buy drug",
  "wickr", "telegram group", "signal group", "หาของ", "plug me",
];

interface FaqItem {
  id: string;
  q_th: string;
  q_en: string;
  path: string;
  label_en: string;
  label_th: string;
}

const FAQ_CATALOG: FaqItem[] = [
  { id: "booking", q_th: "จองนัดหมายยังไง วิธีจอง walk-in คลินิก", q_en: "How to book appointment walk-in clinic", path: "/booking", label_en: "Book Appointment", label_th: "จองนัดหมาย" },
  { id: "prep", q_th: "PrEP ยาป้องกัน HIV เริ่มยังไง", q_en: "PrEP HIV prevention how to start", path: "/info", label_en: "Learn about PrEP", label_th: "เรียนรู้เกี่ยวกับ PrEP" },
  { id: "pep", q_th: "PEP ฉุกเฉิน เพิ่งเสี่ยง 72 ชั่วโมง", q_en: "PEP emergency just exposed 72 hours risky", path: "/pep-emergency", label_en: "PEP Emergency", label_th: "PEP ฉุกเฉิน" },
  { id: "self-test", q_th: "ชุดตรวจ HIV ที่บ้าน self test", q_en: "HIV self test kit home", path: "/self-test", label_en: "HIV Self-Test", label_th: "ชุดตรวจ HIV" },
  { id: "test", q_th: "ตรวจ HIV ที่ไหน ฟรี", q_en: "HIV testing where free", path: "/booking", label_en: "Book HIV Test", label_th: "จองตรวจ HIV" },
  { id: "harm-reduction", q_th: "ลดอันตราย ใช้สาร ปลอดภัย", q_en: "harm reduction substance safer use", path: "/harm-reduction", label_en: "Harm Reduction Hub", label_th: "ลดอันตราย" },
  { id: "support", q_th: "ปรึกษาเจ้าหน้าที่ counselor chat", q_en: "talk to counselor chat support", path: "/support", label_en: "Talk to Counselor", label_th: "ปรึกษาผู้เชี่ยวชาญ" },
  { id: "mental", q_th: "สุขภาพจิต เครียด ซึมเศร้า ตรวจ", q_en: "mental health depression screening", path: "/check", label_en: "Mental Health Check", label_th: "ตรวจสุขภาพจิต" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const content = String(body?.content ?? "").trim();
    const anonymousToken = String(body?.anonymous_token ?? "").trim();
    const kind = body?.kind === "reply" ? "reply" : "post";
    const postId = body?.post_id ? String(body.post_id) : null;

    if (!content || content.length < 2 || !anonymousToken) {
      return json({ error: "invalid input" }, 400);
    }
    if (kind === "reply" && !postId) {
      return json({ error: "post_id required for reply" }, 400);
    }

    const lower = content.toLowerCase();

    // Service-role client (bypasses RLS for moderated insert)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Layer 1: hard block — do not insert
    if (HARD_BLOCK.some((k) => lower.includes(k))) {
      return json({ decision: "reject", reason: "blocked keyword", suggestions: [] });
    }

    // Layer 2 + 3: AI moderation + FAQ matching
    let safety: "safe" | "flag" = "flag";
    let faqIds: string[] = [];

    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const faqList = FAQ_CATALOG.map((f) => `- ${f.id}: ${f.q_en}`).join("\n");
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You moderate posts for an anonymous Thai sexual-health community (HIV, PrEP, PEP, harm reduction, mental health). Posts may be Thai or English.
Set safety="safe" if it's a respectful question/sharing — even sensitive personal topics about sex, drug use, or mental health are OK.
Set safety="flag" only for hate speech, doxxing, suicide instructions, drug sales, illegal services, spam, or self-promotion.
Then match the user's intent to relevant FAQ topics from this list (return up to 3 ids ordered by relevance, empty array if none clearly match):
${faqList}`,
              },
              { role: "user", content },
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

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const args = JSON.parse(toolCall.function.arguments);
            safety = args.safety === "safe" ? "safe" : "flag";
            faqIds = Array.isArray(args.faq_ids) ? args.faq_ids : [];
          }
        } else {
          console.error("AI gateway error", aiResp.status, await aiResp.text());
        }
      }
    } catch (e) {
      console.error("AI moderation error", e);
      // Fail-open to manual review
    }

    const isApproved = safety === "safe";

    // Insert (service role bypasses RLS)
    if (kind === "post") {
      const { error: insErr } = await supabase
        .from("hr_peer_posts")
        .insert({ anonymous_token: anonymousToken, content, is_approved: isApproved, is_flagged: !isApproved });
      if (insErr) {
        console.error("insert post error", insErr);
        return json({ error: "insert failed" }, 500);
      }
    } else {
      const { error: insErr } = await supabase
        .from("hr_peer_replies")
        .insert({ post_id: postId, anonymous_token: anonymousToken, content, is_approved: isApproved });
      if (insErr) {
        console.error("insert reply error", insErr);
        return json({ error: "insert failed" }, 500);
      }
    }

    const suggestions = faqIds
      .map((id) => FAQ_CATALOG.find((f) => f.id === id))
      .filter(Boolean)
      .slice(0, 3)
      .map((f) => ({ id: f!.id, path: f!.path, label_en: f!.label_en, label_th: f!.label_th }));

    return json({
      decision: isApproved ? "approve" : "review",
      suggestions,
    });
  } catch (e) {
    console.error("moderate-community-post fatal", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
