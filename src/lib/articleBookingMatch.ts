/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
/**
 * Matches an article's text to a bookable SWING Clinic service so the article
 * page can offer a real "จองคลินิก" button that opens the booking flow with the
 * right service preselected.
 *
 * Only services that are active in `booking_services` are routed to. The
 * keyword lists are written in canonical Thai; the reader-facing corpus uses a
 * phonetic spelling, so both sides are normalised by stripping Thai combining
 * vowels/tone marks before comparing ("ซิฟิลิส" and "ซฟิลิส" both reduce to
 * "ซฟลส").
 */

export interface ClinicServiceMatch {
  slug: string;
  name_th: string;
  name_en: string;
  icon: string;
  score: number;
}

interface ServiceRule {
  slug: string;
  name_th: string;
  name_en: string;
  icon: string;
  /** Latin terms matched on word boundaries (case-insensitive). */
  latin: string[];
  /** Thai terms matched as substrings on normalised text. */
  thai: string[];
  /** Higher weight wins when an article mentions several topics. */
  weight: number;
}

const THAI_COMBINING = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;

/** Lowercase + drop Thai combining marks so phonetic spellings still match. */
export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(THAI_COMBINING, "");
}

const RULES: ServiceRule[] = [
  {
    slug: "pep",
    name_th: "ปรึกษา PEP",
    name_en: "PEP consultation",
    icon: "🚨",
    latin: ["pep"],
    thai: ["หลังเสี่ ยง", "หลังมีความเสี่ ยง", "72 ชั่ วโมง", "ยาป้องกันหลัง", "ฉุกเฉิน"],
    weight: 4,
  },
  {
    slug: "prep-consultation",
    name_th: "PrEP ปรึกษา / ติดตาม",
    name_en: "PrEP consultation & follow-up",
    icon: "💊",
    latin: ["prep"],
    thai: ["เอาก่อน", "กอนมีความเสี่ ยง", "ยาป้องกอน", "ป้องกนก่อน", "เลื้ อกลองยา"],
    weight: 4,
  },
  {
    slug: "syphilis-testing",
    name_th: "ตรวจซิฟิลิส",
    name_en: "Syphilis testing",
    icon: "🧪",
    latin: ["syphilis"],
    thai: ["ซิฟิลิส", "โรคเอ ย", "แผลที่อวัยะ", "ผิ่ นที่ลลำตวั"],
    weight: 4,
  },
  {
    slug: "hepc-testing",
    name_th: "ตรวจไวรัสตับอักเสบซี",
    name_en: "Hepatitis C testing",
    icon: "🏥",
    latin: ["hcv", "hepatitis"],
    thai: ["ไวรัสตับอักเสบ", "ตับอักเสบซี", "ตับอักเสบ"],
    weight: 4,
  },
  {
    slug: "followup-consultation",
    name_th: "นัดติดตามผล",
    name_en: "Result follow-up",
    icon: "🔄",
    latin: ["follow-up", "followup"],
    thai: ["ติดตามผล", "นัดติดตาม", "รรับผล", "ติดตามตอเนื่ อง"],
    weight: 3,
  },
  {
    slug: "hiv-testing",
    name_th: "ตรวจ HIV",
    name_en: "HIV testing",
    icon: "🔬",
    latin: ["hiv", "aids", "selftest", "self test"],
    thai: ["ตรวจ", "ชุดตรวจ", "ผลบวก", "ระยะฟักตัว", "เอชไอว", "ไม่ตรวจ", "ตรวจเอง"],
    weight: 2,
  },
];

function countLatinTerm(text: string, term: string): number {
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[^a-z0-9])${safe}(?:[^a-z0-9]|$)`, "g");
  return (text.match(re) || []).length;
}

function countThaiTerm(text: string, term: string): number {
  let count = 0;
  let at = 0;
  while ((at = text.indexOf(term, at)) !== -1) {
    count += 1;
    at += term.length;
  }
  return count;
}

/**
 * Returns the clinic service that best fits the given text, or null when the
 * article has no clear clinical next step.
 */
export function matchClinicService(text: string | null): ClinicServiceMatch | null {
  if (!text) return null;
  const hay = normalizeForMatch(text);
  if (!hay.trim()) return null;

  let best: ClinicServiceMatch | null = null;

  for (const rule of RULES) {
    let hits = 0;
    for (const term of rule.latin) hits += countLatinTerm(hay, term) > 0 ? 1 : 0;
    for (const term of rule.thai) hits += countThaiTerm(hay, normalizeForMatch(term)) > 0 ? 1 : 0;
    if (hits === 0) continue;

    const score = rule.weight * 10 + Math.min(hits, 6);
    if (!best || score > best.score) best = { slug: rule.slug, name_th: rule.name_th, name_en: rule.name_en, icon: rule.icon, score };
  }

  return best;
}

/** Internal booking URL — never an external redirect. */
export function clinicBookingHref(service: ClinicServiceMatch | null): string {
  return service ? `/clinic/book?service=${encodeURIComponent(service.slug)}` : "/clinic/book";
}
