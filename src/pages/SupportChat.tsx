import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, ArrowLeft, Headphones, HelpCircle } from "lucide-react";
import { SupportFAQ } from "@/components/support/SupportFAQ";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: string;
  message_text: string;
  is_deleted: boolean;
  created_at: string;
}

export default function SupportChat() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find existing thread for this user
  const initThread = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_chat_threads")
      .select("id")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setThreadId(data.id);
      await loadMessages(data.id);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: "/support-chat" } });
      return;
    }
    if (user) initThread();
  }, [user, authLoading, initThread, navigate]);

  const loadMessages = async (tid: string) => {
    const { data } = await supabase
      .from("direct_chat_messages")
      .select("*")
      .eq("thread_id", tid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as unknown as Message[]) || []);

    // Mark read
    if (user?.id) {
      await supabase
        .from("direct_chat_read_states")
        .upsert({ thread_id: tid, user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: "thread_id,user_id" });
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Realtime
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`user-chat-${threadId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_chat_messages",
        filter: `thread_id=eq.${threadId}`,
      }, () => loadMessages(threadId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  const handleSend = async () => {
    if (!composerText.trim() || sending || !user) return;
    setSending(true);

    let tid = threadId;

    // If no thread exists, user sends first message — admin needs to have created the thread
    // But we allow users to create their own thread for support
    if (!tid) {
      const { data: newThread, error: createErr } = await supabase
        .from("direct_chat_threads")
        .insert({ user_id: user.id, status: "open" })
        .select("id")
        .single();
      if (createErr) {
        toast.error(language === "th" ? "ไม่สามารถเริ่มแชทได้" : "Could not start chat");
        setSending(false);
        return;
      }
      tid = newThread.id;
      setThreadId(tid);
    }

    const msgText = composerText.trim();
    const { error } = await supabase.rpc("send_chat_message", {
      p_thread_id: tid,
      p_message: msgText,
    });
    if (error) toast.error(error.message);
    else {
      setComposerText("");
      // Notify admins (fire-and-forget)
      supabase.functions.invoke("chat-notify-admin", {
        body: { thread_id: tid, message_preview: msgText.slice(0, 100) },
      }).catch(() => {});
    }
    setSending(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Headphones className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg">
            {language === "th" ? "ติดต่อแอดมิน" : "Contact Admin"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {language === "th" ? "ส่งข้อความถึงทีมสนับสนุน" : "Send a message to the support team"}
          </p>
        </div>
      </div>

      {/* FAQ section when no messages yet */}
      {messages.length === 0 && !threadId && (
        <div className="mb-3">
          <SupportFAQ language={language} compact />
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 border rounded-xl bg-card p-4 mb-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-[12px] text-muted-foreground">
                {language === "th"
                  ? "พิมพ์ข้อความเพื่อเริ่มสนทนากับแอดมิน"
                  : "Type a message to start chatting with admin"}
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}>
                  {!isMe && (
                    <p className="text-[10px] font-medium text-primary mb-0.5">
                      {language === "th" ? "แอดมิน" : "Admin"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
                    isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {format(new Date(msg.created_at), "HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="flex gap-2">
        <Textarea
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder={language === "th" ? "พิมพ์ข้อความ..." : "Type a message..."}
          className="min-h-[44px] max-h-24 resize-none text-sm"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <Button size="icon" onClick={handleSend} disabled={!composerText.trim() || sending} className="shrink-0 h-11 w-11">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
