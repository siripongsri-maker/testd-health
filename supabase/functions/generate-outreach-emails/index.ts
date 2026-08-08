import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProspectInput {
  id: string;
  domain: string;
  authority_score?: number | null;
  links_to?: string | null;
  rationale?: string | null;
  contact_url?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin access required");

    const body = await req.json().catch(() => ({}));
    const language: "th" | "en" = body?.language === "en" ? "en" : "th";
    const senderName: string = String(body?.senderName ?? "ทีมงาน testD").slice(0, 120);
    const ids: string[] = Array.isArray(body?.prospectIds) ? body.prospectIds.slice(0, 10) : [];

    let query = supabase
      .from("seo_link_prospects")
      .select("id, domain, authority_score, links_to, rationale, contact_url")
      .order("authority_score", { ascending: false, nullsFirst: false })
      .limit(ids.length ? 10 : 5);
    if (ids.length) query = query.in("id", ids);

    const { data: prospects, error: pErr } = await query;
    if (pErr) throw new Error(pErr.message);
    if (!prospects?.length) throw new Error("No prospects found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You write short, credible link-building outreach emails for testD (https://testd.website), a Thai community health platform by SWING Thailand offering free HIV self-test kits, clinic bookings, PrEP/PEP information, and harm-reduction tools. Non-profit, stigma-free, WHO-inclusive language.

RULES:
- Language: ${language === "th" ? "Thai (polite, ครับ/ค่ะ neutral tone)" : "English"}.
- Max 150 words per email body. No hype, no fake flattery, no exaggerated claims.
- Personalize using the site's own focus and the provided rationale.
- Propose one concrete, useful resource to link (free HIV self-test kit request, clinic booking, or harm-reduction toolkit) and say why it helps THEIR audience.
- Offer reciprocity (we can list them as a partner resource).
- End with a single low-friction ask and sign as "${senderName}".
- Plain text only, no markdown, no placeholders like [NAME] except {{contact_name}} if a person's name is unknown.

Return STRICT JSON only: {"emails":[{"domain":"...","subject":"...","body":"..."}]}`;

    const userPrompt = `Write one email per site:\n\n${
      prospects
        .map((p: ProspectInput, i: number) =>
          `${i + 1}. domain: ${p.domain}\n   authority: ${p.authority_score ?? "n/a"}\n   already links to: ${p.links_to ?? "n/a"}\n   why they fit: ${p.rationale ?? "n/a"}`
        )
        .join("\n\n")
    }`;

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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "ใช้งานถี่เกินไป กรุณาลองใหม่อีกครั้ง" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด กรุณาเติมเครดิต" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error", status: response.status, details: t }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const raw: string = result.choices?.[0]?.message?.content ?? "";
    const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: { emails?: Array<{ domain?: string; subject?: string; body?: string }> } = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const m = jsonText.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    const byDomain = new Map(
      (parsed.emails ?? []).map((e) => [String(e.domain ?? "").toLowerCase().trim(), e]),
    );

    const emails = prospects.map((p: ProspectInput) => {
      const match = byDomain.get(p.domain.toLowerCase()) ?? (parsed.emails ?? [])[0];
      return {
        prospect_id: p.id,
        domain: p.domain,
        contact_url: p.contact_url ?? `https://${p.domain}`,
        subject: match?.subject?.trim() || `ขอความร่วมมือแหล่งข้อมูลตรวจ HIV ฟรี — testD x ${p.domain}`,
        body: match?.body?.trim() || "",
      };
    });

    return new Response(JSON.stringify({ emails, language }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-outreach-emails error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
