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

export function AddressDetailFields({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isTh = language === 'th';

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
            value={data.houseNo || ''}
            onChange={(e) => update({ houseNo: e.target.value })}
            placeholder={isTh ? 'เช่น 99/1' : 'e.g. 99/1'}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="village" className="text-xs text-muted-foreground">
            {isTh ? 'หมู่บ้าน' : 'Village / building'}
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
