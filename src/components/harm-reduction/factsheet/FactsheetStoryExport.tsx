import { forwardRef } from "react";
import { Shield, AlertTriangle, Phone, CheckCircle2 } from "lucide-react";
import { SubstanceData, RISK_GRADIENTS, RISK_LABELS } from "@/data/substanceData";
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
 * Safe margins top/bottom for story UI overlays.
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
        {/* Safe zone top spacer */}
        <div style={{ height: 100, background: RISK_GRADIENTS[d.riskLevel] }} />

        {/* Hero */}
        <div
          style={{
            background: RISK_GRADIENTS[d.riskLevel],
            padding: "40px 60px 60px",
            flex: "0 0 auto",
          }}
        >
          <span style={{ fontSize: 72 }}>{d.icon}</span>
          <h1 style={{ fontSize: 56, fontWeight: 900, color: "#fff", margin: "16px 0 4px", lineHeight: 1.15 }}>
            {exportLang === "en" ? d.nameEn : d.nameTh}
          </h1>
          <p style={{ fontSize: 28, color: "rgba(255,255,255,.7)", fontWeight: 500, margin: 0 }}>
            {exportLang === "en" ? d.nameTh : d.nameEn}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <span style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", padding: "8px 20px", borderRadius: 999, background: "rgba(255,255,255,.2)", color: "#fff" }}>
              {exportLang === "en" ? d.categoryEn : d.categoryTh}
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, textTransform: "uppercase", padding: "8px 20px", borderRadius: 999, background: "rgba(255,255,255,.25)", color: "#fff" }}>
              {t(RISK_LABELS[d.riskLevel], exportLang)}
            </span>
          </div>
          <p style={{ fontSize: 26, color: "rgba(255,255,255,.85)", lineHeight: 1.5, marginTop: 28, whiteSpace: "pre-line" }}>
            {t(c.desc, exportLang)}
          </p>
        </div>

        {/* Risks */}
        <div style={{ padding: "36px 60px", borderBottom: "2px solid #f3f4f6", flex: "0 0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <AlertTriangle style={{ width: 28, height: 28, color: "#f59e0b" }} />
            <span style={{ fontSize: 24, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#92400e" }}>
              {exportLang === "en" ? "Key Risks" : "ความเสี่ยงหลัก"}
            </span>
          </div>
          {topRisks.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
              <RiskIcon name={r.iconName} color="#f59e0b" size={26} />
              <p style={{ fontSize: 24, color: "#444", lineHeight: 1.45, margin: 0, whiteSpace: "pre-line" }}>{t(r, exportLang)}</p>
            </div>
          ))}
        </div>

        {/* Harm Reduction — highlight */}
        <div style={{ padding: "36px 60px", background: "#f0fdf4", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <Shield style={{ width: 28, height: 28, color: "#10b981" }} />
            <span style={{ fontSize: 24, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#047857" }}>
              {exportLang === "en" ? "Stay Safer" : "ลดอันตราย"}
            </span>
          </div>
          {topTips.map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
              <CheckCircle2 style={{ width: 26, height: 26, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 24, color: "#064e3b", lineHeight: 1.45, margin: 0, whiteSpace: "pre-line" }}>{t(tip, exportLang)}</p>
            </div>
          ))}
        </div>

        {/* Emergency + Footer */}
        <div style={{ padding: "28px 60px", background: "#fef2f2", flex: "0 0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Phone style={{ width: 28, height: 28, color: "#ef4444" }} />
            <span style={{ fontSize: 28, fontWeight: 800, color: "#b91c1c" }}>
              📞 {exportLang === "en" ? "Emergency: 1323 / 1669" : "ฉุกเฉิน: 1323 / 1669"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "24px 60px 100px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
