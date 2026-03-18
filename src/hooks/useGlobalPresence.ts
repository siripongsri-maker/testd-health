import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BOOTHS, WORLD_W, WORLD_H } from "@/config/pixelWorldConfig";

/**
 * Lightweight global presence broadcaster.
 * Renders nothing. When mounted (in AppLayout), it joins the same
 * "app-presence" channel that PixelWorld reads, so users browsing
 * ANY page appear as anonymous avatars in the virtual workspace.
 *
 * Users in Virtual Mode manage their own position via usePixelPresence,
 * so this hook skips broadcasting if already on /virtual.
 */
export function useGlobalPresence() {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Skip if we're on virtual mode (usePixelPresence handles it)
    if (window.location.pathname === "/virtual") return;

    let sid = sessionStorage.getItem("vp_sid");
    if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("vp_sid", sid); }

    let seedStr = sessionStorage.getItem("vp_avatar_seed");
    if (!seedStr) { seedStr = String(Math.floor(Math.random() * 1000)); sessionStorage.setItem("vp_avatar_seed", seedStr); }
    const seed = parseInt(seedStr, 10);

    // Assign a random position near a random booth
    const booth = BOOTHS[Math.floor(Math.random() * BOOTHS.length)];
    const rx = booth.x + booth.w / 2 + (Math.random() - 0.5) * 80;
    const ry = booth.y + booth.h + 20 + Math.random() * 40;
    const x = Math.max(20, Math.min(WORLD_W - 20, rx));
    const y = Math.max(20, Math.min(WORLD_H - 20, ry));

    const ch = supabase.channel("app-presence", {
      config: { presence: { key: sid } },
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ sid, x, y, as: seed, v: false });
      }
    });

    channelRef.current = ch;

    return () => {
      ch.untrack();
      supabase.removeChannel(ch);
    };
  }, []);
}
