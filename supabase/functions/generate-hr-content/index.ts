import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BANNED_PHRASES = [
  "safe to use", "safely combine", "recommended dose", "how to prepare",
  "where to buy", "how to source", "enhances the experience",
  "enjoy the combination", "perfect mix", "fun combination",
];

function validateContent(draft: Record<string, unknown>): string[] {
  const flags: string[] = [];
  const text = JSON.stringify(draft).toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (text.includes(phrase)) flags.push(`banned_phrase: "${phrase}"`);
  }
  if (!draft.ai_summary_en) flags.push("missing_ai_summary_en");
  if (!draft.ai_summary_th) flags.push("missing_ai_summary_th");
  if (!draft.why_risky_en) flags.push("missing_why_risky_en");
  const faqEn = draft.faq_items_en as unknown[];
  if (!faqEn || faqEn.length < 3) flags.push("faq_count_below_3");
  if (faqEn && faqEn.length > 5) flags.push("faq_count_above_5");
  const metaEn = draft.meta_description_en as string;
  if (metaEn && metaEn.length > 160) flags.push("meta_description_too_long");
  return flags;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    // Verify admin
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { substance_a_slug, substance_b_slug, interaction_id, sections } = await req.json();
    if (!substance_a_slug || !substance_b_slug) throw new Error("substance slugs required");

    // Fetch existing interaction data
    let interactionData: Record<string, unknown> | null = null;
    if (interaction_id) {
      const { data } = await adminClient.from("hr_substance_interactions").select("*").eq("id", interaction_id).maybeSingle();
      interactionData = data;
    }

    // Fetch substance data
    const { data: subA } = await adminClient.from("hr_substances").select("*").eq("slug", substance_a_slug).maybeSingle();
    const { data: subB } = await adminClient.from("hr_substances").select("*").eq("slug", substance_b_slug).maybeSingle();

    // Fetch knowledge entities
    const { data: entities } = await adminClient.from("hr_knowledge_entities").select("*").or(`slug.eq.${substance_a_slug},slug.eq.${substance_b_slug}`);

    const nameA_en = subA?.name_en || substance_a_slug;
    const nameA_th = subA?.name_th || substance_a_slug;
    const nameB_en = subB?.name_en || substance_b_slug;
    const nameB_th = subB?.name_th || substance_b_slug;
    const riskLevel = interactionData?.risk_level || "unknown";

    const contextBlock = `
Existing data:
- Substance A: ${nameA_en} (${nameA_th}), Category: ${subA?.category || "unknown"}
- Substance B: ${nameB_en} (${nameB_th}), Category: ${subB?.category || "unknown"}
- Risk level: ${riskLevel}
- Known interaction type: ${interactionData?.interaction_type || "unknown"}
${interactionData?.why_risky_en ? `- Why risky: ${interactionData.why_risky_en}` : ""}
${interactionData?.possible_effects ? `- Known effects: ${JSON.stringify(interactionData.possible_effects)}` : ""}
${interactionData?.warning_signs ? `- Warning signs: ${JSON.stringify(interactionData.warning_signs)}` : ""}
${interactionData?.emergency_signs ? `- Emergency signs: ${JSON.stringify(interactionData.emergency_signs)}` : ""}
${interactionData?.harm_reduction_tips ? `- Harm reduction tips: ${JSON.stringify(interactionData.harm_reduction_tips)}` : ""}
${entities?.length ? `- Knowledge entities: ${entities.map(e => `${e.name_en} (${e.entity_type})`).join(", ")}` : ""}
`;

    const systemPrompt = `You are a medical harm reduction content writer for testD, a chemsex safety platform by SWING Foundation in Thailand.

CRITICAL SAFETY RULES - you MUST follow these:
- NEVER provide dosing instructions or amounts
- NEVER provide preparation or synthesis instructions
- NEVER provide sourcing or purchasing information
- NEVER glamorize drug use or combinations
- NEVER imply any drug use is "safe"
- Use language like: "may increase risk", "lower relative risk does not mean no risk", "signs to watch for", "ways to reduce harm", "support is available"
- Always maintain a non-judgmental, harm-reduction focused tone
- Content must be medically accurate and evidence-based

Generate bilingual content (English AND Thai) for this drug interaction page.`;

    const userPrompt = `Generate comprehensive harm reduction content for the interaction between ${nameA_en} and ${nameB_en}.

${contextBlock}

Return a JSON object with EXACTLY these fields:
{
  "title_en": "string - page title in English, e.g. '${nameA_en} + ${nameB_en} Interaction Risk'",
  "title_th": "string - page title in Thai",
  "ai_summary_en": "string - 2-3 sentence harm reduction summary in English",
  "ai_summary_th": "string - 2-3 sentence harm reduction summary in Thai",
  "quick_facts_en": [{"label": "string", "value": "string"}],
  "quick_facts_th": [{"label": "string", "value": "string"}],
  "summary_en": "string - detailed summary paragraph",
  "summary_th": "string - detailed summary paragraph in Thai",
  "why_risky_en": "string - explanation of why this combination increases risk",
  "why_risky_th": "string - Thai translation",
  "possible_effects_en": ["effect1", "effect2", ...],
  "possible_effects_th": ["effect1_th", "effect2_th", ...],
  "warning_signs_en": ["sign1", "sign2", ...],
  "warning_signs_th": ["sign1_th", "sign2_th", ...],
  "harm_reduction_tips_en": ["tip1", "tip2", ...],
  "harm_reduction_tips_th": ["tip1_th", "tip2_th", ...],
  "emergency_signs_en": ["sign1", "sign2", ...],
  "emergency_signs_th": ["sign1_th", "sign2_th", ...],
  "seo_title_en": "string - SEO title under 60 chars",
  "seo_title_th": "string - SEO title in Thai under 60 chars",
  "meta_description_en": "string - meta description under 160 chars",
  "meta_description_th": "string - meta description in Thai under 160 chars",
  "faq_items_en": [{"question": "string", "answer": "string"}],
  "faq_items_th": [{"question": "string", "answer": "string"}],
  "recommended_source_types": ["WHO", "EMCDDA", "NIDA", etc.],
  "citation_placeholders": [{"source_type": "string", "suggested_search": "string"}],
  "authority_confidence_score": 0.0-1.0
}

Include 3-5 FAQ items. Keep meta descriptions under 160 characters. Keep AI summaries to 2-3 sentences.
Quick facts should include: Combination, Risk Level, Primary Concern, Emergency Signs.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_content_draft",
            description: "Save the generated harm reduction content draft",
            parameters: {
              type: "object",
              properties: {
                title_en: { type: "string" },
                title_th: { type: "string" },
                ai_summary_en: { type: "string" },
                ai_summary_th: { type: "string" },
                quick_facts_en: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } },
                quick_facts_th: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } },
                summary_en: { type: "string" },
                summary_th: { type: "string" },
                why_risky_en: { type: "string" },
                why_risky_th: { type: "string" },
                possible_effects_en: { type: "array", items: { type: "string" } },
                possible_effects_th: { type: "array", items: { type: "string" } },
                warning_signs_en: { type: "array", items: { type: "string" } },
                warning_signs_th: { type: "array", items: { type: "string" } },
                harm_reduction_tips_en: { type: "array", items: { type: "string" } },
                harm_reduction_tips_th: { type: "array", items: { type: "string" } },
                emergency_signs_en: { type: "array", items: { type: "string" } },
                emergency_signs_th: { type: "array", items: { type: "string" } },
                seo_title_en: { type: "string" },
                seo_title_th: { type: "string" },
                meta_description_en: { type: "string" },
                meta_description_th: { type: "string" },
                faq_items_en: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } },
                faq_items_th: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } },
                recommended_source_types: { type: "array", items: { type: "string" } },
                citation_placeholders: { type: "array", items: { type: "object", properties: { source_type: { type: "string" }, suggested_search: { type: "string" } }, required: ["source_type", "suggested_search"] } },
                authority_confidence_score: { type: "number" },
              },
              required: ["title_en", "title_th", "ai_summary_en", "ai_summary_th", "why_risky_en", "why_risky_th", "faq_items_en", "faq_items_th"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_content_draft" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error(`AI generation failed: ${status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured content");

    const generated = JSON.parse(toolCall.function.arguments);

    // Validate
    const qualityFlags = validateContent(generated);
    const validationPassed = qualityFlags.length === 0;

    // Determine slug
    const slugParts = [substance_a_slug, substance_b_slug].sort();
    const slug = slugParts.join("-");

    // Save draft
    const draft = {
      interaction_id: interaction_id || null,
      substance_a_slug,
      substance_b_slug,
      content_type: "interaction",
      slug,
      status: "draft_generated",
      generated_by: user.id,
      title_th: generated.title_th,
      title_en: generated.title_en,
      ai_summary_th: generated.ai_summary_th,
      ai_summary_en: generated.ai_summary_en,
      quick_facts_th: generated.quick_facts_th || [],
      quick_facts_en: generated.quick_facts_en || [],
      summary_th: generated.summary_th,
      summary_en: generated.summary_en,
      why_risky_th: generated.why_risky_th,
      why_risky_en: generated.why_risky_en,
      possible_effects_th: generated.possible_effects_th || [],
      possible_effects_en: generated.possible_effects_en || [],
      warning_signs_th: generated.warning_signs_th || [],
      warning_signs_en: generated.warning_signs_en || [],
      harm_reduction_tips_th: generated.harm_reduction_tips_th || [],
      harm_reduction_tips_en: generated.harm_reduction_tips_en || [],
      emergency_signs_th: generated.emergency_signs_th || [],
      emergency_signs_en: generated.emergency_signs_en || [],
      seo_title_th: generated.seo_title_th,
      seo_title_en: generated.seo_title_en,
      meta_description_th: generated.meta_description_th,
      meta_description_en: generated.meta_description_en,
      faq_items_th: generated.faq_items_th || [],
      faq_items_en: generated.faq_items_en || [],
      recommended_source_types: generated.recommended_source_types || [],
      citation_placeholders: generated.citation_placeholders || [],
      authority_confidence_score: generated.authority_confidence_score || 0,
      quality_flags: qualityFlags,
      validation_passed: validationPassed,
    };

    const { data: saved, error: saveErr } = await adminClient.from("hr_content_drafts").insert(draft).select().single();
    if (saveErr) throw saveErr;

    return new Response(JSON.stringify({ draft: saved, quality_flags: qualityFlags, validation_passed: validationPassed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-hr-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
