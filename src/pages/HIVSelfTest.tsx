import { useState, useEffect, useRef } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getProvinces, getDistricts, getSubdistricts, getPostalCode } from "@/lib/thailand-address";
import { 
  TestTube, 
  Play, 
  Package, 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Send,
  Upload,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  ArrowLeft,
  PackageCheck,
  Timer,
  Loader2,
  Check,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SelfTestRequest {
  id: string;
  status: string;
  tracking_number: string | null;
  test_result: string | null;
  created_at: string;
  result_photo_url: string | null;
}

type Step = 'request' | 'confirm-receipt' | 'video' | 'testing' | 'timer' | 'photo-result';

// Thai ID validation using checksum algorithm
const validateThaiId = (id: string): boolean => {
  if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
  
  // Thai ID checksum algorithm
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
};

const TESTING_STEPS = [
  { id: 'wash', th: 'ล้างมือให้สะอาดด้วยสบู่', en: 'Wash hands thoroughly with soap' },
  { id: 'open', th: 'เปิดกล่องและตรวจสอบอุปกรณ์ครบ', en: 'Open box and check all components' },
  { id: 'read', th: 'อ่านคำแนะนำในกล่องทั้งหมด', en: 'Read all instructions in the box' },
  { id: 'lancet', th: 'เตรียมนิ้วและใช้เข็มเจาะเลือด', en: 'Prepare finger and use lancet for blood' },
  { id: 'blood', th: 'หยดเลือดลงในช่องตัวอย่าง', en: 'Drop blood into sample well' },
  { id: 'buffer', th: 'หยดน้ำยา buffer ตามคำแนะนำ', en: 'Add buffer solution as instructed' },
];

export default function HIVSelfTest() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<Step>('request');
  const [activeRequest, setActiveRequest] = useState<SelfTestRequest | null>(null);
  const [requests, setRequests] = useState<SelfTestRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    thaiId: "",
    phone: "",
    lineId: "",
    address: "",
    subdistrict: "",
    district: "",
    province: "",
    postalCode: "",
    lastRiskDate: "",
  });
  const [thaiIdError, setThaiIdError] = useState<string | null>(null);
  
  // Testing state
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(15 * 60); // 15 minutes
  const [timerActive, setTimerActive] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  
  // Photo & Analysis state
  const [resultPhoto, setResultPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<'positive' | 'negative' | 'invalid' | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
    
    // Pre-fill form with saved personal info
    const userData = getUserData();
    if (userData.personalInfo) {
      const pi = userData.personalInfo;
      setFormData(prev => ({
        ...prev,
        fullName: pi.fullName || prev.fullName,
        phone: pi.phone || prev.phone,
        lineId: pi.lineId || prev.lineId,
        address: pi.address || prev.address,
        subdistrict: pi.subdistrict || prev.subdistrict,
        district: pi.district || prev.district,
        province: pi.province || prev.province,
        postalCode: pi.postalCode || prev.postalCode,
      }));
    }
  }, [user]);

  useEffect(() => {
    // Determine which step to show based on active request status
    if (activeRequest) {
      if (activeRequest.status === 'pending' || activeRequest.status === 'approved' || activeRequest.status === 'shipped') {
        setCurrentStep('request');
      } else if (activeRequest.status === 'delivered') {
        setCurrentStep('confirm-receipt');
      } else if (activeRequest.status === 'confirmed') {
        setCurrentStep('video');
      }
    }
  }, [activeRequest]);

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            setTimerFinished(true);
            if (timerRef.current) clearInterval(timerRef.current);
            // Play alarm sound
            if (alarmRef.current) {
              alarmRef.current.play().catch(() => {});
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

  // Stop alarm when leaving timer step
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
      // Find the most recent active request
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

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบก่อน' : 'Please login first');
      navigate('/auth');
      return;
    }

    const daysSinceRisk = calculateDaysSinceRisk(formData.lastRiskDate);
    
    if (daysSinceRisk < 30 && formData.lastRiskDate) {
      toast.warning(
        language === 'th' 
          ? `ผ่านมา ${daysSinceRisk} วันเท่านั้น — แนะนำให้รอครบ 30 วัน หรือตรวจที่คลินิก`
          : `Only ${daysSinceRisk} days — we recommend waiting 30 days or visiting a clinic`
      );
    }

    setLoading(true);
    
    // Validate Thai ID before submitting
    if (!validateThaiId(formData.thaiId)) {
      setThaiIdError(language === 'th' ? 'หมายเลขบัตรประชาชนไม่ถูกต้อง' : 'Invalid Thai ID number');
      setLoading(false);
      return;
    }

    try {
      // First, insert PII into separate table
      const { data: piiData, error: piiError } = await supabase.from('selftest_pii').insert({
        user_id: user.id,
        full_name: formData.fullName,
        thai_id: formData.thaiId,
        phone: formData.phone,
        line_id: formData.lineId,
        address: formData.address,
        subdistrict: formData.subdistrict,
        district: formData.district,
        province: formData.province,
        postal_code: formData.postalCode,
      }).select().single();

      if (piiError) throw piiError;

      // Then, insert health data with reference to PII
      const { data, error } = await supabase.from('hiv_selftest_requests').insert({
        user_id: user.id,
        pii_id: piiData.id,
        last_risk_date: formData.lastRiskDate || null,
        days_since_risk: daysSinceRisk,
        status: 'pending',
      }).select().single();

      if (error) throw error;

      toast.success(
        language === 'th' 
          ? 'ส่งคำขอสำเร็จ! เจ้าหน้าที่จะติดต่อกลับ' 
          : 'Request submitted! Staff will contact you.'
      );
      
      setFormData({
        fullName: "",
        thaiId: "",
        phone: "",
        lineId: "",
        address: "",
        subdistrict: "",
        district: "",
        province: "",
        postalCode: "",
        lastRiskDate: "",
      });
      setThaiIdError(null);
      
      if (data) {
        setActiveRequest(data);
      }
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
      // Call edge function to analyze the test result image
      const { data, error } = await supabase.functions.invoke('analyze-hiv-test', {
        body: { imageBase64: photoPreview }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error(language === 'th' ? 'ระบบยุ่งอยู่ กรุณาลองใหม่อีกครั้ง' : 'System busy, please try again');
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
      } else {
        setAnalysisResult('invalid');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast.error(language === 'th' ? 'ไม่สามารถวิเคราะห์ภาพได้' : 'Could not analyze image');
      setAnalysisResult('invalid');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitResult = async () => {
    if (!activeRequest || !resultPhoto || !user) return;
    
    setUploading(true);
    
    try {
      const fileExt = resultPhoto.name.split('.').pop();
      const fileName = `${user.id}/${activeRequest.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('selftest-results')
        .upload(fileName, resultPhoto);

      if (uploadError) throw uploadError;

      await supabase
        .from('hiv_selftest_requests')
        .update({ 
          result_photo_url: fileName,
          status: 'result_submitted',
          test_result: analysisResult
        })
        .eq('id', activeRequest.id);

      toast.success(
        language === 'th' 
          ? 'ส่งผลตรวจสำเร็จ! เจ้าหน้าที่จะตรวจสอบ' 
          : 'Result submitted! Staff will review.'
      );
      
      fetchRequests();
      // Reset for new test
      setCurrentStep('request');
      setActiveRequest(null);
      setCompletedSteps([]);
      setTimerSeconds(15 * 60);
      setResultPhoto(null);
      setPhotoPreview(null);
      setAnalysisResult(null);
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
    const steps: Step[] = ['request', 'confirm-receipt', 'video', 'testing', 'timer', 'photo-result'];
    return steps.indexOf(currentStep) + 1;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {['request', 'confirm-receipt', 'video', 'testing', 'timer', 'photo-result'].map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            currentStep === step 
              ? 'bg-primary text-primary-foreground' 
              : getStepNumber() > index + 1
                ? 'bg-success text-white'
                : 'bg-muted text-muted-foreground'
          }`}>
            {getStepNumber() > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
          </div>
          {index < 5 && <div className={`w-4 h-0.5 ${getStepNumber() > index + 1 ? 'bg-success' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  );

  // Step 1: Request Kit
  const renderRequestStep = () => (
    <div className="space-y-4 animate-fade-in">
      {/* Abbott HIV Self-Test Kit Image */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-white rounded-xl shadow-md flex items-center justify-center p-2">
            <div className="text-center">
              <div className="text-3xl mb-1">🧪</div>
              <p className="text-[8px] font-bold text-primary">Abbott</p>
              <p className="text-[6px] text-muted-foreground">HIV Self-Test</p>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground mb-1">
              {language === 'th' ? 'ชุดตรวจ HIV Abbott' : 'Abbott HIV Self-Test Kit'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'ชุดตรวจคุณภาพสูง ใช้งานง่าย ผลภายใน 15 นาที' : 'High quality, easy to use, results in 15 minutes'}
            </p>
            <Badge variant="secondary" className="mt-2">
              {language === 'th' ? '🎁 ฟรี!' : '🎁 FREE!'}
            </Badge>
          </div>
        </div>
      </Card>

      {activeRequest && ['pending', 'approved', 'shipped', 'delivered'].includes(activeRequest.status) ? (
        <Card className="p-4">
          <div className="text-center">
            {/* Status Icon */}
            {activeRequest.status === 'pending' && <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />}
            {activeRequest.status === 'approved' && <PackageCheck className="h-12 w-12 text-primary mx-auto mb-3" />}
            {(activeRequest.status === 'shipped' || activeRequest.status === 'delivered') && <Package className="h-12 w-12 text-success mx-auto mb-3" />}
            
            <h3 className="font-bold text-foreground mb-2">
              {activeRequest.status === 'pending' && (language === 'th' ? 'รอเจ้าหน้าที่ตรวจสอบ' : 'Awaiting Staff Review')}
              {activeRequest.status === 'approved' && (language === 'th' ? 'อนุมัติแล้ว กำลังเตรียมจัดส่ง' : 'Approved - Preparing Shipment')}
              {activeRequest.status === 'shipped' && (language === 'th' ? 'จัดส่งแล้ว รอรับพัสดุ' : 'Shipped - Awaiting Delivery')}
              {activeRequest.status === 'delivered' && (language === 'th' ? 'พัสดุถึงแล้ว กรุณายืนยันการรับ' : 'Delivered - Please Confirm Receipt')}
            </h3>
            
            <Badge variant={activeRequest.status === 'shipped' || activeRequest.status === 'delivered' ? 'default' : 'secondary'}>
              {activeRequest.status === 'pending' && (language === 'th' ? '⏳ รอตรวจสอบ' : '⏳ Pending Review')}
              {activeRequest.status === 'approved' && (language === 'th' ? '✓ อนุมัติแล้ว' : '✓ Approved')}
              {activeRequest.status === 'shipped' && (language === 'th' ? '📦 จัดส่งแล้ว' : '📦 Shipped')}
              {activeRequest.status === 'delivered' && (language === 'th' ? '🏠 ถึงปลายทาง' : '🏠 Delivered')}
            </Badge>
            
            {activeRequest.tracking_number && (
              <div className="mt-3 p-2 bg-primary/5 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  📦 {language === 'th' ? 'เลขพัสดุ' : 'Tracking'}: {activeRequest.tracking_number}
                </p>
              </div>
            )}
            
            {/* Status explanation */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left">
              <p className="text-xs text-muted-foreground">
                {activeRequest.status === 'pending' && (language === 'th' 
                  ? '💡 เจ้าหน้าที่กำลังตรวจสอบคำขอของคุณ และจะยืนยันสถานะการจัดส่งในเร็ว ๆ นี้'
                  : '💡 Staff is reviewing your request and will confirm shipment status soon.')}
                {activeRequest.status === 'approved' && (language === 'th' 
                  ? '💡 คำขอได้รับการอนุมัติ เจ้าหน้าที่กำลังจัดเตรียมชุดตรวจเพื่อจัดส่ง'
                  : '💡 Request approved. Staff is preparing your test kit for shipment.')}
                {activeRequest.status === 'shipped' && (language === 'th' 
                  ? '💡 ชุดตรวจจัดส่งแล้ว เมื่อได้รับพัสดุ เจ้าหน้าที่จะอัปเดตสถานะให้คุณทราบ'
                  : '💡 Kit has been shipped. Staff will update status when delivered.')}
                {activeRequest.status === 'delivered' && (language === 'th' 
                  ? '💡 เจ้าหน้าที่ยืนยันว่าพัสดุถึงแล้ว กรุณากดยืนยันว่าได้รับชุดตรวจ'
                  : '💡 Staff confirmed delivery. Please confirm you received the kit.')}
              </p>
            </div>
            
            <Button 
              className="mt-4 w-full" 
              onClick={() => {
                if (activeRequest.status === 'delivered') {
                  handleConfirmReceipt();
                } else {
                  setCurrentStep('confirm-receipt');
                }
              }}
              disabled={activeRequest.status !== 'shipped' && activeRequest.status !== 'delivered'}
              variant={activeRequest.status === 'delivered' ? 'default' : 'outline'}
            >
              {activeRequest.status === 'delivered' 
                ? (language === 'th' ? '✓ ยืนยันว่าได้รับชุดตรวจแล้ว' : '✓ Confirm I received the kit')
                : (language === 'th' ? 'รอพัสดุ...' : 'Waiting for delivery...')}
              {(activeRequest.status === 'shipped' || activeRequest.status === 'delivered') && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {!user ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                {language === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อขอรับชุดตรวจ' : 'Please login to request a kit'}
              </p>
              <Button onClick={() => navigate('/auth')}>
                {language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
              </Button>
            </Card>
          ) : (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <Card className="p-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      {language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder={language === 'th' ? 'ชื่อจริง นามสกุล' : 'Your full name'}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thaiId">
                      {language === 'th' ? 'หมายเลขบัตรประชาชน (13 หลัก)' : 'Thai ID (13 digits)'}
                    </Label>
                    <Input
                      id="thaiId"
                      value={formData.thaiId}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                        setFormData(prev => ({ ...prev, thaiId: value }));
                        if (value.length === 13) {
                          if (!validateThaiId(value)) {
                            setThaiIdError(language === 'th' ? 'หมายเลขบัตรประชาชนไม่ถูกต้อง' : 'Invalid Thai ID number');
                          } else {
                            setThaiIdError(null);
                          }
                        } else {
                          setThaiIdError(null);
                        }
                      }}
                      placeholder="X-XXXX-XXXXX-XX-X"
                      maxLength={13}
                      required
                      className={thaiIdError ? 'border-destructive' : ''}
                    />
                    {thaiIdError && (
                      <p className="text-sm text-destructive">{thaiIdError}</p>
                    )}
                    {formData.thaiId.length === 13 && !thaiIdError && (
                      <p className="text-sm text-success flex items-center gap-1">
                        <Check className="h-3 w-3" /> {language === 'th' ? 'หมายเลขถูกต้อง' : 'Valid ID'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="h-4 w-4 inline mr-1" />
                      {language === 'th' ? 'เบอร์โทร' : 'Phone'}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        // Remove all non-digits
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        // Format as 0XX-XXX-XXXX
                        let formatted = digits;
                        if (digits.length > 3) {
                          formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                        }
                        if (digits.length > 6) {
                          formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                        }
                        setFormData(prev => ({ ...prev, phone: formatted }));
                      }}
                      placeholder="0XX-XXX-XXXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lineId">LINE ID ({language === 'th' ? 'ไม่บังคับ' : 'optional'})</Label>
                    <Input
                      id="lineId"
                      value={formData.lineId}
                      onChange={(e) => setFormData(prev => ({ ...prev, lineId: e.target.value }))}
                      placeholder="@line_id"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {language === 'th' ? 'ที่อยู่จัดส่ง' : 'Shipping Address'}
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder={language === 'th' ? 'บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ' : 'House number, street, subdistrict, district'}
                    required
                  />
                </div>

                {/* Province */}
                <div className="space-y-2">
                  <Label htmlFor="province">{language === 'th' ? 'จังหวัด' : 'Province'}</Label>
                  <Select
                    value={formData.province}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, province: value, district: "", subdistrict: "", postalCode: "" }));
                    }}
                    required
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={language === 'th' ? 'เลือกจังหวัด' : 'Select province'} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-60">
                      {getProvinces().map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* District */}
                  <div className="space-y-2">
                    <Label htmlFor="district">{language === 'th' ? 'เขต/อำเภอ' : 'District'}</Label>
                    <Select
                      value={formData.district}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, district: value, subdistrict: "", postalCode: "" }));
                      }}
                      disabled={!formData.province}
                      required
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={language === 'th' ? 'เลือกเขต/อำเภอ' : 'Select district'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {getDistricts(formData.province).map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subdistrict */}
                  <div className="space-y-2">
                    <Label htmlFor="subdistrict">{language === 'th' ? 'แขวง/ตำบล' : 'Subdistrict'}</Label>
                    <Select
                      value={formData.subdistrict}
                      onValueChange={(value) => {
                        const postalCode = getPostalCode(formData.province, formData.district, value);
                        setFormData(prev => ({ ...prev, subdistrict: value, postalCode }));
                      }}
                      disabled={!formData.district}
                      required
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={language === 'th' ? 'เลือกแขวง/ตำบล' : 'Select subdistrict'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-60">
                        {getSubdistricts(formData.province, formData.district).map((sub) => (
                          <SelectItem key={sub.name} value={sub.name}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Postal Code - Auto-generated */}
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{language === 'th' ? 'รหัสไปรษณีย์' : 'Postal Code'}</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    readOnly
                    placeholder={language === 'th' ? 'จะแสดงอัตโนมัติ' : 'Auto-generated'}
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastRiskDate">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {language === 'th' ? 'วันที่เสี่ยงครั้งล่าสุด (ถ้ามี)' : 'Last Risk Date (if any)'}
                  </Label>
                  <Input
                    id="lastRiskDate"
                    type="date"
                    value={formData.lastRiskDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastRiskDate: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {formData.lastRiskDate && calculateDaysSinceRisk(formData.lastRiskDate) < 30 && (
                    <p className="text-xs text-amber-600">
                      {language === 'th' 
                        ? `⚠️ ผ่านมา ${calculateDaysSinceRisk(formData.lastRiskDate)} วัน — แนะนำให้รอครบ 30 วัน`
                        : `⚠️ ${calculateDaysSinceRisk(formData.lastRiskDate)} days — recommend waiting 30 days`
                      }
                    </p>
                  )}
                </div>
              </Card>

              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                <Send className="h-4 w-4" />
                {loading 
                  ? (language === 'th' ? 'กำลังส่ง...' : 'Submitting...') 
                  : (language === 'th' ? 'ส่งคำขอรับชุดตรวจ' : 'Submit Request')
                }
              </Button>
            </form>
          )}
        </>
      )}
    </div>
  );

  // Step 2: Confirm Receipt
  const renderConfirmReceiptStep = () => (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-6 text-center">
        <PackageCheck className="h-16 w-16 text-success mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">
          {language === 'th' ? 'ได้รับชุดตรวจแล้วใช่ไหม?' : 'Did you receive the test kit?'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {language === 'th' 
            ? 'กรุณายืนยันว่าคุณได้รับชุดตรวจ HIV จาก Abbott แล้ว'
            : 'Please confirm you have received your Abbott HIV Self-Test kit'
          }
        </p>
        
        <div className="space-y-3">
          <Button className="w-full gap-2" size="lg" onClick={handleConfirmReceipt} disabled={loading}>
            <CheckCircle2 className="h-5 w-5" />
            {loading 
              ? (language === 'th' ? 'กำลังยืนยัน...' : 'Confirming...')
              : (language === 'th' ? 'ใช่ ได้รับแล้ว' : 'Yes, I received it')
            }
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setCurrentStep('request')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'th' ? 'กลับ' : 'Back'}
          </Button>
        </div>
      </Card>
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
          onClick={() => {
            setCurrentStep('timer');
            setTimerActive(true);
          }}
          disabled={completedSteps.length < TESTING_STEPS.length}
        >
          <Timer className="h-4 w-4" />
          {language === 'th' ? 'เริ่มจับเวลา' : 'Start Timer'}
        </Button>
      </div>
    </div>
  );

  // Step 5: Timer with YouTube video
  const renderTimerStep = () => (
    <div className="space-y-4 animate-fade-in">
      {/* Hidden audio element for alarm */}
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
            {/* YouTube Video Embed while waiting */}
            <Card className="p-3 mb-4 bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'th' ? '🎬 ดูวิดีโอจาก SWING Thailand ระหว่างรอ' : '🎬 Watch SWING Thailand videos while waiting'}
              </p>
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/?listType=user_uploads&list=SWINGThailandTH"
                  title="SWING Thailand"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <a 
                href="https://www.youtube.com/@SWINGThailandTH" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                {language === 'th' ? '🔗 ไปที่ช่อง YouTube' : '🔗 Visit YouTube Channel'}
              </a>
            </Card>
            
            <p className="text-xs text-muted-foreground">
              {language === 'th' 
                ? '⚠️ กรุณารอจนกว่าเวลาจะหมด ไม่สามารถข้ามได้'
                : '⚠️ Please wait until timer ends. Cannot skip.'
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
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {language === 'th' 
                ? 'ถ่ายรูปชุดตรวจให้เห็นแถบ C และ T ชัดเจน'
                : 'Take a photo showing the C and T lines clearly'
              }
            </p>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="max-w-xs mx-auto"
            />
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
              <div className="flex items-center justify-center gap-2 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">
                  {language === 'th' ? 'กำลังวิเคราะห์...' : 'Analyzing...'}
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
                  {analysisResult === 'negative' && (
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
                  {analysisResult === 'positive' && (
                    <>
                      <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
                      <h4 className="text-xl font-bold text-destructive mb-1">
                        {language === 'th' ? 'พบสัญญาณบวก (Reactive)' : 'Reactive'}
                      </h4>
                      <p className="text-sm text-destructive/80">
                        {language === 'th' 
                          ? 'กรุณาติดต่อคลินิกเพื่อตรวจยืนยัน'
                          : 'Please contact a clinic for confirmatory testing'
                        }
                      </p>
                    </>
                  )}
                  {analysisResult === 'invalid' && (
                    <>
                      <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                      <h4 className="text-xl font-bold text-amber-500 mb-1">
                        {language === 'th' ? 'ผลไม่ชัดเจน' : 'Invalid Result'}
                      </h4>
                      <p className="text-sm text-amber-500/80">
                        {language === 'th' 
                          ? 'กรุณาถ่ายรูปใหม่หรือติดต่อเจ้าหน้าที่'
                          : 'Please retake photo or contact staff'
                        }
                      </p>
                    </>
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

        {currentStep === 'request' && renderRequestStep()}
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
