import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Clock, CheckCircle2, XCircle, Timer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { format } from 'date-fns';

interface TodayStats {
  booked_today: number;
  arrived_waiting: number;
  checked_out_today: number;
  no_show_today: number;
  avg_duration_minutes: number;
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
          // Super admin or admin: try to match userBranch slug or pick first
          if (userBranch) {
            const match = branchList.find(b => b.slug === userBranch);
            setSelectedBranchId(match?.id || branchList[0].id);
          } else {
            setSelectedBranchId(branchList[0].id);
          }
        }
      } else {
        // No staff profile - user is admin via user_roles
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
      // Fetch stats via RPC
      const { data: statsData } = await supabase.rpc('get_branch_today_board', {
        p_branch_id: selectedBranchId,
        p_date: today,
      });

      if (statsData) setStats(statsData as unknown as TodayStats);

      // Fetch appointment lists
      const baseQuery = () =>
        supabase
          .from('appointments')
          .select('id, referral_code, start_time, status, arrived_at, checked_out_at, auto_checked_out_at, contact_phone, contact_email, contact_line')
          .eq('branch_id', selectedBranchId)
          .eq('appointment_date', today);

      const [waitingRes, upcomingRes, completedRes] = await Promise.all([
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

      const [w, u, c] = await Promise.all([
        enrichList(waitingRes.data || []),
        enrichList(upcomingRes.data || []),
        enrichList(completedRes.data || []),
      ]);

      setWaiting(w);
      setUpcoming(u);
      setCompleted(c);
    } catch (err) {
      console.error('Today board error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const isSuperOrAdmin = staffRole === 'super_admin' || !staffRole; // no staff profile = admin via user_roles
  const canChangeBranch = isSuperOrAdmin;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      booked: { label: language === 'th' ? 'จอง' : 'Booked', variant: 'secondary' },
      confirmed: { label: language === 'th' ? 'ยืนยัน' : 'Confirmed', variant: 'default' },
      arrived: { label: language === 'th' ? 'มาถึง' : 'Arrived', variant: 'default' },
      in_progress: { label: language === 'th' ? 'กำลังรับบริการ' : 'In Progress', variant: 'default' },
      checked_out: { label: language === 'th' ? 'เสร็จ' : 'Done', variant: 'outline' },
      no_show: { label: language === 'th' ? 'ไม่มา' : 'No Show', variant: 'destructive' },
      cancelled: { label: language === 'th' ? 'ยกเลิก' : 'Cancelled', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
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
            {statusBadge(apt.status)}
            {apt.auto_checked_out_at && (
              <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600">
                {language === 'th' ? '⚡ Auto' : '⚡ Auto'}
              </Badge>
            )}
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

      {/* Counter cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats.booked_today}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'จองทั้งหมด' : 'Total Booked'}</div>
          </Card>
          <Card className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-accent-foreground mb-1" />
            <div className="text-2xl font-bold">{stats.arrived_waiting}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'รอรับบริการ' : 'Waiting'}</div>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats.checked_out_today}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'เสร็จแล้ว' : 'Completed'}</div>
          </Card>
          <Card className="p-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <div className="text-2xl font-bold">{stats.no_show_today}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'ไม่มา' : 'No Show'}</div>
          </Card>
          <Card className="p-4 text-center">
            <Timer className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{stats.avg_duration_minutes || 0}</div>
            <div className="text-xs text-muted-foreground">{language === 'th' ? 'เฉลี่ย (นาที)' : 'Avg (min)'}</div>
          </Card>
        </div>
      )}

      {/* Lists */}
      <Tabs defaultValue="waiting">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="waiting">
            {language === 'th' ? `รอ (${waiting.length})` : `Waiting (${waiting.length})`}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            {language === 'th' ? `นัดหมาย (${upcoming.length})` : `Upcoming (${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed">
            {language === 'th' ? `เสร็จ (${completed.length})` : `Done (${completed.length})`}
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
      </Tabs>
    </div>
  );
}
