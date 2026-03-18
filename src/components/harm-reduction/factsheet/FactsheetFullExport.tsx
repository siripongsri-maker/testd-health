import { forwardRef } from "react";
import {
  Clock, Zap, AlertTriangle, CheckCircle2, Phone, Heart, Shield,
} from "lucide-react";
import { SubstanceData, RISK_LABELS } from "@/data/substanceData";
import testdLogo from "@/assets/testd-logo.png";
import swingLogo from "@/assets/swing-logo.png";
import { RiskIcon } from "./RiskIcon";

type ExportLang = "th" | "en" | "bilingual";

interface Props {
  substance: SubstanceData;
  exportLang: ExportLang;
}

function t(bi: { th: string; en: string }, lang: ExportLang): string {
  if (lang === "bilingual") return `${bi.th}\n${bi.en}`;
  return bi[lang];
}

export const FactsheetFullExport = forwardRef<HTMLDivElement, Props>(
  ({ substance, exportLang }, ref) => {
    const d = substance;
    const c = d.content;

    return (
      <div
        ref={ref}
        style={{
          width: 440,
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          background: "#ffffff",
          color: "#1a1a2e",
        }}
      >
        {/* Image Header */}
        <div style={{ position: "relative" }}>
          <img
            src={d.image.cover}
            alt={d.image.alt}
            style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
            crossOrigin="anonymous"
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.25) 50%, rgba(0,0,0,.1) 100%)",
          }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <span style={{ fontSize: 36 }}>{d.icon}</span>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "8px 0 2px", lineHeight: 1.2 }}>
                  {exportLang === "en" ? d.nameEn : d.nameTh}
                </h1>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 500, margin: 0 }}>
                  {exportLang === "en" ? d.nameTh : d.nameEn}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,.2)", color: "#fff", backdropFilter: "blur(4px)" }}>
                  {exportLang === "en" ? d.categoryEn : d.categoryTh}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,.25)", color: "#fff" }}>
                  {t(RISK_LABELS[d.riskLevel], exportLang)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick info */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee" }}>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
            {t(c.desc, exportLang)}
          </p>
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" }}>
              <Clock style={{ width: 14, height: 14, color: "#3A6FF7" }} />
              <span style={{ fontWeight: 600 }}>{c.duration}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#888" }}>
              <Zap style={{ width: 14, height: 14, color: "#3A6FF7" }} />
              <span style={{ fontWeight: 600 }}>{t(c.keyEffect, exportLang)}</span>
            </div>
          </div>
        </div>

        {/* Risks */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: "#f59e0b" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888" }}>
              {exportLang === "en" ? "Potential Risks" : exportLang === "th" ? "ความเสี่ยงที่อาจเกิดขึ้น" : "ความเสี่ยง · Risks"}
            </span>
          </div>
          {c.risks.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <RiskIcon name={r.iconName} color="#f59e0b" />
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5, margin: 0, whiteSpace: "pre-line" }}>{t(r, exportLang)}</p>
            </div>
          ))}
        </div>

        {/* Harm Reduction */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee", background: "#f0faf8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Shield style={{ width: 14, height: 14, color: "#10b981" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#047857" }}>
              {exportLang === "en" ? "Harm Reduction Tips" : exportLang === "th" ? "คำแนะนำลดอันตราย" : "ลดอันตราย · Harm Reduction"}
            </span>
          </div>
          {c.harmReduction.map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <CheckCircle2 style={{ width: 14, height: 14, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: "#064e3b", lineHeight: 1.5, margin: 0, whiteSpace: "pre-line" }}>{t(tip, exportLang)}</p>
            </div>
          ))}
        </div>

        {/* Emergency */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee", background: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Phone style={{ width: 14, height: 14, color: "#ef4444" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#b91c1c" }}>
              {exportLang === "en" ? "Seek Help Immediately If…" : exportLang === "th" ? "ขอความช่วยเหลือทันทีหาก…" : "ขอความช่วยเหลือ · Seek Help If…"}
            </span>
          </div>
          {c.emergencySigns.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: "#7f1d1d", lineHeight: 1.5, margin: 0, whiteSpace: "pre-line" }}>{t(s, exportLang)}</p>
            </div>
          ))}
          <div style={{ background: "#fecaca", borderRadius: 12, padding: "8px 12px", textAlign: "center", marginTop: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", margin: 0 }}>
              📞 {exportLang === "en" ? "Emergency: 1323 or 1669" : "ฉุกเฉิน: 1323 หรือ 1669"}
            </p>
          </div>
        </div>

        {/* Aftercare */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #eee" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Heart style={{ width: 14, height: 14, color: "#ec4899" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888" }}>
              {exportLang === "en" ? "Aftercare & Recovery" : exportLang === "th" ? "การดูแลหลังใช้" : "ดูแลหลังใช้ · Aftercare"}
            </span>
          </div>
          {c.aftercare.map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <Heart style={{ width: 14, height: 14, color: "#f9a8d4", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: "#666", lineHeight: 1.5, margin: 0, whiteSpace: "pre-line" }}>{t(tip, exportLang)}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={testdLogo} alt="testD" style={{ height: 20 }} crossOrigin="anonymous" />
              <span style={{ fontSize: 10, color: "#aaa" }}>×</span>
              <img src={swingLogo} alt="SWING" style={{ height: 20 }} crossOrigin="anonymous" />
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f3f4f6", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 8, color: "#aaa", fontWeight: 500, textAlign: "center", lineHeight: 1.2 }}>QR<br />Code</span>
            </div>
          </div>
          <p style={{ fontSize: 9, color: "#bbb", lineHeight: 1.5, margin: 0 }}>
            {exportLang === "en"
              ? "This factsheet is for educational purposes only. Not medical advice. Always consult a healthcare professional. Content by SWING Thailand."
              : "เอกสารนี้เพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ ปรึกษาแพทย์เสมอ เนื้อหาโดย SWING Thailand"}
          </p>
        </div>
      </div>
    );
  }
);

FactsheetFullExport.displayName = "FactsheetFullExport";
