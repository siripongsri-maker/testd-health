import { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, Clock, ChevronRight, ChevronLeft, Calendar as CalendarIcon,
  Check, Loader2, AlertCircle, CreditCard, Globe, Info, HelpCircle, ShieldAlert,
  Copy, Camera, UserPlus
} from 'lucide-react';
import { format, addDays, startOfDay, getDay } from 'date-fns';

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
  is_free_pep_thai: boolean;
  external_price_url: string | null;
  icon: string;
}

interface RiskQuestion {
  id: string;
  question_th: string;
  question_en: string;
  options: { value: string; label_th: string; label_en: string }[];
  recommended_services: string[];
  display_order: number;
}

type Step = 'branch' | 'service' | 'datetime' | 'confirm' | 'success';

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
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  // Risk assessment state
  const [showRiskAssessment, setShowRiskAssessment] = useState(false);
  const [riskQuestions, setRiskQuestions] = useState<RiskQuestion[]>([]);
  const [riskAnswers, setRiskAnswers] = useState<Record<string, string>>({});

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

  // Load risk questions on demand
  const loadRiskQuestions = async () => {
    const { data } = await supabase
      .from('risk_assessment_questions')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (data) setRiskQuestions(data as unknown as RiskQuestion[]);
    setShowRiskAssessment(true);
  };

  const applyRiskRecommendations = () => {
    const recommendedSlugs = new Set<string>();
    riskQuestions.forEach(q => {
      const answer = riskAnswers[q.id];
      if (answer && answer !== 'no') {
        q.recommended_services.forEach(s => recommendedSlugs.add(s));
        if (answer === 'syphilis') recommendedSlugs.delete('hepc-testing');
        if (answer === 'hepc') recommendedSlugs.delete('syphilis-testing');
      }
    });
    const recommended = services.filter(s => recommendedSlugs.has(s.slug));
    setSelectedServices(recommended);
    setShowRiskAssessment(false);
  };

  const toggleService = (svc: Service) => {
    setSelectedServices(prev =>
      prev.find(s => s.id === svc.id)
        ? prev.filter(s => s.id !== svc.id)
        : [...prev, svc]
    );
  };

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
    const isAnonymous = !user;
    if (isAnonymous && !contactEmail.trim()) {
      toast.error(language === 'th' ? 'กรุณากรอกอีเมล' : 'Please enter your email');
      return;
    }
    if (!selectedBranch || selectedServices.length === 0 || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Check for duplicate booking (authenticated users only)
      if (user) {
        const { data: existing } = await supabase
          .from('appointments')
          .select('id')
          .eq('user_id', user.id)
          .eq('branch_id', selectedBranch.id)
          .eq('appointment_date', dateStr)
          .eq('start_time', selectedTime + ':00')
          .neq('status', 'cancelled')
          .limit(1);

        if (existing && existing.length > 0) {
          toast.error(language === 'th' ? 'คุณมีนัดหมายในเวลานี้แล้ว' : 'You already have an appointment at this time');
          setSubmitting(false);
          return;
        }
      }

      const primaryService = selectedServices[0];
      let appointmentId: string;
      let referralCode: string;

      if (!user) {
        // Anonymous booking via RPC (bypasses RLS)
        const { data, error } = await supabase.rpc('create_anonymous_appointment', {
          p_branch_id: selectedBranch.id,
          p_service_ids: selectedServices.map(s => s.id),
          p_appointment_date: dateStr,
          p_start_time: selectedTime + ':00',
          p_contact_email: contactEmail.trim(),
          p_notes: notes || null,
        });

        if (error) throw error;
        appointmentId = (data as any).id;
        referralCode = (data as any).referral_code;
      } else {
        // Authenticated booking via direct insert
        const insertPayload: Record<string, unknown> = {
          branch_id: selectedBranch.id,
          service_id: primaryService.id,
          appointment_date: dateStr,
          start_time: selectedTime + ':00',
          status: 'booked',
          notes: notes || null,
          user_id: user.id,
          contact_email: user.email || null,
        };

        const { data, error } = await supabase.from('appointments').insert(insertPayload as any).select('id, referral_code').single();
        if (error) throw error;

        appointmentId = data.id;
        referralCode = data.referral_code;

        // Insert services into join table
        const serviceInserts = selectedServices.map(s => ({
          appointment_id: appointmentId,
          service_id: s.id,
        }));
        await supabase.from('appointment_services').insert(serviceInserts);

        // Log the booking
        const serviceNames = selectedServices.map(s => s.name_en).join(', ');
        await supabase.from('appointment_logs').insert({
          appointment_id: appointmentId,
          action: 'booked',
          performed_by: user.id,
          details: `Booked ${serviceNames} at ${selectedBranch.name_en}`,
        });

        // Log notification as skipped (email disabled for now)
        await supabase.from('notification_logs').insert({
          appointment_id: appointmentId,
          email_masked: (user.email || '').slice(0, 3) + '***',
          notification_type: 'booking_created',
          status: 'skipped',
        });
      }

      setConfirmedCode(referralCode);
      setStep('success');
      toast.success(language === 'th' ? '🎉 จองสำเร็จ!' : '🎉 Booking confirmed!');
    } catch (err: any) {
      console.error('Booking error:', err);
      const msg = err?.message || '';
      const code = err?.code || '';

      if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
        toast.error(language === 'th' ? 'ช่วงเวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น' : 'This time slot is already booked. Please choose another time.');
      } else if (msg.includes('row-level security') || msg.includes('permission') || code === '42501') {
        toast.error(language === 'th' ? 'ระบบยังไม่อนุญาตการจองนี้ (ERR_BOOKING_RLS)' : 'Booking not permitted (ERR_BOOKING_RLS)');
      } else {
        toast.error(language === 'th' ? `เกิดข้อผิดพลาด (ERR_BOOKING_INSERT)` : `Something went wrong (ERR_BOOKING_INSERT)`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    if (confirmedCode) {
      navigator.clipboard.writeText(confirmedCode);
      toast.success(language === 'th' ? 'คัดลอกแล้ว' : 'Copied!');
    }
  };

  const dayLabels = language === 'th' ? DAY_NAMES_TH : DAY_NAMES_EN;
  const formatDays = (days: number[]) => days.map(d => dayLabels[d]).join(', ');

  const stepTitles: Record<Step, string> = {
    branch: language === 'th' ? 'เลือกสาขา' : 'Select Branch',
    service: language === 'th' ? 'เลือกบริการ' : 'Select Services',
    datetime: language === 'th' ? 'เลือกวันและเวลา' : 'Select Date & Time',
    confirm: language === 'th' ? 'ยืนยันนัดหมาย' : 'Confirm Booking',
    success: language === 'th' ? 'จองสำเร็จ' : 'Booking Confirmed',
  };

  const stepOrder: Step[] = ['branch', 'service', 'datetime', 'confirm'];
  const currentIdx = step === 'success' ? 4 : stepOrder.indexOf(step);

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
          {step !== 'success' && (
            <div className="flex items-center gap-1 mb-6">
              {stepOrder.map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentIdx ? 'bg-primary' : 'bg-muted'
                  }`} />
                </div>
              ))}
            </div>
          )}

          {/* Back button */}
          {currentIdx > 0 && step !== 'success' && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => {
                setShowRiskAssessment(false);
                if (step === 'confirm') setStep('datetime');
                else if (step === 'datetime') setStep('service');
                else if (step === 'service') setStep('branch');
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {language === 'th' ? 'กลับ' : 'Back'}
            </Button>
          )}

          {step !== 'success' && (
            <h2 className="text-lg font-semibold mb-4 text-foreground">{stepTitles[step]}</h2>
          )}

          {/* STEP: Branch */}
          {step === 'branch' && (
            <div className="space-y-3">
              {branches.map(branch => (
                <Card
                  key={branch.id}
                  className="p-5 cursor-pointer transition-all hover:shadow-lg rounded-3xl border-2 border-transparent hover:border-primary/30"
                  onClick={() => {
                    setSelectedBranch(branch);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setSelectedServices([]);
                    setStep('service');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
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

          {/* STEP: Service (Multi-select) */}
          {step === 'service' && !showRiskAssessment && (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-muted-foreground rounded-full"
                onClick={loadRiskQuestions}
              >
                <HelpCircle className="h-4 w-4" />
                {language === 'th' ? 'ไม่แน่ใจว่าต้องการบริการอะไร?' : 'Not sure what you need?'}
              </Button>

              {services.map(svc => {
                const isSelected = selectedServices.some(s => s.id === svc.id);
                const isPEP = svc.slug === 'pep';
                return (
                  <Card
                    key={svc.id}
                    className={`p-4 cursor-pointer transition-all rounded-3xl border-2 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-transparent hover:border-primary/30 hover:shadow-md'
                    }`}
                    onClick={() => toggleService(svc)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30 bg-background'
                      }`}>
                        {isSelected && <Check className="h-4 w-4" />}
                      </div>
                      <span className="text-2xl">{svc.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">
                          {language === 'th' ? svc.name_th : svc.name_en}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === 'th' ? svc.description_th : svc.description_en}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {svc.is_free_thai && (
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                              {language === 'th' ? 'ฟรี คนไทย (สปสช.)' : 'Free (Thai NHSO)'}
                            </span>
                          )}
                          {svc.is_free_global_fund && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                              {language === 'th' ? 'ฟรี กองทุนโลก (CLVM)' : 'Free (Global Fund: CLVM)'}
                            </span>
                          )}
                          {isPEP && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              {language === 'th' ? 'PEP ฟรีเฉพาะคนไทย' : 'PEP: Free for Thai ONLY'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* PEP warning */}
              <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 rounded-2xl">
                <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {language === 'th'
                        ? '⚠️ PEP (ยาต้านฉุกเฉิน): ฟรีเฉพาะคนไทยเท่านั้น'
                        : '⚠️ PEP (Emergency Antiretroviral): Free for Thai nationals ONLY'}
                    </p>
                    <p className="mt-0.5">
                      {language === 'th'
                        ? 'สัญชาติอื่น (รวมถึง CLVM) อาจมีค่าใช้จ่าย ตรวจสอบราคาที่ swingsilompolyclinic.com'
                        : 'Other nationalities (including CLVM) may have charges. Check pricing at swingsilompolyclinic.com'}
                    </p>
                  </div>
                </div>
              </Card>

              <Button
                onClick={() => setStep('datetime')}
                disabled={selectedServices.length === 0}
                className="w-full gap-2 rounded-full h-12"
                size="lg"
              >
                {language === 'th' ? `ถัดไป (${selectedServices.length} บริการ)` : `Next (${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''})`}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Risk Assessment overlay */}
          {step === 'service' && showRiskAssessment && (
            <div className="space-y-4">
              <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-2xl">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {language === 'th'
                    ? '⚕️ นี่ไม่ใช่การวินิจฉัย ตอบคำถามเพื่อช่วยแนะนำบริการที่เหมาะสม'
                    : '⚕️ This is NOT a diagnosis. Answer questions to help recommend suitable services.'}
                </p>
              </Card>

              {riskQuestions.map((q, idx) => (
                <Card key={q.id} className="p-4 rounded-2xl">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {idx + 1}. {language === 'th' ? q.question_th : q.question_en}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => (
                      <Button
                        key={opt.value}
                        variant={riskAnswers[q.id] === opt.value ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setRiskAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                      >
                        {language === 'th' ? opt.label_th : opt.label_en}
                      </Button>
                    ))}
                  </div>
                </Card>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRiskAssessment(false)} className="flex-1 rounded-full">
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </Button>
                <Button
                  onClick={applyRiskRecommendations}
                  disabled={Object.keys(riskAnswers).length === 0}
                  className="flex-1 rounded-full"
                >
                  {language === 'th' ? 'ดูบริการแนะนำ' : 'See Recommendations'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP: DateTime (combined) */}
          {step === 'datetime' && selectedBranch && (
            <div className="space-y-5">
              {/* Date pills - horizontal scroll */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {language === 'th' ? 'เลือกวันที่' : 'Select Date'}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {availableDates.map(date => {
                    const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    const dayIdx = getDay(date);
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime(null);
                        }}
                        className={`flex-shrink-0 px-4 py-3 rounded-2xl text-center transition-all border-2 min-w-[72px] ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
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

              {/* Time slots grid */}
              {selectedDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {format(selectedDate, 'EEEE, d MMMM yyyy')}
                    {' — '}
                    {language === 'th' ? 'เลือกเวลา' : 'Select Time'}
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
                          onClick={() => setSelectedTime(slot)}
                          className={`p-2.5 rounded-full text-center text-sm font-medium transition-all border-2 ${
                            isFull
                              ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-40'
                              : isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-md'
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                    <div className="h-3 w-3 rounded-full bg-muted opacity-50" />
                    <span>{language === 'th' ? 'เต็ม' : 'Full'}</span>
                    <div className="h-3 w-3 rounded-full bg-card border border-border" />
                    <span>{language === 'th' ? 'ว่าง' : 'Available'}</span>
                  </div>
                </div>
              )}

              {/* Next button */}
              {selectedDate && selectedTime && (
                <Button
                  onClick={() => setStep('confirm')}
                  className="w-full gap-2 rounded-full h-12"
                  size="lg"
                >
                  {language === 'th' ? 'ถัดไป' : 'Next'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* STEP: Confirm */}
          {step === 'confirm' && selectedBranch && selectedServices.length > 0 && selectedDate && selectedTime && (
            <div className="space-y-4">
              <Card className="p-5 space-y-3 rounded-3xl">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-semibold">
                    {language === 'th' ? selectedBranch.name_th : selectedBranch.name_en}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {language === 'th' ? 'บริการที่เลือก' : 'Selected Services'}
                  </p>
                  {selectedServices.map(svc => (
                    <div key={svc.id} className="flex items-center gap-2">
                      <span className="text-lg">{svc.icon}</span>
                      <span className="text-sm font-medium">
                        {language === 'th' ? svc.name_th : svc.name_en}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>{format(selectedDate, 'EEEE, d MMMM yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-bold text-lg">{selectedTime}</span>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                  <CreditCard className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {language === 'th'
                      ? 'ฟรีสำหรับคนไทย (สปสช.) และกองทุนโลก (CLVM) ยกเว้น PEP ที่ฟรีเฉพาะคนไทย'
                      : 'Free for Thai (NHSO) & Global Fund (CLVM), except PEP which is free for Thai only'}
                  </span>
                </div>
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
                  className="rounded-2xl"
                />
              </div>

              {/* Anonymous booking: collect email */}
              {!user && (
                <div className="space-y-3">
                  <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 rounded-2xl">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        {language === 'th'
                          ? 'จองโดยไม่ต้องสมัครสมาชิก — กรอกอีเมลเพื่อรับรหัสจอง'
                          : 'Booking without an account — enter your email to receive a booking code'}
                      </span>
                    </div>
                  </Card>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">
                      {language === 'th' ? 'อีเมลติดต่อ *' : 'Contact Email *'}
                    </label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="rounded-xl"
                      required
                    />
                  </div>
                </div>
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
                disabled={submitting || (!user && !contactEmail.trim())}
                className="w-full gap-2 rounded-full h-12"
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

          {/* STEP: Success */}
          {step === 'success' && confirmedCode && selectedBranch && selectedDate && selectedTime && (
            <div className="space-y-6 text-center py-4">
              <div className="space-y-2">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {language === 'th' ? '🎉 จองสำเร็จ!' : '🎉 Booking Confirmed!'}
                </h2>
              </div>

              {/* Referral code */}
              <Card className="p-6 rounded-3xl border-2 border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
                  {language === 'th' ? 'รหัสจอง / Booking Code' : 'Booking Code'}
                </p>
                <button
                  onClick={copyCode}
                  className="text-3xl font-mono font-black tracking-widest text-primary hover:opacity-80 transition-opacity flex items-center gap-2 mx-auto"
                >
                  {confirmedCode}
                  <Copy className="h-5 w-5" />
                </button>
              </Card>

              {/* Summary */}
              <Card className="p-4 rounded-3xl text-left space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{language === 'th' ? selectedBranch.name_th : selectedBranch.name_en}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>{format(selectedDate, 'd MMMM yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-bold">{selectedTime}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  {selectedServices.map(s => `${s.icon} ${language === 'th' ? s.name_th : s.name_en}`).join(', ')}
                </div>
              </Card>

              {/* Screenshot guidance */}
              <Card className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Camera className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-left text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      {language === 'th'
                        ? 'กรุณาแคปหน้าจอนี้และแสดงให้เจ้าหน้าที่ลงทะเบียน'
                        : 'Please take a screenshot and show this to Medical Registration'}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {language === 'th'
                        ? 'เจ้าหน้าที่จะค้นหาด้วยรหัสจองของคุณ'
                        : 'Staff will look up your booking using this code'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="space-y-3">
                {user ? (
                  <Button onClick={() => navigate('/my-appointments')} className="w-full rounded-full h-12" size="lg">
                    {language === 'th' ? 'ดูนัดหมายของฉัน' : 'View My Appointments'}
                  </Button>
                ) : (
                  <>
                    <Card className="p-4 rounded-3xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-start gap-3">
                        <UserPlus className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                            {language === 'th'
                              ? 'อยากจัดการนัดง่ายขึ้นไหม?'
                              : 'Want to manage your appointment easily?'}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                            {language === 'th'
                              ? 'สมัครสมาชิกเพื่อดู เลื่อน หรือยกเลิกนัดได้ทันที'
                              : 'Register to view, reschedule, or cancel your booking anytime'}
                          </p>
                        </div>
                      </div>
                    </Card>
                    <Button onClick={() => navigate('/auth?redirect=/my-appointments')} className="w-full rounded-full h-12 gap-2" size="lg">
                      <UserPlus className="h-4 w-4" />
                      {language === 'th' ? 'สมัครสมาชิกเพื่อจัดการนัดหมาย' : 'Register to manage appointments'}
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-full">
                  {language === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
