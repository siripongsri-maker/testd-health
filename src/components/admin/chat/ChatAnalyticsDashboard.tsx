import { useState, useEffect } from "react";
import { ChatNotificationSettings } from "./ChatNotificationSettings";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle, Clock, TrendingUp, Users, BarChart3,
  Calendar, Zap, AlertTriangle,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Stats {
  totalThreads: number;
  openThreads: number;
  resolvedThreads: number;
  totalMessages: number;
  avgResponseTimeMinutes: number | null;
  peakHour: number | null;
  topKeywords: { word: string; count: number }[];
  dailyVolume: { date: string; count: number }[];
  unansweredThreads: number;
}

export function ChatAnalyticsDashboard() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [range, setRange] = useState("7");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [range]);

  const loadStats = async () => {
    setLoading(true);
    const days = parseInt(range);
    const since = startOfDay(subDays(new Date(), days)).toISOString();

    // Fetch threads
    const { data: threads } = await supabase
      .from("direct_chat_threads")
      .select("id, status, created_at, last_message_at")
      .gte("created_at", since);

    // Fetch messages
    const { data: messages } = await supabase
      .from("direct_chat_messages")
      .select("id, thread_id, sender_role, message_text, created_at")
      .eq("is_deleted", false)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1000);

    const allThreads = threads || [];
    const allMessages = (messages || []) as { id: string; thread_id: string; sender_role: string; message_text: string; created_at: string }[];

    // Basic counts
    const openCount = allThreads.filter(t => t.status === "open").length;
    const resolvedCount = allThreads.filter(t => t.status === "resolved").length;

    // Response time: time between first user message and first admin reply per thread
    const threadMap = new Map<string, { firstUser: Date | null; firstAdmin: Date | null }>();
    for (const msg of allMessages) {
      if (!threadMap.has(msg.thread_id)) {
        threadMap.set(msg.thread_id, { firstUser: null, firstAdmin: null });
      }
      const entry = threadMap.get(msg.thread_id)!;
      const t = new Date(msg.created_at);
      if (msg.sender_role === "user" && !entry.firstUser) entry.firstUser = t;
      if (msg.sender_role === "admin" && !entry.firstAdmin) entry.firstAdmin = t;
    }

    const responseTimes: number[] = [];
    for (const [, entry] of threadMap) {
      if (entry.firstUser && entry.firstAdmin && entry.firstAdmin > entry.firstUser) {
        responseTimes.push((entry.firstAdmin.getTime() - entry.firstUser.getTime()) / 60000);
      }
    }
    const avgResponse = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    // Peak hour
    const hourBuckets = new Array(24).fill(0);
    for (const msg of allMessages) {
      if (msg.sender_role === "user") {
        hourBuckets[new Date(msg.created_at).getHours()]++;
      }
    }
    const peakHour = hourBuckets.some(h => h > 0)
      ? hourBuckets.indexOf(Math.max(...hourBuckets))
      : null;

    // Keywords (simple word frequency from user messages, Thai-aware)
    const wordMap = new Map<string, number>();
    const stopWords = new Set(["ที่", "ของ", "ใน", "และ", "ได้", "มี", "จะ", "เป็น", "ไม่", "ครับ", "ค่ะ", "นะ", "the", "is", "a", "an", "and", "to", "in", "i", "my", "me"]);
    for (const msg of allMessages) {
      if (msg.sender_role !== "user") continue;
      const words = msg.message_text.toLowerCase().split(/[\s,.\-!?;:()]+/).filter(w => w.length > 1 && !stopWords.has(w));
      for (const w of words) {
        wordMap.set(w, (wordMap.get(w) || 0) + 1);
      }
    }
    const topKeywords = [...wordMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));

    // Daily volume
    const dayMap = new Map<string, number>();
    for (const msg of allMessages) {
      if (msg.sender_role === "user") {
        const d = format(new Date(msg.created_at), "yyyy-MM-dd");
        dayMap.set(d, (dayMap.get(d) || 0) + 1);
      }
    }
    const dailyVolume = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Unanswered: threads with user messages but no admin reply
    let unanswered = 0;
    for (const [, entry] of threadMap) {
      if (entry.firstUser && !entry.firstAdmin) unanswered++;
    }

    setStats({
      totalThreads: allThreads.length,
      openThreads: openCount,
      resolvedThreads: resolvedCount,
      totalMessages: allMessages.length,
      avgResponseTimeMinutes: avgResponse,
      peakHour,
      topKeywords,
      dailyVolume,
      unansweredThreads: unanswered,
    });
    setLoading(false);
  };

  if (loading || !stats) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">{isEn ? "Loading analytics..." : "กำลังโหลด..."}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          {isEn ? "Chat Analytics" : "วิเคราะห์แชท"}
        </h3>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{isEn ? "Last 7 days" : "7 วัน"}</SelectItem>
            <SelectItem value="14">{isEn ? "Last 14 days" : "14 วัน"}</SelectItem>
            <SelectItem value="30">{isEn ? "Last 30 days" : "30 วัน"}</SelectItem>
            <SelectItem value="90">{isEn ? "Last 90 days" : "90 วัน"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label={isEn ? "Total Threads" : "แชททั้งหมด"} value={stats.totalThreads} />
        <StatCard icon={<MessageCircle className="h-4 w-4" />} label={isEn ? "Messages" : "ข้อความ"} value={stats.totalMessages} />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label={isEn ? "Avg Response" : "ตอบเฉลี่ย"}
          value={stats.avgResponseTimeMinutes !== null ? `${stats.avgResponseTimeMinutes}m` : "—"}
          alert={stats.avgResponseTimeMinutes !== null && stats.avgResponseTimeMinutes > 60}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label={isEn ? "Unanswered" : "ยังไม่ตอบ"}
          value={stats.unansweredThreads}
          alert={stats.unansweredThreads > 0}
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/10 text-green-600 text-[10px]">{isEn ? "Open" : "เปิด"}</Badge>
            <span className="text-lg font-bold">{stats.openThreads}</span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/10 text-blue-600 text-[10px]">{isEn ? "Resolved" : "แก้แล้ว"}</Badge>
            <span className="text-lg font-bold">{stats.resolvedThreads}</span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500/10 text-orange-600 text-[10px]">{isEn ? "Peak Hour" : "ชม.สูงสุด"}</Badge>
            <span className="text-lg font-bold">{stats.peakHour !== null ? `${stats.peakHour}:00` : "—"}</span>
          </div>
        </Card>
      </div>

      {/* Daily volume chart (simple bar) */}
      {stats.dailyVolume.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {isEn ? "Daily Message Volume" : "จำนวนข้อความรายวัน"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-end gap-1 h-24">
              {stats.dailyVolume.map((d) => {
                const max = Math.max(...stats.dailyVolume.map(x => x.count));
                const pct = max > 0 ? (d.count / max) * 100 : 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}: ${d.count}`}>
                    <span className="text-[8px] text-muted-foreground">{d.count}</span>
                    <div
                      className="w-full bg-primary/60 rounded-t-sm min-h-[2px]"
                      style={{ height: `${Math.max(pct, 3)}%` }}
                    />
                    <span className="text-[7px] text-muted-foreground truncate w-full text-center">
                      {format(new Date(d.date), "dd")}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Keywords */}
      {stats.topKeywords.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              {isEn ? "Top Keywords (User Messages)" : "คำที่พบบ่อย (ข้อความผู้ใช้)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex flex-wrap gap-1.5">
              {stats.topKeywords.map((kw) => (
                <Badge key={kw.word} variant="secondary" className="text-[10px] gap-1">
                  {kw.word}
                  <span className="text-muted-foreground">×{kw.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <ChatNotificationSettings />
    </div>
  );
}

function StatCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string | number; alert?: boolean }) {
  return (
    <Card className={`p-3 ${alert ? "border-destructive/50" : ""}`}>
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${alert ? "text-destructive" : ""}`}>{value}</p>
    </Card>
  );
}
