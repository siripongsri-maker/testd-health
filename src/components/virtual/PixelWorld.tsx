import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import {
  BOOTHS, WORLD_W, WORLD_H, SPAWN, AVATAR_SPEED, TREES, FLOWERS, LAMPS, getPalette,
} from "@/config/pixelWorldConfig";
import { PixelAvatar } from "./PixelAvatar";
import { PixelBooth } from "./PixelBooth";
import { usePixelPresence } from "@/hooks/usePixelPresence";
import { Users } from "lucide-react";

interface Props { displayName?: string }

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
        @keyframes pixel-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-0.5px)}}
        @keyframes pixel-pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.9;transform:scale(1.2)}}
        @keyframes sign-glow{0%,100%{box-shadow:0 0 2px rgba(255,215,0,.2)}50%{box-shadow:0 0 8px rgba(255,215,0,.4)}}
        @keyframes tree-sway{0%,100%{transform:skewX(0deg)}25%{transform:skewX(1deg)}75%{transform:skewX(-1deg)}}
        @keyframes flower-sway{0%,100%{transform:rotate(0deg)}50%{transform:rotate(3deg)}}
        @keyframes lamp-flicker{0%,100%{opacity:.6}50%{opacity:.85}}
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

  /* ── pointer handlers ── */
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
    <div className="relative flex-1 overflow-hidden" style={{ background: "#3a5a2f" }}>
      {/* ── HUD: online count ── */}
      <div
        className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
        style={{
          background: "rgba(0,0,0,.5)",
          backdropFilter: "blur(4px)",
          fontFamily: "'Press Start 2P',monospace",
          fontSize: 7,
          color: "#8ee0a0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <Users className="h-3 w-3" />
        {presence.totalOnline} {language === "th" ? "ออนไลน์" : "online"}
      </div>

      {/* ── HUD: controls hint ── */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 rounded-lg px-3 py-1.5"
        style={{
          background: "rgba(0,0,0,.4)",
          backdropFilter: "blur(4px)",
          fontFamily: "'Press Start 2P',monospace",
          fontSize: 6,
          color: "rgba(255,255,255,.5)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
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
            imageRendering: "pixelated",
          }}
        >
          {/* ── Ground: layered for depth ── */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, #7ab858 0%, #6aaa48 40%, #5a9a3e 70%, #4e8a36 100%)",
          }} />
          {/* Grid lines */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(0,0,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.025) 1px,transparent 1px)",
            backgroundSize: "16px 16px",
          }} />
          {/* Grass patches for variety */}
          {[
            { x: 50, y: 140, w: 60, h: 30 },
            { x: 400, y: 200, w: 80, h: 40 },
            { x: 150, y: 500, w: 70, h: 35 },
            { x: 500, y: 700, w: 90, h: 40 },
            { x: 650, y: 350, w: 50, h: 25 },
            { x: 100, y: 750, w: 60, h: 30 },
          ].map((p, i) => (
            <div key={`grass${i}`} style={{
              position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h,
              background: "radial-gradient(ellipse, rgba(100,180,70,0.3) 0%, transparent 70%)",
              borderRadius: "50%",
            }} />
          ))}

          {/* ── Paths (warmer tone) ── */}
          <div style={{ position: "absolute", left: WORLD_W / 2 - 24, top: 20, width: 48, height: WORLD_H - 40, background: "linear-gradient(90deg, #d4b880, #c8a870, #d4b880)", opacity: 0.5, borderRadius: 3 }} />
          {[140, 300, 460, 620].map((y) => (
            <div key={y} style={{ position: "absolute", left: 60, top: y - 14, width: WORLD_W - 120, height: 28, background: "linear-gradient(180deg, #d4b880, #c8a870, #d4b880)", opacity: 0.4, borderRadius: 3 }} />
          ))}
          <div style={{ position: "absolute", left: WORLD_W / 2 - 24, top: 760, width: 48, height: 80, background: "linear-gradient(90deg, #d4b880, #c8a870, #d4b880)", opacity: 0.5, borderRadius: 3 }} />
          {/* Path edge shadows */}
          <div style={{ position: "absolute", left: WORLD_W / 2 - 26, top: 20, width: 52, height: WORLD_H - 40, border: "2px solid rgba(0,0,0,0.04)", borderRadius: 3, pointerEvents: "none" }} />

          {/* ── Flowers ── */}
          {FLOWERS.map((f, i) => (
            <div key={`f${i}`} style={{
              position: "absolute", left: f.x, top: f.y, zIndex: f.y,
              pointerEvents: "none",
              animation: `flower-sway ${2 + (i % 3) * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}>
              <div style={{ width: 6, height: 6, background: f.color, borderRadius: "50%", boxShadow: `0 0 4px ${f.color}40` }} />
              <div style={{ width: 2, height: 5, background: "#5a8a38", margin: "-1px auto 0" }} />
            </div>
          ))}

          {/* ── Lamp posts ── */}
          {LAMPS.map((l, i) => (
            <div key={`l${i}`} style={{ position: "absolute", left: l.x, top: l.y, zIndex: l.y, pointerEvents: "none" }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,240,180,0.7) 0%, rgba(255,220,120,0.2) 60%, transparent 100%)",
                animation: "lamp-flicker 3s ease-in-out infinite",
                animationDelay: `${i * 0.7}s`,
                marginBottom: -2,
              }} />
              <div style={{ width: 4, height: 4, background: "#888", margin: "0 auto", borderRadius: "50% 50% 0 0" }} />
              <div style={{ width: 2, height: 14, background: "#777", margin: "0 auto" }} />
              {/* lamp shadow */}
              <div style={{
                width: 12, height: 4, borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(0,0,0,0.1) 0%, transparent 70%)",
                margin: "1px auto 0",
              }} />
            </div>
          ))}

          {/* ── Trees (with sway animation) ── */}
          {TREES.map((t, i) => (
            <div key={`t${i}`} style={{
              position: "absolute", left: t.x, top: t.y, zIndex: t.y, pointerEvents: "none",
              animation: `tree-sway ${3 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
              transformOrigin: "bottom center",
            }}>
              {/* Tree shadow */}
              <div style={{
                position: "absolute", bottom: -4, left: -2, width: 24, height: 6, borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(0,0,0,0.12) 0%, transparent 70%)",
              }} />
              <div style={{ width: 22, height: 14, background: "linear-gradient(180deg, #48a030 0%, #2d8020 100%)", borderRadius: "5px 5px 2px 2px", marginLeft: -2 }} />
              <div style={{ width: 18, height: 10, background: "linear-gradient(180deg, #58b838 0%, #3a9628 100%)", margin: "-4px auto 0", borderRadius: 3 }} />
              <div style={{ width: 6, height: 10, background: "linear-gradient(180deg, #9a7050 0%, #7a5438 100%)", margin: "0 auto" }} />
            </div>
          ))}

          {/* ── Spawn marker ── */}
          <div style={{
            position: "absolute", left: SPAWN.x - 12, top: SPAWN.y - 12, width: 24, height: 24,
            border: "2px dashed rgba(255,255,255,.1)", borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }} />

          {/* ── Booths ── */}
          {BOOTHS.map((b) => (
            <PixelBooth key={b.id} booth={b} language={language} onClick={() => navigate(b.targetRoute)} nearby={nearbyBooth === b.id} />
          ))}

          {/* ── Other avatars ── */}
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
