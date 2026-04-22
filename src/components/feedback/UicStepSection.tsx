import { useLanguage } from "@/lib/i18n";
import { UicField } from "./UicField";
import { VisitStatusBanner } from "./VisitStatusBanner";
import { Fingerprint } from "lucide-react";
import type { FeedbackFormData } from "@/pages/ClientFeedbackForm";
import type { UicVisitStats } from "@/lib/clientSeed";

interface Props {
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
  onStatsLoaded?: (stats: UicVisitStats) => void;
  stats: UicVisitStats | null;
}

export function UicStepSection({ data, update, onStatsLoaded, stats }: Props) {
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
    </div>
  );
}
