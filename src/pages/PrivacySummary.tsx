import { Link } from 'react-router-dom';
import { ArrowLeft, Database, MessageCircle, Phone, Shield, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

export default function PrivacySummary() {
  const { language } = useLanguage();
  const th = language === 'th';

  const items = [
    {
      icon: Database,
      title: th ? 'ระยะเวลาจัดเก็บ' : 'How long we keep data',
      body: th
        ? 'ข้อมูลการตั้งค่าการเชื่อมต่อแบบไม่ระบุตัวตนจะเก็บไว้เท่าที่จำเป็นเพื่อจดจำขั้นตอนและการตั้งค่าของคุณ ไม่มีการกำหนดระยะเวลาถาวร และจะลบเมื่อไม่จำเป็นต่อวัตถุประสงค์นี้แล้ว'
        : 'Anonymous connection settings are kept only as long as needed to remember your steps and preferences. They are not kept permanently and are removed when no longer needed for this purpose.',
    },
    {
      icon: Trash2,
      title: th ? 'วิธีลบข้อมูล' : 'How to delete your data',
      body: th
        ? 'ลบข้อมูลการตั้งค่าที่บันทึกไว้ได้ทันทีโดยเปิดหน้าเชื่อมต่อ แล้วกด “ล้างความคืบหน้า” หากต้องการให้ช่วยตรวจสอบหรือลบข้อมูลอื่น ให้ติดต่อทีมงานผ่านช่องทางด้านล่าง'
        : 'You can immediately remove saved connection settings by opening the Connect page and selecting “Clear progress”. To ask us to review or delete other data, contact the team using the channels below.',
    },
    {
      icon: MessageCircle,
      title: th ? 'ขอความช่วยเหลือ' : 'Need help?',
      body: th
        ? 'ติดต่อทีมงานผ่านศูนย์ช่วยเหลือในแอป หรือโทร SWING Clinic ที่ 02 632 9501 หากเป็นเหตุฉุกเฉิน โทร 1669'
        : 'Contact the team through in-app support, or call SWING Clinic at 02 632 9501. For emergencies, call 1669.',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={th ? 'ความเป็นส่วนตัวแบบย่อ' : 'Privacy Summary'}
        subtitle={th ? 'ข้อมูลสำหรับการเชื่อมต่อผู้ช่วย AI' : 'For AI assistant connections'}
        backTo="/connect"
      />

      <div className="space-y-4 pb-24">
        <Card className="border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground">
                {th ? 'คุณควบคุมข้อมูลของคุณได้' : 'You control your data'}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {th
                  ? 'หน้านี้สรุปข้อมูลที่เกี่ยวข้องกับการตั้งค่าการเชื่อมต่อแบบไม่ระบุตัวตน อ่านนโยบายฉบับเต็มเพื่อดูรายละเอียดเพิ่มเติม'
                  : 'This page summarizes data related to anonymous connection settings. Read the full policy for more details.'}
              </p>
            </div>
          </div>
        </Card>

        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </div>
            </Card>
          );
        })}

        <div className="grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline">
            <Link to="/connect">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {th ? 'กลับไปหน้าเชื่อมต่อ' : 'Back to Connect'}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/support-chat">
              <MessageCircle className="mr-2 h-4 w-4" />
              {th ? 'ติดต่อผ่านแอป' : 'Contact in app'}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a href="tel:+6626329501">
              <Phone className="mr-2 h-4 w-4" />
              {th ? 'โทร 02 632 9501' : 'Call 02 632 9501'}
            </a>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link className="underline underline-offset-4" to="/privacy-policy">
            {th ? 'อ่านนโยบายความเป็นส่วนตัวฉบับเต็ม' : 'Read the full Privacy Policy'}
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
