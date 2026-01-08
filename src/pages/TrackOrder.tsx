import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Package, Search, Loader2, Copy, Truck, Check, CheckCircle2, ExternalLink, Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type OrderStatus = 'requested' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered_unconfirmed' | 'received_confirmed';

interface KitOrder {
  id: string;
  order_code: string;
  user_id: string | null;
  recipient_name: string | null;
  status: OrderStatus;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  updated_at: string;
  packed_at: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
}

const STATUS_STEPS = [
  { key: 'requested', labelTh: 'รอดำเนินการ', labelEn: 'Requested', icon: Package },
  { key: 'packed', labelTh: 'จัดเตรียมแล้ว', labelEn: 'Packed', icon: Package },
  { key: 'shipped', labelTh: 'จัดส่งแล้ว', labelEn: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', labelTh: 'กำลังจัดส่ง', labelEn: 'Out for Delivery', icon: Truck },
  { key: 'delivered_unconfirmed', labelTh: 'ถึงแล้ว', labelEn: 'Delivered', icon: Check },
  { key: 'received_confirmed', labelTh: 'รับแล้ว', labelEn: 'Received', icon: CheckCircle2 },
];

const CARRIER_TRACKING_URLS: Record<string, string> = {
  thailand_post: 'https://track.thailandpost.co.th/?trackNumber=',
  flash: 'https://www.flashexpress.co.th/tracking/?se=',
  kerry: 'https://th.kerryexpress.com/th/track/?track=',
  'j&t': 'https://www.jtexpress.co.th/index/query/gzquery.html?bills=',
  scg: 'https://www.scgexpress.co.th/tracking?tracking_no=',
};

export default function TrackOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [orderCode, setOrderCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<KitOrder | null>(null);
  const [myOrders, setMyOrders] = useState<KitOrder[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
    if (searchParams.get('code')) {
      searchOrder();
    }
  }, [user]);

  const fetchMyOrders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('kit_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyOrders((data || []) as KitOrder[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const searchOrder = async () => {
    if (!orderCode.trim()) return;

    setLoading(true);
    setNotFound(false);
    setOrder(null);

    try {
      const { data, error } = await supabase
        .from('kit_orders')
        .select('*')
        .eq('order_code', orderCode.toUpperCase().trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setNotFound(true);
        } else {
          throw error;
        }
      } else {
        setOrder(data as KitOrder);
      }
    } catch (error) {
      console.error('Error searching order:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error searching');
    } finally {
      setLoading(false);
    }
  };

  const confirmReceived = async () => {
    if (!order) return;

    setConfirming(true);
    try {
      const { error } = await supabase
        .from('kit_orders')
        .update({
          status: 'received_confirmed' as OrderStatus,
          received_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      // Add event
      await supabase.from('kit_order_events').insert({
        order_id: order.id,
        event_type: 'received',
        event_description: 'User confirmed receipt',
        created_by: user?.id || null,
        is_admin_event: false,
      });

      toast.success(language === 'th' ? 'ยืนยันรับพัสดุสำเร็จ' : 'Receipt confirmed!');
      setShowConfirmDialog(false);
      setOrder({ ...order, status: 'received_confirmed', received_at: new Date().toISOString() });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setConfirming(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied!');
  };

  const getTrackingUrl = (carrier: string | null, trackingNumber: string | null) => {
    if (!carrier || !trackingNumber) return null;
    const baseUrl = CARRIER_TRACKING_URLS[carrier];
    return baseUrl ? baseUrl + trackingNumber : null;
  };

  const getStatusIndex = (status: OrderStatus) => {
    return STATUS_STEPS.findIndex(s => s.key === status);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCarrierName = (carrier: string | null) => {
    const names: Record<string, string> = {
      thailand_post: 'Thailand Post',
      flash: 'Flash Express',
      kerry: 'Kerry Express',
      'j&t': 'J&T Express',
      scg: 'SCG Express',
      other: 'Other',
    };
    return carrier ? names[carrier] || carrier : '-';
  };

  return (
    <PageContainer showNav={true}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {language === 'th' ? 'ติดตาม Self-care Kit' : 'Track Self-care Kit'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'th' ? 'ตรวจสอบสถานะการจัดส่ง' : 'Check your delivery status'}
          </p>
        </div>
      </div>

      {/* Search Box */}
      <Card className="p-4 mb-6">
        <div className="flex gap-2">
          <Input
            placeholder={language === 'th' ? 'ใส่รหัสติดตาม...' : 'Enter order code...'}
            value={orderCode}
            onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
            className="font-mono"
            onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
          />
          <Button onClick={searchOrder} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {notFound && (
          <p className="text-sm text-destructive mt-3">
            {language === 'th' 
              ? 'ไม่พบรหัสนี้ กรุณาตรวจสอบอีกครั้ง' 
              : "We couldn't find that code. Please check and try again."}
          </p>
        )}
      </Card>

      {/* Order Details */}
      {order && (
        <Card className="p-4 mb-6">
          {/* Order Code */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'th' ? 'รหัสติดตาม' : 'Order Code'}
              </p>
              <code className="text-lg font-mono font-bold">{order.order_code}</code>
            </div>
            <Button variant="ghost" size="icon" onClick={() => copyCode(order.order_code)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Stepper */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-4">
              {language === 'th' ? 'สถานะ' : 'Status'}
            </p>
            <div className="relative">
              {STATUS_STEPS.map((step, index) => {
                const currentIndex = getStatusIndex(order.status);
                const isCompleted = index <= currentIndex;
                const isCurrent = index === currentIndex;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex items-start gap-3 mb-3 last:mb-0">
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full shrink-0
                      ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                      ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                    `}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {language === 'th' ? step.labelTh : step.labelEn}
                      </p>
                      {step.key === 'requested' && order.created_at && (
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      )}
                      {step.key === 'packed' && order.packed_at && (
                        <p className="text-xs text-muted-foreground">{formatDate(order.packed_at)}</p>
                      )}
                      {step.key === 'shipped' && order.shipped_at && (
                        <p className="text-xs text-muted-foreground">{formatDate(order.shipped_at)}</p>
                      )}
                      {step.key === 'out_for_delivery' && order.out_for_delivery_at && (
                        <p className="text-xs text-muted-foreground">{formatDate(order.out_for_delivery_at)}</p>
                      )}
                      {step.key === 'delivered_unconfirmed' && order.delivered_at && (
                        <p className="text-xs text-muted-foreground">{formatDate(order.delivered_at)}</p>
                      )}
                      {step.key === 'received_confirmed' && order.received_at && (
                        <p className="text-xs text-muted-foreground">{formatDate(order.received_at)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Info */}
          {(order.shipping_carrier || order.tracking_number) && (
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {language === 'th' ? 'ข้อมูลขนส่ง' : 'Shipping Info'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'th' ? 'ขนส่ง' : 'Carrier'}
                  </span>
                  <span>{getCarrierName(order.shipping_carrier)}</span>
                </div>
                {order.tracking_number && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      {language === 'th' ? 'เลขพัสดุ' : 'Tracking #'}
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono">{order.tracking_number}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(order.tracking_number!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {getTrackingUrl(order.shipping_carrier, order.tracking_number) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 gap-2"
                  onClick={() => window.open(getTrackingUrl(order.shipping_carrier, order.tracking_number)!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  {language === 'th' ? 'ติดตามพัสดุ' : 'Track Shipment'}
                </Button>
              )}
            </div>
          )}

          {/* Confirm Received Button */}
          {order.status === 'delivered_unconfirmed' && (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => setShowConfirmDialog(true)}
            >
              <CheckCircle2 className="h-5 w-5" />
              {language === 'th' ? 'ฉันได้รับพัสดุแล้ว' : 'I received my kit'}
            </Button>
          )}

          {/* Success State */}
          {order.status === 'received_confirmed' && (
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground">
                {language === 'th' ? 'ขอบคุณที่ยืนยัน!' : 'Thank you for confirming!'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'th' 
                  ? 'เมื่อพร้อม เราจะแนะนำวิธีใช้งาน self-test' 
                  : 'When ready, we can guide you on how to use your self-test.'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* My Orders (for logged-in users) */}
      {user && myOrders.length > 0 && !order && (
        <div>
          <h2 className="font-bold mb-3">
            {language === 'th' ? 'คำสั่งซื้อของฉัน' : 'My Orders'}
          </h2>
          <div className="space-y-3">
            {myOrders.map((o) => (
              <Card
                key={o.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setOrderCode(o.order_code);
                  setOrder(o);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <code className="font-mono font-bold">{o.order_code}</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${o.status === 'received_confirmed' ? 'bg-green-500/10 text-green-600' : 
                      o.status === 'delivered_unconfirmed' ? 'bg-orange-500/10 text-orange-600' :
                      o.status === 'shipped' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-muted text-muted-foreground'}
                  `}>
                    {STATUS_STEPS.find(s => s.key === o.status)?.[language === 'th' ? 'labelTh' : 'labelEn']}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              {language === 'th' ? 'ยืนยันรับพัสดุ' : 'Confirm Receipt'}
            </DialogTitle>
            <DialogDescription>
              {language === 'th' 
                ? 'การยืนยันช่วยให้เราปรับปรุงการจัดส่งและบริการ' 
                : 'Confirming helps us improve delivery and support.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-lg">
              {language === 'th' 
                ? 'Self-care kit ของคุณถึงแล้วใช่ไหม?' 
                : 'Did your self-care kit arrive safely?'}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {language === 'th' ? 'ยังไม่ถึง' : 'Not yet'}
            </Button>
            <Button onClick={confirmReceived} disabled={confirming} className="gap-2">
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {language === 'th' ? 'ใช่ ได้รับแล้ว' : 'Yes, received'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
