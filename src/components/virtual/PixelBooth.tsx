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
      {/* ── Roof ── */}
      <div
        style={{
          width: booth.w + 8,
          height: 12,
          marginLeft: -4,
          background: booth.roofColor,
          borderBottom: "3px solid rgba(0,0,0,0.15)",
        }}
      />

      {/* ── Wall ── */}
      <div
        style={{
          width: booth.w,
          height: booth.h - 12,
          background: booth.wallColor,
          border: "2px solid rgba(0,0,0,0.1)",
          borderTop: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          position: "relative",
        }}
      >
        {/* Sign */}
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            color: "#333",
            textAlign: "center",
            lineHeight: 1.3,
            padding: "0 4px",
          }}
        >
          {label}
        </div>

        {/* Door */}
        <div
          style={{
            width: 14,
            height: 18,
            background: "#8B4513",
            border: "2px solid #654321",
            borderRadius: "2px 2px 0 0",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 2,
              top: 7,
              width: 3,
              height: 3,
              background: "#FFD700",
              borderRadius: "50%",
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
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 4px #22c55e",
              animation: "pixel-pulse 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Hover/nearby prompt */}
      <div
        className={`absolute -bottom-7 left-1/2 -translate-x-1/2 transition-opacity ${
          nearby ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 6,
          color: "#fff",
          background: "rgba(0,0,0,0.75)",
          padding: "3px 8px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {language === "th" ? "▶ เข้า" : "▶ Enter"}
      </div>
    </div>
  );
}
