import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Shield, Check, Home } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { ShippingFormData, NHSOFormData, GENDER_OPTIONS, validateThaiId } from './types';
import { ThaiIdScanner, ScannedData } from './ThaiIdScanner';
import { getProvinces, getDistricts, getSubdistricts, getPostalCode, Subdistrict } from '@/lib/thailand-address';

interface LiteRequestStepProps {
  shippingData: ShippingFormData;
  nhsoData: NHSOFormData;
  onShippingChange: (d: ShippingFormData) => void;
  onNhsoChange: (d: NHSOFormData) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  hasSavedData?: boolean;
  deliveryMode: 'ship' | 'pickup';
  assignedBranch?: string;
  onBranchChange?: (branch: string) => void;
}

export function LiteRequestStep({
  shippingData, nhsoData, onShippingChange, onNhsoChange,
  onSubmit, onBack, loading, hasSavedData, deliveryMode,
}: LiteRequestStepProps) {
  const { language } = useLanguage();
  const [thaiIdError, setThaiIdError] = useState<string | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  // ID card address from OCR
  const [idCardAddress, setIdCardAddress] = useState<{
    address?: string;
    subdistrict?: string;
    district?: string;
    province?: string;
  } | null>(null);
  // Toggle: use different address for delivery
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);

  // Address cascading for ship mode
  useEffect(() => {
    if (shippingData.province) {
      setDistricts(getDistricts(shippingData.province));
    }
  }, [shippingData.province]);

  useEffect(() => {
    if (shippingData.province && shippingData.district) {
      setSubdistricts(getSubdistricts(shippingData.province, shippingData.district));
    }
  }, [shippingData.district, shippingData.province]);

  useEffect(() => {
    if (shippingData.province && shippingData.district && shippingData.subdistrict) {
      const postal = getPostalCode(shippingData.province, shippingData.district, shippingData.subdistrict);
      if (postal && postal !== shippingData.postalCode) {
        onShippingChange({ ...shippingData, postalCode: postal });
      }
    }
  }, [shippingData.subdistrict]);

  const handleThaiIdChange = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 13);
    onNhsoChange({ ...nhsoData, thaiId: clean });
    if (clean.length === 13) {
      setThaiIdError(validateThaiId(clean) ? null : (language === 'th' ? 'หมายเลขไม่ถูกต้อง' : 'Invalid ID'));
    } else {
      setThaiIdError(null);
    }
  }, [nhsoData, onNhsoChange, language]);

  const handleScanComplete = useCallback((data: ScannedData) => {
    // Update NHSO fields
    const newNhso = { ...nhsoData };
    if (data.thaiId) newNhso.thaiId = data.thaiId;
    if (data.dateOfBirth) newNhso.dateOfBirth = data.dateOfBirth;
    if (data.gender) newNhso.gender = (data.gender as NHSOFormData['gender']) || nhsoData.gender;
    onNhsoChange(newNhso);

    if (data.thaiId) {
      const clean = data.thaiId.replace(/\D/g, '').slice(0, 13);
      if (clean.length === 13) {
        setThaiIdError(validateThaiId(clean) ? null : (language === 'th' ? 'หมายเลขไม่ถูกต้อง' : 'Invalid ID'));
      }
    }

    // Update name
    const newShipping = { ...shippingData };
    if (data.fullNameTh || data.fullNameEn) {
      newShipping.fullName = data.fullNameTh || data.fullNameEn || shippingData.fullName;
    }

    // Store ID card address for reference
    if (data.address || data.province || data.district || data.subdistrict) {
      const scannedAddr = {
        address: data.address || undefined,
        subdistrict: data.subdistrict || undefined,
        district: data.district || undefined,
        province: data.province || undefined,
      };
      setIdCardAddress(scannedAddr);

      // Auto-fill shipping address from ID card (if not using different address)
      if (!useDifferentAddress) {
        if (data.address) newShipping.address = data.address;
        if (data.province) newShipping.province = data.province;
        if (data.district) newShipping.district = data.district;
        if (data.subdistrict) newShipping.subdistrict = data.subdistrict;
      }
    }

    onShippingChange(newShipping);
  }, [nhsoData, shippingData, onNhsoChange, onShippingChange, useDifferentAddress, language]);

  // When toggling back to ID card address, re-apply it
  const handleToggleDifferentAddress = (checked: boolean) => {
    setUseDifferentAddress(checked);
    if (!checked && idCardAddress) {
      // Revert to ID card address
      onShippingChange({
        ...shippingData,
        address: idCardAddress.address || shippingData.address,
        province: idCardAddress.province || shippingData.province,
        district: idCardAddress.district || shippingData.district,
        subdistrict: idCardAddress.subdistrict || shippingData.subdistrict,
        postalCode: '',
      });
    } else if (checked) {
      // Clear address fields for manual entry
      onShippingChange({
        ...shippingData,
        address: '',
        province: '',
        district: '',
        subdistrict: '',
        postalCode: '',
      });
    }
  };

  const isNhsoValid = nhsoData.thaiId.length === 13 && !thaiIdError && nhsoData.dateOfBirth && nhsoData.gender;
  const isShippingValid = deliveryMode === 'pickup' || (shippingData.fullName && shippingData.phone && shippingData.province);
  const isFormValid = isNhsoValid && isShippingValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || loading) return;
    await onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasSavedData && (
        <Card className="p-3 bg-success/10 border-success/30">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <p className="text-sm text-success font-medium">
              {language === 'th' ? 'กรอกข้อมูลที่บันทึกไว้ให้แล้ว' : 'Auto-filled your saved data'}
            </p>
          </div>
        </Card>
      )}

      {/* Thai ID OCR Scanner */}
      <ThaiIdScanner onScanComplete={handleScanComplete} />

      {/* NHSO Verification — always required */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {language === 'th' ? 'ยืนยันสิทธิ์ สปสช.' : 'NHSO Verification'}
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thaiId">
            {language === 'th' ? 'เลขบัตรประชาชน (13 หลัก)' : 'Thai ID (13 digits)'} *
          </Label>
          <Input
            id="thaiId"
            inputMode="numeric"
            value={nhsoData.thaiId}
            onChange={(e) => handleThaiIdChange(e.target.value)}
            placeholder="XXXXXXXXXXXXX"
            maxLength={13}
            className={thaiIdError ? 'border-destructive' : ''}
          />
          {thaiIdError && <p className="text-xs text-destructive">{thaiIdError}</p>}
          {nhsoData.thaiId.length === 13 && !thaiIdError && (
            <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" /> {language === 'th' ? 'ถูกต้อง' : 'Valid'}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="dob">{language === 'th' ? 'วันเกิด' : 'Date of Birth'} *</Label>
            <Input
              id="dob"
              type="date"
              value={nhsoData.dateOfBirth}
              onChange={(e) => onNhsoChange({ ...nhsoData, dateOfBirth: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-2">
            <Label>{language === 'th' ? 'เพศ' : 'Gender'} *</Label>
            <Select value={nhsoData.gender} onValueChange={(v: NHSOFormData['gender']) => onNhsoChange({ ...nhsoData, gender: v })}>
              <SelectTrigger><SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{language === 'th' ? o.labelTh : o.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Shipping info — only for delivery mode */}
      {deliveryMode === 'ship' && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {language === 'th' ? 'ข้อมูลจัดส่ง' : 'Shipping Info'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'} *</Label>
              <Input value={shippingData.fullName} onChange={(e) => onShippingChange({ ...shippingData, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'th' ? 'เบอร์โทร' : 'Phone'} *</Label>
              <Input
                type="tel"
                inputMode="tel"
                value={shippingData.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  let fmt = digits;
                  if (digits.length > 3) fmt = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                  if (digits.length > 6) fmt = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                  onShippingChange({ ...shippingData, phone: fmt });
                }}
                placeholder="0XX-XXX-XXXX"
              />
            </div>
          </div>

          {/* Show scanned ID card address summary */}
          {idCardAddress && (
            <Card className="p-3 bg-muted/50 border-muted">
              <div className="flex items-start gap-2">
                <Home className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {language === 'th' ? 'ที่อยู่ตามบัตรประชาชน' : 'ID Card Address'}
                  </p>
                  <p className="text-sm text-foreground">
                    {[idCardAddress.address, idCardAddress.subdistrict, idCardAddress.district, idCardAddress.province].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Toggle: use different delivery address */}
          {idCardAddress && (
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="diff-addr" className="text-sm cursor-pointer">
                {language === 'th' ? 'ที่อยู่จัดส่งต่างจากบัตร' : 'Different delivery address'}
              </Label>
              <Switch
                id="diff-addr"
                checked={useDifferentAddress}
                onCheckedChange={handleToggleDifferentAddress}
              />
            </div>
          )}

          {/* Address fields — show always if no scanned address, or when user toggles different address */}
          {(!idCardAddress || useDifferentAddress) && (
            <>
              <div className="space-y-2">
                <Label>{language === 'th' ? 'ที่อยู่' : 'Address'} *</Label>
                <Textarea
                  value={shippingData.address}
                  onChange={(e) => onShippingChange({ ...shippingData, address: e.target.value })}
                  placeholder={language === 'th' ? 'บ้านเลขที่ ซอย ถนน' : 'House number, street'}
                  className="min-h-[50px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{language === 'th' ? 'จังหวัด' : 'Province'} *</Label>
                  <Select value={shippingData.province} onValueChange={(v) => onShippingChange({ ...shippingData, province: v, district: '', subdistrict: '', postalCode: '' })}>
                    <SelectTrigger><SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} /></SelectTrigger>
                    <SelectContent className="max-h-60">{getProvinces().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'th' ? 'อำเภอ' : 'District'}</Label>
                  <Select value={shippingData.district} onValueChange={(v) => onShippingChange({ ...shippingData, district: v, subdistrict: '', postalCode: '' })} disabled={!shippingData.province}>
                    <SelectTrigger><SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} /></SelectTrigger>
                    <SelectContent className="max-h-60">{districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{language === 'th' ? 'ตำบล' : 'Subdistrict'}</Label>
                  <Select value={shippingData.subdistrict} onValueChange={(v) => onShippingChange({ ...shippingData, subdistrict: v })} disabled={!shippingData.district}>
                    <SelectTrigger><SelectValue placeholder={language === 'th' ? 'เลือก' : 'Select'} /></SelectTrigger>
                    <SelectContent className="max-h-60">{subdistricts.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'th' ? 'รหัสไปรษณีย์' : 'Postal'}</Label>
                  <Input
                    value={shippingData.postalCode}
                    onChange={(e) => onShippingChange({ ...shippingData, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                    inputMode="numeric"
                    maxLength={5}
                  />
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Pickup mode — minimal info */}
      {deliveryMode === 'pickup' && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {language === 'th' ? 'ข้อมูลผู้รับ' : 'Recipient Info'}
            </h3>
          </div>
          <div className="space-y-2">
            <Label>{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</Label>
            <Input value={shippingData.fullName} onChange={(e) => onShippingChange({ ...shippingData, fullName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{language === 'th' ? 'เบอร์โทร' : 'Phone'} ({language === 'th' ? 'ไม่บังคับ' : 'optional'})</Label>
            <Input
              type="tel"
              inputMode="tel"
              value={shippingData.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                let fmt = digits;
                if (digits.length > 3) fmt = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                if (digits.length > 6) fmt = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                onShippingChange({ ...shippingData, phone: fmt });
              }}
              placeholder="0XX-XXX-XXXX"
            />
          </div>
        </Card>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === 'th' ? 'กลับ' : 'Back'}
        </Button>
        <Button type="submit" className="flex-1 gap-2" disabled={!isFormValid || loading}>
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{language === 'th' ? 'กำลังส่ง...' : 'Submitting...'}</>
          ) : (
            <>{language === 'th' ? 'ยืนยันและส่ง' : 'Submit'}<ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        🔒 {language === 'th' ? 'ข้อมูลเข้ารหัสและปกป้อง ใช้เฉพาะยืนยันสิทธิ์ สปสช.' : 'Data encrypted. Used only for NHSO verification.'}
      </p>
    </form>
  );
}
