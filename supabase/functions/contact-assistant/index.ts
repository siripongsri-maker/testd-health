/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateResponse } from "npm:@lovable.dev/ai-gateway";

const SYSTEM = `You are the automatic help assistant on the testD contact page (SWING Foundation, Thailand).
Answer ONLY questions about HIV testing, HIV/STI self-test kits (finger-prick, oral fluid, syphilis, dual HIV+syphilis, gonorrhea/chlamydia), window periods, reading results, PrEP/PEP basics and how to get tested.
Reply in the user's language (Thai by default), warm, non-judgmental, under 150 words, bullets when useful.
Facts: rapid antibody tests are reliable ~12 weeks after exposure (blood detects earlier than oral). A faint line on the test line usually counts as reactive — confirm at a clinic. Reactive = screening only, confirm at clinic. Invalid = no control line, use a new kit. Exposure within 72 hours → go for PEP now, don't wait to test. Free HIV self-test kits: /th/hiv-selftest. Book SWING Clinic: /th/clinic/book. Phone +66 2 632 9501. Human staff via LINE: https://lin.ee/5flow4L.
Never diagnose, never give drug-use dosing, never ask for names/phone/ID. Emergencies → call 1669. For anything off-topic or personal, suggest LINE staff or the clinic. Always note briefly that you are an automatic assistant when giving medical-type answers.`;

const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || now - e.t > 600_000) { hits.set(ip, { n: 1, t: now }); return false; }
  return ++e.n > 20;
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    if (limited(ip)) return json({ error: "rate_limited" }, 429);
    const body = await req.json().catch(() => null);
    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs || msgs.length === 0 || msgs.length > 20) return json({ error: "messages required" }, 400);
    const rawSession = typeof body?.session_id === "string" ? body.session_id : "";
    const sessionId = /^[A-Za-z0-9-]{8,64}$/.test(rawSession) ? rawSession : null;
    const input = msgs.slice(-10).map((m: { role?: string; content?: unknown }) => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: String(m.content ?? "").slice(0, 800),
    }));
    const res = await generateResponse({ model: "openai/gpt-6-astra", instructions: SYSTEM, input });
    // deno-lint-ignore no-explicit-any
    const text = ((res as any).output ?? [])
      // deno-lint-ignore no-explicit-any
      .flatMap((o: any) => o.content ?? [])
      // deno-lint-ignore no-explicit-any
      .filter((c: any) => c.type === "output_text")
      // deno-lint-ignore no-explicit-any
      .map((c: any) => c.text).join("\n").trim();
    if (sessionId && text) {
      const lastUser = input[input.length - 1];
      const { error } = await supabase.from("contact_chat_messages").insert([
        { session_id: sessionId, role: "user", content: lastUser.content },
        { session_id: sessionId, role: "assistant", content: text },
      ]);
      if (error) console.error("contact_chat_messages insert failed", error.message);
    }
    return json({ reply: text || null });
  } catch (e) {
    console.error("contact-assistant failed", e);
    return json({ error: "failed" }, 500);
  }
});
