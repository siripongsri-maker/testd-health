import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, QrCode, Eye, ExternalLink, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CardRow = {
  card_slug: string;
  card_title: string;
  card_number: number;
  card_group: string;
  views: number;
  qr_scans: number;
  service_opens: number;
  zooms: number;
};

type SourceRow = { entry_source: string; views: number; qr_scans: number; service_opens: number };
type CampaignRow = { campaign: string; views: number; qr_scans: number; service_opens: number };
type ServiceRow = { service: string; service_label: string | null; target_path: string | null; opens: number };
type MatrixRow = {
  card_slug: string;
  card_title: string;
  card_number: number;
  service: string;
  service_label: string | null;
  entry_source: string;
  campaign: string;
  placement: string;
  opens: number;
};
type DailyRow = { day: string; views: number; qr_scans: number; service_opens: number };

type Payload = {
  since: string;
  totals: { views: number; qr_scans: number; service_opens: number; zooms: number };
  by_card: CardRow[];
  by_entry_source: SourceRow[];
  by_campaign: CampaignRow[];
  by_service: ServiceRow[];
  card_service_matrix: MatrixRow[];
  daily: DailyRow[];
};

const SOURCE_LABEL: Record<string, string> = {
  qr: "สแกน QR",
  print: "การ์ดพิมพ์",
  direct: "เข้าตรง",
  internal: "ในเว็บไซต์",
};

const CHART_COLORS = ["#2FAFA3", "#3A6FF7", "#c0275e", "#f59e0b", "#8b5cf6", "#10b981"];

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export default function AdminChemsexCardsContent() {
  const [days, setDays] = useState("30");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("get_chemsex_card_analytics" as never, {
      p_days: Number(days),
    } as never);
    if (error) {
      toast.error("โหลดข้อมูลไม่สำเร็จ: " + error.message);
      setData(null);
    } else {
      setData(res as unknown as Payload);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const matrix = useMemo(() => {
    const rows = data?.card_service_matrix ?? [];
    return rows.filter(
      (r) =>
        (sourceFilter === "all" || r.entry_source === sourceFilter) &&
        (campaignFilter === "all" || r.campaign === campaignFilter),
    );
  }, [data, sourceFilter, campaignFilter]);

  const matrixByCard = useMemo(() => {
    const map = new Map<string, { title: string; number: number; opens: number; services: Map<string, number> }>();
    for (const r of matrix) {
      const key = r.card_slug;
      if (!map.has(key)) map.set(key, { title: r.card_title, number: r.card_number, opens: 0, services: new Map() });
      const entry = map.get(key)!;
      entry.opens += r.opens;
      entry.services.set(
        r.service_label || r.service,
        (entry.services.get(r.service_label || r.service) ?? 0) + r.opens,
      );
    }
    return [...map.entries()]
      .map(([slug, v]) => ({ slug, ...v, services: [...v.services.entries()].sort((a, b) => b[1] - a[1]) }))
      .sort((a, b) => b.opens - a.opens);
  }, [matrix]);

  const topCards = useMemo(
    () =>
      (data?.by_card ?? [])
        .slice(0, 10)
        .map((c) => ({
          name: `#${c.card_number}`,
          title: c.card_title,
          เปิดดู: c.views,
          "สแกน QR": c.qr_scans,
          "ไปบริการ": c.service_opens,
        })),
    [data],
  );

  const campaigns = data?.by_campaign ?? [];
  const totals = data?.totals ?? { views: 0, qr_scans: 0, service_opens: 0, zooms: 0 };
  const conversion = totals.views > 0 ? Math.round((totals.service_opens / totals.views) * 100) : 0;

  const exportCsv = () => {
    const rows = matrix.map((r) => ({
      card_number: r.card_number,
      card_slug: r.card_slug,
      card_title: r.card_title,
      service: r.service,
      service_label: r.service_label ?? "",
      entry_source: r.entry_source,
      campaign: r.campaign,
      placement: r.placement,
      opens: r.opens,
    }));
    if (rows.length === 0) {
      toast.error("ไม่มีข้อมูลให้ดาวน์โหลด");
      return;
    }
    const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chemsex-cards-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "เปิดดูการ์ด", value: totals.views, icon: Eye },
    { label: "สแกน QR", value: totals.qr_scans, icon: QrCode },
    { label: "กดไปบริการ", value: totals.service_opens, icon: ExternalLink },
    { label: "ซูมดูภาพ", value: totals.zooms, icon: ZoomIn },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">การ์ดความรู้ Chemsex — เส้นทางสู่บริการ</h2>
          <p className="text-sm text-muted-foreground">
            สรุปว่าการ์ดแต่ละใบพาผู้ใช้ไปยังบริการใด แยกตามช่องทางเข้าและแคมเปญ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 วัน</SelectItem>
              <SelectItem value="30">30 วัน</SelectItem>
              <SelectItem value="90">90 วัน</SelectItem>
              <SelectItem value="365">1 ปี</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <s.icon className="h-4 w-4" /> {s.label}
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16 mt-2" />
              ) : (
                <div className="text-3xl font-bold mt-1">{s.value.toLocaleString()}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">อัตราการพาไปบริการ</CardTitle>
          <CardDescription>กดไปบริการ / เปิดดูการ์ด</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{conversion}%</div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="ช่องทางเข้า" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกช่องทางเข้า</SelectItem>
            {(data?.by_entry_source ?? []).map((s) => (
              <SelectItem key={s.entry_source} value={s.entry_source}>
                {SOURCE_LABEL[s.entry_source] ?? s.entry_source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="แคมเปญ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแคมเปญ</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.campaign} value={c.campaign}>{c.campaign}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="cards">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="cards">รายการ์ด</TabsTrigger>
          <TabsTrigger value="services">บริการปลายทาง</TabsTrigger>
          <TabsTrigger value="sources">ช่องทาง & แคมเปญ</TabsTrigger>
          <TabsTrigger value="trend">แนวโน้มรายวัน</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">10 การ์ดที่พาไปบริการมากที่สุด</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCards}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(l) => topCards.find((c) => c.name === l)?.title || String(l)}
                  />
                  <Legend />
                  <Bar dataKey="เปิดดู" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="สแกน QR" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ไปบริการ" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">การ์ด → บริการ</CardTitle>
              <CardDescription>ตามตัวกรองช่องทาง/แคมเปญด้านบน</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>การ์ด</TableHead>
                    <TableHead>บริการที่ถูกเปิด</TableHead>
                    <TableHead className="text-right">รวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixByCard.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">ยังไม่มีข้อมูล</TableCell></TableRow>
                  )}
                  {matrixByCard.map((c) => (
                    <TableRow key={c.slug}>
                      <TableCell className="font-medium">#{c.number} {c.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.services.map(([svc, n]) => (
                            <Badge key={svc} variant="secondary">{svc} · {n}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{c.opens}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">บริการปลายทาง</CardTitle>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data?.by_service ?? []).map((s) => ({ name: s.service_label || s.service, opens: s.opens }))} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={140} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="opens" name="กดไปบริการ" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ช่องทางการเข้า (entry source)</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(data?.by_entry_source ?? []).map((s) => ({
                      name: SOURCE_LABEL[s.entry_source] ?? s.entry_source,
                      value: s.views,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {(data?.by_entry_source ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">แคมเปญ (utm_campaign)</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaigns.map((c) => ({
                  name: c.campaign,
                  เปิดดู: c.views,
                  "สแกน QR": c.qr_scans,
                  "ไปบริการ": c.service_opens,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="เปิดดู" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="สแกน QR" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ไปบริการ" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">แนวโน้มรายวัน (Asia/Bangkok)</CardTitle>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.daily ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" name="เปิดดู" stroke={CHART_COLORS[1]} strokeWidth={2} />
                  <Line type="monotone" dataKey="qr_scans" name="สแกน QR" stroke={CHART_COLORS[3]} strokeWidth={2} />
                  <Line type="monotone" dataKey="service_opens" name="ไปบริการ" stroke={CHART_COLORS[0]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
