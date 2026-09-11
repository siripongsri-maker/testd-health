import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Download, Loader2, RefreshCw, Truck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Bucket = 'waiting' | 'in_transit' | 'delivered' | 'failed';

const BUCKET_LABEL: Record<Bucket, string> = {
  waiting: 'รอจัดส่ง',
  in_transit: 'กำลังส่ง',
  delivered: 'ถึงมือแล้ว',
  failed: 'ไม่ถึง / ปฏิเสธ',
};

const BUCKET_STATUSES: Record<Bucket, string[]> = {
  waiting: ['pending', 'approved', 'confirmed'],
  in_transit: ['shipped'],
  delivered: ['delivered', 'received', 'result_submitted', 'followed_up'],
  failed: ['rejected'],
};

const STATUS_TO_BUCKET = new Map<string, Bucket>(
  (Object.keys(BUCKET_STATUSES) as Bucket[]).flatMap((b) =>
    BUCKET_STATUSES[b].map((s) => [s, b] as [string, Bucket]),
  ),
);

interface ReportRow {
  day: string;
  waiting: number;
  in_transit: number;
  delivered: number;
  failed: number;
  with_tracking: number;
  total: number;
}

interface DetailRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  tracking_number: string | null;
  assigned_branch: string | null;
  tracking_stage: string | null;
  tracking_stage_at: string | null;
}

const STAGE_LABEL: Record<string, string> = {
  accepted: 'ไปรษณีย์รับเรื่องแล้ว',
  in_transit: 'อยู่ระหว่างขนส่ง',
  out_for_delivery: 'กำลังนำจ่าย',
  delivered: 'นำจ่ายสำเร็จ',
  failed: 'นำจ่ายไม่สำเร็จ',
};

const bkkDayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(iso));

const isoDayOffset = (offsetDays: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(
    new Date(Date.now() - offsetDays * 86400000),
  );

const bkkDate = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

const bkkDateTime = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

export default function AdminKitDeliveryReportContent() {
  const [days, setDays] = useState<number | 'custom'>(30);
  const [fromDate, setFromDate] = useState(() => isoDayOffset(30));
  const [toDate, setToDate] = useState(() => isoDayOffset(0));
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [bucket, setBucket] = useState<Bucket | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detailLimit, setDetailLimit] = useState(100);

  const range = useMemo(() => {
    const from = days === 'custom' ? fromDate : isoDayOffset(days - 1);
    const to = days === 'custom' ? toDate : isoDayOffset(0);
    return {
      from,
      to,
      fromIso: `${from}T00:00:00+07:00`,
      toIso: `${to}T23:59:59.999+07:00`,
    };
  }, [days, fromDate, toDate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const PAGE = 1000;
      const all: DetailRow[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from('hiv_selftest_requests')
          .select(
            'id, created_at, updated_at, status, tracking_number, assigned_branch, tracking_stage, tracking_stage_at',
          )
          .gte('created_at', range.fromIso)
          .lte('created_at', range.toIso)
          .order('created_at', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        const batch = (data ?? []) as DetailRow[];
        all.push(...batch);
        if (batch.length < PAGE) break;
      }
      setDetails(all);
    } catch (e) {
      console.error(e);
      toast.error('โหลดรายงานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [range.fromIso, range.toIso]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo<ReportRow[]>(() => {
    const map = new Map<string, ReportRow>();
    for (const d of details) {
      const day = bkkDayKey(d.created_at);
      const row =
        map.get(day) ??
        { day, waiting: 0, in_transit: 0, delivered: 0, failed: 0, with_tracking: 0, total: 0 };
      const b = STATUS_TO_BUCKET.get(d.status) ?? 'waiting';
      row[b] += 1;
      if (d.tracking_number) row.with_tracking += 1;
      row.total += 1;
      map.set(day, row);
    }
    return [...map.values()].sort((a, b) => b.day.localeCompare(a.day));
  }, [details]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          waiting: acc.waiting + r.waiting,
          in_transit: acc.in_transit + r.in_transit,
          delivered: acc.delivered + r.delivered,
          failed: acc.failed + r.failed,
          with_tracking: acc.with_tracking + r.with_tracking,
          total: acc.total + r.total,
        }),
        { waiting: 0, in_transit: 0, delivered: 0, failed: 0, with_tracking: 0, total: 0 },
      ),
    [rows],
  );

  const chartData = useMemo(
    () =>
      [...rows]
        .sort((a, b) => a.day.localeCompare(b.day))
        .map((r) => ({
          day: r.day.slice(5),
          [BUCKET_LABEL.waiting]: r.waiting,
          [BUCKET_LABEL.in_transit]: r.in_transit,
          [BUCKET_LABEL.delivered]: r.delivered,
          [BUCKET_LABEL.failed]: r.failed,
        })),
    [rows],
  );

  const filteredDetails = useMemo(() => {
    const q = search.trim().toLowerCase();
    return details.filter((d) => {
      const b = STATUS_TO_BUCKET.get(d.status);
      if (bucket !== 'all' && b !== bucket) return false;
      if (!q) return true;
      return (d.tracking_number ?? '').toLowerCase().includes(q);
    });
  }, [details, bucket, search]);

  const exportCsv = () => {
    const header = ['วันที่', 'รอจัดส่ง', 'กำลังส่ง', 'ถึงมือแล้ว', 'ไม่ถึง', 'มีเลขพัสดุ', 'รวม'];
    const body = rows.map((r) => [
      r.day,
      r.waiting,
      r.in_transit,
      r.delivered,
      r.failed,
      r.with_tracking,
      r.total,
    ]);
    const detailHeader = [
      'วันที่ขอ',
      'อัปเดตล่าสุด',
      'สถานะ',
      'กลุ่มสถานะ',
      'สถานะไปรษณีย์',
      'อัปเดตสถานะไปรษณีย์',
      'เลขพัสดุ',
      'สาขา',
    ];
    const detailBody = filteredDetails.map((d) => [
      d.created_at,
      d.updated_at ?? '',
      d.status,
      BUCKET_LABEL[STATUS_TO_BUCKET.get(d.status) ?? 'waiting'],
      d.tracking_stage ? (STAGE_LABEL[d.tracking_stage] ?? d.tracking_stage) : '',
      d.tracking_stage_at ?? '',
      d.tracking_number ?? '',
      d.assigned_branch ?? '',
    ]);
    const csv =
      '\uFEFF' +
      [header, ...body, [], detailHeader, ...detailBody]
        .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit-delivery-report-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 space-y-0 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4" />
            รายงานสถานะการส่งชุดตรวจ
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(days)}
              onValueChange={(v) => setDays(v === 'custom' ? 'custom' : Number(v))}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 14, 30, 90, 180, 365].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} วัน
                  </SelectItem>
                ))}
                <SelectItem value="custom">เลือกวันที่เอง</SelectItem>
              </SelectContent>
            </Select>
            {days === 'custom' && (
              <>
                <Input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 w-36"
                />
                <span className="text-xs text-muted-foreground">ถึง</span>
                <Input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 w-36"
                />
              </>
            )}
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-1 h-4 w-4" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {(['waiting', 'in_transit', 'delivered', 'failed'] as Bucket[]).map((b) => (
              <button
                key={b}
                onClick={() => setBucket((cur) => (cur === b ? 'all' : b))}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  bucket === b ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <p className="text-xs text-muted-foreground">{BUCKET_LABEL[b]}</p>
                <p className="text-2xl font-bold">{totals[b].toLocaleString('th-TH')}</p>
              </button>
            ))}
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">มีเลขพัสดุแล้ว</p>
              <p className="text-2xl font-bold">
                {totals.with_tracking.toLocaleString('th-TH')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                จากทั้งหมด {totals.total.toLocaleString('th-TH')} รายการ
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey={BUCKET_LABEL.waiting}
                  stackId="s"
                  fill="hsl(var(--muted-foreground))"
                />
                <Bar dataKey={BUCKET_LABEL.in_transit} stackId="s" fill="hsl(var(--primary))" />
                <Bar dataKey={BUCKET_LABEL.delivered} stackId="s" fill="hsl(var(--chart-2, 142 71% 45%))" />
                <Bar dataKey={BUCKET_LABEL.failed} stackId="s" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base">สรุปรายวัน</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2">วันที่</th>
                  <th>รอจัดส่ง</th>
                  <th>กำลังส่ง</th>
                  <th>ถึงมือ</th>
                  <th>ไม่ถึง</th>
                  <th>มีเลขพัสดุ</th>
                  <th>รวม</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.day} className="border-b last:border-0">
                    <td className="py-1.5">{bkkDate(`${r.day}T00:00:00+07:00`)}</td>
                    <td>{r.waiting}</td>
                    <td>{r.in_transit}</td>
                    <td className="text-green-600">{r.delivered}</td>
                    <td className="text-destructive">{r.failed}</td>
                    <td>{r.with_tracking}</td>
                    <td className="font-medium">{r.total}</td>
                  </tr>
                ))}
                {!rows.length && !loading && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      ไม่มีข้อมูลในช่วงเวลานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base">รายการตามเลขพัสดุ</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={bucket} onValueChange={(v) => setBucket(v as Bucket | 'all')}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
                  <SelectItem key={b} value={b}>
                    {BUCKET_LABEL[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขพัสดุ"
              className="h-8 w-44"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-1">
              {filteredDetails.slice(0, detailLimit).map((d) => {
                const b = STATUS_TO_BUCKET.get(d.status) ?? 'waiting';
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs">
                        {d.tracking_number || 'ยังไม่มีเลขพัสดุ'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ขอเมื่อ {bkkDateTime(d.created_at)}
                        {d.assigned_branch ? ` · ${d.assigned_branch}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant={
                        b === 'failed' ? 'destructive' : b === 'delivered' ? 'default' : 'secondary'
                      }
                    >
                      {BUCKET_LABEL[b]}
                    </Badge>
                  </div>
                );
              })}
              {!filteredDetails.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">ไม่พบรายการ</p>
              )}
            </div>
          </ScrollArea>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              แสดง {Math.min(detailLimit, filteredDetails.length)} จาก {filteredDetails.length} รายการ
            </p>
            {filteredDetails.length > detailLimit && (
              <Button size="sm" variant="outline" onClick={() => setDetailLimit((n) => n + 100)}>
                โหลดเพิ่ม
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
