import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Phone, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getUserData } from "@/lib/store";
import { getProvinces, getDistricts, getSubdistricts, getPostalCode, Subdistrict } from "@/lib/thailand-address";
import { ShippingFormData } from "./types";

interface ShippingStepProps {
  formData: ShippingFormData;
  onFormChange: (data: ShippingFormData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ShippingStep({ formData, onFormChange, onNext, onBack }: ShippingStepProps) {
  const { language } = useLanguage();
  const [districts, setDistricts] = useState<string[]>([]);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);

  // Load saved personal info on mount
  useEffect(() => {
    const userData = getUserData();
    if (userData.personalInfo) {
      const pi = userData.personalInfo;
      onFormChange({
        ...formData,
        fullName: formData.fullName || pi.fullName || '',
        phone: formData.phone || pi.phone || '',
        lineId: formData.lineId || pi.lineId || '',
        address: formData.address || pi.address || '',
        subdistrict: formData.subdistrict || pi.subdistrict || '',
        district: formData.district || pi.district || '',
        province: formData.province || pi.province || '',
        postalCode: formData.postalCode || pi.postalCode || '',
      });
    }
  }, []);

  // Update districts when province changes
  useEffect(() => {
    if (formData.province) {
      const districtList = getDistricts(formData.province);
      setDistricts(districtList);
      if (!districtList.includes(formData.district)) {
        onFormChange({ ...formData, district: '', subdistrict: '', postalCode: '' });
      }
    }
  }, [formData.province]);

  // Update subdistricts when district changes
  useEffect(() => {
    if (formData.province && formData.district) {
      const subdistrictList = getSubdistricts(formData.province, formData.district);
      setSubdistricts(subdistrictList);
      const subdistrictNames = subdistrictList.map(s => s.name);
      if (!subdistrictNames.includes(formData.subdistrict)) {
        onFormChange({ ...formData, subdistrict: '', postalCode: '' });
      }
    }
  }, [formData.district]);

  // Auto-fill postal code
  useEffect(() => {
    if (formData.province && formData.district && formData.subdistrict) {
      const postal = getPostalCode(formData.province, formData.district, formData.subdistrict);
      if (postal && postal !== formData.postalCode) {
        onFormChange({ ...formData, postalCode: postal });
      }
    }
  }, [formData.subdistrict]);

  const calculateDaysSinceRisk = (date: string): number => {
    if (!date) return 0;
    const riskDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - riskDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysSinceRisk = calculateDaysSinceRisk(formData.lastRiskDate);
  const isFormValid = formData.fullName && formData.phone && formData.address && formData.province && formData.district && formData.subdistrict;

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-2">
          <span className="text-lg">📦</span>
          <div>
            <p className="text-sm font-medium text-primary">
              {language === 'th' ? 'ขั้นตอนที่ 1: ข้อมูลจัดส่ง' : 'Step 1: Shipping Information'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'th' 
                ? 'กรอกข้อมูลเพื่อจัดส่งชุดตรวจถึงบ้านคุณ'
                : 'Enter your shipping details to receive the test kit'
              }
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              {language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'} *
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => onFormChange({ ...formData, fullName: e.target.value })}
              placeholder={language === 'th' ? 'ชื่อจริง นามสกุล' : 'Your full name'}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="h-4 w-4 inline mr-1" />
              {language === 'th' ? 'เบอร์โทร' : 'Phone'} *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                let formatted = digits;
                if (digits.length > 3) {
                  formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                }
                if (digits.length > 6) {
                  formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                }
                onFormChange({ ...formData, phone: formatted });
              }}
              placeholder="0XX-XXX-XXXX"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lineId">LINE ID ({language === 'th' ? 'ไม่บังคับ' : 'optional'})</Label>
          <Input
            id="lineId"
            value={formData.lineId}
            onChange={(e) => onFormChange({ ...formData, lineId: e.target.value })}
            placeholder="@line_id"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="whitespace-pre-line">
            <MapPin className="h-4 w-4 inline mr-1" />
            {language === 'th' ? 'ที่อยู่จัดส่ง *\n(โครงการขอสงวนสิทธิ์ในการไม่จัดส่งหากที่อยู่ไม่ครบ)' : 'Shipping Address *'}
          </Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => onFormChange({ ...formData, address: e.target.value })}
            placeholder={language === 'th' ? 'บ้านเลขที่ ซอย ถนน หมู่บ้าน' : 'House number, street, village'}
            className="min-h-[60px]"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{language === 'th' ? 'จังหวัด' : 'Province'} *</Label>
            <Select
              value={formData.province}
              onValueChange={(value) => onFormChange({ ...formData, province: value, district: '', subdistrict: '', postalCode: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'th' ? 'เลือกจังหวัด' : 'Select province'} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {getProvinces().map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{language === 'th' ? 'อำเภอ/เขต' : 'District'} *</Label>
            <Select
              value={formData.district}
              onValueChange={(value) => onFormChange({ ...formData, district: value, subdistrict: '', postalCode: '' })}
              disabled={!formData.province}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'th' ? 'เลือกอำเภอ/เขต' : 'Select district'} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{language === 'th' ? 'ตำบล/แขวง' : 'Subdistrict'} *</Label>
            <Select
              value={formData.subdistrict}
              onValueChange={(value) => onFormChange({ ...formData, subdistrict: value })}
              disabled={!formData.district}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'th' ? 'เลือกตำบล/แขวง' : 'Select subdistrict'} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {subdistricts.map((subdistrict) => (
                  <SelectItem key={subdistrict.name} value={subdistrict.name}>
                    {subdistrict.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">
              {language === 'th' ? 'รหัสไปรษณีย์' : 'Postal Code'}
            </Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => onFormChange({ ...formData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
              placeholder="XXXXX"
              maxLength={5}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastRiskDate">
            <Calendar className="h-4 w-4 inline mr-1" />
            {language === 'th' ? 'วันที่มีความเสี่ยงล่าสุด' : 'Last Risk Date'} ({language === 'th' ? 'ไม่บังคับ' : 'optional'})
          </Label>
          <Input
            id="lastRiskDate"
            type="date"
            value={formData.lastRiskDate}
            onChange={(e) => onFormChange({ ...formData, lastRiskDate: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
          />
          {formData.lastRiskDate && daysSinceRisk < 30 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {language === 'th' 
                  ? `ผ่านมา ${daysSinceRisk} วัน — แนะนำให้รอครบ 30 วันหลังความเสี่ยง หรือไปตรวจที่คลินิกเพื่อผลที่แม่นยำกว่า`
                  : `Only ${daysSinceRisk} days — we recommend waiting 30 days after risk or visiting a clinic for more accurate results`
                }
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === 'th' ? 'กลับ' : 'Back'}
        </Button>
        <Button 
          className="flex-1 gap-2" 
          onClick={onNext}
          disabled={!isFormValid}
        >
          {language === 'th' ? 'ถัดไป' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
