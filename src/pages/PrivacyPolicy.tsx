import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n';
import { Shield, Database, Lock, Users, Mail, Clock, Scale } from 'lucide-react';

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  const th = language === 'th';

  const sections = [
    {
      icon: Database,
      titleTh: 'ข้อมูลที่เราเก็บรวบรวม',
      titleEn: 'Data We Collect',
      contentTh: 'เราเก็บรวบรวมข้อมูลพื้นฐานที่จำเป็นสำหรับการให้บริการ ได้แก่ อีเมล ชื่อเล่น และข้อมูลการใช้งานแพลตฟอร์ม สำหรับบริการตรวจ HIV ด้วยตนเอง เราต้องการข้อมูลเพิ่มเติมเช่น ชื่อ ที่อยู่ และหมายเลขบัตรประชาชนเพื่อยืนยันสิทธิ์ สปสช.',
      contentEn: 'We collect basic information necessary for service delivery: email, display name, and platform usage data. For HIV self-test services, we require additional data such as name, address, and national ID for NHSO eligibility verification.',
    },
    {
      icon: Lock,
      titleTh: 'การคุ้มครองข้อมูล',
      titleEn: 'Data Protection',
      contentTh: 'ข้อมูลส่วนบุคคลที่ละเอียดอ่อนถูกแยกจากข้อมูลบริการ ข้อมูลถูกเข้ารหัสทั้งขณะส่งและจัดเก็บ การเข้าถึงข้อมูลที่ละเอียดอ่อนถูกจำกัดเฉพาะเจ้าหน้าที่ที่ได้รับอนุญาตและบันทึกทุกครั้ง',
      contentEn: 'Sensitive personal data is separated from service data. Data is encrypted in transit and at rest. Access to sensitive data is restricted to authorized staff and logged every time.',
    },
    {
      icon: Users,
      titleTh: 'การแบ่งปันข้อมูล',
      titleEn: 'Data Sharing',
      contentTh: 'เราไม่ขายหรือแบ่งปันข้อมูลส่วนบุคคลของคุณกับบุคคลที่สาม ยกเว้นตามที่กฎหมายกำหนด หรือเพื่อการรายงาน สปสช. ตามที่คุณยินยอม',
      contentEn: 'We do not sell or share your personal data with third parties, except as required by law or for NHSO reporting as consented by you.',
    },
    {
      icon: Scale,
      titleTh: 'สิทธิ์ของคุณ',
      titleEn: 'Your Rights',
      contentTh: 'ภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) คุณมีสิทธิ์: เข้าถึงข้อมูลของคุณ, แก้ไขข้อมูลที่ไม่ถูกต้อง, ขอลบข้อมูล, ถอนความยินยอม, ขอสำเนาข้อมูล, และคัดค้านการประมวลผล',
      contentEn: 'Under Thailand PDPA, you have the right to: access your data, correct inaccurate data, request deletion, withdraw consent, request a data copy, and object to processing.',
    },
    {
      icon: Clock,
      titleTh: 'ระยะเวลาเก็บรักษาข้อมูล',
      titleEn: 'Data Retention',
      contentTh: 'เราเก็บรักษาข้อมูลเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่กำหนด ข้อมูลที่ไม่จำเป็นจะถูกลบหรือทำให้ไม่ระบุตัวตนตามนโยบายการเก็บรักษา',
      contentEn: 'We retain data only as long as necessary for its stated purpose. Unnecessary data is deleted or anonymized according to our retention policy.',
    },
    {
      icon: Mail,
      titleTh: 'ติดต่อเรา',
      titleEn: 'Contact Us',
      contentTh: 'หากมีคำถามเกี่ยวกับความเป็นส่วนตัว กรุณาติดต่อ SWING Foundation ผ่านช่องทางในแอป หรือที่คลินิก',
      contentEn: 'For privacy questions, please contact SWING Foundation through the in-app channels or at any clinic branch.',
    },
  ];

  return (
    <PageContainer>
      <PageHeader title={th ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'} />

      <div className="space-y-4 pb-24">
        <Card className="p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div>
              <h2 className="font-bold text-foreground">
                {th ? 'นโยบายคุ้มครองข้อมูลส่วนบุคคล testD' : 'testD Privacy Protection Policy'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {th ? 'อัปเดตล่าสุด: มีนาคม 2569' : 'Last updated: March 2026'}
              </p>
            </div>
          </div>
        </Card>

        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {th ? section.titleTh : section.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {th ? section.contentTh : section.contentEn}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
