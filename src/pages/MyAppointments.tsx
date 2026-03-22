import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Plus, Loader2, CheckCircle2,
  XCircle, AlertCircle, ChevronDown, ChevronUp, FileText, Hash, Copy,
  LogIn, LogOut, Star, Timer,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  type FullAppointment,
  fetchUserAppointments,
  getDisplayServices,
  updateAppointmentStatusRPC,
  subscribeToAppointments,
  selfCheckinRPC,
  selfCheckoutRPC,
} from '@/lib/appointments';
import { VisitProgressCard } from '@/components/VisitProgressCard';

const STATUS_CONFIG: Record<string, { labelTh: string; labelEn: string; color: string; icon: typeof CheckCircle2 }> = {
  booked: { labelTh: 'จองแล้ว', labelEn: 'Booked', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: Calendar },
  confirmed: { labelTh: 'ยืนยันแล้ว', labelEn: 'Confirmed', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  arrived: { labelTh: 'เช็คอินแล้ว', labelEn: 'Checked In', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: LogIn },
  in_progress: { labelTh: 'กำลังรับบริการ', labelEn: 'In Progress', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: Clock },
  completed: { labelTh: 'บริการเสร็จสิ้น', labelEn: 'Service Completed', color: 'text-green-700 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  checked_out: { labelTh: 'เสร็จสิ้น', labelEn: 'Completed', color: 'text-green-700 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  cancelled: { labelTh: 'ยกเลิก', labelEn: 'Cancelled', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: XCircle },
  no_show: { labelTh: 'ไม่มาตามนัด', labelEn: 'No Show', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30', icon: AlertCircle },
};

const ACTIVE_STATUSES = new Set(['booked', 'confirmed', 'arrived']);

export default function MyAppointments() {
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<FullAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [checkinLoadingId, setCheckinLoadingId] = useState<string | null>(null);

  // Check-out dialog state
  const [checkoutApt, setCheckoutApt] = useState<FullAppointment | null>(null);
  const [checkoutCode, setCheckoutCode] = useState('');
  const [checkoutRating, setCheckoutRating] = useState<number | null>(null);
  const [checkoutFeedback, setCheckoutFeedback] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    if (user.email) {
      await supabase.rpc('claim_anonymous_appointments', {
        p_user_id: user.id,
        p_email: user.email,
      });
    }
    const data = await fetchUserAppointments(user.id);
    setAppointments(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const debounceTimer = { current: null as ReturnType<typeof setTimeout> | null };
    const handleUpdate = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => load(), 500);
    };
    const unsubscribe = subscribeToAppointments(handleUpdate, { column: 'user_id', value: user.id });
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

  const handleCheckin = async (appointmentId: string) => {
    setCheckinLoadingId(appointmentId);
    try {
      await selfCheckinRPC(appointmentId);
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: 'arrived', arrived_at: new Date().toISOString() } : a)
      );
      // Award 500 XP for self check-in
      if (user) {
        await supabase.rpc('award_xp_to_user', { target_user_id: user.id, xp_amount: 500 });
      }
      toast.success(language === 'th' ? 'เช็คอินเรียบร้อยแล้ว ✅ กรุณารอเจ้าหน้าที่เรียก' : 'Checked in ✅ Please wait to be called');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Too early')) {
        toast.error(language === 'th' ? 'ยังเร็วเกินไป กรุณากลับมาใกล้เวลานัด' : 'Too early to check in');
      } else if (msg.includes('expired')) {
        toast.error(language === 'th' ? 'หมดเวลาเช็คอินแล้ว' : 'Check-in window expired');
      } else {
        toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
      }
    } finally {
      setCheckinLoadingId(null);
    }
  };

  const handleCheckout = async () => {
    if (!checkoutApt) return;
    setCheckoutLoading(true);
    try {
      await selfCheckoutRPC(checkoutApt.id, checkoutCode, checkoutRating, checkoutFeedback || null);
      setAppointments(prev =>
        prev.map(a => a.id === checkoutApt.id ? { ...a, status: 'checked_out', checked_out_at: new Date().toISOString() } : a)
      );
      // Award 500 XP for self check-out
      if (user) {
        await supabase.rpc('award_xp_to_user', { target_user_id: user.id, xp_amount: 500 });
        // Award bonus 500 XP if they gave a rating AND wrote feedback
        if (checkoutRating && checkoutFeedback.trim()) {
          await supabase.rpc('award_xp_to_user', { target_user_id: user.id, xp_amount: 500 });
        }
      }
      toast.success('ขอบคุณที่ใช้บริการ 💜');
      setCheckoutApt(null);
      setCheckoutCode('');
      setCheckoutRating(null);
      setCheckoutFeedback('');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('code does not match')) {
        toast.error(language === 'th' ? 'รหัสนัดหมายไม่ตรง' : 'Referral code does not match');
      } else {
        toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const upcoming = appointments.filter(a => ACTIVE_STATUSES.has(a.status));
  const past = appointments.filter(a => !ACTIVE_STATUSES.has(a.status));

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

  // Bangkok time helper
  const getBangkokNow = () => {
    const now = new Date();
    // Get Bangkok offset: UTC+7
    const bangkokOffset = 7 * 60; // minutes
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + bangkokOffset * 60000);
  };

  const getCheckinEligibility = (apt: FullAppointment): { canCheckin: boolean; canCheckout: boolean; helperText?: string; helperTextEn?: string } => {
    const bangkokNow = getBangkokNow();
    const todayStr = bangkokNow.toISOString().slice(0, 10);
    const isToday = apt.appointment_date === todayStr;

    // Check-out: arrived/in_progress/completed status, today
    if (['arrived', 'in_progress', 'completed'].includes(apt.status) && isToday) {
      return { canCheckin: false, canCheckout: true };
    }

    // Check-in: only booked/confirmed
    if (apt.status !== 'booked' && apt.status !== 'confirmed') {
      return { canCheckin: false, canCheckout: false };
    }

    if (!isToday) {
      // Future date
      if (apt.appointment_date > todayStr) {
        return {
          canCheckin: false,
          canCheckout: false,
          helperText: 'สามารถเช็คอินได้ในวันนัดหมาย ก่อนเวลานัด 1 ชม.',
          helperTextEn: 'Check-in opens on appointment day, 1 hour before your time',
        };
      }
      return { canCheckin: false, canCheckout: false };
    }

    // Today - check time window (-60min to +30min)
    const [h, m] = (apt.start_time as string).split(':').map(Number);
    const aptTime = new Date(bangkokNow);
    aptTime.setHours(h, m, 0, 0);

    const windowStart = new Date(aptTime.getTime() - 60 * 60000);
    const windowEnd = new Date(aptTime.getTime() + 30 * 60000);

    if (bangkokNow < windowStart) {
      const minsLeft = Math.ceil((windowStart.getTime() - bangkokNow.getTime()) / 60000);
      return {
        canCheckin: false,
        canCheckout: false,
        helperText: `เช็คอินเปิดอีก ${minsLeft} นาที (ก่อนเวลานัด 1 ชม.)`,
        helperTextEn: `Check-in opens in ${minsLeft} min (1 hour before appointment)`,
      };
    }

    if (bangkokNow > windowEnd) {
      return {
        canCheckin: false,
        canCheckout: false,
        helperText: 'หมดเวลาเช็คอินแล้ว',
        helperTextEn: 'Check-in window has expired',
      };
    }

    return { canCheckin: true, canCheckout: false };
  };

  const renderAppointment = (apt: FullAppointment) => {
    const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.booked;
    const isExpanded = expandedId === apt.id;
    const canCancel = apt.status === 'booked' || apt.status === 'confirmed';
    const eligibility = getCheckinEligibility(apt);
    const { canCheckin, canCheckout } = eligibility;
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
            {/* Referral code - always prominent */}
            {apt.referral_code && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
                <Hash className="h-5 w-5 text-primary shrink-0" />
                <span className="font-mono font-bold text-primary text-lg tracking-wider">{apt.referral_code}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(apt.referral_code!);
                    toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied!');
                  }}
                  className="ml-auto text-muted-foreground hover:text-primary transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Helper text for booked/confirmed */}
            {(apt.status === 'booked' || apt.status === 'confirmed') && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                {canCheckin ? (
                  <>
                    เมื่อมาถึงคลินิก ให้กดเช็คอิน และแสดงรหัสนี้ให้เจ้าหน้าที่
                    <br />
                    <span className="text-[10px] opacity-70">(When you arrive, tap Check-in and show this code to staff)</span>
                  </>
                ) : eligibility.helperText ? (
                  <>
                    ⏰ {eligibility.helperText}
                    <br />
                    <span className="text-[10px] opacity-70">({eligibility.helperTextEn})</span>
                  </>
                ) : (
                  <>
                    เมื่อมาถึงคลินิก ให้กดเช็คอิน และแสดงรหัสนี้ให้เจ้าหน้าที่
                    <br />
                    <span className="text-[10px] opacity-70">(When you arrive, tap Check-in and show this code to staff)</span>
                  </>
                )}
              </p>
            )}

            {/* Arrived status helper */}
            {apt.status === 'arrived' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  ✅ เช็คอินแล้ว • กำลังรอ
                  <span className="text-xs opacity-70 ml-1">(Checked in • Waiting)</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  หากมีปัญหา กรุณาติดต่อจุดลงทะเบียน
                </p>
              </div>
            )}

            {/* Visit Progress Card — detailed journey for arrived/in_progress */}
            {user && (apt.status === 'arrived' || apt.status === 'in_progress') && (
              <VisitProgressCard
                userId={user.id}
                appointmentId={apt.id}
                branchId={apt.branch_id}
              />
            )}

            {/* Service completed — auto checkout notice */}
            {apt.status === 'completed' && !apt.checked_out_at && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center space-y-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  ✅ บริการเสร็จสิ้นแล้ว
                </p>
                <p className="text-xs text-muted-foreground">
                  ระบบจะเช็คเอาท์ให้อัตโนมัติภายใน 1 ชั่วโมง หรือกดเช็คเอาท์เองได้เลย
                </p>
                <p className="text-[10px] text-muted-foreground opacity-70">
                  (Service completed. Auto checkout in ~1 hour, or check out now)
                </p>
              </div>
            )}

            {/* Checked out / completed info */}
            {apt.status === 'checked_out' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center space-y-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  💜 ขอบคุณที่ใช้บริการ
                </p>
                {apt.duration_minutes != null && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Timer className="h-3 w-3" />
                    {language === 'th' ? `ระยะเวลา: ${apt.duration_minutes} นาที` : `Duration: ${apt.duration_minutes} min`}
                  </p>
                )}
                {apt.rating != null && (
                  <div className="flex items-center justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= apt.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {/* === ACTION BUTTONS === */}
            <div className="space-y-2 pt-1">
              {/* Check-in button */}
              {canCheckin && (
                <Button
                  size="lg"
                  disabled={checkinLoadingId === apt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckin(apt.id);
                  }}
                  className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  {checkinLoadingId === apt.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogIn className="h-5 w-5" />
                  )}
                  เช็คอิน (Check-in)
                </Button>
              )}

              {/* Check-out button */}
              {canCheckout && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCheckoutApt(apt);
                    setCheckoutCode('');
                    setCheckoutRating(null);
                    setCheckoutFeedback('');
                  }}
                  className="w-full h-14 text-base font-bold border-primary text-primary gap-2"
                >
                  <LogOut className="h-5 w-5" />
                  เช็คเอาท์ (Check-out)
                </Button>
              )}

              {/* Cancel button */}
              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cancellingId === apt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(language === 'th' ? 'ยืนยันยกเลิกนัดหมาย?' : 'Cancel this appointment?')) {
                      handleCancel(apt.id);
                    }
                  }}
                  className="w-full text-destructive hover:text-destructive"
                >
                  {cancellingId === apt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  {language === 'th' ? 'ยกเลิกนัดหมาย' : 'Cancel Appointment'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const checkoutCodeValid = checkoutApt?.referral_code
    ? checkoutCode.trim().toUpperCase() === checkoutApt.referral_code.trim().toUpperCase()
    : false;

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

      {/* Check-out Confirmation Dialog */}
      <Dialog open={!!checkoutApt} onOpenChange={(open) => !open && setCheckoutApt(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              เช็คเอาท์ <span className="text-sm font-normal opacity-70">(Check-out)</span>
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              ยืนยันการเช็คเอาท์โดยกรอกรหัสนัดหมาย
            </DialogDescription>
          </DialogHeader>

          {checkoutApt && (
            <div className="space-y-4">
              {/* Appointment summary */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{language === 'th' ? checkoutApt.booking_branches?.name_th : checkoutApt.booking_branches?.name_en}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{format(parseISO(checkoutApt.appointment_date), 'd MMM yyyy')}</span>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                  <span className="font-bold">{(checkoutApt.start_time as string).slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono font-bold text-primary">{checkoutApt.referral_code}</span>
                </div>
              </div>

              {/* Code confirmation */}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  กรุณากรอกรหัสนัดหมายเพื่อยืนยัน
                  <span className="text-xs opacity-60 ml-1">(Enter referral code)</span>
                </label>
                <Input
                  placeholder="SWG-XXXXXX"
                  value={checkoutCode}
                  onChange={(e) => setCheckoutCode(e.target.value.toUpperCase())}
                  className="font-mono text-center text-lg tracking-wider"
                  autoComplete="off"
                />
              </div>

              {/* Optional rating */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  ให้คะแนนบริการ <span className="text-xs opacity-60">(ไม่บังคับ / Optional)</span>
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => setCheckoutRating(checkoutRating === s ? null : s)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star className={`h-8 w-8 ${checkoutRating != null && s <= checkoutRating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional feedback */}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  ความคิดเห็น <span className="text-xs opacity-60">(ไม่บังคับ / Optional)</span>
                </label>
                <Textarea
                  placeholder="แสดงความคิดเห็นแบบไม่ระบุตัวตน..."
                  value={checkoutFeedback}
                  onChange={(e) => setCheckoutFeedback(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Confirm button */}
              <Button
                size="lg"
                disabled={!checkoutCodeValid || checkoutLoading}
                onClick={handleCheckout}
                className="w-full h-14 text-base font-bold gap-2"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                ยืนยันเช็คเอาท์
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
