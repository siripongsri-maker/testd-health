import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  FileText,
  Phone,
  MapPin,
  Calendar,
  Info,
  Truck,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import swingLogo from "@/assets/swing-logo.webp";

interface SelfTestRequest {
  id: string;
  status: string;
  tracking_number: string | null;
  test_result: string | null;
  created_at: string;
}

export default function HIVSelfTest() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("info");
  const [requests, setRequests] = useState<SelfTestRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    lineId: "",
    address: "",
    province: "",
    postalCode: "",
    lastRiskDate: "",
  });
  
  // Result upload state
  const [resultPhoto, setResultPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('hiv_selftest_requests')
      .select('id, status, tracking_number, test_result, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setRequests(data);
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
    
    try {
      const { error } = await supabase.from('hiv_selftest_requests').insert({
        user_id: user.id,
        full_name: formData.fullName,
        phone: formData.phone,
        line_id: formData.lineId,
        address: formData.address,
        province: formData.province,
        postal_code: formData.postalCode,
        last_risk_date: formData.lastRiskDate || null,
        days_since_risk: daysSinceRisk,
        status: 'pending',
      });

      if (error) throw error;

      toast.success(
        language === 'th' 
          ? 'ส่งคำขอสำเร็จ! เจ้าหน้าที่จะติดต่อกลับ' 
          : 'Request submitted! Staff will contact you.'
      );
      
      setFormData({
        fullName: "",
        phone: "",
        lineId: "",
        address: "",
        province: "",
        postalCode: "",
        lastRiskDate: "",
      });
      
      fetchRequests();
      setActiveTab("status");
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (requestId: string) => {
    if (!resultPhoto || !user) return;
    
    setUploading(true);
    
    try {
      const fileExt = resultPhoto.name.split('.').pop();
      const fileName = `${user.id}/${requestId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('selftest-results')
        .upload(fileName, resultPhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('selftest-results')
        .getPublicUrl(fileName);

      await supabase
        .from('hiv_selftest_requests')
        .update({ 
          result_photo_url: fileName,
          status: 'result_submitted'
        })
        .eq('id', requestId);

      toast.success(
        language === 'th' 
          ? 'ส่งภาพผลตรวจสำเร็จ! เจ้าหน้าที่จะตรวจสอบ' 
          : 'Result photo uploaded! Staff will review.'
      );
      
      setResultPhoto(null);
      fetchRequests();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(language === 'th' ? 'อัปโหลดไม่สำเร็จ' : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; labelTh: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: 'Pending Review', labelTh: 'รอตรวจสอบ', variant: 'secondary' },
      approved: { label: 'Approved', labelTh: 'อนุมัติแล้ว', variant: 'default' },
      shipped: { label: 'Shipped', labelTh: 'จัดส่งแล้ว', variant: 'default' },
      delivered: { label: 'Delivered', labelTh: 'ได้รับแล้ว', variant: 'default' },
      result_submitted: { label: 'Result Submitted', labelTh: 'ส่งผลแล้ว', variant: 'secondary' },
      completed: { label: 'Completed', labelTh: 'เสร็จสิ้น', variant: 'default' },
    };
    
    const config = statusConfig[status] || { label: status, labelTh: status, variant: 'outline' as const };
    
    return (
      <Badge variant={config.variant}>
        {language === 'th' ? config.labelTh : config.label}
      </Badge>
    );
  };

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
                {language === 'th' ? 'รับชุดตรวจฟรี โดย SWING' : 'Free kit by SWING'}
              </p>
            </div>
          </div>
          <img src={swingLogo} alt="SWING" className="h-8 mt-2" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="info" className="text-xs">
              <Info className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{language === 'th' ? 'ข้อมูล' : 'Info'}</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs">
              <Play className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{language === 'th' ? 'วิดีโอ' : 'Video'}</span>
            </TabsTrigger>
            <TabsTrigger value="request" className="text-xs">
              <Package className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{language === 'th' ? 'ขอรับ' : 'Request'}</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="text-xs">
              <FileText className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{language === 'th' ? 'สถานะ' : 'Status'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <Card className="p-4 border-l-4 border-l-primary">
              <h3 className="font-bold text-foreground mb-2">
                {language === 'th' ? 'ขั้นตอนการรับชุดตรวจ' : 'How to Get a Kit'}
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  <span>{language === 'th' ? 'กรอกแบบฟอร์มขอรับชุดตรวจ' : 'Fill out the request form'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  <span>{language === 'th' ? 'เจ้าหน้าที่จะติดต่อให้ข้อมูล' : 'Staff will contact you with information'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                  <span>{language === 'th' ? 'รับชุดตรวจทางไปรษณีย์' : 'Receive the kit by mail'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                  <span>{language === 'th' ? 'ทำการตรวจและถ่ายรูปผล (ไม่บังคับ)' : 'Test and upload result photo (optional)'}</span>
                </li>
              </ol>
            </Card>

            <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    {language === 'th' ? 'ข้อควรระวัง' : 'Important Note'}
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    {language === 'th' 
                      ? 'ชุดตรวจนี้สามารถตรวจ HIV ได้ก็ต่อเมื่อเสี่ยงเกิน 30 วัน หากไม่ถึง 30 วัน แนะนำให้มาตรวจที่คลินิก'
                      : 'This kit can only detect HIV after 30 days of exposure. If less than 30 days, please visit a clinic.'
                    }
                  </p>
                </div>
              </div>
            </Card>

            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={() => setActiveTab("request")}
            >
              {language === 'th' ? 'ขอรับชุดตรวจฟรี' : 'Request Free Kit'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </TabsContent>

          {/* Video Tutorial Tab */}
          <TabsContent value="video" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-bold text-foreground mb-3">
                {language === 'th' ? 'วิธีใช้ชุดตรวจ HIV ด้วยตัวเอง' : 'How to Use HIV Self-Test Kit'}
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
                  ? 'ดูวิดีโอสอนวิธีการใช้ชุดตรวจอย่างละเอียด ก่อนทำการตรวจ'
                  : 'Watch the detailed tutorial video before testing'
                }
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold text-foreground mb-2">
                {language === 'th' ? 'ขั้นตอนสำคัญ' : 'Key Steps'}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {language === 'th' ? 'ล้างมือให้สะอาดก่อนเริ่ม' : 'Wash hands before starting'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {language === 'th' ? 'อ่านคำแนะนำในกล่องอย่างละเอียด' : 'Read box instructions carefully'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {language === 'th' ? 'รอผลตามเวลาที่กำหนด (15-20 นาที)' : 'Wait for results (15-20 minutes)'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {language === 'th' ? 'ถ่ายรูปผลและส่งมาเพื่อยืนยัน' : 'Take a photo and submit for verification'}
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* Request Form Tab */}
          <TabsContent value="request" className="space-y-4">
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
                      <Label htmlFor="phone">
                        <Phone className="h-4 w-4 inline mr-1" />
                        {language === 'th' ? 'เบอร์โทร' : 'Phone'}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="08x-xxx-xxxx"
                        required
                      />
                    </div>
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="province">{language === 'th' ? 'จังหวัด' : 'Province'}</Label>
                      <Input
                        id="province"
                        value={formData.province}
                        onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                        placeholder={language === 'th' ? 'กรุงเทพฯ' : 'Bangkok'}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">{language === 'th' ? 'รหัสไปรษณีย์' : 'Postal Code'}</Label>
                      <Input
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="10xxx"
                        required
                      />
                    </div>
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
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            {!user ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  {language === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อดูสถานะ' : 'Please login to view status'}
                </p>
                <Button onClick={() => navigate('/auth')}>
                  {language === 'th' ? 'เข้าสู่ระบบ' : 'Login'}
                </Button>
              </Card>
            ) : requests.length === 0 ? (
              <Card className="p-6 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {language === 'th' ? 'ยังไม่มีคำขอ' : 'No requests yet'}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("request")}
                >
                  {language === 'th' ? 'ขอรับชุดตรวจ' : 'Request a Kit'}
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                        </p>
                        {request.tracking_number && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Truck className="h-3 w-3" />
                            {request.tracking_number}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    {/* Upload Result Photo */}
                    {(request.status === 'delivered' || request.status === 'shipped') && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-foreground mb-2">
                          {language === 'th' ? 'ส่งผลการตรวจ' : 'Submit Test Result'}
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setResultPhoto(e.target.files?.[0] || null)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            disabled={!resultPhoto || uploading}
                            onClick={() => handlePhotoUpload(request.id)}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === 'th' 
                            ? 'ถ่ายรูปผลตรวจเพื่อให้เจ้าหน้าที่ยืนยันความถูกต้อง (ไม่บังคับ)'
                            : 'Upload result photo for staff verification (optional)'
                          }
                        </p>
                      </div>
                    )}

                    {/* Show test result if verified */}
                    {request.test_result && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {language === 'th' ? 'ผลการตรวจ' : 'Test Result'}
                        </p>
                        <Badge variant={request.test_result === 'negative' ? 'default' : 'destructive'}>
                          {request.test_result === 'negative' 
                            ? (language === 'th' ? 'ไม่พบเชื้อ (Negative)' : 'Negative')
                            : (language === 'th' ? 'พบเชื้อ (Positive)' : 'Positive')
                          }
                        </Badge>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
      <BottomNav />
    </>
  );
}