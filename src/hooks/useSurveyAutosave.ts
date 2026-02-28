import { useState, useEffect, useCallback } from "react";
import type { AnswerData } from "@/components/survey/types";

const STORAGE_PREFIX = "survey-progress-";

/**
 * Persists partial survey answers in localStorage for resume-later.
 * Returns [answers, setAnswers, clearSaved, hasSavedProgress].
 */
export function useSurveyAutosave(surveyId: string | undefined) {
  const key = surveyId ? `${STORAGE_PREFIX}${surveyId}` : null;

  const loadSaved = useCallback((): Record<string, AnswerData> => {
    if (!key) return {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.answers) {
          return parsed.answers as Record<string, AnswerData>;
        }
      }
    } catch {
      // ignore corrupt data
    }
    return {};
  }, [key]);

  const [answers, setAnswers] = useState<Record<string, AnswerData>>(loadSaved);
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (!key) return 0;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.currentIndex ?? 0;
      }
    } catch {}
    return 0;
  });

  const hasSavedProgress = Object.keys(loadSaved()).length > 0;

  // Auto-save on change
  useEffect(() => {
    if (!key || Object.keys(answers).length === 0) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ answers, currentIndex, savedAt: Date.now() })
      );
    } catch {
      // storage full — silently ignore
    }
  }, [answers, currentIndex, key]);

  const clearSaved = useCallback(() => {
    if (key) localStorage.removeItem(key);
  }, [key]);

  return {
    answers,
    setAnswers,
    currentIndex,
    setCurrentIndex,
    clearSaved,
    hasSavedProgress,
  };
}
