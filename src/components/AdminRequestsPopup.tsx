import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  Save, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  User,
  MapPin,
  Phone
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SelftestPii {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
}

interface HIVTestRequest {
  id: string;
  user_id: string;
  pii_id: string | null;
  status: string;
  tracking_number: string | null;
  created_at: string;
  selftest_pii: SelftestPii | null;
}

interface AdminRequestsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: { th: 'รอตรวจสอบ', en: 'Pending' }, icon: Clock },
  { value: 'approved', label: { th: 'อนุมัติแล้ว', en: 'Approved' }, icon: CheckCircle },
  { value: 'shipped', label: { th: 'จัดส่งแล้ว', en: 'Shipped' }, icon: Truck },
  { value: 'delivered', label: { th: 'ถึงผู้รับแล้ว', en: 'Delivered' }, icon: Package },
];

export function AdminRequestsPopup({ open, onOpenChange }: AdminRequestsPopupProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<HIVTestRequest[]>([]);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({});
  const [trackingUpdates, setTrackingUpdates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  const fetchRequests = async () => {
    setLoading(true);
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
          selftest_pii (
            id,
            full_name,
            phone,
            address,
            district,
            province,
            postal_code
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      
      // Initialize status and tracking for each request
      const statusMap: Record<string, string> = {};
      const trackingMap: Record<string, string> = {};
      (data || []).forEach(req => {
        statusMap[req.id] = req.status;
        trackingMap[req.id] = req.tracking_number || '';
      });
      setStatusUpdates(statusMap);
      setTrackingUpdates(trackingMap);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error loading requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (requestId: string) => {
    setSaving(requestId);
    try {
      const newStatus = statusUpdates[requestId];
      const newTracking = trackingUpdates[requestId];

      const updateData: { status: string; tracking_number?: string } = {
        status: newStatus,
      };
      
      if (newTracking) {
        updateData.tracking_number = newTracking;
      }

      const { error } = await supabase
        .from('hiv_selftest_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success(language === 'th' ? 'บันทึกสำเร็จ' : 'Saved successfully');
      setEditingRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error saving');
    } finally {
      setSaving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: language === 'th' ? 'รอตรวจสอบ' : 'Pending', variant: 'secondary' },
      approved: { label: language === 'th' ? 'อนุมัติแล้ว' : 'Approved', variant: 'default' },
      shipped: { label: language === 'th' ? 'จัดส่งแล้ว' : 'Shipped', variant: 'default' },
      delivered: { label: language === 'th' ? 'ถึงผู้รับแล้ว' : 'Delivered', variant: 'outline' },
    };
    const statusConfig = config[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {language === 'th' ? 'คำขอชุดตรวจ HIV' : 'HIV Self-Test Requests'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {language === 'th' ? 'ยังไม่มีคำขอ' : 'No requests yet'}
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-xl p-4 space-y-3 bg-card hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {request.selftest_pii?.full_name || (language === 'th' ? 'ไม่ระบุชื่อ' : 'No name')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  {/* Contact & Address */}
                  {request.selftest_pii && (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {request.selftest_pii.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{request.selftest_pii.phone}</span>
                        </div>
                      )}
                      {request.selftest_pii.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 mt-0.5" />
                          <span className="text-xs">
                            {request.selftest_pii.address}
                            {request.selftest_pii.district && `, ${request.selftest_pii.district}`}
                            {request.selftest_pii.province && `, ${request.selftest_pii.province}`}
                            {request.selftest_pii.postal_code && ` ${request.selftest_pii.postal_code}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status & Tracking Edit */}
                  <div className="pt-2 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          {language === 'th' ? 'สถานะ' : 'Status'}
                        </label>
                        <Select
                          value={statusUpdates[request.id] || request.status}
                          onValueChange={(value) => {
                            setStatusUpdates(prev => ({ ...prev, [request.id]: value }));
                            setEditingRequest(request.id);
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <span className="flex items-center gap-2">
                                  <option.icon className="h-3 w-3" />
                                  {option.label[language as 'th' | 'en']}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          {language === 'th' ? 'เลขพัสดุ' : 'Tracking #'}
                        </label>
                        <Input
                          placeholder={language === 'th' ? 'ใส่เลขพัสดุ' : 'Enter tracking'}
                          value={trackingUpdates[request.id] || ''}
                          onChange={(e) => {
                            setTrackingUpdates(prev => ({ ...prev, [request.id]: e.target.value }));
                            setEditingRequest(request.id);
                          }}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    {(editingRequest === request.id || 
                      statusUpdates[request.id] !== request.status ||
                      trackingUpdates[request.id] !== (request.tracking_number || '')) && (
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => handleSave(request.id)}
                        disabled={saving === request.id}
                      >
                        {saving === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {language === 'th' ? 'บันทึก' : 'Save'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}