import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Loader2, RefreshCcw, Wifi, WifiOff, Search, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import {
  type FullAppointment,
  fetchStaffAppointments,
  enrichAppointments,
  subscribeToAppointments,
} from '@/lib/appointments';
import { BentoDashboard } from './booking/BentoDashboard';
import { BranchTimeline } from './booking/BranchTimeline';
import { TimeBlockDrawer } from './booking/TimeBlockDrawer';
import { CalendarView } from './booking/CalendarView';
import { BookingAnalyticsPanel } from './booking/BookingAnalyticsPanel';
import { AppointmentDetailDrawer } from './booking/AppointmentDetailDrawer';
import type { EnrichedAppointment, DensityDay, BranchOption, ViewMode } from './booking/types';
import { STATUS_OPTIONS } from './booking/types';

interface Props {
  userBranch: string | null;
}

export default function AdminBookingContent({ userBranch }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<EnrichedAppointment[]>([]);
  const [density, setDensity] = useState<DensityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [returningFilter, setReturningFilter] = useState<string>('all');
  const [codeSearch, setCodeSearch] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('bento');
  const [isLive, setIsLive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerApt, setDrawerApt] = useState<EnrichedAppointment | null>(null);

  // Drill-down state
  const [drillBranchId, setDrillBranchId] = useState<string | null>(null);
  const [timeBlockRange, setTimeBlockRange] = useState<string | null>(null);

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Load branches
  useEffect(() => {
    supabase
      .from('booking_branches')
      .select('id, slug, name_th, name_en, counselor_count, hero_image_url, google_place_id, google_maps_url, google_rating, google_review_count, google_photo_url')
      .eq('is_active', true)
      .order('name_en')
      .then(({ data }) => {
        if (data) setBranches(data);
        if (userBranch && data) {
          const match = data.find(b => b.slug === userBranch);
          if (match) setBranchFilter(match.id);
        }
      });
  }, [userBranch]);

  // Load density
  const loadDensity = useCallback(async () => {
    let startDate: string, endDate: string;
    if (viewMode === 'calendar') {
      startDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
      endDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${lastDay}`;
    } else {
      const ws = startOfWeek(new Date(dateFilter), { weekStartsOn: 1 });
      const we = endOfWeek(new Date(dateFilter), { weekStartsOn: 1 });
      startDate = format(ws, 'yyyy-MM-dd');
      endDate = format(we, 'yyyy-MM-dd');
    }

    const { data } = await supabase.rpc('get_appointment_density', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_branch_id: branchFilter !== 'all' ? branchFilter : null,
    });
    setDensity((data as DensityDay[]) || []);
  }, [dateFilter, branchFilter, viewMode, calMonth, calYear]);

  // Load appointments
  const load = useCallback(async () => {
    setLoading(true);
    let rows: FullAppointment[];

    if (searchMode && codeSearch.trim()) {
      const term = codeSearch.trim();
      // Search by referral code, email, or phone
      let query = supabase
        .from('appointments')
        .select('*, booking_branches(name_th, name_en, slug), booking_services(name_th, name_en, icon)')
        .or(`referral_code.ilike.%${term}%,contact_email.ilike.%${term}%,contact_phone.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (branchFilter !== 'all') query = query.eq('branch_id', branchFilter);
      const { data } = await query;
      rows = await enrichAppointments((data as any) || []);
    } else {
      rows = await fetchStaffAppointments(dateFilter, statusFilter, branchFilter !== 'all' ? branchFilter : undefined);
    }

    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const { data: flags } = await supabase.rpc('get_returning_flags', { p_appointment_ids: ids });
      const flagMap: Record<string, boolean> = {};
      ((flags as any[]) || []).forEach((f: any) => { flagMap[f.appointment_id] = f.is_returning; });
      const enriched: EnrichedAppointment[] = rows.map(r => ({
        ...r,
        is_returning: flagMap[r.id] || false,
      }));

      let filtered = enriched;
      if (returningFilter === 'new') filtered = enriched.filter(a => !a.is_returning);
      else if (returningFilter === 'returning') filtered = enriched.filter(a => a.is_returning);

      setAppointments(filtered);
    } else {
      setAppointments([]);
    }

    setLoading(false);
  }, [dateFilter, statusFilter, branchFilter, searchMode, codeSearch, returningFilter]);

  useEffect(() => { load(); loadDensity(); }, [load, loadDensity]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const debounce = { current: null as ReturnType<typeof setTimeout> | null };
    const handleUpdate = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        load();
        loadDensity();
        toast.info(language === 'th' ? '📡 อัปเดตแล้ว' : '📡 Updated', { duration: 2000 });
      }, 500);
    };
    const unsubscribe = subscribeToAppointments(handleUpdate);
    setIsLive(true);
    return () => { unsubscribe(); setIsLive(false); if (debounce.current) clearTimeout(debounce.current); };
  }, [user, load, loadDensity, language]);

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(appointments.map(a => a.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleCalDateSelect = (date: string) => {
    setDateFilter(date);
    setViewMode('bento');
    setDrillBranchId(null);
  };

  const handleRefresh = () => { load(); loadDensity(); };

  // Is in drill-down mode?
  const inDrillDown = drillBranchId !== null;

  return (
    <div className="space-y-3">
      {/* Top bar: branch tabs + controls */}
      {!inDrillDown && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {!userBranch && (
              <Button variant={branchFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setBranchFilter('all')} className="shrink-0">
                {language === 'th' ? 'ทุกสาขา' : 'All'}
              </Button>
            )}
            {branches.map(b => {
              // If user has a branch, only show their branch
              if (userBranch && b.slug !== userBranch) return null;
              return (
                <Button key={b.id} variant={branchFilter === b.id ? 'default' : 'outline'} size="sm" onClick={() => setBranchFilter(b.id)} className="shrink-0">
                  {language === 'th' ? b.name_th : b.name_en}
                </Button>
              );
            })}
          </div>

          {/* View toggle + search + filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-lg border border-border/40 overflow-hidden">
              <button
                onClick={() => { setViewMode('bento'); setDrillBranchId(null); }}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${viewMode === 'bento' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {language === 'th' ? 'ภาพรวม' : 'Overview'}
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {language === 'th' ? 'ปฏิทิน' : 'Calendar'}
              </button>
              <button
                onClick={() => { setViewMode('analytics' as any); setDrillBranchId(null); }}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${(viewMode as any) === 'analytics' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {language === 'th' ? 'วิเคราะห์' : 'Insights'}
              </button>
            </div>

            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={codeSearch}
                onChange={(e) => { setCodeSearch(e.target.value); setSearchMode(e.target.value.trim().length > 0); }}
                placeholder={language === 'th' ? 'ค้นหา SWG- / อีเมล / เบอร์โทร' : 'Search SWG- / email / phone'}
                className="pl-8 h-8 text-xs"
              />
            </div>
            {searchMode && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setCodeSearch(''); setSearchMode(false); }}>
                {language === 'th' ? 'ล้าง' : 'Clear'}
              </Button>
            )}
          </div>

          {/* Date + status filters */}
          {viewMode === 'bento' && !searchMode && (
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'th' ? 'ทั้งหมด' : 'All'}</SelectItem>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{language === 'th' ? s.labelTh : s.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={returningFilter} onValueChange={setReturningFilter}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'th' ? 'ทั้งหมด' : 'All'}</SelectItem>
                  <SelectItem value="new">{language === 'th' ? 'ใหม่' : 'New'}</SelectItem>
                  <SelectItem value="returning">{language === 'th' ? 'กลับมา' : 'Return'}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRefresh}>
                <RefreshCcw className="h-3.5 w-3.5" />
              </Button>
              <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full ${isLive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isLive ? 'Live' : 'Offline'}
              </div>
            </div>
          )}

          {/* Calendar nav */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2 justify-center">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                const d = subMonths(new Date(calYear, calMonth), 1);
                setCalMonth(d.getMonth()); setCalYear(d.getFullYear());
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {new Date(calYear, calMonth).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                const d = addMonths(new Date(calYear, calMonth), 1);
                setCalMonth(d.getMonth()); setCalYear(d.getFullYear());
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Main content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : inDrillDown ? (
        <BranchTimeline
          branchId={drillBranchId!}
          branches={branches}
          appointments={appointments}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onClickAppointment={setDrawerApt}
          onBack={() => setDrillBranchId(null)}
          onRefresh={handleRefresh}
        />
      ) : (viewMode as any) === 'analytics' ? (
        <BookingAnalyticsPanel branches={branches} branchFilter={branchFilter} />
      ) : viewMode === 'calendar' ? (
        <CalendarView
          year={calYear}
          month={calMonth}
          density={density}
          selectedDate={dateFilter}
          onSelectDate={handleCalDateSelect}
        />
      ) : (
        <BentoDashboard
          appointments={appointments}
          branches={branches}
          density={density}
          selectedDate={dateFilter}
          onDrillBranch={setDrillBranchId}
          onDrillTimeBlock={setTimeBlockRange}
          onClickAppointment={setDrawerApt}
          onRefresh={handleRefresh}
        />
      )}

      {/* Time block drawer */}
      <TimeBlockDrawer
        open={!!timeBlockRange}
        timeRange={timeBlockRange || ''}
        appointments={appointments}
        branches={branches}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onClickAppointment={(apt) => { setTimeBlockRange(null); setDrawerApt(apt); }}
        onClose={() => setTimeBlockRange(null)}
        onRefresh={handleRefresh}
      />

      {/* Detail drawer */}
      <AppointmentDetailDrawer
        appointment={drawerApt}
        onClose={() => setDrawerApt(null)}
        onRefresh={() => { handleRefresh(); setDrawerApt(null); }}
      />
    </div>
  );
}
