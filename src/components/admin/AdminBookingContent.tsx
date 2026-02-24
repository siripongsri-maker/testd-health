import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Clock, MapPin, Loader2, RefreshCcw, Wifi, WifiOff, MessageSquarePlus, Search, Hash
} from 'lucide-react';
import { format } from 'date-fns';
import {
  type FullAppointment,
  fetchStaffAppointments,
  getDisplayServices,
  updateAppointmentStatusRPC,
  addStaffNoteRPC,
  subscribeToAppointments,
  enrichAppointments,
} from '@/lib/appointments';

interface Props {
  userBranch: string | null;
}

const STATUS_OPTIONS = [
  { value: 'booked', labelTh: 'จองแล้ว', labelEn: 'Booked' },
  { value: 'confirmed', labelTh: 'ยืนยันแล้ว', labelEn: 'Confirmed' },
  { value: 'in_progress', labelTh: 'กำลังรับบริการ', labelEn: 'In Progress' },
  { value: 'completed', labelTh: 'เสร็จสิ้น', labelEn: 'Completed' },
  { value: 'no_show', labelTh: 'ไม่มาตามนัด', labelEn: 'No Show' },
  { value: 'cancelled', labelTh: 'ยกเลิก', labelEn: 'Cancelled' },
];

interface BranchOption {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
}

export default function AdminBookingContent({ userBranch }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<FullAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // Load branches
  useEffect(() => {
    supabase
      .from('booking_branches')
      .select('id, slug, name_th, name_en')
      .eq('is_active', true)
      .order('name_en')
      .then(({ data }) => {
        if (data) setBranches(data);
        // If moderator, auto-select their branch
        if (userBranch && data) {
          const match = data.find(b => b.slug === userBranch);
          if (match) setBranchFilter(match.id);
        }
      });
  }, [userBranch]);

  const load = useCallback(async () => {
    setLoading(true);
    if (searchMode && codeSearch.trim()) {
      let query = supabase
        .from('appointments')
        .select('*, booking_branches(name_th, name_en, slug), booking_services(name_th, name_en, icon)')
        .ilike('referral_code', `%${codeSearch.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (branchFilter !== 'all') {
        query = query.eq('branch_id', branchFilter);
      }
      const { data } = await query;
      const enriched = await enrichAppointments(data as any || []);
      setAppointments(enriched);
    } else {
      const data = await fetchStaffAppointments(dateFilter, statusFilter, branchFilter !== 'all' ? branchFilter : undefined);
      setAppointments(data);
    }
    setLoading(false);
    lastUpdateRef.current = Date.now();
  }, [dateFilter, statusFilter, branchFilter, searchMode, codeSearch]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const debounceTimer = { current: null as ReturnType<typeof setTimeout> | null };

    const handleUpdate = () => {
      // Debounce: don't re-fetch more than once per second
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        load();
        toast.info(
          language === 'th' ? '📡 นัดหมายอัปเดตแล้ว' : '📡 Appointments updated',
          { duration: 2000 }
        );
      }, 500);
    };

    const unsubscribe = subscribeToAppointments(handleUpdate);
    setIsLive(true);

    return () => {
      unsubscribe();
      setIsLive(false);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [user, load, language]);

  const updateStatus = async (id: string, newStatus: string) => {
    if (!user) return;
    setUpdatingId(id);
    try {
      await updateAppointmentStatusRPC(id, newStatus);
      toast.success(language === 'th' ? 'อัปเดตแล้ว' : 'Updated');
      // Optimistic: update locally until realtime confirms
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: newStatus, updated_at: new Date().toISOString() } : a)
      );
    } catch {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddNote = async (appointmentId: string) => {
    const note = noteInput[appointmentId]?.trim();
    if (!note) return;
    setAddingNote(true);
    try {
      await addStaffNoteRPC(appointmentId, note);
      toast.success(language === 'th' ? 'เพิ่มหมายเหตุแล้ว' : 'Note added');
      setNoteInput(prev => ({ ...prev, [appointmentId]: '' }));
      setShowNoteFor(null);
      load(); // refresh to see new note
    } catch {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error');
    } finally {
      setAddingNote(false);
    }
  };

  const todayCount = appointments.filter(a => a.status !== 'cancelled').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Branch tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <Button
          variant={branchFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBranchFilter('all')}
          className="shrink-0"
        >
          {language === 'th' ? 'ทุกสาขา' : 'All'}
        </Button>
        {branches.map(b => (
          <Button
            key={b.id}
            variant={branchFilter === b.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBranchFilter(b.id)}
            className="shrink-0"
          >
            {language === 'th' ? b.name_th : b.name_en}
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{todayCount}</p>
            <p className="text-xs text-muted-foreground">{language === 'th' ? 'นัดหมายวันนี้' : "Today's Appointments"}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{completedCount}</p>
            <p className="text-xs text-muted-foreground">{language === 'th' ? 'เสร็จสิ้น' : 'Completed'}</p>
          </Card>
        </div>
      </div>

      {/* Referral code search */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={codeSearch}
            onChange={(e) => {
              setCodeSearch(e.target.value);
              setSearchMode(e.target.value.trim().length > 0);
            }}
            placeholder={language === 'th' ? 'ค้นหารหัสจอง SWG-...' : 'Search booking code SWG-...'}
            className="pl-9"
          />
        </div>
        {searchMode && (
          <Button variant="ghost" size="sm" onClick={() => { setCodeSearch(''); setSearchMode(false); }}>
            {language === 'th' ? 'ล้าง' : 'Clear'}
          </Button>
        )}
      </div>

      {/* Filters + live badge */}
      {!searchMode && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'th' ? 'ทั้งหมด' : 'All'}</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{language === 'th' ? s.labelTh : s.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isLive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
            {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isLive ? 'Live' : 'Offline'}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {language === 'th' ? 'ไม่มีนัดหมายในวันนี้' : 'No appointments for this date'}
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map(apt => {
            const displayServices = getDisplayServices(apt);

            return (
              <Card key={apt.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-lg">{displayServices[0]?.icon || '🩺'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {displayServices.map(s => language === 'th' ? s.name_th : s.name_en).join(', ')}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span className="font-bold">{(apt.start_time as string).slice(0, 5)}</span>
                        <MapPin className="h-3 w-3" />
                        <span>{language === 'th' ? apt.booking_branches?.name_th : apt.booking_branches?.name_en}</span>
                      </div>
                      {apt.referral_code && (
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          <Hash className="h-3 w-3 text-primary" />
                          <span className="font-mono font-bold text-primary">{apt.referral_code}</span>
                        </div>
                      )}
                      {apt.staff && (
                        <p className="text-xs text-primary mt-0.5">
                          👤 {language === 'th' ? apt.staff.name_th : apt.staff.name_en}
                        </p>
                      )}
                      {apt.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{apt.notes}"</p>}
                      {apt.staff_notes && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          📝 {apt.staff_notes.split('\n---\n').pop()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Select
                      value={apt.status}
                      onValueChange={(val) => updateStatus(apt.id, val)}
                      disabled={updatingId === apt.id}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{language === 'th' ? s.labelTh : s.labelEn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setShowNoteFor(showNoteFor === apt.id ? null : apt.id)}
                    >
                      <MessageSquarePlus className="h-3 w-3" />
                      {language === 'th' ? 'โน้ต' : 'Note'}
                    </Button>
                  </div>
                </div>

                {/* Staff note input */}
                {showNoteFor === apt.id && (
                  <div className="mt-2 flex gap-2">
                    <Textarea
                      value={noteInput[apt.id] || ''}
                      onChange={(e) => setNoteInput(prev => ({ ...prev, [apt.id]: e.target.value }))}
                      placeholder={language === 'th' ? 'เพิ่มหมายเหตุ...' : 'Add note...'}
                      className="text-xs min-h-[60px]"
                      maxLength={2000}
                    />
                    <Button
                      size="sm"
                      disabled={addingNote || !(noteInput[apt.id]?.trim())}
                      onClick={() => handleAddNote(apt.id)}
                    >
                      {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : (language === 'th' ? 'บันทึก' : 'Save')}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
