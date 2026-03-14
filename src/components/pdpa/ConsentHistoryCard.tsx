import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { ConsentRecord } from '@/hooks/useConsent';
import { format } from 'date-fns';

interface ConsentHistoryCardProps {
  records: ConsentRecord[];
}

const actionConfig: Record<string, { icon: typeof Check; color: string; labelTh: string; labelEn: string }> = {
  accepted: { icon: Check, color: 'text-success', labelTh: 'ยินยอม', labelEn: 'Accepted' },
  declined: { icon: X, color: 'text-destructive', labelTh: 'ปฏิเสธ', labelEn: 'Declined' },
  withdrawn: { icon: RotateCcw, color: 'text-warning', labelTh: 'ถอนความยินยอม', labelEn: 'Withdrawn' },
};

export function ConsentHistoryCard({ records }: ConsentHistoryCardProps) {
  const { language } = useLanguage();
  const th = language === 'th';

  if (!records.length) {
    return (
      <Card className="p-6 text-center">
        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {th ? 'ยังไม่มีประวัติการยินยอม' : 'No consent history yet'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record) => {
        const cfg = actionConfig[record.action] || actionConfig.accepted;
        const Icon = cfg.icon;
        const timestamp = record.granted_at || record.revoked_at || record.created_at;

        return (
          <Card key={record.id} className="p-3 flex items-center gap-3">
            <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {record.consent_type}
              </p>
              {timestamp && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(timestamp), 'dd MMM yyyy HH:mm')}
                </p>
              )}
            </div>
            <Badge variant={record.granted ? 'default' : 'secondary'} className="text-xs">
              {th ? cfg.labelTh : cfg.labelEn}
            </Badge>
          </Card>
        );
      })}
    </div>
  );
}
