import { forwardRef } from "react";
import { Shield, AlertTriangle, Phone, CheckCircle2 } from "lucide-react";
import { SubstanceData, RISK_LABELS } from "@/data/substanceData";
import testdLogo from "@/assets/testd-logo.png";
import swingLogo from "@/assets/swing-logo.png";
import { RiskIcon } from "./RiskIcon";

type ExportLang = "th" | "en" | "bilingual";

function t(bi: { th: string; en: string }, lang: ExportLang): string {
  if (lang === "bilingual") return `${bi.th}\n${bi.en}`;
  return bi[lang];
}

interface Props {
  substance: SubstanceData;
  exportLang: ExportLang;
}

/**
 * Story export — 1080×1920 (9:16) designed for IG/FB stories.
 * Image-first: top 45% is cover image, bottom is content.
 */
export const FactsheetStoryExport = forwardRef<HTMLDivElement, Props>(
  ({ substance, exportLang }, ref) => {
    const d = substance;
    const c = d.content;
    const topRisks = c.risks.slice(0, 3);
    const topTips = c.harmReduction.slice(0, 4);

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Image hero — top ~45% */}
        <div style={{ position: "relative", flex: "0 0 860px" }}>
          <img
            src={d.image.cover}
            alt={d.image.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            crossOrigin="anonymous"
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,.2) 40%, rgba(0,0,0,.05) 100%)",
          }} />
          {/* Safe zone top spacer */}
          <div style={{ position: "absolute", top: 80, left: 60, right: 60 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", padding: "8px 20px", borderRadius: 999, background: "rgba(255,255,255,.15)", color: "#fff", backdropFilter: "blur(8px)" }}>
                {exportLang === "en" ? d.categoryEn : d.categoryTh}
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", padding: "8px 20px", borderRadius: 999, background: "rgba(255,255,255,.2)", color: "#fff" }}>
                {t(RISK_LABELS[d.riskLevel], exportLang)}
              </span>
            </div>
          </div>
          {/* Name overlay at bottom of image */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 60px 48px" }}>
            <span style={{ fontSize: 72 }}>{d.icon}</span>
            <h1 style={{ fontSize: 64, fontWeight: 900, color: "#fff", margin: "12px 0 4px", lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,.3)" }}>
              {exportLang === "en" ? d.nameEn : d.nameTh}
            </h1>
            <p style={{ fontSize: 32, color: "rgba(255,255,255,.7)", fontWeight: 500, margin: 0 }}>
              {exportLang === "en" ? d.nameTh : d.nameEn}
            </p>
            <p style={{ fontSize: 26, color: "rgba(255,255,255,.8)", lineHeight: 1.4, marginTop: 20, maxWidth: 800, whiteSpace: "pre-line" }}>
              {t(c.desc, exportLang)}
            </p>
          </div>
        </div>

        {/* Risks — compact */}
        <div style={{ padding: "32px 60px 24px", borderBottom: "2px solid #f3f4f6", flex: "0 0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <AlertTriangle style={{ width: 26, height: 26, color: "#f59e0b" }} />
            <span style={{ fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#92400e" }}>
              {exportLang === "en" ? "Key Risks" : "ความเสี่ยงหลัก"}
            </span>
          </div>
          {topRisks.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <RiskIcon name={r.iconName} color="#f59e0b" size={24} />
              <p style={{ fontSize: 22, color: "#444", lineHeight: 1.4, margin: 0, whiteSpace: "pre-line" }}>{t(r, exportLang)}</p>
            </div>
          ))}
        </div>

        {/* Harm Reduction */}
        <div style={{ padding: "28px 60px", background: "#f0fdf4", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Shield style={{ width: 26, height: 26, color: "#10b981" }} />
            <span style={{ fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#047857" }}>
              {exportLang === "en" ? "Stay Safer" : "ลดอันตราย"}
            </span>
          </div>
          {topTips.map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <CheckCircle2 style={{ width: 24, height: 24, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 22, color: "#064e3b", lineHeight: 1.4, margin: 0, whiteSpace: "pre-line" }}>{t(tip, exportLang)}</p>
            </div>
          ))}
        </div>

        {/* Emergency + Footer */}
        <div style={{ padding: "24px 60px", background: "#fef2f2", flex: "0 0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Phone style={{ width: 26, height: 26, color: "#ef4444" }} />
            <span style={{ fontSize: 26, fontWeight: 800, color: "#b91c1c" }}>
              📞 {exportLang === "en" ? "Emergency: 1323 / 1669" : "ฉุกเฉิน: 1323 / 1669"}
            </span>
          </div>
        </div>

        {/* Footer with branding */}
        <div style={{ padding: "20px 60px 100px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={testdLogo} alt="testD" style={{ height: 36 }} crossOrigin="anonymous" />
            <span style={{ fontSize: 18, color: "#ccc" }}>×</span>
            <img src={swingLogo} alt="SWING" style={{ height: 36 }} crossOrigin="anonymous" />
          </div>
          <div style={{ width: 80, height: 80, borderRadius: 12, background: "#f3f4f6", border: "2px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, color: "#aaa", fontWeight: 600, textAlign: "center" }}>QR</span>
          </div>
        </div>
      </div>
    );
  }
);

FactsheetStoryExport.displayName = "FactsheetStoryExport";
