import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Download, MessageSquare, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";
import AdminDetailDrawer from "./AdminDetailDrawer";

interface RelayRow {
  id: string;
  invite_id: string;
  relay_type: string;
  recipient_hash: string;
  relay_status: string;
  block_reason: string | null;
  provider: string | null;
  provider_message_id: string | null;
  is_test_mode: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 50;

export default function AdminSmsRelayContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [relays, setRelays] = useState<RelayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [testFilter, setTestFilter] = useState('exclude');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<RelayRow | null>(null);
  const [relatedTx, setRelatedTx] = useState<any[]>([]);

  const fetchRelays = async () => {
    setLoading(true);
    let q = (supabase as any).from('partner_invite_relays')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') q = q.eq('relay_status', statusFilter);
    if (testFilter === 'exclude') q = q.eq('is_test_mode', false);
    else if (testFilter === 'only') q = q.eq('is_test_mode', true);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

    const { data, error } = await q;
    if (!error && data) {
      setRelays(data as RelayRow[]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRelays(); }, [statusFilter, testFilter, dateFrom, dateTo, page]);

  const openDetail = async (r: RelayRow) => {
    setSelected(r);
    // Fetch related credit transactions for this relay
    const { data } = await (supabase as any)
      .from('sms_credit_transactions')
      .select('*')
      .eq('relay_id', r.id)
      .order('created_at', { ascending: true });
    setRelatedTx(data || []);
  };

  const totals = {
    sent: relays.filter(r => r.relay_status === 'sent').length,
    failed: relays.filter(r => r.relay_status === 'failed').length,
    blocked: relays.filter(r => r.relay_status === 'blocked').length,
    pending: relays.filter(r => r.relay_status === 'pending').length,
  };

  const csvColumns: CsvColumn<RelayRow>[] = [
    { key: 'created_at', header: 'Created At', format: r => formatCsvDate(r.created_at) },
    { key: 'relay_type', header: 'Type' },
    { key: 'relay_status', header: 'Status' },
    { key: 'provider', header: 'Provider' },
    { key: 'provider_message_id', header: 'Provider Message ID' },
    { key: 'block_reason', header: 'Block Reason' },
    { key: 'recipient_hash', header: 'Recipient Hash' },
    { key: 'is_test_mode', header: 'Test Mode', format: r => r.is_test_mode ? 'Yes' : 'No' },
  ];

  const statusColor = (s: string) =>
    s === 'sent' ? 'bg-emerald-500/10 text-emerald-600' :
    s === 'failed' ? 'bg-red-500/10 text-red-600' :
    s === 'blocked' ? 'bg-amber-500/10 text-amber-600' :
    'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'SMS Relay Logs' : 'SMS Relay Logs'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchRelays} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> {isTh ? 'รีเฟรช' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(relays, csvColumns, 'sms_relay', { from: dateFrom, to: dateTo })} className="gap-1">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isTh ? 'ส่งสำเร็จ' : 'Sent', value: totals.sent, color: 'text-emerald-600' },
          { label: isTh ? 'ล้มเหลว' : 'Failed', value: totals.failed, color: 'text-red-600' },
          { label: isTh ? 'ถูกบล็อก' : 'Blocked', value: totals.blocked, color: 'text-amber-600' },
          { label: isTh ? 'รอส่ง' : 'Pending', value: totals.pending, color: 'text-muted-foreground' },
        ].map((s, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-36" />
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-36" />
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? 'ทุกสถานะ' : 'All'}</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={testFilter} onValueChange={v => { setTestFilter(v); setPage(0); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="exclude">{isTh ? 'ไม่รวม Test' : 'Excl. Test'}</SelectItem>
            <SelectItem value="include">{isTh ? 'รวม Test' : 'Incl. Test'}</SelectItem>
            <SelectItem value="only">{isTh ? 'เฉพาะ Test' : 'Test Only'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : relays.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{isTh ? 'ไม่พบข้อมูล' : 'No relay logs found'}</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Message ID</TableHead>
                    <TableHead>{isTh ? 'เหตุผล' : 'Reason'}</TableHead>
                    <TableHead>Test</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relays.map(r => (
                    <TableRow key={r.id} className={cn("cursor-pointer hover:bg-accent/50", r.is_test_mode && 'bg-amber-500/5')} onClick={() => openDetail(r)}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(r.relay_status))}>{r.relay_status}</span>
                      </TableCell>
                      <TableCell className="text-sm">{r.provider || '-'}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.provider_message_id ? r.provider_message_id.slice(0, 16) + '...' : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.block_reason || '-'}</TableCell>
                      <TableCell>{r.is_test_mode && <span className="text-xs text-amber-500 font-medium">TEST</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          ← {isTh ? 'ก่อนหน้า' : 'Previous'}
        </Button>
        <span className="text-xs text-muted-foreground">{isTh ? `หน้า ${page + 1}` : `Page ${page + 1}`}</span>
        <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
          {isTh ? 'ถัดไป' : 'Next'} →
        </Button>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <AdminDetailDrawer
          open={!!selected}
          onOpenChange={open => !open && setSelected(null)}
          title={isTh ? 'รายละเอียด SMS Relay' : 'SMS Relay Detail'}
          subtitle={`ID: ${selected.id.slice(0, 12)}...`}
          fields={[
            { label: 'Status', value: <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(selected.relay_status))}>{selected.relay_status}</span> },
            { label: 'Type', value: selected.relay_type },
            { label: 'Provider', value: selected.provider || '—' },
            { label: 'Test Mode', value: selected.is_test_mode ? 'Yes' : 'No' },
            { label: 'Provider Message ID', value: selected.provider_message_id || '—', mono: true, fullWidth: true },
            { label: 'Recipient Hash', value: selected.recipient_hash, mono: true, fullWidth: true },
            { label: 'Invite ID', value: selected.invite_id, mono: true, fullWidth: true },
            { label: 'Block Reason', value: selected.block_reason || '—', fullWidth: true },
          ]}
          timeline={[
            { label: isTh ? 'สร้าง' : 'Created', time: selected.created_at, status: 'neutral' },
            { label: isTh ? 'อัพเดทล่าสุด' : 'Last Updated', time: selected.updated_at, status: selected.relay_status === 'sent' ? 'success' : selected.relay_status === 'failed' ? 'error' : 'warning' },
          ]}
        >
          {relatedTx.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">{isTh ? 'ธุรกรรมเครดิตที่เกี่ยวข้อง' : 'Related Credit Transactions'}</p>
              <div className="space-y-2">
                {relatedTx.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm">
                    <div>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-medium mr-2",
                        tx.transaction_type === 'deduct' ? 'bg-red-500/10 text-red-600' :
                        tx.transaction_type === 'refund' ? 'bg-blue-500/10 text-blue-600' :
                        'bg-emerald-500/10 text-emerald-600'
                      )}>{tx.transaction_type}</span>
                      <span className="text-muted-foreground">{format(new Date(tx.created_at), 'dd/MM HH:mm')}</span>
                    </div>
                    <span className={cn("font-medium", tx.amount > 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
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
