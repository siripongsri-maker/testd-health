import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ThreadStatus = "new" | "open" | "waiting_user" | "waiting_staff" | "resolved";
export type ThreadPriority = "low" | "normal" | "high" | "urgent";
export type FilterTab = "all" | "unread" | "waiting_staff" | "waiting_user" | "urgent" | "resolved";

export interface EnrichedThread {
  id: string;
  user_id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_user_message_at: string | null;
  first_response_at: string | null;
  sla_deadline_at: string | null;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  unread_count: number;
  is_overdue: boolean;
}

export interface CannedResponse {
  id: string;
  title_en: string;
  title_th: string;
  content_en: string;
  content_th: string;
  category: string;
  display_order: number;
}

export interface InternalNote {
  id: string;
  thread_id: string;
  author_id: string;
  note_text: string;
  created_at: string;
}

export interface InboxMetrics {
  newToday: number;
  unread: number;
  overdue: number;
  resolvedToday: number;
  avgFirstResponseMin: number | null;
}

const SLA_THRESHOLDS: Record<string, number> = {
  urgent: 5 * 60 * 1000,
  high: 15 * 60 * 1000,
  normal: 30 * 60 * 1000,
  low: 60 * 60 * 1000,
};

export function useAdminMessages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<EnrichedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);

  const fetchThreads = useCallback(async () => {
    const { data: threadData } = await supabase
      .from("direct_chat_threads")
      .select("*")
      .neq("status", "archived")
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (!threadData) { setThreads([]); setLoading(false); return; }

    const userIds = [...new Set(threadData.map((t: any) => t.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

    const { data: readStates } = await supabase
      .from("direct_chat_read_states")
      .select("thread_id, last_read_at")
      .eq("user_id", user?.id || "");

    const readMap: Record<string, string> = {};
    (readStates || []).forEach((r: any) => { readMap[r.thread_id] = r.last_read_at; });

    const enriched: EnrichedThread[] = await Promise.all(
      threadData.map(async (t: any) => {
        const lastRead = readMap[t.id];
        let unreadCount = 0;
        const query = supabase
          .from("direct_chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", t.id)
          .neq("sender_id", user?.id || "");
        if (lastRead) query.gt("created_at", lastRead);
        const { count } = await query;
        unreadCount = count || 0;

        const profile = profileMap[t.user_id];
        const now = Date.now();
        const slaMs = SLA_THRESHOLDS[t.priority] || SLA_THRESHOLDS.normal;
        const lastUserMsg = t.last_user_message_at ? new Date(t.last_user_message_at).getTime() : null;
        const isOverdue = !!(
          lastUserMsg &&
          !t.first_response_at &&
          t.status !== "resolved" &&
          (now - lastUserMsg) > slaMs
        ) || !!(
          t.sla_deadline_at &&
          new Date(t.sla_deadline_at).getTime() < now &&
          t.status !== "resolved"
        );

        return {
          id: t.id,
          user_id: t.user_id,
          status: t.status || "open",
          priority: t.priority || "normal",
          assigned_to: t.assigned_to,
          subject: t.subject,
          last_message_at: t.last_message_at,
          last_message_preview: t.last_message_preview,
          last_user_message_at: t.last_user_message_at,
          first_response_at: t.first_response_at,
          sla_deadline_at: t.sla_deadline_at,
          created_at: t.created_at,
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url,
          unread_count: unreadCount,
          is_overdue: isOverdue,
        };
      })
    );

    // Sort: overdue first, then urgent, then by last_message_at
    enriched.sort((a, b) => {
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    setThreads(enriched);
    setLoading(false);
  }, [user?.id]);

  const fetchCannedResponses = useCallback(async () => {
    const { data } = await supabase
      .from("chat_canned_responses")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    setCannedResponses((data as unknown as CannedResponse[]) || []);
  }, []);

  useEffect(() => {
    fetchThreads();
    fetchCannedResponses();
  }, [fetchThreads, fetchCannedResponses]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_chat_messages" }, () => fetchThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_chat_threads" }, () => fetchThreads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchThreads]);

  const filteredThreads = useMemo(() => {
    let result = threads;

    // Tab filter
    if (filterTab === "unread") result = result.filter(t => t.unread_count > 0);
    else if (filterTab === "waiting_staff") result = result.filter(t => t.status === "waiting_staff" || t.status === "open" || t.status === "new");
    else if (filterTab === "waiting_user") result = result.filter(t => t.status === "waiting_user");
    else if (filterTab === "urgent") result = result.filter(t => t.priority === "urgent" || t.priority === "high" || t.is_overdue);
    else if (filterTab === "resolved") result = result.filter(t => t.status === "resolved");

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.display_name.toLowerCase().includes(q) ||
        (t.last_message_preview || "").toLowerCase().includes(q) ||
        (t.subject || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [threads, filterTab, search]);

  const metrics: InboxMetrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      newToday: threads.filter(t => t.created_at.slice(0, 10) === today).length,
      unread: threads.filter(t => t.unread_count > 0).length,
      overdue: threads.filter(t => t.is_overdue).length,
      resolvedToday: threads.filter(t => t.status === "resolved" && t.created_at.slice(0, 10) === today).length,
      avgFirstResponseMin: null, // Could compute from first_response_at data
    };
  }, [threads]);

  // Actions
  const updateThread = useCallback(async (threadId: string, updates: Record<string, any>) => {
    await supabase.from("direct_chat_threads").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", threadId);
    fetchThreads();
  }, [fetchThreads]);

  const addInternalNote = useCallback(async (threadId: string, noteText: string) => {
    if (!user) return;
    await supabase.from("chat_internal_notes").insert({
      thread_id: threadId,
      author_id: user.id,
      note_text: noteText,
    });
  }, [user]);

  const fetchInternalNotes = useCallback(async (threadId: string): Promise<InternalNote[]> => {
    const { data } = await supabase
      .from("chat_internal_notes")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as unknown as InternalNote[]) || [];
  }, []);

  return {
    threads: filteredThreads,
    allThreads: threads,
    loading,
    search,
    setSearch,
    filterTab,
    setFilterTab,
    metrics,
    cannedResponses,
    updateThread,
    addInternalNote,
    fetchInternalNotes,
    refreshThreads: fetchThreads,
  };
}
