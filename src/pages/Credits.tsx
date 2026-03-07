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
  RotateCcw, Info, Link2, QrCode, ShoppingCart, Loader2,
  CheckCircle2, Sparkles, Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  metadata: any;
  created_at: string;
}

interface CreditPackage {
  id: string;
  package_key: string;
  credits: number;
  price_thb: number;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  display_order: number;
}

export default function Credits() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const isTh = language === 'th';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { state: { from: '/credits' } });
    }
  }, [user, loading, navigate]);

  const fetchData = () => {
    if (!user) return;
    setLoadingData(true);
    Promise.all([
      supabase.rpc('get_sms_credit_balance'),
      (supabase as any).from('sms_credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any).from('sms_credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]).then(([balRes, txRes, pkgRes]) => {
      if (typeof balRes.data === 'number') setBalance(balRes.data);
      if (!txRes.error && txRes.data) setTransactions(txRes.data);
      if (!pkgRes.error && pkgRes.data) setPackages(pkgRes.data);
      setLoadingData(false);
    });
  };

  useEffect(() => { fetchData(); }, [user]);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (purchasing) return;
    setPurchasing(pkg.package_key);
    setPurchaseSuccess(false);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-sms-credits', {
        body: { action: 'initiate', package_key: pkg.package_key },
      });
      if (error) throw error;
      const res = data as any;
      if (res.status === 'completed') {
        setBalance(res.balance ?? balance + pkg.credits);
        setPurchaseSuccess(true);
        toast.success(isTh
          ? `เติม ${pkg.credits} เครดิตสำเร็จ!`
          : `${pkg.credits} credits added!`);
        fetchData();
        setTimeout(() => setPurchaseSuccess(false), 3000);
      } else if (res.status === 'pending' && res.checkout_url) {
        window.open(res.checkout_url, '_blank');
      } else if (res.status === 'pending') {
        toast.info(isTh ? 'ระบบชำระเงินกำลังดำเนินการ' : 'Payment processing...');
      } else {
        toast.error(isTh ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Something went wrong. Please try again.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading || !user) return null;

  const txIcon = (type: string) => {
    switch (type) {
      case 'grant': return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />;
      case 'purchase': return <ShoppingCart className="h-4 w-4 text-emerald-600" />;
      case 'deduct': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'refund': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      default: return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const txLabel = (type: string) => {
    const labels: Record<string, { th: string; en: string }> = {
      grant: { th: 'ได้รับเครดิตสนับสนุน', en: 'Sponsored credits' },
      purchase: { th: 'ซื้อเครดิต', en: 'Purchased' },
      deduct: { th: 'ใช้ส่ง SMS', en: 'Used for SMS' },
      refund: { th: 'คืนเครดิต', en: 'Refunded' },
      adjustment: { th: 'ปรับยอด', en: 'Adjusted' },
    };
    return labels[type] ? (isTh ? labels[type].th : labels[type].en) : type;
  };

  return (
    <>
      <PageContainer>
        <PageHeader
          title={isTh ? 'เครดิต SMS' : 'SMS Credits'}
          subtitle={isTh ? 'เติมเครดิตเพื่อส่ง SMS แบบไม่ระบุตัวตน' : 'Top up credits to send anonymous SMS invitations'}
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

          {purchaseSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 mb-3 animate-fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {isTh ? 'เติมเครดิตสำเร็จ!' : 'Credits added successfully!'}
              </p>
            </div>
          )}

          <Button
            onClick={() => navigate('/invite')}
            className="w-full"
            size="lg"
            disabled={balance < 1}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {balance > 0
              ? (isTh ? 'ส่ง SMS ชวนตรวจ' : 'Send SMS invite')
              : (isTh ? 'เครดิตไม่พอ — เติมเครดิตด้านล่าง' : 'No credits — top up below')}
          </Button>
        </div>

        {/* Top-up packages */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              {isTh ? 'เติมเครดิต SMS' : 'Top up SMS credits'}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {isTh
              ? 'ซื้อเครดิตเพื่อส่ง SMS แบบไม่ระบุตัวตน — เครดิตจะถูกตัดเมื่อระบบส่งข้อความสำเร็จ'
              : 'Buy credits to send anonymous SMS — credits are deducted when the send request succeeds'}
          </p>

          {loadingData ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              {isTh ? 'ยังไม่มีแพ็กเกจ' : 'No packages available'}
            </p>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => {
                const pricePerSms = (pkg.price_thb / pkg.credits).toFixed(0);
                const isPopular = pkg.package_key === 'pack_10';
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "relative rounded-xl border-2 p-4 transition-all",
                      isPopular
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    {isPopular && (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-0.5">
                        {isTh ? 'แนะนำ' : 'Popular'}
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          isPopular ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Package className={cn("h-5 w-5", isPopular ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {isTh ? pkg.name_th : pkg.name_en}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isTh ? pkg.description_th : pkg.description_en}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">฿{pkg.price_thb.toFixed(0)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          ≈ ฿{pricePerSms}/{isTh ? 'ข้อความ' : 'SMS'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing !== null}
                      size="sm"
                      className="w-full mt-3"
                      variant={isPopular ? "default" : "outline"}
                    >
                      {purchasing === pkg.package_key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 mr-2" />
                      )}
                      {isTh ? 'ซื้อเครดิต' : 'Buy credits'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Refund policy */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 mb-6">
          <p className="text-xs text-muted-foreground">
            {isTh
              ? '💡 หากส่ง SMS ไม่สำเร็จก่อนระบบผู้ให้บริการรับคำสั่ง เครดิตจะถูกคืนอัตโนมัติ'
              : '💡 If SMS send fails before provider acceptance, your credit will be automatically refunded'}
          </p>
        </div>

        {/* How to get credits (sponsored) */}
        <div className="rounded-2xl bg-card border border-border p-5 shadow-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              {isTh ? 'เครดิตสนับสนุน' : 'Sponsored credits'}
            </h3>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 shrink-0 mt-0.5">
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isTh ? 'เครดิตจากองค์กรพาร์ทเนอร์' : 'Partner organization credits'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isTh
                  ? 'ติดต่อทีมงาน testD หรือองค์กรพาร์ทเนอร์เพื่อรับเครดิตสนับสนุนสำหรับโครงการส่งเสริมสุขภาพ'
                  : 'Contact the testD team or partner organizations for sponsored credits for health promotion projects'}
              </p>
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
