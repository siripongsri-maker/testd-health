import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function VirtualChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2"
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        background: "rgba(255,255,255,.94)",
        backdropFilter: "blur(16px)",
        borderRadius: 22,
        padding: "4px 6px 4px 14px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(91,168,181,0.1)",
        width: "min(320px, calc(100vw - 32px))",
      }}
    >
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 100))}
        placeholder={language === "th" ? "ส่งข้อความทักทาย..." : "Say hello..."}
        maxLength={100}
        disabled={disabled}
        className="flex-1 bg-transparent border-none outline-none"
        style={{
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          color: "#2a4a54",
          fontSize: 13,
          lineHeight: 1.4,
        }}
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="flex items-center justify-center rounded-full transition-all duration-200"
        style={{
          width: 30,
          height: 30,
          flexShrink: 0,
          background: text.trim()
            ? "linear-gradient(135deg, #5ba8b5, #4a98a5)"
            : "#d0d8dc",
          color: "#fff",
          boxShadow: text.trim() ? "0 2px 8px rgba(91,168,181,0.3)" : "none",
        }}
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
