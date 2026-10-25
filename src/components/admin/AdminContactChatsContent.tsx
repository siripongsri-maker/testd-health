/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Search, ArrowLeft, RefreshCw, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface SessionSummary {
  session_id: string;
  message_count: number;
  first_at: string;
  last_at: string;
  topic: string;
  lang: "th" | "en";
}

const hasThai = (s: string) => /[ก-๙]/.test(s);

export default function AdminContactChatsContent() {
  const { language } = useLanguage();
  const th = language === "th";
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<"all" | "th" | "en">("all");
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contact_chat_messages")
      .select("id, session_id, role, content, created_at")
      .order("created_at", { ascending: true })
      .limit(5000);
    setRows((data as unknown as ChatRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sessions: SessionSummary[] = useMemo(() => {
    const map = new Map<string, ChatRow[]>();
    rows.forEach((r) => {
      const arr = map.get(r.session_id) || [];
      arr.push(r);
      map.set(r.session_id, arr);
    });
    return [...map.entries()].map(([session_id, msgs]): SessionSummary => {
      const firstUser = msgs.find((m) => m.role === "user");
      return {
        session_id,
        message_count: msgs.length,
        first_at: msgs[0].created_at,
        last_at: msgs[msgs.length - 1].created_at,
        topic: firstUser?.content || "",
        lang: hasThai(firstUser?.content || "") ? "th" : "en",
      };
    }).sort((a, b) => b.last_at.localeCompare(a.last_at));
  }, [rows]);

  const filtered = useMemo(() => {
    let out = sessions;
    if (langFilter !== "all") out = out.filter((s) => s.lang === langFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((s) =>
        s.topic.toLowerCase().includes(q) ||
        s.session_id.toLowerCase().includes(q) ||
        (rows || []).some((r) => r.session_id === s.session_id && r.content.toLowerCase().includes(q))
      );
    }
    return out;
  }, [sessions, langFilter, search, rows]);

  const activeMessages = useMemo(
    () => rows.filter((r) => r.session_id === activeSession),
    [rows, activeSession]
  );

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(th ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

  if (loading) {
    return <div className="flex justify-center py-16 text-muted-foreground">{th ? "กำลังโหลด..." : "Loading..."}</div>;
  }

  if (activeSession) {
    const s = sessions.find((x) => x.session_id === activeSession);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Button variant="ghost" size="icon" onClick={() => setActiveSession(null)} aria-label={th ? "กลับ" : "Back"}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{s?.topic || activeSession}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {th ? "เซสชัน" : "Session"}: {activeSession.slice(0, 8)}… · {s?.message_count} {th ? "ข้อความ" : "messages"} · {s && fmt(s.first_at)}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto shrink-0">{s?.lang === "th" ? "ไทย" : "EN"}</Badge>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-3">
            <div className="space-y-3">
              {activeMessages.map((m) => (
                <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && <Bot className="h-5 w-5 mt-1 shrink-0 text-primary" aria-hidden />}
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words",
                    m.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                  )}>
                    {m.content}
                    <p className={cn("text-[10px] mt-1", m.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {fmt(m.created_at)}
                    </p>
                  </div>
                  {m.role === "user" && <User className="h-5 w-5 mt-1 shrink-0 text-muted-foreground" aria-hidden />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-primary" />
          {th ? "ประวัติแชทผู้ช่วยอัตโนมัติ" : "Assistant Chat History"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {th
            ? "บทสนทนาจากผู้ช่วยอัตโนมัติในหน้าติดต่อและ self-care แยกตามเซสชัน — ไม่มีข้อมูลระบุตัวตนผู้ถาม"
            : "Conversations from the automatic assistant on the contact and self-care pages, grouped by session — no visitor identity stored."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={th ? "ค้นหาคำถามหรือเซสชัน..." : "Search questions or sessions..."}
              className="pl-8"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "th", "en"] as const).map((f) => (
              <Button key={f} size="sm" variant={langFilter === f ? "default" : "outline"} onClick={() => setLangFilter(f)}>
                {f === "all" ? (th ? "ทั้งหมด" : "All") : f === "th" ? "ไทย" : "EN"}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={load} aria-label={th ? "รีเฟรช" : "Refresh"}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {th ? "ยังไม่มีบทสนทนา" : "No conversations yet."}
          </p>
        ) : (
          <div className="divide-y rounded-xl border">
            {filtered.map((s) => (
              <button
                key={s.session_id}
                onClick={() => setActiveSession(s.session_id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.topic || (th ? "(ไม่มีคำถาม)" : "(no question)")}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(s.last_at)} · {s.message_count} {th ? "ข้อความ" : "messages"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">{s.lang === "th" ? "ไทย" : "EN"}</Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
