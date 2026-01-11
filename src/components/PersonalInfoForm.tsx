import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, User, Heart, Shield, Phone, MapPin, Activity } from 'lucide-react';
import thailandGeographyData from '@/data/thailand-geography.json';

// Extract unique provinces from the geography data
const provinces = [...new Set(thailandGeographyData.map(item => item.provinceNameTh))].sort();

interface PersonalInfoFormProps {
  userId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

const GENDER_OPTIONS = [
  { value: 'male', labelTh: 'ชาย', labelEn: 'Male' },
  { value: 'female', labelTh: 'หญิง', labelEn: 'Female' },
  { value: 'transgender_woman', labelTh: 'หญิงข้ามเพศ', labelEn: 'Transgender Woman' },
  { value: 'transgender_man', labelTh: 'ชายข้ามเพศ', labelEn: 'Transgender Man' },
  { value: 'non_binary', labelTh: 'นอนไบนารี่', labelEn: 'Non-binary' },
  { value: 'prefer_not_to_say', labelTh: 'ไม่ระบุ', labelEn: 'Prefer not to say' },
];

const ORIENTATION_OPTIONS = [
  { value: 'heterosexual', labelTh: 'รักต่างเพศ', labelEn: 'Heterosexual' },
  { value: 'homosexual', labelTh: 'รักเพศเดียวกัน', labelEn: 'Homosexual' },
  { value: 'bisexual', labelTh: 'รักสองเพศ', labelEn: 'Bisexual' },
  { value: 'pansexual', labelTh: 'แพนเซ็กชวล', labelEn: 'Pansexual' },
  { value: 'prefer_not_to_say', labelTh: 'ไม่ระบุ', labelEn: 'Prefer not to say' },
];

const PREVENTION_OPTIONS = [
  { value: 'prep_daily', labelTh: 'PrEP รายวัน', labelEn: 'PrEP Daily' },
  { value: 'prep_on_demand', labelTh: 'PrEP ตามความต้องการ', labelEn: 'PrEP On-demand' },
  { value: 'pep', labelTh: 'PEP', labelEn: 'PEP' },
  { value: 'art', labelTh: 'ART (รักษา HIV)', labelEn: 'ART (HIV Treatment)' },
  { value: 'none', labelTh: 'ไม่ใช้', labelEn: 'None' },
  { value: 'interested', labelTh: 'สนใจเรียนรู้', labelEn: 'Interested to learn' },
];

const HIV_TEST_RESULT_OPTIONS = [
  { value: 'negative', labelTh: 'ผลลบ', labelEn: 'Negative' },
  { value: 'positive', labelTh: 'ผลบวก', labelEn: 'Positive' },
  { value: 'unknown', labelTh: 'ไม่ทราบ', labelEn: 'Unknown' },
];

export function PersonalInfoForm({ userId, onComplete, onSkip }: PersonalInfoFormProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Use provinces from module scope
  
  // Form state
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: '',
    sexualOrientation: '',
    province: '',
    phone: '',
    lineId: '',
    preventionPreference: '',
    currentlyOnPrep: false,
    currentlyOnPep: false,
    currentlyOnArt: false,
    everTestedHiv: null as boolean | null,
    lastHivTestDate: '',
    lastHivTestResult: '',
    hasMultiplePartners: null as boolean | null,
    usesCondomsRegularly: null as boolean | null,
    usesInjectionDrugs: false,
    partnerHivStatus: '',
  });

  // provinces already defined at module scope

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_personal_info')
        .upsert({
          user_id: userId,
          date_of_birth: formData.dateOfBirth || null,
          gender: formData.gender || null,
          sexual_orientation: formData.sexualOrientation || null,
          province: formData.province || null,
          phone: formData.phone || null,
          line_id: formData.lineId || null,
          prevention_preference: formData.preventionPreference || null,
          currently_on_prep: formData.currentlyOnPrep,
          currently_on_pep: formData.currentlyOnPep,
          currently_on_art: formData.currentlyOnArt,
          ever_tested_hiv: formData.everTestedHiv,
          last_hiv_test_date: formData.lastHivTestDate || null,
          last_hiv_test_result: formData.lastHivTestResult || null,
          has_multiple_partners: formData.hasMultiplePartners,
          uses_condoms_regularly: formData.usesCondomsRegularly,
          uses_injection_drugs: formData.usesInjectionDrugs,
          partner_hiv_status: formData.partnerHivStatus || null,
          profile_completed: true,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast.success(language === 'th' ? 'บันทึกข้อมูลสำเร็จ' : 'Profile saved successfully');
      onComplete();
    } catch (error: any) {
      console.error('Error saving personal info:', error);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <User className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {language === 'th' ? 'ข้อมูลพื้นฐาน' : 'Basic Information'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === 'th' ? 'ข้อมูลนี้จะช่วยให้เราให้บริการที่เหมาะกับคุณ' : 'This helps us personalize your experience'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{language === 'th' ? 'วันเกิด' : 'Date of Birth'}</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{language === 'th' ? 'เพศ' : 'Gender'}</Label>
          <Select value={formData.gender} onValueChange={(v) => updateField('gender', v)}>
            <SelectTrigger>
              <SelectValue placeholder={language === 'th' ? 'เลือกเพศ' : 'Select gender'} />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {language === 'th' ? opt.labelTh : opt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{language === 'th' ? 'รสนิยมทางเพศ' : 'Sexual Orientation'}</Label>
          <Select value={formData.sexualOrientation} onValueChange={(v) => updateField('sexualOrientation', v)}>
            <SelectTrigger>
              <SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {ORIENTATION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {language === 'th' ? opt.labelTh : opt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{language === 'th' ? 'จังหวัด' : 'Province'}</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Select value={formData.province} onValueChange={(v) => updateField('province', v)}>
              <SelectTrigger className="pl-10">
                <SelectValue placeholder={language === 'th' ? 'เลือกจังหวัด' : 'Select province'} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {provinces.map(province => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Phone className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {language === 'th' ? 'ข้อมูลติดต่อ' : 'Contact Information'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === 'th' ? 'สำหรับการติดต่อและจัดส่ง' : 'For contact and delivery purposes'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="0812345678"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>LINE ID ({language === 'th' ? 'ถ้ามี' : 'optional'})</Label>
          <Input
            type="text"
            value={formData.lineId}
            onChange={(e) => updateField('lineId', e.target.value)}
            placeholder="@yourlineid"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {language === 'th' ? 'การป้องกัน HIV' : 'HIV Prevention'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === 'th' ? 'ข้อมูลนี้ช่วยให้เราแนะนำบริการที่เหมาะกับคุณ' : 'This helps us recommend the right services'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{language === 'th' ? 'ความสนใจด้านการป้องกัน' : 'Prevention Interest'}</Label>
          <Select value={formData.preventionPreference} onValueChange={(v) => updateField('preventionPreference', v)}>
            <SelectTrigger>
              <SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {PREVENTION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {language === 'th' ? opt.labelTh : opt.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>{language === 'th' ? 'ปัจจุบันใช้อยู่' : 'Currently using'}</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="prep" 
                checked={formData.currentlyOnPrep}
                onCheckedChange={(checked) => updateField('currentlyOnPrep', checked)}
              />
              <label htmlFor="prep" className="text-sm">PrEP</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pep" 
                checked={formData.currentlyOnPep}
                onCheckedChange={(checked) => updateField('currentlyOnPep', checked)}
              />
              <label htmlFor="pep" className="text-sm">PEP</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="art" 
                checked={formData.currentlyOnArt}
                onCheckedChange={(checked) => updateField('currentlyOnArt', checked)}
              />
              <label htmlFor="art" className="text-sm">ART</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {language === 'th' ? 'ประวัติการตรวจ HIV' : 'HIV Testing History'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === 'th' ? 'ข้อมูลนี้เป็นความลับและปลอดภัย' : 'This information is confidential and secure'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>{language === 'th' ? 'เคยตรวจ HIV หรือไม่?' : 'Have you ever been tested for HIV?'}</Label>
          <RadioGroup 
            value={formData.everTestedHiv === null ? '' : formData.everTestedHiv ? 'yes' : 'no'}
            onValueChange={(v) => updateField('everTestedHiv', v === 'yes')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="tested-yes" />
              <Label htmlFor="tested-yes">{language === 'th' ? 'เคย' : 'Yes'}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="tested-no" />
              <Label htmlFor="tested-no">{language === 'th' ? 'ไม่เคย' : 'No'}</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.everTestedHiv && (
          <>
            <div className="space-y-2">
              <Label>{language === 'th' ? 'วันที่ตรวจล่าสุด' : 'Last test date'}</Label>
              <Input
                type="date"
                value={formData.lastHivTestDate}
                onChange={(e) => updateField('lastHivTestDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'th' ? 'ผลการตรวจล่าสุด' : 'Last test result'}</Label>
              <Select value={formData.lastHivTestResult} onValueChange={(v) => updateField('lastHivTestResult', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {HIV_TEST_RESULT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {language === 'th' ? opt.labelTh : opt.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Heart className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {language === 'th' ? 'ข้อมูลเพิ่มเติม' : 'Additional Information'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === 'th' ? 'ช่วยให้เราแนะนำบริการที่เหมาะกับคุณมากขึ้น (ไม่บังคับ)' : 'Helps us better recommend services (optional)'}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>{language === 'th' ? 'มีคู่นอนหลายคน?' : 'Multiple sexual partners?'}</Label>
          <RadioGroup 
            value={formData.hasMultiplePartners === null ? '' : formData.hasMultiplePartners ? 'yes' : 'no'}
            onValueChange={(v) => updateField('hasMultiplePartners', v === 'yes')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="partners-yes" />
              <Label htmlFor="partners-yes">{language === 'th' ? 'ใช่' : 'Yes'}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="partners-no" />
              <Label htmlFor="partners-no">{language === 'th' ? 'ไม่' : 'No'}</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>{language === 'th' ? 'ใช้ถุงยางอนามัยเป็นประจำ?' : 'Use condoms regularly?'}</Label>
          <RadioGroup 
            value={formData.usesCondomsRegularly === null ? '' : formData.usesCondomsRegularly ? 'yes' : 'no'}
            onValueChange={(v) => updateField('usesCondomsRegularly', v === 'yes')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="condom-yes" />
              <Label htmlFor="condom-yes">{language === 'th' ? 'ใช่' : 'Yes'}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="condom-no" />
              <Label htmlFor="condom-no">{language === 'th' ? 'ไม่' : 'No'}</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>{language === 'th' ? 'สถานะ HIV ของคู่นอน' : 'Partner HIV status'}</Label>
          <Select value={formData.partnerHivStatus} onValueChange={(v) => updateField('partnerHivStatus', v)}>
            <SelectTrigger>
              <SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="negative">{language === 'th' ? 'ผลลบ' : 'Negative'}</SelectItem>
              <SelectItem value="positive">{language === 'th' ? 'ผลบวก' : 'Positive'}</SelectItem>
              <SelectItem value="unknown">{language === 'th' ? 'ไม่ทราบ' : 'Unknown'}</SelectItem>
              <SelectItem value="multiple">{language === 'th' ? 'มีหลายคน' : 'Multiple partners'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const totalSteps = 5;

  return (
    <div className="min-h-screen gradient-hero flex flex-col px-6 py-8">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 mx-0.5 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {language === 'th' ? `ขั้นตอน ${step} จาก ${totalSteps}` : `Step ${step} of ${totalSteps}`}
        </p>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-y-auto">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* Navigation */}
      <div className="pt-6 space-y-3">
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(step - 1)}
            >
              {language === 'th' ? 'ย้อนกลับ' : 'Back'}
            </Button>
          )}
          
          {step < totalSteps ? (
            <Button
              variant="hero"
              className="flex-1"
              onClick={() => setStep(step + 1)}
            >
              {language === 'th' ? 'ถัดไป' : 'Next'}
            </Button>
          ) : (
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving 
                ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                : (language === 'th' ? 'เสร็จสิ้น' : 'Complete')
              }
            </Button>
          )}
        </div>
        
        {onSkip && step === 1 && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onSkip}
          >
            {language === 'th' ? 'ข้ามไปก่อน' : 'Skip for now'}
          </Button>
        )}
      </div>
    </div>
  );
}