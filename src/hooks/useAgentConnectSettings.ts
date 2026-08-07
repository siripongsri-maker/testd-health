import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/visitorId";

/** Categories of data the connect page can remember. */
export type AgentConnectSavePrefs = {
  /** Remember the selected AI client tab */
  client: boolean;
  /** Remember which setup steps are ticked */
  steps: boolean;
  /** Remember the last status check result */
  lastCheck: boolean;
  /** Mirror everything to the anonymous server copy */
  server: boolean;
};

export type AgentConnectSettings = {
  /** Selected client tab (chatgpt | claude | claude-code | other) */
  client: string;
  /** Completed step ids, e.g. "chatgpt:2" */
  completedSteps: string[];
  /** Run the connection check automatically when the page opens */
  autoCheck: boolean;
  /** Summary of the last status check */
  lastCheck?: { status: "pass" | "warn" | "fail"; at: string } | null;
  /** Per-category save switches */
  savePrefs: AgentConnectSavePrefs;
};

export const DEFAULT_SAVE_PREFS: AgentConnectSavePrefs = {
  client: true,
  steps: true,
  lastCheck: true,
  server: true,
};

export const DEFAULT_AGENT_CONNECT_SETTINGS: AgentConnectSettings = {
  client: "chatgpt",
  completedSteps: [],
  autoCheck: true,
  lastCheck: null,
  savePrefs: DEFAULT_SAVE_PREFS,
};

const LOCAL_KEY = "testd_agent_connect_settings_v1";

function readLocal(): AgentConnectSettings | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
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

function clearLocal() {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

function normalize(value: unknown): AgentConnectSettings {
  const raw = (value ?? {}) as Partial<AgentConnectSettings>;
  const prefs = (raw.savePrefs ?? {}) as Partial<AgentConnectSavePrefs>;
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
    savePrefs: {
      client: typeof prefs.client === "boolean" ? prefs.client : true,
      steps: typeof prefs.steps === "boolean" ? prefs.steps : true,
      lastCheck: typeof prefs.lastCheck === "boolean" ? prefs.lastCheck : true,
      server: typeof prefs.server === "boolean" ? prefs.server : true,
    },
  };
}

/** Strip categories the user chose not to store. */
function sanitizeForStorage(settings: AgentConnectSettings): AgentConnectSettings {
  const p = settings.savePrefs;
  return {
    ...settings,
    client: p.client ? settings.client : DEFAULT_AGENT_CONNECT_SETTINGS.client,
    completedSteps: p.steps ? settings.completedSteps : [],
    lastCheck: p.lastCheck ? (settings.lastCheck ?? null) : null,
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
  const [storedLocal, setStoredLocal] = useState<AgentConnectSettings | null>(() => readLocal());
  const [storedRemote, setStoredRemote] = useState<AgentConnectSettings | null>(null);
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
          setStoredRemote(next);
          setSettings(next);
          if (next.savePrefs.server === false) {
            // server storage disabled locally afterwards — keep as-is
          }
          writeLocal(next);
          setStoredLocal(next);
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
    const payload = sanitizeForStorage(next);
    writeLocal(payload);
    setStoredLocal(payload);
    setSyncState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!payload.savePrefs.server) {
        // Remove the server copy when server sync is turned off.
        await supabase.rpc("save_agent_connect_settings", {
          p_anonymous_id: getVisitorId(),
          p_settings: JSON.parse(
            JSON.stringify({ ...DEFAULT_AGENT_CONNECT_SETTINGS, savePrefs: payload.savePrefs }),
          ),
        });
        if (!mounted.current) return;
        setStoredRemote(null);
        setSyncState("idle");
        return;
      }
      const { error } = await supabase.rpc("save_agent_connect_settings", {
        p_anonymous_id: getVisitorId(),
        p_settings: JSON.parse(JSON.stringify(payload)),
      });
      if (!mounted.current) return;
      if (!error) setStoredRemote(payload);
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

  const setSavePref = useCallback(
    (key: keyof AgentConnectSavePrefs, value: boolean) => {
      setSettings((prev) => {
        const next = normalize({ ...prev, savePrefs: { ...prev.savePrefs, [key]: value } });
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
    clearLocal();
    setStoredLocal(null);
    setStoredRemote(null);
    persist(next);
  }, [persist]);

  return { settings, loading, syncState, storedLocal, storedRemote, update, setSavePref, toggleStep, reset };
}
