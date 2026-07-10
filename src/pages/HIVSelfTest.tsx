import { openSupportChat } from "@/lib/openSupportChat";
import { useState, useEffect, useRef } from "react";
import { trackEvent } from "@/hooks/useAnalytics";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProvinces } from "@/lib/thailand-address";
import { isValidThaiId, normalizeThaiId } from "@/lib/thaiId";

import { 
  TestTube, 
  Play, 
  Camera, 
  CheckCircle2, 
  AlertTriangle,
  Upload,
  Phone,
  ArrowRight,
  ArrowLeft,
  Timer,
  Loader2,
  Check,
  X,
  MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuestProgress } from "@/hooks/useQuestProgress";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

import { 
  IntroStep, 
  LiteRequestStep,
  AccountSuccessStep,
  Step,
  DeliveryMode,
  SelfTestRequest,
  ShippingFormData,
  NHSOFormData,
  TESTING_STEPS
} from "@/components/hiv-selftest";
import { SelfTestResultExplanation } from "@/components/hiv-selftest/SelfTestResultExplanation";
import { LeanResultSubmissionFlow } from "@/components/hiv-selftest/LeanResultSubmissionFlow";
import {
  getSelfTestSubmittedTime,
  hasSubmittedSelfTestResult,
  isSupersededBySelfTestSubmission,
} from "@/lib/selftestStatus";

import { useFormAutosave } from "@/hooks/useFormAutosave";

const OPEN_SELFTEST_REQUEST_STATUSES = new Set([
  'pending',
  'approved',
  'shipped',
  'delivered',
  'received',
  'confirmed',
  'received_confirmed',
]);

export default function HIVSelfTest() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { trackSelftestRequest } = useQuestProgress();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDirectSubmitAction = searchParams.get('action') === 'submit';
  
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [activeRequest, setActiveRequest] = useState<SelfTestRequest | null>(null);
  const [requests, setRequests] = useState<SelfTestRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('ship');
  const { saveDraft, loadDraft, clearDraft } = useFormAutosave();
  // Saved user data for reuse
  const [savedUserData, setSavedUserData] = useState<{
    thaiId?: string;
    dateOfBirth?: string;
    gender?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    province?: string;
  } | null>(null);
  
  // Form states
  const [shippingData, setShippingData] = useState<ShippingFormData>({
    fullName: "",
    phone: "",
    lineId: "",
    address: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: "",
    lastRiskDate: "",
  });
  
  const [nhsoData, setNhsoData] = useState<NHSOFormData>({
    thaiId: "",
    passportNo: "",
    idType: "thai_id",
    dateOfBirth: "",
    gender: "",
  });
  
  // Pickup location state
  const [pickupLocation, setPickupLocation] = useState<{ latitude: number; longitude: number; timestamp: number; status: string } | null>(null);

  // Testing state
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  // Timer state - persist across sessions
  const TIMER_STORAGE_KEY = 'hiv-selftest-timer';
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      const { startedAt, duration } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      return remaining;
    }
    return 15 * 60;
  });
  const [timerActive, setTimerActive] = useState(() => {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      const { startedAt, duration } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      return elapsed < duration;
    }
    return false;
  });
  const [timerFinished, setTimerFinished] = useState(() => {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      const { startedAt, duration } = JSON.parse(stored);
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      return elapsed >= duration;
    }
    return false;
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  
  // Photo & Analysis state
  const [resultPhoto, setResultPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Branch assignment from URL param
  const hasBranchParam = searchParams.has('branch') && ['silom', 'pattaya'].includes(searchParams.get('branch')?.toLowerCase() || '');
  const [assignedBranch, setAssignedBranch] = useState<string>(() => {
    const branchParam = searchParams.get('branch');
    if (branchParam && ['silom', 'pattaya'].includes(branchParam.toLowerCase())) {
      return branchParam.toLowerCase();
    }
    return ''; // No default - user must select
  });
  
  // Contact consent state for positive results
  const [wantsCallback, setWantsCallback] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");

  // Guest contact fields (used when no logged-in user submits a result from an existing kit)
  const [guestThaiId, setGuestThaiId] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestLineId, setGuestLineId] = useState("");
  const [guestProvince, setGuestProvince] = useState("");
  // PDPA consent — required before submitting Thai national ID with test result.
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<'positive' | 'negative' | 'invalid' | 'inconclusive' | null>(null);
  const [analysisDetails, setAnalysisDetails] = useState<{
    confidence?: string;
    artifact_risk?: string;
    test_line_strength?: string;
    reasoning?: string;
    verified?: boolean;
    passes_agreed?: boolean;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Auto-generated account credentials (for success screen)
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  // Fetch user data and requests on mount
  useEffect(() => {
    trackEvent('page_view_selftest', { source: document.referrer.includes(window.location.origin) ? 'internal' : 'external' });
  }, []);

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchSavedUserData();
    }
  }, [user]);

  // Dedicated event for invalidating the active self-test request after a
  // successful result submission. Clears in-memory state immediately so the
  // Lean flow doesn't re-enter "submit your result" while the refetch is
  // in flight, then re-reads from the DB (which excludes result_submitted).
  useEffect(() => {
    const onActiveRefresh = (event: Event) => {
      const requestId = (event as CustomEvent<{ requestId?: string }>).detail?.requestId;
      if (requestId) completedRequestIdsRef.current.add(requestId);
      justSubmittedRef.current = true;
      setActiveRequest(null);
      setCurrentStep('intro');
      if (user) fetchRequests();
    };
    window.addEventListener('selftest:active-request-refresh', onActiveRefresh);
    return () => {
      window.removeEventListener('selftest:active-request-refresh', onActiveRefresh);
    };
  }, [user]);

  // Magic link resolution: ?token=... lets users re-enter the result submission flow
  // bound to the original kit request (no new request will be created).
  const [magicLinkState, setMagicLinkState] = useState<
    | { status: 'idle' }
    | { status: 'resolving' }
    | { status: 'ok'; phone: string | null }
    | { status: 'error'; reason: string }
  >({ status: 'idle' });

  // Ref used to short-circuit the magic-link resolver right after a successful
  // submission on the same mount (avoids re-entering the Lean flow if React
  // re-runs effects before the URL has been cleared).
  const justSubmittedRef = useRef(false);
  const completedRequestIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    if (justSubmittedRef.current) return;
    setMagicLinkState({ status: 'resolving' });
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('selftest-magic-resolve', {
          body: { token },
        });
        if (error || !data?.request) {
          const reason = (data && (data.error as string)) || 'invalid';
          setMagicLinkState({ status: 'error', reason });
          trackEvent('selftest_magic_link_failed', { reason });
          return;
        }
        const reqRow = data.request;

        // Hard guard: if the request already has a submitted result, do NOT
        // route the user back into the submit-result flow. Clear stale local
        // state, strip the token from the URL and send them to intro.
        if (hasSubmittedSelfTestResult(reqRow)) {
          try {
            localStorage.removeItem('hiv-selftest-timer');
            window.dispatchEvent(new CustomEvent('selftest:pending-refresh'));
          } catch { /* noop */ }
          setActiveRequest(null);
          setCurrentStep('intro');
          setMagicLinkState({ status: 'ok', phone: reqRow.phone ?? null });
          toast.success(
            language === 'th'
              ? 'ผลตรวจนี้ถูกส่งเรียบร้อยแล้ว'
              : 'This result has already been submitted.'
          );
          navigate('/th/hiv-selftest', { replace: true });
          trackEvent('selftest_magic_link_already_submitted', {
            request_id: reqRow.id,
          });
          return;
        }

        setActiveRequest({
          id: reqRow.id,
          status: reqRow.status,
          tracking_number: null,
          test_result: reqRow.test_result ?? null,
          created_at: reqRow.created_at || new Date().toISOString(),
          result_photo_url: reqRow.result_photo_url ?? null,
          // Non-typed passthrough so downstream guards see the timestamp.
          ...(reqRow.result_submitted_at
            ? { result_submitted_at: reqRow.result_submitted_at }
            : {}),
        } as SelfTestRequest);
        if (reqRow.assigned_branch) setAssignedBranch(reqRow.assigned_branch);
        setMagicLinkState({ status: 'ok', phone: reqRow.phone ?? null });
        // Jump straight into Lean submission flow — bound to the original request id.
        setCurrentStep('photo-result');
        trackEvent('selftest_magic_link_resolved', {
          request_id: reqRow.id,
          delivery_mode: reqRow.delivery_mode,
        });
      } catch (e) {
        console.error('[magic-link]', e);
        setMagicLinkState({ status: 'error', reason: 'server_error' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('token')]);


  // Fetch saved user data for auto-fill (reuse on subsequent requests)
  const fetchSavedUserData = async () => {
    if (!user) return;
    
    // First try to get from the most recent selftest_pii entry
    const { data: piiData } = await supabase
      .from('selftest_pii')
      .select('thai_id, date_of_birth, gender, full_name, phone, address, province')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (piiData) {
      setSavedUserData({
        thaiId: piiData.thai_id || undefined,
        dateOfBirth: piiData.date_of_birth || undefined,
        gender: piiData.gender || undefined,
        fullName: piiData.full_name || undefined,
        phone: piiData.phone || undefined,
        address: piiData.address || undefined,
        province: piiData.province || undefined,
      });
      
      // Pre-fill NHSO data if available
      if (piiData.thai_id || piiData.date_of_birth || piiData.gender) {
        setNhsoData(prev => ({
          ...prev,
          thaiId: piiData.thai_id || prev.thaiId,
          dateOfBirth: piiData.date_of_birth || prev.dateOfBirth,
          gender: (piiData.gender as NHSOFormData['gender']) || prev.gender,
        }));
      }
      
      // Pre-fill shipping data if available
      if (piiData.full_name || piiData.phone) {
        setShippingData(prev => ({
          ...prev,
          fullName: piiData.full_name || prev.fullName,
          phone: piiData.phone || prev.phone,
          address: piiData.address || prev.address,
          province: piiData.province || prev.province,
        }));
      }
    } else {
      // Fallback: try user_personal_info
      const { data: personalData } = await supabase
        .from('user_personal_info')
        .select('date_of_birth, gender')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (personalData) {
        setNhsoData(prev => ({
          ...prev,
          dateOfBirth: personalData.date_of_birth || prev.dateOfBirth,
          gender: (personalData.gender as NHSOFormData['gender']) || prev.gender,
        }));
      }
    }
  };

  // Direct submission channel: `?action=submit` drops the visitor straight onto the
  // "submit result from existing kit" step (shared via /submit-result short links).
  useEffect(() => {
    if (isDirectSubmitAction) {
      setCurrentStep('photo-result');
      trackEvent('selftest_direct_submit_link_opened', {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirectSubmitAction]);

  // Determine which step to show based on active request status.
  // Safety net: if the request already carries any result-submitted signal,
  // do NOT re-enter the submission flow — that would loop the user back to
  // "photo-result" / "confirm-receipt" after they already submitted.
  useEffect(() => {
    if (!activeRequest) return;

    // Direct submit links must always show the actual result form. If a user
    // has an active unsubmitted kit, the form binds to it; otherwise the
    // standalone fallback below records a new result through the guest endpoint.
    if (isDirectSubmitAction) {
      if (hasSubmittedSelfTestResult(activeRequest)) {
        setActiveRequest(null);
      }
      setCurrentStep('photo-result');
      return;
    }

    // If the active request already has any result-submitted signal, clear it
    // and route back to intro — never re-enter the submission flow.
    if (hasSubmittedSelfTestResult(activeRequest)) {
      setActiveRequest(null);
      setCurrentStep('intro');
      try {
        localStorage.removeItem('hiv-selftest-timer');
        window.dispatchEvent(new CustomEvent('selftest:pending-refresh'));
      } catch { /* noop */ }
      return;
    }

    if (activeRequest.status === 'pending' || activeRequest.status === 'approved' || activeRequest.status === 'shipped') {
      setCurrentStep('intro');
    } else if (activeRequest.status === 'delivered') {
      setCurrentStep('confirm-receipt');
    } else if (activeRequest.status === 'confirmed' || activeRequest.status === 'received') {
      // Kit already confirmed as received — send straight to result submission.
      setCurrentStep('photo-result');
    }
  }, [activeRequest, isDirectSubmitAction]);

  // Timer effect
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            setTimerFinished(true);
            localStorage.removeItem(TIMER_STORAGE_KEY);
            if (timerRef.current) clearInterval(timerRef.current);
            if (alarmRef.current) {
              alarmRef.current.play().catch(() => {});
            }
            if ('vibrate' in navigator) {
              navigator.vibrate([500, 200, 500, 200, 500]);
            }
            toast.success(language === 'th' ? 'ถึงเวลาอ่านผล' : 'Time to read result');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, language]);

  const startTimer = () => {
    const timerData = {
      startedAt: Date.now(),
      duration: 15 * 60
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
    setTimerSeconds(15 * 60);
    setTimerActive(true);
    setTimerFinished(false);
    setCurrentStep('timer');
  };

  const skipTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setTimerActive(false);
    setTimerSeconds(0);
    setTimerFinished(true);
    setCurrentStep('photo-result');
  };

  useEffect(() => {
    if (currentStep !== 'timer' && alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
  }, [currentStep]);

  const fetchRequests = async () => {
    if (!user) return;

    const [requestRes, checksRes] = await Promise.all([
      supabase
        .from('hiv_selftest_requests')
        .select('id, status, tracking_number, test_result, created_at, updated_at, result_photo_url, result_submitted_at, self_reported_result')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('hiv_self_test_checks')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (requestRes.error) {
      console.error('[selftest fetchRequests]', requestRes.error);
      return;
    }

    const data = requestRes.data ?? [];

    if (data) {
      const submittedTimes = [
        ...data
          .map((row) => getSelfTestSubmittedTime(row))
          .filter((time): time is number => time !== null),
        ...((checksRes.data ?? [])
          .map((row) => {
            const time = row.created_at ? new Date(row.created_at).getTime() : NaN;
            return Number.isFinite(time) ? time : null;
          })
          .filter((time): time is number => time !== null)),
      ];

      const isOpenUnsubmittedCycle = (row: typeof data[number]) => {
        const status = String(row.status ?? '').toLowerCase();
        return (
          OPEN_SELFTEST_REQUEST_STATUSES.has(status) &&
          !completedRequestIdsRef.current.has(row.id) &&
          !hasSubmittedSelfTestResult(row) &&
          !isSupersededBySelfTestSubmission(row, submittedTimes)
        );
      };

      setRequests(data);
      const active = data.find((r) => isOpenUnsubmittedCycle(r));
      setActiveRequest((prev) => {
        // If the row we currently render as "active" no longer qualifies
        // (result was just submitted, status flipped, etc.), drop it and
        // bounce the user back to intro to prevent the loop.
        if (prev && !data.some((r) => r.id === prev.id && isOpenUnsubmittedCycle(r))) {
          setCurrentStep((step) =>
            isDirectSubmitAction
              ? 'photo-result'
              : step === 'confirm-receipt' || step === 'video' || step === 'testing' ||
                step === 'timer' || step === 'photo-result'
                ? 'intro'
                : step
          );
          try { localStorage.removeItem('hiv-selftest-timer'); } catch { /* noop */ }
        }
        return active ?? null;
      });
    }
  };

  const handleStandaloneSubmitDone = () => {
    setCurrentStep('intro');
    try {
      localStorage.removeItem('hiv-selftest-timer');
      window.dispatchEvent(new CustomEvent('selftest:pending-refresh'));
    } catch { /* noop */ }
    if (searchParams.has('action')) {
      navigate('/th/hiv-selftest', { replace: true });
    }
    if (user) fetchRequests();
  };

  const calculateDaysSinceRisk = (date: string): number => {
    if (!date) return 0;
    const riskDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - riskDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Generate a cryptographically secure random password
  const generateSecurePassword = (): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => charset[byte % charset.length]).join('');
  };

  // Auto-register guest user using Thai ID
  const autoRegisterUser = async (): Promise<{ userId: string; username: string; password: string; isNew: boolean } | null> => {
    if (user) return { userId: user.id, username: '', password: '', isNew: false };
    
    if (!nhsoData.thaiId || nhsoData.thaiId.length !== 13) {
      toast.error(language === 'th' ? 'กรุณากรอกหมายเลขบัตรประชาชนให้ถูกต้อง' : 'Please enter a valid Thai ID');
      return null;
    }

    // Generate username from Thai ID (last 6 digits + random suffix for privacy)
    const suffix = nhsoData.thaiId.slice(-6);
    const randomPart = Math.random().toString(36).slice(-4);
    const username = `user_${suffix}_${randomPart}`;
    const email = `${username}@swingth.local`;
    
    // Generate a cryptographically secure random password (not based on personal data)
    const password = generateSecurePassword();

    try {
      // Create the auth user via edge function (admin API, no confirmation email).
      // This avoids Supabase's signup email rate limit on synthetic @swingth.local addresses.
      const { data: regData, error: regError } = await supabase.functions.invoke(
        'selftest-auto-register',
        {
          body: {
            email,
            password,
            display_name: shippingData.fullName || username,
          },
        }
      );

      if (regError || (regData && regData.error)) {
        const errMsg = (regData && regData.error) || regError?.message || '';
        // If user with this email somehow exists, regenerate and retry once with fresh suffix.
        if (errMsg === 'already_exists') {
          const retrySuffix = Math.random().toString(36).slice(-6);
          const retryEmail = `user_${suffix}_${retrySuffix}@swingth.local`;
          const { data: retryData, error: retryError } = await supabase.functions.invoke(
            'selftest-auto-register',
            { body: { email: retryEmail, password, display_name: shippingData.fullName || username } }
          );
          if (retryError || (retryData && retryData.error)) {
            console.error('Auto-registration retry failed:', retryError || retryData);
            toast.error(language === 'th' ? 'เกิดข้อผิดพลาดในการลงทะเบียน' : 'Registration error');
            return null;
          }
          const { data: signIn2, error: signInErr2 } = await supabase.auth.signInWithPassword({
            email: retryEmail, password,
          });
          if (signInErr2) {
            console.error('Auto-login (retry) failed:', signInErr2);
            toast.error(language === 'th' ? 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่' : 'Could not log in. Please try again.');
            return null;
          }
          setGeneratedCredentials({ username: retryEmail, password });
          return { userId: signIn2.user?.id || '', username: retryEmail, password, isNew: true };
        }

        console.error('Auto-registration error:', errMsg, regError);
        toast.error(language === 'th' ? 'เกิดข้อผิดพลาดในการลงทะเบียน' : 'Registration error');
        return null;
      }

      // Sign the new user in client-side so the session is available immediately.
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        console.error('Auto-login failed:', signInError);
        toast.error(language === 'th' ? 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่' : 'Could not log in. Please try again.');
        return null;
      }

      setGeneratedCredentials({ username: email, password });
      return { userId: signInData.user?.id || regData?.user_id || '', username: email, password, isNew: true };
    } catch (error) {
      console.error('Auto-registration failed:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Something went wrong. Please try again.');
      return null;
    }
  };

  // Submit request with NHSO verification (auto-registration for guests)
  const handleSubmitRequest = async () => {
    const daysSinceRisk = calculateDaysSinceRisk(shippingData.lastRiskDate);
    
    if (daysSinceRisk < 30 && shippingData.lastRiskDate) {
      toast.warning(
        language === 'th' 
          ? `ผ่านมาแค่ ${daysSinceRisk} วัน เราแนะนำให้รอครบ 30 วันก่อนตรวจ หรือเข้ามาตรวจที่คลินิกได้เลย`
          : `Only ${daysSinceRisk} days have passed. We suggest waiting 30 days, or visiting a clinic for testing.`
      );
    }

    trackEvent('selftest_started', { source: 'selftest', delivery_mode: deliveryMode });
    setLoading(true);

    try {
      const isPickup = deliveryMode === 'pickup';
      const isPassport = isPickup && nhsoData.idType === 'passport';
      // For venue pickup, mark as 'delivered' so the user must explicitly
      // confirm they received the kit from staff in the next step.
      const initialStatus = isPickup ? 'delivered' : 'pending';

      // Validate ID input up-front
      if (isPassport) {
        const p = (nhsoData.passportNo || '').trim();
        if (p.length < 5) {
          toast.error(language === 'th' ? 'กรุณากรอกหมายเลขพาสปอร์ต' : 'Please enter your passport number');
          setLoading(false);
          return;
        }
      } else if (!nhsoData.thaiId || nhsoData.thaiId.length !== 13) {
        toast.error(language === 'th' ? 'กรุณากรอกหมายเลขบัตรประชาชนให้ถูกต้อง' : 'Please enter a valid Thai ID');
        setLoading(false);
        return;
      }

      const piiPayload: Record<string, any> = {
        full_name: shippingData.fullName,
        date_of_birth: nhsoData.dateOfBirth || null,
        thai_id: isPassport ? null : nhsoData.thaiId,
        passport_no: isPassport ? (nhsoData.passportNo || '').trim() : null,
        id_type: isPassport ? 'passport' : 'thai_id',
        gender: nhsoData.gender || null,
        phone: shippingData.phone,
        line_id: shippingData.lineId,
        address: shippingData.address,
        subdistrict: shippingData.subdistrict,
        district: shippingData.district,
        province: shippingData.province,
        postal_code: shippingData.postalCode,
      };

      const requestPayload: Record<string, any> = {
        last_risk_date: shippingData.lastRiskDate || null,
        days_since_risk: daysSinceRisk,
        status: initialStatus,
        assigned_branch: assignedBranch,
        delivery_mode: deliveryMode,
      };

      if (isPickup && pickupLocation) {
        requestPayload.pickup_location_captured = pickupLocation.status === 'captured';
        requestPayload.pickup_latitude = pickupLocation.status === 'captured' ? pickupLocation.latitude : null;
        requestPayload.pickup_longitude = pickupLocation.status === 'captured' ? pickupLocation.longitude : null;
        requestPayload.pickup_location_timestamp = pickupLocation.status === 'captured' ? new Date(pickupLocation.timestamp).toISOString() : null;
        requestPayload.pickup_location_status = pickupLocation.status;
      } else if (isPickup) {
        requestPayload.pickup_location_captured = false;
        requestPayload.pickup_location_status = 'not_attempted';
      }

      // Build auth/registration parameters for the edge function
      let invokeBody: Record<string, any> = {
        mode: 'submit',
        pii: piiPayload,
        request: requestPayload,
      };
      let isNewUser = false;
      let pendingCredentials: { username: string; password: string } | null = null;

      if (user?.id) {
        invokeBody.user_id = user.id;
      } else {
        if (isPassport) {
          const p = (nhsoData.passportNo || '').trim();
          if (p.length < 5) {
            toast.error(language === 'th' ? 'กรุณากรอกหมายเลขพาสปอร์ต' : 'Please enter your passport number');
            setLoading(false);
            return;
          }
        } else if (!nhsoData.thaiId || nhsoData.thaiId.length !== 13) {
          toast.error(language === 'th' ? 'กรุณากรอกหมายเลขบัตรประชาชนให้ถูกต้อง' : 'Please enter a valid Thai ID');
          setLoading(false);
          return;
        }
        const idSource = isPassport ? (nhsoData.passportNo || '').replace(/[^A-Z0-9]/gi, '') : nhsoData.thaiId;
        const suffix = idSource.slice(-6).toLowerCase();
        const randomPart = Math.random().toString(36).slice(-4);
        const email = `user_${suffix}_${randomPart}@swingth.local`;
        const password = generateSecurePassword();
        invokeBody = { ...invokeBody, email, password, display_name: shippingData.fullName || email };
        pendingCredentials = { username: email, password };
        isNewUser = true;
      }

      // Single server-side call: creates user (if needed) + inserts PII + request with service role
      let { data: submitData, error: submitError } = await supabase.functions.invoke(
        'selftest-auto-register',
        { body: invokeBody }
      );

      // Retry once if generated email collides
      if (!user?.id && (submitError || (submitData && submitData.error === 'already_exists'))) {
        const idSource = isPassport ? (nhsoData.passportNo || '').replace(/[^A-Z0-9]/gi, '') : nhsoData.thaiId;
        const suffix = idSource.slice(-6).toLowerCase();
        const retrySuffix = Math.random().toString(36).slice(-6);
        const retryEmail = `user_${suffix}_${retrySuffix}@swingth.local`;
        const password = generateSecurePassword();
        pendingCredentials = { username: retryEmail, password };
        const retry = await supabase.functions.invoke('selftest-auto-register', {
          body: { ...invokeBody, email: retryEmail, password, display_name: shippingData.fullName || retryEmail },
        });
        submitData = retry.data;
        submitError = retry.error;
      }

      if (submitError || !submitData || submitData.error) {
        console.error('Submit failed:', submitError || submitData);
        toast.error(language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      const userId: string = submitData.user_id;
      const data = submitData.request;

      // Sign the new user in so the rest of the app sees them as authenticated
      if (isNewUser && pendingCredentials) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: pendingCredentials.username,
          password: pendingCredentials.password,
        });
        if (signInError) {
          console.error('Auto-login failed:', signInError);
        } else {
          setGeneratedCredentials(pendingCredentials);
        }
      }

      // Note: Venue pickup auto-confirmed status is recorded directly in the request record

      // Award 100 XP for requesting the kit
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', userId)
        .maybeSingle();
      
      if (profile) {
        const currentXP = profile.xp || 0;
        const newXP = currentXP + 100;
        const newLevel = Math.floor(newXP / 500) + 1;
        
        await supabase
          .from('profiles')
          .update({ xp: newXP, level: newLevel })
          .eq('id', userId);
      }
      
      // Keep NHSO data for reuse
      setSavedUserData({
        thaiId: nhsoData.thaiId,
        dateOfBirth: nhsoData.dateOfBirth,
        gender: nhsoData.gender,
        fullName: shippingData.fullName,
        phone: shippingData.phone,
      });
      
      if (data) {
        setActiveRequest(data);
      }
      
      // Track selftest request quest
      trackSelftestRequest(language);
      
      // Show account success screen for NEW users, otherwise go to appropriate step
      if (isNewUser && pendingCredentials) {
        setCurrentStep('account-success');
      } else if (isPickup) {
        // Venue pickup: require explicit confirmation that the kit was
        // received from staff before moving on to the test video.
        toast.success(
          language === 'th'
            ? '📦 บันทึกข้อมูลแล้ว กรุณายืนยันการรับชุดตรวจจากเจ้าหน้าที่'
            : '📦 Info saved. Please confirm receipt from staff.'
        );
        setCurrentStep('confirm-receipt');
        trackEvent('selftest_submitted', { source: 'selftest', delivery_mode: deliveryMode, step: 'pickup_pending_confirm' });
      } else {
        toast.success(
          language === 'th' 
            ? '🎉 ส่งคำขอสำเร็จ! เจ้าหน้าที่จะติดต่อกลับ' 
            : '🎉 Request submitted! Staff will contact you.'
        );
        setCurrentStep('intro');
        trackEvent('selftest_submitted', { source: 'selftest', delivery_mode: deliveryMode, step: 'request_sent' });
      }
      
      // Reset shipping form
      setShippingData({
        fullName: "",
        phone: "",
        lineId: "",
        address: "",
        subdistrict: "",
        district: "",
        province: "",
        postalCode: "",
        lastRiskDate: "",
      });
      
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!activeRequest) return;
    
    setLoading(true);
    try {
      await supabase
        .from('hiv_selftest_requests')
        .update({ status: 'received', received_at: new Date().toISOString() } as any)
        .eq('id', activeRequest.id);
      
      setActiveRequest({ ...activeRequest, status: 'received' });
      // Venue pickup: after confirming receipt, jump straight to the
      // result submission page (skip tutorial/timer — kit already used on-site).
      setCurrentStep('photo-result');
      toast.success(language === 'th' ? 'ยืนยันการรับสำเร็จ! ส่งผลตรวจได้เลย' : 'Receipt confirmed! You can submit your result now');
    } catch (error) {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResultPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeResult = async () => {
    if (!photoPreview) return;
    
    setAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-hiv-test', {
        body: { imageBase64: photoPreview }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error(language === 'th' ? 'ระบบยุ่งอยู่ กรุณาลองใหม่อีกครั้ง' : 'System busy, please try again');
        } else if (data.error.includes('Payment required')) {
          toast.error(language === 'th' ? 'ระบบไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง' : 'Service unavailable, please try later');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      const result = data?.result;
      
      if (result === 'negative') {
        setAnalysisResult('negative');
      } else if (result === 'positive') {
        setAnalysisResult('positive');
      } else if (result === 'inconclusive') {
        setAnalysisResult('inconclusive');
      } else {
        setAnalysisResult('invalid');
      }

      // Store detailed analysis info
      setAnalysisDetails({
        confidence: data?.confidence,
        artifact_risk: data?.artifact_risk,
        test_line_strength: data?.test_line_strength,
        reasoning: data?.reasoning,
        verified: data?.verified,
        passes_agreed: data?.passes_agreed,
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error(language === 'th' ? 'ไม่สามารถวิเคราะห์ภาพได้' : 'Could not analyze image');
      setAnalysisResult('invalid');
      setAnalysisDetails(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!resultPhoto) {
      toast.error(language === 'th' ? 'กรุณาถ่ายรูปผลตรวจก่อน' : 'Please take a photo first');
      return;
    }
    if (!pdpaConsent) {
      toast.error(language === 'th' ? 'กรุณายืนยันความยินยอม PDPA ก่อนส่ง' : 'Please confirm PDPA consent before submitting');
      return;
    }


    // Guest path: no login required, but we need basic contact info
    if (!user) {
      const trimmedThaiId = normalizeThaiId(guestThaiId);
      const trimmedPhone = guestPhone.replace(/\s+/g, '');
      if (!isValidThaiId(trimmedThaiId)) {
        toast.error(language === 'th' ? 'เลขบัตรประชาชนไม่ถูกต้อง' : 'Invalid Thai national ID');
        return;
      }
      if (trimmedPhone.length < 8) {
        toast.error(language === 'th' ? 'กรุณากรอกเบอร์โทรที่ติดต่อได้' : 'Please enter a valid phone number');
        return;
      }
      const trimmedProvince = guestProvince.trim();
      if (!trimmedProvince) {
        toast.error(language === 'th' ? 'กรุณาเลือกจังหวัด' : 'Please select a province');
        return;
      }

      // Map AI analysis result → DB-allowed self-reported value
      const mapped: 'negative' | 'reactive' | 'invalid' =
        analysisResult === 'positive' ? 'reactive'
        : analysisResult === 'negative' ? 'negative'
        : 'invalid';

      setUploading(true);
      try {
        const fileExt = resultPhoto.name.split('.').pop() || 'jpg';
        // Path includes an unguessable per-upload token segment so guest photos
        // cannot be targeted/overwritten by guessing predictable paths.
        const fileName = `guest/${crypto.randomUUID()}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('selftest-results')
          .upload(fileName, resultPhoto, { upsert: false });
        if (uploadError) throw uploadError;

        const { error: rpcError } = await supabase.rpc('submit_guest_selftest_result', {
          p_thai_id: trimmedThaiId,
          p_phone: trimmedPhone,
          p_line_id: guestLineId.trim() || null,
          p_self_result: mapped,
          p_photo_path: fileName,
          p_wants_callback: mapped === 'reactive' ? true : wantsCallback,
          p_province: trimmedProvince,
        });
        if (rpcError) throw rpcError;

        // Clear on-device pending state so the "submit your result" banner disappears
        try {
          localStorage.removeItem(TIMER_STORAGE_KEY);
          window.dispatchEvent(new CustomEvent('selftest:pending-refresh'));
        } catch { /* noop */ }

        toast.success(
          language === 'th'
            ? 'ส่งผลตรวจสำเร็จ! เจ้าหน้าที่จะติดต่อกลับหากจำเป็น'
            : 'Result submitted! Staff will follow up if needed.'
        );

        setCurrentStep('intro');
        setCompletedSteps([]);
        setTimerSeconds(15 * 60);
        setResultPhoto(null);
        setPhotoPreview(null);
        setAnalysisResult(null);
        setAnalysisDetails(null);
        setWantsCallback(false);
        setCallbackPhone("");
        setGuestThaiId("");
        setPdpaConsent(false);
        setGuestPhone("");
        setGuestLineId("");
        setGuestProvince("");
      } catch (error) {
        console.error('Guest submit error:', error);
        toast.error(language === 'th' ? 'ส่งผลไม่สำเร็จ ลองอีกครั้ง' : 'Submission failed. Please try again.');
      } finally {
        setUploading(false);
      }
      return;
    }

    setUploading(true);
    
    try {
      let requestId = activeRequest?.id;
      
      if (!requestId) {
        const { data: newRequest, error: createError } = await supabase
          .from('hiv_selftest_requests')
          .insert({
            user_id: user.id,
            status: 'result_submitted',
          })
          .select()
          .single();
        
        if (createError) throw createError;
        requestId = newRequest.id;
      }
      
      const fileExt = resultPhoto.name.split('.').pop();
      const fileName = `${user.id}/${requestId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('selftest-results')
        .upload(fileName, resultPhoto);

      if (uploadError) throw uploadError;

      await supabase
        .from('hiv_selftest_requests')
        .update({ 
          result_photo_url: fileName,
          status: 'result_submitted',
          result_submitted_at: new Date().toISOString(),
          test_result: analysisResult,
          self_reported_result: analysisResult === 'positive' ? 'reactive' : analysisResult === 'negative' ? 'negative' : 'invalid',
          photo_provided: true,
          wants_callback: analysisResult === 'positive' ? wantsCallback : false,
          callback_phone: analysisResult === 'positive' && wantsCallback ? callbackPhone : null
        })
        .eq('id', requestId);

      // Clear on-device pending state so the "submit your result" banner disappears
      try {
        localStorage.removeItem(TIMER_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('selftest:pending-refresh'));
      } catch { /* noop */ }

      // Award 1000 XP for completing the test
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile) {
        const currentXP = profile.xp || 0;
        const newXP = currentXP + 1000;
        const newLevel = Math.floor(newXP / 500) + 1;
        
        await supabase
          .from('profiles')
          .update({ xp: newXP, level: newLevel })
          .eq('id', user.id);
        
        toast.success(
          language === 'th' 
            ? `🎉 ได้รับ 1000 XP! ส่งผลตรวจสำเร็จ` 
            : `🎉 +1000 XP! Result submitted!`
        );
      } else {
        toast.success(
          language === 'th' 
            ? 'ส่งผลตรวจสำเร็จ! เจ้าหน้าที่จะตรวจสอบ' 
            : 'Result submitted! Staff will review.'
        );
      }
      
      setActiveRequest(null);
      setCurrentStep('intro');
      setCompletedSteps([]);
      setTimerSeconds(15 * 60);
      setTimerActive(false);
      setTimerFinished(false);
      setResultPhoto(null);
      setPhotoPreview(null);
      setAnalysisResult(null);
      setAnalysisDetails(null);
      setWantsCallback(false);
      setCallbackPhone("");
      setPdpaConsent(false);
      await fetchRequests();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error(language === 'th' ? 'อัปโหลดไม่สำเร็จ' : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepNumber = () => {
    const steps: Step[] = ['intro', 'shipping', 'nhso-verify', 'account-success', 'confirm-receipt', 'video', 'testing', 'timer', 'photo-result'];
    return steps.indexOf(currentStep) + 1;
  };

  const renderStepIndicator = () => {
    // Only show indicator during the request flow and testing flow (not on success screen)
    if (currentStep === 'intro' || currentStep === 'account-success') return null;
    if (isDirectSubmitAction && currentStep === 'photo-result') return null;
    
    const requestSteps = ['shipping', 'nhso-verify'];
    const testingSteps = ['confirm-receipt', 'video', 'testing', 'timer', 'photo-result'];
    
    const isRequestFlow = requestSteps.includes(currentStep);
    const isTestingFlow = testingSteps.includes(currentStep);
    
    const displaySteps = isRequestFlow ? requestSteps : testingSteps;
    const currentIndex = displaySteps.indexOf(currentStep);
    
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {displaySteps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              currentStep === step 
                ? 'bg-primary text-primary-foreground' 
                : currentIndex > index
                  ? 'bg-success text-white'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {currentIndex > index ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < displaySteps.length - 1 && (
              <div className={`w-4 h-0.5 ${currentIndex > index ? 'bg-success' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Handle start request flow (guest-first approach)
  const handleStartRequest = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
    // Load any saved draft
    const draft = loadDraft();
    if (draft) {
      if (draft.shippingData) setShippingData(prev => ({ ...prev, ...draft.shippingData }));
      if (draft.nhsoData) setNhsoData(prev => ({ ...prev, ...draft.nhsoData as any }));
    }
    setCurrentStep('lite-request');
  };

  // Step 2: Confirm Receipt
  const renderConfirmReceiptStep = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">
          {language === 'th' ? 'ได้รับชุดตรวจแล้ว?' : 'Received the Kit?'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {language === 'th' 
            ? 'กรุณายืนยันว่าคุณได้รับชุดตรวจเรียบร้อยแล้ว'
            : 'Please confirm that you have received the test kit'
          }
        </p>
        <Button 
          className="w-full gap-2" 
          size="lg"
          onClick={handleConfirmReceipt}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Check className="h-5 w-5" />
              {language === 'th' ? 'ยืนยันว่าได้รับแล้ว' : 'Confirm Receipt'}
            </>
          )}
        </Button>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => setCurrentStep('intro')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {language === 'th' ? 'กลับ' : 'Back'}
      </Button>
    </div>
  );

  // New Step: Existing Kit Upload (for users who already have kits from other sources)
  const renderExistingKitUploadStep = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          {language === 'th' ? 'ส่งผลตรวจจากชุดที่มีอยู่' : 'Submit Result from Existing Kit'}
        </h3>

        <div className="p-3 bg-primary/5 rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">
            {language === 'th'
              ? '🩺 คุณสามารถส่งผลตรวจจากชุดตรวจ HIV ที่คุณมีอยู่แล้ว ไม่ว่าจะมาจากร้านขายยา โรงพยาบาล หรือองค์กรอื่น ๆ เราจะช่วยเชื่อมต่อคุณกับบริการดูแลสุขภาพต่อไป'
              : '🩺 You can submit results from any HIV test kit you already have, whether from a pharmacy, hospital, or other organizations. We will help connect you with care services.'
            }
          </p>
        </div>

        <div className="space-y-4">
          {/* Option 1: Watch video first */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              <p className="text-sm font-medium">
                {language === 'th' ? 'ดูวิดีโอคำแนะนำก่อน (แนะนำ)' : 'Watch tutorial video first (recommended)'}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setCurrentStep('video')}
            >
              <Play className="h-4 w-4" />
              {language === 'th' ? 'ดูวิดีโอ' : 'Watch Video'}
            </Button>
          </div>

          {/* Option 2: Skip to photo upload */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
              <p className="text-sm font-medium">
                {language === 'th' ? 'ข้ามไปส่งผลตรวจเลย' : 'Skip to submit result'}
              </p>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => setCurrentStep('photo-result')}
            >
              <Camera className="h-4 w-4" />
              {language === 'th' ? 'ส่งผลตรวจ' : 'Take Result Photo'}
            </Button>
          </div>

          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              {language === 'th'
                ? '🔒 ส่งผลแบบไม่ต้องสมัครสมาชิกได้ — เราจะขอเพียงชื่อและเบอร์ติดต่อกลับ'
                : '🔒 No account needed — we will only ask for your name and a contact number.'}
            </p>
          )}
        </div>
      </Card>

      {/* Privacy note */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-2">
          <span className="text-lg">🔒</span>
          <p className="text-xs text-muted-foreground">
            {language === 'th'
              ? 'ผลตรวจของคุณจะถูกเก็บรักษาเป็นความลับ และใช้เฉพาะเพื่อเชื่อมต่อคุณกับบริการสุขภาพเท่านั้น'
              : 'Your results will be kept confidential and only used to connect you with health services.'
            }
          </p>
        </div>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => setCurrentStep('intro')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {language === 'th' ? 'กลับ' : 'Back'}
      </Button>
    </div>
  );

  // Step 3: Video Tutorial
  const renderVideoStep = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          {language === 'th' ? 'วิดีโอสาธิตการใช้งาน' : 'Video Tutorial'}
        </h3>
        <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/LbvDEQu3kaE"
            allow="autoplay"
            allowFullScreen
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {language === 'th' 
            ? 'ดูวิดีโอให้จบก่อนทำการตรวจ เพื่อความเข้าใจที่ถูกต้อง'
            : 'Watch the entire video before testing for proper understanding'
          }
        </p>
      </Card>

      <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
              {language === 'th' ? 'ข้อควรระวัง' : 'Important'}
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              {language === 'th' 
                ? 'อ่านคำแนะนำในกล่องอย่างละเอียดก่อนเริ่มตรวจ'
                : 'Read all instructions in the box before starting'
              }
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('confirm-receipt')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === 'th' ? 'กลับ' : 'Back'}
        </Button>
        <Button className="flex-1 gap-2" onClick={() => setCurrentStep('testing')}>
          {language === 'th' ? 'เริ่มตรวจ' : 'Start Testing'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Step 4: Testing Steps
  const renderTestingStep = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <TestTube className="h-5 w-5 text-primary" />
          {language === 'th' ? 'ขั้นตอนการตรวจ' : 'Testing Steps'}
        </h3>
        
        <div className="space-y-3">
          {TESTING_STEPS.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                completedSteps.includes(step.id) 
                  ? 'bg-success/10 border border-success/30' 
                  : 'bg-muted/50'
              }`}
            >
              <Checkbox
                id={step.id}
                checked={completedSteps.includes(step.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setCompletedSteps(prev => [...prev, step.id]);
                  } else {
                    setCompletedSteps(prev => prev.filter(s => s !== step.id));
                  }
                }}
              />
              <label htmlFor={step.id} className="flex-1 cursor-pointer">
                <span className="text-sm font-medium text-foreground">
                  {index + 1}. {language === 'th' ? step.th : step.en}
                </span>
              </label>
              {completedSteps.includes(step.id) && (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
            </div>
          ))}
        </div>

        <Progress 
          value={(completedSteps.length / TESTING_STEPS.length) * 100} 
          className="mt-4"
        />
        <p className="text-xs text-muted-foreground text-center mt-2">
          {completedSteps.length} / {TESTING_STEPS.length} {language === 'th' ? 'ขั้นตอน' : 'steps'}
        </p>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('video')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === 'th' ? 'กลับ' : 'Back'}
        </Button>
        <Button 
          className="flex-1 gap-2" 
          onClick={startTimer}
          disabled={completedSteps.length < TESTING_STEPS.length}
        >
          <Timer className="h-4 w-4" />
          {language === 'th' ? 'เริ่มจับเวลา' : 'Start Timer'}
        </Button>
      </div>
    </div>
  );

  // Step 5: Timer
  const renderTimerStep = () => (
    <div className="space-y-4 animate-fade-in">
      <audio 
        ref={alarmRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        loop={false}
      />
      
      <Card className="p-6 text-center">
        <Timer className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">
          {timerFinished 
            ? (language === 'th' ? 'ถึงเวลาอ่านผล' : 'Time to Read Result')
            : (language === 'th' ? 'รอผลการตรวจ' : 'Waiting for Result')
          }
        </h3>
        <p className="text-muted-foreground mb-4">
          {timerFinished
            ? (language === 'th' ? 'สามารถอ่านผลได้แล้ว กดปุ่มด้านล่างเพื่อถ่ายรูป' : 'You can now read the result. Press button below to take photo')
            : (language === 'th' ? 'รอ 15 นาที ก่อนอ่านผล อย่าอ่านก่อนเวลา!' : 'Wait 15 minutes before reading. Don\'t read early!')
          }
        </p>

        <div className={`text-6xl font-mono font-bold mb-4 ${
          timerFinished ? 'text-success' : timerSeconds <= 60 ? 'text-amber-500 animate-pulse' : 'text-foreground'
        }`}>
          {timerFinished ? '✓' : formatTime(timerSeconds)}
        </div>

        <Progress value={((15 * 60 - timerSeconds) / (15 * 60)) * 100} className="mb-4" />

        {timerFinished ? (
          <div className="space-y-3">
            <div className="p-3 bg-success/10 rounded-lg border border-success/30">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-success font-bold text-lg">
                {language === 'th' ? 'ถึงเวลาอ่านผล' : 'Time to Read Result'}
              </p>
            </div>
            <Button 
              className="w-full gap-2" 
              size="lg" 
              onClick={() => {
                if (alarmRef.current) {
                  alarmRef.current.pause();
                  alarmRef.current.currentTime = 0;
                }
                setCurrentStep('photo-result');
              }}
            >
              <Camera className="h-5 w-5" />
              {language === 'th' ? 'ถ่ายรูปผล' : 'Take Result Photo'}
            </Button>
          </div>
        ) : (
          <>
            <Card className="p-3 mb-4 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'th' ? '🎬 ดูวิดีโอจาก SWING Thailand ระหว่างรอ' : '🎬 Watch SWING Thailand videos while waiting'}
              </p>
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/LbvDEQu3kaE?autoplay=1"
                  title="SWING Thailand - HIV Self Test Guide"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </Card>
            
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={skipTimer}
            >
              <ArrowRight className="h-4 w-4" />
              {language === 'th' ? 'ข้ามและถ่ายรูปผล' : 'Skip & Take Photo'}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              {language === 'th' 
                ? '⚠️ แนะนำให้รอครบ 15 นาทีเพื่อผลที่แม่นยำ'
                : '⚠️ Recommended to wait 15 minutes for accurate results'
              }
            </p>
          </>
        )}
      </Card>
    </div>
  );

  // Step 6: Photo & Result Analysis
  const renderPhotoResultStep = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          {language === 'th' ? 'ถ่ายรูปผลการตรวจ' : 'Capture Test Result'}
        </h3>

        {!photoPreview ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {language === 'th' 
                  ? 'ถ่ายรูปชุดตรวจให้เห็นแถบ C และ T ชัดเจน'
                  : 'Take a photo showing the C and T lines clearly'
                }
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  className="gap-2" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {language === 'th' ? 'ถ่ายรูป' : 'Take Photo'}
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {language === 'th' ? 'อัปโหลดรูป' : 'Upload Image'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img 
                src={photoPreview} 
                alt="Test result" 
                className="w-full rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setResultPhoto(null);
                  setPhotoPreview(null);
                  setAnalysisResult(null);
                  setAnalysisDetails(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!analysisResult && !analyzing && (
              <Button className="w-full gap-2" onClick={analyzeResult}>
                <TestTube className="h-4 w-4" />
                {language === 'th' ? 'วิเคราะห์ผล' : 'Analyze Result'}
              </Button>
            )}

            {analyzing && (
              <div className="flex flex-col items-center justify-center gap-2 p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-muted-foreground text-sm">
                  {language === 'th' ? 'กำลังวิเคราะห์ด้วย AI (อาจใช้เวลา 10-15 วินาที)...' : 'AI analyzing (may take 10-15 seconds)...'}
                </span>
              </div>
            )}

            {analysisResult && (
              <Card className={`p-4 ${
                analysisResult === 'negative' 
                  ? 'bg-success/10 border-success/30' 
                  : analysisResult === 'positive'
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <div className="text-center">
                  {analysisResult === 'negative' && analysisDetails?.confidence === 'high' && (
                    <>
                      <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
                      <h4 className="text-xl font-bold text-success mb-1">
                        {language === 'th' ? 'ไม่พบเชื้อ (Negative)' : 'Negative'}
                      </h4>
                      <p className="text-sm text-success/80">
                        {language === 'th' 
                          ? 'ผลเบื้องต้นไม่พบเชื้อ HIV'
                          : 'Preliminary result: HIV not detected'
                        }
                      </p>
                    </>
                  )}
                  {analysisResult === 'negative' && analysisDetails?.confidence !== 'high' && (
                    <>
                      <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                      <h4 className="text-xl font-bold text-amber-500 mb-1">
                        {language === 'th' ? 'อ่านผลไม่ชัดเจน' : 'Inconclusive'}
                      </h4>
                      <p className="text-sm text-amber-500/80">
                        {language === 'th' 
                          ? 'ระบบอ่านผลว่าไม่พบเชื้อ แต่ความมั่นใจต่ำ กรุณาส่งให้เจ้าหน้าที่ตรวจสอบ'
                          : 'System reads negative but confidence is low. Please submit for staff review.'
                        }
                      </p>
                    </>
                  )}
                  {analysisResult === 'inconclusive' && (
                    <>
                      <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                      <h4 className="text-xl font-bold text-amber-500 mb-1">
                        {language === 'th' ? 'อ่านผลไม่ชัดเจน' : 'Inconclusive'}
                      </h4>
                      <p className="text-sm text-amber-500/80">
                        {language === 'th' 
                          ? 'ระบบไม่สามารถอ่านผลได้ชัดเจน กรุณาถ่ายรูปใหม่หรือส่งให้เจ้าหน้าที่ตรวจสอบ'
                          : 'System could not read the result clearly. Please retake photo or submit for staff review.'
                        }
                      </p>
                    </>
                  )}
                  {analysisResult === 'positive' && (
                    <>
                      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
                      <h4 className="text-xl font-bold text-destructive mb-1">
                        {language === 'th' ? 'ผลเป็นบวกเบื้องต้น (Reactive)' : 'Reactive'}
                      </h4>
                      {analysisDetails?.verified && analysisDetails?.passes_agreed && (
                        <p className="text-xs text-destructive/70 mb-2">
                          {language === 'th' ? '✓ ยืนยันโดย AI 2 รอบ' : '✓ Verified by 2-pass AI'}
                        </p>
                      )}
                      <p className="text-sm text-destructive/80 mb-1">
                        {language === 'th' 
                          ? 'ผลนี้อาจเข้าข่าย reactive (มี 2 ขีด) ควรตรวจยืนยันกับเจ้าหน้าที่หรือสถานพยาบาลโดยเร็ว'
                          : 'This result may be reactive (2 lines visible). Please confirm with staff or a healthcare facility as soon as possible.'
                        }
                      </p>
                      <p className="text-xs text-destructive/60 mb-3">
                        {language === 'th' 
                          ? 'ผลจากชุดตรวจเบื้องต้นไม่ใช่การวินิจฉัยขั้นสุดท้าย ควรตรวจยืนยันในห้องปฏิบัติการอีกครั้งเสมอ'
                          : 'A self-test result is not a final diagnosis. Lab confirmation is always recommended.'
                        }
                      </p>
                      <Button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                        onClick={() => openSupportChat()}
                      >
                        <MessageCircle className="h-5 w-5" />
                        {language === 'th' ? 'ติดต่อ SWING Thailand' : 'Contact SWING Thailand'}
                      </Button>
                      
                      {/* Optional callback consent section */}
                      <div className="mt-4 pt-4 border-t border-destructive/20 text-left">
                        <div className="flex items-start gap-3 mb-3">
                          <Checkbox 
                            id="wantsCallback" 
                            checked={wantsCallback}
                            onCheckedChange={(checked) => setWantsCallback(checked === true)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <Label htmlFor="wantsCallback" className="text-sm font-medium text-foreground cursor-pointer">
                              {language === 'th' 
                                ? 'ต้องการให้เจ้าหน้าที่ติดต่อกลับ' 
                                : 'I would like staff to contact me'
                              }
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'th' 
                                ? '(ไม่บังคับ) หากต้องการให้เราโทรกลับเพื่อให้คำปรึกษา' 
                                : '(Optional) If you want us to call back for counseling'
                              }
                            </p>
                          </div>
                        </div>
                        
                        {wantsCallback && (
                          <div className="space-y-2 animate-fade-in">
                            <Label htmlFor="callbackPhone" className="text-sm font-medium text-foreground">
                              <Phone className="h-4 w-4 inline mr-1" />
                              {language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'}
                            </Label>
                            <Input
                              id="callbackPhone"
                              type="tel"
                              placeholder={language === 'th' ? '0XX-XXX-XXXX' : '0XX-XXX-XXXX'}
                              value={callbackPhone}
                              onChange={(e) => setCallbackPhone(e.target.value)}
                              className="bg-background"
                            />
                          </div>
                        )}
                        
                        <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            {language === 'th' 
                              ? '🔒 ข้อมูลนี้เป็นทางเลือก เจ้าหน้าที่จะไม่ติดต่อกลับหากคุณไม่ยินยอม' 
                              : '🔒 This is optional. Staff will not contact you without your consent.'
                            }
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {analysisResult === 'invalid' && (
                    <>
                      <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                      <h4 className="text-xl font-bold text-amber-500 mb-1">
                        {language === 'th' ? 'ผลตรวจไม่สมบูรณ์' : 'Invalid Result'}
                      </h4>
                      <p className="text-sm text-amber-500/80">
                        {language === 'th' 
                          ? 'ชุดตรวจอาจไม่ทำงานถูกต้อง กรุณาใช้ชุดตรวจใหม่หรือติดต่อเจ้าหน้าที่'
                          : 'Test kit may not have worked correctly. Please use a new kit or contact staff.'
                        }
                      </p>
                    </>
                  )}

                  {/* Confidence & verification details */}
                  {analysisDetails && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          analysisDetails.confidence === 'high' 
                            ? 'bg-success/20 text-success' 
                            : analysisDetails.confidence === 'medium'
                              ? 'bg-amber-500/20 text-amber-600'
                              : 'bg-destructive/20 text-destructive'
                        }`}>
                          {analysisDetails.confidence === 'high' ? '●' : analysisDetails.confidence === 'medium' ? '◐' : '○'}
                          {language === 'th' ? 'ความมั่นใจ: ' : 'Confidence: '}
                          {analysisDetails.confidence === 'high' 
                            ? (language === 'th' ? 'สูง' : 'High')
                            : analysisDetails.confidence === 'medium'
                              ? (language === 'th' ? 'ปานกลาง' : 'Medium')
                              : (language === 'th' ? 'ต่ำ' : 'Low')
                          }
                        </span>
                        {analysisDetails.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            <Check className="h-3 w-3" />
                            {language === 'th' ? 'ตรวจซ้ำแล้ว' : 'Double-checked'}
                          </span>
                        )}
                      </div>
                      {analysisDetails.confidence !== 'high' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {language === 'th'
                            ? 'ผลวิเคราะห์ยังไม่ชัดเจน รบกวนส่งให้เจ้าหน้าที่ช่วยตรวจสอบอีกครั้ง'
                            : "The result isn't fully clear. Please send it for our team to double-check."
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {analysisResult && (
              <>
                <SelfTestResultExplanation
                  result={analysisResult}
                  confidence={analysisDetails?.confidence}
                  language={language}
                />

                {!user && (
                  <Card className="p-4 space-y-3 bg-muted/30">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {language === 'th' ? 'ข้อมูลติดต่อกลับ' : 'Contact information'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'th'
                          ? 'ส่งผลแบบไม่ต้องสมัครสมาชิก เจ้าหน้าที่จะใช้ข้อมูลนี้เพื่อติดต่อกลับเฉพาะเมื่อจำเป็น'
                          : 'No account needed. Staff will only use this to follow up if necessary.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestThaiId" className="text-xs font-medium">
                        {language === 'th' ? 'เลขบัตรประชาชน 13 หลัก' : 'Thai national ID (13 digits)'} *
                      </Label>
                      <Input
                        id="guestThaiId"
                        inputMode="numeric"
                        autoComplete="off"
                        value={guestThaiId}
                        onChange={(e) => setGuestThaiId(normalizeThaiId(e.target.value).slice(0, 13))}
                        placeholder="X-XXXX-XXXXX-XX-X"
                        maxLength={13}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        🔒 {language === 'th'
                          ? 'ใช้เชื่อมผลตรวจกับเวชระเบียนของคุณอย่างปลอดภัย'
                          : 'Used to securely link your result with your medical record.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone" className="text-xs font-medium">
                        {language === 'th' ? 'เบอร์โทรติดต่อกลับ' : 'Contact phone'} *
                      </Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="0XX-XXX-XXXX"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestLineId" className="text-xs font-medium">
                        {language === 'th' ? 'LINE ID (ไม่บังคับ)' : 'LINE ID (optional)'}
                      </Label>
                      <Input
                        id="guestLineId"
                        value={guestLineId}
                        onChange={(e) => setGuestLineId(e.target.value)}
                        placeholder="@yourline"
                        maxLength={100}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {language === 'th'
                        ? '🔒 ข้อมูลของคุณจะถูกเก็บเป็นความลับ ใช้เพื่อติดต่อกลับและส่งต่อการดูแลเท่านั้น'
                        : '🔒 Your information is confidential and only used for follow-up and care coordination.'}
                    </p>
                  </Card>
                )}

                {/* Province — required so result can be plotted on the geo dashboard. */}
                {!user && (
                  <div className="space-y-1.5 rounded-lg bg-muted/40 border border-border/60 p-3">
                    <Label htmlFor="hivst-guest-province" className="text-xs font-medium">
                      {language === 'th' ? 'จังหวัด' : 'Province'} *
                    </Label>
                    <Select value={guestProvince} onValueChange={setGuestProvince}>
                      <SelectTrigger id="hivst-guest-province">
                        <SelectValue placeholder={language === 'th' ? 'เลือกจังหวัด' : 'Select province'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {getProvinces().map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {language === 'th'
                        ? 'ใช้เพื่อสถิติเชิงพื้นที่ ไม่เปิดเผยตัวตน'
                        : 'Used for area-level analytics, never personally identified.'}
                    </p>
                  </div>
                )}

                {/* PDPA consent — required before submitting Thai national ID with test result. */}
                <label
                  htmlFor="hivst-pdpa-consent"
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3 cursor-pointer"
                >
                  <Checkbox
                    id="hivst-pdpa-consent"
                    checked={pdpaConsent}
                    onCheckedChange={(v) => setPdpaConsent(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {language === 'th'
                      ? 'ฉันยินยอมให้เก็บและใช้เลขบัตรประชาชนเพื่อเชื่อมผลตรวจกับเวชระเบียนของฉันตาม PDPA และจะเก็บเป็นความลับ'
                      : 'I consent to storing my Thai national ID to link this result with my medical record under PDPA. It will be kept confidential.'}
                  </span>
                </label>

                <Button 
                  className="w-full gap-2" 
                  size="lg"
                  onClick={handleSubmitResult}
                  disabled={uploading || !pdpaConsent || (!user && !guestProvince)}
                >
                  <Upload className="h-4 w-4" />
                  {uploading 
                    ? (language === 'th' ? 'กำลังส่ง...' : 'Submitting...')
                    : (language === 'th' ? 'ส่งผลให้เจ้าหน้าที่ยืนยัน' : 'Submit for Staff Verification')
                  }
                </Button>
              </>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4 text-center">
          {language === 'th' 
            ? '⚠️ ผลการวิเคราะห์เป็นเบื้องต้นเท่านั้น กรุณาปรึกษาแพทย์'
            : '⚠️ Analysis is preliminary only. Please consult a doctor.'
          }
        </p>
      </Card>

      <Button variant="outline" className="w-full" onClick={() => setCurrentStep('timer')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {language === 'th' ? 'กลับ' : 'Back'}
      </Button>
    </div>
  );

  return (
    <>
      <PageContainer>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <TestTube className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {language === 'th' ? 'ชุดตรวจ HIV ด้วยตัวเอง' : 'HIV Self-Test Kit'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === 'th' ? 'รับชุดตรวจฟรี โดย testD แพลตฟอร์ม' : 'Free kit by testD Platform'}
              </p>
            </div>
          </div>
        </div>

        {/* Magic-link resolution states (token=...) */}
        {magicLinkState.status === 'resolving' && (
          <Card className="p-6 mb-4 text-center animate-fade-in">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'กำลังตรวจสอบลิงก์...' : 'Verifying your link...'}
            </p>
          </Card>
        )}

        {magicLinkState.status === 'error' && (
          <Card className="p-6 mb-4 space-y-4 animate-fade-in border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  {language === 'th' ? 'ไม่พบข้อมูลชุดตรวจ' : 'Self-test kit not found'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'th'
                    ? 'ลิงก์นี้อาจหมดอายุหรือใช้งานไปแล้ว กรุณาติดต่อทีมงาน'
                    : 'This link may have expired or already been used. Please contact our team.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => window.open('https://line.me/R/ti/p/@swingthailand', '_blank')}
              >
                <MessageCircle className="h-4 w-4" />
                {language === 'th' ? 'ติดต่อ SWING' : 'Contact SWING'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4" />
                {language === 'th' ? 'กลับหน้าหลัก' : 'Back to home'}
              </Button>
            </div>
          </Card>
        )}

        {/* Pending-result banner intentionally omitted on this page — the
            IntroStep card below already communicates the same "awaiting result"
            status for an active request, so showing both was duplicative. */}



        {magicLinkState.status !== 'error' && renderStepIndicator()}

        {magicLinkState.status !== 'error' && magicLinkState.status !== 'resolving' && currentStep === 'intro' && (
          <IntroStep 
            activeRequest={activeRequest}
            onStartRequest={(mode) => {
              if (mode === 'pickup' && !assignedBranch) {
                setAssignedBranch('silom');
              }
              handleStartRequest(mode);
            }}
            onConfirmReceipt={() => {
              if (activeRequest?.status === 'delivered') {
                handleConfirmReceipt();
              } else {
                setCurrentStep('confirm-receipt');
              }
            }}
            onSubmitExistingKit={() => setCurrentStep('existing-kit-upload')}
            assignedBranch={assignedBranch}
            showBranchSelector={!hasBranchParam}
            onBranchChange={setAssignedBranch}
          />
        )}
        
        {currentStep === 'existing-kit-upload' && renderExistingKitUploadStep()}
        
        {currentStep === 'lite-request' && (
          <LiteRequestStep
            shippingData={shippingData}
            nhsoData={nhsoData}
            onShippingChange={(d) => {
              setShippingData(d);
              saveDraft({ shippingData: d as any, nhsoData: nhsoData as any, assignedBranch, deliveryMode });
            }}
            onNhsoChange={(d) => {
              setNhsoData(d);
              saveDraft({ shippingData: shippingData as any, nhsoData: d as any, assignedBranch, deliveryMode });
            }}
            onSubmit={async () => {
              try {
                await handleSubmitRequest();
                clearDraft();
              } catch {
                toast.error(language === 'th' ? 'ส่งไม่สำเร็จ กรุณาลองใหม่' : 'Submission failed. Please retry.');
              }
            }}
            onBack={() => setCurrentStep('intro')}
            loading={loading}
            hasSavedData={!!savedUserData?.thaiId}
            deliveryMode={deliveryMode}
            assignedBranch={assignedBranch}
            onBranchChange={setAssignedBranch}
            pickupLocation={pickupLocation as any}
            onPickupLocationCaptured={setPickupLocation as any}
          />
        )}
        
        {currentStep === 'account-success' && generatedCredentials && (
          <AccountSuccessStep 
            username={generatedCredentials.username}
            password={generatedCredentials.password}
            onContinue={() => {
              toast.success(
                language === 'th' 
                  ? '🎉 ส่งคำขอสำเร็จ! เจ้าหน้าที่จะติดต่อกลับ' 
                  : '🎉 Request submitted! Staff will contact you.'
              );
              setCurrentStep('intro');
            }}
          />
        )}
        
        {(currentStep === 'confirm-receipt' ||
          currentStep === 'video' ||
          currentStep === 'testing' ||
          currentStep === 'timer' ||
          currentStep === 'photo-result') && activeRequest &&
         !hasSubmittedSelfTestResult(activeRequest) && (
          <LeanResultSubmissionFlow
            request={{
              id: activeRequest.id,
              user_id: user?.id ?? null,
              delivery_mode: deliveryMode,
              status: activeRequest.status,
            }}
            cameFromMagicLink={searchParams.has('token')}
            onDone={() => {
              // Mark this mount as post-submit so the magic-link resolver
              // won't re-hydrate the just-completed request if it re-fires
              // before the URL is cleaned up.
              justSubmittedRef.current = true;
              // Clear stale in-memory pending state FIRST so the
              // step-from-status useEffect below doesn't route the user
              // back into the just-completed submission flow (this matters
              // for magic-link / not-signed-in users where fetchRequests
              // is a no-op and can't refresh activeRequest from the DB).
              setActiveRequest(null);
              setCurrentStep('intro');
              // Notify banner hook + refetch from Supabase so the
              // recalculated activeRequest reflects the submitted row.
              try {
                localStorage.removeItem('hiv-selftest-timer');
                // Clear any lingering self-test session cache keys.
                for (let i = sessionStorage.length - 1; i >= 0; i--) {
                  const key = sessionStorage.key(i);
                  if (key && key.startsWith('selftest:')) sessionStorage.removeItem(key);
                }
                window.dispatchEvent(new CustomEvent('selftest:pending-refresh'));
              } catch { /* noop */ }
              // Strip ?token / ?action from the URL so a refresh cannot
              // re-enter the submit-result flow.
              if (searchParams.has('token') || searchParams.has('action')) {
                navigate('/th/hiv-selftest', { replace: true });
              }
              fetchRequests();
            }}
            trackEvent={(name, props) => trackEvent(name, props as any)}
          />
        )}

        {/* Guest path — same unified Lean flow (1 ขีด / 2 ขีด), no login required.
            Anonymous visitors land here via /submit-result → ?action=submit → existing-kit-upload → photo-result. */}
        {!activeRequest && currentStep === 'photo-result' && (isDirectSubmitAction || !user) && (
          <LeanResultSubmissionFlow
            request={{
              id: 'guest-pending',
              user_id: user?.id ?? null,
              delivery_mode: null,
              status: 'guest',
            }}
            guestMode
            onDone={handleStandaloneSubmitDone}
            trackEvent={(name, props) => trackEvent(name, props as any)}
          />
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
