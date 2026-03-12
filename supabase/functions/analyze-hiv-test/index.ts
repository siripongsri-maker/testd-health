import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANALYSIS_PROMPT = `You are a trained medical image analyst specializing in reading Abbott Panbio HIV Self-Test (blood-based rapid diagnostic test) results.

DEVICE DESCRIPTION:
- The test cassette has a small rectangular result window.
- Inside the window there are TWO labeled positions printed on the strip: "C" (Control) near one end and "T" (Test) near the other end.
- After use, colored lines (pink/red) may appear at these positions.

CRITICAL SAFETY RULE — BIAS TOWARD DETECTION:
- Your PRIMARY goal is patient safety. Missing a positive result (false negative) is FAR more dangerous than a false positive.
- If there is ANY visible coloration at the T position — even very faint, partial, or uneven — you MUST report it as "positive".
- Only report "negative" when the T area is COMPLETELY blank/white with absolutely NO coloration whatsoever.
- When in doubt, ALWAYS err on the side of "positive" or "inconclusive", NEVER "negative".

HOW TO COUNT LINES:
- A "line" is a distinct colored band (pink, red, or dark red) at the marked C or T position.
- A faint line IS still a line. Even a barely visible pink tint at the T position counts as a T line.
- Shadows, edges of plastic, reflections are not lines — but actual pigment/coloration IS a line regardless of intensity.

INTERPRETATION RULES:
1. POSITIVE: If you see ANY coloration (pink/red, even very faint) at the T position AND a C line is present → result is "positive". A faint T line is STILL POSITIVE. This is the most safety-critical classification.
2. NEGATIVE: ONLY when the C line is clearly present AND the T area is COMPLETELY white/blank with ZERO coloration. You must be highly confident there is no T line at all.
3. INVALID: No C line visible (regardless of T line).
4. INCONCLUSIVE: Use this when:
   - Image quality is poor (blurry, dark, bad angle)
   - Blood obscures the reading area
   - You cannot clearly distinguish whether coloration at T is a real line or artifact
   - Lighting makes it impossible to determine with confidence
   - The test strip appears damaged or improperly used

DECISION PROCESS:
Step 1: Locate the result window on the cassette.
Step 2: Is there a colored line at the C position? If NO → "invalid".
Step 3: Look at the T position carefully. Is there ANY pink/red coloration?
  - YES, clear colored band → "positive" with high confidence
  - YES, faint but visible coloration → "positive" with medium confidence  
  - Cannot tell due to image quality/lighting/blood → "inconclusive"
  - NO, completely white/blank → "negative"

Respond with ONLY valid JSON (no markdown, no explanation):
{"result":"negative","confidence":"high","control_line":true,"test_line":false,"test_line_strength":"none","artifact_risk":"low","reasoning":"brief 1-sentence explanation"}

Field definitions:
- result: "positive", "negative", "invalid", or "inconclusive"
- confidence: "high", "medium", or "low"
- control_line: true/false
- test_line: true/false — whether ANY coloration is visible at T position
- test_line_strength: "none", "faint", "moderate", "strong"
- artifact_risk: "low", "medium", "high"
- reasoning: brief explanation`;

const VERIFICATION_PROMPT = `You are a SECOND-OPINION medical image analyst reviewing an HIV Self-Test result.

CRITICAL SAFETY RULE: Your job is to CONFIRM detection, not to dismiss it. Missing a positive (false negative) is far more dangerous than a false positive. A self-test positive only means the user should get a confirmatory lab test — it does NOT mean they are diagnosed.

The first analyst flagged this result. Your task:
1. Independently check: Is there ANY coloration at the T position?
2. If you see ANY pink/red coloration at T (even faint), confirm "positive".
3. Only override to "negative" if you are HIGHLY CERTAIN the T area is completely blank white with zero coloration.
4. If image quality makes it hard to tell, report "inconclusive", NOT "negative".

A faint T line is still a REAL positive result. Do not dismiss faint lines as artifacts unless you have overwhelming evidence they are not real pigment.

Respond with ONLY valid JSON:
{"result":"positive","confidence":"high","test_line":true,"artifact_risk":"low","reasoning":"brief 1-sentence explanation"}`;

async function callAI(apiKey: string, prompt: string, imageBase64: string, model: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }
      ],
      temperature: 0.1,
    })
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw { status: 429, message: "Rate limit exceeded" };
    if (status === 402) throw { status: 402, message: "Payment required" };
    const errorText = await response.text();
    console.error("AI gateway error:", status, errorText);
    throw { status: 500, message: "AI gateway error" };
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function parseAIResponse(raw: string): any {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  
  const lower = raw.toLowerCase().trim();
  if (lower === "negative") return { result: "negative", confidence: "medium" };
  if (lower === "positive") return { result: "positive", confidence: "medium" };
  if (lower === "invalid") return { result: "invalid", confidence: "medium" };
  
  return { result: "inconclusive", confidence: "low", reasoning: "Could not parse AI response" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} requesting HIV test analysis`);

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (imageBase64.length > 15000000) {
      return new Response(
        JSON.stringify({ error: "Image too large (max 10MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // === PASS 1: Primary analysis ===
    console.log("Pass 1: Primary analysis with gemini-2.5-pro");
    const rawResponse1 = await callAI(LOVABLE_API_KEY, ANALYSIS_PROMPT, imageBase64, "google/gemini-2.5-pro");
    const pass1 = parseAIResponse(rawResponse1);
    console.log("Pass 1 result:", JSON.stringify(pass1));

    let finalResult = pass1;

    // === PASS 2: Verification — only for positive OR low-confidence negative ===
    const needsVerification = 
      pass1.result === "positive" || 
      (pass1.result === "negative" && pass1.confidence !== "high") ||
      pass1.result === "inconclusive";

    if (needsVerification) {
      console.log(`Pass 2: Verifying ${pass1.result} result (confidence: ${pass1.confidence})`);
      try {
        const rawResponse2 = await callAI(LOVABLE_API_KEY, VERIFICATION_PROMPT, imageBase64, "google/gemini-2.5-pro");
        const pass2 = parseAIResponse(rawResponse2);
        console.log("Pass 2 result:", JSON.stringify(pass2));

        // Safety-first resolution logic:
        // If EITHER pass says positive → final is positive
        if (pass1.result === "positive" || pass2.result === "positive") {
          finalResult = {
            result: "positive",
            confidence: (pass1.result === "positive" && pass2.result === "positive") ? "high" : "medium",
            control_line: pass1.control_line ?? pass2.control_line ?? true,
            test_line: true,
            test_line_strength: pass1.test_line_strength || pass2.test_line_strength || "faint",
            artifact_risk: (pass1.result === "positive" && pass2.result === "positive") ? "low" : "medium",
            reasoning: `Pass1: ${pass1.result} (${pass1.reasoning || 'N/A'}). Pass2: ${pass2.result} (${pass2.reasoning || 'N/A'})`,
            verified: true,
            passes_agreed: pass1.result === pass2.result,
          };
        }
        // Both say negative with confidence
        else if (pass1.result === "negative" && pass2.result === "negative") {
          finalResult = {
            ...pass1,
            confidence: pass1.confidence === "high" && pass2.confidence === "high" ? "high" : "medium",
            verified: true,
            passes_agreed: true,
            reasoning: `Both passes confirm negative. Pass1: ${pass1.reasoning || 'N/A'}. Pass2: ${pass2.reasoning || 'N/A'}`,
          };
        }
        // Disagreement or inconclusive — route to inconclusive
        else {
          finalResult = {
            result: "inconclusive",
            confidence: "low",
            control_line: pass1.control_line,
            test_line: pass1.test_line || pass2.test_line,
            test_line_strength: pass1.test_line_strength || "unknown",
            artifact_risk: "high",
            reasoning: `Passes disagreed or inconclusive. Pass1: ${pass1.result} (${pass1.reasoning || 'N/A'}). Pass2: ${pass2.result} (${pass2.reasoning || 'N/A'})`,
            verified: true,
            passes_agreed: false,
          };
        }
      } catch (verifyError) {
        console.error("Verification pass failed:", verifyError);
        // If pass 1 was positive, keep it even without verification
        if (pass1.result === "positive") {
          finalResult = {
            ...pass1,
            confidence: "medium",
            verified: false,
            reasoning: `Single-pass positive (verification failed). ${pass1.reasoning || ''}`,
          };
        } else {
          // Low-confidence negative without verification → inconclusive
          finalResult = {
            result: "inconclusive",
            confidence: "low",
            control_line: pass1.control_line,
            test_line: pass1.test_line,
            test_line_strength: pass1.test_line_strength || "unknown",
            artifact_risk: "high",
            verified: false,
            reasoning: `Could not verify ${pass1.result} result (verification failed). ${pass1.reasoning || ''}`,
          };
        }
      }
    }

    // Normalize result
    const validResults = ["positive", "negative", "invalid", "inconclusive"];
    if (!validResults.includes(finalResult.result)) {
      finalResult.result = "inconclusive";
      finalResult.confidence = "low";
    }

    // SAFETY NET: Never return "negative" with low confidence
    if (finalResult.result === "negative" && finalResult.confidence === "low") {
      console.log("SAFETY NET: Upgrading low-confidence negative to inconclusive");
      finalResult.result = "inconclusive";
      finalResult.reasoning = `Low-confidence negative upgraded to inconclusive for safety. ${finalResult.reasoning || ''}`;
    }

    console.log(`Final result for user ${user.id}: ${finalResult.result} (confidence: ${finalResult.confidence})`);

    return new Response(
      JSON.stringify({
        result: finalResult.result,
        confidence: finalResult.confidence || "medium",
        control_line: finalResult.control_line ?? null,
        test_line: finalResult.test_line ?? null,
        test_line_strength: finalResult.test_line_strength || "none",
        artifact_risk: finalResult.artifact_risk || "low",
        reasoning: finalResult.reasoning || null,
        verified: finalResult.verified || false,
        passes_agreed: finalResult.passes_agreed ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("analyze-hiv-test error:", error);
    
    if (error?.status === 429 || error?.status === 402) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
