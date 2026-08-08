import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Link2,
  Plus,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface SnapshotRow {
  id: string;
  captured_on: string;
  total_backlinks: number;
  referring_domains: number;
  authority_score: number | null;
  follow_links: number;
  nofollow_links: number;
  new_domains: number;
  lost_domains: number;
  source: string;
  notes: string | null;
}

interface DomainRow {
  id: string;
  domain: string;
  authority_score: number | null;
  backlinks: number;
  first_seen: string;
  last_seen: string;
  lost_on: string | null;
  status: string;
  is_follow: boolean;
  top_anchor: string | null;
  topic: string;
  target_url: string | null;
}

const TOPIC_LABELS: Record<string, string> = {
  "hiv-testing": "ตรวจเอชไอวี",
  prep: "PrEP / ป้องกัน",
  "harm-reduction": "ลดอันตราย",
  counseling: "ให้คำปรึกษา",
  "sexual-health": "สุขภาพทางเพศ",
  advocacy: "เครือข่าย/นโยบาย",
  brand: "แบรนด์",
  platform: "แพลตฟอร์ม",
  mention: "กล่าวถึงทั่วไป",
  spam: "สแปม / PBN",
  other: "อื่น ๆ",
};

function topicLabel(topic: string) {
  return TOPIC_LABELS[topic] ?? topic;
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function fmtMonth(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    year: "2-digit",
  });
}

function authorityTone(score: number | null) {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 30) return "bg-emerald-500/15 text-emerald-600";
  if (score >= 12) return "bg-amber-500/15 text-amber-600";
  return "bg-destructive/10 text-destructive";
}

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminBacklinkMonitorContent() {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(90);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    captured_on: new Date().toISOString().slice(0, 10),
    total_backlinks: "",
    referring_domains: "",
    authority_score: "",
    follow_links: "",
    nofollow_links: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [snapRes, domRes] = await Promise.all([
      supabase
        .from("seo_backlink_snapshots")
        .select("*")
        .order("captured_on", { ascending: true }),
      supabase
        .from("seo_referring_domains")
        .select("*")
        .order("last_seen", { ascending: false }),
    ]);
    if (snapRes.error || domRes.error) {
      toast.error("โหลดข้อมูลลิงก์ย้อนกลับไม่สำเร็จ");
    } else {
      setSnapshots((snapRes.data ?? []) as SnapshotRow[]);
      setDomains((domRes.data ?? []) as DomainRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - windowDays);
    return d.toISOString().slice(0, 10);
  }, [windowDays]);

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];

  const active = useMemo(
    () => domains.filter((d) => d.status === "active"),
    [domains],
  );
  const newDomains = useMemo(
    () =>
      active
        .filter((d) => d.first_seen >= cutoff)
        .sort((a, b) => b.first_seen.localeCompare(a.first_seen)),
    [active, cutoff],
  );
  const lostDomains = useMemo(
    () =>
      domains
        .filter((d) => d.status === "lost" && (d.lost_on ?? "") >= cutoff)
        .sort((a, b) => (b.lost_on ?? "").localeCompare(a.lost_on ?? "")),
    [domains, cutoff],
  );

  const trendData = useMemo(
    () =>
      snapshots.map((s) => ({
        month: fmtMonth(s.captured_on),
        backlinks: s.total_backlinks,
        domains: s.referring_domains,
        new: s.new_domains,
        lost: -s.lost_domains,
        authority: s.authority_score ?? 0,
      })),
    [snapshots],
  );

  const topicData = useMemo(() => {
    const map = new Map<string, { topic: string; current: number; added: number }>();
    for (const d of active) {
      const key = d.topic || "other";
      const entry = map.get(key) ?? { topic: topicLabel(key), current: 0, added: 0 };
      entry.current += 1;
      if (d.first_seen >= cutoff) entry.added += 1;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.current - a.current);
  }, [active, cutoff]);

  const anchorData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of active) {
      const anchor = (d.top_anchor ?? "—").trim();
      map.set(anchor, (map.get(anchor) ?? 0) + d.backlinks);
    }
    return [...map.entries()]
      .map(([anchor, count]) => ({ anchor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [active]);

  const delta = (current?: number | null, prev?: number | null) => {
    if (current === null || current === undefined || prev === null || prev === undefined)
      return null;
    return current - prev;
  };

  const DeltaBadge = ({ value }: { value: number | null }) => {
    if (value === null || value === 0) return null;
    const up = value > 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          up ? "text-emerald-600" : "text-destructive"
        }`}
      >
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up ? "+" : ""}
        {value}
      </span>
    );
  };

  const saveSnapshot = async () => {
    if (!form.captured_on || !form.total_backlinks || !form.referring_domains) {
      toast.error("กรุณากรอกวันที่ จำนวนลิงก์ และจำนวนโดเมน");
      return;
    }
    setSaving(true);
    const refDomains = Number(form.referring_domains);
    const prevRef = latest?.referring_domains ?? refDomains;
    const { error } = await supabase.from("seo_backlink_snapshots").upsert(
      {
        captured_on: form.captured_on,
        total_backlinks: Number(form.total_backlinks),
        referring_domains: refDomains,
        authority_score: form.authority_score ? Number(form.authority_score) : null,
        follow_links: Number(form.follow_links || 0),
        nofollow_links: Number(form.nofollow_links || 0),
        new_domains: Math.max(0, refDomains - prevRef),
        lost_domains: Math.max(0, prevRef - refDomains),
        source: "manual",
      },
      { onConflict: "captured_on" },
    );
    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("บันทึกสแนปช็อตแล้ว");
    setAddOpen(false);
    void load();
  };

  const markLost = async (row: DomainRow) => {
    const today = new Date().toISOString().slice(0, 10);
    const restoring = row.status === "lost";
    const { error } = await supabase
      .from("seo_referring_domains")
      .update(
        restoring
          ? { status: "active", lost_on: null, last_seen: today }
          : { status: "lost", lost_on: today },
      )
      .eq("id", row.id);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ");
      return;
    }
    toast.success(restoring ? "ทำเครื่องหมายว่ากลับมาแล้ว" : "ทำเครื่องหมายว่าหายไป");
    void load();
  };

  const exportCsv = () => {
    const header = [
      "domain",
      "status",
      "authority_score",
      "backlinks",
      "topic",
      "top_anchor",
      "first_seen",
      "last_seen",
      "lost_on",
      "target_url",
    ];
    const lines = [
      header.join(","),
      ...domains.map((d) =>
        [
          d.domain,
          d.status,
          d.authority_score,
          d.backlinks,
          topicLabel(d.topic),
          d.top_anchor,
          d.first_seen,
          d.last_seen,
          d.lost_on,
          d.target_url,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backlinks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            ติดตามลิงก์ย้อนกลับ (Backlink Monitor)
          </h2>
          <p className="text-sm text-muted-foreground">
            เฝ้าดูโดเมนที่ลิงก์เข้ามาใหม่/หายไป และการเติบโตของลิงก์ตามหัวข้อ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[30, 90, 180].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={windowDays === d ? "default" : "outline"}
              onClick={() => setWindowDays(d)}
            >
              {d} วัน
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            รีเฟรช
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            เพิ่มสแนปช็อต
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "ลิงก์ทั้งหมด",
            value: latest?.total_backlinks ?? 0,
            d: delta(latest?.total_backlinks, previous?.total_backlinks),
          },
          {
            label: "โดเมนที่ลิงก์มา",
            value: latest?.referring_domains ?? 0,
            d: delta(latest?.referring_domains, previous?.referring_domains),
          },
          {
            label: `โดเมนใหม่ (${windowDays} วัน)`,
            value: newDomains.length,
            d: null,
          },
          {
            label: `โดเมนที่หายไป (${windowDays} วัน)`,
            value: lostDomains.length,
            d: null,
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{kpi.value}</span>
                <DeltaBadge value={kpi.d} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">แนวโน้มลิงก์และโดเมน</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    v,
                    name === "backlinks" ? "ลิงก์ทั้งหมด" : "โดเมนที่ลิงก์มา",
                  ]}
                />
                <Legend
                  formatter={(v) =>
                    v === "backlinks" ? "ลิงก์ทั้งหมด" : "โดเมนที่ลิงก์มา"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="backlinks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="domains"
                  stroke="#2FAFA3"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">โดเมนใหม่ vs หายไป ต่อรอบ</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    Math.abs(v),
                    name === "new" ? "โดเมนใหม่" : "โดเมนที่หายไป",
                  ]}
                />
                <Legend
                  formatter={(v) => (v === "new" ? "โดเมนใหม่" : "โดเมนที่หายไป")}
                />
                <Bar dataKey="new" fill="#2FAFA3" stackId="s" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="lost"
                  fill="hsl(var(--destructive))"
                  stackId="s"
                  radius={[0, 0, 4, 4]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">การเติบโตตามหัวข้อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topicData.map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm">{t.topic}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${(t.current / (topicData[0]?.current || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{t.current}</span>
                {t.added > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-[11px]">
                    +{t.added}
                  </Badge>
                )}
              </div>
            ))}
            {!topicData.length && (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">คีย์เวิร์ด / Anchor ที่ลิงก์เข้ามา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anchorData.map((a) => (
              <div
                key={a.anchor}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate">{a.anchor}</span>
                <Badge variant="secondary">{a.count}</Badge>
              </div>
            ))}
            {!anchorData.length && (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-emerald-600">
              โดเมนใหม่ ({newDomains.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {newDomains.map((d) => (
              <DomainItem key={d.id} row={d} onToggle={() => void markLost(d)} />
            ))}
            {!newDomains.length && (
              <p className="text-sm text-muted-foreground">
                ไม่มีโดเมนใหม่ในช่วง {windowDays} วัน
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              โดเมนที่หายไป ({lostDomains.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lostDomains.map((d) => (
              <DomainItem key={d.id} row={d} onToggle={() => void markLost(d)} />
            ))}
            {!lostDomains.length && (
              <p className="text-sm text-muted-foreground">
                ไม่มีโดเมนที่หายไปในช่วง {windowDays} วัน
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            โดเมนที่ลิงก์มาทั้งหมด ({domains.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {domains.map((d) => (
            <DomainItem key={d.id} row={d} onToggle={() => void markLost(d)} showTopic />
          ))}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มสแนปช็อตลิงก์ย้อนกลับ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: "captured_on", label: "วันที่เก็บข้อมูล", type: "date" },
              { key: "total_backlinks", label: "ลิงก์ทั้งหมด", type: "number" },
              { key: "referring_domains", label: "โดเมนที่ลิงก์มา", type: "number" },
              { key: "authority_score", label: "Authority Score", type: "number" },
              { key: "follow_links", label: "ลิงก์แบบ follow", type: "number" },
              { key: "nofollow_links", label: "ลิงก์แบบ nofollow", type: "number" },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-sm text-muted-foreground">{f.label}</label>
                <Input
                  type={f.type}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={() => void saveSnapshot()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function DomainItem({
    row,
    onToggle,
    showTopic,
  }: {
    row: DomainRow;
    onToggle: () => void;
    showTopic?: boolean;
  }) {
    const lost = row.status === "lost";
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5">
        <a
          href={`https://${row.domain}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-sm hover:underline inline-flex items-center gap-1"
        >
          {row.domain}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
        <Badge className={authorityTone(row.authority_score)}>
          AS {row.authority_score ?? "—"}
        </Badge>
        <Badge variant="secondary">{row.backlinks} ลิงก์</Badge>
        {showTopic && <Badge variant="outline">{topicLabel(row.topic)}</Badge>}
        {!row.is_follow && <Badge variant="outline">nofollow</Badge>}
        <span className="text-xs text-muted-foreground">
          {lost
            ? `หายไป ${fmtDate(row.lost_on ?? row.last_seen)}`
            : `พบครั้งแรก ${fmtDate(row.first_seen)}`}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-xs"
          onClick={onToggle}
        >
          {lost ? "กลับมาแล้ว" : "ทำเครื่องหมายว่าหาย"}
        </Button>
      </div>
    );
  }
}
