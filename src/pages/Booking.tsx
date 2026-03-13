import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { getInviteAttribution, clearInviteAttribution } from '@/lib/inviteAttribution';
import {
  MapPin, Clock, ChevronRight, ChevronLeft, Calendar as CalendarIcon,
  Check, Loader2, AlertCircle, CreditCard, Globe, Info, HelpCircle, ShieldAlert,
  Copy, Camera, UserPlus, Star, ExternalLink, Mail, Phone,
} from 'lucide-react';
import { DensityTimeSelector } from '@/components/booking/DensityTimeSelector';
import { cn } from '@/lib/utils';
import type { WalkinPressure } from '@/lib/waitTimeEstimator';
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
  address_th?: string | null;
  address_en?: string | null;
  hero_image_url?: string | null;
  google_place_id?: string | null;
  google_maps_url?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  google_photo_url?: string | null;
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

export default function Booking() {
  const { language, t } = useLanguage();
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
  const [contactLine, setContactLine] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bookedSlots, setBookedSlots] = useState<Record<string, number>>({});
  const [blockedSlots, setBlockedSlots] = useState<Record<string, string>>({});
  const [rpcSlotTimes, setRpcSlotTimes] = useState<string[]>([]);
  const [walkinPressure, setWalkinPressure] = useState<WalkinPressure | undefined>(undefined);
  const [dayBlackoutNote, setDayBlackoutNote] = useState<string | null>(null);
  const [dayClosureInfo, setDayClosureInfo] = useState<{ title: string; reason: string | null } | null>(null);
  const [blackedOutDates, setBlackedOutDates] = useState<Record<string, { title: string; reason: string | null }>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);

  // Risk assessment state
  const [showRiskAssessment, setShowRiskAssessment] = useState(false);
  const [riskQuestions, setRiskQuestions] = useState<RiskQuestion[]>([]);
  const [riskAnswers, setRiskAnswers] = useState<Record<string, string>>({});

  // Helper for bilingual DB fields (branch name, service name, etc.)
  const loc = (th: string | null | undefined, en: string | null | undefined) => {
    if (language === 'th') return th || en || '';
    if (language === 'en') return en || th || '';
    // CLVM: return en as base (will be translated via t() for UI labels)
    return en || th || '';
  };

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

  // Load availability for selected date from the single source of truth RPC
  useEffect(() => {
    if (!selectedBranch || !selectedDate) return;
    const loadSlots = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [slotsRes, walkinRes] = await Promise.all([
        supabase.rpc('get_available_slots', {
          p_branch_id: selectedBranch.id,
          p_date: dateStr,
        }),
        supabase.rpc('get_walkin_pressure', {
          p_branch_id: selectedBranch.id,
          p_date: dateStr,
        }),
      ]);

      if (slotsRes.error) {
        console.error('get_available_slots error:', slotsRes.error);
      }

      const rows = (slotsRes.data as any[] | null) ?? [];
      const closureRow = rows.find((row) => row.day_is_closed === true);

      if (closureRow) {
        setRpcSlotTimes([]);
        setBookedSlots({});
        setBlockedSlots({});
        setDayBlackoutNote(t('booking.dayClosed'));
        setDayClosureInfo({
          title: closureRow.closure_title || closureRow.blackout_title || t('booking.closedLabel'),
          reason: closureRow.closure_reason || null,
        });
        setSelectedTime(null);
      } else {
        const slotRows = rows.filter((row) => !!row.slot_time);
        const slotTimes = slotRows.map((row) => String(row.slot_time).slice(0, 5));
        const counts: Record<string, number> = {};
        const blocked: Record<string, string> = {};

        slotRows.forEach((row) => {
          const t = String(row.slot_time).slice(0, 5);
          counts[t] = row.booked_count || 0;
          if (row.blackout_title) {
            blocked[t] = row.blackout_title;
          }
        });

        setRpcSlotTimes(slotTimes);
        setBookedSlots(counts);
        setBlockedSlots(blocked);
        setDayClosureInfo(null);

        const hasAnyBlocked = slotRows.some((row) => !!row.blackout_title);
        setDayBlackoutNote(hasAnyBlocked ? t('booking.partialBlackout') : null);

        if (selectedTime && !slotTimes.includes(selectedTime)) {
          setSelectedTime(null);
        }
      }

      if (walkinRes.data) {
        const wp = walkinRes.data as any;
        setWalkinPressure({
          activeWalkins: wp.active_walkins || 0,
          recentWalkins90min: wp.recent_walkins_90min || 0,
        });
      } else {
        setWalkinPressure(undefined);
      }
    };
    loadSlots();
  }, [selectedBranch, selectedDate, selectedTime, language]);

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
    const bangkokNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const today = startOfDay(bangkokNow);
    for (let i = 0; i <= 30; i++) {
      const d = addDays(today, i);
      const dayOfWeek = getDay(d);
      if (selectedBranch.open_days.includes(dayOfWeek)) {
        dates.push(d);
      }
    }
    return dates;
  }, [selectedBranch]);

  // Pre-fetch day-level closures
  useEffect(() => {
    if (!selectedBranch || availableDates.length === 0) {
      setBlackedOutDates({});
      return;
    }

    const loadDayClosures = async () => {
      const responses = await Promise.all(
        availableDates.map((date) =>
          supabase.rpc('get_available_slots', {
            p_branch_id: selectedBranch.id,
            p_date: format(date, 'yyyy-MM-dd'),
          })
        )
      );

      const nextBlockedDates: Record<string, { title: string; reason: string | null }> = {};

      responses.forEach((res, idx) => {
        if (res.error || !Array.isArray(res.data)) return;
        const closureRow = (res.data as any[]).find((row) => row.day_is_closed === true);
        if (!closureRow) return;

        const dateStr = format(availableDates[idx], 'yyyy-MM-dd');
        nextBlockedDates[dateStr] = {
          title: closureRow.closure_title || closureRow.blackout_title || t('booking.closedLabel'),
          reason: closureRow.closure_reason || null,
        };
      });

      setBlackedOutDates(nextBlockedDates);
    };

    loadDayClosures();
  }, [selectedBranch, availableDates, language]);

  const handleBook = async () => {
    if (!contactPhone.trim() || !/^[0+]\d{8,13}$/.test(contactPhone.replace(/[-\s]/g, ''))) {
      toast.error(language === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์' : 'Please enter a valid phone number');
      return;
    }
    if (!contactPhone.trim() || !/^[0+]\d{8,13}$/.test(contactPhone.replace(/[-\s]/g, ''))) {
      toast.error(language === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์' : 'Please enter a valid phone number');
      return;
    }
    if (!selectedBranch || selectedServices.length === 0 || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      if (!user) {
        const { data, error } = await supabase.rpc('create_anonymous_appointment', {
          p_branch_id: selectedBranch.id,
          p_service_ids: selectedServices.map(s => s.id),
          p_appointment_date: dateStr,
          p_start_time: selectedTime + ':00',
          p_contact_email: contactEmail.trim() || null,
          p_notes: notes || null,
          p_contact_phone: contactPhone.replace(/[-\s]/g, '').trim(),
          p_contact_line: contactLine.trim() || null,
        });

        if (error) throw error;
        const result = data as any;
        setConfirmedCode(result.referral_code);

        try {
          const STORAGE_KEY = 'guest_appointments_v1';
          const existing: any[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          const newEntry = {
            appointment_id: result.id,
            referral_code: result.referral_code,
            created_at: new Date().toISOString(),
            branch_name_th: selectedBranch.name_th,
            branch_name_en: selectedBranch.name_en,
            appointment_date: dateStr,
            start_time: selectedTime,
          };
          const filtered = existing.filter((e: any) => e.appointment_id !== result.id && e.referral_code !== result.referral_code);
          filtered.push(newEntry);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
          toast.success(t('booking.savedToDevice'));
        } catch {}

        let generatedToken: string | null = null;
        try {
          const { data: tokenData } = await supabase.rpc('generate_guest_access_token', {
            p_appointment_id: result.id,
          });
          if (tokenData) {
            generatedToken = tokenData as string;
            setGuestToken(generatedToken);
          }
        } catch (tokenErr) {
          console.warn('Could not generate guest token:', tokenErr);
        }

        try {
          await supabase.functions.invoke('booking-notification', {
            body: {
              appointment_id: result.id,
              notification_type: 'booking_created',
              guest_token: generatedToken,
            },
          });
        } catch {}
      } else {
        const { data, error } = await supabase.rpc('create_appointment_atomic', {
          p_branch_id: selectedBranch.id,
          p_appointment_date: dateStr,
          p_start_time: selectedTime + ':00',
          p_services: selectedServices.map(s => s.id),
          p_contact_email: user.email || null,
          p_user_id: user.id,
          p_notes: notes || null,
          p_contact_phone: contactPhone.replace(/[-\s]/g, '').trim(),
          p_contact_line: contactLine.trim() || null,
        });

        if (error) throw error;
        setConfirmedCode((data as any).referral_code);
      }

      // Record booking attribution if came from invite
      try {
        const attr = getInviteAttribution();
        if (attr) {
          await (supabase as any).from('booking_attributions').insert({
            booking_id: null,
            invite_id: attr.invite_id || null,
            session_id: attr.session_id || null,
            visitor_session_id: attr.visitor_session_id,
            attribution_type: attr.attribution_type,
          });
          if (attr.invite_code) {
            try {
              await supabase.rpc('record_partner_invite_event', {
                p_code: attr.invite_code,
                p_visitor_session_id: attr.visitor_session_id,
                p_event_type: 'booking_completed',
              });
            } catch {}
          }
          clearInviteAttribution();
        }
      } catch {}

      setStep('success');
      toast.success(t('booking.successTitle'));
    } catch (err: any) {
      console.error('Booking error:', err);
      const msg = err?.message || '';

      if (msg.includes('rate_limited_phone')) {
        toast.error(language === 'th'
          ? 'มีการจองจากเบอร์นี้เร็วเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง'
          : 'Too many bookings from this phone number. Please wait a moment and try again.');
      } else if (msg.includes('rate_limited_user')) {
        toast.error(language === 'th'
          ? 'คุณจองถี่เกินไป กรุณารอสักครู่แล้วลองอีกครั้ง'
          : 'Too many bookings. Please wait a moment and try again.');
      } else if (msg.includes('duplicate_active')) {
        toast.error(language === 'th'
          ? 'คุณมีนัดหมายที่ยังไม่เสร็จสิ้นอยู่แล้วที่สาขานี้'
          : 'You already have an active appointment at this branch.');
      } else if (msg.includes('slot_blocked')) {
        toast.error(t('booking.slotBlocked'));
      } else if (msg.includes('slot_full')) {
        toast.error(t('booking.slotFull'));
      } else if (msg.includes('duplicate_booking')) {
        toast.error(t('booking.duplicateBooking'));
      } else if (msg.includes('row-level security') || msg.includes('permission') || err?.code === '42501') {
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
    branch: t('booking.selectBranch'),
    service: t('booking.selectServices'),
    datetime: t('booking.selectDateTime'),
    confirm: t('booking.confirmBooking'),
    success: t('booking.bookingConfirmed'),
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
              {t('booking.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('booking.subtitle')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'th' ? 'โทร 02 632 9501' : 'Call +66 2 632 9501'}
            </p>
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
              {t('common.back')}
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
                  className="overflow-hidden cursor-pointer transition-all hover:shadow-lg rounded-3xl border-2 border-transparent hover:border-primary/30"
                  onClick={() => {
                    setSelectedBranch(branch);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setSelectedServices([]);
                    setStep('service');
                  }}
                >
                  {(branch.hero_image_url || branch.google_photo_url) ? (
                    <img
                      src={branch.hero_image_url || branch.google_photo_url!}
                      alt={loc(branch.name_th, branch.name_en)}
                      className="w-full h-32 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : null}
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        {!branch.hero_image_url && !branch.google_photo_url && (
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-foreground">
                            {loc(branch.name_th, branch.name_en)}
                          </h3>
                          {branch.google_rating != null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs font-bold">{branch.google_rating}</span>
                              {branch.google_review_count != null && (
                                <span className="text-xs text-muted-foreground">
                                  ({branch.google_review_count.toLocaleString()} {t('booking.reviews')})
                                </span>
                              )}
                            </div>
                          )}
                          {loc(branch.address_th, branch.address_en) && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{loc(branch.address_th, branch.address_en)}</span>
                            </p>
                          )}
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
                    {(branch.google_maps_url || (branch.google_photo_url && branch.hero_image_url && branch.hero_image_url !== branch.google_photo_url)) && (
                      <div className="mt-3 flex gap-2 items-end">
                        {branch.google_photo_url && branch.hero_image_url && branch.hero_image_url !== branch.google_photo_url && (
                          <img
                            src={branch.google_photo_url}
                            alt="Google"
                            className="h-12 w-16 object-cover rounded-md border shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        {branch.google_maps_url && (
                          <a
                            href={branch.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('booking.openGoogleMaps')}
                          </a>
                        )}
                      </div>
                    )}
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
                {t('booking.notSure')}
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
                          {loc(svc.name_th, svc.name_en)}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {loc(svc.description_th, svc.description_en)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {svc.is_free_thai && (
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                              {t('booking.freeThaiNHSO')}
                            </span>
                          )}
                          {svc.is_free_global_fund && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                              {t('booking.freeGlobalFund')}
                            </span>
                          )}
                          {isPEP && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" />
                              {t('booking.pepFreeThaiOnly')}
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
                    <p className="font-semibold">{t('booking.pepWarning')}</p>
                    <p className="mt-0.5">{t('booking.pepWarningDesc')}</p>
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
                  {t('booking.riskDisclaimer')}
                </p>
              </Card>

              {riskQuestions.map((q, idx) => (
                <Card key={q.id} className="p-4 rounded-2xl">
                  <p className="text-sm font-medium text-foreground mb-3">
                    {idx + 1}. {loc(q.question_th, q.question_en)}
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
                        {loc(opt.label_th, opt.label_en)}
                      </Button>
                    ))}
                  </div>
                </Card>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRiskAssessment(false)} className="flex-1 rounded-full">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={applyRiskRecommendations}
                  disabled={Object.keys(riskAnswers).length === 0}
                  className="flex-1 rounded-full"
                >
                  {t('booking.seeRecommendations')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP: DateTime (combined) */}
          {step === 'datetime' && selectedBranch && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {t('booking.selectDate')}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {availableDates.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;
                    const dayIdx = getDay(date);
                    const bangkokToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                    const isToday = format(date, 'yyyy-MM-dd') === format(startOfDay(bangkokToday), 'yyyy-MM-dd');
                    const blackoutInfo = blackedOutDates[dateStr];
                    const isBlackedOut = !!blackoutInfo;
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          if (isBlackedOut && blackoutInfo) {
                            setSelectedDate(date);
                            setSelectedTime(null);
                            setDayClosureInfo(blackoutInfo);
                            toast.error(blackoutInfo.reason ? `${blackoutInfo.title}: ${blackoutInfo.reason}` : blackoutInfo.title);
                            return;
                          }
                          setSelectedDate(date);
                          setSelectedTime(null);
                          setDayClosureInfo(null);
                        }}
                        className={cn(
                          "flex-shrink-0 px-4 py-3 rounded-2xl text-center transition-all border-2 min-w-[72px] relative",
                          isBlackedOut
                            ? 'bg-muted/60 border-destructive/30 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-card border-border hover:border-primary/50'
                        )}
                        title={isBlackedOut ? blackoutInfo.title : undefined}
                      >
                        {isBlackedOut && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-[85%] h-0.5 bg-destructive/50 rotate-[-20deg] rounded-full" />
                          </div>
                        )}
                        <p className={cn("text-[10px] uppercase font-medium", isBlackedOut ? 'text-muted-foreground' : 'opacity-70')}>
                          {isToday ? t('booking.today') : dayLabels[dayIdx]}
                        </p>
                        <p className={cn("text-lg font-bold", isBlackedOut && 'text-muted-foreground')}>{format(date, 'd')}</p>
                        <p className={cn("text-[10px]", isBlackedOut ? 'text-destructive font-semibold' : 'opacity-70')}>
                          {isBlackedOut ? t('booking.closed') : format(date, 'MMM')}
                        </p>
                        {isToday && !isBlackedOut && (
                          <div className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full-day closure notice */}
              {selectedDate && dayClosureInfo && (
                <Card className="p-4 rounded-2xl bg-destructive/5 border-destructive/20">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-destructive">
                        {t('booking.fullyClosed')}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{dayClosureInfo.title}</p>
                      {dayClosureInfo.reason && (
                        <p className="text-xs text-muted-foreground mt-1">{dayClosureInfo.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('booking.selectAnotherDate')}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Partial blackout notice */}
              {selectedDate && !dayClosureInfo && dayBlackoutNote && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{dayBlackoutNote}</p>
                </div>
              )}

              {/* Time slots grid */}
              {selectedDate && !dayClosureInfo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">
                    {format(selectedDate, 'EEEE, d MMMM yyyy')}
                  </p>
                  <DensityTimeSelector
                    openTime={selectedBranch.open_time}
                    closeTime={selectedBranch.close_time}
                    slotDurationMin={selectedBranch.slot_duration_minutes}
                    counselorCount={selectedBranch.counselor_count}
                    slotTimes={rpcSlotTimes}
                    bookedSlots={bookedSlots}
                    blockedSlots={blockedSlots}
                    selectedTime={selectedTime}
                    onSelectTime={(time) => {
                      if (blockedSlots[time]) {
                        toast.error(t('booking.slotBlocked'));
                        return;
                      }
                      setSelectedTime(time);
                    }}
                    serviceSlugs={selectedServices.map(s => s.slug)}
                    walkinPressure={walkinPressure}
                  />
                </div>
              )}

              {/* Next button */}
              {selectedDate && selectedTime && (
                <Button
                  onClick={() => setStep('confirm')}
                  className="w-full gap-2 rounded-full h-12"
                  size="lg"
                >
                  {t('booking.next')}
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
                    {loc(selectedBranch.name_th, selectedBranch.name_en)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {t('booking.selectedServices')}
                  </p>
                  {selectedServices.map(svc => (
                    <div key={svc.id} className="flex items-center gap-2">
                      <span className="text-lg">{svc.icon}</span>
                      <span className="text-sm font-medium">
                        {loc(svc.name_th, svc.name_en)}
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
                  <span>{t('booking.freeInfo')}</span>
                </div>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('booking.notesLabel')}
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('booking.notesPlaceholder')}
                  maxLength={500}
                  rows={2}
                  className="rounded-2xl"
                />
              </div>

              {/* Contact information – required */}
              <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {language === 'th' ? 'ช่องทางติดต่อ' : 'Contact Information'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {language === 'th'
                      ? 'เพื่อให้คลินิกสามารถแจ้งเลื่อนนัด หรือแจ้งผลตรวจที่สำคัญได้อย่างรวดเร็ว'
                      : 'So the clinic can quickly notify you of schedule changes or important test results'}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    {language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone number'} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="rounded-xl"
                    maxLength={15}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    💬 LINE ID <span className="text-xs text-muted-foreground font-normal">({language === 'th' ? 'ไม่บังคับ' : 'optional'})</span>
                  </label>
                  <Input
                    type="text"
                    value={contactLine}
                    onChange={(e) => setContactLine(e.target.value)}
                    placeholder="@lineid"
                    className="rounded-xl"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5 text-[10px] text-muted-foreground leading-relaxed">
                  <p>{language === 'th'
                    ? 'หากไม่ประสงค์ให้ติดต่อทางโทรศัพท์ สามารถระบุ LINE ID หรือแจ้งเจ้าหน้าที่ได้'
                    : 'If you prefer not to be contacted by phone, you can provide a LINE ID or inform staff on-site'}
                  </p>
                  <p className="flex items-center gap-1">
                    🔒 {language === 'th'
                      ? 'ข้อมูลของท่านจะถูกใช้เพื่อการดูแลรักษาเท่านั้น และเก็บรักษาอย่างปลอดภัย'
                      : 'Your information is used solely for your care and stored securely'}
                  </p>
                </div>
              </Card>

              {/* Anonymous booking: collect email */}
              {!user && (
                <div className="space-y-3">
                  <Card className="p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 rounded-2xl">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{t('booking.anonNotice')}</span>
                    </div>
                  </Card>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('booking.contactEmail')} <span className="text-xs text-muted-foreground font-normal">({language === 'th' ? 'ไม่บังคับ' : 'optional'})</span>
                    </label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t('booking.idUploadHint')}</span>
              </div>

              <Button
                onClick={handleBook}
                disabled={submitting}
                className="w-full gap-2 rounded-full h-12"
                size="lg"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t('booking.confirm')}
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
                  {t('booking.successTitle')}
                </h2>
              </div>

              {/* Referral code */}
              <Card className="p-6 rounded-3xl border-2 border-primary/20 bg-primary/5">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
                  {t('booking.bookingCode')}
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
                  <span className="font-semibold">{loc(selectedBranch.name_th, selectedBranch.name_en)}</span>
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
                  {selectedServices.map(s => `${s.icon} ${loc(s.name_th, s.name_en)}`).join(', ')}
                </div>
              </Card>

              {/* Screenshot guidance */}
              <Card className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Camera className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-left text-sm">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      {t('booking.screenshotHint')}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {t('booking.screenshotDesc')}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="space-y-3">
                {user ? (
                  <Button onClick={() => navigate('/my-appointments')} className="w-full rounded-full h-12" size="lg">
                    {t('booking.viewMyAppointments')}
                  </Button>
                ) : (
                  <>
                    <Card className="p-4 rounded-3xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                            {t('booking.emailSent')}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                            {t('booking.emailSentDesc')}
                          </p>
                        </div>
                      </div>
                    </Card>

                    {guestToken && (
                      <Button
                        onClick={() => navigate(`/guest-appointments?token=${guestToken}`)}
                        className="w-full rounded-full h-12 gap-2"
                        size="lg"
                      >
                        {t('booking.viewMyAppointments')}
                      </Button>
                    )}

                    <Card className="p-4 rounded-3xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-start gap-3">
                        <UserPlus className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                            {t('booking.wantEasier')}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                            {t('booking.registerBenefit')}
                          </p>
                        </div>
                      </div>
                    </Card>
                    <Button onClick={() => navigate('/auth?redirect=/my-appointments')} variant="outline" className="w-full rounded-full h-12 gap-2" size="lg">
                      <UserPlus className="h-4 w-4" />
                      {t('booking.register')}
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-full">
                  {t('booking.backToHome')}
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
