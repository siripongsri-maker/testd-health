import { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, Clock, ChevronRight, ChevronLeft, Calendar as CalendarIcon,
  Check, Loader2, AlertCircle, CreditCard, Globe, Info
} from 'lucide-react';
import { format, addDays, isAfter, isBefore, startOfDay, getDay } from 'date-fns';

interface Branch {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  counselor_count: number;
  open_days: number[];
  open_time: string;
  close_time: string;
  slot_duration_minutes: number;
}

interface Service {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  is_free_thai: boolean;
  is_free_global_fund: boolean;
  external_price_url: string | null;
  icon: string;
}

type Step = 'branch' | 'service' | 'date' | 'time' | 'confirm';

const DAY_NAMES_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function generateTimeSlots(openTime: string, closeTime: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  let current = oh * 60 + om;
  const end = ch * 60 + cm;
  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += durationMin;
  }
  return slots;
}

export default function Booking() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>('branch');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load branches and services
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [branchRes, serviceRes] = await Promise.all([
        supabase.from('booking_branches').select('*').eq('is_active', true),
        supabase.from('booking_services').select('*').eq('is_active', true).order('display_order'),
      ]);
      if (branchRes.data) setBranches(branchRes.data as Branch[]);
      if (serviceRes.data) setServices(serviceRes.data as Service[]);
      setLoading(false);

      // Auto-select branch from URL
      const branchSlug = searchParams.get('branch');
      if (branchSlug && branchRes.data) {
        const found = (branchRes.data as Branch[]).find(b => b.slug === branchSlug);
        if (found) {
          setSelectedBranch(found);
          setStep('service');
        }
      }
    };
    load();
  }, [searchParams]);

  // Load booked slots when date changes
  useEffect(() => {
    if (!selectedBranch || !selectedDate) return;
    const loadSlots = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select('start_time')
        .eq('branch_id', selectedBranch.id)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      const counts: Record<string, number> = {};
      data?.forEach(row => {
        const t = (row.start_time as string).slice(0, 5);
        counts[t] = (counts[t] || 0) + 1;
      });
      setBookedSlots(counts);
    };
    loadSlots();
  }, [selectedBranch, selectedDate]);

  const availableDates = useMemo(() => {
    if (!selectedBranch) return [];
    const dates: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 1; i <= 30; i++) {
      const d = addDays(today, i);
      const dayOfWeek = getDay(d);
      if (selectedBranch.open_days.includes(dayOfWeek)) {
        dates.push(d);
      }
    }
    return dates;
  }, [selectedBranch]);

  const timeSlots = useMemo(() => {
    if (!selectedBranch) return [];
    return generateTimeSlots(
      selectedBranch.open_time,
      selectedBranch.close_time,
      selectedBranch.slot_duration_minutes
    );
  }, [selectedBranch]);

  const handleBook = async () => {
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบก่อน' : 'Please log in first');
      navigate('/auth');
      return;
    }
    if (!selectedBranch || !selectedService || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Check for duplicate booking
      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('user_id', user.id)
        .eq('appointment_date', dateStr)
        .eq('start_time', selectedTime + ':00')
        .neq('status', 'cancelled')
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error(language === 'th' ? 'คุณมีนัดหมายในเวลานี้แล้ว' : 'You already have an appointment at this time');
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.from('appointments').insert({
        user_id: user.id,
        branch_id: selectedBranch.id,
        service_id: selectedService.id,
        appointment_date: dateStr,
        start_time: selectedTime + ':00',
        status: 'booked',
        notes: notes || null,
      }).select().single();

      if (error) throw error;

      // Log the booking
      await supabase.from('appointment_logs').insert({
        appointment_id: data.id,
        action: 'booked',
        performed_by: user.id,
        details: `Booked ${selectedService.name_en} at ${selectedBranch.name_en}`,
      });

      toast.success(language === 'th' ? '🎉 จองสำเร็จ!' : '🎉 Booking confirmed!');
      navigate('/my-appointments');
    } catch (err) {
      console.error('Booking error:', err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const dayLabels = language === 'th' ? DAY_NAMES_TH : DAY_NAMES_EN;

  const formatDays = (days: number[]) =>
    days.map(d => dayLabels[d]).join(', ');

  const stepTitles: Record<Step, string> = {
    branch: language === 'th' ? 'เลือกสาขา' : 'Select Branch',
    service: language === 'th' ? 'เลือกบริการ' : 'Select Service',
    date: language === 'th' ? 'เลือกวันที่' : 'Select Date',
    time: language === 'th' ? 'เลือกเวลา' : 'Select Time',
    confirm: language === 'th' ? 'ยืนยันนัดหมาย' : 'Confirm Booking',
  };

  const stepOrder: Step[] = ['branch', 'service', 'date', 'time', 'confirm'];
  const currentIdx = stepOrder.indexOf(step);

  if (loading) {
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

  return (
    <>
      <PageContainer>
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? '📅 จองนัดหมาย' : '📅 Book Appointment'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'th'
                ? 'บริการตรวจและปรึกษาฟรีสำหรับคนไทยภายใต้ สปสช. และชาวต่างชาติภายใต้กองทุนโลก (เมียนมา เวียดนาม ลาว กัมพูชา) สำหรับสัญชาติอื่นอาจมีค่าใช้จ่าย'
                : 'Free for Thai nationals under NHSO Universal Coverage & Global Fund-supported nationals (Myanmar, Vietnam, Laos, Cambodia). Other nationalities may have charges.'}
            </p>
            <a
              href="https://swingsilompolyclinic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline mt-1 inline-flex items-center gap-1"
            >
              <Globe className="h-3 w-3" />
              swingsilompolyclinic.com
            </a>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6">
            {stepOrder.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= currentIdx ? 'bg-primary' : 'bg-muted'
                }`} />
              </div>
            ))}
          </div>

          {/* Back button */}
          {currentIdx > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => setStep(stepOrder[currentIdx - 1])}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {language === 'th' ? 'กลับ' : 'Back'}
            </Button>
          )}

          <h2 className="text-lg font-semibold mb-4 text-foreground">{stepTitles[step]}</h2>

          {/* STEP: Branch */}
          {step === 'branch' && (
            <div className="space-y-3">
              {branches.map(branch => (
                <Card
                  key={branch.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedBranch?.id === branch.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedBranch(branch);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setStep('service');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {language === 'th' ? branch.name_th : branch.name_en}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{branch.open_time.slice(0, 5)} - {branch.close_time.slice(0, 5)}</span>
                          <span>•</span>
                          <span>{formatDays(branch.open_days)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === 'th'
                            ? `ที่ปรึกษา ${branch.counselor_count} คน`
                            : `${branch.counselor_count} counselor${branch.counselor_count > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* STEP: Service */}
          {step === 'service' && (
            <div className="space-y-3">
              {services.map(svc => (
                <Card
                  key={svc.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedService?.id === svc.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedService(svc);
                    setStep('date');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{svc.icon}</span>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {language === 'th' ? svc.name_th : svc.name_en}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === 'th' ? svc.description_th : svc.description_en}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {svc.is_free_thai && (
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                              {language === 'th' ? 'ฟรี คนไทย (สปสช.)' : 'Free (Thai NHSO)'}
                            </span>
                          )}
                          {svc.is_free_global_fund && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                              {language === 'th' ? 'ฟรี กองทุนโลก' : 'Free (Global Fund)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* STEP: Date */}
          {step === 'date' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableDates.map(date => {
                  const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  const dayIdx = getDay(date);
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                        setStep('time');
                      }}
                      className={`p-3 rounded-xl text-center transition-all border ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="text-[10px] uppercase font-medium opacity-70">
                        {dayLabels[dayIdx]}
                      </p>
                      <p className="text-lg font-bold">{format(date, 'd')}</p>
                      <p className="text-[10px] opacity-70">{format(date, 'MMM')}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: Time */}
          {step === 'time' && selectedBranch && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {selectedDate && format(selectedDate, 'EEEE, d MMMM yyyy')}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {timeSlots.map(slot => {
                  const booked = bookedSlots[slot] || 0;
                  const available = selectedBranch.counselor_count - booked;
                  const isFull = available <= 0;
                  const isSelected = selectedTime === slot;

                  return (
                    <button
                      key={slot}
                      disabled={isFull}
                      onClick={() => {
                        setSelectedTime(slot);
                        setStep('confirm');
                      }}
                      className={`p-2 rounded-lg text-center text-sm font-medium transition-all border ${
                        isFull
                          ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary/50'
                      }`}
                    >
                      {slot}
                      {!isFull && (
                        <p className="text-[9px] opacity-60 mt-0.5">
                          {available}/{selectedBranch.counselor_count}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 rounded bg-muted opacity-50" />
                <span>{language === 'th' ? 'เต็ม' : 'Full'}</span>
                <div className="h-3 w-3 rounded bg-card border border-border" />
                <span>{language === 'th' ? 'ว่าง' : 'Available'}</span>
              </div>
            </div>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && selectedBranch && selectedService && selectedDate && selectedTime && (
            <div className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    {language === 'th' ? selectedBranch.name_th : selectedBranch.name_en}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedService.icon}</span>
                  <span className="font-medium">
                    {language === 'th' ? selectedService.name_th : selectedService.name_en}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>{format(selectedDate, 'EEEE, d MMMM yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-bold text-lg">{selectedTime}</span>
                </div>

                {selectedService.is_free_thai && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                    <CreditCard className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {language === 'th'
                        ? 'ฟรีสำหรับคนไทยภายใต้ สปสช. และชาวต่างชาติภายใต้กองทุนโลก'
                        : 'Free for Thai nationals (NHSO) and Global Fund-supported nationals'}
                    </span>
                  </div>
                )}
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {language === 'th' ? 'หมายเหตุ (ไม่บังคับ)' : 'Notes (optional)'}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'th' ? 'เช่น ต้องการล่ามภาษาอังกฤษ' : 'e.g., Need English interpreter'}
                  maxLength={500}
                  rows={2}
                />
              </div>

              {!user && (
                <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {language === 'th'
                        ? 'กรุณาเข้าสู่ระบบก่อนจองนัดหมาย'
                        : 'Please log in before booking'}
                    </span>
                  </div>
                </Card>
              )}

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {language === 'th'
                    ? 'คุณสามารถอัปโหลดบัตรประชาชนล่วงหน้าในหน้า "ข้อมูลส่วนตัว" เพื่อความสะดวกในการลงทะเบียน'
                    : 'You can upload your ID card in advance via "Personal Info" page for easier registration'}
                </span>
              </div>

              <Button
                onClick={handleBook}
                disabled={submitting || !user}
                className="w-full gap-2"
                size="lg"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {language === 'th' ? 'ยืนยันจอง' : 'Confirm Booking'}
              </Button>
            </div>
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
