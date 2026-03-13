import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users, Clock, AlertTriangle, CalendarCheck, HeartHandshake,
  Plus, Phone, ClipboardCheck, Zap, RefreshCw, Loader2,
  UserPlus, ArrowRight,
} from 'lucide-react';
import QuickRegistrationDrawer from './clinic/QuickRegistrationDrawer';
import ClinicIntakeDrawer from './clinic/ClinicIntakeDrawer';
import CounselingWorkflowDrawer from './clinic/CounselingWorkflowDrawer';

interface Branch {
  id: string;
  name_th: string;
  name_en: string;
  slug: string;
}

interface WalkinRow {
  id: string;
  participant_name: string | null;
  anonymous_id: string | null;
  age_range: string | null;
  gender_identity: string | null;
  community_context: string | null;
  source: string;
  reason_for_visit: string[];
  urgency_level: string;
  queue_status: string;
  created_at: string;
  session_id: string | null;
}

interface SessionRow {
  id: string;
  participant_name: string | null;
  session_type: string;
  session_status: string;
  intake_reason: string[];
  intake_urgency: string;
  focus_areas: string[];
  guidance_notes: string | null;
  action_plan: any[];
  followup_plan: string;
  session_outcome: string | null;
  created_at: string;
}

export default function AdminFrontDeskContent({ userBranch }: { userBranch?: string | null }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [walkins, setWalkins] = useState<WalkinRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [regOpen, setRegOpen] = useState(false);
  const [intakeWalkin, setIntakeWalkin] = useState<WalkinRow | null>(null);
  const [counselingSession, setCounselingSession] = useState<SessionRow | null>(null);

  // Load branches
  useEffect(() => {
    supabase.from('booking_branches').select('id, name_th, name_en, slug').eq('is_active', true).order('name_en').then(({ data }) => {
      const list = (data || []) as Branch[];
      setBranches(list);
      if (userBranch) {
        const m = list.find(b => b.slug === userBranch);
        setBranchId(m?.id || list[0]?.id || '');
      } else if (list.length) {
        setBranchId(list[0].id);
      }
    });
  }, [userBranch]);

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const [wRes, sRes] = await Promise.all([
      supabase
        .from('clinic_walkins')
        .select('*')
        .eq('branch_id', branchId)
        .gte('created_at', today + 'T00:00:00')
        .order('created_at', { ascending: true }),
      supabase
        .from('counseling_sessions')
        .select('*')
        .eq('branch_id', branchId)
        .gte('created_at', today + 'T00:00:00')
        .order('created_at', { ascending: true }),
    ]);

    setWalkins((wRes.data || []) as unknown as WalkinRow[]);
    setSessions((sRes.data || []) as unknown as SessionRow[]);
    setLoading(false);
  }, [branchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!branchId) return;
    const ch = supabase
      .channel(`frontdesk-${branchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_walkins' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_sessions' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [branchId, fetchData]);

  // Auto-refresh 30s
  useEffect(() => {
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Stats
  const waiting = walkins.filter(w => w.queue_status === 'waiting');
  const inIntake = walkins.filter(w => w.queue_status === 'in_intake');
  const inCounseling = sessions.filter(s => s.session_status === 'in_progress');
  const urgent = walkins.filter(w => w.urgency_level === 'urgent' || w.urgency_level === 'crisis');
  const completedSessions = sessions.filter(s => s.session_status === 'completed');

  const urgencyColor = (u: string) => {
    switch (u) {
      case 'crisis': return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'urgent': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'elevated': return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'waiting': return 'bg-sky-500/15 text-sky-700 dark:text-sky-400';
      case 'in_intake': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
      case 'counseling': case 'in_progress': return 'bg-primary/15 text-primary';
      case 'completed': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
      case 'urgent': return 'bg-destructive/15 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const openIntake = (w: WalkinRow) => setIntakeWalkin(w);
  const openCounseling = (s: SessionRow) => setCounselingSession(s);

  // Find session for a walkin
  const getSessionForWalkin = (w: WalkinRow) => sessions.find(s => s.id === w.session_id);

  const renderQueueCard = (w: WalkinRow) => {
    const isUrg = w.urgency_level === 'urgent' || w.urgency_level === 'crisis';
    return (
      <Card key={w.id} className={`${isUrg ? 'border-destructive/40' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-sm text-foreground">{w.anonymous_id || '—'}</span>
                {w.participant_name && <span className="text-xs text-muted-foreground truncate">{w.participant_name}</span>}
                <Badge variant="outline" className={`text-[10px] ${statusColor(w.queue_status)}`}>{w.queue_status}</Badge>
                {isUrg && (
                  <Badge variant="outline" className={`text-[10px] ${urgencyColor(w.urgency_level)}`}>
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{w.urgency_level}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span><Clock className="h-3 w-3 inline mr-0.5" />{new Date(w.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>{w.source}</span>
                {w.reason_for_visit?.slice(0, 3).map(r => (
                  <Badge key={r} variant="outline" className="text-[9px]">{r.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {w.queue_status === 'waiting' && (
                <Button size="sm" onClick={() => openIntake(w)}>
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                  {isEn ? 'Intake' : 'รับเข้า'}
                </Button>
              )}
              {w.queue_status === 'in_intake' && w.session_id && (
                <Button size="sm" variant="outline" onClick={() => {
                  const s = getSessionForWalkin(w);
                  if (s) openCounseling(s);
                }}>
                  <HeartHandshake className="h-3.5 w-3.5 mr-1" />
                  {isEn ? 'Counsel' : 'ปรึกษา'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!branchId) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{isEn ? 'Front Desk' : 'แผนกต้อนรับ'}</h2>
          <p className="text-sm text-muted-foreground">{isEn ? 'Arrivals, triage, and service routing' : 'การมาถึง การคัดกรอง และการจัดเส้นทางบริการ'}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{isEn ? b.name_en : b.name_th}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <Clock className="h-5 w-5 mx-auto text-sky-500 mb-1" />
          <div className="text-2xl font-bold text-foreground">{waiting.length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Waiting' : 'รอ'}</div>
        </Card>
        <Card className="p-3 text-center">
          <ClipboardCheck className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <div className="text-2xl font-bold text-foreground">{inIntake.length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'In Intake' : 'รับเข้า'}</div>
        </Card>
        <Card className="p-3 text-center">
          <HeartHandshake className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="text-2xl font-bold text-foreground">{inCounseling.length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Counseling' : 'ให้คำปรึกษา'}</div>
        </Card>
        <Card className={`p-3 text-center ${urgent.length > 0 ? 'border-destructive/40' : ''}`}>
          <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <div className="text-2xl font-bold text-destructive">{urgent.length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Urgent' : 'เร่งด่วน'}</div>
        </Card>
        <Card className="p-3 text-center">
          <Users className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedSessions.length}</div>
          <div className="text-xs text-muted-foreground">{isEn ? 'Completed' : 'เสร็จ'}</div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setRegOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          {isEn ? 'Register Walk-in' : 'ลงทะเบียน Walk-in'}
        </Button>
        <Button variant="outline" onClick={() => toast.info(isEn ? 'Use booking system to check in' : 'ใช้ระบบนัดหมายเพื่อเช็คอิน')}>
          <CalendarCheck className="h-4 w-4 mr-1.5" />
          {isEn ? 'Check-in Booked' : 'เช็คอินนัดหมาย'}
        </Button>
      </div>

      {/* Queue */}
      <Tabs defaultValue="queue">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="queue">{isEn ? `Queue (${waiting.length + inIntake.length})` : `คิว (${waiting.length + inIntake.length})`}</TabsTrigger>
          <TabsTrigger value="counseling">{isEn ? `Counseling (${inCounseling.length})` : `ให้คำปรึกษา (${inCounseling.length})`}</TabsTrigger>
          <TabsTrigger value="completed">{isEn ? `Done (${completedSessions.length})` : `เสร็จ (${completedSessions.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-2 mt-3">
          {/* Urgent first */}
          {urgent.filter(u => u.queue_status === 'waiting').length > 0 && (
            <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
              <p className="text-xs font-semibold text-destructive uppercase">{isEn ? '⚠ Urgent' : '⚠ เร่งด่วน'}</p>
              {urgent.filter(u => u.queue_status === 'waiting').map(renderQueueCard)}
            </div>
          )}
          {[...waiting.filter(w => w.urgency_level !== 'urgent' && w.urgency_level !== 'crisis'), ...inIntake].map(renderQueueCard)}
          {waiting.length === 0 && inIntake.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{isEn ? 'No one in queue' : 'ไม่มีคนในคิว'}</p>
          )}
        </TabsContent>

        <TabsContent value="counseling" className="space-y-2 mt-3">
          {inCounseling.map(s => (
            <Card key={s.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => openCounseling(s)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-foreground">{s.participant_name || (isEn ? 'Anonymous' : 'ไม่ระบุตัวตน')}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{s.session_type.replace(/_/g, ' ')}</Badge>
                    {s.focus_areas?.slice(0, 2).map(f => (
                      <Badge key={f} variant="outline" className="text-[9px]">{f.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
          {inCounseling.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{isEn ? 'No active sessions' : 'ไม่มีเซสชันที่กำลังดำเนินอยู่'}</p>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 mt-3">
          {completedSessions.map(s => (
            <Card key={s.id} className="opacity-70">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">{s.participant_name || (isEn ? 'Anonymous' : 'ไม่ระบุตัวตน')}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{s.session_outcome || 'completed'}</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.session_type.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {completedSessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{isEn ? 'No completed sessions today' : 'ยังไม่มีเซสชันที่เสร็จวันนี้'}</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Drawers */}
      <QuickRegistrationDrawer open={regOpen} onClose={() => setRegOpen(false)} branchId={branchId} onRegistered={fetchData} />
      <ClinicIntakeDrawer open={!!intakeWalkin} onClose={() => setIntakeWalkin(null)} walkin={intakeWalkin as any} branchId={branchId} onUpdated={fetchData} />
      <CounselingWorkflowDrawer open={!!counselingSession} onClose={() => setCounselingSession(null)} session={counselingSession as any} branchId={branchId} onUpdated={fetchData} />
    </div>
  );
}
