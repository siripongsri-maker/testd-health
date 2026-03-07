import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Download, Activity, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";

interface LogEntry {
  id: string;
  appointment_id: string;
  action: string;
  performed_by: string | null;
  details: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function AdminActivityLogsContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  const fetch = async () => {
    setLoading(true);
    let q = supabase
      .from('appointment_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (actionFilter !== 'all') q = q.ilike('action', `%${actionFilter}%`);
    const { data } = await q;
    if (data) { setLogs(data); setHasMore(data.length === PAGE_SIZE); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [page, actionFilter]);

  const csvCols: CsvColumn<LogEntry>[] = [
    { key: 'created_at', header: 'Timestamp', format: r => formatCsvDate(r.created_at) },
    { key: 'action', header: 'Action' },
    { key: 'performed_by', header: 'Performed By' },
    { key: 'appointment_id', header: 'Appointment ID' },
    { key: 'details', header: 'Details' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'Activity Logs' : 'Activity Logs'}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCsv(logs, csvCols, 'activity_logs')} className="gap-1">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder={isTh ? 'ทุกการกระทำ' : 'All actions'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? 'ทั้งหมด' : 'All'}</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="status_changed">Status Changed</SelectItem>
            <SelectItem value="staff_assigned">Staff Assigned</SelectItem>
            <SelectItem value="checkin">Check-in</SelectItem>
            <SelectItem value="checkout">Check-out</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{isTh ? 'ไม่มี logs' : 'No logs found'}</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isTh ? 'เวลา' : 'Time'}</TableHead>
                    <TableHead>{isTh ? 'การกระทำ' : 'Action'}</TableHead>
                    <TableHead>{isTh ? 'ผู้ดำเนินการ' : 'Actor'}</TableHead>
                    <TableHead>{isTh ? 'รายละเอียด' : 'Details'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(log.created_at), 'dd/MM HH:mm:ss')}</TableCell>
                      <TableCell><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">{log.action}</span></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{log.performed_by ? log.performed_by.slice(0, 8) + '...' : 'system'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{log.details || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← {isTh ? 'ก่อนหน้า' : 'Previous'}</Button>
        <span className="text-xs text-muted-foreground">{isTh ? `หน้า ${page + 1}` : `Page ${page + 1}`}</span>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>{isTh ? 'ถัดไป' : 'Next'} →</Button>
      </div>
    </div>
  );
}
