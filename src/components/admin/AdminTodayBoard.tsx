import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Clock, CheckCircle2, XCircle, Timer, RefreshCw, Zap, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TodayStats {
  booked_today: number;
  arrived_waiting: number;
  checked_out_today: number;
  no_show_today: number;
  avg_duration_minutes: number;
  completed_total: number;
  auto_checkout: number;
  auto_noshow: number;
  auto_total: number;
}

interface TodayAppointment {
  id: string;
  referral_code: string | null;
  start_time: string;
  status: string;
  arrived_at: string | null;
  checked_out_at: string | null;
  auto_checked_out_at: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_line: string | null;
  services: { name_th: string; name_en: string; icon: string }[];
}

interface Branch {
  id: string;
  name_th: string;
  name_en: string;
  slug: string;
}

export default function AdminTodayBoard({ userBranch }: { userBranch?: string | null }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [waiting, setWaiting] = useState<TodayAppointment[]>([]);
  const [upcoming, setUpcoming] = useState<TodayAppointment[]>([]);
  const [completed, setCompleted] = useState<TodayAppointment[]>([]);
  const [noShows, setNoShows] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load branches and staff profile
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      const [branchRes, staffRes] = await Promise.all([
        supabase.from('booking_branches').select('id, name_th, name_en, slug').eq('is_active', true),
        supabase.from('staff_profiles').select('branch_id, staff_role').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      ]);

      const branchList = (branchRes.data || []) as Branch[];
      setBranches(branchList);

      if (staffRes.data) {
        setStaffRole(staffRes.data.staff_role as string);
        if (staffRes.data.staff_role !== 'super_admin' && staffRes.data.branch_id) {
          setSelectedBranchId(staffRes.data.branch_id as string);
        } else if (branchList.length > 0) {
          if (userBranch) {
            const match = branchList.find(b => b.slug === userBranch);
            setSelectedBranchId(match?.id || branchList[0].id);
          } else {
            setSelectedBranchId(branchList[0].id);
          }
        }
      } else {
        if (branchList.length > 0) {
          if (userBranch) {
            const match = branchList.find(b => b.slug === userBranch);
            setSelectedBranchId(match?.id || branchList[0].id);
          } else {
            setSelectedBranchId(branchList[0].id);
          }
        }
      }
    };
    init();
  }, [user, userBranch]);

  const fetchData = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);

    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      const { data: statsData } = await supabase.rpc('get_branch_today_board', {
        p_branch_id: selectedBranchId,
        p_date: today,
      });

      if (statsData) setStats(statsData as unknown as TodayStats);

      const baseQuery = () =>
        supabase
          .from('appointments')
          .select('id, referral_code, start_time, status, arrived_at, checked_out_at, auto_checked_out_at, contact_phone, contact_email, contact_line')
          .eq('branch_id', selectedBranchId)
          .eq('appointment_date', today);

      const [waitingRes, upcomingRes, completedRes, noShowRes] = await Promise.all([
        baseQuery()
          .not('arrived_at', 'is', null)
          .is('checked_out_at', null)
          .not('status', 'in', '("cancelled","no_show")')
          .order('arrived_at', { ascending: true }),
        baseQuery()
          .in('status', ['booked', 'confirmed'])
          .order('start_time', { ascending: true }),
        baseQuery()
          .not('checked_out_at', 'is', null)
          .order('checked_out_at', { ascending: false }),
        baseQuery()
          .eq('status', 'no_show')
          .order('start_time', { ascending: true }),
      ]);

      const enrichList = async (rows: any[]): Promise<TodayAppointment[]> => {
        if (!rows.length) return [];
        const ids = rows.map(r => r.id);
        const { data: svcData } = await supabase
          .from('appointment_services')
          .select('appointment_id, booking_services(name_th, name_en, icon)')
          .in('appointment_id', ids);

        const svcMap: Record<string, any[]> = {};
        (svcData || []).forEach((s: any) => {
          if (!svcMap[s.appointment_id]) svcMap[s.appointment_id] = [];
          if (s.booking_services) svcMap[s.appointment_id].push(s.booking_services);
        });

        return rows.map(r => ({ ...r, services: svcMap[r.id] || [] }));
      };

      const [w, u, c, n] = await Promise.all([
        enrichList(waitingRes.data || []),
        enrichList(upcomingRes.data || []),
        enrichList(completedRes.data || []),
        enrichList(noShowRes.data || []),
      ]);

      setWaiting(w);
      setUpcoming(u);
      setCompleted(c);
      setNoShows(n);
    } catch (err) {
      console.error('Today board error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedBranchId) return;

    const channel = supabase
      .channel('today-board-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
      }, () => fetchData())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointment_logs',
      }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedBranchId, fetchData]);

  // Auto-refresh every 30s as fallback
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isSuperOrAdmin = staffRole === 'super_admin' || !staffRole;
  const canChangeBranch = isSuperOrAdmin;

  const getAutoLabel = (apt: TodayAppointment) => {
    if (apt.auto_checked_out_at) {
      return (
        <Badge variant="outline" className="text-[9px] border-amber-400 text-amber-600 dark:text-amber-400 gap-0.5">
          <Bot className="h-2.5 w-2.5" />
          {language === 'th' ? 'Auto Check-out' : 'Auto Check-out'}
        </Badge>
      );
    }
    // For no-show, we check if status is no_show — auto no-show won't have performed_by in logs
    // but from client side we can't easily tell, so show for all no_show as info
    return null;
  };

  const statusBadge = (apt: TodayAppointment) => {
    const status = apt.status;
    const map: Record<string, { label: string; className: string }> = {
      booked: { label: language === 'th' ? 'จอง' : 'Booked', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      confirmed: { label: language === 'th' ? 'ยืนยัน' : 'Confirmed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
      arrived: { label: language === 'th' ? 'มาถึง' : 'Arrived', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
      in_progress: { label: language === 'th' ? 'กำลังรับบริการ' : 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      checked_out: { label: language === 'th' ? 'เสร็จ' : 'Done', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      completed: { label: language === 'th' ? 'เสร็จสิ้น' : 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      no_show: { label: language === 'th' ? 'ไม่มา' : 'No Show', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      cancelled: { label: language === 'th' ? 'ยกเลิก' : 'Cancelled', className: 'bg-muted text-muted-foreground' },
    };
    const info = map[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", info.className)}>{info.label}</span>;
  };

  const renderRow = (apt: TodayAppointment) => {
    const contactDisplay = apt.contact_phone || apt.contact_line || apt.contact_email;
    return (
      <Card key={apt.id} className="p-3 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-primary">
              {apt.referral_code || '—'}
            </span>
            {contactDisplay && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[130px]" title={[apt.contact_phone, apt.contact_line, apt.contact_email].filter(Boolean).join(' / ')}>
                {contactDisplay}
              </span>
            )}
            {statusBadge(apt)}
            {getAutoLabel(apt)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            {apt.start_time?.slice(0, 5)}
            {apt.services.length > 0 && (
              <span className="ml-2">
                {apt.services.map(s => s.icon + ' ' + (language === 'th' ? s.name_th : s.name_en)).join(', ')}
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (!selectedBranchId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Branch selector */}
      <div className="flex items-center justify-between gap-3">
        {canChangeBranch ? (
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {language === 'th' ? b.name_th : b.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <h3 className="font-semibold text-foreground">
            {branches.find(b => b.id === selectedBranchId)?.[language === 'th' ? 'name_th' : 'name_en'] || ''}
          </h3>
        )}
        <Button variant="ghost" size="icon" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats cards - main row */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto text-primary mb-1" />
              <div className="text-2xl font-bold">{stats.booked_today}</div>
              <div className="text-xs text-muted-foreground">{language === 'th' ? 'จองทั้งหมด' : 'Total Booked'}</div>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <div className="text-2xl font-bold">{stats.arrived_waiting}</div>
              <div className="text-xs text-muted-foreground">{language === 'th' ? 'รอรับบริการ' : 'Waiting'}</div>
            </Card>
            <Card className="p-4 text-center border-green-200 dark:border-green-800/40">
              <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.completed_total}</div>
              <div className="text-xs text-muted-foreground">{language === 'th' ? 'เสร็จทั้งหมด' : 'Completed'}</div>
            </Card>
            <Card className="p-4 text-center border-red-200 dark:border-red-800/40">
              <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.no_show_today}</div>
              <div className="text-xs text-muted-foreground">{language === 'th' ? 'ไม่มา' : 'No Show'}</div>
            </Card>
            <Card className="p-4 text-center">
              <Timer className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <div className="text-2xl font-bold">{stats.avg_duration_minutes || 0}</div>
              <div className="text-xs text-muted-foreground">{language === 'th' ? 'เฉลี่ย (นาที)' : 'Avg (min)'}</div>
            </Card>
          </div>

          {/* Auto metrics row */}
          {stats.auto_total > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20">
                <Bot className="h-4 w-4 mx-auto text-amber-600 mb-0.5" />
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{stats.auto_total}</div>
                <div className="text-[10px] text-muted-foreground">{language === 'th' ? 'Auto ทั้งหมด' : 'Auto Total'}</div>
              </Card>
              <Card className="p-3 text-center bg-amber-50/30 dark:bg-amber-950/10">
                <Zap className="h-4 w-4 mx-auto text-amber-500 mb-0.5" />
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.auto_checkout}</div>
                <div className="text-[10px] text-muted-foreground">{language === 'th' ? 'Auto Check-out' : 'Auto Check-out'}</div>
              </Card>
              <Card className="p-3 text-center bg-red-50/30 dark:bg-red-950/10">
                <XCircle className="h-4 w-4 mx-auto text-red-400 mb-0.5" />
                <div className="text-lg font-bold text-red-500 dark:text-red-400">{stats.auto_noshow}</div>
                <div className="text-[10px] text-muted-foreground">{language === 'th' ? 'Auto No-show' : 'Auto No-show'}</div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Lists */}
      <Tabs defaultValue="waiting">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="waiting">
            {language === 'th' ? `รอ (${waiting.length})` : `Waiting (${waiting.length})`}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            {language === 'th' ? `นัดหมาย (${upcoming.length})` : `Upcoming (${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {language === 'th' ? `เสร็จ (${completed.length})` : `Done (${completed.length})`}
          </TabsTrigger>
          <TabsTrigger value="noshow">
            {language === 'th' ? `ไม่มา (${noShows.length})` : `No Show (${noShows.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="space-y-2 mt-3">
          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'th' ? 'ไม่มีคนรอ' : 'No one waiting'}
            </p>
          ) : waiting.map(renderRow)}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-2 mt-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'th' ? 'ไม่มีนัดหมาย' : 'No upcoming appointments'}
            </p>
          ) : upcoming.map(renderRow)}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 mt-3">
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'th' ? 'ยังไม่มีคนเสร็จ' : 'No completions yet'}
            </p>
          ) : completed.map(renderRow)}
        </TabsContent>

        <TabsContent value="noshow" className="space-y-2 mt-3">
          {noShows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === 'th' ? 'ไม่มีรายการไม่มา' : 'No no-shows'}
            </p>
          ) : noShows.map(renderRow)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
