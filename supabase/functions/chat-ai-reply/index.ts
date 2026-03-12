import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const { thread_id, action, text } = await req.json();

    // action: "suggest" | "shorten" | "friendlier" | "clearer" | "translate"
    if (!thread_id && action === "suggest") throw new Error("thread_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = `You are an AI assistant helping support staff at testD, a community health app focused on HIV prevention, PrEP, PEP, and sexual health in Thailand.

CRITICAL RULES:
- Write in Thai by default unless the conversation is clearly in English
- Be empathetic, warm, non-judgmental, and stigma-free
- NEVER provide medical diagnosis or medical advice
- NEVER hallucinate medical claims
- Encourage professional consultation when appropriate
- Keep responses concise (2-4 sentences max)
- Use polite Thai particles (ค่ะ/ครับ/นะคะ/นะครับ)
- Be sensitive to the context of HIV/sexual health support`;

    let userPrompt = "";

    if (action === "suggest") {
      // Get recent messages for context
      const { data: messages } = await supabase
        .from("direct_chat_messages")
        .select("sender_role, message_text, created_at")
        .eq("thread_id", thread_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(10);

      const context = (messages || [])
        .reverse()
        .map((m: any) => `[${m.sender_role}]: ${m.message_text}`)
        .join("\n");

      userPrompt = `Based on this support conversation, suggest a helpful reply from the staff perspective:\n\n${context}\n\nGenerate a suggested staff reply:`;
    } else if (action === "shorten") {
      userPrompt = `Shorten this support reply while keeping the meaning and empathetic tone:\n\n${text}`;
    } else if (action === "friendlier") {
      userPrompt = `Make this support reply warmer and friendlier:\n\n${text}`;
    } else if (action === "clearer") {
      userPrompt = `Make this support reply clearer and easier to understand:\n\n${text}`;
    } else if (action === "translate") {
      userPrompt = `Translate this message. If it's in Thai, translate to English. If it's in English, translate to Thai. Keep the supportive tone:\n\n${text}`;
    } else {
      throw new Error("Invalid action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ suggestion: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-ai-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
