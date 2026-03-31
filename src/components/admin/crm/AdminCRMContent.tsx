
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Users } from "lucide-react";
import ClientListTable from "./ClientListTable";
import ClientTimeline from "./ClientTimeline";

export default function AdminCRMContent() {
  const { language } = useLanguage();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {!selectedClientId && (
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              {language === "th" ? "ระบบจัดการผู้รับบริการ" : "Client CRM"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === "th"
                ? "ดูประวัติ ติดตาม และบันทึกข้อมูลผู้รับบริการ"
                : "View history, track follow-ups, and manage client records"}
            </p>
          </div>
        </div>
      )}

      {selectedClientId ? (
        <ClientTimeline clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />
      ) : (
        <ClientListTable onSelectClient={setSelectedClientId} />
      )}
    </div>
  );
}
