import type { PixelBoothConfig } from "@/config/pixelWorldConfig";
import { StaffAvatar } from "./StaffAvatar";

interface Props {
  booth: PixelBoothConfig;
  language: string;
  onClick: () => void;
  nearby?: boolean;
}

export function PixelBooth({ booth, language, onClick, nearby }: Props) {
  const label = language === "th" ? booth.labelTh : booth.labelEn;
  const staffName = language === "th" ? (booth.staffNameTh || booth.staffName) : (booth.staffName || "Staff");
  const welcome = language === "th" ? (booth.welcomeTh || "") : (booth.welcomeEn || "");
  const isWide = booth.w > 200;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: "absolute",
        left: booth.x,
        top: booth.y,
        width: booth.w,
        height: booth.h + 48, // extra space for staff avatar
        cursor: "pointer",
        zIndex: booth.y + 10,
      }}
      className="group"
    >
      {/* ── Staff avatar (stationed behind desk) ── */}
      <div style={{
        position: "absolute",
        left: isWide ? booth.w - 46 : booth.w / 2 - 14,
        top: -8,
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "pixel-breathe 3s ease-in-out infinite",
      }}>
        <StaffAvatar size={28} />
        {/* Staff name tag */}
        <div style={{
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          fontSize: 7,
          fontWeight: 600,
          color: "#c84878",
          marginTop: 1,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}>
          {staffName}
        </div>
      </div>

      {/* ── Desk shadow ── */}
      <div style={{
        position: "absolute",
        left: 3,
        top: 36,
        width: booth.w,
        height: booth.h,
        background: "radial-gradient(ellipse at center bottom, rgba(0,0,0,0.06) 0%, transparent 70%)",
        borderRadius: 10,
        filter: "blur(3px)",
        zIndex: 0,
      }} />

      {/* ── Desk counter ── */}
      <div style={{
        position: "relative",
        top: 32,
        width: booth.w,
        zIndex: 1,
        borderRadius: 12,
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.3s ease",
        transform: nearby ? "scale(1.03)" : "scale(1)",
        boxShadow: nearby
          ? `0 4px 20px ${booth.roofColor}40, 0 0 0 2px ${booth.roofColor}50`
          : "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        {/* Counter top edge (colored bar) */}
        <div style={{
          width: "100%",
          height: 5,
          background: `linear-gradient(90deg, ${booth.roofColor}, ${booth.accentColor || booth.roofColor})`,
        }} />

        {/* Desk surface */}
        <div style={{
          width: "100%",
          background: booth.wallColor,
          border: `1px solid ${nearby ? booth.roofColor + "60" : "rgba(0,0,0,0.05)"}`,
          borderTop: "none",
          padding: isWide ? "10px 14px" : "8px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "relative",
        }}>
          {/* Desk icon + label row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            {booth.icon && (
              <span style={{
                fontSize: isWide ? 16 : 14,
                lineHeight: 1,
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))",
              }}>
                {booth.icon}
              </span>
            )}
            <div>
              <div style={{
                fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                fontSize: isWide ? 12 : 11,
                fontWeight: 700,
                color: "#2a4a54",
                lineHeight: 1.2,
                letterSpacing: "0.01em",
              }}>
                {label}
              </div>
              {welcome && (
                <div style={{
                  fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                  fontSize: 9,
                  fontWeight: 500,
                  color: booth.roofColor,
                  lineHeight: 1.3,
                  marginTop: 1,
                }}>
                  {welcome}
                </div>
              )}
            </div>
          </div>

          {/* Staff ready indicator */}
          {booth.hasStaff && (
            <div style={{
              position: "absolute",
              top: 8,
              right: 8,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4aba80",
                boxShadow: "0 0 6px rgba(74,186,128,0.4)",
                animation: "clinic-pulse 2.5s ease-in-out infinite",
              }} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 8,
                color: "#4aba80",
                fontWeight: 600,
              }}>
                {language === "th" ? "พร้อม" : "Ready"}
              </span>
            </div>
          )}

          {/* Small desk props (bottom) */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 2,
          }}>
            {/* Tiny monitor */}
            <div style={{
              width: 10, height: 8,
              background: "#c8d8e0",
              borderRadius: 2,
              border: "1px solid rgba(0,0,0,0.06)",
            }} />
            {/* Tiny pen cup */}
            <div style={{
              width: 6, height: 7,
              background: "#d8c8b0",
              borderRadius: "1px 1px 2px 2px",
              border: "1px solid rgba(0,0,0,0.04)",
            }} />
            {/* Tiny paper */}
            <div style={{
              width: 8, height: 6,
              background: "#fff",
              borderRadius: 1,
              border: "1px solid rgba(0,0,0,0.04)",
            }} />
          </div>
        </div>
      </div>

      {/* ── Tap prompt ── */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 transition-all duration-300 ${
          nearby ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 group-hover:opacity-80 group-hover:translate-y-0"
        }`}
        style={{
          bottom: -6,
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          fontSize: 9,
          fontWeight: 600,
          color: "#fff",
          background: booth.roofColor + "dd",
          backdropFilter: "blur(6px)",
          padding: "4px 14px",
          borderRadius: 12,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          boxShadow: `0 2px 10px ${booth.roofColor}30`,
        }}
      >
        {language === "th" ? "แตะเพื่อเปิด →" : "Tap to open →"}
      </div>
    </div>
  );
}
