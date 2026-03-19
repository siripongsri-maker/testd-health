import { useState, useEffect, useRef, useCallback } from "react";
import { BOOTHS, WORLD_W, WORLD_H, PALETTES, type AvatarPalette } from "@/config/pixelWorldConfig";

/* ── NPC names (bilingual clinic visitors) ── */
const NPC_NAMES_EN = ["Alex", "Sam", "Bee", "Kai", "Jay", "Max", "Sky", "Nat", "Pat", "Ren"];
const NPC_NAMES_TH = ["บี", "เก้า", "ฝน", "ต้น", "มิ้นท์", "ปลา", "แม็ก", "ฟ้า", "นัท", "ภู"];

export interface NpcAvatar {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  palette: AvatarPalette;
  name: string;
  isWalking: boolean;
  facingLeft: boolean;
}

/**
 * Generates and animates NPC bot avatars that wander around the virtual clinic.
 * Count is based on a baseline (analytics-inspired) to make the space feel alive.
 */
export function useNpcAvatars(count: number = 6, language: string = "en"): NpcAvatar[] {
  const [npcs, setNpcs] = useState<NpcAvatar[]>([]);
  const npcsRef = useRef<NpcAvatar[]>([]);
  const animRef = useRef(0);
  const lastT = useRef(0);

  // Initialize NPCs
  useEffect(() => {
    const generated: NpcAvatar[] = [];
    for (let i = 0; i < count; i++) {
      const booth = BOOTHS[i % BOOTHS.length];
      const x = booth.x + booth.w / 2 + (Math.random() - 0.5) * 60;
      const y = booth.y + booth.h + 20 + Math.random() * 30;
      generated.push({
        id: `npc-${i}`,
        x: clamp(x, 30, WORLD_W - 30),
        y: clamp(y, 30, WORLD_H - 30),
        targetX: x,
        targetY: y,
        palette: PALETTES[(i * 3 + 7) % PALETTES.length],
        name: language === "th" ? NPC_NAMES_TH[i % NPC_NAMES_TH.length] : NPC_NAMES_EN[i % NPC_NAMES_EN.length],
        isWalking: false,
        facingLeft: Math.random() > 0.5,
      });
    }
    npcsRef.current = generated;
    setNpcs([...generated]);
  }, [count, language]);

  // Pick new random targets periodically
  useEffect(() => {
    const pickTargets = () => {
      const arr = npcsRef.current;
      // Pick 1-3 random NPCs to start moving
      const movingCount = Math.ceil(Math.random() * Math.min(3, arr.length));
      for (let i = 0; i < movingCount; i++) {
        const idx = Math.floor(Math.random() * arr.length);
        const npc = arr[idx];
        if (npc.isWalking) continue;

        // Sometimes walk to a booth, sometimes wander
        if (Math.random() > 0.4) {
          const booth = BOOTHS[Math.floor(Math.random() * BOOTHS.length)];
          npc.targetX = booth.x + booth.w / 2 + (Math.random() - 0.5) * 50;
          npc.targetY = booth.y + booth.h + 16 + Math.random() * 30;
        } else {
          npc.targetX = clamp(npc.x + (Math.random() - 0.5) * 200, 30, WORLD_W - 30);
          npc.targetY = clamp(npc.y + (Math.random() - 0.5) * 150, 30, WORLD_H - 30);
        }
        npc.isWalking = true;
      }
    };

    const interval = setInterval(pickTargets, 2500 + Math.random() * 2000);
    // Kick off initial movement after short delay
    const initialTimeout = setTimeout(pickTargets, 800);
    return () => { clearInterval(interval); clearTimeout(initialTimeout); };
  }, [count]);

  // Animation loop
  const tick = useCallback((t: number) => {
    if (!lastT.current) lastT.current = t;
    const dt = Math.min((t - lastT.current) / 1000, 0.1);
    lastT.current = t;

    let changed = false;
    const NPC_SPEED = 45; // slower than player

    for (const npc of npcsRef.current) {
      if (!npc.isWalking) continue;

      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3) {
        npc.x = npc.targetX;
        npc.y = npc.targetY;
        npc.isWalking = false;
        changed = true;
      } else {
        const step = Math.min(NPC_SPEED * dt, dist);
        npc.x += (dx / dist) * step;
        npc.y += (dy / dist) * step;
        if (Math.abs(dx) > 2) npc.facingLeft = dx < 0;
        changed = true;
      }
    }

    if (changed) {
      setNpcs([...npcsRef.current]);
    }

    animRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [tick]);

  return npcs;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
