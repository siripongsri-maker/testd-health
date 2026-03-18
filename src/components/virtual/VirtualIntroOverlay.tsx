import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

const SESSION_KEY = "virtual_intro_seen";

export function VirtualIntroOverlay() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SESSION_KEY));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,50,60,.6)", backdropFilter: "blur(8px)" }}>
      <div
        className="max-w-sm w-full text-center animate-scale-in"
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 24px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          border: "1px solid rgba(91,168,181,0.15)",
          opacity: ready ? 1 : 0,
          transition: "opacity .3s",
        }}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(91,168,181,0.1)" }}>
          <Activity className="h-6 w-6" style={{ color: "#3a8a90" }} />
        </div>

        <h2 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "#2a5060",
          marginBottom: 6,
          letterSpacing: "-0.01em",
        }}>
          SWING Virtual Clinic
        </h2>

        <p style={{
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          fontSize: 12,
          color: "#6a8898",
          lineHeight: 1.7,
          marginBottom: 20,
        }}>
          {language === "th"
            ? "สำรวจคลินิกเสมือนจริง\nแตะโต๊ะบริการเพื่อเข้าใช้งาน"
            : "Explore the virtual clinic workspace.\nTap service desks to access features."}
        </p>

        <Button
          onClick={dismiss}
          className="w-full text-sm font-semibold"
          style={{
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
            background: "#3a8a90",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            height: 40,
          }}
        >
          {language === "th" ? "เริ่มใช้งาน" : "Enter Workspace"}
        </Button>
      </div>
    </div>
  );
}
