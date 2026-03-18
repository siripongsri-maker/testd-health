import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight anonymous presence for Virtual Mode.
 * Uses Supabase Realtime Presence — no DB tables needed.
 * Each user tracks their current zone id.
 */

function getSessionId(): string {
  let id = sessionStorage.getItem("vp_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("vp_sid", id);
  }
  return id;
}

interface PresenceState {
  /** Total unique users in virtual mode */
  totalOnline: number;
  /** Count of users per zone id */
  zoneCounts: Record<string, number>;
}

export function useVirtualPresence(currentZone: string = "lobby") {
  const [state, setState] = useState<PresenceState>({ totalOnline: 0, zoneCounts: {} });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionId = useRef(getSessionId());

  const recalculate = useCallback((presenceState: Record<string, any[]>) => {
    const allPresences = Object.values(presenceState).flat();
    const zones: Record<string, number> = {};
    for (const p of allPresences) {
      const z = (p as any).zone as string;
      zones[z] = (zones[z] || 0) + 1;
    }
    setState({ totalOnline: allPresences.length, zoneCounts: zones });
  }, []);

  useEffect(() => {
    const channel = supabase.channel("virtual-presence", {
      config: { presence: { key: sessionId.current } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        recalculate(channel.presenceState());
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ zone: currentZone, ts: Date.now() });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
    // Only re-subscribe on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update tracked zone when it changes
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.track({ zone: currentZone, ts: Date.now() });
    }
  }, [currentZone]);

  return state;
}
