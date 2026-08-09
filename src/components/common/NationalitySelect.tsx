import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type NationalityValue =
  | "thai" | "myanmar" | "lao" | "cambodian" | "vietnamese" | "other" | "prefer_not_to_say";

export const NATIONALITY_OPTIONS: {
  value: NationalityValue;
  labelTh: string;
  labelEn: string;
  native?: string;
}[] = [
  { value: "thai", labelTh: "ไทย", labelEn: "Thai" },
  { value: "myanmar", labelTh: "พม่า", labelEn: "Myanmar", native: "မြန်မာ" },
  { value: "lao", labelTh: "ลาว", labelEn: "Lao", native: "ລາວ" },
  { value: "cambodian", labelTh: "กัมพูชา", labelEn: "Cambodian", native: "ខ្មែរ" },
  { value: "vietnamese", labelTh: "เวียดนาม", labelEn: "Vietnamese", native: "Việt" },
  { value: "other", labelTh: "อื่น ๆ", labelEn: "Other" },
  { value: "prefer_not_to_say", labelTh: "ไม่ประสงค์ระบุ", labelEn: "Prefer not to say" },
];

export const nationalityLabel = (value: string | null | undefined, language: string) => {
  if (!value) return language === "th" ? "ไม่ระบุ" : "Unspecified";
  const o = NATIONALITY_OPTIONS.find((x) => x.value === value);
  if (!o) return value;
  return language === "th" ? o.labelTh : o.labelEn;
};

interface Props {
  value: string;
  onChange: (v: string) => void;
  language?: string;
  id?: string;
  className?: string;
}

/**
 * Voluntary, consent-free nationality field.
 * Always optional, never blocks submission, and offers an explicit
 * "prefer not to say" option. Used for aggregate reach analysis only.
 */
export function NationalitySelect({ value, onChange, language = "th", id = "nationality", className }: Props) {
  const th = language === "th";
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {th ? "สัญชาติ (ไม่บังคับ)" : "Nationality (optional)"}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={th ? "ข้ามได้ / ไม่ต้องตอบก็ได้" : "You can skip this"} />
        </SelectTrigger>
        <SelectContent>
          {NATIONALITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {th ? o.labelTh : o.labelEn}{o.native ? ` · ${o.native}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {th
          ? "ใช้เพื่อดูภาพรวมการเข้าถึงบริการเท่านั้น ไม่มีผลต่อสิทธิ์รับบริการ และไม่ต้องแสดงเอกสารใด ๆ"
          : "Used only for aggregate reach analysis. It never affects your eligibility and no documents are required."}
      </p>
    </div>
  );
}
