import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Download, CreditCard, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";
import AdminDetailDrawer from "./AdminDetailDrawer";

interface Purchase {
  id: string;
  user_id: string;
  package_key: string;
  credits: number;
  amount_thb: number | null;
  status: string;
  payment_provider: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminCreditPurchasesContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Purchase | null>(null);
  const [relatedTxs, setRelatedTxs] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    let q = (supabase as any).from('sms_credit_purchases').select('*').order('created_at', { ascending: false }).limit(200);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    if (data) setPurchases(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const openDetail = async (p: Purchase) => {
    setSelected(p);
    // Fetch credit transactions for this user around the purchase time
    const { data } = await (supabase as any)
      .from('sms_credit_transactions')
      .select('*')
      .eq('user_id', p.user_id)
      .eq('transaction_type', 'purchase')
      .order('created_at', { ascending: false })
      .limit(10);
    setRelatedTxs(data || []);
  };

  const csvCols: CsvColumn<Purchase>[] = [
    { key: 'id', header: 'Purchase ID' },
    { key: 'user_id', header: 'User ID' },
    { key: 'package_key', header: 'Package' },
    { key: 'credits', header: 'Credits' },
    { key: 'amount_thb', header: 'Amount (THB)' },
    { key: 'status', header: 'Status' },
    { key: 'payment_provider', header: 'Provider' },
    { key: 'payment_reference', header: 'Reference' },
    { key: 'created_at', header: 'Created', format: r => formatCsvDate(r.created_at) },
  ];

  const statusColor = (s: string) =>
    s === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
    s === 'pending' ? 'bg-amber-500/10 text-amber-600' :
    s === 'failed' ? 'bg-red-500/10 text-red-600' :
    s === 'refunded' ? 'bg-blue-500/10 text-blue-600' :
    'bg-muted text-muted-foreground';

  const totalThb = purchases.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount_thb || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'ประวัติการซื้อเครดิต' : 'Credit Purchases'}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(purchases, csvCols, 'credit_purchases')} className="gap-1"><Download className="h-3.5 w-3.5" /> CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border border-border/50"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{purchases.length}</p>
          <p className="text-xs text-muted-foreground">{isTh ? 'ทั้งหมด' : 'Total'}</p>
        </CardContent></Card>
        <Card className="border border-border/50"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">฿{totalThb.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{isTh ? 'ยอดรวม' : 'Total Revenue'}</p>
        </CardContent></Card>
        <Card className="border border-border/50"><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{purchases.filter(p => p.status === 'pending').length}</p>
          <p className="text-xs text-muted-foreground">{isTh ? 'รอชำระ' : 'Pending'}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? 'ทุกสถานะ' : 'All'}</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : purchases.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{isTh ? 'ไม่พบข้อมูล' : 'No purchases found'}</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>{isTh ? 'แพ็คเกจ' : 'Package'}</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">THB</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openDetail(p)}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(p.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell className="text-xs font-mono">{p.user_id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-sm">{p.package_key}</TableCell>
                      <TableCell className="text-right font-medium">{p.credits}</TableCell>
                      <TableCell className="text-right">{p.amount_thb ? `฿${p.amount_thb}` : '-'}</TableCell>
                      <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(p.status))}>{p.status}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.payment_provider || '-'}</TableCell>
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
          title={isTh ? 'รายละเอียดการซื้อ' : 'Purchase Detail'}
          subtitle={`ID: ${selected.id.slice(0, 12)}...`}
          fields={[
            { label: 'Status', value: <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(selected.status))}>{selected.status}</span> },
            { label: isTh ? 'แพ็คเกจ' : 'Package', value: selected.package_key },
            { label: 'Credits', value: String(selected.credits) },
            { label: isTh ? 'จำนวนเงิน' : 'Amount', value: selected.amount_thb ? `฿${selected.amount_thb}` : '—' },
            { label: 'Payment Provider', value: selected.payment_provider || '—' },
            { label: 'Payment Reference', value: selected.payment_reference || '—', mono: true },
            { label: 'User ID', value: selected.user_id, mono: true, fullWidth: true },
            { label: 'Purchase ID', value: selected.id, mono: true, fullWidth: true },
          ]}
          timeline={[
            { label: isTh ? 'สร้าง' : 'Created', time: selected.created_at, status: 'neutral' },
            { label: isTh ? 'อัพเดทล่าสุด' : 'Last Updated', time: selected.updated_at, status: selected.status === 'completed' ? 'success' : selected.status === 'failed' ? 'error' : 'warning' },
          ]}
        >
          {relatedTxs.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">{isTh ? 'ธุรกรรมเครดิตที่เกี่ยวข้อง' : 'Related Credit Transactions'}</p>
              <div className="space-y-2">
                {relatedTxs.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'dd/MM HH:mm')}</span>
                    <span className="text-emerald-600 font-medium">+{tx.amount}</span>
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
