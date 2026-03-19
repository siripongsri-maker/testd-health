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
      className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5"
      style={{
        background: "rgba(255,255,255,.9)",
        backdropFilter: "blur(12px)",
        borderRadius: 20,
        padding: "4px 4px 4px 14px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        border: "1px solid rgba(0,0,0,0.06)",
        width: "min(320px, 80vw)",
      }}
    >
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 100))}
        placeholder={language === "th" ? "ส่งข้อความทักทาย..." : "Say hello..."}
        maxLength={100}
        disabled={disabled}
        className="flex-1 bg-transparent border-none outline-none text-xs"
        style={{
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
          color: "#2a4a54",
          fontSize: 12,
        }}
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="flex items-center justify-center rounded-full transition-colors"
        style={{
          width: 28,
          height: 28,
          background: text.trim() ? "#5ba8b5" : "#d0d8dc",
          color: "#fff",
        }}
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
