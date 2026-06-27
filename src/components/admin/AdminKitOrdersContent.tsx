import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package, Plus, Search, Loader2, Eye, Copy, Truck, Download, FileSpreadsheet, TestTube, Printer, PhoneCall,
  XCircle, AlertTriangle, ShieldAlert, CheckCircle, CheckSquare, Square, Pencil, MapPin, MessageSquare
} from "lucide-react";
import SelftestSmsDialog, { type SmsRecipient } from "./SelftestSmsDialog";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdminKitOrdersContentProps {
  userBranch?: string | null;
  isModerator?: boolean;
}

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
  gender: string | null; // Sourced from selftest_pii.gender
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
  assigned_branch: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  abuse_flag: boolean | null;
  abuse_reason: string | null;
  abuse_score: number | null;
  result_photo_url: string | null;
  delivery_mode: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_location_captured: boolean | null;
  pickup_location_status: string | null;
  pickup_location_timestamp: string | null;
}

const HIV_STATUS_OPTIONS = [
  { value: 'pending', labelTh: 'รอตรวจสอบ', labelEn: 'Pending' },
  { value: 'approved', labelTh: 'อนุมัติแล้ว', labelEn: 'Approved' },
  { value: 'rejected', labelTh: 'ปฏิเสธ', labelEn: 'Rejected' },
  { value: 'shipped', labelTh: 'จัดส่งแล้ว', labelEn: 'Shipped' },
  { value: 'delivered', labelTh: 'ถึงผู้รับแล้ว', labelEn: 'Delivered' },
];

const REJECTION_REASONS = [
  { value: 'out_of_area', labelTh: 'นอกพื้นที่บริการ', labelEn: 'Out of service area' },
  { value: 'insufficient_stock', labelTh: 'ชุดตรวจหมด', labelEn: 'Insufficient stock' },
  { value: 'invalid_address', labelTh: 'ที่อยู่ไม่ถูกต้อง', labelEn: 'Invalid address' },
  { value: 'cannot_contact', labelTh: 'ติดต่อไม่ได้', labelEn: 'Cannot contact' },
  { value: 'duplicate', labelTh: 'ซ้ำกับคำขอก่อนหน้า', labelEn: 'Duplicate request' },
  { value: 'other', labelTh: 'อื่นๆ', labelEn: 'Other' },
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

export default function AdminKitOrdersContent({ userBranch, isModerator = false }: AdminKitOrdersContentProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<KitOrder[]>([]);
  const [hivRequests, setHivRequests] = useState<HIVTestRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  // Moderators default to HIV requests view and their branch filter
  const [dataSource, setDataSource] = useState<"kit_orders" | "hiv_requests" | "onsite_pickup">(isModerator ? "hiv_requests" : "kit_orders");
  const [branchFilter, setBranchFilter] = useState<string>(userBranch || "all");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reject dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<HIVTestRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionReasonCustom, setRejectionReasonCustom] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchEditDialog, setShowBatchEditDialog] = useState(false);
  const [batchEditField, setBatchEditField] = useState<string>('status');
  const [batchEditValue, setBatchEditValue] = useState('');
  const [batchEditTracking, setBatchEditTracking] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);

  // SMS sending state — shared between kit_orders and hiv_requests sources.
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<SmsRecipient[]>([]);
  const [smsTemplateKey, setSmsTemplateKey] = useState<string | undefined>(undefined);
  const [smsSource, setSmsSource] = useState<"kit_orders" | "selftest">("kit_orders");

  // On-site pickup filters
  const [pickupDateFrom, setPickupDateFrom] = useState<string>("");
  const [pickupDateTo, setPickupDateTo] = useState<string>("");

  const orderToSmsRecipient = (o: KitOrder): SmsRecipient => ({
    id: o.id,
    name: (o.recipient_name || '').trim() || 'คุณ',
    phone: (o.recipient_phone || '').trim(),
    code: o.order_code,
  });

  const hivRequestToSmsRecipient = (r: HIVTestRequest): SmsRecipient => ({
    id: r.id,
    name: (r.selftest_pii?.full_name || '').trim() || 'คุณ',
    phone: (r.selftest_pii?.phone || r.callback_phone || '').trim(),
    code: (r.tracking_number || '').trim(),
  });

  const openSmsForOrder = (o: KitOrder, templateKey?: string) => {
    setSmsSource("kit_orders");
    setSmsRecipients([orderToSmsRecipient(o)]);
    setSmsTemplateKey(templateKey);
    setSmsOpen(true);
  };

  const openBulkSmsForStatus = (statuses: OrderStatus[], templateKey: string) => {
    const targets = orders
      .filter((o) => statuses.includes(o.status) && (o.recipient_phone || '').replace(/\D/g, '').length >= 9)
      .map(orderToSmsRecipient);
    if (targets.length === 0) {
      toast.info(language === 'th' ? 'ไม่พบผู้รับที่มีเบอร์โทร' : 'No recipients with phone numbers');
      return;
    }
    setSmsSource("kit_orders");
    setSmsRecipients(targets);
    setSmsTemplateKey(templateKey);
    setSmsOpen(true);
  };

  const openSmsForHivRequest = (r: HIVTestRequest, templateKey?: string) => {
    setSmsSource("selftest");
    setSmsRecipients([hivRequestToSmsRecipient(r)]);
    setSmsTemplateKey(templateKey);
    setSmsOpen(true);
  };

  const openBulkSmsForHivStatus = (statuses: string[], templateKey: string) => {
    const targets = hivRequests
      .filter((r) => statuses.includes(r.status) && ((r.selftest_pii?.phone || r.callback_phone || '').replace(/\D/g, '').length >= 9))
      .map(hivRequestToSmsRecipient);
    if (targets.length === 0) {
      toast.info(language === 'th' ? 'ไม่พบผู้รับที่มีเบอร์โทร' : 'No recipients with phone numbers');
      return;
    }
    setSmsSource("selftest");
    setSmsRecipients(targets);
    setSmsTemplateKey(templateKey);
    setSmsOpen(true);
  };

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
      const allData: HIVTestRequest[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
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
            assigned_branch,
            rejected_at,
            rejected_by,
            rejection_reason,
            abuse_flag,
            abuse_reason,
            abuse_score,
            result_photo_url,
            delivery_mode,
            pickup_latitude,
            pickup_longitude,
            pickup_location_captured,
            pickup_location_status,
            pickup_location_timestamp,
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
              line_id,
              gender
            )
          `)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      setHivRequests(allData);
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

  // Reject HIV request handler
  const openRejectDialog = (request: HIVTestRequest) => {
    setRejectingRequest(request);
    setRejectionReason('');
    setRejectionReasonCustom('');
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (!rejectingRequest || !user) return;
    setRejecting(true);
    try {
      const reason = rejectionReason === 'other' ? rejectionReasonCustom : 
        REJECTION_REASONS.find(r => r.value === rejectionReason)?.[language === 'th' ? 'labelTh' : 'labelEn'] || rejectionReason;

      const { error } = await supabase
        .from('hiv_selftest_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rejectingRequest.id);

      if (error) throw error;

      toast.success(language === 'th' ? 'ปฏิเสธคำขอแล้ว' : 'Request rejected');
      setShowRejectDialog(false);
      setRejectingRequest(null);
      fetchHIVRequests();
    } catch (error: any) {
      toast.error(error.message || 'Error rejecting request');
    } finally {
      setRejecting(false);
    }
  };

  // Clear abuse flag
  const clearAbuseFlag = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('hiv_selftest_requests')
        .update({ abuse_flag: false, updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;

      // Log the clearing
      await supabase.from('selftest_abuse_logs').insert({
        request_id: requestId,
        action: 'cleared',
        reason: 'Manually cleared by admin',
        actor: user?.id || 'unknown',
      });

      toast.success(language === 'th' ? 'ล้างแฟล็กแล้ว' : 'Flag cleared');
      fetchHIVRequests();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const copyField = useCallback((value: string, fieldLabel: string) => {
    navigator.clipboard.writeText(value);
    toast.success(fieldLabel);
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied!');
  };

  // Batch selection helpers defined after filteredHIVRequests below

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Reset selection on filter/tab/search change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, searchQuery, branchFilter, dataSource, currentPage]);

  // Batch edit handler
  const executeBatchEdit = async () => {
    if (selectedIds.size === 0) return;
    setSavingBatch(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const ids = Array.from(selectedIds);
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

      if (batchEditField === 'status' && batchEditValue) {
        updateData.status = batchEditValue;
      }
      if (batchEditField === 'tracking' && batchEditTracking) {
        updateData.tracking_number = batchEditTracking;
      }
      if (batchEditField === 'status_and_tracking') {
        if (batchEditValue) updateData.status = batchEditValue;
        if (batchEditTracking) updateData.tracking_number = batchEditTracking;
      }

      if (Object.keys(updateData).length <= 1) {
        toast.error(language === 'th' ? 'กรุณาเลือกค่าที่ต้องการแก้ไข' : 'Please select values to update');
        setSavingBatch(false);
        return;
      }

      const { error } = await supabase
        .from('hiv_selftest_requests')
        .update(updateData)
        .in('id', ids);

      if (error) throw error;
      successCount = ids.length;

      toast.success(
        language === 'th'
          ? `อัปเดตสำเร็จ ${successCount} รายการ`
          : `Updated ${successCount} records successfully`
      );
      setShowBatchEditDialog(false);
      setSelectedIds(new Set());
      setBatchEditValue('');
      setBatchEditTracking('');
      fetchHIVRequests();
    } catch (error: any) {
      console.error('Batch edit error:', error);
      toast.error(
        language === 'th'
          ? `เกิดข้อผิดพลาด: ${error.message}`
          : `Error: ${error.message}`
      );
    } finally {
      setSavingBatch(false);
    }
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
      rejected: { color: 'bg-destructive', labelTh: 'ปฏิเสธ', labelEn: 'Rejected' },
      shipped: { color: 'bg-indigo-500', labelTh: 'จัดส่งแล้ว', labelEn: 'Shipped' },
      delivered: { color: 'bg-green-500', labelTh: 'ถึงผู้รับแล้ว', labelEn: 'Delivered' },
    };
    const config = statusConfig[status] || { color: 'bg-muted', labelTh: status, labelEn: status };
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
    
    const matchesTab = activeTab === 'all' 
      || (activeTab === 'flagged' && request.abuse_flag === true)
      || (activeTab !== 'flagged' && request.status === activeTab);
    
    const matchesBranch = branchFilter === 'all' || request.assigned_branch === branchFilter;
    
    return matchesSearch && matchesTab && matchesBranch;
  });

  const paginatedHIVRequests = filteredHIVRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectAllVisible = useCallback(() => {
    const paginated = filteredHIVRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    setSelectedIds(new Set(paginated.map(r => r.id)));
  }, [filteredHIVRequests, currentPage, pageSize]);


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
  const getSignedImageUrls = async (requests: HIVTestRequest[]): Promise<Record<string, string>> => {
    const urlMap: Record<string, string> = {};
    const photoPaths = requests
      .filter(r => r.result_photo_url)
      .map(r => r.result_photo_url as string);
    
    if (photoPaths.length === 0) return urlMap;

    // Batch sign URLs (7 days expiry)
    const { data, error } = await supabase.storage
      .from('selftest-results')
      .createSignedUrls(photoPaths, 60 * 60 * 24 * 7);

    if (!error && data) {
      data.forEach((item) => {
        if (item.signedUrl && item.path) {
          urlMap[item.path] = item.signedUrl;
        }
      });
    }
    return urlMap;
  };

  const exportToCSV = async () => {
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
      const signedUrls = await getSignedImageUrls(filteredHIVRequests);
      // CSV headers include gender field sourced from selftest_pii.gender
      csvContent = "Request ID,Branch,Thai ID,Name,Gender,Date of Birth,Phone,Line ID,Address,Subdistrict,District,Province,Postal Code,Status,Tracking Number,Test Result,Result Image URL,Result Image Filename,Wants Callback,Callback Phone,Staff Notes,Created At,Updated At\n";
      filteredHIVRequests.forEach(request => {
        const pii = request.selftest_pii;
        const resultImageUrl = request.result_photo_url
          ? (signedUrls[request.result_photo_url] || '')
          : '';
        const resultImageFilename = request.result_photo_url || '';
        const row = [
          request.id,
          request.assigned_branch || 'silom',
          pii?.thai_id || '',
          pii?.full_name || '',
          pii?.gender || '',
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
          resultImageUrl,
          resultImageFilename,
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

  const exportToGoogleSheets = async () => {
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
      const signedUrls = await getSignedImageUrls(filteredHIVRequests);
      data = [
        ["Request ID", "Branch", "Thai ID", "Name", "Date of Birth", "Phone", "Line ID", "Address", "Subdistrict", "District", "Province", "Postal Code", "Status", "Tracking Number", "Test Result", "Result Image URL", "Result Image Filename", "Wants Callback", "Callback Phone", "Staff Notes", "Created At", "Updated At"],
        ...filteredHIVRequests.map(request => {
          const pii = request.selftest_pii;
          const resultImageUrl = request.result_photo_url
            ? (signedUrls[request.result_photo_url] || '')
            : '';
          return [
            request.id,
            request.assigned_branch || 'silom',
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
            resultImageUrl,
            request.result_photo_url || '',
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
      <div className="flex gap-2 mb-4 flex-wrap">
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
        <Button
          variant={dataSource === 'onsite_pickup' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setDataSource('onsite_pickup'); setActiveTab('all'); setCurrentPage(1); }}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          {language === 'th' ? 'รับที่หน้างาน' : 'On-site Pickup'}
          <Badge variant="secondary" className="ml-1">{hivRequests.filter(r => r.delivery_mode === 'pickup').length}</Badge>
        </Button>
      </div>

      {/* Branch Filter (only for HIV requests) */}
      {dataSource === 'hiv_requests' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={branchFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setBranchFilter('all'); setCurrentPage(1); }}
          >
            {language === 'th' ? 'ทุกสาขา' : 'All Branches'}
            <Badge variant="secondary" className="ml-1">{hivRequests.length}</Badge>
          </Button>
          <Button
            variant={branchFilter === 'silom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setBranchFilter('silom'); setCurrentPage(1); }}
          >
            🏙️ {language === 'th' ? 'สีลม' : 'Silom'}
            <Badge variant="secondary" className="ml-1">{hivRequests.filter(r => r.assigned_branch === 'silom').length}</Badge>
          </Button>
          <Button
            variant={branchFilter === 'pattaya' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setBranchFilter('pattaya'); setCurrentPage(1); }}
          >
            🏖️ {language === 'th' ? 'พัทยา' : 'Pattaya'}
            <Badge variant="secondary" className="ml-1">{hivRequests.filter(r => r.assigned_branch === 'pattaya').length}</Badge>
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === 'th' ? 'ค้นหารหัส, ชื่อ, เบอร์...' : 'Search code, name, phone...'}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
              {/* SMS bulk toolbar */}
              {(() => {
                const shippedCount = orders.filter((o) => o.status === 'shipped' && (o.recipient_phone || '').replace(/\D/g, '').length >= 9).length;
                const deliveredCount = orders.filter((o) => (o.status === 'delivered_unconfirmed' || o.status === 'out_for_delivery') && (o.recipient_phone || '').replace(/\D/g, '').length >= 9).length;
                if (shippedCount === 0 && deliveredCount === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {language === 'th' ? 'ส่ง SMS ติดตามผู้รับชุดตรวจ' : 'Send SMS follow-ups to kit recipients'}
                    </span>
                    {shippedCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => openBulkSmsForStatus(['shipped'], 'kit_shipped_check_arrival')}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {language === 'th'
                          ? `แจ้งเช็คพัสดุ (${shippedCount} ส่งแล้ว)`
                          : `Confirm arrival (${shippedCount} shipped)`}
                      </Button>
                    )}
                    {deliveredCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => openBulkSmsForStatus(['delivered_unconfirmed', 'out_for_delivery'], 'kit_delivered_remind_test')}
                      >
                        <Package className="h-3.5 w-3.5" />
                        {language === 'th'
                          ? `เตือนตรวจ + รายงานผล (${deliveredCount} ถึงแล้ว)`
                          : `Test reminder (${deliveredCount} delivered)`}
                      </Button>
                    )}
                  </div>
                );
              })()}

              {filteredOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {language === 'th' ? 'ไม่มีคำสั่งซื้อ' : 'No orders found'}
                  </p>
                </Card>
              ) : (
                filteredOrders.map((order) => {
                  const phoneOk = (order.recipient_phone || '').replace(/\D/g, '').length >= 9;
                  const smsTemplate =
                    order.status === 'shipped'
                      ? 'kit_shipped_check_arrival'
                      : order.status === 'delivered_unconfirmed' || order.status === 'out_for_delivery'
                      ? 'kit_delivered_remind_test'
                      : undefined;
                  return (
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

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {phoneOk && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSmsForOrder(order, smsTemplate)}
                            className="gap-1.5"
                            title={language === 'th' ? 'ส่ง SMS' : 'Send SMS'}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              {smsTemplate === 'kit_shipped_check_arrival'
                                ? (language === 'th' ? 'แจ้งเช็คพัสดุ' : 'Arrival SMS')
                                : smsTemplate === 'kit_delivered_remind_test'
                                ? (language === 'th' ? 'เตือนตรวจ' : 'Test reminder')
                                : 'SMS'}
                            </span>
                          </Button>
                        )}
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
                    </div>
                  </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : dataSource === 'hiv_requests' ? (
        <>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }} className="w-full">
            <TabsList className="w-full mb-4 grid grid-cols-6 h-auto">
              <TabsTrigger value="all" className="text-xs py-2">
                {language === 'th' ? 'ทั้งหมด' : 'All'}
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs py-2">
                {language === 'th' ? 'รอ' : 'Pending'}
              </TabsTrigger>
              <TabsTrigger value="flagged" className="text-xs py-2 text-yellow-600">
                ⚠️ {language === 'th' ? 'ตรวจสอบ' : 'Flagged'}
                {hivRequests.filter(r => r.abuse_flag).length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{hivRequests.filter(r => r.abuse_flag).length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs py-2 text-destructive">
                {language === 'th' ? 'ปฏิเสธ' : 'Rejected'}
              </TabsTrigger>
              <TabsTrigger value="shipped" className="text-xs py-2">
                {language === 'th' ? 'ส่งแล้ว' : 'Shipped'}
              </TabsTrigger>
              <TabsTrigger value="delivered" className="text-xs py-2">
                {language === 'th' ? 'ถึงแล้ว' : 'Delivered'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {/* SMS bulk toolbar — shipped → arrival check, delivered → test reminder */}
              {(() => {
                const hivShippedCount = hivRequests.filter((r) => r.status === 'shipped' && ((r.selftest_pii?.phone || r.callback_phone || '').replace(/\D/g, '').length >= 9)).length;
                const hivDeliveredCount = hivRequests.filter((r) => r.status === 'delivered' && ((r.selftest_pii?.phone || r.callback_phone || '').replace(/\D/g, '').length >= 9)).length;
                if (hivShippedCount === 0 && hivDeliveredCount === 0) return null;
                return (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {language === 'th' ? 'ส่ง SMS ติดตามผู้รับชุดตรวจ' : 'Send SMS follow-ups to recipients'}
                    </span>
                    {hivShippedCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => openBulkSmsForHivStatus(['shipped'], 'kit_shipped_check_arrival')}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        {language === 'th'
                          ? `แจ้งเช็คพัสดุ (${hivShippedCount} ส่งแล้ว)`
                          : `Confirm arrival (${hivShippedCount} shipped)`}
                      </Button>
                    )}
                    {hivDeliveredCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => openBulkSmsForHivStatus(['delivered'], 'kit_delivered_remind_test')}
                      >
                        <Package className="h-3.5 w-3.5" />
                        {language === 'th'
                          ? `เตือนตรวจ + รายงานผล (${hivDeliveredCount} ถึงแล้ว)`
                          : `Test reminder (${hivDeliveredCount} delivered)`}
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* Per-page selector & count */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {language === 'th' ? `ทั้งหมด ${filteredHIVRequests.length} รายการ` : `${filteredHIVRequests.length} total`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{language === 'th' ? 'แสดง' : 'Show'}</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 50, 100, 150].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Batch Action Bar */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg mb-3">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {language === 'th' ? `เลือกแล้ว ${selectedIds.size} รายการ` : `${selectedIds.size} selected`}
                  </span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={selectAllVisible} className="h-7 text-xs">
                    {language === 'th' ? 'เลือกทั้งหมด' : 'Select All'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAll} className="h-7 text-xs">
                    {language === 'th' ? 'ยกเลิกทั้งหมด' : 'Deselect All'}
                  </Button>
                  <Button size="sm" onClick={() => { setBatchEditField('status_and_tracking'); setBatchEditValue(''); setBatchEditTracking(''); setShowBatchEditDialog(true); }} className="h-7 text-xs gap-1">
                    <Pencil className="h-3 w-3" />
                    {language === 'th' ? 'แก้ไขหลายรายการ' : 'Batch Edit'}
                  </Button>
                </div>
              )}

              {/* Select All / Deselect All when nothing selected */}
              {selectedIds.size === 0 && filteredHIVRequests.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Button size="sm" variant="ghost" onClick={selectAllVisible} className="h-7 text-xs gap-1 text-muted-foreground">
                    <Square className="h-3 w-3" />
                    {language === 'th' ? 'เลือกทั้งหมด' : 'Select All'}
                  </Button>
                </div>
              )}

              <ScrollArea className="h-[55vh]">
                <div className="space-y-3">
                  {filteredHIVRequests.length === 0 ? (
                    <Card className="p-8 text-center">
                      <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        {language === 'th' ? 'ไม่มีคำขอ' : 'No requests found'}
                      </p>
                    </Card>
                  ) : (
                    paginatedHIVRequests.map((request) => (
                      <Card key={request.id} className={`p-4 ${request.status === 'rejected' ? 'border-destructive/50 bg-destructive/5' : ''} ${request.abuse_flag ? 'border-yellow-500/50' : ''} ${selectedIds.has(request.id) ? 'ring-2 ring-primary/50' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={selectedIds.has(request.id)}
                              onCheckedChange={() => toggleSelect(request.id)}
                              className="mt-1"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {request.selftest_pii?.full_name || (language === 'th' ? 'ไม่ระบุชื่อ' : 'No name')}
                                </p>
                                {request.selftest_pii?.full_name && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => copyField(request.selftest_pii?.full_name || '', language === 'th' ? 'คัดลอกชื่อแล้ว' : 'Name copied')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                )}
                                {request.abuse_flag && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600 gap-1">
                                          <AlertTriangle className="h-3 w-3" />
                                          {language === 'th' ? 'ตรวจสอบ' : 'Flagged'}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">{request.abuse_reason || 'Potential duplicate/frequency issue'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              {request.selftest_pii?.phone && (
                                <p className="text-sm text-muted-foreground">{request.selftest_pii.phone}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {request.assigned_branch && (
                              <Badge variant="outline" className="text-xs">
                                {request.assigned_branch === 'silom' ? '🏙️' : '🏖️'} {request.assigned_branch === 'silom' 
                                  ? (language === 'th' ? 'สีลม' : 'Silom') 
                                  : (language === 'th' ? 'พัทยา' : 'Pattaya')}
                              </Badge>
                            )}
                            {editingHIVRequest !== request.id && getHIVStatusBadge(request.status)}
                          </div>
                        </div>

                        {/* Rejection reason display */}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 mb-2 flex items-center gap-1 ml-6">
                            <XCircle className="h-3 w-3" />
                            {request.rejection_reason}
                          </div>
                        )}

                        {request.selftest_pii?.address && (
                          <div className="flex items-start gap-1 mb-2 ml-6">
                            <p className="text-xs text-muted-foreground flex-1">
                              {request.selftest_pii.address}
                              {request.selftest_pii.subdistrict && `, ${request.selftest_pii.subdistrict}`}
                              {request.selftest_pii.district && `, ${request.selftest_pii.district}`}
                              {request.selftest_pii.province && `, ${request.selftest_pii.province}`}
                              {request.selftest_pii.postal_code && ` ${request.selftest_pii.postal_code}`}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                const addr = [
                                  request.selftest_pii?.address,
                                  request.selftest_pii?.subdistrict,
                                  request.selftest_pii?.district,
                                  request.selftest_pii?.province,
                                  request.selftest_pii?.postal_code,
                                ].filter(Boolean).join(' ');
                                copyField(addr, language === 'th' ? 'คัดลอกที่อยู่แล้ว' : 'Address copied');
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {request.selftest_pii?.thai_id && (
                          <div className="flex items-center gap-2 mb-2 ml-6">
                            <Badge variant="outline" className="font-mono text-xs">
                              {request.selftest_pii.thai_id}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => copyField(request.selftest_pii?.thai_id || '', language === 'th' ? 'คัดลอกเลขบัตรแล้ว' : 'ID copied')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {editingHIVRequest === request.id ? (
                          <div className="space-y-3 mt-3 p-3 border rounded-lg">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">{language === 'th' ? 'สถานะ' : 'Status'}</Label>
                                <Select
                                  value={hivEditForm.status}
                                  onValueChange={(v) => setHivEditForm(prev => ({ ...prev, status: v }))}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HIV_STATUS_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {language === 'th' ? opt.labelTh : opt.labelEn}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">{language === 'th' ? 'เลขพัสดุ' : 'Tracking #'}</Label>
                                <Input
                                  className="h-8"
                                  value={hivEditForm.tracking_number}
                                  onChange={(e) => setHivEditForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveHIVRequest(request.id)}
                                disabled={savingHIV}
                                className="flex-1"
                              >
                                {savingHIV ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'th' ? 'บันทึก' : 'Save')}
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
                              {request.abuse_flag && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => clearAbuseFlag(request.id)}
                                  className="h-7 px-2 text-yellow-600"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {language === 'th' ? 'ล้าง' : 'Clear'}
                                </Button>
                              )}
                              {(() => {
                                const phoneOk = ((request.selftest_pii?.phone || request.callback_phone || '').replace(/\D/g, '').length >= 9);
                                const hivSmsTemplate = request.status === 'shipped'
                                  ? 'kit_shipped_check_arrival'
                                  : request.status === 'delivered'
                                  ? 'kit_delivered_remind_test'
                                  : undefined;
                                if (!phoneOk || !hivSmsTemplate) return null;
                                return (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openSmsForHivRequest(request, hivSmsTemplate)}
                                    className="h-7 px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                    title={language === 'th' ? 'ส่ง SMS' : 'Send SMS'}
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    {hivSmsTemplate === 'kit_shipped_check_arrival'
                                      ? (language === 'th' ? 'แจ้งเช็คพัสดุ' : 'Arrival SMS')
                                      : (language === 'th' ? 'เตือนตรวจ' : 'Test SMS')}
                                  </Button>
                                );
                              })()}
                              {request.status !== 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openRejectDialog(request)}
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {language === 'th' ? 'ปฏิเสธ' : 'Reject'}
                                </Button>
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

              {/* Pagination controls */}
              {filteredHIVRequests.length > pageSize && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {language === 'th' 
                      ? `หน้า ${currentPage} / ${Math.ceil(filteredHIVRequests.length / pageSize)}`
                      : `Page ${currentPage} of ${Math.ceil(filteredHIVRequests.length / pageSize)}`}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      {language === 'th' ? 'ก่อนหน้า' : 'Prev'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= Math.ceil(filteredHIVRequests.length / pageSize)}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      {language === 'th' ? 'ถัดไป' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        /* On-site Pickup View */
        <>
          <div className="space-y-3">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {hivRequests.filter(r => r.delivery_mode === 'pickup').length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'รับที่หน้างานทั้งหมด' : 'Total Pickups'}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {hivRequests.filter(r => r.delivery_mode === 'pickup' && r.pickup_location_captured).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'มีพิกัด' : 'With Location'}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {hivRequests.filter(r => r.delivery_mode === 'pickup' && !r.pickup_location_captured).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th' ? 'ไม่มีพิกัด' : 'No Location'}
                </p>
              </Card>
            </div>

            {/* Date range + SMS bulk actions */}
            {(() => {
              const fromTs = pickupDateFrom ? new Date(pickupDateFrom + 'T00:00:00').getTime() : null;
              const toTs = pickupDateTo ? new Date(pickupDateTo + 'T23:59:59').getTime() : null;
              const inRange = (iso: string) => {
                const t = new Date(iso).getTime();
                if (fromTs !== null && t < fromTs) return false;
                if (toTs !== null && t > toTs) return false;
                return true;
              };
              const filteredPickups = hivRequests
                .filter(r => r.delivery_mode === 'pickup')
                .filter(r => inRange(r.created_at))
                .filter(r => {
                  if (!searchQuery) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    r.id.toLowerCase().includes(q) ||
                    r.selftest_pii?.full_name?.toLowerCase().includes(q) ||
                    r.selftest_pii?.phone?.toLowerCase().includes(q) ||
                    r.status.toLowerCase().includes(q)
                  );
                });
              const smsTargets = filteredPickups
                .filter(r => ((r.selftest_pii?.phone || r.callback_phone || '').replace(/\D/g, '').length >= 9))
                .map(hivRequestToSmsRecipient);
              const openBulkPickupSms = (templateKey: string) => {
                if (smsTargets.length === 0) {
                  toast.info(language === 'th' ? 'ไม่พบผู้รับที่มีเบอร์โทร' : 'No recipients with phone numbers');
                  return;
                }
                setSmsSource('selftest');
                setSmsRecipients(smsTargets);
                setSmsTemplateKey(templateKey);
                setSmsOpen(true);
              };
              return (
                <>
                  <Card className="p-3 mb-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[140px]">
                        <Label className="text-xs">{language === 'th' ? 'ตั้งแต่วันที่' : 'From'}</Label>
                        <Input type="date" value={pickupDateFrom} onChange={(e) => setPickupDateFrom(e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-[140px]">
                        <Label className="text-xs">{language === 'th' ? 'ถึงวันที่' : 'To'}</Label>
                        <Input type="date" value={pickupDateTo} onChange={(e) => setPickupDateTo(e.target.value)} />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setPickupDateFrom(''); setPickupDateTo(''); }}
                      >
                        {language === 'th' ? 'ล้าง' : 'Clear'}
                      </Button>
                      <div className="flex-1 min-w-[180px] text-xs text-muted-foreground">
                        {language === 'th' ? 'พบ' : 'Found'} <strong>{filteredPickups.length}</strong> {language === 'th' ? 'รายการ' : 'records'} · {language === 'th' ? 'มีเบอร์โทร' : 'with phone'}: <strong>{smsTargets.length}</strong>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openBulkPickupSms('remind_report')}
                        disabled={smsTargets.length === 0}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {language === 'th' ? `ส่ง SMS ตามผลตรวจ (${smsTargets.length})` : `Send SMS Follow-up (${smsTargets.length})`}
                      </Button>
                    </div>
                  </Card>

                  {/* Pickup Records List */}
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-3">
                      {filteredPickups.length === 0 ? (
                  .filter(r => r.delivery_mode === 'pickup')
                  .filter(r => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      r.id.toLowerCase().includes(q) ||
                      r.selftest_pii?.full_name?.toLowerCase().includes(q) ||
                      r.selftest_pii?.phone?.toLowerCase().includes(q) ||
                      r.status.toLowerCase().includes(q)
                    );
                  })
                  .length === 0 ? (
                  <Card className="p-8 text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {language === 'th' ? 'ยังไม่มีข้อมูลรับที่หน้างาน' : 'No on-site pickup data yet'}
                    </p>
                  </Card>
                ) : (
                  hivRequests
                    .filter(r => r.delivery_mode === 'pickup')
                    .filter(r => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        r.id.toLowerCase().includes(q) ||
                        r.selftest_pii?.full_name?.toLowerCase().includes(q) ||
                        r.selftest_pii?.phone?.toLowerCase().includes(q) ||
                        r.status.toLowerCase().includes(q)
                      );
                    })
                    .map((request) => (
                      <Card key={request.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {request.selftest_pii?.full_name || (language === 'th' ? 'ไม่ระบุชื่อ' : 'No name')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'rejected' ? 'destructive' : 'default'}>
                              {request.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Location Info */}
                        <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                          request.pickup_location_captured
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {request.pickup_location_captured ? (
                            <div>
                              <span className="font-medium">
                                {language === 'th' ? 'พิกัดบันทึกแล้ว' : 'Location captured'}
                              </span>
                              <span className="ml-2">
                                {request.pickup_latitude?.toFixed(5)}, {request.pickup_longitude?.toFixed(5)}
                              </span>
                              {request.pickup_location_timestamp && (
                                <span className="ml-2 opacity-70">
                                  @ {new Date(request.pickup_location_timestamp).toLocaleTimeString(language === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span>
                              {language === 'th' ? 'ไม่มีข้อมูลพิกัด' : 'No location data'}
                              {request.pickup_location_status && request.pickup_location_status !== 'captured' && (
                                <span className="ml-1">({request.pickup_location_status})</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Contact Info */}
                        {request.selftest_pii?.phone && (
                          <p className="text-xs text-muted-foreground">
                            📞 {request.selftest_pii.phone}
                          </p>
                        )}
                        {request.assigned_branch && (
                          <p className="text-xs text-muted-foreground">
                            🏢 {request.assigned_branch === 'silom' ? 'Silom' : request.assigned_branch === 'pattaya' ? 'Pattaya' : request.assigned_branch}
                          </p>
                        )}
                      </Card>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
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
              <Label className="whitespace-pre-line">{language === 'th' ? 'ที่อยู่จัดส่ง *\n(โครงการขอสงวนสิทธิ์ในการไม่จัดส่งหากที่อยู่ไม่ครบ)' : 'Delivery Address *'}</Label>
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

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {language === 'th' ? 'ปฏิเสธคำขอนี้?' : 'Reject this request?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rejectingRequest?.selftest_pii?.full_name && (
                <span className="font-medium">{rejectingRequest.selftest_pii.full_name}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">{language === 'th' ? 'เหตุผล' : 'Reason'}</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={language === 'th' ? 'เลือกเหตุผล (ไม่บังคับ)' : 'Select reason (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {language === 'th' ? r.labelTh : r.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rejectionReason === 'other' && (
              <div>
                <Label className="text-sm">{language === 'th' ? 'ระบุเหตุผล' : 'Specify reason'}</Label>
                <Input
                  className="mt-1"
                  value={rejectionReasonCustom}
                  onChange={(e) => setRejectionReasonCustom(e.target.value)}
                  placeholder={language === 'th' ? 'ระบุเหตุผลเพิ่มเติม' : 'Enter reason'}
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              disabled={rejecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'th' ? 'ยืนยันปฏิเสธ' : 'Confirm Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Edit Dialog */}
      <Dialog open={showBatchEditDialog} onOpenChange={setShowBatchEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              {language === 'th' ? 'แก้ไขหลายรายการ' : 'Batch Edit'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              {language === 'th'
                ? `จะแก้ไข ${selectedIds.size} รายการที่เลือก`
                : `Will update ${selectedIds.size} selected records`}
            </div>

            <div>
              <Label>{language === 'th' ? 'เปลี่ยนสถานะ' : 'Change Status'}</Label>
              <Select value={batchEditValue} onValueChange={setBatchEditValue}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={language === 'th' ? 'เลือกสถานะ (ไม่บังคับ)' : 'Select status (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  {HIV_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {language === 'th' ? opt.labelTh : opt.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'th' ? 'เลขพัสดุ' : 'Tracking Number'}</Label>
              <Input
                className="mt-1"
                value={batchEditTracking}
                onChange={(e) => setBatchEditTracking(e.target.value)}
                placeholder={language === 'th' ? 'ใส่เลขพัสดุ (ไม่บังคับ)' : 'Tracking # (optional)'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchEditDialog(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={executeBatchEdit} disabled={savingBatch || (!batchEditValue && !batchEditTracking)}>
              {savingBatch && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'th' ? `ยืนยันแก้ไข ${selectedIds.size} รายการ` : `Update ${selectedIds.size} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SelftestSmsDialog
        open={smsOpen}
        onOpenChange={setSmsOpen}
        recipients={smsRecipients}
        initialTemplateKey={smsTemplateKey}
        source={smsSource}
      />
    </div>
  );
}
