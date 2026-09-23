import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RelatedSurvey {
  id: string;
  title_th: string;
  title_en: string;
  description_th: string | null;
  description_en: string | null;
  xp_reward: number;
  is_native: boolean;
  url: string | null;
  score: number;
}

const STOP_WORDS = new Set([
  "และ", "หรือ", "ของ", "การ", "ความ", "แบบ", "สำหรับ", "เกี่ยวกับ", "ที่", "ใน", "กับ",
  "แบบสำรวจ", "แบบสอบถาม", "แบบประเมิน", "survey", "form", "the", "and", "for", "about", "with",
]);

/** Split Thai/English text into comparable keyword chunks. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./()"'“”\-–—:;!?|\[\]{}]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function scoreMatch(surveyText: string, articleText: string): number {
  const haystack = articleText.toLowerCase();
  let score = 0;
  for (const token of new Set(tokenize(surveyText))) {
    if (haystack.includes(token)) score += token.length >= 5 ? 2 : 1;
  }
  return score;
}

/**
 * Finds the survey most related to an article's topic.
 * Falls back to the newest open survey so readers always get a next step.
 */
export function useRelatedSurvey(articleText: string | null) {
  const [survey, setSurvey] = useState<RelatedSurvey | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title_th, title_en, description_th, description_en, xp_reward, is_native, url, created_at")
        .eq("is_active", true)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error || !data || data.length === 0 || cancelled) return;

      const text = articleText || "";
      const ranked = data
        .map((s) => ({
          ...s,
          score: text
            ? scoreMatch(`${s.title_th} ${s.title_en} ${s.description_th || ""}`, text)
            : 0,
        }))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      if (!cancelled && best) {
        setSurvey({
          id: best.id,
          title_th: best.title_th,
          title_en: best.title_en,
          description_th: best.description_th,
          description_en: best.description_en,
          xp_reward: best.xp_reward,
          is_native: best.is_native,
          url: best.url,
          score: best.score,
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [articleText]);

  return survey;
}

export function surveyHref(survey: RelatedSurvey): string {
  if (!survey.is_native && survey.url) return survey.url;
  return `/surveys/${survey.id}`;
}
