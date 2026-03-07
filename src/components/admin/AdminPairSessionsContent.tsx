import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Download, Link2, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";
import AdminDetailDrawer from "./AdminDetailDrawer";

interface PairSession {
  id: string;
  session_code: string;
  host_invite_id: string;
  status: string;
  max_participants: number;
  pair_booking_count: number | null;
  is_test_mode: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function AdminPairSessionsContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [sessions, setSessions] = useState<PairSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PairSession | null>(null);
  const [relatedBookings, setRelatedBookings] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('partner_test_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setSessions(data as PairSession[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openDetail = async (s: PairSession) => {
    setSelected(s);
    // Fetch bookings attributed to this session
    const { data } = await (supabase as any)
      .from('booking_attributions')
      .select('*')
      .eq('session_id', s.id)
      .order('created_at', { ascending: true });
    setRelatedBookings(data || []);
  };

  const csvCols: CsvColumn<PairSession>[] = [
    { key: 'session_code', header: 'Session Code' },
    { key: 'status', header: 'Status' },
    { key: 'max_participants', header: 'Max Participants' },
    { key: 'pair_booking_count', header: 'Bookings' },
    { key: 'is_test_mode', header: 'Test', format: r => r.is_test_mode ? 'Yes' : 'No' },
    { key: 'created_at', header: 'Created', format: r => formatCsvDate(r.created_at) },
    { key: 'completed_at', header: 'Completed', format: r => formatCsvDate(r.completed_at) },
  ];

  const statusColor = (s: string) =>
    s === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
    s === 'active' ? 'bg-blue-500/10 text-blue-600' :
    s === 'waiting' ? 'bg-amber-500/10 text-amber-600' :
    'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'Pair Sessions' : 'Pair Sessions'}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(sessions, csvCols, 'pair_sessions')} className="gap-1"><Download className="h-3.5 w-3.5" /> CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isTh ? 'ทั้งหมด' : 'Total', value: sessions.length },
          { label: isTh ? 'รอ' : 'Waiting', value: sessions.filter(s => s.status === 'waiting').length, color: 'text-amber-600' },
          { label: isTh ? 'กำลังตรวจ' : 'Active', value: sessions.filter(s => s.status === 'active').length, color: 'text-blue-600' },
          { label: isTh ? 'เสร็จ' : 'Completed', value: sessions.filter(s => s.status === 'completed').length, color: 'text-emerald-600' },
        ].map((s, i) => (
          <Card key={i} className="border border-border/50"><CardContent className="p-3 text-center">
            <p className={cn("text-2xl font-bold", s.color || 'text-foreground')}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="border border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{isTh ? 'ไม่มีข้อมูล' : 'No pair sessions'}</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isTh ? 'รหัส' : 'Code'}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{isTh ? 'จองคู่' : 'Bookings'}</TableHead>
                    <TableHead>{isTh ? 'สร้างเมื่อ' : 'Created'}</TableHead>
                    <TableHead>{isTh ? 'เสร็จเมื่อ' : 'Completed'}</TableHead>
                    <TableHead>Test</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(s => (
                    <TableRow key={s.id} className={cn("cursor-pointer hover:bg-accent/50", s.is_test_mode && 'bg-amber-500/5')} onClick={() => openDetail(s)}>
                      <TableCell className="font-mono text-sm">{s.session_code}</TableCell>
                      <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(s.status))}>{s.status}</span></TableCell>
                      <TableCell className="text-center">{s.pair_booking_count ?? 0}</TableCell>
                      <TableCell className="text-sm">{format(new Date(s.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.completed_at ? format(new Date(s.completed_at), 'dd/MM HH:mm') : '-'}</TableCell>
                      <TableCell>{s.is_test_mode && <span className="text-xs text-amber-500 font-medium">TEST</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      {selected && (
        <AdminDetailDrawer
          open={!!selected}
          onOpenChange={open => !open && setSelected(null)}
          title={isTh ? 'รายละเอียด Pair Session' : 'Pair Session Detail'}
          subtitle={`Code: ${selected.session_code}`}
          fields={[
            { label: 'Status', value: <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(selected.status))}>{selected.status}</span> },
            { label: 'Test Mode', value: selected.is_test_mode ? 'Yes' : 'No' },
            { label: 'Max Participants', value: String(selected.max_participants) },
            { label: 'Bookings', value: String(selected.pair_booking_count ?? 0) },
            { label: 'Session ID', value: selected.id, mono: true, fullWidth: true },
            { label: 'Host Invite ID', value: selected.host_invite_id, mono: true, fullWidth: true },
          ]}
          timeline={[
            { label: isTh ? 'สร้าง' : 'Created', time: selected.created_at, status: 'neutral' },
            { label: isTh ? 'เริ่ม' : 'Started', time: selected.started_at, status: selected.started_at ? 'success' : 'neutral' },
            { label: isTh ? 'เสร็จสิ้น' : 'Completed', time: selected.completed_at, status: selected.completed_at ? 'success' : 'neutral' },
          ]}
        >
          {relatedBookings.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">{isTh ? 'การจองที่เกี่ยวข้อง' : 'Related Booking Attributions'}</p>
              <div className="space-y-2">
                {relatedBookings.map((b: any) => (
                  <div key={b.id} className="rounded-md border border-border/50 px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{b.attribution_type}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(b.created_at), 'dd/MM HH:mm')}</span>
                    </div>
                    {b.booking_id && <p className="text-xs font-mono text-muted-foreground mt-1">Booking: {b.booking_id.slice(0, 12)}...</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </AdminDetailDrawer>
      )}
    </div>
  );
}
