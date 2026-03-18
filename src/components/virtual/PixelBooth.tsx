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
        zIndex: booth.y + 10,
      }}
      className="group"
    >
      {/* ── Desk shadow ── */}
      <div style={{
        position: "absolute",
        left: 2,
        top: 4,
        width: booth.w,
        height: booth.h,
        background: "radial-gradient(ellipse at center bottom, rgba(0,0,0,0.06) 0%, transparent 70%)",
        borderRadius: 6,
        filter: "blur(2px)",
        zIndex: -1,
      }} />

      {/* ── Desk top bar (colored header) ── */}
      <div style={{
        width: booth.w,
        height: 6,
        background: `linear-gradient(90deg, ${booth.roofColor}, ${booth.accentColor || booth.roofColor})`,
        borderRadius: "6px 6px 0 0",
      }} />

      {/* ── Desk body ── */}
      <div style={{
        width: booth.w,
        height: booth.h - 6,
        background: booth.wallColor,
        border: `1.5px solid ${nearby ? booth.roofColor : "rgba(0,0,0,0.06)"}`,
        borderTop: "none",
        borderRadius: "0 0 6px 6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        position: "relative",
        transition: "border-color 0.3s, box-shadow 0.3s",
        boxShadow: nearby
          ? `0 0 12px ${booth.roofColor}30, inset 0 0 8px ${booth.roofColor}10`
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Icon + label row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          {booth.icon && (
            <span style={{ fontSize: 11, lineHeight: 1 }}>{booth.icon}</span>
          )}
          <div style={{
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
            fontSize: 8,
            fontWeight: 600,
            color: "#3a5060",
            textAlign: "center",
            lineHeight: 1.3,
            letterSpacing: "0.01em",
          }}>
            {label}
          </div>
        </div>

        {/* Staff indicator */}
        {booth.hasStaff && (
          <div style={{
            position: "absolute",
            top: 4,
            right: 6,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}>
            <div style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#4aba80",
              boxShadow: "0 0 4px rgba(74,186,128,0.4)",
              animation: "clinic-pulse 2.5s ease-in-out infinite",
            }} />
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 6,
              color: "#4aba80",
              fontWeight: 500,
            }}>
              {language === "th" ? "พร้อม" : "ready"}
            </span>
          </div>
        )}
      </div>

      {/* Hover/nearby prompt */}
      <div
        className={`absolute -bottom-7 left-1/2 -translate-x-1/2 transition-all duration-300 ${
          nearby ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 group-hover:opacity-80 group-hover:translate-y-0"
        }`}
        style={{
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          fontSize: 7,
          fontWeight: 500,
          color: "#fff",
          background: "rgba(42,80,96,0.8)",
          backdropFilter: "blur(4px)",
          padding: "3px 10px",
          borderRadius: 10,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {language === "th" ? "เริ่มใช้งาน →" : "Open service →"}
      </div>
    </div>
  );
}
