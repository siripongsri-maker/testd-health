import { useEffect, useCallback, useRef } from 'react';

const AUTOSAVE_KEY = 'hiv-selftest-draft';
const DEBOUNCE_MS = 1000;

interface AutosaveData {
  shippingData: Record<string, string>;
  nhsoData: Record<string, string>;
  assignedBranch: string;
  deliveryMode: string;
  savedAt: number;
}

export function useFormAutosave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback((data: Omit<AutosaveData, 'savedAt'>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
      } catch {
        // Storage full or unavailable — silently ignore
      }
    }, DEBOUNCE_MS);
  }, []);

  const loadDraft = useCallback((): AutosaveData | null => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as AutosaveData;
      // Expire drafts older than 24 hours
      if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { saveDraft, loadDraft, clearDraft };
}
