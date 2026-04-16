import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useAdminMessages, type FilterTab, type EnrichedThread, type InternalNote } from "@/hooks/useAdminMessages";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle, Search, Send, CheckCircle, Archive,
  RotateCcw, User, Clock, ChevronLeft, Sparkles,
  AlertTriangle, StickyNote, Zap, MoreVertical,
  UserPlus, ArrowUpCircle, ArrowDownCircle,
  BookOpen, Loader2, BarChart3,
} from "lucide-react";

const ChatAnalyticsDashboard = lazy(() => import("./chat/ChatAnalyticsDashboard").then(m => ({ default: m.ChatAnalyticsDashboard })));
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
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

// ── Priority / Status badges ──
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; className: string }> = {
    urgent: { label: "Urgent", className: "bg-destructive text-destructive-foreground" },
    high: { label: "High", className: "bg-orange-500 text-white" },
    normal: { label: "Normal", className: "bg-muted text-muted-foreground" },
    low: { label: "Low", className: "bg-muted/50 text-muted-foreground/70" },
  };
  const p = map[priority] || map.normal;
  if (priority === "normal" || priority === "low") return null;
  return <Badge className={cn("text-[10px] px-1.5 py-0", p.className)}>{p.label}</Badge>;
}

function StatusBadge({ status, language }: { status: string; language: string }) {
  const map: Record<string, { en: string; th: string; className: string }> = {
    new: { en: "New", th: "ใหม่", className: "border-blue-400 text-blue-600" },
    open: { en: "Open", th: "เปิด", className: "border-primary/30 text-primary" },
    waiting_staff: { en: "Waiting Staff", th: "รอเจ้าหน้าที่", className: "border-amber-400 text-amber-600" },
    waiting_user: { en: "Waiting User", th: "รอผู้ใช้", className: "border-muted-foreground/30 text-muted-foreground" },
    resolved: { en: "Resolved", th: "แก้ไขแล้ว", className: "border-emerald-400 text-emerald-600" },
  };
  const s = map[status] || map.open;
  return <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", s.className)}>{language === "th" ? s.th : s.en}</Badge>;
}

// ── Metrics bar ──
function InboxMetricsBar({ metrics, language }: { metrics: any; language: string }) {
  const items = [
    { label: language === "th" ? "ใหม่วันนี้" : "New today", value: metrics.newToday, color: "text-blue-600" },
    { label: language === "th" ? "ยังไม่อ่าน" : "Unread", value: metrics.unread, color: "text-amber-600" },
    { label: language === "th" ? "เกินเวลา" : "Overdue", value: metrics.overdue, color: "text-destructive" },
    { label: language === "th" ? "แก้ไขวันนี้" : "Resolved", value: metrics.resolvedToday, color: "text-emerald-600" },
  ];
  return (
    <div className="flex gap-4 px-1">
      {items.map((it) => (
        <div key={it.label} className="text-center">
          <p className={cn("text-lg font-bold", it.color)}>{it.value}</p>
          <p className="text-[10px] text-muted-foreground">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Filter tabs ──
const FILTER_TABS: { key: FilterTab; en: string; th: string }[] = [
  { key: "all", en: "All", th: "ทั้งหมด" },
  { key: "unread", en: "Unread", th: "ยังไม่อ่าน" },
  { key: "waiting_staff", en: "Needs Reply", th: "รอตอบ" },
  { key: "waiting_user", en: "Waiting User", th: "รอผู้ใช้" },
  { key: "urgent", en: "Urgent", th: "ด่วน" },
  { key: "resolved", en: "Resolved", th: "แก้ไขแล้ว" },
];

export default function AdminUserChatsContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const {
    threads, loading, search, setSearch, filterTab, setFilterTab,
    metrics, cannedResponses, updateThread, addInternalNote,
    fetchInternalNotes, refreshThreads,
  } = useAdminMessages();

  const [selectedThread, setSelectedThread] = useState<EnrichedThread | null>(null);
  const [adminView, setAdminView] = useState<"inbox" | "analytics">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Search users to start new chat
  const [newUserSearch, setNewUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);

  const loadMessages = useCallback(async (threadId: string) => {
    const { data } = await supabase
      .from("direct_chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as unknown as Message[]) || []);
    if (user?.id) {
      await supabase
        .from("direct_chat_read_states")
        .upsert({ thread_id: threadId, user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: "thread_id,user_id" });
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [user?.id]);

  // Realtime for selected thread messages
  useEffect(() => {
    if (!selectedThread) return;
    const channel = supabase
      .channel(`admin-chat-${selectedThread.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_chat_messages",
        filter: `thread_id=eq.${selectedThread.id}`,
      }, () => loadMessages(selectedThread.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedThread, loadMessages]);

  const handleSelectThread = (thread: EnrichedThread) => {
    setSelectedThread(thread);
    setShowMobileList(false);
    setShowNotes(false);
    setShowCanned(false);
    loadMessages(thread.id);
  };

  const handleSend = async () => {
    if (!composerText.trim() || !selectedThread || sending) return;
    setSending(true);
    const { error } = await supabase.rpc("send_chat_message", {
      p_thread_id: selectedThread.id,
      p_message: composerText.trim(),
    });
    if (error) toast.error(error.message);
    else {
      setComposerText("");
      // Update status to waiting_user after staff replies
      await updateThread(selectedThread.id, { status: "waiting_user" });
    }
    setSending(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedThread) return;
    await updateThread(selectedThread.id, { status });
    setSelectedThread(prev => prev ? { ...prev, status } : null);
    toast.success(language === "th" ? "อัปเดตสถานะแล้ว" : "Status updated");
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selectedThread) return;
    await updateThread(selectedThread.id, { priority });
    setSelectedThread(prev => prev ? { ...prev, priority } : null);
    toast.success(language === "th" ? "อัปเดตความสำคัญแล้ว" : "Priority updated");
  };

  // AI suggest
  const handleAiAction = async (action: string) => {
    if (!selectedThread) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-ai-reply", {
        body: {
          thread_id: selectedThread.id,
          action,
          text: composerText || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.suggestion) {
        setComposerText(data.suggestion);
        toast.success(language === "th" ? "สร้างข้อความเสร็จแล้ว" : "Suggestion generated");
      }
    } catch (e: any) {
      toast.error(e.message || "AI error");
    } finally {
      setAiLoading(false);
    }
  };

  // Internal notes
  const loadNotes = async (threadId: string) => {
    const notes = await fetchInternalNotes(threadId);
    setInternalNotes(notes);
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedThread) return;
    await addInternalNote(selectedThread.id, noteText.trim());
    setNoteText("");
    loadNotes(selectedThread.id);
    toast.success(language === "th" ? "เพิ่มบันทึกแล้ว" : "Note added");
  };

  // New chat search
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
    await refreshThreads();
    const threadId = data as string;
    const found = threads.find(t => t.id === threadId);
    if (found) handleSelectThread(found);
    else {
      const { data: newThread } = await supabase
        .from("direct_chat_threads").select("*").eq("id", threadId).single();
      if (newThread) {
        const { data: profile } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", userId).single();
        handleSelectThread({
          ...(newThread as any),
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url,
          unread_count: 0,
          is_overdue: false,
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{language === "th" ? "กล่องข้อความ" : "Support Inbox"}</h2>
          {metrics.unread > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-xs">{metrics.unread}</Badge>
          )}
          {/* View toggle */}
          <div className="flex gap-1 ml-3">
            <Button variant={adminView === "inbox" ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1" onClick={() => setAdminView("inbox")}>
              <MessageCircle className="h-3 w-3" /> {language === "th" ? "กล่องจดหมาย" : "Inbox"}
            </Button>
            <Button variant={adminView === "analytics" ? "default" : "outline"} size="sm" className="h-7 text-xs gap-1" onClick={() => setAdminView("analytics")}>
              <BarChart3 className="h-3 w-3" /> {language === "th" ? "วิเคราะห์" : "Analytics"}
            </Button>
          </div>
        </div>
        {adminView === "inbox" && <InboxMetricsBar metrics={metrics} language={language} />}
      </div>

      {adminView === "analytics" ? (
        <Suspense fallback={<div className="animate-pulse text-center py-8 text-muted-foreground">Loading...</div>}>
          <ChatAnalyticsDashboard />
        </Suspense>
      ) : (
      <>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={filterTab === tab.key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterTab(tab.key)}
          >
            {language === "th" ? tab.th : tab.en}
            {tab.key === "unread" && metrics.unread > 0 && (
              <span className="ml-1 bg-destructive/20 text-destructive rounded-full px-1.5 text-[10px]">{metrics.unread}</span>
            )}
            {tab.key === "urgent" && metrics.overdue > 0 && (
              <span className="ml-1 bg-destructive/20 text-destructive rounded-full px-1.5 text-[10px]">{metrics.overdue}</span>
            )}
          </Button>
        ))}
      </div>

      <div className="flex gap-3 h-[calc(100vh-16rem)] min-h-[400px]">
        {/* ── Thread list ── */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 shrink-0 flex flex-col border rounded-xl bg-card overflow-hidden",
          !showMobileList && "hidden md:flex"
        )}>
          <div className="p-3 border-b space-y-2">
            {/* New chat search */}
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "th" ? "เริ่มแชทใหม่..." : "Start new chat..."}
                className="pl-9 h-8 text-xs"
                value={newUserSearch}
                onChange={(e) => handleUserSearch(e.target.value)}
              />
            </div>
            {userResults.length > 0 && (
              <div className="border rounded-lg max-h-32 overflow-auto">
                {userResults.map((u) => (
                  <button key={u.id} className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left text-xs" onClick={() => handleStartChat(u.id)}>
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{u.display_name || "User"}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Filter search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === "th" ? "ค้นหา..." : "Search..."}
                className="pl-9 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                {language === "th" ? "ไม่พบแชท" : "No conversations found"}
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectThread(t)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 border-b text-left hover:bg-muted/30 transition-colors relative",
                    selectedThread?.id === t.id && "bg-primary/5 border-l-2 border-l-primary",
                    t.is_overdue && "bg-destructive/5"
                  )}
                >
                  {/* Overdue indicator */}
                  {t.is_overdue && (
                    <div className="absolute top-1 right-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-pulse" />
                    </div>
                  )}
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    t.unread_count > 0 ? "bg-primary/20" : "bg-muted"
                  )}>
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn("text-sm truncate", t.unread_count > 0 && "font-bold")}>{t.display_name}</span>
                      {t.unread_count > 0 && (
                        <span className="shrink-0 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-xs truncate mt-0.5", t.unread_count > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {t.last_message_preview || (language === "th" ? "ยังไม่มีข้อความ" : "No messages")}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <StatusBadge status={t.status} language={language} />
                      <PriorityBadge priority={t.priority} />
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* ── Chat panel ── */}
        <div className={cn(
          "flex-1 flex flex-col border rounded-xl bg-card overflow-hidden",
          showMobileList && "hidden md:flex"
        )}>
          {selectedThread ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-2 p-3 border-b">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setShowMobileList(true)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{selectedThread.display_name}</p>
                    <StatusBadge status={selectedThread.status} language={language} />
                    <PriorityBadge priority={selectedThread.priority} />
                    {selectedThread.is_overdue && (
                      <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 animate-pulse">
                        {language === "th" ? "เกินเวลา" : "Overdue"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    ID: {selectedThread.user_id.slice(0, 8)}…
                    {selectedThread.assigned_to && ` • Assigned`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Status select */}
                  <Select value={selectedThread.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-7 w-auto text-xs gap-1 border-0 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{language === "th" ? "ใหม่" : "New"}</SelectItem>
                      <SelectItem value="open">{language === "th" ? "เปิด" : "Open"}</SelectItem>
                      <SelectItem value="waiting_staff">{language === "th" ? "รอเจ้าหน้าที่" : "Waiting Staff"}</SelectItem>
                      <SelectItem value="waiting_user">{language === "th" ? "รอผู้ใช้" : "Waiting User"}</SelectItem>
                      <SelectItem value="resolved">{language === "th" ? "แก้ไขแล้ว" : "Resolved"}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Priority select */}
                  <Select value={selectedThread.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="h-7 w-auto text-xs gap-1 border-0 bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* More actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setShowNotes(!showNotes); if (!showNotes) loadNotes(selectedThread.id); }}>
                        <StickyNote className="h-4 w-4 mr-2" />
                        {language === "th" ? "บันทึกภายใน" : "Internal Notes"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {selectedThread.status !== "resolved" ? (
                        <DropdownMenuItem onClick={() => handleStatusChange("resolved")}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {language === "th" ? "แก้ไขแล้ว" : "Mark Resolved"}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleStatusChange("open")}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          {language === "th" ? "เปิดอีกครั้ง" : "Reopen"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleStatusChange("archived")}>
                        <Archive className="h-4 w-4 mr-2" />
                        {language === "th" ? "เก็บถาวร" : "Archive"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Internal notes panel */}
              {showNotes && (
                <div className="border-b bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <StickyNote className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {language === "th" ? "บันทึกภายใน (ผู้ใช้ไม่เห็น)" : "Internal Notes (hidden from user)"}
                    </span>
                  </div>
                  {internalNotes.map((n) => (
                    <div key={n.id} className="text-xs bg-amber-100/50 dark:bg-amber-900/30 rounded p-2">
                      <p>{n.note_text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), "dd/MM HH:mm")}</p>
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <Input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={language === "th" ? "เพิ่มบันทึก..." : "Add note..."}
                      className="h-7 text-xs"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddNote} disabled={!noteText.trim()}>
                      {language === "th" ? "บันทึก" : "Add"}
                    </Button>
                  </div>
                </div>
              )}

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

              {/* ── AI + Canned responses toolbar ── */}
              <div className="px-3 pt-2 flex items-center gap-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleAiAction("suggest")}
                  disabled={aiLoading}
                >
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {language === "th" ? "แนะนำคำตอบ" : "Suggest Reply"}
                </Button>
                {composerText && (
                  <>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAiAction("shorten")} disabled={aiLoading}>
                      <ArrowDownCircle className="h-3 w-3 mr-1" />
                      {language === "th" ? "ย่อ" : "Shorten"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAiAction("friendlier")} disabled={aiLoading}>
                      {language === "th" ? "เป็นมิตรขึ้น" : "Friendlier"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAiAction("clearer")} disabled={aiLoading}>
                      {language === "th" ? "ชัดเจนขึ้น" : "Clearer"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAiAction("translate")} disabled={aiLoading}>
                      {language === "th" ? "แปล TH/EN" : "Translate"}
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 ml-auto"
                  onClick={() => setShowCanned(!showCanned)}
                >
                  <BookOpen className="h-3 w-3" />
                  {language === "th" ? "เทมเพลต" : "Templates"}
                </Button>
              </div>

              {/* Canned responses */}
              {showCanned && (
                <div className="px-3 pb-1">
                  <div className="flex gap-1 flex-wrap py-1">
                    {cannedResponses.map((cr) => (
                      <Button
                        key={cr.id}
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          setComposerText(language === "th" ? cr.content_th : cr.content_en);
                          setShowCanned(false);
                        }}
                      >
                        {language === "th" ? cr.title_th : cr.title_en}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

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
                <p className="text-sm">{language === "th" ? "เลือกแชทจากรายการ" : "Select a conversation"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
