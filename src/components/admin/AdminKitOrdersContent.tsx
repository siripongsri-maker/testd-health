import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Package, Plus, Search, Loader2, Eye, Copy, Truck, Download, FileSpreadsheet, TestTube, Printer, PhoneCall
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type OrderStatus = 'requested' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered_unconfirmed' | 'received_confirmed';

interface KitOrder {
  id: string;
  order_code: string;
  user_id: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address: string;
  status: OrderStatus;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  packed_at: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  received_at: string | null;
}

interface SelftestPii {
  id: string;
  full_name: string | null;
  thai_id: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  subdistrict: string | null;
  province: string | null;
  postal_code: string | null;
  date_of_birth: string | null;
  line_id: string | null;
}

interface HIVTestRequest {
  id: string;
  user_id: string;
  pii_id: string | null;
  status: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  test_result: string | null;
  staff_notes: string | null;
  wants_callback: boolean | null;
  callback_phone: string | null;
  selftest_pii: SelftestPii | null;
}

const HIV_STATUS_OPTIONS = [
  { value: 'pending', labelTh: 'รอตรวจสอบ', labelEn: 'Pending' },
  { value: 'approved', labelTh: 'อนุมัติแล้ว', labelEn: 'Approved' },
  { value: 'shipped', labelTh: 'จัดส่งแล้ว', labelEn: 'Shipped' },
  { value: 'delivered', labelTh: 'ถึงผู้รับแล้ว', labelEn: 'Delivered' },
];

interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  event_description: string | null;
  is_admin_event: boolean;
  created_at: string;
}

const STATUS_OPTIONS: { value: OrderStatus; labelTh: string; labelEn: string }[] = [
  { value: 'requested', labelTh: 'รอดำเนินการ', labelEn: 'Requested' },
  { value: 'packed', labelTh: 'จัดเตรียมแล้ว', labelEn: 'Packed' },
  { value: 'shipped', labelTh: 'จัดส่งแล้ว', labelEn: 'Shipped' },
  { value: 'out_for_delivery', labelTh: 'กำลังจัดส่ง', labelEn: 'Out for Delivery' },
  { value: 'delivered_unconfirmed', labelTh: 'ถึงแล้ว (รอยืนยัน)', labelEn: 'Delivered (Unconfirmed)' },
  { value: 'received_confirmed', labelTh: 'รับแล้ว', labelEn: 'Received (Confirmed)' },
];

const CARRIERS = [
  { value: 'thailand_post', label: 'Thailand Post' },
  { value: 'flash', label: 'Flash Express' },
  { value: 'kerry', label: 'Kerry Express' },
  { value: 'j&t', label: 'J&T Express' },
  { value: 'scg', label: 'SCG Express' },
  { value: 'other', label: 'Other' },
];

export default function AdminKitOrdersContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<KitOrder[]>([]);
  const [hivRequests, setHivRequests] = useState<HIVTestRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [dataSource, setDataSource] = useState<"kit_orders" | "hiv_requests">("kit_orders");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<KitOrder | null>(null);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [saving, setSaving] = useState(false);

  // Form states for new order
  const [newOrder, setNewOrder] = useState({
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    internal_notes: '',
  });

  // Form states for order update
  const [updateForm, setUpdateForm] = useState({
    status: '' as OrderStatus | '',
    shipping_carrier: '',
    tracking_number: '',
    tracking_url: '',
    internal_notes: '',
  });

  // HIV request edit states
  const [editingHIVRequest, setEditingHIVRequest] = useState<string | null>(null);
  const [hivEditForm, setHivEditForm] = useState<{ status: string; tracking_number: string }>({
    status: '',
    tracking_number: '',
  });
  const [savingHIV, setSavingHIV] = useState(false);

  // Print states
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<(KitOrder | HIVTestRequest)[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchHIVRequests();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kit_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as KitOrder[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error loading orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchHIVRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('hiv_selftest_requests')
        .select(`
          id,
          user_id,
          pii_id,
          status,
          tracking_number,
          created_at,
          updated_at,
          test_result,
          staff_notes,
          wants_callback,
          callback_phone,
          selftest_pii (
            id,
            full_name,
            thai_id,
            phone,
            address,
            district,
            subdistrict,
            province,
            postal_code,
            date_of_birth,
            line_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHivRequests(data || []);
    } catch (error) {
      console.error('Error fetching HIV requests:', error);
    }
  };

  const fetchOrderEvents = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('kit_order_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrderEvents((data || []) as OrderEvent[]);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const createOrder = async () => {
    if (!newOrder.recipient_address.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกที่อยู่' : 'Address is required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('kit_orders')
        .insert({
          recipient_name: newOrder.recipient_name || null,
          recipient_phone: newOrder.recipient_phone || null,
          recipient_address: newOrder.recipient_address,
          internal_notes: newOrder.internal_notes || null,
          created_by: user?.id,
          order_code: '',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('kit_order_events').insert({
        order_id: data.id,
        event_type: 'created',
        event_description: 'Order created',
        created_by: user?.id,
        is_admin_event: true,
      });

      toast.success(language === 'th' ? 'สร้างคำสั่งซื้อสำเร็จ' : 'Order created successfully');
      setShowCreateDialog(false);
      setNewOrder({ recipient_name: '', recipient_phone: '', recipient_address: '', internal_notes: '' });
      fetchOrders();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Error creating order');
    } finally {
      setSaving(false);
    }
  };

  const openOrderDetail = (order: KitOrder) => {
    setSelectedOrder(order);
    setUpdateForm({
      status: order.status,
      shipping_carrier: order.shipping_carrier || '',
      tracking_number: order.tracking_number || '',
      tracking_url: order.tracking_url || '',
      internal_notes: order.internal_notes || '',
    });
    fetchOrderEvents(order.id);
    setShowDetailDialog(true);
  };

  const updateOrder = async () => {
    if (!selectedOrder) return;

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        status: updateForm.status,
        shipping_carrier: updateForm.shipping_carrier || null,
        tracking_number: updateForm.tracking_number || null,
        tracking_url: updateForm.tracking_url || null,
        internal_notes: updateForm.internal_notes || null,
        last_updated_by: user?.id,
      };

      if (updateForm.status === 'packed' && !selectedOrder.packed_at) {
        updates.packed_at = new Date().toISOString();
      }
      if (updateForm.status === 'shipped' && !selectedOrder.shipped_at) {
        updates.shipped_at = new Date().toISOString();
      }
      if (updateForm.status === 'out_for_delivery' && !selectedOrder.out_for_delivery_at) {
        updates.out_for_delivery_at = new Date().toISOString();
      }
      if (updateForm.status === 'delivered_unconfirmed' && !selectedOrder.delivered_at) {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('kit_orders')
        .update(updates)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      if (updateForm.status !== selectedOrder.status) {
        await supabase.from('kit_order_events').insert({
          order_id: selectedOrder.id,
          event_type: 'status_change',
          event_description: `Status changed to ${updateForm.status}`,
          created_by: user?.id,
          is_admin_event: false,
        });
      }

      toast.success(language === 'th' ? 'อัปเดตสำเร็จ' : 'Updated successfully');
      setShowDetailDialog(false);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditingHIVRequest = (request: HIVTestRequest) => {
    setEditingHIVRequest(request.id);
    setHivEditForm({
      status: request.status,
      tracking_number: request.tracking_number || '',
    });
  };

  const cancelEditingHIVRequest = () => {
    setEditingHIVRequest(null);
    setHivEditForm({ status: '', tracking_number: '' });
  };

  const saveHIVRequest = async (requestId: string) => {
    setSavingHIV(true);
    try {
      const { error } = await supabase
        .from('hiv_selftest_requests')
        .update({
          status: hivEditForm.status,
          tracking_number: hivEditForm.tracking_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success(language === 'th' ? 'อัปเดตสำเร็จ' : 'Updated successfully');
      setEditingHIVRequest(null);
      setHivEditForm({ status: '', tracking_number: '' });
      fetchHIVRequests();
    } catch (error: any) {
      console.error('Error updating HIV request:', error);
      toast.error(error.message || 'Error updating request');
    } finally {
      setSavingHIV(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied!');
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig: Record<OrderStatus, { color: string; labelTh: string; labelEn: string }> = {
      requested: { color: 'bg-yellow-500', labelTh: 'รอดำเนินการ', labelEn: 'Requested' },
      packed: { color: 'bg-blue-500', labelTh: 'จัดเตรียมแล้ว', labelEn: 'Packed' },
      shipped: { color: 'bg-indigo-500', labelTh: 'จัดส่งแล้ว', labelEn: 'Shipped' },
      out_for_delivery: { color: 'bg-purple-500', labelTh: 'กำลังจัดส่ง', labelEn: 'Out for Delivery' },
      delivered_unconfirmed: { color: 'bg-orange-500', labelTh: 'ถึงแล้ว (รอยืนยัน)', labelEn: 'Delivered' },
      received_confirmed: { color: 'bg-green-500', labelTh: 'รับแล้ว', labelEn: 'Received' },
    };
    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-white`}>
        {language === 'th' ? config.labelTh : config.labelEn}
      </Badge>
    );
  };

  const getHIVStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; labelTh: string; labelEn: string }> = {
      pending: { color: 'bg-yellow-500', labelTh: 'รอตรวจสอบ', labelEn: 'Pending' },
      approved: { color: 'bg-blue-500', labelTh: 'อนุมัติแล้ว', labelEn: 'Approved' },
      shipped: { color: 'bg-indigo-500', labelTh: 'จัดส่งแล้ว', labelEn: 'Shipped' },
      delivered: { color: 'bg-green-500', labelTh: 'ถึงผู้รับแล้ว', labelEn: 'Delivered' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-500', labelTh: status, labelEn: status };
    return (
      <Badge className={`${config.color} text-white`}>
        {language === 'th' ? config.labelTh : config.labelEn}
      </Badge>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.order_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipient_phone?.includes(searchQuery);
    
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const filteredHIVRequests = hivRequests.filter(request => {
    const matchesSearch = !searchQuery || 
      request.selftest_pii?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.selftest_pii?.phone?.includes(searchQuery);
    
    const matchesTab = activeTab === 'all' || request.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Export functions
  const exportToCSV = () => {
    let csvContent = "";
    
    if (dataSource === "kit_orders") {
      csvContent = "Order Code,Recipient Name,Phone,Address,Status,Carrier,Tracking Number,Created At,Updated At\n";
      filteredOrders.forEach(order => {
        const row = [
          order.order_code,
          order.recipient_name || '',
          order.recipient_phone || '',
          `"${order.recipient_address.replace(/"/g, '""')}"`,
          order.status,
          order.shipping_carrier || '',
          order.tracking_number || '',
          formatDate(order.created_at),
          formatDate(order.updated_at),
        ].join(',');
        csvContent += row + "\n";
      });
    } else {
      csvContent = "Request ID,Thai ID,Name,Date of Birth,Phone,Line ID,Address,Subdistrict,District,Province,Postal Code,Status,Tracking Number,Test Result,Wants Callback,Callback Phone,Staff Notes,Created At,Updated At\n";
      filteredHIVRequests.forEach(request => {
        const pii = request.selftest_pii;
        const row = [
          request.id,
          pii?.thai_id || '',
          pii?.full_name || '',
          pii?.date_of_birth || '',
          pii?.phone || '',
          pii?.line_id || '',
          `"${(pii?.address || '').replace(/"/g, '""')}"`,
          pii?.subdistrict || '',
          pii?.district || '',
          pii?.province || '',
          pii?.postal_code || '',
          request.status,
          request.tracking_number || '',
          request.test_result || '',
          request.wants_callback ? 'Yes' : 'No',
          request.callback_phone || '',
          `"${(request.staff_notes || '').replace(/"/g, '""')}"`,
          formatDate(request.created_at),
          formatDate(request.updated_at),
        ].join(',');
        csvContent += row + "\n";
      });
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${dataSource === 'kit_orders' ? 'kit-orders' : 'hiv-requests'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(language === 'th' ? 'ดาวน์โหลด CSV สำเร็จ' : 'CSV downloaded successfully');
  };

  const exportToGoogleSheets = () => {
    let data: string[][] = [];
    
    if (dataSource === "kit_orders") {
      data = [
        ["Order Code", "Recipient Name", "Phone", "Address", "Status", "Carrier", "Tracking Number", "Created At", "Updated At"],
        ...filteredOrders.map(order => [
          order.order_code,
          order.recipient_name || '',
          order.recipient_phone || '',
          order.recipient_address,
          order.status,
          order.shipping_carrier || '',
          order.tracking_number || '',
          formatDate(order.created_at),
          formatDate(order.updated_at),
        ])
      ];
    } else {
      data = [
        ["Request ID", "Thai ID", "Name", "Date of Birth", "Phone", "Line ID", "Address", "Subdistrict", "District", "Province", "Postal Code", "Status", "Tracking Number", "Test Result", "Wants Callback", "Callback Phone", "Staff Notes", "Created At", "Updated At"],
        ...filteredHIVRequests.map(request => {
          const pii = request.selftest_pii;
          return [
            request.id,
            pii?.thai_id || '',
            pii?.full_name || '',
            pii?.date_of_birth || '',
            pii?.phone || '',
            pii?.line_id || '',
            pii?.address || '',
            pii?.subdistrict || '',
            pii?.district || '',
            pii?.province || '',
            pii?.postal_code || '',
            request.status,
            request.tracking_number || '',
            request.test_result || '',
            request.wants_callback ? 'Yes' : 'No',
            request.callback_phone || '',
            request.staff_notes || '',
            formatDate(request.created_at),
            formatDate(request.updated_at),
          ];
        })
      ];
    }

    const tsvContent = data.map(row => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsvContent);
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
    
    toast.success(
      language === 'th' 
        ? 'คัดลอกข้อมูลแล้ว กรุณาวางใน Google Sheets (Ctrl+V)' 
        : 'Data copied! Paste in Google Sheets (Ctrl+V)'
    );
  };

  const openPrintView = () => {
    if (dataSource === 'kit_orders') {
      setSelectedForPrint(filteredOrders);
    } else {
      setSelectedForPrint(filteredHIVRequests);
    }
    setShowPrintDialog(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatAddressForLabel = (item: KitOrder | HIVTestRequest): { name: string; phone: string; address: string } => {
    if ('order_code' in item) {
      return {
        name: item.recipient_name || '',
        phone: item.recipient_phone || '',
        address: item.recipient_address,
      };
    } else {
      const pii = item.selftest_pii;
      const addressParts = [
        pii?.address,
        pii?.subdistrict,
        pii?.district,
        pii?.province,
        pii?.postal_code,
      ].filter(Boolean);
      return {
        name: pii?.full_name || '',
        phone: pii?.phone || '',
        address: addressParts.join(' '),
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {language === 'th' ? 'ส่งออก' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV} className="gap-2">
                <Download className="h-4 w-4" />
                {language === 'th' ? 'ดาวน์โหลด CSV' : 'Download CSV'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToGoogleSheets} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {language === 'th' ? 'ส่งออก Google Sheets' : 'Export to Google Sheets'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openPrintView} className="gap-2">
                <Printer className="h-4 w-4" />
                {language === 'th' ? 'พิมพ์ฉลาก' : 'Print Labels'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'th' ? 'สร้าง' : 'New'}
          </Button>
        </div>
      </div>

      {/* Data Source Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={dataSource === 'kit_orders' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setDataSource('kit_orders'); setActiveTab('all'); }}
          className="gap-2"
        >
          <Package className="h-4 w-4" />
          {language === 'th' ? 'คำสั่งซื้อ Kit' : 'Kit Orders'}
          <Badge variant="secondary" className="ml-1">{orders.length}</Badge>
        </Button>
        <Button
          variant={dataSource === 'hiv_requests' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setDataSource('hiv_requests'); setActiveTab('all'); }}
          className="gap-2"
        >
          <TestTube className="h-4 w-4" />
          {language === 'th' ? 'คำขอชุดตรวจ HIV' : 'HIV Test Requests'}
          <Badge variant="secondary" className="ml-1">{hivRequests.length}</Badge>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === 'th' ? 'ค้นหารหัส, ชื่อ, เบอร์...' : 'Search code, name, phone...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {dataSource === 'kit_orders' ? (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-4 grid grid-cols-4 h-auto">
              <TabsTrigger value="all" className="text-xs py-2">
                {language === 'th' ? 'ทั้งหมด' : 'All'}
              </TabsTrigger>
              <TabsTrigger value="requested" className="text-xs py-2">
                {language === 'th' ? 'รอ' : 'New'}
              </TabsTrigger>
              <TabsTrigger value="shipped" className="text-xs py-2">
                {language === 'th' ? 'ส่งแล้ว' : 'Shipped'}
              </TabsTrigger>
              <TabsTrigger value="delivered_unconfirmed" className="text-xs py-2">
                {language === 'th' ? 'ถึงแล้ว' : 'Delivered'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              {filteredOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {language === 'th' ? 'ไม่มีคำสั่งซื้อ' : 'No orders found'}
                  </p>
                </Card>
              ) : (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {order.order_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(order.order_code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="text-sm text-muted-foreground mb-3">
                      {order.recipient_name && <p>{order.recipient_name}</p>}
                      <p className="truncate">{order.recipient_address}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOrderDetail(order)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {language === 'th' ? 'ดู' : 'View'}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full mb-4 grid grid-cols-4 h-auto">
              <TabsTrigger value="all" className="text-xs py-2">
                {language === 'th' ? 'ทั้งหมด' : 'All'}
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs py-2">
                {language === 'th' ? 'รอ' : 'Pending'}
              </TabsTrigger>
              <TabsTrigger value="shipped" className="text-xs py-2">
                {language === 'th' ? 'ส่งแล้ว' : 'Shipped'}
              </TabsTrigger>
              <TabsTrigger value="delivered" className="text-xs py-2">
                {language === 'th' ? 'ถึงแล้ว' : 'Delivered'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3">
                  {filteredHIVRequests.length === 0 ? (
                    <Card className="p-8 text-center">
                      <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        {language === 'th' ? 'ไม่มีคำขอ' : 'No requests found'}
                      </p>
                    </Card>
                  ) : (
                    filteredHIVRequests.map((request) => (
                      <Card key={request.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">
                              {request.selftest_pii?.full_name || (language === 'th' ? 'ไม่ระบุชื่อ' : 'No name')}
                            </p>
                            {request.selftest_pii?.phone && (
                              <p className="text-sm text-muted-foreground">{request.selftest_pii.phone}</p>
                            )}
                          </div>
                          {editingHIVRequest !== request.id && getHIVStatusBadge(request.status)}
                        </div>

                        {request.selftest_pii?.address && (
                          <p className="text-sm text-muted-foreground mb-2 truncate">
                            {request.selftest_pii.address}
                            {request.selftest_pii.district && `, ${request.selftest_pii.district}`}
                            {request.selftest_pii.province && `, ${request.selftest_pii.province}`}
                          </p>
                        )}

                        {/* Callback consent indicator for positive results */}
                        {request.test_result === 'positive' && request.wants_callback && (
                          <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-2">
                            <PhoneCall className="h-4 w-4 text-amber-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-amber-700">
                                {language === 'th' ? 'ต้องการให้ติดต่อกลับ' : 'Wants callback'}
                              </p>
                              {request.callback_phone && (
                                <p className="text-xs text-amber-600 truncate">
                                  📞 {request.callback_phone}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {editingHIVRequest === request.id ? (
                          <div className="space-y-3 mt-3 pt-3 border-t">
                            <div>
                              <Label className="text-xs">{language === 'th' ? 'สถานะ' : 'Status'}</Label>
                              <Select
                                value={hivEditForm.status}
                                onValueChange={(value) => setHivEditForm({ ...hivEditForm, status: value })}
                              >
                                <SelectTrigger className="mt-1 h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {HIV_STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {language === 'th' ? opt.labelTh : opt.labelEn}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">{language === 'th' ? 'เลขพัสดุ' : 'Tracking Number'}</Label>
                              <Input
                                value={hivEditForm.tracking_number}
                                onChange={(e) => setHivEditForm({ ...hivEditForm, tracking_number: e.target.value })}
                                placeholder={language === 'th' ? 'กรอกเลขพัสดุ' : 'Enter tracking number'}
                                className="mt-1 h-9"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveHIVRequest(request.id)}
                                disabled={savingHIV}
                                className="flex-1"
                              >
                                {savingHIV && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                {language === 'th' ? 'บันทึก' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditingHIVRequest}
                                className="flex-1"
                              >
                                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                            <span>{formatDate(request.created_at)}</span>
                            <div className="flex items-center gap-2">
                              {request.tracking_number && (
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {request.tracking_number}
                                </span>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingHIVRequest(request)}
                                className="h-7 px-2"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                {language === 'th' ? 'แก้ไข' : 'Edit'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'th' ? 'สร้างคำสั่งซื้อใหม่' : 'Create New Order'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === 'th' ? 'ชื่อผู้รับ' : 'Recipient Name'}</Label>
              <Input
                value={newOrder.recipient_name}
                onChange={(e) => setNewOrder({ ...newOrder, recipient_name: e.target.value })}
                placeholder={language === 'th' ? 'ชื่อ (ไม่บังคับ)' : 'Name (optional)'}
              />
            </div>
            <div>
              <Label>{language === 'th' ? 'เบอร์โทร' : 'Phone'}</Label>
              <Input
                value={newOrder.recipient_phone}
                onChange={(e) => setNewOrder({ ...newOrder, recipient_phone: e.target.value })}
                placeholder={language === 'th' ? 'เบอร์โทร (ไม่บังคับ)' : 'Phone (optional)'}
              />
            </div>
            <div>
              <Label>{language === 'th' ? 'ที่อยู่จัดส่ง *' : 'Delivery Address *'}</Label>
              <Textarea
                value={newOrder.recipient_address}
                onChange={(e) => setNewOrder({ ...newOrder, recipient_address: e.target.value })}
                placeholder={language === 'th' ? 'ที่อยู่เต็ม' : 'Full address'}
                rows={3}
              />
            </div>
            <div>
              <Label>{language === 'th' ? 'หมายเหตุภายใน' : 'Internal Notes'}</Label>
              <Textarea
                value={newOrder.internal_notes}
                onChange={(e) => setNewOrder({ ...newOrder, internal_notes: e.target.value })}
                placeholder={language === 'th' ? 'หมายเหตุสำหรับ Admin' : 'Notes for admin only'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={createOrder} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'th' ? 'สร้าง' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {language === 'th' ? 'รายละเอียดคำสั่งซื้อ' : 'Order Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'th' ? 'รหัสติดตาม' : 'Order Code'}
                  </p>
                  <code className="text-lg font-mono font-bold">
                    {selectedOrder.order_code}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyCode(selectedOrder.order_code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label className="text-muted-foreground">
                  {language === 'th' ? 'ข้อมูลผู้รับ' : 'Recipient Info'}
                </Label>
                <div className="mt-1 text-sm">
                  {selectedOrder.recipient_name && <p className="font-medium">{selectedOrder.recipient_name}</p>}
                  {selectedOrder.recipient_phone && <p>{selectedOrder.recipient_phone}</p>}
                  <p className="text-muted-foreground">{selectedOrder.recipient_address}</p>
                </div>
              </div>

              <div>
                <Label>{language === 'th' ? 'สถานะ' : 'Status'}</Label>
                <Select
                  value={updateForm.status}
                  onValueChange={(value) => setUpdateForm({ ...updateForm, status: value as OrderStatus })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {language === 'th' ? opt.labelTh : opt.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-primary" />
                  <Label>{language === 'th' ? 'ข้อมูลขนส่ง' : 'Shipping Info'}</Label>
                </div>
                <div className="space-y-3">
                  <Select
                    value={updateForm.shipping_carrier}
                    onValueChange={(value) => setUpdateForm({ ...updateForm, shipping_carrier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'th' ? 'เลือกขนส่ง' : 'Select carrier'} />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={language === 'th' ? 'หมายเลขพัสดุ' : 'Tracking number'}
                    value={updateForm.tracking_number}
                    onChange={(e) => setUpdateForm({ ...updateForm, tracking_number: e.target.value })}
                  />
                  <Input
                    placeholder={language === 'th' ? 'ลิงก์ติดตาม (ไม่บังคับ)' : 'Tracking URL (optional)'}
                    value={updateForm.tracking_url}
                    onChange={(e) => setUpdateForm({ ...updateForm, tracking_url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>{language === 'th' ? 'หมายเหตุภายใน' : 'Internal Notes'}</Label>
                <Textarea
                  className="mt-1"
                  value={updateForm.internal_notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, internal_notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="border-t pt-4">
                <Label className="mb-3 block">
                  {language === 'th' ? 'ไทม์ไลน์' : 'Timeline'}
                </Label>
                <div className="space-y-2 text-sm">
                  {selectedOrder.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'th' ? 'สร้าง' : 'Created'}</span>
                      <span>{formatDate(selectedOrder.created_at)}</span>
                    </div>
                  )}
                  {selectedOrder.packed_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'th' ? 'จัดเตรียม' : 'Packed'}</span>
                      <span>{formatDate(selectedOrder.packed_at)}</span>
                    </div>
                  )}
                  {selectedOrder.shipped_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'th' ? 'จัดส่ง' : 'Shipped'}</span>
                      <span>{formatDate(selectedOrder.shipped_at)}</span>
                    </div>
                  )}
                  {selectedOrder.delivered_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'th' ? 'ถึงผู้รับ' : 'Delivered'}</span>
                      <span>{formatDate(selectedOrder.delivered_at)}</span>
                    </div>
                  )}
                  {selectedOrder.received_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{language === 'th' ? 'ยืนยันรับ' : 'Confirmed'}</span>
                      <span>{formatDate(selectedOrder.received_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              {language === 'th' ? 'ปิด' : 'Close'}
            </Button>
            <Button onClick={updateOrder} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'th' ? 'บันทึก' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Labels Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              {language === 'th' ? 'พิมพ์ฉลากที่อยู่' : 'Print Shipping Labels'}
            </DialogTitle>
          </DialogHeader>

          <div className="print:hidden mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {language === 'th' 
                ? `${selectedForPrint.length} รายการที่เลือก` 
                : `${selectedForPrint.length} items selected`}
            </p>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              {language === 'th' ? 'พิมพ์' : 'Print'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-0">
            {selectedForPrint.map((item, index) => {
              const { name, phone, address } = formatAddressForLabel(item);
              const orderCode = 'order_code' in item ? item.order_code : item.id.slice(0, 8).toUpperCase();
              const createdAt = 'created_at' in item ? item.created_at : '';
              
              return (
                <div 
                  key={index}
                  className="border-2 border-dashed border-gray-300 p-4 rounded-lg print:border-solid print:border-black print:rounded-none print:break-inside-avoid"
                  style={{ minHeight: '180px' }}
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 print:border-black">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 print:h-5 print:w-5" />
                      <span className="text-xs font-bold uppercase tracking-wider print:text-sm">
                        {language === 'th' ? 'ผู้รับ' : 'RECIPIENT'}
                      </span>
                    </div>
                    <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded print:bg-transparent print:text-sm">
                      {orderCode}
                    </code>
                  </div>

                  <div className="space-y-1.5">
                    {name && (
                      <p className="font-bold text-lg print:text-xl leading-tight">
                        {name}
                      </p>
                    )}
                    {phone && (
                      <p className="text-sm text-muted-foreground print:text-black print:text-base">
                        📞 {phone}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed print:text-base print:leading-normal mt-2">
                      {address}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 print:border-gray-300">
                    <p className="text-xs text-muted-foreground print:text-gray-600">
                      {createdAt && formatDate(createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              {language === 'th' ? 'ปิด' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [role="dialog"] * {
            visibility: visible;
          }
          [role="dialog"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
