import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import {
  BOOTHS, WORLD_W, WORLD_H, SPAWN, AVATAR_SPEED, CLINIC_DECOR, getPalette,
} from "@/config/pixelWorldConfig";
import { PixelAvatar } from "./PixelAvatar";
import { PixelBooth } from "./PixelBooth";
import { usePixelPresence } from "@/hooks/usePixelPresence";
import { useNpcAvatars } from "@/hooks/useNpcAvatars";
import { useVirtualGreetings } from "@/hooks/useVirtualGreetings";
import { VirtualChatInput } from "./VirtualChatInput";
import { SpeechBubble } from "./SpeechBubble";
import { Activity } from "lucide-react";
import { trackJourneyEvent } from "@/lib/journeyTracker";

interface Props { displayName?: string }

export function PixelWorld({ displayName }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const presence = usePixelPresence();
  const npcAvatars = useNpcAvatars(6, language);
  const { greetings, sendGreeting, sending } = useVirtualGreetings(15);

  const [shownBubbles, setShownBubbles] = useState<Array<{ id: string; message: string; name: string; x: number; y: number; ts: number }>>([]);

  const lastGreetingId = useRef("");
  useEffect(() => {
    if (greetings.length === 0) return;
    const latest = greetings[greetings.length - 1];
    if (latest.id === lastGreetingId.current) return;
    lastGreetingId.current = latest.id;
    
    const bx = 40 + Math.random() * (WORLD_W - 80);
    const by = 140 + Math.random() * (WORLD_H - 400);
    setShownBubbles(prev => [...prev.slice(-6), {
      id: latest.id,
      message: latest.message,
      name: latest.display_name,
      x: bx,
      y: by,
      ts: Date.now(),
    }]);
  }, [greetings]);

  const handleSendGreeting = useCallback((msg: string) => {
    const name = displayName || (language === "th" ? "ฉัน" : "Me");
    sendGreeting(msg, name, presence.avatarSeed);
  }, [displayName, language, sendGreeting, presence.avatarSeed]);

  const [playerPos, setPlayerPos] = useState(SPAWN);
  const [isWalking, setIsWalking] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const lastT = useRef(0);
  const posRef = useRef(SPAWN);
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const ptrStart = useRef<{ x: number; y: number; t: number } | null>(null);

  /* ── inject keyframes ── */
  useEffect(() => {
    if (!document.getElementById("px-style")) {
      const s = document.createElement("style");
      s.id = "px-style";
      s.textContent = `
        @keyframes pixel-walk{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
        @keyframes pixel-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-0.3px)}}
        @keyframes clinic-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes plant-sway{0%,100%{transform:skewX(0deg)}50%{transform:skewX(1.5deg)}}
      `;
      document.head.appendChild(s);
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
      const cy = b.y + b.h / 2;
      if (Math.abs(playerPos.x - cx) < b.w / 2 + 28 && Math.abs(playerPos.y - cy) < b.h / 2 + 40) return b.id;
    }
    return null;
  }, [playerPos]);

  const myPalette = getPalette(presence.avatarSeed);

  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: "#f0f4f6" }}>
      {/* ── HUD: top bar ── */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3"
        style={{
          background: "rgba(255,255,255,.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 6px)",
          paddingBottom: 6,
          height: 40,
        }}
      >
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: "#2a6a70",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          <span style={{ fontSize: 14 }}>🏥</span>
          SWING Virtual Clinic
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{
            background: "rgba(74,186,128,0.08)",
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: "#3a6070",
          }}
        >
          <Activity className="h-3 w-3" style={{ color: "#4aba80" }} />
          <span>{presence.totalOnline + npcAvatars.length}</span>
          <span style={{ fontWeight: 400, color: "#6a8898", fontSize: 10 }}>
            {language === "th" ? "ออนไลน์" : "online"}
          </span>
        </div>
      </div>

      {/* ── World viewport ── */}
      <div
        ref={viewportRef}
        className="w-full h-full overflow-auto"
        style={{
          WebkitOverflowScrolling: "touch",
          paddingTop: 44,
          paddingBottom: 80,
        } as React.CSSProperties}
        onPointerDown={onDown}
        onPointerUp={onUp}
      >
        <div
          className="relative select-none mx-auto"
          style={{
            width: WORLD_W,
            height: WORLD_H,
            minHeight: WORLD_H,
          }}
        >
          {/* ── Clinic floor ── */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, #f4f7f9 0%, #eef2f4 40%, #eaeff1 100%)",
            borderRadius: 12,
          }} />

          {/* Floor tile grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,0,0,.012) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,.012) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
            borderRadius: 12,
          }} />

          {/* ── Clinic decorations ── */}
          {CLINIC_DECOR.map((d, i) => {
            if (d.type === "plant") return (
              <div key={`d${i}`} style={{
                position: "absolute", left: d.x, top: d.y, zIndex: d.y,
                pointerEvents: "none",
                animation: `plant-sway ${3 + (i % 2)}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
                transformOrigin: "bottom center",
              }}>
                <div style={{ width: 10, height: 12, background: "#6aaa70", borderRadius: "50% 50% 30% 30%", margin: "0 auto" }} />
                <div style={{ width: 4, height: 6, background: "#8a7060", margin: "0 auto" }} />
                <div style={{ width: 10, height: 4, background: "#c0b0a0", borderRadius: 2, margin: "0 auto" }} />
              </div>
            );
            if (d.type === "sign") return (
              <div key={`d${i}`} style={{
                position: "absolute", left: d.x, top: d.y, zIndex: d.y + 5,
                pointerEvents: "none",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#2a6a70",
                  background: "rgba(255,255,255,.7)",
                  backdropFilter: "blur(4px)",
                  padding: "3px 14px",
                  borderRadius: 6,
                  border: "1px solid rgba(42,106,112,0.12)",
                  letterSpacing: "0.12em",
                }}>
                  {d.label}
                </div>
                <div style={{ width: 2, height: 8, background: "#a0b0b8", margin: "0 auto" }} />
              </div>
            );
            if (d.type === "bench") return (
              <div key={`d${i}`} style={{
                position: "absolute", left: d.x, top: d.y, zIndex: d.y,
                pointerEvents: "none",
              }}>
                <div style={{ width: 28, height: 5, background: "#c8b8a0", borderRadius: 2, border: "1px solid rgba(0,0,0,0.06)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", width: 28 }}>
                  <div style={{ width: 3, height: 4, background: "#a89880" }} />
                  <div style={{ width: 3, height: 4, background: "#a89880" }} />
                </div>
              </div>
            );
            if (d.type === "water") return (
              <div key={`d${i}`} style={{
                position: "absolute", left: d.x, top: d.y, zIndex: d.y,
                pointerEvents: "none",
              }}>
                <div style={{ width: 10, height: 14, background: "#c0d0d8", borderRadius: "3px 3px 2px 2px", border: "1px solid rgba(0,0,0,0.06)" }} />
                <div style={{ width: 5, height: 2, background: "#90b8c8", borderRadius: 1, margin: "-1px auto 0" }} />
              </div>
            );
            if (d.type === "divider") return (
              <div key={`d${i}`} style={{
                position: "absolute", left: d.x, top: d.y, zIndex: d.y,
                pointerEvents: "none",
                width: 2, height: WORLD_H - 250,
                background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.03), transparent)",
              }} />
            );
            return null;
          })}

          {/* ── Booths (desks) ── */}
          {BOOTHS.map((b) => (
            <PixelBooth key={b.id} booth={b} language={language} onClick={() => {
              trackJourneyEvent('virtual', 'virtual_clinic_booth_click', {
                booth_id: b.id,
                booth_label: b.labelEn || b.id,
                target_route: b.targetRoute,
              });
              navigate(b.targetRoute);
            }} nearby={nearbyBooth === b.id} />
          ))}

          {/* ── NPC bot avatars ── */}
          {npcAvatars.map((npc) => (
            <div
              key={npc.id}
              style={{
                position: "absolute",
                left: npc.x - 12,
                top: npc.y - 18,
                zIndex: Math.floor(npc.y),
                pointerEvents: "none",
                opacity: 0.8,
              }}
            >
              <PixelAvatar
                palette={npc.palette}
                isWalking={npc.isWalking}
                facingLeft={npc.facingLeft}
              />
            </div>
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
                transition: "left .4s ease-out, top .4s ease-out",
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

          {/* ── Speech bubbles from greetings ── */}
          {shownBubbles.map((b) => (
            <SpeechBubble
              key={b.id}
              message={b.message}
              name={b.name}
              x={b.x}
              y={b.y}
              duration={7000}
            />
          ))}
        </div>
      </div>

      {/* ── Chat input (fixed, mobile-safe) ── */}
      <VirtualChatInput onSend={handleSendGreeting} disabled={sending} />
    </div>
  );
}
