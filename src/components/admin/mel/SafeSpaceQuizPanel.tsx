import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, formatCsvDate } from "@/lib/adminCsvExport";
import { SAFE_SPACE_QUIZ } from "@/data/safeSpaceQuiz";
import { Copy, Download, Loader2, QrCode } from "lucide-react";
import { format } from "date-fns";

interface QuizRow {
  id: string;
  created_at: string;
  event_code: string;
  session_id: string | null;
  nickname: string;
  age: number;
  phone: string;
  score: number;
  total: number;
  outcome: string;
  answers: { q: number; category: string; answer: boolean; is_correct: boolean }[] | null;
}

interface ScanRow {
  id: string;
  created_at: string;
  session_id: string | null;
  event_code: string | null;
}

export default function SafeSpaceQuizPanel({ sessions }: { sessions: { id: string; label: string }[] }) {
  const [sessionFilter, setSessionFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [linkEvent, setLinkEvent] = useState("safespace");
  const [linkSession, setLinkSession] = useState("none");
  const [showQr, setShowQr] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["safe-space-quiz-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safe_space_quiz_responses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as unknown as QuizRow[];
    },
  });

  const { data: scans } = useQuery({
    queryKey: ["safe-space-qr-scans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safe_space_qr_scans")
        .select("id, created_at, session_id, event_code")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as ScanRow[];
    },
  });

  const filteredScans = useMemo(() => {
    return (scans || []).filter((s) => {
      if (eventFilter !== "all" && s.event_code !== eventFilter) return false;
      const day = s.created_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [scans, eventFilter, from, to]);

  const scanBySession = useMemo(() => {
    const m = new Map<string, number>();
    filteredScans.forEach((s) => {
      const key = s.session_id || "unassigned";
      m.set(key, (m.get(key) || 0) + 1);
    });
    return m;
  }, [filteredScans]);


  const eventCodes = useMemo(
    () => Array.from(new Set((rows || []).map((r) => r.event_code))).sort(),
    [rows],
  );

  const baseFiltered = useMemo(() => {
    return (rows || []).filter((r) => {
      if (eventFilter !== "all" && r.event_code !== eventFilter) return false;
      const day = r.created_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [rows, eventFilter, from, to]);

  const filtered = useMemo(
    () => baseFiltered.filter((r) => sessionFilter === "all" || r.session_id === sessionFilter),
    [baseFiltered, sessionFilter],
  );

  // สรุปรายเซสชัน เพื่อวัดผลว่าคนจากเซสชันไหนสแกน QR แล้วตอบกลับกี่คน
  const perSession = useMemo(() => {
    const map = new Map<string, QuizRow[]>();
    baseFiltered.forEach((r) => {
      const key = r.session_id || "unassigned";
      map.set(key, [...(map.get(key) || []), r]);
    });
    scanBySession.forEach((_v, key) => {
      if (!map.has(key)) map.set(key, []);
    });
    return Array.from(map.entries())
      .map(([key, list]) => {
        const count = list.length;
        const kit = list.filter((r) => r.outcome === "to_test_kit").length;
        const totalQ = list.reduce((s, r) => s + r.total, 0);
        const correct = list.reduce((s, r) => s + r.score, 0);
        const passed = list.filter((r) => r.total > 0 && r.score / r.total >= 0.7).length;
        const times = list.map((r) => r.created_at).sort();
        const scanCount = scanBySession.get(key) || 0;
        return {
          key,
          label: key === "unassigned" ? "ไม่ได้ผูกเซสชัน" : sessions.find((s) => s.id === key)?.label || key.slice(0, 8),
          count,
          scanCount,
          responseRate: scanCount ? (count / scanCount) * 100 : 0,
          kit,
          kitRate: count ? (kit / count) * 100 : 0,
          avg: count ? correct / count : 0,
          knowledgeRate: totalQ ? (correct / totalQ) * 100 : 0,
          passed,
          first: times[0],
          last: times[times.length - 1],
        };
      })
      .sort((a, b) => b.scanCount - a.scanCount || b.count - a.count);
  }, [baseFiltered, sessions, scanBySession]);

  const total = filtered.length;
  const avg = total ? (filtered.reduce((s, r) => s + r.score, 0) / total).toFixed(1) : "0.0";
  const kitCount = filtered.filter((r) => r.outcome === "to_test_kit").length;
  const kitRate = total ? ((kitCount / total) * 100).toFixed(0) : "0";
  const scanTotal = useMemo(
    () => filteredScans.filter((s) => sessionFilter === "all" || s.session_id === sessionFilter).length,
    [filteredScans, sessionFilter],
  );
  const scanToQuizRate = scanTotal ? ((total / scanTotal) * 100).toFixed(0) : "0";

  const perQuestion = useMemo(() => {
    return SAFE_SPACE_QUIZ.map((item) => {
      let answered = 0;
      let correct = 0;
      filtered.forEach((r) => {
        const a = (r.answers || []).find((x) => x.q === item.q);
        if (a) {
          answered += 1;
          if (a.is_correct) correct += 1;
        }
      });
      return {
        q: item.q,
        category: item.category,
        prompt: item.prompt,
        answered,
        correct,
        rate: answered ? (correct / answered) * 100 : 0,
      };
    }).sort((a, b) => a.rate - b.rate);
  }, [filtered]);

  const quizLink = useMemo(() => {
    const qs = new URLSearchParams({ event: linkEvent || "safespace" });
    if (linkSession !== "none") qs.set("session", linkSession);
    return `${window.location.origin}/safe-space/quiz?${qs.toString()}`;
  }, [linkEvent, linkSession]);

  function handleExport() {
    exportToCsv(
      filtered,
      [
        { key: "created_at", header: "วันเวลา", format: (r) => formatCsvDate(r.created_at) },
        { key: "nickname", header: "ชื่อเล่น" },
        { key: "age", header: "อายุ" },
        { key: "phone", header: "เบอร์โทร" },
        { key: "score", header: "คะแนน", format: (r) => `${r.score}/${r.total}` },
        { key: "outcome", header: "ผลลัพธ์", format: (r) => (r.outcome === "to_test_kit" ? "ขอชุดตรวจ" : "จบกิจกรรม") },
        { key: "event_code", header: "Event code" },
        { key: "session_id", header: "Session" },
      ],
      "safe_space_quiz",
      { from: from || undefined, to: to || undefined },
    );
  }

  function handleExportSessions() {
    exportToCsv(
      perSession,
      [
        { key: "label", header: "เซสชัน" },
        { key: "key", header: "Session ID", format: (s) => (s.key === "unassigned" ? "" : s.key) },
        { key: "scanCount", header: "สแกน QR (ครั้ง)" },
        { key: "count", header: "ตอบกลับ (คน)" },
        { key: "responseRate", header: "อัตราตอบกลับต่อการสแกน (%)", format: (s) => s.responseRate.toFixed(0) },
        { key: "avg", header: "คะแนนเฉลี่ย", format: (s) => s.avg.toFixed(1) },
        { key: "knowledgeRate", header: "อัตราตอบถูก (%)", format: (s) => s.knowledgeRate.toFixed(0) },
        { key: "passed", header: "ผ่าน 70% ขึ้นไป (คน)" },
        { key: "kit", header: "ขอชุดตรวจ (คน)" },
        { key: "kitRate", header: "อัตราขอชุดตรวจ (%)", format: (s) => s.kitRate.toFixed(0) },
        { key: "first", header: "ตอบครั้งแรก", format: (s) => formatCsvDate(s.first) },
        { key: "last", header: "ตอบล่าสุด", format: (s) => formatCsvDate(s.last) },
      ],
      "safe_space_quiz_by_session",
      { from: from || undefined, to: to || undefined },
    );
    toast({ title: "ดาวน์โหลดรายงานรายเซสชันแล้ว" });
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ลิงก์และ QR */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ลิงก์กิจกรรมและ QR code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Event code</Label>
              <Input value={linkEvent} onChange={(e) => setLinkEvent(e.target.value)} placeholder="safespace-aug26" />
            </div>
            <div className="space-y-1.5">
              <Label>เซสชันพื้นที่ปลอดภัย</Label>
              <Select value={linkSession} onValueChange={setLinkSession}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ผูกเซสชัน</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="break-all rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{quizLink}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(quizLink);
                toast({ title: "คัดลอกลิงก์แล้ว" });
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> คัดลอกลิงก์
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowQr((v) => !v)}>
              <QrCode className="mr-2 h-4 w-4" /> {showQr ? "ซ่อน QR" : "สร้าง QR code"}
            </Button>
          </div>
          {showQr && (
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCodeSVG value={quizLink} size={180} includeMargin />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ฟิลเตอร์ */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">เซสชัน</Label>
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Event code</Label>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {eventCodes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ตั้งแต่วันที่</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ถึงวันที่</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* สรุป */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">สแกน QR</p><p className="text-2xl font-bold text-foreground">{scanTotal}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ผู้ตอบ</p><p className="text-2xl font-bold text-foreground">{total}</p><p className="text-[11px] text-muted-foreground">ตอบจริง {scanToQuizRate}% ของการสแกน</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">คะแนนเฉลี่ย</p><p className="text-2xl font-bold text-foreground">{avg}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">กดขอชุดตรวจ</p><p className="text-2xl font-bold text-foreground">{kitCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">อัตราขอชุดตรวจ</p><p className="text-2xl font-bold text-foreground">{kitRate}%</p></CardContent></Card>
      </div>


      {/* รายเซสชัน */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">ผลรายเซสชัน (จาก QR ที่ผูกไว้)</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExportSessions} disabled={perSession.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export รายเซสชัน
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {perSession.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">เซสชัน</th>
                  <th className="py-2 pr-3">สแกน QR</th>
                  <th className="py-2 pr-3">ตอบกลับ</th>
                  <th className="py-2 pr-3">ตอบ/สแกน</th>
                  <th className="py-2 pr-3">คะแนนเฉลี่ย</th>
                  <th className="py-2 pr-3">ได้ความรู้ (ตอบถูก)</th>
                  <th className="py-2 pr-3">ผ่าน ≥70%</th>
                  <th className="py-2 pr-3">ขอชุดตรวจ</th>
                  <th className="py-2 pr-3">ตอบครั้งแรก–ล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {perSession.map((s) => (
                  <tr
                    key={s.key}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                    onClick={() => setSessionFilter(s.key === "unassigned" ? "all" : s.key)}
                  >
                    <td className="py-2 pr-3">{s.label}</td>
                    <td className="py-2 pr-3 font-semibold">{s.count}</td>
                    <td className="py-2 pr-3">{s.avg.toFixed(1)}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={s.knowledgeRate < 50 ? "destructive" : "secondary"}>{s.knowledgeRate.toFixed(0)}%</Badge>
                    </td>
                    <td className="py-2 pr-3">{s.passed}</td>
                    <td className="py-2 pr-3">{s.kit} ({s.kitRate.toFixed(0)}%)</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                      {s.first ? format(new Date(s.first), "dd MMM HH:mm") : "-"} – {s.last ? format(new Date(s.last), "dd MMM HH:mm") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* รายข้อ */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">อัตราตอบถูกรายข้อ</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {perQuestion.map((p) => (
            <div key={p.q} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">ข้อ {p.q} : {p.prompt}</p>
                <p className="text-xs text-muted-foreground">หมวด {p.category} · ตอบแล้ว {p.answered} คน</p>
              </div>
              <Badge variant={p.rate < 50 ? "destructive" : "secondary"}>{p.rate.toFixed(0)}%</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* รายคน */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">รายคน ({total})</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!total}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีผู้ตอบควิซ</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">วันเวลา</th>
                  <th className="py-2 pr-3">ชื่อเล่น</th>
                  <th className="py-2 pr-3">อายุ</th>
                  <th className="py-2 pr-3">เบอร์โทร</th>
                  <th className="py-2 pr-3">คะแนน</th>
                  <th className="py-2 pr-3">ผลลัพธ์</th>
                  <th className="py-2 pr-3">Event</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">{format(new Date(r.created_at), "dd MMM yyyy HH:mm")}</td>
                    <td className="py-2 pr-3">{r.nickname}</td>
                    <td className="py-2 pr-3">{r.age}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.phone}</td>
                    <td className="py-2 pr-3">{r.score}/{r.total}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={r.outcome === "to_test_kit" ? "default" : "secondary"}>
                        {r.outcome === "to_test_kit" ? "ขอชุดตรวจ" : "จบกิจกรรม"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.event_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
