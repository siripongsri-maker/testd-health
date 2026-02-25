import { useState, useEffect } from 'react';
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
  Mail, CheckCircle2, XCircle, AlertCircle, Link2, KeyRound,
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

const STATUS_CONFIG: Record<string, { labelTh: string; labelEn: string; color: string; icon: typeof CheckCircle2 }> = {
  booked: { labelTh: 'จองแล้ว', labelEn: 'Booked', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', icon: Calendar },
  confirmed: { labelTh: 'ยืนยันแล้ว', labelEn: 'Confirmed', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  arrived: { labelTh: 'เช็คอินแล้ว', labelEn: 'Checked In', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: Clock },
  in_progress: { labelTh: 'กำลังรับบริการ', labelEn: 'In Progress', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', icon: Clock },
  completed: { labelTh: 'เสร็จสิ้น', labelEn: 'Completed', color: 'text-green-700 bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  cancelled: { labelTh: 'ยกเลิก', labelEn: 'Cancelled', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: XCircle },
  no_show: { labelTh: 'ไม่มาตามนัด', labelEn: 'No Show', color: 'text-muted-foreground bg-muted', icon: AlertCircle },
};

export default function GuestAppointments() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<GuestAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Manual lookup form
  const [email, setEmail] = useState('');
  const [refCode, setRefCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // Auto-load from token
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      loadByToken(token);
    }
  }, [searchParams]);

  const loadByToken = async (token: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc('get_guest_appointments_by_token', {
        p_token: token,
      });
      if (error) throw error;
      setAppointments((data as unknown as GuestAppointment[]) || []);
    } catch {
      toast.error(language === 'th' ? 'ลิงก์ไม่ถูกต้องหรือหมดอายุ' : 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!email.trim() || !refCode.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกอีเมลและรหัสจอง' : 'Please enter email and booking code');
      return;
    }
    setLookupLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc('guest_lookup_appointment', {
        p_email: email.trim(),
        p_referral_code: refCode.trim(),
      });
      if (error) {
        if (error.message?.includes('rate_limit_exceeded')) {
          toast.error(language === 'th' ? 'ลองบ่อยเกินไป กรุณารอสักครู่' : 'Too many attempts. Please wait.');
          return;
        }
        throw error;
      }
      const results = (data as unknown as GuestAppointment[]) || [];
      setAppointments(results);
      if (results.length === 0) {
        toast.error(language === 'th' ? 'ไม่พบนัดหมาย ตรวจสอบอีเมลและรหัสจอง' : 'No appointment found. Check email and booking code.');
      }
    } catch (err: any) {
      if (!err?.message?.includes('rate_limit')) {
        toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied!');
  };

  const hasToken = !!searchParams.get('token');

  return (
    <>
      <PageContainer>
        <div className="max-w-lg mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? '📋 ดูนัดหมาย' : '📋 My Appointments'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'th'
                ? 'ค้นหานัดหมายด้วยอีเมลและรหัสจอง หรือใช้ลิงก์จากอีเมล'
                : 'Look up your appointment with email and booking code, or use the link from your email'}
            </p>
          </div>

          {/* Auto-loaded via token */}
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Manual Lookup Form */}
          {!hasToken && !loading && (
            <Card className="p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Search className="h-4 w-4 text-primary" />
                {language === 'th' ? 'ค้นหานัดหมาย' : 'Find your appointment'}
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {language === 'th' ? 'อีเมลที่ใช้จอง' : 'Booking email'}
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    {language === 'th' ? 'รหัสจอง (SWG-XXXXXX)' : 'Booking code (SWG-XXXXXX)'}
                  </label>
                  <Input
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                    placeholder="SWG-XXXXXX"
                    className="rounded-xl font-mono tracking-wider"
                  />
                </div>

                <Button
                  onClick={handleLookup}
                  disabled={lookupLoading || !email.trim() || !refCode.trim()}
                  className="w-full rounded-full h-12 gap-2"
                  size="lg"
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {language === 'th' ? 'ค้นหานัดหมาย' : 'Find Appointment'}
                </Button>
              </div>
            </Card>
          )}

          {/* Results */}
          {!loading && appointments.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {language === 'th' ? `พบ ${appointments.length} นัดหมาย` : `Found ${appointments.length} appointment${appointments.length > 1 ? 's' : ''}`}
              </p>

              {appointments.map((apt) => {
                const status = STATUS_CONFIG[apt.status] || STATUS_CONFIG.booked;
                const StatusIcon = status.icon;

                return (
                  <Card key={apt.appointment_id} className="overflow-hidden rounded-3xl border-2 border-primary/10">
                    {/* Clinic-ready header */}
                    <div className="bg-primary/5 p-4 border-b border-primary/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${status.color}`}>
                            {language === 'th' ? status.labelTh : status.labelEn}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Referral code - prominent for clinic */}
                      {apt.referral_code && (
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                          <Hash className="h-6 w-6 text-primary shrink-0" />
                          <div className="flex-1">
                            <p className="text-[10px] uppercase font-medium text-muted-foreground">
                              {language === 'th' ? 'รหัสจอง' : 'Booking Code'}
                            </p>
                            <p className="font-mono font-black text-2xl tracking-widest text-primary">
                              {apt.referral_code}
                            </p>
                          </div>
                          <button
                            onClick={() => copyCode(apt.referral_code)}
                            className="text-muted-foreground hover:text-primary transition-colors p-2"
                          >
                            <Copy className="h-5 w-5" />
                          </button>
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
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-bold text-lg">{(apt.start_time as string).slice(0, 5)}</span>
                        </div>
                      </div>

                      {/* Services */}
                      {apt.services_summary && (
                        <p className="text-xs text-muted-foreground">
                          {apt.services_summary}
                        </p>
                      )}

                      {/* Show at clinic hint */}
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

          {/* No results */}
          {!loading && searched && appointments.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                {language === 'th' ? 'ไม่พบนัดหมาย' : 'No appointments found'}
              </p>
            </div>
          )}

          {/* CTA to book */}
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
