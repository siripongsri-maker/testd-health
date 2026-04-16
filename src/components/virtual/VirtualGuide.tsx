import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Send, X, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackJourneyEvent } from "@/lib/journeyTracker";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: { type: string; route: string } | null;
}

export function VirtualGuide() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("virtual-guide", {
        body: { message: text, language },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || (language === "th" ? "ขอโทษค่ะ ลองอีกครั้งนะคะ" : "Sorry, please try again."),
        action: data.action || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const status = e?.status || e?.context?.status;
      if (status === 429) {
        toast({ title: language === "th" ? "กรุณารอสักครู่" : "Please wait", description: "Rate limited", variant: "destructive" });
      } else if (status === 402) {
        toast({ title: "AI credits", description: language === "th" ? "เครดิต AI หมด" : "AI credits exhausted", variant: "destructive" });
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: language === "th" ? "ขอโทษค่ะ ลองอีกครั้งนะคะ" : "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform animate-scale-in"
        aria-label="AI Guide"
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl animate-scale-in flex flex-col overflow-hidden"
      style={{ maxHeight: "60dvh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {language === "th" ? "ผู้ช่วยนำทาง" : "Virtual Guide"}
          </span>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-4">
            {language === "th"
              ? 'ถามอะไรก็ได้ เช่น "อยากตรวจ HIV"'
              : 'Ask anything, e.g. "I want to get tested"'}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              <div
                className={`rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
              {msg.action?.route && (
                <button
                  onClick={() => navigate(msg.action!.route)}
                  className="flex items-center gap-1.5 self-start rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Navigation className="h-3 w-3" />
                  {language === "th" ? "พาไปเลย" : "Take me there"}
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
                <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-border/30 px-3 py-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={language === "th" ? "พิมพ์ข้อความ..." : "Type a message..."}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          disabled={loading}
        />
        <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 rounded-full" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
