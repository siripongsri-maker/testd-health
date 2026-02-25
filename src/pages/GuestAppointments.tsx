import { useState, useEffect, useRef } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Loader2, Hash, Copy, Search,
  CheckCircle2, XCircle, AlertCircle, Share2, Smartphone, Trash2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface GuestAppointment {
  appointment_id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  referral_code: string;
  branch_name_th: string;
  branch_name_en: string;
  branch_slug: string;
  services_summary: string;
  created_at: string;
}

interface SavedGuestAppointment {
  appointment_id: string;
  referral_code: string;
  created_at: string;
  branch_name_th: string;
  branch_name_en: string;
  appointment_date: string;
  start_time: string;
}

const STORAGE_KEY = 'guest_appointments_v1';

const STATUS_CONFIG: Record<string, { labelTh: string; labelEn: string; color: string; icon: typeof CheckCircle2 }> = {
  booked: { labelTh: 'จองแล้ว', labelEn: 'Booked', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: Calendar },
  confirmed: { labelTh: 'ยืนยันแล้ว', labelEn: 'Confirmed', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  arrived: { labelTh: 'เช็คอินแล้ว', labelEn: 'Checked In', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: Clock },
  in_progress: { labelTh: 'กำลังรับบริการ', labelEn: 'In Progress', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: Clock },
  completed: { labelTh: 'เสร็จสิ้น', labelEn: 'Completed', color: 'text-green-700 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  cancelled: { labelTh: 'ยกเลิก', labelEn: 'Cancelled', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: XCircle },
  no_show: { labelTh: 'ไม่มาตามนัด', labelEn: 'No Show', color: 'text-muted-foreground bg-muted', icon: AlertCircle },
};

function getSavedAppointments(): SavedGuestAppointment[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function GuestAppointments() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const didAutoLoad = useRef(false);

  const [identifier, setIdentifier] = useState('');
  const [appointments, setAppointments] = useState<GuestAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedGuestAppointment[]>([]);

  // Load saved appointments from localStorage
  useEffect(() => {
    setSavedItems(getSavedAppointments());
  }, []);

  // Auto-load from ?token= on mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && !didAutoLoad.current) {
      didAutoLoad.current = true;
      setIdentifier(token);
      handleLookup(token);
    }
  }, [searchParams]);

  const handleLookup = async (value?: string) => {
    const q = (value ?? identifier).trim();
    if (!q) {
      setErrorMsg(language === 'th' ? 'กรุณากรอกอีเมลหรือรหัสนัดหมาย' : 'Please enter email or booking code');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSearched(true);

    try {
      const { data, error } = await supabase.rpc('guest_universal_lookup', {
        p_identifier: q,
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('rate_limit')) {
          setErrorMsg(language === 'th'
            ? 'คุณลองค้นหาหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'
            : 'Too many attempts. Please wait 15 minutes and try again.');
        } else if (msg.includes('expired')) {
          setErrorMsg(language === 'th'
            ? 'ลิงก์นี้หมดอายุแล้ว กรุณาใช้ "อีเมล" หรือ "รหัสนัดหมาย" เพื่อค้นหา'
            : 'This link has expired. Please use your email or booking code.');
        } else {
          setErrorMsg(language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Something went wrong. Please try again.');
        }
        setAppointments([]);
        return;
      }

      const results = (data as unknown as GuestAppointment[]) || [];
      setAppointments(results);

      if (results.length === 0 && searchParams.get('token')) {
        setErrorMsg(language === 'th'
          ? 'ลิงก์นี้หมดอายุแล้ว กรุณาใช้ "อีเมล" หรือ "รหัสนัดหมาย" เพื่อค้นหา'
          : 'This link has expired. Please use your email or booking code.');
      }
    } catch {
      setErrorMsg(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied!');
  };

  const shareLink = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: language === 'th' ? 'นัดหมายของฉัน' : 'My Appointment', url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(language === 'th' ? 'คัดลอกลิงก์แล้ว' : 'Link copied!');
    }
  };

  const clearSavedItems = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedItems([]);
    toast.success(language === 'th' ? 'ลบข้อมูลบนอุปกรณ์นี้แล้ว' : 'Device data cleared');
  };

  const openSavedAppointment = (code: string) => {
    setIdentifier(code);
    handleLookup(code);
  };

  const showSavedSection = savedItems.length > 0 && !searched && appointments.length === 0;

  return (
    <>
      <PageContainer>
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? '📋 นัดหมายของฉัน' : '📋 My Appointments'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'th'
                ? 'ค้นหาด้วยอีเมลที่ใช้จอง หรือรหัสนัดหมาย'
                : 'Search with the email you booked with or your booking code'}
            </p>
          </div>

          {/* Single input lookup */}
          <Card className="p-5 rounded-3xl space-y-3">
            <label className="text-sm font-medium text-foreground">
              {language === 'th' ? 'กรอกอีเมล หรือ รหัสนัดหมาย' : 'Enter email or booking code'}
            </label>
            <div className="flex gap-2">
              <Input
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="example@email.com หรือ SWG-AB12CD"
                className="rounded-xl flex-1"
              />
              <Button
                onClick={() => handleLookup()}
                disabled={loading || !identifier.trim()}
                className="rounded-xl px-4 shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </Card>

          {/* Saved on device section */}
          {showSavedSection && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    {language === 'th' ? 'นัดหมายบนอุปกรณ์นี้' : 'Appointments on this device'}
                  </p>
                </div>
                <button
                  onClick={clearSavedItems}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  {language === 'th' ? 'ลบข้อมูล' : 'Clear'}
                </button>
              </div>

              {savedItems.map((item) => (
                <Card key={item.appointment_id || item.referral_code} className="p-4 rounded-2xl border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <p className="font-mono font-bold text-lg text-primary tracking-wider">
                        {item.referral_code}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {language === 'th' ? item.branch_name_th : item.branch_name_en}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.appointment_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.start_time?.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full shrink-0"
                      onClick={() => openSavedAppointment(item.referral_code)}
                    >
                      {language === 'th' ? 'เปิด' : 'Open'}
                    </Button>
                  </div>
                </Card>
              ))}

              <p className="text-[10px] text-muted-foreground text-center">
                {language === 'th'
                  ? '⚠️ ข้อมูลนี้บันทึกไว้บนเบราว์เซอร์นี้เท่านั้น หากล้างข้อมูลเว็บไซต์จะหายไป'
                  : '⚠️ This data is saved in this browser only. Clearing site data will remove it.'}
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Results */}
          {!loading && appointments.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'th'
                  ? `พบ ${appointments.length} นัดหมาย`
                  : `Found ${appointments.length} appointment${appointments.length > 1 ? 's' : ''}`}
              </p>

              {appointments.map((apt) => {
                const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.booked;
                const StatusIcon = status.icon;

                return (
                  <Card key={apt.appointment_id} className="overflow-hidden rounded-3xl border-2 border-primary/10">
                    {/* Status header */}
                    <div className="bg-primary/5 px-4 py-3 border-b border-primary/10 flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${status.color}`}>
                        {language === 'th' ? status.labelTh : status.labelEn}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Referral code - very large */}
                      {apt.referral_code && (
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4">
                          <p className="text-[10px] uppercase font-medium text-muted-foreground mb-1">
                            {language === 'th' ? 'รหัสนัดหมาย' : 'Booking Code'}
                          </p>
                          <div className="flex items-center gap-3">
                            <Hash className="h-6 w-6 text-primary shrink-0" />
                            <p className="font-mono font-black text-3xl tracking-widest text-primary flex-1">
                              {apt.referral_code}
                            </p>
                            <button
                              onClick={() => copyCode(apt.referral_code)}
                              className="text-muted-foreground hover:text-primary transition-colors p-2"
                              aria-label="Copy code"
                            >
                              <Copy className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Branch */}
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold">
                          {language === 'th' ? apt.branch_name_th : apt.branch_name_en}
                        </span>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{format(parseISO(apt.appointment_date), 'd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-bold text-xl">{(apt.start_time as string).slice(0, 5)}</span>
                        </div>
                      </div>

                      {/* Services */}
                      {apt.services_summary && (
                        <p className="text-xs text-muted-foreground">{apt.services_summary}</p>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        {apt.referral_code && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-1.5 flex-1"
                            onClick={() => copyCode(apt.referral_code)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {language === 'th' ? 'คัดลอกรหัส' : 'Copy code'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full gap-1.5 flex-1"
                          onClick={shareLink}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          {language === 'th' ? 'แชร์ลิงก์' : 'Share link'}
                        </Button>
                      </div>

                      {/* Clinic hint */}
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          {language === 'th'
                            ? '📱 แสดงหน้าจอนี้ให้เจ้าหน้าที่ลงทะเบียน'
                            : '📱 Show this screen to registration staff'}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && searched && appointments.length === 0 && !errorMsg && (
            <div className="text-center py-10 space-y-3">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {language === 'th'
                  ? 'ยังไม่พบนัดหมาย — ลองใช้อีเมลที่ใช้จอง หรือรหัสนัดหมาย (SWG-...)'
                  : 'No appointment found — try the email you used to book or your booking code (SWG-...)'}
              </p>
            </div>
          )}

          {/* Book new */}
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/booking')}
              className="w-full rounded-full gap-2"
            >
              {language === 'th' ? '📅 จองนัดหมายใหม่' : '📅 Book New Appointment'}
            </Button>
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
