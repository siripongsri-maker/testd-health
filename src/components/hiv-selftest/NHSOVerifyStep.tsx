import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Calendar, Check, Shield, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { NHSOFormData, GENDER_OPTIONS, validateThaiId } from "./types";
import { ListenButton } from "@/components/ListenButton";

interface NHSOVerifyStepProps {
  formData: NHSOFormData;
  savedData?: { thaiId?: string; dateOfBirth?: string; gender?: string } | null;
  onFormChange: (data: NHSOFormData) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

export function NHSOVerifyStep({ formData, savedData, onFormChange, onSubmit, onBack, loading }: NHSOVerifyStepProps) {
  const { language } = useLanguage();
  const [thaiIdError, setThaiIdError] = useState<string | null>(null);

  // Check if we have saved data that can be reused
  const hasSavedData = savedData?.thaiId && savedData?.dateOfBirth;

  const handleThaiIdChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 13);
    onFormChange({ ...formData, thaiId: cleanValue });
    
    if (cleanValue.length === 13) {
      if (!validateThaiId(cleanValue)) {
        setThaiIdError(language === 'th' ? 'หมายเลขบัตรประชาชนไม่ถูกต้อง' : 'Invalid Thai ID number');
      } else {
        setThaiIdError(null);
      }
    } else {
      setThaiIdError(null);
    }
  };

  const isFormValid = 
    formData.thaiId.length === 13 && 
    !thaiIdError && 
    formData.dateOfBirth && 
    formData.gender;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || loading) return;
    await onSubmit();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* NHSO Verification Notice */}
      <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <Shield className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
              {language === 'th' ? 'ยืนยันสิทธิ์ สปสช.' : 'NHSO Eligibility Verification'}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {language === 'th' 
                ? 'ข้อมูลนี้จำเป็นสำหรับการยืนยันสิทธิ์ สปสช. ระบบไม่สามารถดำเนินการต่อได้หากไม่ยืนยัน'
                : 'This information is required for NHSO eligibility verification. The system cannot proceed without verification.'
              }
            </p>
          </div>
        </div>
      </Card>

      <ListenButton
        textTh="ขั้นตอนนี้จำเป็นสำหรับการยืนยันสิทธิ์ สปสช. กรุณากรอกเลขบัตรประชาชน 13 หลัก วันเดือนปีเกิด และเพศ เพื่อดำเนินการต่อ ข้อมูลของคุณจะถูกเก็บเป็นความลับ"
        textEn="This step is required for NHSO eligibility verification. Please enter your 13-digit Thai National ID, date of birth, and gender to continue. Your information is kept confidential."
      />

      {/* Show saved data notification if available */}
      {hasSavedData && (
        <Card className="p-3 bg-success/10 border-success/30">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            <p className="text-sm text-success font-medium">
              {language === 'th' 
                ? 'ระบบกรอกข้อมูลที่บันทึกไว้ให้คุณแล้ว กรุณาตรวจสอบและยืนยัน'
                : 'We auto-filled your saved information. Please verify and confirm.'
              }
            </p>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="thaiId">
              {language === 'th' ? 'หมายเลขบัตรประชาชน (13 หลัก)' : 'Thai National ID (13 digits)'} *
            </Label>
            <Input
              id="thaiId"
              value={formData.thaiId}
              onChange={(e) => handleThaiIdChange(e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">
              <Calendar className="h-4 w-4 inline mr-1" />
              {language === 'th' ? 'วันเดือนปีเกิด' : 'Date of Birth'} *
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => onFormChange({ ...formData, dateOfBirth: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              {language === 'th' ? 'เพศ' : 'Gender'} *
            </Label>
            <Select
              value={formData.gender}
              onValueChange={(value: NHSOFormData['gender']) => onFormChange({ ...formData, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'th' ? 'เลือกเพศ' : 'Select gender'} />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {language === 'th' ? opt.labelTh : opt.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Registration benefits notice */}
        <Card className="p-3 mt-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-2">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-sm font-medium text-primary">
                {language === 'th' ? 'ลงทะเบียนอัตโนมัติ' : 'Automatic Registration'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'th' 
                  ? 'ข้อมูลนี้จะถูกบันทึกเพื่อให้การขอรับชุดตรวจครั้งถัดไปรวดเร็วขึ้น คุณไม่ต้องกรอกอีกเลย!'
                  : 'This information will be saved so your next kit request is faster. You won\'t need to fill this again!'
                }
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3 mt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'th' ? 'กลับ' : 'Back'}
          </Button>
          <Button 
            type="submit"
            className="flex-1 gap-2" 
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {language === 'th' ? 'กำลังส่ง...' : 'Submitting...'}
              </>
            ) : (
              <>
                {language === 'th' ? 'ยืนยันและส่งคำขอ' : 'Verify & Submit Request'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Privacy assurance */}
      <p className="text-xs text-center text-muted-foreground">
        {language === 'th' 
          ? '🔒 ข้อมูลของคุณได้รับการเข้ารหัสและปกป้อง ใช้เฉพาะการยืนยันสิทธิ์และรายงาน สปสช. เท่านั้น'
          : '🔒 Your data is encrypted and protected. Used only for eligibility verification and NHSO reporting.'
        }
      </p>
    </div>
  );
}
