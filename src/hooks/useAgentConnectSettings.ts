import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/visitorId";

export type AgentConnectSettings = {
  /** Selected client tab (chatgpt | claude | claude-code | other) */
  client: string;
  /** Completed step ids, e.g. "chatgpt:2" */
  completedSteps: string[];
  /** Run the connection check automatically when the page opens */
  autoCheck: boolean;
  /** Summary of the last status check */
  lastCheck?: { status: "pass" | "warn" | "fail"; at: string } | null;
};

export const DEFAULT_AGENT_CONNECT_SETTINGS: AgentConnectSettings = {
  client: "chatgpt",
  completedSteps: [],
  autoCheck: true,
  lastCheck: null,
};

const LOCAL_KEY = "testd_agent_connect_settings_v1";

function readLocal(): AgentConnectSettings | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return { ...DEFAULT_AGENT_CONNECT_SETTINGS, ...(JSON.parse(raw) as Partial<AgentConnectSettings>) };
  } catch {
    return null;
  }
}

function writeLocal(settings: AgentConnectSettings) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable (private mode) — remote copy still applies */
  }
}

function normalize(value: unknown): AgentConnectSettings {
  const raw = (value ?? {}) as Partial<AgentConnectSettings>;
  return {
    client: typeof raw.client === "string" ? raw.client : DEFAULT_AGENT_CONNECT_SETTINGS.client,
    completedSteps: Array.isArray(raw.completedSteps)
      ? raw.completedSteps.filter((s): s is string => typeof s === "string").slice(0, 100)
      : [],
    autoCheck: typeof raw.autoCheck === "boolean" ? raw.autoCheck : true,
    lastCheck:
      raw.lastCheck && typeof raw.lastCheck === "object" && typeof raw.lastCheck.at === "string"
        ? raw.lastCheck
        : null,
  };
}

/**
 * Anonymous, per-visitor agent connection settings.
 * Reads/writes are keyed by the device's anonymous visitor id and mirrored to
 * localStorage so the UI is instant and still works offline.
 */
export function useAgentConnectSettings() {
  const [settings, setSettings] = useState<AgentConnectSettings>(
    () => readLocal() ?? DEFAULT_AGENT_CONNECT_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // Hydrate from the server copy (survives cache clears and new sessions).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_agent_connect_settings", {
          p_anonymous_id: getVisitorId(),
        });
        if (cancelled || !mounted.current) return;
        if (!error && data && Object.keys(data as object).length > 0) {
          const next = normalize(data);
          setSettings(next);
          writeLocal(next);
        }
      } finally {
        if (!cancelled && mounted.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: AgentConnectSettings) => {
    writeLocal(next);
    setSyncState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.rpc("save_agent_connect_settings", {
        p_anonymous_id: getVisitorId(),
        p_settings: JSON.parse(JSON.stringify(next)),
      });
      if (!mounted.current) return;
      setSyncState(error ? "error" : "saved");
    }, 500);
  }, []);

  const update = useCallback(
    (patch: Partial<AgentConnectSettings>) => {
      setSettings((prev) => {
        const next = normalize({ ...prev, ...patch });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleStep = useCallback(
    (stepId: string) => {
      setSettings((prev) => {
        const done = prev.completedSteps.includes(stepId);
        const next = normalize({
          ...prev,
          completedSteps: done
            ? prev.completedSteps.filter((s) => s !== stepId)
            : [...prev.completedSteps, stepId],
        });
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    const next = { ...DEFAULT_AGENT_CONNECT_SETTINGS };
    setSettings(next);
    persist(next);
  }, [persist]);

  return { settings, loading, syncState, update, toggleStep, reset };
}
