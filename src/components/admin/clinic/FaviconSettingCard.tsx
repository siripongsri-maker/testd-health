import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Image as ImageIcon, RefreshCw } from "lucide-react";
import {
  FAVICON_SOURCES,
  getFaviconChoice,
  setFaviconChoice,
  type FaviconChoice,
} from "@/lib/faviconSetting";

interface Props {
  isEn?: boolean;
}

export default function FaviconSettingCard({ isEn = false }: Props) {
  const [choice, setChoice] = useState<FaviconChoice>(() => getFaviconChoice());

  const handleChange = (value: string) => {
    const next = value as FaviconChoice;
    setChoice(next);
    setFaviconChoice(next);
    toast.success(
      isEn ? "Favicon updated" : "อัปเดตไอคอนเว็บไซต์แล้ว",
      {
        description: isEn
          ? "The browser tab icon now uses this logo."
          : "ไอคอนบนแท็บเบราว์เซอร์ใช้โลโก้นี้แล้ว",
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-4 w-4" />
          {isEn ? "Site favicon" : "ไอคอนเว็บไซต์ (Favicon)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isEn
            ? "Choose the brand mark shown on browser tabs. Each option is auto-cropped and padded into a square icon."
            : "เลือกโลโก้ที่จะแสดงบนแท็บเบราว์เซอร์ ระบบครอปและจัดให้เป็นสี่เหลี่ยมจัตุรัสให้อัตโนมัติ"}
        </p>
        <RadioGroup value={choice} onValueChange={handleChange} className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(FAVICON_SOURCES) as FaviconChoice[]).map((key) => {
            const opt = FAVICON_SOURCES[key];
            return (
              <Label
                key={key}
                htmlFor={`favicon-${key}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 data-[active=true]:border-primary"
                data-active={choice === key}
              >
                <RadioGroupItem value={key} id={`favicon-${key}`} />
                <img
                  src={opt.url}
                  alt={isEn ? `${opt.label} favicon preview` : `ตัวอย่างไอคอน ${opt.labelTh}`}
                  className="h-8 w-8 rounded border bg-background object-contain"
                  width={32}
                  height={32}
                />
                <span className="text-sm font-medium">{isEn ? opt.label : opt.labelTh}</span>
              </Label>
            );
          })}
        </RadioGroup>
        <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground" role="note">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p>
            {isEn
              ? "If the old icon still appears, hard refresh this page: Ctrl + Shift + R (Windows/Linux) or Cmd + Shift + R (Mac)."
              : "หากยังเห็นไอคอนเดิม ให้รีเฟรชแบบล้างแคช: กด Ctrl + Shift + R (Windows/Linux) หรือ Cmd + Shift + R (Mac)"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
