import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Download, Wallet, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";

interface CreditBalance {
  user_id: string;
  balance: number;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  relay_id: string | null;
  transaction_type: string;
  amount: number;
  balance_after: number;
  metadata: any;
  created_at: string;
}

export default function AdminCreditBalancesContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [balances, setBalances] = useState<CreditBalance[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const [balRes, txRes] = await Promise.all([
      (supabase as any).from('sms_credit_balances').select('*').order('updated_at', { ascending: false }),
      (supabase as any).from('sms_credit_transactions').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    if (balRes.data) setBalances(balRes.data);
    if (txRes.data) setTransactions(txRes.data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);
  const totalGranted = transactions.filter(t => t.transaction_type === 'grant').reduce((s, t) => s + t.amount, 0);
  const totalDeducted = transactions.filter(t => t.transaction_type === 'deduct').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalRefunded = transactions.filter(t => t.transaction_type === 'refund').reduce((s, t) => s + t.amount, 0);

  const balCols: CsvColumn<CreditBalance>[] = [
    { key: 'user_id', header: 'User ID' },
    { key: 'balance', header: 'Balance' },
    { key: 'updated_at', header: 'Last Updated', format: r => formatCsvDate(r.updated_at) },
  ];

  const txCols: CsvColumn<CreditTransaction>[] = [
    { key: 'created_at', header: 'Date', format: r => formatCsvDate(r.created_at) },
    { key: 'user_id', header: 'User ID' },
    { key: 'transaction_type', header: 'Type' },
    { key: 'amount', header: 'Amount' },
    { key: 'balance_after', header: 'Balance After' },
    { key: 'relay_id', header: 'Relay ID' },
  ];

  const txColor = (type: string) =>
    type === 'grant' ? 'bg-emerald-500/10 text-emerald-600' :
    type === 'deduct' ? 'bg-red-500/10 text-red-600' :
    type === 'refund' ? 'bg-blue-500/10 text-blue-600' :
    type === 'purchase' ? 'bg-violet-500/10 text-violet-600' :
    'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'SMS Credit Balances' : 'SMS Credit Balances'}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isTh ? 'คงเหลือรวม' : 'Total Balance', value: totalBalance, color: 'text-violet-600' },
          { label: isTh ? 'ให้แล้ว' : 'Granted', value: totalGranted, color: 'text-emerald-600' },
          { label: isTh ? 'ใช้แล้ว' : 'Deducted', value: totalDeducted, color: 'text-red-600' },
          { label: isTh ? 'คืนแล้ว' : 'Refunded', value: totalRefunded, color: 'text-blue-600' },
        ].map((s, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-3 text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Balances Table */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{isTh ? 'ยอดเครดิตผู้ใช้' : 'User Balances'}</h3>
            <Button variant="outline" size="sm" onClick={() => exportToCsv(balances, balCols, 'credit_balances')} className="gap-1">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <Card className="border border-border/50">
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead className="text-right">{isTh ? 'ยอดเครดิต' : 'Balance'}</TableHead>
                      <TableHead>{isTh ? 'อัพเดทล่าสุด' : 'Updated'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">{isTh ? 'ไม่มีข้อมูล' : 'No balances'}</TableCell></TableRow>
                    ) : balances.map(b => (
                      <TableRow key={b.user_id}>
                        <TableCell className="text-xs font-mono">{b.user_id.slice(0, 12)}...</TableCell>
                        <TableCell className="text-right font-bold text-foreground">{b.balance}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(b.updated_at), 'dd/MM HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{isTh ? 'ประวัติธุรกรรม' : 'Transaction History'}</h3>
            <Button variant="outline" size="sm" onClick={() => exportToCsv(transactions, txCols, 'credit_transactions')} className="gap-1">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
          <Card className="border border-border/50">
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>{isTh ? 'ประเภท' : 'Type'}</TableHead>
                      <TableHead className="text-right">{isTh ? 'จำนวน' : 'Amount'}</TableHead>
                      <TableHead className="text-right">{isTh ? 'ยอดหลัง' : 'After'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">{isTh ? 'ไม่มีธุรกรรม' : 'No transactions'}</TableCell></TableRow>
                    ) : transactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(tx.created_at), 'dd/MM HH:mm')}</TableCell>
                        <TableCell className="text-xs font-mono">{tx.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", txColor(tx.transaction_type))}>{tx.transaction_type}</span>
                        </TableCell>
                        <TableCell className={cn("text-right font-medium", tx.amount > 0 ? 'text-emerald-600' : 'text-red-600')}>{tx.amount > 0 ? `+${tx.amount}` : tx.amount}</TableCell>
                        <TableCell className="text-right text-foreground">{tx.balance_after}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
