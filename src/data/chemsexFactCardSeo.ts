/**
 * Per-card SEO metadata for the 20 Chemsex Fact Cards.
 * Keeps search-relevant keywords, alt text and meta descriptions
 * separate from the content data so they can evolve independently.
 */
import type { ChemsexFactCard } from "./chemsexFactCards";
import { FACT_CARD_GROUPS } from "./chemsexFactCards";

interface CardSeoEntry {
  /** Search keywords (Thai) — real terms people search for */
  keywordsTh: string[];
  /** Search keywords (English) */
  keywordsEn: string[];
  /** Short search-intent phrase appended to alt text / descriptions */
  topicTh: string;
  topicEn: string;
}

export const CHEMSEX_CARD_SEO: Record<string, CardSeoEntry> = {
  "before-you-start": {
    keywordsTh: ["เตรียมตัวก่อนใช้สาร", "วางแผนความปลอดภัย chemsex", "แผนฉุกเฉิน", "สายด่วน 1669", "harm reduction เบื้องต้น"],
    keywordsEn: ["chemsex planning", "safer chemsex preparation", "emergency plan", "harm reduction basics"],
    topicTh: "วิธีเตรียมตัวและวางแผนก่อนใช้สารให้ปลอดภัย",
    topicEn: "how to plan and prepare for safer chemsex",
  },
  "during-session": {
    keywordsTh: ["ดูแลตัวเองระหว่างใช้สาร", "pace การใช้สาร", "dose timer", "พักระหว่าง fun", "ลดอันตรายระหว่างใช้"],
    keywordsEn: ["staying safe during chemsex", "pacing substance use", "dose timer", "harm reduction during session"],
    topicTh: "การดูแลตัวเองและลดอันตรายระหว่างใช้สาร",
    topicEn: "staying safer in real time during a session",
  },
  "after-session-recovery": {
    keywordsTh: ["ฟื้นฟูหลังใช้สาร", "recovery หลัง chemsex", "พักผ่อนหลังใช้สาร", "ดูแลร่างกายหลัง fun"],
    keywordsEn: ["chemsex recovery", "post-session self care", "comedown recovery tips"],
    topicTh: "การฟื้นฟูร่างกายและจิตใจหลังใช้สาร",
    topicEn: "physical and mental recovery after chemsex",
  },
  "drug-combinations": {
    keywordsTh: ["ผสมยาเสพติด", "GHB กับเหล้า", "ไอซ์ ป๊อปเปอร์", "ปฏิกิริยาระหว่างยา", "drug interaction ไทย", "อันตรายการผสมสาร"],
    keywordsEn: ["drug combinations chemsex", "GHB alcohol danger", "meth poppers interaction", "drug interaction checker"],
    topicTh: "ความเสี่ยงและปฏิกิริยาของการใช้สารหลายตัวร่วมกัน",
    topicEn: "risks of combining substances and dangerous interactions",
  },
  "overdose-response": {
    keywordsTh: ["overdose อาการ", "เกิดยาเกินขนาด", "recovery position", "ช่วยเหลือคน overdose", "โทร 1669", "สัญญาณเกินขนาด"],
    keywordsEn: ["overdose signs", "overdose first aid", "recovery position", "GHB overdose response", "call emergency 1669"],
    topicTh: "สัญญาณ overdose และวิธีช่วยเหลือเบื้องต้น",
    topicEn: "recognising overdose signs and how to respond",
  },
  "injecting-vs-non-injecting": {
    keywordsTh: ["ฉีดยาเสพติด", "ความเสี่ยงการใช้เข็มร่วม", "เข็มสะอาด ฟรี", "ติดเชื้อ HIV จากเข็ม", "ไวรัสตับอักเสบซี"],
    keywordsEn: ["injecting drug risks", "needle sharing HIV risk", "clean needle programme", "hepatitis C injecting"],
    topicTh: "ความเสี่ยงการฉีดสารเทียบกับวิธีอื่น และการใช้เข็มสะอาด",
    topicEn: "injecting vs non-injecting risks and clean equipment",
  },
  "chemsex-and-hiv": {
    keywordsTh: ["chemsex HIV", "ความเสี่ยง HIV จาก chemsex", "ตรวจ HIV ฟรี", "PrEP ป้องกัน HIV", "ตรวจ HIV ทุก 3 เดือน"],
    keywordsEn: ["chemsex HIV risk", "HIV prevention chemsex", "free HIV testing Bangkok", "PrEP chemsex"],
    topicTh: "ความสัมพันธ์ของ chemsex กับความเสี่ยง HIV และการป้องกัน",
    topicEn: "how chemsex contexts raise HIV risk and how to prevent it",
  },
  "prep-and-pep": {
    keywordsTh: ["PrEP คือ", "PEP 72 ชั่วโมง", "PrEP on demand 2-1-1", "ยาป้องกัน HIV", "PEP ฉุกเฉิน", "รับ PrEP ฟรี"],
    keywordsEn: ["PrEP daily vs on-demand", "PEP within 72 hours", "HIV prevention medication", "PrEP 2-1-1 dosing"],
    topicTh: "การใช้ PrEP และ PEP ป้องกัน HIV ในบริบท chemsex",
    topicEn: "using PrEP and PEP for HIV prevention in chemsex contexts",
  },
  "sti-testing-window": {
    keywordsTh: ["ตรวจโรคติดต่อทางเพศ", "ตรวจ STI หลังเสี่ยง", "ระยะฝักตัว หนองใน", "ตรวจซิฟิลิส", "window period HIV", "ตรวจ STI ฟรี"],
    keywordsEn: ["STI testing window period", "when to test after chemsex", "gonorrhoea chlamydia syphilis testing", "free STI test"],
    topicTh: "ช่วงเวลาที่เหมาะสมในการตรวจโรคติดต่อทางเพศสัมพันธ์แต่ละชนิด",
    topicEn: "the right testing window for each STI after a session",
  },
  "condoms-and-lube": {
    keywordsTh: ["ถุงยางกับเจลหล่อลื่น", "PrEP กัน STI ได้ไหม", "เจลซิลิโคน", "ถุงยางฟรี", "ลดเสี่ยง STI"],
    keywordsEn: ["condoms and lube chemsex", "does PrEP prevent STIs", "silicone lube long sessions", "free condoms Bangkok"],
    topicTh: "บทบาทของถุงยางและเจลหล่อลื่นเมื่อใช้ PrEP แล้ว",
    topicEn: "why condoms and lube still matter when you're on PrEP",
  },
  "the-crash": {
    keywordsTh: ["อาการดาวน์หลังใช้สาร", "comedown ไอซ์", "เศร้าหลังใช้สาร", "โดพามีนต่ำ", "ฟื้นฟูจิตใจหลัง chemsex"],
    keywordsEn: ["chemsex comedown", "emotional crash after meth", "post-session depression", "dopamine crash recovery"],
    topicTh: "ทำความเข้าใจอาการดิ่งดาวน์ทางอารมณ์หลังใช้สาร",
    topicEn: "understanding the emotional crash after a session",
  },
  "anxiety-shame-guilt": {
    keywordsTh: ["ความวิตกกังวลหลังใช้สาร", "ความอาย chemsex", "รับมือความรู้สึกผิด", "สุขภาพจิต chemsex", "ปรึกษาฟรี"],
    keywordsEn: ["chemsex anxiety shame guilt", "stigma and mental health", "free counseling MSM", "managing guilt after chemsex"],
    topicTh: "การจัดการความวิตกกังวล ความอาย และความรู้สึกผิด",
    topicEn: "managing anxiety, shame and guilt related to chemsex",
  },
  "when-to-seek-help": {
    keywordsTh: ["สัญญาณต้องขอความช่วยเหลือ", "สายด่วนสุขภาพจิต 1323", "ซึมเศร้า นอนไม่หลับ", "ใช้สารหยุดไม่ได้", "อยากทำร้ายตัวเอง"],
    keywordsEn: ["mental health warning signs chemsex", "Thailand mental health hotline 1323", "when to seek help substance use", "suicidal thoughts help"],
    topicTh: "สัญญาณเตือนสุขภาพจิตที่ควรขอความช่วยเหลือทันที",
    topicEn: "mental health warning signs that mean it's time to reach out",
  },
  "staying-connected": {
    keywordsTh: ["ลดความโดดเดี่ยว", "ชุมชน MSM", "peer support chemsex", "กิจกรรม SWING", "ไม่ตัดสิน"],
    keywordsEn: ["reducing isolation chemsex", "peer support community", "MSM community Bangkok", "non-judgemental support"],
    topicTh: "การลดการแยกตัวและสร้างเครือข่ายที่ไม่ตัดสิน",
    topicEn: "reducing isolation and finding non-judgemental community",
  },
  "client-pressure": {
    keywordsTh: ["ลูกค้ากดดันให้ใช้สาร", "sex worker ปฏิเสธลูกค้า", "ตั้งกฎกับลูกค้า", "ความปลอดภัย sex worker", "รายงานลูกค้ารุนแรง"],
    keywordsEn: ["client pressure chemsex", "sex worker safety rights", "setting boundaries with clients", "reporting violent clients"],
    topicTh: "การรับมือเมื่อลูกค้ากดดันให้ใช้สาร และสิทธิ์ในการปฏิเสธ",
    topicEn: "handling client pressure to use and your right to say no",
  },
  "work-safety-plan": {
    keywordsTh: ["แผนความปลอดภัย sex worker", "เช็คอินกับเพื่อน", "ข้อความลับฉุกเฉิน", "ส่งโลเคชั่นเพื่อน", "แผนฉุกเฉินการทำงาน"],
    keywordsEn: ["sex worker safety plan", "check-in buddy system", "code word emergency", "work safety planning chemsex"],
    topicTh: "การวางแผนความปลอดภัยในการทำงานแบบใช้ได้จริง",
    topicEn: "building a practical safety plan for work",
  },
  "know-your-rights": {
    keywordsTh: ["สิทธิ์เมื่อโดนจับยาเสพติด", "พ.ร.บ. ยาเสพติด 2564", "บำบัดแทนคุก", "สิทธิ์ขอทนาย", "ทนายฟรี SWING"],
    keywordsEn: ["drug possession rights Thailand", "2021 Narcotics Code treatment", "right to a lawyer Thailand", "free legal support sex workers"],
    topicTh: "สิทธิ์ทางกฎหมายของผู้ใช้สารและ sex worker ในประเทศไทย",
    topicEn: "legal rights and risk reduction for people who use drugs in Thailand",
  },
  "migrant-msw-support": {
    keywordsTh: ["migrant sex worker ไทย", "ตรวจ HIV ไม่มีบัตร", "บริการภาษาลาว เขมร", "ล่าม SWING", "ช่วยเหลือแรงงานข้ามชาติ"],
    keywordsEn: ["migrant sex worker support Thailand", "HIV testing without ID card", "Lao Khmer language services", "migrant MSW rights"],
    topicTh: "บริการสำหรับ migrant sex workers ที่ไม่มีบัตรก็เข้าถึงได้",
    topicEn: "accessible services for migrant sex workers regardless of documents",
  },
  "first-visit-to-swing": {
    keywordsTh: ["ไปคลินิก SWING ครั้งแรก", "ตรวจ HIV ที่ไหนดี", "คลินิกไม่ตัดสิน", "รับ PrEP ฟรี กรุงเทพ", "จองตรวจ HIV"],
    keywordsEn: ["first visit SWING clinic", "what to expect HIV clinic Bangkok", "judgement-free clinic", "free PrEP Bangkok"],
    topicTh: "สิ่งที่จะได้พบเมื่อมาใช้บริการที่ SWING ครั้งแรก",
    topicEn: "what to expect on your first visit to a SWING clinic",
  },
  "confidentiality-and-rights": {
    keywordsTh: ["ความลับผลตรวจ HIV", "ข้อมูลส่วนตัว PDPA", "UIC code SWING", "สิทธิ์เข้าถึงข้อมูลสุขภาพ", "คลินิกเก็บความลับ"],
    keywordsEn: ["HIV test confidentiality Thailand", "PDPA health data rights", "anonymous HIV testing", "patient privacy rights"],
    topicTh: "ความลับของข้อมูลและสิทธิ์ของผู้รับบริการด้านสุขภาพ",
    topicEn: "confidentiality and your rights in health services",
  },
};

const FALLBACK: CardSeoEntry = {
  keywordsTh: ["chemsex", "ลดอันตราย", "harm reduction"],
  keywordsEn: ["chemsex", "harm reduction"],
  topicTh: "ความรู้ลดอันตรายจากการใช้สาร",
  topicEn: "chemsex harm reduction knowledge",
};

export function getCardSeo(card: ChemsexFactCard): CardSeoEntry {
  return CHEMSEX_CARD_SEO[card.slug] ?? FALLBACK;
}

/** Localized keywords string for <meta name="keywords"> and JSON-LD. */
export function getFactCardKeywords(card: ChemsexFactCard, lang: "th" | "en"): string {
  const seo = getCardSeo(card);
  const group = lang === "en" ? FACT_CARD_GROUPS[card.group].en : FACT_CARD_GROUPS[card.group].th;
  const base = lang === "en" ? seo.keywordsEn : seo.keywordsTh;
  const shared = lang === "en"
    ? ["testD", "SWING Foundation", "chemsex fact card"]
    : ["testD", "มูลนิธิ SWING", "การ์ดความรู้ chemsex"];
  return [...base, ...shared, group].join(", ");
}

/** Descriptive, localized alt text for the printed card artwork images. */
export function getFactCardAlt(
  card: ChemsexFactCard,
  lang: "th" | "en",
  side: "front" | "back" | "thumb" = "thumb",
): string {
  const seo = getCardSeo(card);
  const num = String(card.number).padStart(2, "0");
  const title = lang === "en" ? card.titleEn : card.titleTh;
  const topic = lang === "en" ? seo.topicEn : seo.topicTh;
  if (lang === "en") {
    if (side === "front") return `Chemsex fact card ${num} front — ${title}: ${topic}`;
    if (side === "back") return `Chemsex fact card ${num} back — services linked to "${title}": ${card.ctas.map((c) => c.service).join(", ")}`;
    return `Chemsex fact card ${num} — ${title}: ${topic}`;
  }
  if (side === "front") return `การ์ดความรู้ Chemsex ใบที่ ${num} ด้านหน้า — ${title}: ${topic}`;
  if (side === "back") return `การ์ดความรู้ Chemsex ใบที่ ${num} ด้านหลัง — บริการที่เชื่อมกับ "${title}": ${card.ctas.map((c) => c.service).join(", ")}`;
  return `การ์ดความรู้ Chemsex ใบที่ ${num} — ${title}: ${topic}`;
}

/** Search-optimized meta description (≤155 chars) per card and language. */
export function getFactCardMetaDescription(card: ChemsexFactCard, lang: "th" | "en"): string {
  const seo = getCardSeo(card);
  const tagline = lang === "en" ? card.taglineEn : card.taglineTh;
  const topic = lang === "en" ? seo.topicEn : seo.topicTh;
  const services = card.ctas.map((c) => c.service).slice(0, 2).join(lang === "en" ? " & " : " และ ");
  const text = lang === "en"
    ? `${tagline} — Fact card ${String(card.number).padStart(2, "0")} on ${topic}. Linked services: ${services}.`
    : `${tagline} — การ์ดความรู้ใบที่ ${String(card.number).padStart(2, "0")} เรื่อง${topic} บริการที่เชื่อมต่อ: ${services}`;
  return text.length > 155 ? `${text.slice(0, 152)}...` : text;
}
