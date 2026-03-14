import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useConsent } from '@/hooks/useConsent';
import { ConsentHistoryCard } from '@/components/pdpa/ConsentHistoryCard';
import { Shield, FileText, Download, Trash2, ArrowLeft } from 'lucide-react';

export default function PrivacyCenter() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { records, loading } = useConsent();
  const th = language === 'th';

  const rights = [
    {
      icon: FileText,
      titleTh: 'ขอเข้าถึงข้อมูล',
      titleEn: 'Access my data',
      descTh: 'ดูข้อมูลทั้งหมดที่เราเก็บเกี่ยวกับคุณ',
      descEn: 'View all data we hold about you',
    },
    {
      icon: Download,
      titleTh: 'ดาวน์โหลดข้อมูล',
      titleEn: 'Download my data',
      descTh: 'ส่งออกข้อมูลของคุณในรูปแบบที่อ่านได้',
      descEn: 'Export your data in a readable format',
    },
    {
      icon: Trash2,
      titleTh: 'ขอลบข้อมูล',
      titleEn: 'Delete my data',
      descTh: 'ขอให้ลบข้อมูลส่วนบุคคลของคุณ',
      descEn: 'Request deletion of your personal data',
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={th ? 'ศูนย์ความเป็นส่วนตัว' : 'Privacy Center'} />

      <div className="space-y-6 pb-24">
        {/* Privacy summary */}
        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground">
                {th ? 'สิทธิ์ความเป็นส่วนตัวของคุณ' : 'Your Privacy Rights'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {th
                  ? 'ภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณมีสิทธิ์ในการเข้าถึง แก้ไข ลบ และควบคุมข้อมูลส่วนบุคคลของคุณ'
                  : 'Under Thailand\'s Personal Data Protection Act (PDPA), you have the right to access, correct, delete, and control your personal data.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Data Rights */}
        <div>
          <h3 className="font-semibold mb-3">{th ? 'สิทธิ์เกี่ยวกับข้อมูล' : 'Data Rights'}</h3>
          <div className="space-y-2">
            {rights.map((right, i) => {
              const Icon = right.icon;
              return (
                <Card key={i} className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{th ? right.titleTh : right.titleEn}</p>
                    <p className="text-xs text-muted-foreground">{th ? right.descTh : right.descEn}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {th ? 'เร็วๆ นี้' : 'Coming soon'}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Consent History */}
        <div>
          <h3 className="font-semibold mb-3">{th ? 'ประวัติความยินยอม' : 'Consent History'}</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">{th ? 'กำลังโหลด...' : 'Loading...'}</p>
          ) : (
            <ConsentHistoryCard records={records} />
          )}
        </div>

        {/* Privacy Policy link */}
        <Card className="p-4">
          <Button variant="outline" className="w-full" onClick={() => navigate('/privacy-policy')}>
            <FileText className="h-4 w-4 mr-2" />
            {th ? 'นโยบายความเป็นส่วนตัวฉบับเต็ม' : 'Full Privacy Policy'}
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
