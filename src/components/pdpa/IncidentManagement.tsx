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
import { ShieldAlert, Plus, RefreshCw, CheckCircle2, AlertTriangle, Clock, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { usePdpaAudit } from '@/hooks/usePdpaAudit';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  incident_type: string;
  description: string | null;
  affected_data_categories: string[];
  affected_records_count: number;
  suspected_cause: string | null;
  containment_actions: string | null;
  resolution_summary: string | null;
  notification_status: string;
  timeline_events: any[];
  internal_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-destructive/10 text-destructive',
  investigating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  contained: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted text-muted-foreground',
};

export function IncidentManagement() {
  const { language } = useLanguage();
  const th = language === 'th';
  const { log } = usePdpaAudit();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState('medium');
  const [newType, setNewType] = useState('security');
  const [newDesc, setNewDesc] = useState('');
  const [newCause, setNewCause] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    const { data } = await (supabase.from('security_incidents').select('*').order('created_at', { ascending: false }).limit(100) as any);
    if (data) setIncidents(data);
    setLoading(false);
  };

  useEffect(() => { fetchIncidents(); }, []);

  const createIncident = async () => {
    if (!newTitle.trim()) { toast.error(th ? 'กรุณาระบุหัวข้อ' : 'Title is required'); return; }
    const { data, error } = await (supabase.from('security_incidents').insert({
      title: newTitle,
      severity: newSeverity,
      incident_type: newType,
      description: newDesc || null,
      suspected_cause: newCause || null,
      reported_by: user?.id,
      timeline_events: [{ event: 'Incident created', timestamp: new Date().toISOString(), actor: user?.email }],
    } as any).select().single());
    if (error) { toast.error(error.message); return; }
    log({ action_type: 'data_update', target_type: 'security_incident', target_id: data?.id, metadata: { action: 'created', severity: newSeverity } });
    toast.success(th ? 'สร้างเหตุการณ์แล้ว' : 'Incident created');
    setCreateOpen(false);
    setNewTitle(''); setNewDesc(''); setNewCause('');
    fetchIncidents();
  };

  const updateIncident = async (id: string, updates: Partial<Incident>) => {
    await (supabase.from('security_incidents').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id));
    log({ action_type: 'data_update', target_type: 'security_incident', target_id: id, metadata: { updates: Object.keys(updates) } });
    toast.success(th ? 'อัปเดตแล้ว' : 'Updated');
    setDetailOpen(false);
    fetchIncidents();
  };

  const openCount = incidents.filter(i => i.status === 'open' || i.status === 'investigating').length;
  const criticalCount = incidents.filter(i => i.severity === 'critical' && i.status !== 'closed' && i.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{th ? 'การจัดการเหตุการณ์' : 'Incident Management'}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchIncidents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {th ? 'สร้าง' : 'Create'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">{incidents.length}</p>
          <p className="text-xs text-muted-foreground">{th ? 'ทั้งหมด' : 'Total'}</p>
        </Card>
        <Card className={`p-3 text-center ${openCount > 0 ? 'border-yellow-400/40' : ''}`}>
          <p className={`text-2xl font-bold ${openCount > 0 ? 'text-yellow-600' : ''}`}>{openCount}</p>
          <p className="text-xs text-muted-foreground">{th ? 'เปิดอยู่' : 'Open'}</p>
        </Card>
        <Card className={`p-3 text-center ${criticalCount > 0 ? 'border-destructive/40' : ''}`}>
          <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-destructive' : ''}`}>{criticalCount}</p>
          <p className="text-xs text-muted-foreground">{th ? 'วิกฤต' : 'Critical'}</p>
        </Card>
      </div>

      {/* List */}
      <ScrollArea className="h-[450px]">
        <div className="space-y-2">
          {incidents.map(inc => (
            <Card key={inc.id} className="p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => { setSelected(inc); setDetailOpen(true); }}>
              <div className="flex items-center gap-3">
                <ShieldAlert className={`h-4 w-4 shrink-0 ${inc.severity === 'critical' ? 'text-destructive' : inc.severity === 'high' ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{inc.title}</span>
                    <Badge variant={SEVERITY_COLORS[inc.severity] as any} className="text-[10px]">{inc.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {inc.incident_type} · {inc.affected_data_categories.join(', ') || 'N/A'}
                    {inc.affected_records_count > 0 && ` · ${inc.affected_records_count} records`}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_BADGE[inc.status] || ''}`}>{inc.status}</span>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(inc.created_at), 'dd/MM/yy')}</span>
              </div>
            </Card>
          ))}
          {incidents.length === 0 && (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-success" />
              <p className="text-sm text-muted-foreground">{th ? 'ไม่มีเหตุการณ์' : 'No incidents recorded'}</p>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{th ? 'รายงานเหตุการณ์ใหม่' : 'Report New Incident'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{th ? 'หัวข้อ' : 'Title'}</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={th ? 'อธิบายสั้นๆ' : 'Brief description'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{th ? 'ระดับ' : 'Severity'}</Label>
                <Select value={newSeverity} onValueChange={setNewSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{th ? 'ต่ำ' : 'Low'}</SelectItem>
                    <SelectItem value="medium">{th ? 'ปานกลาง' : 'Medium'}</SelectItem>
                    <SelectItem value="high">{th ? 'สูง' : 'High'}</SelectItem>
                    <SelectItem value="critical">{th ? 'วิกฤต' : 'Critical'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{th ? 'ประเภท' : 'Type'}</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">{th ? 'ความปลอดภัย' : 'Security'}</SelectItem>
                    <SelectItem value="privacy">{th ? 'ความเป็นส่วนตัว' : 'Privacy'}</SelectItem>
                    <SelectItem value="breach">{th ? 'การรั่วไหล' : 'Breach'}</SelectItem>
                    <SelectItem value="policy_violation">{th ? 'การละเมิดนโยบาย' : 'Policy Violation'}</SelectItem>
                    <SelectItem value="system_error">{th ? 'ข้อผิดพลาดระบบ' : 'System Error'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{th ? 'รายละเอียด' : 'Description'}</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>{th ? 'สาเหตุที่สงสัย' : 'Suspected Cause'}</Label>
              <Input value={newCause} onChange={e => setNewCause(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{th ? 'ยกเลิก' : 'Cancel'}</Button>
            <Button onClick={createIncident}>{th ? 'สร้าง' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{th ? 'ระดับ' : 'Severity'}:</span> <Badge variant={SEVERITY_COLORS[selected.severity] as any}>{selected.severity}</Badge></div>
                <div><span className="text-muted-foreground">{th ? 'ประเภท' : 'Type'}:</span> {selected.incident_type}</div>
                <div><span className="text-muted-foreground">{th ? 'สถานะ' : 'Status'}:</span> <span className={STATUS_BADGE[selected.status]?.split(' ').pop()}>{selected.status}</span></div>
                <div><span className="text-muted-foreground">{th ? 'แจ้งเตือน' : 'Notification'}:</span> {selected.notification_status}</div>
              </div>
              {selected.description && <p className="text-sm">{selected.description}</p>}
              {selected.suspected_cause && <p className="text-sm text-muted-foreground">{th ? 'สาเหตุ' : 'Cause'}: {selected.suspected_cause}</p>}

              {/* Timeline */}
              {selected.timeline_events && selected.timeline_events.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">{th ? 'ไทม์ไลน์' : 'Timeline'}</Label>
                  <div className="space-y-1 mt-1">
                    {selected.timeline_events.map((evt: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{evt.timestamp ? format(new Date(evt.timestamp), 'dd/MM HH:mm') : ''}</span>
                        <span>{evt.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {selected?.status === 'open' && (
              <Button variant="outline" onClick={() => updateIncident(selected.id, { status: 'investigating' as any })}>{th ? 'เริ่มสอบสวน' : 'Investigate'}</Button>
            )}
            {selected?.status === 'investigating' && (
              <Button variant="outline" onClick={() => updateIncident(selected.id, { status: 'contained' as any })}>{th ? 'ควบคุมแล้ว' : 'Contained'}</Button>
            )}
            {(selected?.status === 'contained' || selected?.status === 'investigating') && (
              <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => updateIncident(selected.id, { status: 'resolved' as any, resolved_at: new Date().toISOString(), resolved_by: user?.id } as any)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> {th ? 'แก้ไขแล้ว' : 'Resolve'}
              </Button>
            )}
            {selected?.status === 'resolved' && (
              <Button variant="secondary" onClick={() => updateIncident(selected.id, { status: 'closed' as any })}>{th ? 'ปิดเคส' : 'Close'}</Button>
            )}
            <Button variant="ghost" onClick={() => setDetailOpen(false)}>{th ? 'ปิด' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
