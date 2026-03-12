import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Shield, Heart, AlertTriangle } from "lucide-react";

interface Props {
  onConfirm: (isAdult: boolean) => void;
}

export function AgeGate({ onConfirm }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            {isEn ? "Content Notice" : "แจ้งเตือนเนื้อหา"}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isEn
              ? "This section contains content about substance use, chemsex, harm reduction, and mental health, intended for users aged 18 and above."
              : "หัวข้อนี้มีเนื้อหาเกี่ยวกับการใช้สาร, chemsex, การลดอันตราย, และสุขภาพจิต ซึ่งเหมาะสำหรับผู้ใช้ที่มีอายุ 18 ปีขึ้นไป"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "Please select your age range before continuing."
              : "กรุณาเลือกช่วงอายุของคุณก่อนเข้าใช้งาน"}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => onConfirm(true)}
            className="w-full h-14 text-base rounded-2xl"
            size="lg"
          >
            {isEn ? "I am 18 or older" : "อายุ 18 ปีขึ้นไป"}
          </Button>
          <Button
            onClick={() => onConfirm(false)}
            variant="outline"
            className="w-full h-14 text-base rounded-2xl"
            size="lg"
          >
            {isEn ? "I am under 18" : "อายุต่ำกว่า 18 ปี"}
          </Button>
        </div>

        {/* Privacy note */}
        <p className="text-[11px] text-muted-foreground/60 text-center">
          {isEn
            ? "Your selection is stored locally only. No personal data is collected."
            : "ข้อมูลนี้จัดเก็บในเครื่องของคุณเท่านั้น ไม่มีการเก็บข้อมูลส่วนบุคคล"}
        </p>
      </div>
    </div>
  );
}
