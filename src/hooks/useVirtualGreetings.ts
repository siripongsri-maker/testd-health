import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VirtualGreeting {
  id: string;
  message: string;
  display_name: string;
  avatar_seed: number;
  created_at: string;
}

/**
 * Hook that subscribes to virtual_greetings in realtime.
 * Keeps the last N messages and auto-removes stale ones.
 */
export function useVirtualGreetings(limit: number = 10) {
  const [greetings, setGreetings] = useState<VirtualGreeting[]>([]);
  const [sending, setSending] = useState(false);

  // Load recent on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("virtual_greetings" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (data) setGreetings((data as any[]).reverse());
    };
    load();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel("virtual-greetings-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "virtual_greetings" },
        (payload) => {
          const newMsg = payload.new as VirtualGreeting;
          setGreetings((prev) => {
            const updated = [...prev, newMsg];
            // Keep only last N
            return updated.slice(-limit);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  const sendGreeting = useCallback(
    async (message: string, displayName: string, avatarSeed: number) => {
      if (!message.trim() || sending) return;
      setSending(true);
      try {
        await supabase.from("virtual_greetings" as any).insert({
          message: message.trim().slice(0, 100),
          display_name: displayName || "Anonymous",
          avatar_seed: avatarSeed,
        } as any);
      } finally {
        setSending(false);
      }
    },
    [sending]
  );

  return { greetings, sendGreeting, sending };
}
