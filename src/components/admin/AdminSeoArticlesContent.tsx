import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Play,
  Square,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";

type Topic = {
  index: number;
  slug: string;
  category: string;
  title: string;
  exists: boolean;
  publish_status: string | null;
  article_title: string | null;
  updated_at: string | null;
  published_at: string | null;
  has_cover: boolean;
  version: number;
};

type RunLog = {
  id: string;
  slug: string;
  category: string | null;
  status: string;
  version: number;
  publish_status: string | null;
  cover_generated: boolean;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  finished_at: string | null;
};

const PUBLISH_OPTIONS = [
  { value: "published", label: "เผยแพร่แล้ว" },
  { value: "draft", label: "ฉบับร่าง" },
  { value: "pending_review", label: "รอตรวจ" },
  { value: "archived", label: "เก็บเข้าคลัง" },
];

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })
    : "—";

export default function AdminSeoArticlesContent() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [queueRunning, setQueueRunning] = useState(false);
  const [queueCurrent, setQueueCurrent] = useState<string | null>(null);
  const [queueDone, setQueueDone] = useState(0);
  const [queueTotal, setQueueTotal] = useState(0);
  const [forceRegen, setForceRegen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("published");
  const stopRef = useRef(false);

  const loadTopics = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("generate-seo-articles", {
      body: { action: "list" },
    });
    if (error) {
      toast.error("โหลดรายการหัวข้อไม่สำเร็จ");
      return;
    }
    setTopics((data as { topics: Topic[] })?.topics || []);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("seo_article_runs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setLogs((data as unknown as RunLog[]) || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadTopics(), loadLogs()]);
      setLoading(false);
    })();
  }, [loadTopics, loadLogs]);

  // realtime log updates
  useEffect(() => {
    const channel = supabase
      .channel("seo-article-runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "seo_article_runs" }, () => {
        loadLogs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLogs]);

  const stats = useMemo(() => {
    const published = topics.filter((t) => t.publish_status === "published").length;
    const drafts = topics.filter((t) => t.exists && t.publish_status !== "published").length;
    const missing = topics.filter((t) => !t.exists).length;
    const errors = logs.filter((l) => l.status === "error").length;
    return { published, drafts, missing, errors };
  }, [topics, logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter((t) => {
      if (filter === "missing" && t.exists) return false;
      if (filter === "published" && t.publish_status !== "published") return false;
      if (filter === "unpublished" && (!t.exists || t.publish_status === "published")) return false;
      if (!q) return true;
      return (
        t.slug.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [topics, search, filter]);

  const generateOne = async (index: number, force: boolean) => {
    const { data, error } = await supabase.functions.invoke("generate-seo-articles", {
      body: { index, force, status: defaultStatus },
    });
    if (error) throw new Error(error.message);
    const res = data as { error?: string; skipped?: boolean };
    if (res?.error) throw new Error(res.error);
    return res;
  };

  const runQueue = async (indexes: number[]) => {
    if (!indexes.length) {
      toast.info("ไม่มีหัวข้อในคิว");
      return;
    }
    stopRef.current = false;
    setQueueRunning(true);
    setQueueTotal(indexes.length);
    setQueueDone(0);
    let ok = 0;
    let failed = 0;
    for (const idx of indexes) {
      if (stopRef.current) break;
      const topic = topics.find((t) => t.index === idx);
      setQueueCurrent(topic?.title ?? String(idx));
      try {
        await generateOne(idx, forceRegen);
        ok++;
      } catch (e) {
        failed++;
        toast.error(`${topic?.slug}: ${(e as Error).message}`);
      }
      setQueueDone((d) => d + 1);
      await loadLogs();
    }
    setQueueCurrent(null);
    setQueueRunning(false);
    await loadTopics();
    toast.success(`คิวเสร็จสิ้น — สำเร็จ ${ok} รายการ, ผิดพลาด ${failed} รายการ`);
  };

  const changePublishStatus = async (slug: string, status: string) => {
    const { error } = await supabase
      .from("blog_articles")
      .update({ status: status as never, updated_at: new Date().toISOString() })
      .eq("slug", slug);
    if (error) {
      toast.error("อัปเดตสถานะไม่สำเร็จ");
      return;
    }
    setTopics((prev) => prev.map((t) => (t.slug === slug ? { ...t, publish_status: status } : t)));
    toast.success("อัปเดตสถานะเผยแพร่แล้ว");
  };

  const bulkStatus = async (status: string) => {
    const slugs = filtered.filter((t) => t.exists).map((t) => t.slug);
    if (!slugs.length) return;
    const { error } = await supabase
      .from("blog_articles")
      .update({ status: status as never, updated_at: new Date().toISOString() })
      .in("slug", slugs);
    if (error) {
      toast.error("อัปเดตแบบกลุ่มไม่สำเร็จ");
      return;
    }
    await loadTopics();
    toast.success(`อัปเดต ${slugs.length} บทความแล้ว`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> บทความ SEO (generate-seo-articles)
          </h2>
          <p className="text-sm text-muted-foreground">จัดการสถานะเผยแพร่ เวอร์ชัน คิวสร้าง และ log การทำงาน</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await Promise.all([loadTopics(), loadLogs()]);
            toast.success("รีเฟรชแล้ว");
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> รีเฟรช
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "เผยแพร่แล้ว", value: stats.published },
          { label: "ยังไม่เผยแพร่", value: stats.drafts },
          { label: "ยังไม่สร้าง", value: stats.missing },
          { label: "รันผิดพลาด", value: stats.errors },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">บทความและสถานะ</TabsTrigger>
          <TabsTrigger value="queue">คิวสร้าง</TabsTrigger>
          <TabsTrigger value="logs">Log การทำงาน</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="ค้นหาหัวข้อ / slug / หมวด"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="published">เผยแพร่แล้ว</SelectItem>
                <SelectItem value="unpublished">ยังไม่เผยแพร่</SelectItem>
                <SelectItem value="missing">ยังไม่สร้าง</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => bulkStatus("published")}>
              เผยแพร่ทั้งหมดที่กรอง
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkStatus("draft")}>
              ตั้งเป็นฉบับร่าง
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[560px]">
                <div className="divide-y">
                  {filtered.map((t) => (
                    <div key={t.slug} className="p-3 flex flex-wrap items-center gap-3">
                      <div className="min-w-[240px] flex-1">
                        <p className="text-sm font-medium">{t.article_title || t.title}</p>
                        <p className="text-xs text-muted-foreground break-all">
                          /{t.category} · {t.slug}
                        </p>
                      </div>
                      <Badge variant="outline">v{t.version || 0}</Badge>
                      {t.has_cover ? (
                        <Badge variant="secondary">มีภาพปก</Badge>
                      ) : (
                        <Badge variant="outline">ไม่มีภาพปก</Badge>
                      )}
                      <span className="text-xs text-muted-foreground w-32">{fmt(t.updated_at)}</span>
                      {t.exists ? (
                        <Select
                          value={t.publish_status ?? "draft"}
                          onValueChange={(v) => changePublishStatus(t.slug, v)}
                        >
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PUBLISH_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="destructive">ยังไม่สร้าง</Badge>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={queueRunning}
                          onClick={() => runQueue([t.index])}
                        >
                          {t.exists ? "สร้างใหม่" : "สร้าง"}
                        </Button>
                        {t.exists && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`/th/info/${t.slug}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {!filtered.length && (
                    <p className="p-6 text-center text-sm text-muted-foreground">ไม่พบรายการ</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ตั้งค่าคิว</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">สถานะเมื่อสร้างเสร็จ</span>
                  <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLISH_OPTIONS.filter((o) => o.value !== "archived").map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant={forceRegen ? "default" : "outline"}
                  onClick={() => setForceRegen((v) => !v)}
                >
                  {forceRegen ? "เขียนทับบทความเดิม: เปิด" : "เขียนทับบทความเดิม: ปิด"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={queueRunning}
                  onClick={() => runQueue(topics.filter((t) => !t.exists).map((t) => t.index))}
                >
                  <Play className="h-4 w-4 mr-2" /> สร้างเฉพาะที่ยังไม่มี ({stats.missing})
                </Button>
                <Button
                  variant="outline"
                  disabled={queueRunning}
                  onClick={() => runQueue(filtered.map((t) => t.index))}
                >
                  <Play className="h-4 w-4 mr-2" /> รันตามรายการที่กรอง ({filtered.length})
                </Button>
                {queueRunning && (
                  <Button variant="destructive" onClick={() => (stopRef.current = true)}>
                    <Square className="h-4 w-4 mr-2" /> หยุดคิว
                  </Button>
                )}
              </div>

              {queueRunning && (
                <div className="space-y-2">
                  <Progress value={queueTotal ? (queueDone / queueTotal) * 100 : 0} />
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {queueDone}/{queueTotal} — กำลังสร้าง: {queueCurrent}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log ล่าสุด 200 รายการ (อัปเดตอัตโนมัติ)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[560px]">
                <div className="divide-y">
                  {logs.map((l) => (
                    <div key={l.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                      {l.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : l.status === "error" ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : l.status === "skipped" ? (
                        <MinusCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <span className="font-medium break-all">{l.slug}</span>
                      <Badge variant="outline">v{l.version}</Badge>
                      {l.publish_status && <Badge variant="secondary">{l.publish_status}</Badge>}
                      {l.cover_generated && <Badge variant="outline">ภาพปก</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {fmt(l.created_at)} · {l.duration_ms ? `${(l.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </span>
                      {l.error_message && (
                        <span className="text-xs text-destructive break-all w-full">{l.error_message}</span>
                      )}
                    </div>
                  ))}
                  {!logs.length && (
                    <p className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีบันทึกการทำงาน</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
