import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import { MessageCircle, Send, X, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useAnalytics";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AICompanion() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickQuestions = isEn
    ? [
        "Is this drug combination risky?",
        "I feel anxious after using",
        "What should I do if I forgot PrEP?",
        "How do I stay safer tonight?",
      ]
    : [
        "ผสมสารหลายชนิดอันตรายไหม?",
        "รู้สึกวิตกกังวลหลังใช้สาร",
        "ลืมกิน PrEP ต้องทำยังไง?",
        "จะดูแลตัวเองให้ปลอดภัยคืนนี้ยังไง?",
      ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("hr-ai-companion", {
        body: { messages: newMessages },
      });

      if (error) throw error;
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      trackEvent("hr_ai_usage", { message_count: newMessages.length });
    } catch (err) {
      console.error("AI companion error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isEn
            ? "Sorry, I couldn't process that. Please try again."
            : "ขอโทษค่ะ ไม่สามารถประมวลผลได้ กรุณาลองใหม่",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="AI Companion"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <DrawerTitle className="text-base">
                  {isEn ? "Harm Reduction Companion" : "ผู้ช่วย Harm Reduction"}
                </DrawerTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              {isEn
                ? "Ask anything about harm reduction, safety, or health. Non-judgmental & confidential."
                : "ถามได้ทุกอย่างเรื่องความปลอดภัยและสุขภาพ ไม่ตัดสิน & เป็นความลับ"}
            </DrawerDescription>
          </DrawerHeader>

          {/* Chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 max-h-[50vh]">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  {isEn ? "Try asking:" : "ลองถาม:"}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/40">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isEn ? "Type your question..." : "พิมพ์คำถามของคุณ..."}
                className="rounded-xl flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || loading}
                className="rounded-xl px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
