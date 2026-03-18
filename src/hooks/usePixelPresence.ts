import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ── helpers ────────────────────────────────────────────────── */

function getSessionId(): string {
  let id = sessionStorage.getItem("vp_sid");
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("vp_sid", id); }
  return id;
}

function getAvatarSeed(): number {
  let s = sessionStorage.getItem("vp_avatar_seed");
  if (!s) { s = String(Math.floor(Math.random() * 1000)); sessionStorage.setItem("vp_avatar_seed", s); }
  return parseInt(s, 10);
}

/* ── types ──────────────────────────────────────────────────── */

export interface OtherPlayer {
  sessionId: string;
  x: number;
  y: number;
  avatarSeed: number;
}

export interface PixelPresence {
  totalOnline: number;
  others: OtherPlayer[];
  avatarSeed: number;
  updatePosition: (x: number, y: number) => void;
}

/* ── hook ───────────────────────────────────────────────────── */

/**
 * Cross-app presence: uses a global "app-presence" channel so ALL users
 * across the entire app appear in the virtual workspace, not just those
 * on the /virtual route. Users on other pages get assigned random positions
 * within the workspace bounds.
 */
export function usePixelPresence(): PixelPresence {
  const [state, setState] = useState<{ totalOnline: number; others: OtherPlayer[] }>({ totalOnline: 0, others: [] });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sid = useRef(getSessionId());
  const seed = useRef(getAvatarSeed());
  const posRef = useRef({ x: 400, y: 420 });
  const throttle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recalc = useCallback((ps: Record<string, any[]>) => {
    const all = Object.values(ps).flat();
    const others: OtherPlayer[] = [];
    for (const p of all) {
      if ((p as any).sid === sid.current) continue;
      others.push({
        sessionId: (p as any).sid,
        x: (p as any).x ?? 400,
        y: (p as any).y ?? 420,
        avatarSeed: (p as any).as ?? 0,
      });
    }
    setState({ totalOnline: all.length, others });
  }, []);

  useEffect(() => {
    const ch = supabase.channel("app-presence", {
      config: { presence: { key: sid.current } },
    });

    ch.on("presence", { event: "sync" }, () => recalc(ch.presenceState()))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            sid: sid.current,
            x: posRef.current.x,
            y: posRef.current.y,
            as: seed.current,
            v: true, // marks this user as being in virtual mode
          });
        }
      });

    channelRef.current = ch;
    return () => {
      if (throttle.current) clearTimeout(throttle.current);
      ch.untrack();
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePosition = useCallback((x: number, y: number) => {
    posRef.current = { x, y };
    if (!throttle.current) {
      throttle.current = setTimeout(() => {
        throttle.current = null;
        channelRef.current?.track({
          sid: sid.current,
          x: posRef.current.x,
          y: posRef.current.y,
          as: seed.current,
          v: true,
        });
      }, 250);
    }
  }, []);

  return { ...state, avatarSeed: seed.current, updatePosition };
}
