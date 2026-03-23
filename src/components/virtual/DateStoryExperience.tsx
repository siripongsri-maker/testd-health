import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  STORY_NODES,
  SCENES,
  SPEAKER_CONFIG,
  ENDING_DETAILS,
  SWING_SERVICES,
  type StoryNode,
  type StoryChoice,
  type Speaker,
} from "@/config/dateStoryData";

/* ─── helpers ─── */
function getEndingId(safe: number, risk: number): string {
  const net = safe - risk;
  if (net >= 5) return "ending_safe";
  if (net >= 2) return "ending_semi";
  if (net >= -1) return "ending_semi";
  return "ending_risky";
}

const TOTAL_DECISIONS = 8;

/* ─── pixel avatar components ─── */
function PixelCharacter({ speaker, size = 48 }: { speaker: Speaker; size?: number }) {
  const cfg = SPEAKER_CONFIG[speaker];
  const colors: Record<Speaker, { skin: string; hair: string; shirt: string }> = {
    narrator: { skin: "#f0d0b0", hair: "#8a6a50", shirt: "#a0b8c8" },
    friend: { skin: "#e8c8a0", hair: "#4a3a2a", shirt: "#7ecf8e" },
    staff: { skin: "#f0d0b0", hair: "#3a2a2a", shirt: "#e060a0" },
    date: { skin: "#e0c098", hair: "#6a4a30", shirt: "#f0a860" },
    player: { skin: "#f0d0b0", hair: "#5a4a3a", shirt: "#88c8e8" },
  };
  const c = colors[speaker];
  const s = size / 48;

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox="0 0 48 48" style={{ imageRendering: "pixelated" }}>
        {/* Hair */}
        <rect x="14" y="4" width="20" height="8" rx="2" fill={c.hair} />
        <rect x="12" y="8" width="24" height="4" rx="1" fill={c.hair} />
        {/* Head */}
        <rect x="14" y="10" width="20" height="16" rx="3" fill={c.skin} />
        {/* Eyes */}
        <rect x="18" y="16" width="4" height="4" rx="1" fill="#2a2a3a" />
        <rect x="26" y="16" width="4" height="4" rx="1" fill="#2a2a3a" />
        <rect x="19" y="17" width="2" height="2" rx="1" fill="white" />
        <rect x="27" y="17" width="2" height="2" rx="1" fill="white" />
        {/* Smile */}
        <rect x="20" y="22" width="8" height="2" rx="1" fill="#c08070" />
        {/* Body */}
        <rect x="12" y="26" width="24" height="14" rx="3" fill={c.shirt} />
        {/* Arms */}
        <rect x="6" y="28" width="8" height="4" rx="2" fill={c.skin} />
        <rect x="34" y="28" width="8" height="4" rx="2" fill={c.skin} />
        {/* Staff badge */}
        {speaker === "staff" && (
          <>
            <rect x="18" y="29" width="12" height="6" rx="1" fill="white" opacity="0.9" />
            <text x="24" y="34" textAnchor="middle" fontSize="5" fill="#e060a0" fontWeight="bold">SWING</text>
          </>
        )}
      </svg>
    </div>
  );
}

/* ─── Scene background ─── */
function SceneBackground({ sceneKey, children }: { sceneKey: string; children: React.ReactNode }) {
  const scene = SCENES[sceneKey] || SCENES.bedroom;

  const sceneElements: Record<string, React.ReactNode> = {
    bedroom: (
      <>
        {/* Bed */}
        <div style={{ position: "absolute", bottom: 40, left: 20, width: 80, height: 30, background: "#6a5a8a", borderRadius: 4, opacity: 0.4 }} />
        <div style={{ position: "absolute", bottom: 60, left: 20, width: 30, height: 20, background: "#8a7aaa", borderRadius: "4px 4px 0 0", opacity: 0.3 }} />
        {/* Lamp */}
        <div style={{ position: "absolute", top: 30, right: 30, width: 3, height: 20, background: "#a0a0a0", opacity: 0.3 }} />
        <div style={{ position: "absolute", top: 20, right: 22, width: 18, height: 12, background: "#f0e080", borderRadius: "50% 50% 0 0", opacity: 0.2 }} />
        {/* Window */}
        <div style={{ position: "absolute", top: 15, left: "50%", transform: "translateX(-50%)", width: 50, height: 35, border: "2px solid rgba(255,255,255,0.1)", borderRadius: 4 }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(180deg, #1a1a3a, #2a2a5a)", borderRadius: 2 }} />
        </div>
      </>
    ),
    chat: (
      <>
        {/* Phone screen */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 60, height: 90, background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "2px solid rgba(255,255,255,0.1)" }}>
          <div style={{ margin: "8px 6px", height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 3 }} />
          <div style={{ margin: "4px 6px", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, width: "60%" }} />
          <div style={{ margin: "4px 6px", height: 8, background: "rgba(136,200,232,0.15)", borderRadius: 3, marginLeft: "auto", width: "70%" }} />
        </div>
      </>
    ),
    clinic: (
      <>
        {/* Counter */}
        <div style={{ position: "absolute", bottom: 30, left: 10, right: 10, height: 25, background: "rgba(255,255,255,0.08)", borderRadius: 4 }} />
        {/* Cross */}
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)" }}>
          <div style={{ width: 20, height: 6, background: "#e06080", borderRadius: 2, position: "absolute", top: 7, left: 0 }} />
          <div style={{ width: 6, height: 20, background: "#e06080", borderRadius: 2, position: "absolute", top: 0, left: 7 }} />
        </div>
        {/* Plant */}
        <div style={{ position: "absolute", bottom: 55, right: 20, width: 12, height: 15, background: "#5a9a6a", borderRadius: "50% 50% 30% 30%", opacity: 0.5 }} />
      </>
    ),
    cafe: (
      <>
        {/* Table */}
        <div style={{ position: "absolute", bottom: 35, left: "50%", transform: "translateX(-50%)", width: 70, height: 20, background: "#6a5040", borderRadius: 3, opacity: 0.4 }} />
        {/* Cups */}
        <div style={{ position: "absolute", bottom: 50, left: "40%", width: 10, height: 8, background: "rgba(255,255,255,0.15)", borderRadius: "2px 2px 0 0" }} />
        <div style={{ position: "absolute", bottom: 50, right: "35%", width: 10, height: 8, background: "rgba(255,255,255,0.15)", borderRadius: "2px 2px 0 0" }} />
      </>
    ),
    room: (
      <>
        <div style={{ position: "absolute", bottom: 30, left: 15, width: 100, height: 35, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
        <div style={{ position: "absolute", top: 20, right: 20, width: 8, height: 8, background: "#f0e080", borderRadius: "50%", opacity: 0.2, boxShadow: "0 0 12px rgba(240,224,128,0.3)" }} />
      </>
    ),
    street: (
      <>
        {/* Buildings */}
        <div style={{ position: "absolute", bottom: 30, left: 10, width: 30, height: 60, background: "rgba(255,255,255,0.04)", borderRadius: "3px 3px 0 0" }} />
        <div style={{ position: "absolute", bottom: 30, left: 50, width: 25, height: 45, background: "rgba(255,255,255,0.03)", borderRadius: "3px 3px 0 0" }} />
        <div style={{ position: "absolute", bottom: 30, right: 15, width: 35, height: 55, background: "rgba(255,255,255,0.04)", borderRadius: "3px 3px 0 0" }} />
        {/* Street */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 30, background: "rgba(255,255,255,0.02)" }} />
      </>
    ),
    ending: (
      <>
        {/* Stars */}
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            top: 15 + i * 15,
            left: `${15 + i * 18}%`,
            width: 4,
            height: 4,
            background: "rgba(255,255,255,0.15)",
            borderRadius: "50%",
            animation: `pixel-breathe ${2 + i * 0.5}s ease-in-out infinite`,
          }} />
        ))}
      </>
    ),
  };

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: 200,
      background: scene.bg,
      borderRadius: "16px 16px 0 0",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {sceneElements[sceneKey]}
      {/* Scene label */}
      <div style={{
        position: "absolute",
        top: 8,
        right: 8,
        fontSize: 10,
        color: "rgba(255,255,255,0.4)",
        fontFamily: "'Inter', sans-serif",
        background: "rgba(0,0,0,0.2)",
        padding: "2px 8px",
        borderRadius: 6,
      }}>
        {scene.label}
      </div>
      {children}
    </div>
  );
}

/* ─── Main Story Component ─── */
export function DateStoryExperience() {
  const navigate = useNavigate();
  const [currentId, setCurrentId] = useState<string | null>(null); // null = title screen
  const [safeScore, setSafeScore] = useState(0);
  const [riskScore, setRiskScore] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [textVisible, setTextVisible] = useState(false);
  const [choicesVisible, setChoicesVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const nodeMap = useRef(
    new Map(STORY_NODES.map((n) => [n.id, n]))
  ).current;

  const currentNode = currentId ? nodeMap.get(currentId) : null;
  const progress = Math.min(history.length / TOTAL_DECISIONS, 1);

  // Show text with animation
  useEffect(() => {
    if (!currentNode) return;
    setTextVisible(false);
    setChoicesVisible(false);
    const t1 = setTimeout(() => setTextVisible(true), 100);
    const t2 = setTimeout(() => setChoicesVisible(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [currentId]);

  // Auto-advance for nodes without choices
  useEffect(() => {
    if (!currentNode || currentNode.choices || currentNode.isEnding) return;
    if (currentNode.id === "check_ending") {
      // Routing node
      const endId = getEndingId(safeScore, riskScore);
      const timer = setTimeout(() => {
        setCurrentId(endId);
        setHistory((p) => [...p, endId]);
      }, 800);
      return () => clearTimeout(timer);
    }
    if (currentNode.nextId) {
      const timer = setTimeout(() => {
        setCurrentId(currentNode.nextId!);
        setHistory((p) => [...p, currentNode.nextId!]);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentNode, safeScore, riskScore]);

  const handleChoice = useCallback((choice: StoryChoice) => {
    if (choice.effect.safe) setSafeScore((s) => s + choice.effect.safe!);
    if (choice.effect.risk) setRiskScore((s) => s + choice.effect.risk!);
    setHistory((p) => [...p, choice.nextId]);
    setCurrentId(choice.nextId);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentId(null);
    setSafeScore(0);
    setRiskScore(0);
    setHistory([]);
  }, []);

  const handleStart = useCallback(() => {
    setCurrentId("start");
    setHistory(["start"]);
  }, []);

  // ─── Title Screen ───
  if (!currentId) {
    return (
      <div style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #1a1a2e 0%, #2a2040 30%, #3d2d5c 70%, #2a2040 100%)",
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          {/* Pixel art title scene */}
          <div style={{ position: "relative", width: 160, height: 120, marginBottom: 24 }}>
            {/* Phone */}
            <div style={{
              position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
              width: 50, height: 70, background: "rgba(255,255,255,0.08)",
              borderRadius: 8, border: "2px solid rgba(255,255,255,0.15)",
            }}>
              <div style={{ margin: "10px 6px", height: 6, background: "rgba(136,200,232,0.2)", borderRadius: 3 }} />
              <div style={{ margin: "4px 6px", height: 6, background: "rgba(240,168,96,0.2)", borderRadius: 3, width: "70%", marginLeft: "auto" }} />
              <div style={{ margin: "4px 6px", height: 6, background: "rgba(136,200,232,0.2)", borderRadius: 3, width: "80%" }} />
            </div>
            {/* Hearts */}
            {["💛", "💕", "✨"].map((e, i) => (
              <div key={i} style={{
                position: "absolute",
                top: 5 + i * 12,
                left: i % 2 === 0 ? 15 : undefined,
                right: i % 2 === 1 ? 15 : undefined,
                fontSize: 16,
                opacity: 0.5,
                animation: `pixel-breathe ${2 + i}s ease-in-out infinite`,
              }}>{e}</div>
            ))}
          </div>

          <h1 style={{
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
            fontSize: 28,
            fontWeight: 800,
            color: "white",
            marginBottom: 8,
            lineHeight: 1.3,
          }}>
            นัดเดท
          </h1>
          <p style={{
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 6,
            lineHeight: 1.5,
          }}>
            interactive story
          </p>
          <p style={{
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 32,
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            เรื่องราวก่อนไปเจอคนที่นัด...<br />
            ทุกทางเลือกของคุณมีผลต่อตอนจบ
          </p>

          <button
            onClick={handleStart}
            style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "white",
              background: "linear-gradient(135deg, #e060a0, #c04880)",
              border: "none",
              borderRadius: 16,
              padding: "14px 48px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(224,96,160,0.3)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            เริ่มเล่น ▶
          </button>

          <button
            onClick={() => navigate("/virtual/clinic")}
            style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              background: "none",
              border: "none",
              marginTop: 16,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            ข้ามไป Virtual Clinic →
          </button>
        </div>
      </div>
    );
  }

  // ─── Ending Screen ───
  if (currentNode?.isEnding) {
    const endType = currentNode.endingType || "risky";
    const details = ENDING_DETAILS[endType];

    return (
      <div style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #1a1a2e 0%, #2a2040 50%, #1a2a3a 100%)",
      }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* Ending badge */}
          <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{details.icon}</div>
            <h2 style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: details.color,
              marginBottom: 4,
            }}>{details.title}</h2>
            <p style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>{details.titleEn}</p>
          </div>

          {/* Message */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}>
            <p style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 14,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.7,
              textAlign: "center",
            }}>{details.message}</p>
          </div>

          {/* XP */}
          {details.xp > 0 && (
            <div style={{
              background: `linear-gradient(135deg, ${details.color}20, ${details.color}10)`,
              border: `1px solid ${details.color}30`,
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 16,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 24,
                fontWeight: 800,
                color: details.color,
              }}>+{details.xp} XP</div>
              <div style={{
                fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                marginTop: 2,
              }}>
                คุณปลดล็อกตอนจบ: {details.title}
              </div>
            </div>
          )}

          {/* Tips */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
          }}>
            <h3 style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
              marginBottom: 10,
            }}>💡 สิ่งที่เรียนรู้</h3>
            {details.tips.map((tip, i) => (
              <div key={i} style={{
                fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
                padding: "4px 0",
                paddingLeft: 16,
                position: "relative",
              }}>
                <span style={{ position: "absolute", left: 0, color: details.color }}>•</span>
                {tip}
              </div>
            ))}
          </div>

          {/* SWING Services */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 15,
              fontWeight: 700,
              color: "rgba(255,255,255,0.8)",
              marginBottom: 12,
              textAlign: "center",
            }}>🏥 ตัวช่วยจาก SWING</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SWING_SERVICES.map((svc, i) => (
                <button
                  key={i}
                  onClick={() => navigate(svc.route)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                  onPointerEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onPointerLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                >
                  <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{svc.icon}</span>
                  <div>
                    <div style={{
                      fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.85)",
                      marginBottom: 3,
                    }}>{svc.title}</div>
                    <div style={{
                      fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      lineHeight: 1.5,
                    }}>{svc.desc}</div>
                    <div style={{
                      fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#e888b8",
                      marginTop: 6,
                    }}>{svc.cta} →</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button
              onClick={handleRestart}
              style={{
                flex: 1,
                fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: "12px 0",
                cursor: "pointer",
              }}
            >
              🔄 ลองใหม่
            </button>
            <button
              onClick={() => navigate("/virtual/clinic")}
              style={{
                flex: 1,
                fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                background: "linear-gradient(135deg, #e060a0, #c04880)",
                border: "none",
                borderRadius: 12,
                padding: "12px 0",
                cursor: "pointer",
              }}
            >
              Virtual Clinic →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Story Screen ───
  if (!currentNode) return null;

  const speakerCfg = SPEAKER_CONFIG[currentNode.speaker];

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#1a1a2e",
    }}>
      {/* Progress bar */}
      <div style={{
        padding: "8px 16px 4px",
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #e060a0, #88c8e8)",
            borderRadius: 2,
            transition: "width 0.5s ease",
          }} />
        </div>
        <button
          onClick={handleRestart}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          เริ่มใหม่
        </button>
      </div>

      {/* Scene */}
      <SceneBackground sceneKey={currentNode.scene}>
        {/* Character in scene */}
        {currentNode.speaker !== "narrator" && (
          <div style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: textVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}>
            <PixelCharacter speaker={currentNode.speaker} size={56} />
          </div>
        )}
      </SceneBackground>

      {/* Dialogue box */}
      <div
        ref={dialogRef}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #1a1a2e, #2a2040)",
          padding: "16px 16px 20px",
          overflowY: "auto",
        }}
      >
        {/* Speaker name */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}>
          <span style={{ fontSize: 18 }}>{speakerCfg.avatar}</span>
          <span style={{
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: speakerCfg.color,
          }}>
            {currentNode.speakerName || speakerCfg.name}
          </span>
        </div>

        {/* Text */}
        <div style={{
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          fontSize: 16,
          color: "rgba(255,255,255,0.9)",
          lineHeight: 1.7,
          marginBottom: 20,
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
        }}>
          {currentNode.text}
        </div>

        {/* Choices */}
        {currentNode.choices && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: "auto",
            opacity: choicesVisible ? 1 : 0,
            transform: choicesVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}>
            {currentNode.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoice(choice)}
                disabled={!choicesVisible}
                style={{
                  fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "white",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s, transform 0.1s",
                  lineHeight: 1.5,
                }}
                onPointerDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; e.currentTarget.style.background = "rgba(224,96,160,0.15)"; }}
                onPointerUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Auto-advance indicator */}
        {!currentNode.choices && !currentNode.isEnding && (
          <div style={{
            marginTop: "auto",
            textAlign: "center",
            opacity: textVisible ? 0.3 : 0,
            transition: "opacity 0.5s ease 1s",
          }}>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
            }}>
              ▼
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
