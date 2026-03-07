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

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('partner_test_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setSessions(data as PairSession[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

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
          <Button variant="outline" size="sm" onClick={fetch} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
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
                    <TableRow key={s.id} className={s.is_test_mode ? 'bg-amber-500/5' : ''}>
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
    </div>
  );
}
