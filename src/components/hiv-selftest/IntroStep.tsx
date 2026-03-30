import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, PackageCheck, Package, Upload, MapPin, Building2, Pencil, Store } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { SelfTestRequest, DeliveryMode } from "./types";
import { TestStatistics } from "./TestStatistics";
import hivSelftestKitImg from "@/assets/hiv-selftest-kit.jpg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRANCH_INFO: Record<string, { nameTh: string; nameEn: string; icon: string }> = {
  silom: { nameTh: 'SWING สีลม', nameEn: 'SWING Silom', icon: '🏙️' },
  pattaya: { nameTh: 'SWING พัทยา', nameEn: 'SWING Pattaya', icon: '🏖️' },
};

interface IntroStepProps {
  activeRequest: SelfTestRequest | null;
  onStartRequest: (mode: DeliveryMode) => void;
  onConfirmReceipt: () => void;
  onSubmitExistingKit?: () => void;
  assignedBranch?: string;
  showBranchSelector?: boolean;
  onBranchChange?: (branch: string) => void;
}

export function IntroStep({ activeRequest, onStartRequest, onConfirmReceipt, onSubmitExistingKit, assignedBranch = 'silom', showBranchSelector = false, onBranchChange }: IntroStepProps) {
  const { language } = useLanguage();
  const branchInfo = assignedBranch ? BRANCH_INFO[assignedBranch] : null;
  const [isEditingBranch, setIsEditingBranch] = useState(false);

  // If there's an active request in progress
  if (activeRequest && ['pending', 'approved', 'shipped', 'delivered', 'received'].includes(activeRequest.status)) {
    // For 'received' (venue pickup auto-confirmed), show confirmed status
    const isReceived = activeRequest.status === 'received';
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Statistics - show community usage */}
        <TestStatistics />

        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden">
              <img 
                src={hivSelftestKitImg} 
                alt="Abbott CheckNOW HIV Self-Test Kit"
                className="w-full h-full object-cover"
              />
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

        <Card className="p-4">
          <div className="text-center">
            {activeRequest.status === 'pending' && <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />}
            {activeRequest.status === 'approved' && <PackageCheck className="h-12 w-12 text-primary mx-auto mb-3" />}
            {(activeRequest.status === 'shipped' || activeRequest.status === 'delivered') && <Package className="h-12 w-12 text-success mx-auto mb-3" />}
            {activeRequest.status === 'received' && <PackageCheck className="h-12 w-12 text-success mx-auto mb-3" />}
            
            <h3 className="font-bold text-foreground mb-2">
              {activeRequest.status === 'pending' && (language === 'th' ? 'รอเจ้าหน้าที่ตรวจสอบ' : 'Awaiting Staff Review')}
              {activeRequest.status === 'approved' && (language === 'th' ? 'อนุมัติแล้ว กำลังเตรียมจัดส่ง' : 'Approved - Preparing Shipment')}
              {activeRequest.status === 'shipped' && (language === 'th' ? 'จัดส่งแล้ว รอรับพัสดุ' : 'Shipped - Awaiting Delivery')}
              {activeRequest.status === 'delivered' && (language === 'th' ? 'พัสดุถึงแล้ว กรุณายืนยันการรับ' : 'Delivered - Please Confirm Receipt')}
              {activeRequest.status === 'received' && (language === 'th' ? 'ยืนยันว่าได้รับแล้ว' : 'Confirmed Received')}
            </h3>
            
            <Badge variant={activeRequest.status === 'shipped' || activeRequest.status === 'delivered' || activeRequest.status === 'received' ? 'default' : 'secondary'}>
              {activeRequest.status === 'pending' && (language === 'th' ? '⏳ รอตรวจสอบ' : '⏳ Pending Review')}
              {activeRequest.status === 'approved' && (language === 'th' ? '✓ อนุมัติแล้ว' : '✓ Approved')}
              {activeRequest.status === 'shipped' && (language === 'th' ? '📦 จัดส่งแล้ว' : '📦 Shipped')}
              {activeRequest.status === 'delivered' && (language === 'th' ? '🏠 ถึงปลายทาง' : '🏠 Delivered')}
              {activeRequest.status === 'received' && (language === 'th' ? '✅ ยืนยันว่าได้รับแล้ว' : '✅ Confirmed Received')}
            </Badge>
            
            {activeRequest.tracking_number && (
              <div className="mt-3 p-2 bg-primary/5 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  📦 {language === 'th' ? 'เลขพัสดุ' : 'Tracking'}: {activeRequest.tracking_number}
                </p>
              </div>
            )}
            
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
                {activeRequest.status === 'received' && (language === 'th' 
                  ? '💡 คุณได้รับชุดตรวจที่หน้างานแล้ว กดเริ่มตรวจเพื่อดูวิดีโอแนะนำ'
                  : '💡 You received the kit at the venue. Press Start Testing to watch the tutorial.')}
              </p>
            </div>
            
            {activeRequest.status === 'received' ? (
              <Button 
                className="mt-4 w-full" 
                onClick={onConfirmReceipt}
              >
                {language === 'th' ? '🧪 เริ่มตรวจ' : '🧪 Start Testing'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                className="mt-4 w-full" 
                onClick={onConfirmReceipt}
                disabled={activeRequest.status !== 'shipped' && activeRequest.status !== 'delivered'}
                variant={activeRequest.status === 'delivered' ? 'default' : 'outline'}
              >
                {activeRequest.status === 'delivered' 
                  ? (language === 'th' ? '✓ ยืนยันว่าได้รับชุดตรวจแล้ว' : '✓ Confirm I received the kit')
                  : (language === 'th' ? 'รอพัสดุ...' : 'Waiting for delivery...')}
                {(activeRequest.status === 'shipped' || activeRequest.status === 'delivered') && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Welcome screen for new requests - guest-friendly
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Delivery method selection - ACTION FIRST */}
      <Card className="p-4 space-y-3">
        <h3 className="text-base font-bold text-foreground text-center">
          {language === 'th' ? 'เลือกวิธีรับชุดตรวจ' : 'Choose How to Get Your Kit'}
        </h3>
        <Button 
          className="w-full gap-2 h-12 text-base" 
          size="lg"
          onClick={() => onStartRequest('ship')}
        >
          {language === 'th' ? '🚚 จัดส่งถึงบ้าน' : '🚚 Ship to Home'}
          <ArrowRight className="h-5 w-5" />
        </Button>

        <Button 
          variant="outline"
          className="w-full gap-2 h-12 text-base" 
          size="lg"
          onClick={() => onStartRequest('pickup')}
        >
          <Store className="h-5 w-5" />
          {language === 'th' ? 'รับชุดตรวจที่หน้างาน' : 'Pickup at Venue'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {language === 'th' 
            ? '🚚 จัดส่งฟรีทั่วประเทศ • ไม่มีค่าใช้จ่าย'
            : '🚚 Free shipping nationwide • No cost'}
        </p>
      </Card>

      {/* Statistics - total count only */}
      <TestStatistics />

      {/* Abbott HIV Self-Test Kit Image */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden">
            <img 
              src={hivSelftestKitImg} 
              alt="Abbott CheckNOW HIV Self-Test Kit"
              className="w-full h-full object-cover"
            />
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

      {/* Privacy & Benefits Card */}
      <Card className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <span className="text-lg">🔒</span>
          <div>
            <p className="text-sm font-medium text-primary">
              {language === 'th' ? 'ความเป็นส่วนตัวของคุณได้รับการปกป้อง' : 'Your Privacy is Protected'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'th' 
                ? 'ข้อมูลของคุณใช้เฉพาะการจัดส่งและยืนยันสิทธิ์ สปสช. เท่านั้น'
                : 'Your data is only used for shipping and NHSO eligibility verification.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {language === 'th' ? 'ลงทะเบียนครั้งเดียว ใช้งานได้ตลอด' : 'Register Once, Use Forever'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'th' 
                ? 'การขอรับชุดตรวจครั้งถัดไปจะรวดเร็วขึ้น เพราะระบบจะจำข้อมูลของคุณไว้'
                : 'Future kit requests will be faster as we remember your information.'
              }
            </p>
          </div>
        </div>
      </Card>




      {/* Already have a kit? Submit result directly */}
      {onSubmitExistingKit && (
        <Card className="p-4 bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Upload className="h-5 w-5 text-warning" />
              <h4 className="font-semibold text-foreground">
                {language === 'th' ? 'มีชุดตรวจอยู่แล้ว?' : 'Already have a test kit?'}
              </h4>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'th' 
                ? 'ถ้าคุณมีชุดตรวจ HIV จากแหล่งอื่นอยู่แล้ว สามารถส่งผลและเชื่อมต่อการดูแลได้เลย'
                : 'If you already have an HIV test kit from another source, you can submit your result and connect to care.'
              }
            </p>
            <Button 
              variant="outline" 
              className="w-full gap-2 border-warning/30 hover:bg-warning/10"
              onClick={onSubmitExistingKit}
            >
              <Upload className="h-4 w-4" />
              {language === 'th' ? 'ส่งผลตรวจจากชุดที่มีอยู่' : 'Submit Result from Existing Kit'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
