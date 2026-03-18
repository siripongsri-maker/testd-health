import { forwardRef } from "react";
import { Shield, AlertTriangle, CheckCircle2, Phone } from "lucide-react";
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
 * Square export — 1080×1080 (1:1) for social feed cards.
 * Image header + two-column content.
 */
export const FactsheetSquareExport = forwardRef<HTMLDivElement, Props>(
  ({ substance, exportLang }, ref) => {
    const d = substance;
    const c = d.content;
    const topTips = c.harmReduction.slice(0, 3);
    const topRisks = c.risks.slice(0, 3);

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1080,
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Image Hero — top 40% */}
        <div style={{ position: "relative", flex: "0 0 380px" }}>
          <img
            src={d.image.cover}
            alt={d.image.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            crossOrigin="anonymous"
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.15) 50%, rgba(0,0,0,.05) 100%)",
          }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 48px 36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <span style={{ fontSize: 48 }}>{d.icon}</span>
                <h1 style={{ fontSize: 40, fontWeight: 900, color: "#fff", margin: "8px 0 4px", lineHeight: 1.15, textShadow: "0 2px 12px rgba(0,0,0,.3)" }}>
                  {exportLang === "en" ? d.nameEn : d.nameTh}
                </h1>
                <p style={{ fontSize: 20, color: "rgba(255,255,255,.7)", fontWeight: 500, margin: 0 }}>
                  {exportLang === "en" ? d.nameTh : d.nameEn}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                <span style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,.15)", color: "#fff", backdropFilter: "blur(8px)" }}>
                  {exportLang === "en" ? d.categoryEn : d.categoryTh}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,.2)", color: "#fff" }}>
                  {t(RISK_LABELS[d.riskLevel], exportLang)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column: Risks + Tips */}
        <div style={{ display: "flex", flex: 1 }}>
          {/* Risks */}
          <div style={{ flex: 1, padding: "28px 36px", borderRight: "2px solid #f3f4f6" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <AlertTriangle style={{ width: 22, height: 22, color: "#f59e0b" }} />
              <span style={{ fontSize: 18, fontWeight: 800, textTransform: "uppercase", color: "#92400e" }}>
                {exportLang === "en" ? "Risks" : "ความเสี่ยง"}
              </span>
            </div>
            {topRisks.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <RiskIcon name={r.iconName} color="#f59e0b" size={20} />
                <p style={{ fontSize: 18, color: "#555", lineHeight: 1.4, margin: 0, whiteSpace: "pre-line" }}>{t(r, exportLang)}</p>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ flex: 1, padding: "28px 36px", background: "#f0fdf4" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Shield style={{ width: 22, height: 22, color: "#10b981" }} />
              <span style={{ fontSize: 18, fontWeight: 800, textTransform: "uppercase", color: "#047857" }}>
                {exportLang === "en" ? "Stay Safer" : "ลดอันตราย"}
              </span>
            </div>
            {topTips.map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <CheckCircle2 style={{ width: 20, height: 20, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 18, color: "#064e3b", lineHeight: 1.4, margin: 0, whiteSpace: "pre-line" }}>{t(tip, exportLang)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency + Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", background: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Phone style={{ width: 22, height: 22, color: "#ef4444" }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: "#b91c1c" }}>
              📞 {exportLang === "en" ? "Emergency: 1323 / 1669" : "ฉุกเฉิน: 1323 / 1669"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={testdLogo} alt="testD" style={{ height: 28 }} crossOrigin="anonymous" />
            <span style={{ fontSize: 14, color: "#ccc" }}>×</span>
            <img src={swingLogo} alt="SWING" style={{ height: 28 }} crossOrigin="anonymous" />
          </div>
        </div>
      </div>
    );
  }
);

FactsheetSquareExport.displayName = "FactsheetSquareExport";
