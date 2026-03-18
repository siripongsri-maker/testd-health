import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const SESSION_KEY = "virtual_intro_seen";

export function VirtualIntroOverlay() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SESSION_KEY));
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    // wait for pixel font or timeout
    const timeout = setTimeout(() => setFontReady(true), 800);
    document.fonts?.ready?.then(() => { clearTimeout(timeout); setFontReady(true); });
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,15,30,.85)", backdropFilter: "blur(4px)" }}>
      <div
        className="max-w-sm w-full text-center animate-scale-in"
        style={{
          background: "#1a2e1a",
          border: "3px solid #4ade80",
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 0 30px rgba(74,222,128,.15), inset 0 0 20px rgba(0,0,0,.3)",
          opacity: fontReady ? 1 : 0,
          transition: "opacity .3s",
        }}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(74,222,128,.15)" }}>
          <MapPin className="h-6 w-6" style={{ color: "#4ade80" }} />
        </div>

        <h2
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11,
            color: "#4ade80",
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          {language === "th" ? "VIRTUAL MODE" : "VIRTUAL MODE"}
        </h2>

        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            color: "rgba(255,255,255,.6)",
            lineHeight: 2,
            marginBottom: 20,
          }}
        >
          {language === "th"
            ? "เดินสำรวจโลกพิกเซล\nแตะโซนเพื่อเข้าใช้บริการ"
            : "Explore the pixel world\nTap booths to access services"}
        </p>

        <Button
          onClick={dismiss}
          className="w-full font-mono text-xs"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            background: "#4ade80",
            color: "#1a2e1a",
            border: "none",
          }}
        >
          {language === "th" ? "▶ เริ่มเลย" : "▶ START"}
        </Button>
      </div>
    </div>
  );
}
