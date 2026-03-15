import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserX, Clock, CheckCircle2, AlertTriangle, Plus, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { usePdpaAudit } from '@/hooks/usePdpaAudit';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

interface DeletionRequest {
  id: string;
  request_type: string;
  requester_id: string | null;
  requester_email: string | null;
  requester_name: string | null;
  status: string;
  priority: string;
  data_categories: string[];
  reason: string | null;
  admin_notes: string | null;
  assigned_to: string | null;
  deadline_at: string | null;
  completed_at: string | null;
  evidence_summary: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'destructive',
  high: 'default',
  normal: 'secondary',
  low: 'outline',
};

const REQUEST_TYPES = ['deletion', 'correction', 'access', 'portability', 'restriction'] as const;
const DATA_CATEGORIES = ['personal_info', 'health_data', 'test_results', 'consultation', 'medication', 'consent_history', 'analytics', 'chat_messages'] as const;

export function DsarWorkflow() {
  const { language } = useLanguage();
  const th = language === 'th';
  const { log } = usePdpaAudit();
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<DeletionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    const q = supabase.from('deletion_requests').select('*').order('created_at', { ascending: false }).limit(200) as any;
    const { data } = await q;
    if (data) setRequests(data);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered = requests.filter(r => statusFilter === 'all' || r.status === statusFilter);

  const updateStatus = async (id: string, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user?.id;
      updates.evidence_summary = evidenceSummary || null;
    }
    if (newStatus === 'verified') {
      updates.verified_at = new Date().toISOString();
      updates.verified_by = user?.id;
    }
    if (adminNotes) updates.admin_notes = adminNotes;

    await supabase.from('deletion_requests').update(updates).eq('id', id);
    log({ action_type: 'data_update', target_type: 'deletion_request', target_id: id, metadata: { new_status: newStatus } });
    toast.success(th ? 'อัปเดตแล้ว' : 'Request updated');
    setDetailOpen(false);
    fetchRequests();
  };

  const openDetail = (r: DeletionRequest) => {
    setSelectedReq(r);
    setAdminNotes(r.admin_notes || '');
    setEvidenceSummary(r.evidence_summary || '');
    setDetailOpen(true);
  };

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'verified').length;
  const overdueCount = requests.filter(r => r.deadline_at && new Date(r.deadline_at) < new Date() && !['completed', 'rejected', 'cancelled'].includes(r.status)).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">{requests.length}</p>
          <p className="text-xs text-muted-foreground">{th ? 'คำขอทั้งหมด' : 'Total Requests'}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">{th ? 'รอดำเนินการ' : 'Pending'}</p>
        </Card>
        <Card className={`p-3 text-center ${overdueCount > 0 ? 'border-destructive/40' : ''}`}>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-destructive' : ''}`}>{overdueCount}</p>
          <p className="text-xs text-muted-foreground">{th ? 'เกินกำหนด' : 'Overdue'}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-success">{requests.filter(r => r.status === 'completed').length}</p>
          <p className="text-xs text-muted-foreground">{th ? 'เสร็จสิ้น' : 'Completed'}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{th ? 'ทั้งหมด' : 'All'}</SelectItem>
            <SelectItem value="pending">{th ? 'รอ' : 'Pending'}</SelectItem>
            <SelectItem value="verified">{th ? 'ยืนยันแล้ว' : 'Verified'}</SelectItem>
            <SelectItem value="in_progress">{th ? 'กำลังดำเนินการ' : 'In Progress'}</SelectItem>
            <SelectItem value="completed">{th ? 'เสร็จ' : 'Completed'}</SelectItem>
            <SelectItem value="rejected">{th ? 'ปฏิเสธ' : 'Rejected'}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Request list */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filtered.map(r => {
            const isOverdue = r.deadline_at && new Date(r.deadline_at) < new Date() && !['completed', 'rejected', 'cancelled'].includes(r.status);
            return (
              <Card key={r.id} className={`p-3 cursor-pointer hover:bg-muted/30 transition-colors ${isOverdue ? 'border-destructive/30' : ''}`} onClick={() => openDetail(r)}>
                <div className="flex items-center gap-3">
                  <UserX className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium capitalize">{r.request_type}</span>
                      <Badge variant={PRIORITY_COLORS[r.priority] as any} className="text-[10px]">{r.priority}</Badge>
                      {isOverdue && <Badge variant="destructive" className="text-[10px]">{th ? 'เกินกำหนด' : 'OVERDUE'}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.requester_email || r.requester_name || r.requester_id?.slice(0, 8) || '—'}
                      {r.data_categories.length > 0 && ` · ${r.data_categories.join(', ')}`}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || ''}`}>{r.status}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{format(new Date(r.created_at), 'dd/MM/yy')}</span>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{th ? 'ไม่มีคำขอ' : 'No requests found'}</p>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{th ? 'รายละเอียดคำขอ' : 'Request Details'}</DialogTitle>
          </DialogHeader>
          {selectedReq && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{th ? 'ประเภท' : 'Type'}:</span> <span className="font-medium capitalize">{selectedReq.request_type}</span></div>
                <div><span className="text-muted-foreground">{th ? 'สถานะ' : 'Status'}:</span> <span className={`font-medium ${STATUS_COLORS[selectedReq.status]?.split(' ').pop()}`}>{selectedReq.status}</span></div>
                <div><span className="text-muted-foreground">{th ? 'ผู้ขอ' : 'Requester'}:</span> <span className="font-medium">{selectedReq.requester_email || selectedReq.requester_name || '—'}</span></div>
                <div><span className="text-muted-foreground">{th ? 'กำหนด' : 'Deadline'}:</span> <span className="font-medium">{selectedReq.deadline_at ? format(new Date(selectedReq.deadline_at), 'dd/MM/yyyy') : '—'}</span></div>
              </div>
              {selectedReq.reason && (
                <div>
                  <Label className="text-muted-foreground text-xs">{th ? 'เหตุผล' : 'Reason'}</Label>
                  <p className="text-sm mt-1">{selectedReq.reason}</p>
                </div>
              )}
              {selectedReq.data_categories.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {selectedReq.data_categories.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
              )}
              <div>
                <Label>{th ? 'บันทึกผู้ดูแล' : 'Admin Notes'}</Label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} />
              </div>
              <div>
                <Label>{th ? 'สรุปหลักฐาน' : 'Evidence Summary'}</Label>
                <Textarea value={evidenceSummary} onChange={e => setEvidenceSummary(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {selectedReq?.status === 'pending' && (
              <>
                <Button variant="outline" onClick={() => updateStatus(selectedReq.id, 'verified')}>{th ? 'ยืนยันตัวตน' : 'Verify'}</Button>
                <Button variant="destructive" onClick={() => updateStatus(selectedReq.id, 'rejected')}>{th ? 'ปฏิเสธ' : 'Reject'}</Button>
              </>
            )}
            {selectedReq?.status === 'verified' && (
              <Button onClick={() => updateStatus(selectedReq.id, 'in_progress')}>{th ? 'เริ่มดำเนินการ' : 'Start Processing'}</Button>
            )}
            {selectedReq?.status === 'in_progress' && (
              <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => updateStatus(selectedReq.id, 'completed')}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> {th ? 'เสร็จสิ้น' : 'Complete'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailOpen(false)}>{th ? 'ปิด' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
