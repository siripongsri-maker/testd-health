import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CalendarCheck, UserPlus, RotateCcw, XCircle, Activity, Clock,
  Building2, AlertTriangle, MessageSquarePlus, ChevronRight, Footprints,
  Play, CheckCircle2, Loader2, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDisplayServices } from '@/lib/appointments';
import type { EnrichedAppointment, BranchOption, DensityDay } from './types';
import { getStatusInfo } from './types';
import { BranchSettingsDrawer } from './BranchSettingsDrawer';

interface Props {
  appointments: EnrichedAppointment[];
  branches: BranchOption[];
  density: DensityDay[];
  selectedDate: string;
  onDrillBranch: (branchId: string) => void;
  onDrillTimeBlock: (timeRange: string) => void;
  onClickAppointment: (apt: EnrichedAppointment) => void;
  onRefresh: () => void;
}

export function BentoDashboard({
  appointments, branches, density, selectedDate,
  onDrillBranch, onDrillTimeBlock, onClickAppointment, onRefresh,
}: Props) {
  const { language } = useLanguage();

  // Today's density
  const todayDensity = density.find(d => d.appointment_date === selectedDate);
  const totalCount = todayDensity?.total_count || 0;
  const newCount = todayDensity?.new_count || 0;
  const returningCount = todayDensity?.returning_count || 0;
  const cancelledCount = todayDensity?.cancelled_count || 0;

  // Busy level
  const busyLevel = totalCount > 30 ? 'high' : totalCount > 15 ? 'medium' : 'low';
  const busyConfig = {
    low: { color: 'bg-green-500', label: language === 'th' ? 'เบา' : 'Low' },
    medium: { color: 'bg-amber-500', label: language === 'th' ? 'ปานกลาง' : 'Medium' },
    high: { color: 'bg-red-500', label: language === 'th' ? 'หนาแน่น' : 'High' },
  };

  // Branch stats
  const branchStats = useMemo(() => {
    return branches.map(b => {
      const branchApts = appointments.filter(a => a.branch_id === b.id);
      const newC = branchApts.filter(a => !a.is_returning).length;
      const retC = branchApts.filter(a => a.is_returning).length;
      const capacity = b.counselor_count * 20; // rough: 20 slots per counselor per day
      const pct = capacity > 0 ? Math.min(100, Math.round((branchApts.length / capacity) * 100)) : 0;

      // Peak hour
      const hourCounts: Record<number, number> = {};
      branchApts.forEach(a => {
        const h = parseInt((a.start_time as string).slice(0, 2));
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
      let peakHour = '';
      let peakCount = 0;
      Object.entries(hourCounts).forEach(([h, c]) => {
        if (c > peakCount) { peakCount = c; peakHour = `${h}:00`; }
      });

      return { branch: b, total: branchApts.length, newC, retC, pct, peakHour, peakCount };
    });
  }, [branches, appointments]);

  // Peak hours (top 3 busiest hours)
  const peakHours = useMemo(() => {
    const hourMap: Record<string, number> = {};
    appointments.forEach(a => {
      const h = parseInt((a.start_time as string).slice(0, 2));
      const key = `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`;
      hourMap[key] = (hourMap[key] || 0) + 1;
    });
    return Object.entries(hourMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([range, count]) => ({ range, count }));
  }, [appointments]);

  // New cases (latest 6)
  const newCases = useMemo(() =>
    appointments.filter(a => !a.is_returning)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6),
  [appointments]);

  // Returning (latest 6)
  const returningCases = useMemo(() =>
    appointments.filter(a => a.is_returning)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6),
  [appointments]);

  // Quick actions / alerts
  const pendingCount = appointments.filter(a => a.status === 'booked').length;
  const missingNotesCount = appointments.filter(a => a.status === 'completed' && !a.staff_notes).length;

  // Walk-ins today
  const walkins = useMemo(
    () => appointments.filter(a => (a as any).source === 'walkin'),
    [appointments]
  );
  const activeWalkins = walkins.filter(a => a.status === 'waiting' || a.status === 'in_progress');

  const [walkinBranch, setWalkinBranch] = useState<string>('');
  const [creatingWalkin, setCreatingWalkin] = useState(false);
  const [settingsBranchId, setSettingsBranchId] = useState<string | null>(null);

  const handleCreateWalkin = async () => {
    if (!walkinBranch) return;
    setCreatingWalkin(true);
    try {
      const { data, error } = await supabase.rpc('create_walkin_appointment', {
        p_branch_id: walkinBranch,
      });
      if (error) throw error;
      const code = (data as any)?.referral_code;
      toast.success(language === 'th'
        ? `✅ Walk-in สร้างแล้ว: ${code}`
        : `✅ Walk-in created: ${code}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setCreatingWalkin(false);
    }
  };

  const handleStartService = async (aptId: string) => {
    try {
      const { error } = await supabase.rpc('start_walkin_service', { p_appointment_id: aptId });
      if (error) throw error;
      toast.success(language === 'th' ? 'เริ่มให้บริการแล้ว' : 'Service started');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const handleCompleteService = async (aptId: string) => {
    try {
      const { error } = await supabase.rpc('complete_walkin_service', { p_appointment_id: aptId });
      if (error) throw error;
      toast.success(language === 'th' ? 'เสร็จสิ้นแล้ว' : 'Service completed');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  return (
    <div className="space-y-3">
      {/* A) Today Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <SummaryCard icon={CalendarCheck} value={totalCount} label={language === 'th' ? 'ทั้งหมด' : 'Total'} accent="text-primary" />
        <SummaryCard icon={UserPlus} value={newCount} label={language === 'th' ? 'ใหม่' : 'New'} accent="text-sky-600 dark:text-sky-400" />
        <SummaryCard icon={RotateCcw} value={returningCount} label={language === 'th' ? 'กลับมา' : 'Return'} accent="text-purple-600 dark:text-purple-400" />
        <SummaryCard icon={XCircle} value={cancelledCount} label={language === 'th' ? 'ยกเลิก' : 'Cancel'} accent="text-destructive" />
        <Card className="p-3 flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full shrink-0", busyConfig[busyLevel].color)} />
          <div>
            <p className="text-xs font-bold">{busyConfig[busyLevel].label}</p>
            <p className="text-[10px] text-muted-foreground">{language === 'th' ? 'ระดับความหนาแน่น' : 'Busy Level'}</p>
          </div>
        </Card>
      </div>

      {/* B) Branch cards + C) Peak Hours row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Branch cards */}
        <div className="md:col-span-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {language === 'th' ? 'สาขา' : 'Branches'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {branchStats.map(bs => (
              <Card
                key={bs.branch.id}
                className="p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                onClick={() => onDrillBranch(bs.branch.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold">{language === 'th' ? bs.branch.name_th : bs.branch.name_en}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSettingsBranchId(bs.branch.id); }}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <Settings className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-primary mb-1">{bs.total}</p>
                <div className="flex gap-2 text-[10px] mb-2">
                  <span className="px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 font-semibold">
                    {language === 'th' ? 'ใหม่' : 'New'} {bs.newC}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-semibold">
                    {language === 'th' ? 'กลับมา' : 'Ret'} {bs.retC}
                  </span>
                </div>
                {/* Capacity meter */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1">
                  <div
                    className={cn("h-full rounded-full transition-all", bs.pct > 80 ? 'bg-red-500' : bs.pct > 50 ? 'bg-amber-500' : 'bg-primary')}
                    style={{ width: `${bs.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>{bs.pct}% {language === 'th' ? 'ใช้แล้ว' : 'used'}</span>
                  {bs.peakHour && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {language === 'th' ? 'พีค' : 'Peak'} {bs.peakHour}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right column: Peak hours + Alerts */}
        <div className="space-y-3">
          {/* C) Peak Hours */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              <Clock className="h-3 w-3 inline mr-1" />
              {language === 'th' ? 'ชั่วโมงพีค' : 'Peak Hours'}
            </p>
            <div className="space-y-1.5">
              {peakHours.length > 0 ? peakHours.map((ph, i) => (
                <button
                  key={ph.range}
                  onClick={() => onDrillTimeBlock(ph.range)}
                  className="w-full flex items-center gap-2 p-2 rounded-xl border border-border/40 bg-background hover:border-primary/30 hover:shadow-sm transition-all text-left"
                >
                  <div className={cn(
                    "h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0",
                    i === 0 ? 'bg-primary' : 'bg-primary/60'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{ph.range}</p>
                    <p className="text-[10px] text-muted-foreground">{ph.count} {language === 'th' ? 'นัดหมาย' : 'appts'}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )) : (
                <p className="text-xs text-muted-foreground py-3 text-center">{language === 'th' ? 'ไม่มีข้อมูล' : 'No data'}</p>
              )}
            </div>
          </div>

          {/* F) Quick Actions / Alerts */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              {language === 'th' ? 'แจ้งเตือน' : 'Alerts'}
            </p>
            <div className="space-y-1.5">
              {pendingCount > 0 && (
                <Card className="p-2.5 flex items-center gap-2 border-amber-200 dark:border-amber-800/40">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <p className="text-xs">
                    <span className="font-bold text-amber-600 dark:text-amber-400">{pendingCount}</span>{' '}
                    {language === 'th' ? 'รอยืนยัน' : 'pending confirmation'}
                  </p>
                </Card>
              )}
              {missingNotesCount > 0 && (
                <Card className="p-2.5 flex items-center gap-2 border-blue-200 dark:border-blue-800/40">
                  <MessageSquarePlus className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <p className="text-xs">
                    <span className="font-bold text-blue-600 dark:text-blue-400">{missingNotesCount}</span>{' '}
                    {language === 'th' ? 'เสร็จแต่ยังไม่มีโน้ต' : 'completed without notes'}
                  </p>
                </Card>
              )}
              {pendingCount === 0 && missingNotesCount === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">✅ {language === 'th' ? 'ไม่มีรายการค้าง' : 'All clear'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Walk-in Management */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
          <Footprints className="h-3 w-3" />
          Walk-in
          {activeWalkins.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] font-bold">
              {activeWalkins.length}
            </span>
          )}
        </p>

        {/* Quick add walk-in */}
        <div className="flex gap-2 mb-2">
          <select
            value={walkinBranch}
            onChange={(e) => setWalkinBranch(e.target.value)}
            className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">{language === 'th' ? 'เลือกสาขา' : 'Select branch'}</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{language === 'th' ? b.name_th : b.name_en}</option>
            ))}
          </select>
          <Button
            size="sm"
            className="h-8 gap-1 text-xs shrink-0"
            disabled={!walkinBranch || creatingWalkin}
            onClick={handleCreateWalkin}
          >
            {creatingWalkin ? <Loader2 className="h-3 w-3 animate-spin" /> : <Footprints className="h-3 w-3" />}
            + Walk-in
          </Button>
        </div>

        {/* Active walk-ins list */}
        {activeWalkins.length > 0 && (
          <div className="space-y-1">
            {activeWalkins.map(apt => (
              <Card key={apt.id} className="p-2.5 flex items-center gap-2">
                <span className="text-xs font-bold text-foreground shrink-0 w-10">
                  {(apt.start_time as string).slice(0, 5)}
                </span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                  apt.status === 'waiting'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                )}>
                  {apt.status === 'waiting'
                    ? (language === 'th' ? 'รอคิว' : 'Waiting')
                    : (language === 'th' ? 'กำลังรับบริการ' : 'In Service')}
                </span>
                {apt.referral_code && (
                  <span className="text-[10px] font-mono font-bold text-primary">{apt.referral_code}</span>
                )}
                <span className="flex-1 text-[10px] text-muted-foreground truncate">
                  {language === 'th' ? apt.booking_branches?.name_th : apt.booking_branches?.name_en}
                </span>
                {apt.status === 'waiting' && (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => handleStartService(apt.id)}>
                    <Play className="h-2.5 w-2.5" />
                    {language === 'th' ? 'เริ่ม' : 'Start'}
                  </Button>
                )}
                {apt.status === 'in_progress' && (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => handleCompleteService(apt.id)}>
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {language === 'th' ? 'เสร็จ' : 'Done'}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
        {activeWalkins.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-1">
            {language === 'th' ? 'ไม่มี walk-in ขณะนี้' : 'No active walk-ins'}
          </p>
        )}
      </div>

      {/* D) New Cases + E) Returning - side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* New Cases */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
            <UserPlus className="h-3 w-3" />
            {language === 'th' ? 'เคสใหม่' : 'New Cases'}
            {newCases.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 text-[10px] font-bold">{newCount}</span>}
          </p>
          <div className="space-y-1">
            {newCases.length > 0 ? newCases.map(apt => (
              <CompactPill key={apt.id} apt={apt} language={language} onClick={onClickAppointment} />
            )) : (
              <p className="text-xs text-muted-foreground py-4 text-center">{language === 'th' ? 'ไม่มีเคสใหม่' : 'No new cases'}</p>
            )}
          </div>
        </div>

        {/* Returning */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            {language === 'th' ? 'กลับมาอีกครั้ง' : 'Returning'}
            {returningCases.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] font-bold">{returningCount}</span>}
          </p>
          <div className="space-y-1">
            {returningCases.length > 0 ? returningCases.map(apt => (
              <CompactPill key={apt.id} apt={apt} language={language} onClick={onClickAppointment} />
            )) : (
              <p className="text-xs text-muted-foreground py-4 text-center">{language === 'th' ? 'ไม่มี' : 'None'}</p>
            )}
          </div>
        </div>
      </div>
      {/* Branch Settings Drawer */}
      <BranchSettingsDrawer
        branchId={settingsBranchId}
        onClose={() => setSettingsBranchId(null)}
        onRefresh={onRefresh}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, value, label, accent }: { icon: any; value: number; label: string; accent: string }) {
  return (
    <Card className="p-3 text-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-0.5", accent)} />
      <p className={cn("text-xl font-bold", accent)}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </Card>
  );
}

function CompactPill({ apt, language, onClick }: { apt: EnrichedAppointment; language: string; onClick: (a: EnrichedAppointment) => void }) {
  const services = getDisplayServices(apt);
  const statusInfo = getStatusInfo(apt.status);

  return (
    <button
      onClick={() => onClick(apt)}
      className="w-full flex items-center gap-2 p-2 rounded-xl border border-border/30 bg-background hover:border-primary/20 hover:shadow-sm transition-all text-left"
    >
      <span className="text-xs font-bold text-foreground shrink-0 w-10">{(apt.start_time as string).slice(0, 5)}</span>
      <span className="text-sm shrink-0">{services.map(s => s.icon).join(' ')}</span>
      {apt.referral_code && (
        <span className="text-[10px] font-mono font-bold text-primary shrink-0">{apt.referral_code}</span>
      )}
      <span className="flex-1 text-[10px] text-muted-foreground truncate">
        {language === 'th' ? apt.booking_branches?.name_th : apt.booking_branches?.name_en}
      </span>
      <div className={cn("h-2 w-2 rounded-full shrink-0", statusInfo.color.split(' ')[0])} />
    </button>
  );
}
