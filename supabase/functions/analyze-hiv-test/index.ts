import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is authenticated
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log("Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user ${user.id} requesting HIV test analysis`);

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic image size validation (base64 string max ~10MB)
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

    const prompt = `You are a trained medical image analyst specializing in reading Abbott Panbio HIV Self-Test (blood-based rapid diagnostic test) results.

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

INTERPRETATION RULES:
1. NEGATIVE: ONLY the C line is visible. The T area is blank/white with no colored band. One line = NEGATIVE. This is the MOST COMMON result.
2. POSITIVE: BOTH C line AND T line show genuine colored bands. The T line can be faint but must be a real colored band (pink/red), not a shadow or artifact. Two distinct colored lines = POSITIVE.
3. INVALID: No C line visible (regardless of T line). The test did not work properly.

DECISION PROCESS (follow step by step):
Step 1: Locate the result window on the cassette.
Step 2: Is there a colored line at the C position? If NO → respond "invalid".
Step 3: Is there a colored line at the T position? Examine carefully — is it a genuine pink/red band, or could it be a shadow, reflection, evaporation mark, or dried blood? 
Step 4: If the T area has NO genuine colored band → respond "negative". If there IS a genuine colored band at T → respond "positive".

Respond with ONLY one word: "positive", "negative", or "invalid".
Do NOT add any explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content?.toLowerCase().trim();
    
    let result: string;
    if (resultText?.includes("negative")) {
      result = "negative";
    } else if (resultText?.includes("positive")) {
      result = "positive";
    } else {
      result = "invalid";
    }

    console.log(`HIV test analysis completed for user ${user.id}: ${result}`);

    return new Response(
      JSON.stringify({ result, rawResponse: resultText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-hiv-test error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
