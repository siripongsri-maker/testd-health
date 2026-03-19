import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useVirtualGreetings, type VirtualGreeting } from "@/hooks/useVirtualGreetings";
import { MessageCircle, Sparkles } from "lucide-react";

/**
 * Floating chat bubbles on the Homepage showing recent virtual space greetings.
 * Entices users to join /virtual.
 */
export function VirtualGreetingBubbles() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { greetings } = useVirtualGreetings(5);
  const [visibleIdx, setVisibleIdx] = useState(0);
  const [show, setShow] = useState(false);

  // Cycle through greetings
  useEffect(() => {
    if (greetings.length === 0) return;
    setShow(true);
    const interval = setInterval(() => {
      setVisibleIdx((prev) => (prev + 1) % greetings.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [greetings.length]);

  if (greetings.length === 0) return null;

  const current = greetings[visibleIdx % greetings.length];
  if (!current) return null;

  return (
    <div
      className="fixed bottom-20 right-3 z-40 cursor-pointer"
      onClick={() => navigate("/virtual")}
      style={{ maxWidth: 220 }}
    >
      {/* Bubble */}
      <div
        className="animate-in slide-in-from-right-4 fade-in duration-500"
        key={current.id}
        style={{
          background: "rgba(255,255,255,.95)",
          backdropFilter: "blur(12px)",
          borderRadius: 16,
          padding: "10px 14px",
          boxShadow: "0 4px 20px rgba(91,168,181,0.2), 0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid rgba(91,168,181,0.15)",
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          marginBottom: 6,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <MessageCircle className="h-3 w-3" style={{ color: "#5ba8b5" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "#5ba8b5" }}>
            {current.display_name}
          </span>
          <span style={{ fontSize: 8, color: "#9ab0b8" }}>
            · Virtual Space
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#2a4a54", lineHeight: 1.4 }}>
          {current.message}
        </div>
      </div>

      {/* CTA pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          background: "linear-gradient(135deg, #5ba8b5, #4da8a0)",
          color: "#fff",
          borderRadius: 20,
          padding: "5px 14px",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          boxShadow: "0 2px 8px rgba(91,168,181,0.3)",
        }}
      >
        <Sparkles className="h-3 w-3" />
        {language === "th" ? "เข้ามาคุยกัน!" : "Join the chat!"}
      </div>
    </div>
  );
}
