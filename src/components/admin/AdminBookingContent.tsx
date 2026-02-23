import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Calendar, Clock, MapPin, Loader2,
  RefreshCcw
} from 'lucide-react';
import { format } from 'date-fns';

interface AppointmentRow {
  id: string;
  user_id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  staff_notes: string | null;
  created_at: string;
  booking_branches: { name_th: string; name_en: string; slug: string } | null;
  booking_services: { name_th: string; name_en: string; icon: string } | null;
}

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

export default function AdminBookingContent({ userBranch }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Multi-service map
  const [servicesMap, setServicesMap] = useState<Record<string, { name_th: string; name_en: string; icon: string }[]>>({});

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('appointments')
      .select(`*, booking_branches(name_th, name_en, slug), booking_services(name_th, name_en, icon)`)
      .eq('appointment_date', dateFilter)
      .order('start_time');

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    const rows = (data || []) as unknown as AppointmentRow[];
    setAppointments(rows);

    // Load multi-service data
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const { data: asData } = await supabase
        .from('appointment_services')
        .select('appointment_id, booking_services(name_th, name_en, icon)')
        .in('appointment_id', ids);

      const map: Record<string, { name_th: string; name_en: string; icon: string }[]> = {};
      (asData || []).forEach((row: any) => {
        const aid = row.appointment_id;
        if (!map[aid]) map[aid] = [];
        if (row.booking_services) map[aid].push(row.booking_services);
      });
      setServicesMap(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [dateFilter, statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    if (!user) return;
    setUpdatingId(id);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      if (newStatus === 'cancelled') updates.cancelled_at = new Date().toISOString();

      const { error } = await supabase.from('appointments').update(updates).eq('id', id);
      if (error) throw error;

      await supabase.from('appointment_logs').insert({
        appointment_id: id,
        action: `status_changed_to_${newStatus}`,
        performed_by: user.id,
        details: `Staff changed status to ${newStatus}`,
      });

      toast.success(language === 'th' ? 'อัปเดตแล้ว' : 'Updated');
      load();
    } catch {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error');
    } finally {
      setUpdatingId(null);
    }
  };

  const todayCount = appointments.filter(a => a.status !== 'cancelled').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{todayCount}</p>
          <p className="text-xs text-muted-foreground">{language === 'th' ? 'นัดหมายวันนี้' : "Today's Appointments"}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          <p className="text-xs text-muted-foreground">{language === 'th' ? 'เสร็จสิ้น' : 'Completed'}</p>
        </Card>
      </div>

      <div className="flex gap-2">
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
      </div>

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
            const multiSvcs = servicesMap[apt.id] || [];
            const displayServices = multiSvcs.length > 0 ? multiSvcs : (apt.booking_services ? [apt.booking_services] : []);

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
                      {apt.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{apt.notes}"</p>}
                    </div>
                  </div>
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
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
