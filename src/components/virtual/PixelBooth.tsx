import type { PixelBoothConfig } from "@/config/pixelWorldConfig";

interface Props {
  booth: PixelBoothConfig;
  language: string;
  onClick: () => void;
  nearby?: boolean;
}

export function PixelBooth({ booth, language, onClick, nearby }: Props) {
  const label = language === "th" ? booth.labelTh : booth.labelEn;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: "absolute",
        left: booth.x,
        top: booth.y,
        width: booth.w,
        height: booth.h,
        cursor: "pointer",
        zIndex: booth.y,
      }}
      className="group"
    >
      {/* ── Building shadow ── */}
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 8,
          width: booth.w,
          height: booth.h,
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.12) 0%, transparent 70%)",
          borderRadius: 4,
          filter: "blur(3px)",
          zIndex: -1,
        }}
      />

      {/* ── Roof ── */}
      <div
        style={{
          width: booth.w + 12,
          height: 14,
          marginLeft: -6,
          background: `linear-gradient(180deg, ${booth.roofColor} 0%, ${booth.accentColor || booth.roofColor} 100%)`,
          borderBottom: "3px solid rgba(0,0,0,0.1)",
          borderRadius: "3px 3px 0 0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        }}
      />

      {/* ── Wall ── */}
      <div
        style={{
          width: booth.w,
          height: booth.h - 14,
          background: `linear-gradient(180deg, ${booth.wallColor} 0%, ${darken(booth.wallColor, 8)} 100%)`,
          border: "2px solid rgba(0,0,0,0.06)",
          borderTop: "none",
          borderRadius: "0 0 2px 2px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          position: "relative",
          boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Sign board */}
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            color: "#4a4a4a",
            textAlign: "center",
            lineHeight: 1.3,
            padding: "2px 6px",
            background: "rgba(255,255,255,0.5)",
            borderRadius: 3,
            border: "1px solid rgba(0,0,0,0.06)",
            animation: nearby ? "sign-glow 1.5s ease-in-out infinite" : undefined,
          }}
        >
          {label}
        </div>

        {/* Door */}
        <div
          style={{
            width: 14,
            height: 18,
            background: "linear-gradient(180deg, #a06830 0%, #7a4e28 100%)",
            border: "2px solid #654321",
            borderRadius: "3px 3px 0 0",
            position: "relative",
            boxShadow: nearby ? "0 0 8px rgba(255,215,0,0.4)" : "inset 0 1px 2px rgba(0,0,0,0.2)",
            transition: "box-shadow 0.3s",
          }}
        >
          {/* door knob */}
          <div
            style={{
              position: "absolute",
              right: 2,
              top: 7,
              width: 3,
              height: 3,
              background: nearby ? "#FFE066" : "#D4A840",
              borderRadius: "50%",
              boxShadow: nearby ? "0 0 4px #FFE066" : "none",
              transition: "all 0.3s",
            }}
          />
        </div>

        {/* Staff indicator */}
        {booth.hasStaff && (
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "radial-gradient(circle, #6ee090 0%, #40b860 100%)",
              boxShadow: "0 0 6px rgba(64,184,96,0.5)",
              animation: "pixel-pulse 2s ease-in-out infinite",
            }}
          />
        )}

        {/* Window decorations */}
        <div style={{ position: "absolute", top: 6, left: 8, display: "flex", gap: 10 }}>
          <div style={{ width: 8, height: 8, background: "rgba(180,220,255,0.5)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 1 }} />
          <div style={{ width: 8, height: 8, background: "rgba(180,220,255,0.5)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 1 }} />
        </div>
      </div>

      {/* Hover/nearby prompt */}
      <div
        className={`absolute -bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300 ${
          nearby ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 group-hover:opacity-80 group-hover:translate-y-0"
        }`}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 6,
          color: "#fff",
          background: "rgba(0,0,0,0.65)",
          padding: "3px 10px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {language === "th" ? "▶ เข้า" : "▶ Enter"}
      </div>
    </div>
  );
}

/* Simple darken helper — shift hex color slightly darker */
function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
