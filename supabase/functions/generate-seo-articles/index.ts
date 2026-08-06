import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────────────────────
// SEO topic plan — 50 articles across the site's existing categories
// ─────────────────────────────────────────────────────────────
type Topic = {
  slug: string;
  category: string; // blog_categories.slug
  th: string;       // Thai working title / angle
  keywords: string; // primary Thai + English search terms
};

export const TOPICS: Topic[] = [
  // ── PrEP (10)
  { slug: "prep-คืออะไร-เริ่มยังไง", category: "prep", th: "PrEP คืออะไร เริ่มกินยังไง ต้องตรวจอะไรบ้าง", keywords: "PrEP คืออะไร, เริ่ม PrEP, prep hiv thailand" },
  { slug: "prep-ฟรี-ที่ไหน-ประเทศไทย", category: "prep", th: "รับ PrEP ฟรีได้ที่ไหนในไทย และใช้สิทธิอะไรได้บ้าง", keywords: "PrEP ฟรี, สิทธิบัตรทอง PrEP, free prep thailand" },
  { slug: "prep-on-demand-2-1-1", category: "prep", th: "PrEP แบบ On-Demand (2-1-1) กินยังไงให้ถูกวิธี", keywords: "PrEP on demand, 2-1-1, prep เฉพาะกิจ" },
  { slug: "prep-ผลข้างเคียง", category: "prep", th: "ผลข้างเคียงของ PrEP มีอะไรบ้าง และรับมืออย่างไร", keywords: "PrEP ผลข้างเคียง, prep side effects" },
  { slug: "prep-ลืมกินยา-ทำยังไง", category: "prep", th: "ลืมกิน PrEP ทำยังไงต่อ ยังป้องกันได้อยู่ไหม", keywords: "ลืมกิน PrEP, missed prep dose" },
  { slug: "prep-vs-pep-ต่างกันยังไง", category: "prep", th: "PrEP กับ PEP ต่างกันยังไง เลือกแบบไหนดี", keywords: "PrEP PEP ต่างกัน, prep vs pep" },
  { slug: "prep-ฉีด-lenacapavir", category: "prep", th: "PrEP แบบฉีดออกฤทธิ์ยาว รู้จัก Lenacapavir และ CAB-LA", keywords: "PrEP ฉีด, lenacapavir, cabotegravir prep" },
  { slug: "prep-สำหรับ-transgender", category: "prep", th: "PrEP กับฮอร์โมนข้ามเพศ ใช้ร่วมกันได้ไหม", keywords: "PrEP transgender, PrEP ฮอร์โมน" },
  { slug: "prep-ตรวจติดตาม-ทุก-3-เดือน", category: "prep", th: "ทำไมต้องตรวจติดตามทุก 3 เดือนเมื่อใช้ PrEP", keywords: "PrEP ตรวจติดตาม, prep follow up" },
  { slug: "prep-ความเข้าใจผิด", category: "prep", th: "10 ความเข้าใจผิดเรื่อง PrEP ที่ยังได้ยินบ่อย", keywords: "PrEP ความเข้าใจผิด, prep myths" },

  // ── PEP (6)
  { slug: "pep-72-ชั่วโมง", category: "pep", th: "PEP ต้องเริ่มภายใน 72 ชั่วโมง เริ่มช้าแล้วยังทันไหม", keywords: "PEP 72 ชั่วโมง, pep hiv" },
  { slug: "pep-ขอที่ไหน-กรุงเทพ", category: "pep", th: "ขอยา PEP ที่ไหนได้บ้างในกรุงเทพและพัทยา", keywords: "PEP ที่ไหน, pep bangkok, ยาต้านฉุกเฉิน" },
  { slug: "pep-ราคา-สิทธิ", category: "pep", th: "PEP ราคาเท่าไร ใช้สิทธิอะไรได้บ้าง", keywords: "PEP ราคา, pep cost thailand" },
  { slug: "pep-กินครบ-28-วัน", category: "pep", th: "กิน PEP ครบ 28 วันสำคัญแค่ไหน และต้องตรวจซ้ำเมื่อไร", keywords: "PEP 28 วัน, pep follow up test" },
  { slug: "pep-ถุงยางแตก-ทำยังไง", category: "pep", th: "ถุงยางแตกหรือหลุด ควรทำอะไรใน 24 ชั่วโมงแรก", keywords: "ถุงยางแตก, condom broke hiv risk" },
  { slug: "pep-หลังถูกล่วงละเมิด", category: "pep", th: "หลังถูกล่วงละเมิดทางเพศ: PEP การตรวจ และการดูแลใจ", keywords: "PEP ล่วงละเมิด, sexual assault care thailand" },

  // ── STI + HIV testing (12)
  { slug: "hiv-self-test-ใช้ยังไง", category: "sti", th: "ชุดตรวจ HIV ด้วยตัวเอง ใช้ยังไงให้ผลแม่นยำ", keywords: "ชุดตรวจ HIV ด้วยตัวเอง, hiv self test kit" },
  { slug: "hiv-window-period", category: "sti", th: "Window period คืออะไร ควรตรวจ HIV ตอนไหนถึงจะชัวร์", keywords: "window period hiv, ตรวจ HIV เมื่อไหร่" },
  { slug: "ผลตรวจ-hiv-ขึ้น-2-ขีด", category: "sti", th: "ผลชุดตรวจขึ้น 2 ขีด ต้องทำอะไรต่อ", keywords: "ผลตรวจ HIV 2 ขีด, reactive hiv test" },
  { slug: "ตรวจ-hiv-ฟรี-นิรนาม", category: "sti", th: "ตรวจ HIV ฟรีและไม่ต้องบอกชื่อ ทำได้จริงไหม", keywords: "ตรวจ HIV ฟรี, ตรวจนิรนาม, anonymous hiv test" },
  { slug: "u-equals-u-คืออะไร", category: "sti", th: "U=U คืออะไร ตรวจไม่เจอ = ไม่ส่งต่อ จริงหรือ", keywords: "U=U, undetectable untransmittable, ตรวจไม่เจอเท่ากับไม่แพร่" },
  { slug: "ซิฟิลิส-อาการ-รักษา", category: "sti", th: "ซิฟิลิส: อาการที่มักถูกมองข้าม การตรวจ และการรักษา", keywords: "ซิฟิลิส อาการ, syphilis thailand" },
  { slug: "หนองใน-หนองในเทียม", category: "sti", th: "หนองในกับหนองในเทียมต่างกันยังไง", keywords: "หนองใน, หนองในเทียม, gonorrhea chlamydia" },
  { slug: "hpv-วัคซีน-ผู้ชาย", category: "sti", th: "วัคซีน HPV สำหรับผู้ชายและ LGBTQ+ จำเป็นไหม", keywords: "วัคซีน HPV ผู้ชาย, hpv vaccine msm" },
  { slug: "ไวรัสตับอักเสบ-บี-ซี", category: "sti", th: "ไวรัสตับอักเสบ B และ C กับเพศสัมพันธ์และการใช้เข็ม", keywords: "ไวรัสตับอักเสบ บี ซี, hepatitis b c thailand" },
  { slug: "เริม-อาการ-ดูแล", category: "sti", th: "เริมที่อวัยวะเพศ: อาการ การดูแล และการอยู่กับมัน", keywords: "เริม อวัยวะเพศ, genital herpes" },
  { slug: "ตรวจ-sti-บ่อยแค่ไหน", category: "sti", th: "ควรตรวจ STI บ่อยแค่ไหน เช็กลิสต์ตามพฤติกรรม", keywords: "ตรวจ STI บ่อยแค่ไหน, sti screening frequency" },
  { slug: "doxypep-คืออะไร", category: "sti", th: "DoxyPEP คืออะไร ป้องกันซิฟิลิสได้จริงไหม", keywords: "DoxyPEP, doxycycline pep" },

  // ── Harm reduction (10)
  { slug: "chemsex-ดูแลตัวเอง", category: "harm-reduction", th: "Chemsex กับการดูแลตัวเองแบบไม่ตัดสิน", keywords: "chemsex, ลดอันตราย, harm reduction thailand" },
  { slug: "poppers-ปลอดภัยแค่ไหน", category: "harm-reduction", th: "Poppers ทำงานกับร่างกายยังไง และความเสี่ยงที่ควรรู้", keywords: "poppers, alkyl nitrite" },
  { slug: "ยาเสพติดกับ-prep-ตีกันไหม", category: "harm-reduction", th: "สารเสพติดกับยา PrEP/ARV ตีกันไหม เช็กก่อนใช้", keywords: "drug interaction prep, ยาตีกัน" },
  { slug: "overdose-สัญญาณฉุกเฉิน", category: "harm-reduction", th: "สัญญาณ Overdose และสิ่งที่ต้องทำใน 5 นาทีแรก", keywords: "overdose สัญญาณ, ปฐมพยาบาล overdose" },
  { slug: "ใช้เข็มปลอดภัย", category: "harm-reduction", th: "ใช้เข็มให้ปลอดภัยขึ้น: หลักการลดอันตรายพื้นฐาน", keywords: "เข็มสะอาด, needle safety harm reduction" },
  { slug: "ดื่มน้ำ-พักผ่อน-หลังปาร์ตี้", category: "harm-reduction", th: "แผนฟื้นตัวหลังปาร์ตี้: น้ำ อาหาร การนอน และการเช็กใจ", keywords: "recovery after party, ฟื้นตัวหลังใช้สาร" },
  { slug: "แผนความปลอดภัยส่วนตัว", category: "harm-reduction", th: "ทำแผนความปลอดภัยส่วนตัวก่อนออกไปข้างนอก", keywords: "safety plan, แผนความปลอดภัย" },
  { slug: "gbl-ghb-ความเสี่ยง", category: "harm-reduction", th: "GHB/GBL: เส้นแบ่งบางระหว่างเคลิ้มกับหมดสติ", keywords: "GHB GBL, ความเสี่ยง" },
  { slug: "เมท-ผลต่อร่างกาย-จิตใจ", category: "harm-reduction", th: "เมทแอมเฟตามีนกับร่างกายและจิตใจ: สิ่งที่เกิดขึ้นจริง", keywords: "เมท, methamphetamine harm reduction" },
  { slug: "ขอความช่วยเหลือ-ไม่ถูกตัดสิน", category: "harm-reduction", th: "อยากเลิกหรืออยากปรึกษา: บริการที่ไม่ตัดสินในไทย", keywords: "ปรึกษาการใช้สาร, บริการไม่ตัดสิน" },

  // ── Mental health (6)
  { slug: "เครียดหลังเสี่ยง-hiv-anxiety", category: "mental-health", th: "กังวลหลังมีความเสี่ยง: วิธีดูแลใจระหว่างรอผลตรวจ", keywords: "กังวล HIV, hiv anxiety, รอผลตรวจ" },
  { slug: "ตีตราตัวเอง-self-stigma", category: "mental-health", th: "การตีตราตัวเองเมื่ออยู่กับ HIV และวิธีคลายมัน", keywords: "self stigma hiv, ตีตรา" },
  { slug: "phq4-เช็กใจ-2-นาที", category: "mental-health", th: "เช็กใจใน 2 นาทีด้วย PHQ-4 และอ่านผลยังไง", keywords: "PHQ-4, แบบประเมินสุขภาพจิต" },
  { slug: "นอนไม่หลับ-หลังใช้สาร", category: "mental-health", th: "นอนไม่หลับหลังใช้สาร: ปรับยังไงให้กลับมาพัก", keywords: "นอนไม่หลับ, sleep recovery" },
  { slug: "ความสัมพันธ์-เปิดเผยสถานะ", category: "mental-health", th: "จะบอกคู่เรื่องสถานะ HIV ยังไงให้ปลอดภัยกับทั้งสองฝ่าย", keywords: "เปิดเผยสถานะ HIV, hiv disclosure" },
  { slug: "สายด่วน-ช่วยเหลือ-ฉุกเฉิน", category: "mental-health", th: "เมื่อรู้สึกไม่ไหว: สายด่วนและบริการช่วยเหลือในไทย", keywords: "สายด่วนสุขภาพจิต 1323, 1669" },

  // ── Lifestyle (6)
  { slug: "คุยเรื่องถุงยางกับคู่", category: "lifestyle", th: "ชวนคู่คุยเรื่องถุงยางยังไงไม่ให้บรรยากาศเสีย", keywords: "คุยเรื่องถุงยาง, condom negotiation" },
  { slug: "เลือกถุงยาง-เจล-หล่อลื่น", category: "lifestyle", th: "เลือกถุงยางและเจลหล่อลื่นให้เหมาะกับตัวเอง", keywords: "เลือกถุงยาง, เจลหล่อลื่น" },
  { slug: "เดตแอป-ปลอดภัย", category: "lifestyle", th: "ใช้เดตแอปให้ปลอดภัย: นัดเจอ ข้อมูลส่วนตัว และขอบเขต", keywords: "เดตแอป ปลอดภัย, dating app safety" },
  { slug: "consent-การยินยอม", category: "lifestyle", th: "Consent ไม่ใช่แค่คำว่าใช่: การยินยอมในชีวิตจริง", keywords: "consent, การยินยอม" },
  { slug: "sex-worker-สิทธิ-สุขภาพ", category: "lifestyle", th: "พนักงานบริการกับสิทธิสุขภาพที่เข้าถึงได้", keywords: "sex worker สิทธิ, พนักงานบริการ สุขภาพ" },
  { slug: "ภาพหลุด-ทำยังไง", category: "lifestyle", th: "ถ้าภาพหรือคลิปส่วนตัวหลุด ควรทำอะไรก่อน", keywords: "ภาพหลุด, image based abuse ไทย" },
];

const SYSTEM_PROMPT = `You write public health content for testD, a Thai sexual-health and harm-reduction platform operated with SWING Foundation.

Rules:
- Thai-first. Warm, non-judgemental, plain language. Use inclusive WHO terminology ("ผู้ใช้สารออกฤทธิ์", "พนักงานบริการ"), never moralising or shaming words.
- Never give dosing instructions, sourcing advice, or anything that reads as encouragement to use substances. Harm reduction = safety information only.
- Thai medical/service facts only: NHSO/บัตรทอง, สายด่วน 1663 / 1323 / 1669, SWING Clinic +66 2 632 9501, branches Silom, Saphan Kwai, Phetkasem, Pattaya.
- Refer readers to internal services only: /hiv-selftest (ขอชุดตรวจ / รายงานผล), /clinic/book (จองตรวจฟรี), /harm-reduction, /support. Never link to external clinics.
- No invented statistics, testimonials, or guarantees. If a number is uncertain, describe it qualitatively.
- Markdown body: one H1 is NOT included (the site renders the title), start with a short hook paragraph, then ## sections, bullet lists, a "คำถามที่พบบ่อย" FAQ section with 3-4 Q&A, and a closing call to action pointing at an internal service link.
- Length: 900-1300 Thai words equivalent; the English version is a faithful, natural translation (not machine-literal).
- image_prompt: an English prompt for a semi-realistic editorial photograph illustrating the topic — respectful, no explicit content, no readable text, no identifiable faces of real people, warm natural light, Thai urban or clinic setting where relevant.`;

const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title_th", "title_en", "excerpt_th", "excerpt_en", "content_th", "content_en", "image_prompt"],
  properties: {
    title_th: { type: "string" },
    title_en: { type: "string" },
    excerpt_th: { type: "string" },
    excerpt_en: { type: "string" },
    content_th: { type: "string" },
    content_en: { type: "string" },
    image_prompt: { type: "string" },
  },
};

async function generateArticle(lovableKey: string, topic: Topic) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      stream: true,
      store: false,
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        {
          role: "user",
          content: [{
            type: "input_text",
            text: `หัวข้อ: ${topic.th}\nคำค้นหาเป้าหมาย (SEO): ${topic.keywords}\n\nเขียนบทความตามกติกา และคืนค่าเป็น JSON ตาม schema. title_th ควรมีคำค้นหาหลักและยาวไม่เกิน 60 ตัวอักษร, excerpt ไม่เกิน 160 ตัวอักษร.`,
          }],
        },
      ],
      text: {
        format: { type: "json_schema", name: "article", strict: true, schema: ARTICLE_SCHEMA },
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`AI ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let text = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
          if (evt.type === "response.completed" && evt.response?.output_text) {
            const full = Array.isArray(evt.response.output_text)
              ? evt.response.output_text.join("")
              : evt.response.output_text;
            if (full && full.length > text.length) text = full;
          }
          if (evt.type === "error") throw new Error(evt.error?.message || "AI stream error");
        } catch (_e) { /* ignore partial frames */ }
      }
    }
  }
  if (!text.trim()) throw new Error("Empty AI response");
  return JSON.parse(text) as Record<string, string>;
}

async function generateCover(lovableKey: string, prompt: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        messages: [{
          role: "user",
          content: `Semi-realistic editorial photograph, 16:9 wide magazine cover image. ${prompt} No text, no logos, no watermarks, no readable writing. Respectful, warm natural light, shallow depth of field, documentary style.`,
        }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return null;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch (_e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));

    if (body.action === "list") {
      const { data: existing } = await admin.from("blog_articles").select("slug");
      const done = new Set((existing || []).map((a: { slug: string }) => a.slug));
      return json({
        total: TOPICS.length,
        topics: TOPICS.map((t, i) => ({ index: i, slug: t.slug, category: t.category, title: t.th, exists: done.has(t.slug) })),
      });
    }

    const index = Number(body.index);
    const topic = TOPICS[index];
    if (!topic) return json({ error: "Invalid topic index" }, 400);

    const { data: existing } = await admin.from("blog_articles").select("id").eq("slug", topic.slug).maybeSingle();
    if (existing && !body.force) return json({ skipped: true, slug: topic.slug });

    const { data: cat } = await admin.from("blog_categories").select("id").eq("slug", topic.category).maybeSingle();

    const article = await generateArticle(lovableKey, topic);

    let coverUrl: string | null = null;
    const image = await generateCover(lovableKey, article.image_prompt || topic.th);
    if (image) {
      const path = `covers/seo/${topic.slug}-${Date.now()}.png`;
      const { error: upErr } = await admin.storage.from("blog-images").upload(path, image, {
        contentType: "image/png",
        upsert: true,
      });
      if (!upErr) {
        coverUrl = admin.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
      }
    }

    const row = {
      slug: topic.slug,
      category_id: cat?.id ?? null,
      title_th: article.title_th,
      title_en: article.title_en,
      excerpt_th: article.excerpt_th,
      excerpt_en: article.excerpt_en,
      content_th: article.content_th,
      content_en: article.content_en,
      cover_url: coverUrl,
      author_name: "ทีม testD",
      status: body.status || "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await admin.from("blog_articles").update(row).eq("id", existing.id)
      : await admin.from("blog_articles").insert(row);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, slug: topic.slug, title: article.title_th, cover: !!coverUrl });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
