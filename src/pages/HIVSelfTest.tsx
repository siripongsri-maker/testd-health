import { useState, useEffect, useRef } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

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
  X
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
import { useFormAutosave } from "@/hooks/useFormAutosave";

export default function HIVSelfTest() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { trackSelftestRequest } = useQuestProgress();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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
    dateOfBirth: "",
    gender: "",
  });
  
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
    if (user) {
      fetchRequests();
      fetchSavedUserData();
    }
  }, [user]);

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

  // Determine which step to show based on active request status
  useEffect(() => {
    if (activeRequest) {
      if (activeRequest.status === 'pending' || activeRequest.status === 'approved' || activeRequest.status === 'shipped') {
        setCurrentStep('intro');
      } else if (activeRequest.status === 'delivered') {
        setCurrentStep('confirm-receipt');
      } else if (activeRequest.status === 'confirmed' || activeRequest.status === 'received') {
        setCurrentStep('video');
      }
    }
  }, [activeRequest]);

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
    
    const { data } = await supabase
      .from('hiv_selftest_requests')
      .select('id, status, tracking_number, test_result, created_at, result_photo_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setRequests(data);
      const active = data.find(r => !['completed', 'cancelled'].includes(r.status));
      if (active) {
        setActiveRequest(active);
      }
    }
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
      // Try to sign up first
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: shippingData.fullName || username,
          },
        },
      });

      if (signUpError) {
        // If user already exists with this ID pattern, try to sign in
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          // Try different email patterns for existing users
          const existingEmail = `${username}@swingth.local`;
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: existingEmail,
            password,
          });
          
          if (signInError) {
            console.error('Auto-login failed:', signInError);
            toast.error(language === 'th' ? 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่' : 'Could not log in. Please try again.');
            return null;
          }
          
          return { userId: signInData.user?.id || '', username: email, password, isNew: false };
        }
        
        console.error('Auto-registration error:', signUpError);
        toast.error(language === 'th' ? 'เกิดข้อผิดพลาดในการลงทะเบียน' : 'Registration error');
        return null;
      }

      // Store generated credentials for success screen
      setGeneratedCredentials({ username: email, password });
      
      return { userId: signUpData.user?.id || '', username: email, password, isNew: true };
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
          ? `ผ่านมา ${daysSinceRisk} วันเท่านั้น — แนะนำให้รอครบ 30 วัน หรือตรวจที่คลินิก`
          : `Only ${daysSinceRisk} days — we recommend waiting 30 days or visiting a clinic`
      );
    }

    setLoading(true);

    try {
      // Auto-register if not logged in
      let userId = user?.id;
      let isNewUser = false;
      
      if (!userId) {
        const result = await autoRegisterUser();
        if (!result || !result.userId) {
          setLoading(false);
          return;
        }
        userId = result.userId;
        isNewUser = result.isNew;
      }

      // Insert PII into separate table (auto-registration)
      const { data: piiData, error: piiError } = await supabase.from('selftest_pii').insert({
        user_id: userId,
        full_name: shippingData.fullName,
        date_of_birth: nhsoData.dateOfBirth || null,
        thai_id: nhsoData.thaiId,
        gender: nhsoData.gender || null,
        phone: shippingData.phone,
        line_id: shippingData.lineId,
        address: shippingData.address,
        subdistrict: shippingData.subdistrict,
        district: shippingData.district,
        province: shippingData.province,
        postal_code: shippingData.postalCode,
      }).select().single();

      if (piiError) throw piiError;

      // For venue pickup: auto-confirm as 'received' immediately
      // For shipping: use normal 'pending' workflow
      const isPickup = deliveryMode === 'pickup';
      const initialStatus = isPickup ? 'received' : 'pending';

      // Insert health data with reference to PII
      const { data, error } = await supabase.from('hiv_selftest_requests').insert({
        user_id: userId,
        pii_id: piiData.id,
        last_risk_date: shippingData.lastRiskDate || null,
        days_since_risk: daysSinceRisk,
        status: initialStatus,
        assigned_branch: assignedBranch,
      }).select().single();

      if (error) throw error;

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
      if (isNewUser && generatedCredentials) {
        setCurrentStep('account-success');
      } else if (isPickup) {
        // Venue pickup: auto-confirmed, go straight to video/testing
        toast.success(
          language === 'th' 
            ? '🎉 ยืนยันว่าได้รับแล้ว! พร้อมเริ่มตรวจ' 
            : '🎉 Confirmed received! Ready to start testing.'
        );
        setCurrentStep('video');
      } else {
        toast.success(
          language === 'th' 
            ? '🎉 ส่งคำขอสำเร็จ! เจ้าหน้าที่จะติดต่อกลับ' 
            : '🎉 Request submitted! Staff will contact you.'
        );
        setCurrentStep('intro');
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
        .update({ status: 'confirmed' })
        .eq('id', activeRequest.id);
      
      setActiveRequest({ ...activeRequest, status: 'confirmed' });
      setCurrentStep('video');
      toast.success(language === 'th' ? 'ยืนยันการรับสำเร็จ!' : 'Receipt confirmed!');
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
    
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาลงทะเบียนก่อนส่งผล' : 'Please complete registration before submitting result');
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
          test_result: analysisResult,
          wants_callback: analysisResult === 'positive' ? wantsCallback : false,
          callback_phone: analysisResult === 'positive' && wantsCallback ? callbackPhone : null
        })
        .eq('id', requestId);

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
      
      fetchRequests();
      setCurrentStep('intro');
      setActiveRequest(null);
      setCompletedSteps([]);
      setTimerSeconds(15 * 60);
      setResultPhoto(null);
      setPhotoPreview(null);
      setAnalysisResult(null);
      setAnalysisDetails(null);
      setWantsCallback(false);
      setCallbackPhone("");
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

        {!user ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {language === 'th' 
                  ? '⚠️ กรุณาเข้าสู่ระบบก่อนเพื่อส่งผลตรวจ' 
                  : '⚠️ Please login first to submit your result'
                }
              </p>
              <Button onClick={() => navigate('/auth')} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                {language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
              </Button>
            </div>
          </div>
        ) : (
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
                {language === 'th' ? 'ถ่ายรูปผลตรวจ' : 'Take Result Photo'}
              </Button>
            </div>
          </div>
        )}
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
            src="https://drive.google.com/file/d/1jUs47ss5wiKODpMEyj01B2eqzoNT6Q-_/preview"
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
                  src="https://www.youtube.com/embed/eIVV06_kioM?autoplay=1"
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
                          ? 'ผลเบื้องต้นไม่พบการติดเชื้อ HIV'
                          : 'Preliminary result shows no HIV infection'
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
                      <p className="text-sm text-destructive/80 mb-3">
                        {language === 'th' 
                          ? 'กรุณาติดต่อคลินิกเพื่อตรวจยืนยัน'
                          : 'Please contact a clinic for confirmatory testing'
                        }
                      </p>
                      <a
                        href="https://line.me/R/ti/p/@swingthailand"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#00B900] text-white rounded-lg font-medium hover:bg-[#009900] transition-colors"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                        </svg>
                        {language === 'th' ? 'ติดต่อ SWING Thailand' : 'Contact SWING Thailand'}
                      </a>
                      
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
                            ? '⚠️ ผลวิเคราะห์ยังไม่ชัดเจน กรุณาส่งให้เจ้าหน้าที่ตรวจสอบ'
                            : '⚠️ Analysis uncertain — please submit for staff verification'
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {analysisResult && (
              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handleSubmitResult}
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                {uploading 
                  ? (language === 'th' ? 'กำลังส่ง...' : 'Submitting...')
                  : (language === 'th' ? 'ส่งผลให้เจ้าหน้าที่ยืนยัน' : 'Submit for Staff Verification')
                }
              </Button>
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

        {renderStepIndicator()}

        {currentStep === 'intro' && (
          <IntroStep 
            activeRequest={activeRequest}
            onStartRequest={(mode) => {
              if (!assignedBranch) {
                toast.error(language === 'th' ? 'กรุณาเลือกสาขาก่อน' : 'Please select a branch first');
                return;
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
        
        {currentStep === 'confirm-receipt' && renderConfirmReceiptStep()}
        {currentStep === 'video' && renderVideoStep()}
        {currentStep === 'testing' && renderTestingStep()}
        {currentStep === 'timer' && renderTimerStep()}
        {currentStep === 'photo-result' && renderPhotoResultStep()}
      </PageContainer>
      <BottomNav />
    </>
  );
}
