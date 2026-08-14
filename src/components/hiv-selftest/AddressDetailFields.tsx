import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { ShippingFormData } from "./types";

interface Props {
  data: ShippingFormData;
  onChange: (data: ShippingFormData) => void;
}

export function composeAddress(houseNo?: string, village?: string, moo?: string) {
  return [
    houseNo?.trim(),
    village?.trim() ? `หมู่บ้าน ${village.trim()}` : '',
    moo?.trim() ? `หมู่ ${moo.trim()}` : '',
  ].filter(Boolean).join(' ');
}

// เลขที่บ้าน: ตัวเลข 1-6 หลัก ตามด้วย / หรือ - และเลข/อักษรได้สูงสุด 2 ส่วน (เช่น 99, 99/1, 123/45-6)
const HOUSE_NO_PATTERN = /^\d{1,6}([/-][0-9a-zA-Zก-๙]{1,6}){0,2}$/;

export function validateHouseNo(value?: string): boolean {
  const v = (value || '').trim();
  return v.length > 0 && v.length <= 20 && HOUSE_NO_PATTERN.test(v);
}

export function AddressDetailFields({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [touched, setTouched] = useState(false);

  const houseNo = data.houseNo || '';
  const isEmpty = houseNo.trim().length === 0;
  const invalid = !validateHouseNo(houseNo);
  const showError = touched && invalid;

  const update = (patch: Partial<ShippingFormData>) => {
    const next = { ...data, ...patch };
    next.address = composeAddress(next.houseNo, next.village, next.moo);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="whitespace-pre-line">
        <MapPin className="h-4 w-4 inline mr-1" />
        {isTh
          ? 'ที่อยู่จัดส่ง *\n(โครงการขอสงวนสิทธิ์ในการไม่จัดส่งหากที่อยู่ไม่ครบ)'
          : 'Shipping address *'}
      </Label>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="houseNo" className="text-xs text-muted-foreground">
            {isTh ? 'เลขที่บ้าน' : 'House no.'} *
          </Label>
          <Input
            id="houseNo"
            value={houseNo}
            onChange={(e) => update({ houseNo: e.target.value.slice(0, 20) })}
            onBlur={() => setTouched(true)}
            placeholder={isTh ? 'เช่น 99/1' : 'e.g. 99/1'}
            aria-invalid={showError}
            aria-describedby="houseNo-error"
            className={showError ? 'border-destructive focus-visible:ring-destructive' : ''}
            required
          />
          {showError && (
            <p id="houseNo-error" className="text-xs text-destructive">
              {isEmpty
                ? (isTh ? 'กรุณากรอกเลขที่บ้าน' : 'House number is required')
                : (isTh ? 'รูปแบบไม่ถูกต้อง เช่น 99 หรือ 99/1' : 'Invalid format, e.g. 99 or 99/1')}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="village" className="text-xs text-muted-foreground">
            {isTh ? 'หมู่บ้าน / อาคาร (ไม่บังคับ)' : 'Village / building (optional)'}
          </Label>
          <Input
            id="village"
            value={data.village || ''}
            onChange={(e) => update({ village: e.target.value })}
            placeholder={isTh ? 'ไม่บังคับ' : 'optional'}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="moo" className="text-xs text-muted-foreground">
            {isTh ? 'หมู่' : 'Moo'}
          </Label>
          <Input
            id="moo"
            value={data.moo || ''}
            onChange={(e) => update({ moo: e.target.value })}
            placeholder={isTh ? 'ไม่บังคับ' : 'optional'}
            inputMode="numeric"
          />
        </div>
      </div>
    </div>
  );
}
