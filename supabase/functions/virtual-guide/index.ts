import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZONE_MAP: Record<string, { route: string; label: string }> = {
  test: { route: "/hiv-selftest", label: "Testing Station" },
  testing: { route: "/hiv-selftest", label: "Testing Station" },
  hiv: { route: "/hiv-selftest", label: "Testing Station" },
  book: { route: "/booking", label: "Booking Desk" },
  booking: { route: "/booking", label: "Booking Desk" },
  appointment: { route: "/my-appointments", label: "My Appointments" },
  learn: { route: "/info", label: "Learning Corner" },
  article: { route: "/info", label: "Learning Corner" },
  selfcare: { route: "/self-care", label: "Self-Care Corner" },
  "self-care": { route: "/self-care", label: "Self-Care Corner" },
  community: { route: "/community", label: "Community Lounge" },
  chat: { route: "/community", label: "Community Lounge" },
  prevention: { route: "/prevention-match", label: "Prevention Match" },
  prep: { route: "/prevention-match", label: "Prevention Match" },
  harm: { route: "/harm-reduction", label: "Harm Reduction Zone" },
  drug: { route: "/harm-reduction", label: "Harm Reduction Zone" },
  staff: { route: "/support-chat", label: "Talk to Staff" },
  help: { route: "/support-chat", label: "Support Desk" },
  support: { route: "/support-chat", label: "Support Desk" },
  start: { route: "/hiv-selftest", label: "Testing Station" },
  begin: { route: "/onboarding", label: "Getting Started" },
  home: { route: "/", label: "Welcome Hub" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are the testD Virtual Guide — a friendly, inclusive health assistant helping users navigate the testD virtual service space.

Your role:
- Help users find the right service zone
- Answer basic navigation questions
- Be warm, non-judgmental, and privacy-conscious
- Keep responses SHORT (2-3 sentences max)
- When you identify what the user needs, include a JSON action block at the end of your response

Available zones and routes:
- Welcome Hub → /
- Testing Station (HIV self-test) → /hiv-selftest
- Booking Desk → /booking
- My Appointments → /my-appointments
- Learning Corner (articles) → /info
- Self-Care Corner → /self-care
- Community Lounge → /community
- Prevention Match → /prevention-match
- Harm Reduction Zone → /harm-reduction
- Talk to Staff → /support-chat

When you want to suggest navigation, end your message with exactly this format on a new line:
[ACTION:navigate:/route]

Language: Respond in ${language === "th" ? "Thai" : "English"}.
Do NOT reveal sensitive health data or ask for personal information.`;

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
          { role: "user", content: message },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    // Extract action if present
    const actionMatch = reply.match(/\[ACTION:navigate:(\/[^\]]+)\]/);
    const cleanReply = reply.replace(/\[ACTION:navigate:\/[^\]]+\]/g, "").trim();

    return new Response(
      JSON.stringify({
        reply: cleanReply,
        action: actionMatch ? { type: "navigate", route: actionMatch[1] } : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("virtual-guide error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
