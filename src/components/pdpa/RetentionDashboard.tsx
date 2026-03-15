import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Database, Trash2, Archive, RefreshCw, Play, CheckCircle2, AlertTriangle, Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { usePdpaAudit } from '@/hooks/usePdpaAudit';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface RetentionPolicy {
  id: string;
  data_type: string;
  display_name_en: string;
  display_name_th: string;
  classification: string;
  retention_days: number;
  action: string;
  is_active: boolean;
  applies_to_table: string | null;
  description_en: string | null;
  description_th: string | null;
  updated_at: string;
}

interface AnonymizationJob {
  id: string;
  target_table: string;
  records_processed: number;
  records_anonymized: number;
  records_deleted: number;
  records_failed: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function RetentionDashboard() {
  const { language } = useLanguage();
  const th = language === 'th';
  const { log } = usePdpaAudit();
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [jobs, setJobs] = useState<AnonymizationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPolicy, setEditPolicy] = useState<RetentionPolicy | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [polRes, jobRes] = await Promise.all([
      supabase.from('retention_policies').select('*').order('data_type') as any,
      supabase.from('anonymization_jobs').select('*').order('created_at', { ascending: false }).limit(50) as any,
    ]);
    if (polRes.data) setPolicies(polRes.data);
    if (jobRes.data) setJobs(jobRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const togglePolicy = async (p: RetentionPolicy) => {
    await supabase.from('retention_policies').update({ is_active: !p.is_active, updated_at: new Date().toISOString() } as any).eq('id', p.id);
    log({ action_type: 'policy_change', target_type: 'retention_policy', target_id: p.id, metadata: { toggled: !p.is_active } });
    fetchData();
  };

  const savePolicy = async () => {
    if (!editPolicy) return;
    const { id, ...rest } = editPolicy;
    await supabase.from('retention_policies').update({
      retention_days: rest.retention_days,
      action: rest.action,
      display_name_en: rest.display_name_en,
      display_name_th: rest.display_name_th,
      description_en: rest.description_en,
      description_th: rest.description_th,
      updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    log({ action_type: 'policy_change', target_type: 'retention_policy', target_id: id });
    toast.success(th ? 'บันทึกแล้ว' : 'Policy saved');
    setEditOpen(false);
    fetchData();
  };

  const actionIcon = (a: string) => {
    if (a === 'delete') return <Trash2 className="h-3.5 w-3.5" />;
    if (a === 'archive') return <Archive className="h-3.5 w-3.5" />;
    return <Database className="h-3.5 w-3.5" />;
  };

  const classColor = (c: string) => {
    if (c === 'highly_restricted') return 'destructive';
    if (c === 'sensitive') return 'default';
    return 'secondary';
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return 'text-success';
    if (s === 'failed') return 'text-destructive';
    if (s === 'running') return 'text-primary';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Active policies */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{th ? 'นโยบายการเก็บรักษาข้อมูล' : 'Retention Policies'}</h3>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {th ? 'รีเฟรช' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {policies.map(p => (
          <Card key={p.id} className={`p-4 ${!p.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {actionIcon(p.action)}
                <h4 className="font-medium text-sm">{th ? p.display_name_th : p.display_name_en}</h4>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={p.is_active} onCheckedChange={() => togglePolicy(p)} />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditPolicy(p); setEditOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{th ? p.description_th : p.description_en}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={classColor(p.classification)} className="text-[10px]">{p.classification}</Badge>
              <Badge variant="outline" className="text-[10px]">
                <Clock className="h-3 w-3 mr-1" /> {p.retention_days} {th ? 'วัน' : 'days'}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{p.action}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent jobs */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">{th ? 'งานล่าสุด' : 'Recent Jobs'}</h3>
        {jobs.length === 0 ? (
          <Card className="p-6 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{th ? 'ยังไม่มีงาน' : 'No jobs recorded yet'}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {jobs.map(j => (
              <Card key={j.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{j.target_table}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.records_processed} processed · {j.records_anonymized} anonymized · {j.records_deleted} deleted
                      {j.records_failed > 0 && <span className="text-destructive"> · {j.records_failed} failed</span>}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${statusColor(j.status)}`}>{j.status}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(j.created_at), 'dd/MM HH:mm')}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{th ? 'แก้ไขนโยบาย' : 'Edit Retention Policy'}</DialogTitle>
          </DialogHeader>
          {editPolicy && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{th ? 'ชื่อ (EN)' : 'Name (EN)'}</Label>
                  <Input value={editPolicy.display_name_en} onChange={e => setEditPolicy({ ...editPolicy, display_name_en: e.target.value })} />
                </div>
                <div>
                  <Label>{th ? 'ชื่อ (TH)' : 'Name (TH)'}</Label>
                  <Input value={editPolicy.display_name_th} onChange={e => setEditPolicy({ ...editPolicy, display_name_th: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{th ? 'ระยะเก็บรักษา (วัน)' : 'Retention (days)'}</Label>
                  <Input type="number" value={editPolicy.retention_days} onChange={e => setEditPolicy({ ...editPolicy, retention_days: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>{th ? 'การดำเนินการ' : 'Action'}</Label>
                  <Select value={editPolicy.action} onValueChange={v => setEditPolicy({ ...editPolicy, action: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delete">{th ? 'ลบ' : 'Delete'}</SelectItem>
                      <SelectItem value="anonymize">{th ? 'ลบข้อมูลระบุตัวตน' : 'Anonymize'}</SelectItem>
                      <SelectItem value="archive">{th ? 'เก็บถาวร' : 'Archive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{th ? 'คำอธิบาย' : 'Description'}</Label>
                <Textarea value={(th ? editPolicy.description_th : editPolicy.description_en) || ''} onChange={e => setEditPolicy({ ...editPolicy, [th ? 'description_th' : 'description_en']: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{th ? 'ยกเลิก' : 'Cancel'}</Button>
            <Button onClick={savePolicy}>{th ? 'บันทึก' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
