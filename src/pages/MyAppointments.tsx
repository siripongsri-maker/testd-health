import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Plus, Loader2, CheckCircle2,
  XCircle, AlertCircle, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  type FullAppointment,
  fetchUserAppointments,
  getDisplayServices,
  updateAppointmentStatusRPC,
  subscribeToAppointments,
} from '@/lib/appointments';

const STATUS_CONFIG: Record<string, { labelTh: string; labelEn: string; color: string; icon: typeof CheckCircle2 }> = {
  booked: { labelTh: 'จองแล้ว', labelEn: 'Booked', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: Calendar },
  confirmed: { labelTh: 'ยืนยันแล้ว', labelEn: 'Confirmed', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  in_progress: { labelTh: 'กำลังรับบริการ', labelEn: 'In Progress', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: Clock },
  completed: { labelTh: 'เสร็จสิ้น', labelEn: 'Completed', color: 'text-green-700 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  cancelled: { labelTh: 'ยกเลิก', labelEn: 'Cancelled', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: XCircle },
  no_show: { labelTh: 'ไม่มาตามนัด', labelEn: 'No Show', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30', icon: AlertCircle },
};

export default function MyAppointments() {
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<FullAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchUserAppointments(user.id);
    setAppointments(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime: subscribe to own appointments
  useEffect(() => {
    if (!user) return;

    const debounceTimer = { current: null as ReturnType<typeof setTimeout> | null };

    const handleUpdate = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        load();
      }, 500);
    };

    const unsubscribe = subscribeToAppointments(handleUpdate, {
      column: 'user_id',
      value: user.id,
    });

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [user, load]);

  const handleCancel = async (appointmentId: string) => {
    if (!user) return;
    setCancellingId(appointmentId);
    try {
      await updateAppointmentStatusRPC(appointmentId, 'cancelled', 'Cancelled by user');
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'cancelled', cancelled_at: new Date().toISOString() } : a)
      );
      toast.success(language === 'th' ? 'ยกเลิกนัดหมายแล้ว' : 'Appointment cancelled');
    } catch {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setCancellingId(null);
    }
  };

  const upcoming = appointments.filter(a => a.status === 'booked' || a.status === 'confirmed');
  const past = appointments.filter(a => a.status !== 'booked' && a.status !== 'confirmed');

  if (authLoading || loading) {
    return (
      <>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageContainer>
          <div className="text-center py-16 space-y-4">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">{language === 'th' ? 'กรุณาเข้าสู่ระบบ' : 'Please log in'}</h2>
            <Button onClick={() => navigate('/auth')}>{language === 'th' ? 'เข้าสู่ระบบ' : 'Log in'}</Button>
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  const renderAppointment = (apt: FullAppointment) => {
    const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.booked;
    const isExpanded = expandedId === apt.id;
    const canCancel = apt.status === 'booked' || apt.status === 'confirmed';
    const displayServices = getDisplayServices(apt);

    return (
      <Card key={apt.id} className="overflow-hidden">
        <button
          onClick={() => setExpandedId(isExpanded ? null : apt.id)}
          className="w-full p-4 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="text-2xl">{displayServices[0]?.icon || '🩺'}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground text-sm truncate">
                  {displayServices.map(s => language === 'th' ? s.name_th : s.name_en).join(', ')}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {language === 'th' ? apt.booking_branches?.name_th : apt.booking_branches?.name_en}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="flex items-center gap-1 text-foreground font-medium">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(apt.appointment_date), 'd MMM yyyy')}
                  </span>
                  <span className="flex items-center gap-1 text-foreground font-bold">
                    <Clock className="h-3 w-3" />
                    {(apt.start_time as string).slice(0, 5)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${status.color}`}>
                {language === 'th' ? status.labelTh : status.labelEn}
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {displayServices.length > 1 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{language === 'th' ? 'บริการ: ' : 'Services: '}</span>
                {displayServices.map((s, i) => (
                  <span key={i}>
                    {s.icon} {language === 'th' ? s.name_th : s.name_en}
                    {i < displayServices.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
            {apt.staff && (
              <div className="text-xs text-primary">
                <span className="font-medium">{language === 'th' ? 'ผู้ให้บริการ: ' : 'Attended by: '}</span>
                {language === 'th' ? apt.staff.name_th : apt.staff.name_en}
              </div>
            )}
            {apt.notes && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{language === 'th' ? 'หมายเหตุ: ' : 'Notes: '}</span>
                {apt.notes}
              </div>
            )}
            {apt.staff_notes && (
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <span className="font-medium">{language === 'th' ? 'หมายเหตุเจ้าหน้าที่: ' : 'Staff notes: '}</span>
                {apt.staff_notes}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {language === 'th' ? 'จองเมื่อ: ' : 'Booked: '}
              {format(parseISO(apt.created_at), 'd MMM yyyy HH:mm')}
            </div>
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                disabled={cancellingId === apt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(language === 'th' ? 'ยืนยันยกเลิกนัดหมาย?' : 'Cancel this appointment?')) {
                    handleCancel(apt.id);
                  }
                }}
                className="w-full"
              >
                {cancellingId === apt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                {language === 'th' ? 'ยกเลิกนัดหมาย' : 'Cancel Appointment'}
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <>
      <PageContainer>
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {language === 'th' ? '📋 นัดหมายของฉัน' : '📋 My Appointments'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {language === 'th' ? 'ดูและจัดการนัดหมาย' : 'View and manage your bookings'}
              </p>
            </div>
            <Button onClick={() => navigate('/booking')} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              {language === 'th' ? 'จองใหม่' : 'Book'}
            </Button>
          </div>

          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {language === 'th' ? 'นัดหมายที่จะถึง' : 'Upcoming'}
              </h2>
              {upcoming.map(renderAppointment)}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {language === 'th' ? 'ประวัติ' : 'History'}
              </h2>
              {past.map(renderAppointment)}
            </div>
          )}

          {appointments.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">
                {language === 'th' ? 'ยังไม่มีนัดหมาย' : 'No appointments yet'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'th' ? 'จองนัดหมายเพื่อตรวจสุขภาพหรือรับคำปรึกษาฟรี' : 'Book an appointment for free health testing or consultation'}
              </p>
              <Button onClick={() => navigate('/booking')} className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'th' ? 'จองนัดหมาย' : 'Book Now'}
              </Button>
            </div>
          )}

          <Card className="p-4 bg-primary/5 border-primary/20">
            <button onClick={() => navigate('/personal-info')} className="flex items-center gap-3 w-full text-left">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {language === 'th' ? 'อัปเดตข้อมูลส่วนตัว' : 'Update Personal Info'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'th'
                    ? 'อัปโหลดบัตรประชาชนล่วงหน้าเพื่อลดขั้นตอนการลงทะเบียน'
                    : 'Upload your ID card in advance for faster registration'}
                </p>
              </div>
            </button>
          </Card>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
