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

    const prompt = `You are analyzing an Abbott Panbio HIV Self Test result. This is a blood-based rapid test with a result window showing two possible lines:
- C line (Control line) - at the top position
- T line (Test line) - at the bottom position

CRITICAL INTERPRETATION RULES (follow exactly):

1. POSITIVE (陽性): BOTH the C line AND T line are visible. The T line can be faint or strong - any visible line counts. Two lines visible = POSITIVE.

2. NEGATIVE (陰性): ONLY the C line is visible. There is NO T line at all. One line at C position only = NEGATIVE.

3. INVALID (無效): The C line is NOT visible, regardless of whether T line is visible or not. No C line = INVALID test.

Look at the test cassette in the image carefully:
- Check the C position (top) - is there a colored line?
- Check the T position (bottom) - is there a colored line?

Respond with ONLY one of these three words: "positive", "negative", or "invalid"

Remember: Even a very faint T line still means POSITIVE. The C line MUST be visible for the test to be valid.`;

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
