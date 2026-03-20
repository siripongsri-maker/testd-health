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

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: "absolute",
        left: booth.x,
        top: booth.y,
        width: booth.w,
        zIndex: booth.y + 10,
        cursor: "pointer",
      }}
      className="group"
    >
      {/* ── Desk card ── */}
      <div style={{
        width: "100%",
        borderRadius: 14,
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.3s ease",
        transform: nearby ? "scale(1.02)" : "scale(1)",
        boxShadow: nearby
          ? `0 4px 20px ${booth.roofColor}40, 0 0 0 2px ${booth.roofColor}50`
          : "0 2px 10px rgba(0,0,0,0.07)",
        background: booth.wallColor,
        border: `1px solid ${nearby ? booth.roofColor + "60" : "rgba(0,0,0,0.05)"}`,
      }}>
        {/* Color bar top */}
        <div style={{
          height: 4,
          background: `linear-gradient(90deg, ${booth.roofColor}, ${booth.accentColor || booth.roofColor})`,
        }} />

        {/* Content row: icon + text + staff avatar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
        }}>
          {/* Icon */}
          {booth.icon && (
            <span style={{
              fontSize: 22,
              lineHeight: 1,
              flexShrink: 0,
            }}>
              {booth.icon}
            </span>
          )}

          {/* Label + welcome */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#2a3a40",
              lineHeight: 1.3,
            }}>
              {label}
            </div>
            {welcome && (
              <div style={{
                fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: booth.roofColor,
                lineHeight: 1.3,
                marginTop: 2,
              }}>
                {welcome}
              </div>
            )}
          </div>

          {/* Staff + ready badge */}
          {booth.hasStaff && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}>
              <StaffAvatar size={24} />
              <div style={{
                fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
                fontSize: 7,
                fontWeight: 600,
                color: "#c84878",
                whiteSpace: "nowrap",
              }}>
                {staffName}
              </div>
              <div style={{
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
                  fontSize: 7,
                  color: "#4aba80",
                  fontWeight: 600,
                }}>
                  {language === "th" ? "พร้อม" : "Ready"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tap prompt (only when nearby) ── */}
      {nearby && (
        <div style={{
          textAlign: "center",
          marginTop: 6,
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          fontSize: 10,
          fontWeight: 600,
          color: "#fff",
          background: booth.roofColor + "dd",
          padding: "3px 14px",
          borderRadius: 10,
          display: "inline-block",
          width: "auto",
          margin: "6px auto 0",
          left: "50%",
          position: "relative",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          boxShadow: `0 2px 8px ${booth.roofColor}30`,
        }}>
          {language === "th" ? "แตะเพื่อเปิด →" : "Tap to open →"}
        </div>
      )}
    </div>
  );
}
