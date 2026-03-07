import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard, MessageSquare, ArrowUpRight, ArrowDownLeft,
  RotateCcw, Info, Link2, QrCode, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  metadata: any;
  created_at: string;
}

export default function Credits() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isTh = language === 'th';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { state: { from: '/credits' } });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    Promise.all([
      supabase.rpc('get_sms_credit_balance'),
      (supabase as any).from('sms_credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]).then(([balRes, txRes]) => {
      if (typeof balRes.data === 'number') setBalance(balRes.data);
      if (!txRes.error && txRes.data) setTransactions(txRes.data);
      setLoadingData(false);
    });
  }, [user]);

  if (loading || !user) return null;

  const txIcon = (type: string) => {
    switch (type) {
      case 'grant': return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
      case 'deduct': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'refund': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      default: return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const txLabel = (type: string) => {
    const labels: Record<string, { th: string; en: string }> = {
      grant: { th: 'ได้รับเครดิต', en: 'Credits received' },
      deduct: { th: 'ใช้ส่ง SMS', en: 'Used for SMS' },
      refund: { th: 'คืนเครดิต', en: 'Credit refunded' },
      purchase: { th: 'ซื้อเครดิต', en: 'Purchased' },
      adjustment: { th: 'ปรับยอด', en: 'Adjusted' },
    };
    return labels[type] ? (isTh ? labels[type].th : labels[type].en) : type;
  };

  return (
    <>
      <PageContainer>
        <PageHeader
          title={isTh ? 'เครดิต SMS' : 'SMS Credits'}
          subtitle={isTh ? 'จัดการเครดิตสำหรับส่ง SMS ชวนตรวจแบบไม่ระบุตัวตน' : 'Manage credits for anonymous SMS invitations'}
        />

        {/* Balance card */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isTh ? 'ยอดเครดิตปัจจุบัน' : 'Current balance'}
                </p>
                <p className="text-3xl font-bold text-foreground">{balance}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {isTh ? '1 SMS = 1 เครดิต' : '1 SMS = 1 credit'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate('/invite')}
            className="w-full"
            size="lg"
            disabled={balance < 1}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {balance > 0
              ? (isTh ? 'ส่ง SMS ชวนตรวจ' : 'Send SMS invite')
              : (isTh ? 'เครดิตไม่พอ' : 'No credits available')}
          </Button>
        </div>

        {/* How to get credits */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              {isTh ? 'วิธีรับเครดิต' : 'How to get credits'}
            </h3>
          </div>

          <div className="space-y-3">
            {/* Sponsored */}
            <div className="flex items-start gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 shrink-0 mt-0.5">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isTh ? 'เครดิตสนับสนุน' : 'Sponsored credits'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isTh
                    ? 'ติดต่อทีมงาน testD หรือองค์กรพาร์ทเนอร์เพื่อรับเครดิตสนับสนุนสำหรับโครงการส่งเสริมสุขภาพ'
                    : 'Contact the testD team or partner organizations for sponsored credits for health promotion projects'}
                </p>
              </div>
            </div>

            {/* Purchase - coming soon */}
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 border border-border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isTh ? 'ซื้อเครดิต' : 'Purchase credits'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isTh
                    ? 'การเติมเครดิต SMS จะเปิดใช้งานเร็ว ๆ นี้'
                    : 'SMS top-up will be available soon'}
                </p>
                <span className="inline-block mt-1 text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {isTh ? 'เร็ว ๆ นี้' : 'Coming soon'}
                </span>
              </div>
            </div>
          </div>

          {/* Alternative CTA */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              {isTh ? 'ระหว่างรอเครดิต คุณสามารถ:' : "While waiting for credits, you can:"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/invite')} className="gap-1.5 text-xs">
                <Link2 className="h-3 w-3" />
                {isTh ? 'ส่งลิงก์ชวนตรวจ' : 'Send invite link'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/invite')} className="gap-1.5 text-xs">
                <QrCode className="h-3 w-3" />
                {isTh ? 'ใช้ QR Code' : 'Use QR code'}
              </Button>
            </div>
          </div>
        </div>

        {/* Refund policy */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 mb-6">
          <p className="text-xs text-muted-foreground">
            {isTh
              ? '💡 หากส่ง SMS ไม่สำเร็จก่อนระบบผู้ให้บริการรับคำสั่ง เครดิตจะถูกคืนอัตโนมัติ'
              : '💡 If SMS send fails before provider acceptance, your credit will be automatically refunded'}
          </p>
        </div>

        {/* Transaction history */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-card">
          <h3 className="font-semibold text-foreground text-sm mb-3">
            {isTh ? 'ประวัติการใช้เครดิต' : 'Credit history'}
          </h3>

          {loadingData ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {isTh ? 'กำลังโหลด...' : 'Loading...'}
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {isTh ? 'ยังไม่มีประวัติ' : 'No transactions yet'}
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                  {txIcon(tx.transaction_type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{txLabel(tx.transaction_type)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold",
                      tx.amount > 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isTh ? `คงเหลือ ${tx.balance_after}` : `bal. ${tx.balance_after}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
