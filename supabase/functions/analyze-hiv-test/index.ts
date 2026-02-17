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

CRITICAL: HOW TO COUNT LINES ACCURATELY
- A "line" is a distinct colored band (pink, red, or dark red) that appears AT the marked C or T position on the strip.
- Shadows, edges of the plastic window, reflections, dirt, dried blood smears, or the printed letters themselves are NOT lines.
- The background of the strip is white/light. A true line is a colored band contrasting against this background.
- If you see color ONLY at the C position and the T area is completely blank/white, that is ONE line = NEGATIVE.
- Only report a T line if you see a genuine colored band at the T position that is clearly distinguishable from the white background.

COMMON FALSE-POSITIVE TRAPS (be careful!):
- Evaporation lines: very faint grey/colorless marks that appear after the reading window (15-20 min). These are NOT positive.
- Shadow/lighting artifacts: uneven lighting can create the illusion of a second line. Look for actual pigment, not shadows.
- Plastic housing edges: the edges of the result window can look like lines. Ignore anything outside the strip itself.
- Dried blood residue: blood that seeped into the window can look like a faint line. A true T line is uniform across the strip width, not a smear.
- Smudges or fingerprints on the cassette window.
- Indentation marks from manufacturing on the strip (no color, just texture).

INTERPRETATION RULES:
1. NEGATIVE: ONLY the C line is visible. The T area is blank/white with no colored band. One line = NEGATIVE. This is the MOST COMMON result (~95% of tests).
2. POSITIVE: BOTH C line AND T line show genuine colored bands. The T line can be faint but must be a REAL colored band (pink/red pigment), not a shadow or artifact. Two distinct colored lines = POSITIVE.
3. INVALID: No C line visible (regardless of T line). The test did not work properly.

DECISION PROCESS (follow step by step):
Step 1: Locate the result window on the cassette.
Step 2: Is there a colored line at the C position? If NO → result is "invalid".
Step 3: Is there a colored line at the T position? Examine carefully:
  - Is it a genuine pink/red band with actual pigment?
  - Is it uniform across the strip width (not a smear)?
  - Does it have color (pink/red/dark red) — not grey, not colorless?
  - Could it be a shadow, reflection, evaporation mark, dried blood, or edge artifact?
Step 4: If the T area has NO genuine colored band → result is "negative". If there IS a genuine colored band at T → result is "positive".

Respond with ONLY valid JSON (no markdown, no explanation):
{"result":"negative","confidence":"high","control_line":true,"test_line":false,"test_line_strength":"none","artifact_risk":"low","reasoning":"brief 1-sentence explanation"}

Field definitions:
- result: "positive", "negative", or "invalid"
- confidence: "high", "medium", or "low"
- control_line: true/false — whether C line is visible
- test_line: true/false — whether a genuine T line is visible
- test_line_strength: "none", "faint", "moderate", "strong"
- artifact_risk: "low", "medium", "high" — risk that what looks like a T line is actually an artifact
- reasoning: brief explanation of what you observed`;

const VERIFICATION_PROMPT = `You are a SECOND-OPINION medical image analyst reviewing an HIV Self-Test result that a first analyst flagged as POTENTIALLY POSITIVE.

Your job is to be SKEPTICAL and CONSERVATIVE. You must independently verify whether there is truly a genuine T line.

IMPORTANT CONTEXT: The vast majority (~95%) of HIV self-tests are NEGATIVE. A positive result has serious implications, so false positives must be avoided.

RE-EXAMINE the T line area critically:
1. Is the supposed T line a genuine COLORED band (pink/red pigment)?
2. Or could it be ANY of these artifacts:
   - Evaporation line (grey/colorless, appears after reading window)
   - Shadow from uneven lighting
   - Edge of the plastic housing
   - Dried blood residue or smear
   - Fingerprint or smudge
   - Manufacturing indentation (texture without color)
3. Is the T line uniform across the strip width?
4. Does it have similar character (color type) to the C line, just potentially fainter?

A TRUE positive T line should:
- Have pink/red/dark red pigment (same color family as C line)
- Be uniform across the strip width
- Be clearly distinguishable from the white background even if faint
- NOT be explainable by any artifact

Respond with ONLY valid JSON:
{"result":"negative","confidence":"high","test_line":false,"artifact_risk":"high","reasoning":"brief 1-sentence explanation of your independent assessment"}`;

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
  // Try to extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  
  // Fallback: parse single-word legacy response
  const lower = raw.toLowerCase().trim();
  if (lower === "negative") return { result: "negative", confidence: "medium" };
  if (lower === "positive") return { result: "positive", confidence: "medium" };
  if (lower === "invalid") return { result: "invalid", confidence: "medium" };
  
  // Strict matching to avoid "not positive" being parsed as positive
  return { result: "invalid", confidence: "low", reasoning: "Could not parse AI response" };
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

    // === PASS 1: Primary analysis with gemini-2.5-pro ===
    console.log("Pass 1: Primary analysis with gemini-2.5-pro");
    const rawResponse1 = await callAI(LOVABLE_API_KEY, ANALYSIS_PROMPT, imageBase64, "google/gemini-2.5-pro");
    const pass1 = parseAIResponse(rawResponse1);
    console.log("Pass 1 result:", JSON.stringify(pass1));

    let finalResult = pass1;

    // === PASS 2: Verification for positive results ===
    if (pass1.result === "positive") {
      console.log("Pass 2: Verifying positive result with second opinion");
      try {
        const rawResponse2 = await callAI(LOVABLE_API_KEY, VERIFICATION_PROMPT, imageBase64, "google/gemini-2.5-pro");
        const pass2 = parseAIResponse(rawResponse2);
        console.log("Pass 2 result:", JSON.stringify(pass2));

        if (pass2.result === "negative") {
          // Second opinion disagrees — downgrade to negative with low confidence
          console.log("OVERRIDE: Second opinion says negative — overriding to negative");
          finalResult = {
            result: "negative",
            confidence: "low",
            control_line: pass1.control_line,
            test_line: false,
            test_line_strength: "none",
            artifact_risk: "high",
            reasoning: `First pass flagged positive but verification pass determined it was an artifact. Pass1: ${pass1.reasoning || 'N/A'}. Pass2: ${pass2.reasoning || 'N/A'}`,
            verified: true,
            passes_agreed: false,
          };
        } else {
          // Both agree it's positive
          finalResult = {
            ...pass1,
            confidence: pass1.confidence === "high" && pass2.confidence === "high" ? "high" : "medium",
            verified: true,
            passes_agreed: true,
            reasoning: `Confirmed by two independent analyses. Pass1: ${pass1.reasoning || 'N/A'}. Pass2: ${pass2.reasoning || 'N/A'}`,
          };
        }
      } catch (verifyError) {
        console.error("Verification pass failed, using pass 1 result with reduced confidence:", verifyError);
        finalResult = {
          ...pass1,
          confidence: "low",
          verified: false,
          reasoning: `Single-pass result (verification failed). ${pass1.reasoning || ''}`,
        };
      }
    }

    // Normalize result to strict enum
    const validResults = ["positive", "negative", "invalid"];
    if (!validResults.includes(finalResult.result)) {
      finalResult.result = "invalid";
      finalResult.confidence = "low";
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
