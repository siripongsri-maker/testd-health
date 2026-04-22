import { useLanguage } from "@/lib/i18n";
import { UicField } from "./UicField";
import { VisitStatusBanner } from "./VisitStatusBanner";
import { Button } from "@/components/ui/button";
import { SkipForward, Fingerprint } from "lucide-react";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";
import type { UicVisitStats } from "@/lib/clientSeed";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
  onSkip: () => void;
  onStatsLoaded?: (stats: UicVisitStats) => void;
  stats: UicVisitStats | null;
}

export function UicStepSection({ data, update, onSkip, onStatsLoaded, stats }: Props) {
  const { language } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Fingerprint className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {language === 'th'
            ? 'รหัสประจำตัวผู้รับบริการ (UIC)'
            : 'Service User Identification Code (UIC)'}
        </h2>
        <p className="text-xs text-muted-foreground px-4">
          {language === 'th'
            ? 'สำหรับบริการลดอันตราย (Harm Reduction) และสุขภาพจิต (Mental Health) เราใช้ UIC เพื่อเชื่อมประวัติการรับบริการของคุณแบบไม่ระบุตัวตน'
            : 'For Harm Reduction and Mental Health services, we use UIC to anonymously link your service history.'}
        </p>
      </div>

      <UicField
        channel={data.channel}
        uic={data.uic}
        onUicChange={(v) => update({ uic: v })}
        onStatsLoaded={onStatsLoaded}
      />

      {stats && (
        <VisitStatusBanner uicStats={stats} uicValue={data.uic} />
      )}

      {/* Skip button */}
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          {language === 'th'
            ? 'ไม่สะดวกกรอก UIC ตอนนี้? ข้ามไปยังคำถามถัดไปได้เลย'
            : "Don't want to enter your UIC right now? You can skip ahead."}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onSkip}
          className="w-full"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          {language === 'th' ? 'ข้ามขั้นตอนนี้ (Skip)' : 'Skip this step'}
        </Button>
      </div>
    </div>
  );
}
