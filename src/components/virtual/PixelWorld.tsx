import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import {
  BOOTHS, WORLD_W, WORLD_H, SPAWN, AVATAR_SPEED, TREES, getPalette,
} from "@/config/pixelWorldConfig";
import { PixelAvatar } from "./PixelAvatar";
import { PixelBooth } from "./PixelBooth";
import { usePixelPresence } from "@/hooks/usePixelPresence";
import { Users } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
interface Props { displayName?: string }

/* ── Component ──────────────────────────────────────────────── */
export function PixelWorld({ displayName }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const presence = usePixelPresence();

  const [playerPos, setPlayerPos] = useState(SPAWN);
  const [isWalking, setIsWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const lastT = useRef(0);
  const posRef = useRef(SPAWN);
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const ptrStart = useRef<{ x: number; y: number; t: number } | null>(null);

  /* ── inject pixel keyframes + font ── */
  useEffect(() => {
    if (!document.getElementById("px-style")) {
      const s = document.createElement("style");
      s.id = "px-style";
      s.textContent = `
        @keyframes pixel-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        @keyframes pixel-pulse{0%,100%{opacity:.4}50%{opacity:.9}}
      `;
      document.head.appendChild(s);
    }
    if (!document.getElementById("px-font")) {
      const l = document.createElement("link");
      l.id = "px-font";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  /* ── movement loop ── */
  useEffect(() => {
    const tick = (t: number) => {
      if (!lastT.current) lastT.current = t;
      const dt = Math.min((t - lastT.current) / 1000, 0.1);
      lastT.current = t;

      const tgt = targetRef.current;
      if (tgt) {
        const p = posRef.current;
        const dx = tgt.x - p.x;
        const dy = tgt.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4) {
          posRef.current = { ...tgt };
          targetRef.current = null;
          setPlayerPos({ ...tgt });
          setIsWalking(false);
          presence.updatePosition(tgt.x, tgt.y);
        } else {
          const step = Math.min(AVATAR_SPEED * dt, dist);
          const nx = p.x + (dx / dist) * step;
          const ny = p.y + (dy / dist) * step;
          posRef.current = { x: nx, y: ny };
          setPlayerPos({ x: nx, y: ny });
          if (Math.abs(dx) > 2) setFacingLeft(dx < 0);
          presence.updatePosition(nx, ny);
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [presence]);

  /* ── camera scroll ── */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.scrollTo({
      left: Math.max(0, playerPos.x - vp.clientWidth / 2),
      top: Math.max(0, playerPos.y - vp.clientHeight / 2),
      behavior: "smooth",
    });
  }, [playerPos]);

  /* ── pointer handlers (distinguish tap from scroll) ── */
  const onDown = useCallback((e: React.PointerEvent) => {
    ptrStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, []);

  const onUp = useCallback((e: React.PointerEvent) => {
    const s = ptrStart.current;
    if (!s) return;
    ptrStart.current = null;
    if (Math.abs(e.clientX - s.x) > 12 || Math.abs(e.clientY - s.y) > 12 || Date.now() - s.t > 500) return;

    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const wx = e.clientX - rect.left + vp.scrollLeft;
    const wy = e.clientY - rect.top + vp.scrollTop;
    targetRef.current = { x: Math.max(20, Math.min(WORLD_W - 20, wx)), y: Math.max(20, Math.min(WORLD_H - 20, wy)) };
    setIsWalking(true);
  }, []);

  /* ── nearby booth detection ── */
  const nearbyBooth = useMemo(() => {
    for (const b of BOOTHS) {
      const cx = b.x + b.w / 2;
      const by = b.y + b.h;
      if (Math.abs(playerPos.x - cx) < b.w / 2 + 24 && Math.abs(playerPos.y - (by + 20)) < 30) return b.id;
    }
    return null;
  }, [playerPos]);

  const myPalette = getPalette(presence.avatarSeed);

  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: "#2a3a1f" }}>
      {/* ── HUD: online count ── */}
      <div
        className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded px-2 py-1"
        style={{ background: "rgba(0,0,0,.6)", fontFamily: "'Press Start 2P',monospace", fontSize: 7, color: "#4ade80" }}
      >
        <Users className="h-3 w-3" />
        {presence.totalOnline} {language === "th" ? "ออนไลน์" : "online"}
      </div>

      {/* ── HUD: controls hint ── */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 rounded px-3 py-1"
        style={{ background: "rgba(0,0,0,.45)", fontFamily: "'Press Start 2P',monospace", fontSize: 6, color: "rgba(255,255,255,.45)" }}
      >
        {language === "th" ? "แตะเพื่อเดิน · แตะโซนเพื่อเข้า" : "Tap to walk · Tap booth to enter"}
      </div>

      {/* ── World viewport ── */}
      <div
        ref={viewportRef}
        className="w-full h-full overflow-auto"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        onPointerDown={onDown}
        onPointerUp={onUp}
      >
        <div
          className="relative select-none"
          style={{
            width: WORLD_W,
            height: WORLD_H,
            minWidth: WORLD_W,
            minHeight: WORLD_H,
            backgroundColor: "#5a9c3e",
            backgroundImage: "linear-gradient(rgba(0,0,0,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.03) 1px,transparent 1px)",
            backgroundSize: "16px 16px",
            imageRendering: "pixelated",
          }}
        >
          {/* ── Paths ── */}
          <div style={{ position: "absolute", left: WORLD_W / 2 - 24, top: 20, width: 48, height: WORLD_H - 40, background: "#c9a86c", opacity: 0.45, borderRadius: 2 }} />
          {[140, 300, 460, 620].map((y) => (
            <div key={y} style={{ position: "absolute", left: 60, top: y - 14, width: WORLD_W - 120, height: 28, background: "#c9a86c", opacity: 0.35, borderRadius: 2 }} />
          ))}
          {/* cross-path to staff desk */}
          <div style={{ position: "absolute", left: WORLD_W / 2 - 24, top: 760, width: 48, height: 80, background: "#c9a86c", opacity: 0.45, borderRadius: 2 }} />

          {/* ── Trees ── */}
          {TREES.map((t, i) => (
            <div key={`t${i}`} style={{ position: "absolute", left: t.x, top: t.y, zIndex: t.y, pointerEvents: "none" }}>
              <div style={{ width: 20, height: 14, background: "#2d7a1e", borderRadius: "4px 4px 2px 2px", marginLeft: -2 }} />
              <div style={{ width: 16, height: 10, background: "#3a9628", margin: "-3px auto 0" }} />
              <div style={{ width: 6, height: 10, background: "#8B5E3C", margin: "0 auto" }} />
            </div>
          ))}

          {/* ── Spawn marker ── */}
          <div style={{ position: "absolute", left: SPAWN.x - 10, top: SPAWN.y - 10, width: 20, height: 20, border: "2px dashed rgba(255,255,255,.15)", borderRadius: "50%", pointerEvents: "none" }} />

          {/* ── Booths ── */}
          {BOOTHS.map((b) => (
            <PixelBooth key={b.id} booth={b} language={language} onClick={() => navigate(b.targetRoute)} nearby={nearbyBooth === b.id} />
          ))}

          {/* ── Other avatars (anonymous — no labels) ── */}
          {presence.others.map((o) => (
            <div
              key={o.sessionId}
              style={{
                position: "absolute",
                left: o.x - 12,
                top: o.y - 18,
                zIndex: Math.floor(o.y),
                transition: "left .3s linear,top .3s linear",
                pointerEvents: "none",
              }}
            >
              <PixelAvatar palette={getPalette(o.avatarSeed)} />
            </div>
          ))}

          {/* ── My avatar ── */}
          <div
            style={{
              position: "absolute",
              left: playerPos.x - 12,
              top: playerPos.y - 18,
              zIndex: Math.floor(playerPos.y) + 1,
            }}
          >
            <PixelAvatar
              palette={myPalette}
              isWalking={isWalking}
              label={displayName}
              isMe
              facingLeft={facingLeft}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
