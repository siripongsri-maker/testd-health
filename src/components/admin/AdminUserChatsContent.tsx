import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle, Search, Send, CheckCircle, Archive,
  RotateCcw, User, Clock, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Thread {
  id: string;
  user_id: string;
  status: string;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: string;
  message_text: string;
  is_deleted: boolean;
  created_at: string;
}

export default function AdminUserChatsContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [newUserSearch, setNewUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  const fetchThreads = useCallback(async () => {
    const { data: threadData } = await supabase
      .from("direct_chat_threads")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(100);

    if (!threadData) { setThreads([]); setLoading(false); return; }

    const userIds = [...new Set((threadData as any[]).map((t: any) => t.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    // Get unread counts for admin
    const { data: readStates } = await supabase
      .from("direct_chat_read_states")
      .select("thread_id, last_read_at")
      .eq("user_id", user?.id || "");

    const readMap: Record<string, string> = {};
    (readStates || []).forEach((r: any) => { readMap[r.thread_id] = r.last_read_at; });

    // Count unread per thread
    const enriched = await Promise.all(
      (threadData as any[]).map(async (t: any) => {
        const lastRead = readMap[t.id];
        let unreadCount = 0;
        if (lastRead) {
          const { count } = await supabase
            .from("direct_chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("thread_id", t.id)
            .neq("sender_id", user?.id || "")
            .gt("created_at", lastRead);
          unreadCount = count || 0;
        } else {
          const { count } = await supabase
            .from("direct_chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("thread_id", t.id)
            .neq("sender_id", user?.id || "");
          unreadCount = count || 0;
        }
        const profile = profileMap[t.user_id];
        return {
          ...t,
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url,
          unread_count: unreadCount,
        };
      })
    );

    setThreads(enriched);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  // Realtime for new messages
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_chat_messages" }, () => {
        fetchThreads();
        if (selectedThread) loadMessages(selectedThread.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_chat_threads" }, () => {
        fetchThreads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchThreads, selectedThread]);

  const loadMessages = async (threadId: string) => {
    const { data } = await supabase
      .from("direct_chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as unknown as Message[]) || []);
    // Mark as read
    if (user?.id) {
      await supabase
        .from("direct_chat_read_states")
        .upsert({ thread_id: threadId, user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: "thread_id,user_id" });
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSelectThread = (thread: Thread) => {
    setSelectedThread(thread);
    setShowMobileList(false);
    loadMessages(thread.id);
  };

  const handleSend = async () => {
    if (!composerText.trim() || !selectedThread || sending) return;
    setSending(true);
    const { error } = await supabase.rpc("send_chat_message", {
      p_thread_id: selectedThread.id,
      p_message: composerText.trim(),
    });
    if (error) { toast.error(error.message); }
    else { setComposerText(""); }
    setSending(false);
  };

  const handleStatusChange = async (threadId: string, status: string) => {
    await supabase.from("direct_chat_threads").update({ status, updated_at: new Date().toISOString() }).eq("id", threadId);
    fetchThreads();
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev => prev ? { ...prev, status } : null);
    }
    toast.success(language === "th" ? "อัปเดตสถานะแล้ว" : "Status updated");
  };

  // Search users to start new chat
  const handleUserSearch = async (query: string) => {
    setNewUserSearch(query);
    if (query.length < 2) { setUserResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${query}%`)
      .limit(10);
    setUserResults(data || []);
  };

  const handleStartChat = async (userId: string) => {
    const { data, error } = await supabase.rpc("get_or_create_chat_thread", { p_user_id: userId });
    if (error) { toast.error(error.message); return; }
    setNewUserSearch("");
    setUserResults([]);
    await fetchThreads();
    const threadId = data as string;
    const thread = threads.find(t => t.id === threadId);
    if (thread) handleSelectThread(thread);
    else {
      // Thread just created, re-fetch and select
      const { data: newThread } = await supabase
        .from("direct_chat_threads")
        .select("*")
        .eq("id", threadId)
        .single();
      if (newThread) {
        const { data: profile } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", userId).single();
        handleSelectThread({
          ...(newThread as any),
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url,
          unread_count: 0,
        });
      }
    }
  };

  const filteredThreads = threads.filter(t =>
    !search || (t.display_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const statusBadge = (status: string) => {
    if (status === "resolved") return <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">{language === "th" ? "แก้ไขแล้ว" : "Resolved"}</Badge>;
    if (status === "archived") return <Badge variant="outline" className="text-muted-foreground text-[10px]">{language === "th" ? "เก็บถาวร" : "Archived"}</Badge>;
    return <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">{language === "th" ? "เปิด" : "Open"}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{language === "th" ? "แชทกับผู้ใช้" : "User Chats"}</h2>
        {threads.filter(t => (t.unread_count || 0) > 0).length > 0 && (
          <Badge className="bg-destructive text-destructive-foreground text-xs">
            {threads.reduce((sum, t) => sum + (t.unread_count || 0), 0)}
          </Badge>
        )}
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)] min-h-[400px]">
        {/* Thread list */}
        <div className={cn(
          "w-full md:w-80 shrink-0 flex flex-col border rounded-xl bg-card",
          !showMobileList && "hidden md:flex"
        )}>
          {/* New chat search */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "th" ? "ค้นหาผู้ใช้เพื่อเริ่มแชท..." : "Search user to start chat..."}
                className="pl-9 h-9"
                value={newUserSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
              />
            </div>
            {userResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-auto">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left text-sm"
                    onClick={() => handleStartChat(u.id)}
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="truncate">{u.display_name || "User"}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Filter existing threads */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "th" ? "กรองแชท..." : "Filter chats..."}
                className="pl-9 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {language === "th" ? "ยังไม่มีแชท" : "No chats yet"}
              </div>
            ) : (
              filteredThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectThread(t)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 border-b text-left hover:bg-muted/30 transition-colors",
                    selectedThread?.id === t.id && "bg-muted/50"
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-sm truncate">{t.display_name}</span>
                      {(t.unread_count || 0) > 0 && (
                        <span className="shrink-0 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {t.last_message_preview || (language === "th" ? "ยังไม่มีข้อความ" : "No messages yet")}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {statusBadge(t.status)}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(t.last_message_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Message panel */}
        <div className={cn(
          "flex-1 flex flex-col border rounded-xl bg-card",
          showMobileList && "hidden md:flex"
        )}>
          {selectedThread ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-3 border-b">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setShowMobileList(true)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{selectedThread.display_name}</p>
                  <p className="text-[10px] text-muted-foreground">{statusBadge(selectedThread.status)}</p>
                </div>
                <div className="flex gap-1">
                  {selectedThread.status === "open" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(selectedThread.id, "resolved")}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      {language === "th" ? "แก้ไขแล้ว" : "Resolve"}
                    </Button>
                  )}
                  {selectedThread.status === "resolved" && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(selectedThread.id, "open")}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      {language === "th" ? "เปิดอีกครั้ง" : "Reopen"}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(selectedThread.id, "archived")}>
                    <Archive className="h-3.5 w-3.5 mr-1" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {language === "th" ? "เริ่มการสนทนา..." : "Start the conversation..."}
                    </p>
                  )}
                  {messages.map((msg) => {
                    const isAdmin = msg.sender_role === "admin";
                    return (
                      <div key={msg.id} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5",
                          isAdmin
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message_text}</p>
                          <p className={cn(
                            "text-[10px] mt-1",
                            isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
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
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    placeholder={language === "th" ? "พิมพ์ข้อความ..." : "Type a message..."}
                    className="min-h-[40px] max-h-24 resize-none text-sm"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                  />
                  <Button size="icon" onClick={handleSend} disabled={!composerText.trim() || sending} className="shrink-0 h-10 w-10">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{language === "th" ? "เลือกแชทจากรายการ" : "Select a chat from the list"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
