/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { Shield, Database, Lock, Users, Mail, Clock, Scale, Cookie } from 'lucide-react';

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
      contentTh: 'เราไม่ขายข้อมูลส่วนบุคคลของคุณ การใช้ข้อมูลเพื่อให้บริการหรือรายงาน สปสช. เป็นไปตามฐานกฎหมายที่เกี่ยวข้องและความยินยอมเมื่อจำเป็น นอกจากนี้ หน้าบทความความรู้บางหน้าโหลดบริการโฆษณา Google AdSense ซึ่งอาจรวบรวมข้อมูลทางเทคนิคและข้อมูลการใช้งานตามรายละเอียดในหัวข้อคุกกี้และโฆษณาด้านล่าง',
      contentEn: 'We do not sell your personal data. Service delivery and NHSO reporting rely on applicable legal grounds and consent where required. Some educational article pages also load Google AdSense, which may collect technical and usage information as described in the cookies and advertising section below.',
    },
    {
      icon: Cookie,
      titleTh: 'คุกกี้และโฆษณา Google AdSense',
      titleEn: 'Cookies and Google AdSense Advertising',
      contentTh: 'หน้าบทความความรู้บางหน้าโหลด Google AdSense (ไม่แสดงในหน้าบริการ แบบฟอร์ม บัญชีผู้ใช้ หรือหลังบ้าน) ผู้ให้บริการภายนอก รวมถึง Google อาจใช้คุกกี้ เว็บบีคอน ที่อยู่ IP หรือตัวระบุอื่นเพื่อแสดงและวัดผลโฆษณา คุกกี้โฆษณาของ Google ช่วยให้ Google และพันธมิตรแสดงโฆษณาโดยอาศัยการเข้าชมเว็บไซต์นี้และเว็บไซต์อื่น ทั้งนี้ขึ้นอยู่กับการตั้งค่าและข้อกำหนดที่ใช้บังคับ คุณจัดการโฆษณาที่ปรับตามบุคคลได้ที่ My Ad Center และจัดการคุกกี้ในเบราว์เซอร์ การเปลี่ยนการตั้งค่าโฆษณาไม่ได้หมายความว่าจะหยุดการรวบรวมข้อมูลทั้งหมด',
      contentEn: 'Some educational article pages load Google AdSense (never service, form, account or admin screens). Third-party vendors, including Google, may use cookies, web beacons, IP addresses or other identifiers to serve and measure ads. Google advertising cookies enable Google and its partners to serve ads based on visits to this and other websites, subject to settings and applicable requirements. You can manage personalized ads in My Ad Center and manage cookies in your browser. Changing ad preferences does not stop all data collection.',
      links: [
        { href: 'https://policies.google.com/technologies/partner-sites', th: 'การใช้ข้อมูลโดย Google', en: 'How Google uses information' },
        { href: 'https://myadcenter.google.com/', th: 'จัดการโฆษณาใน My Ad Center', en: 'Manage ads in My Ad Center' },
        { href: 'https://www.aboutads.info/choices/', th: 'ตัวเลือกโฆษณาจากผู้ให้บริการอื่น', en: 'Other vendors’ advertising choices' },
      ],
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
                {th ? 'อัปเดตล่าสุด: 19 ตุลาคม 2569' : 'Last updated: 19 October 2026'}
              </p>
            </div>
          </div>
        </Card>

        <Button asChild variant="outline" className="h-auto w-full whitespace-normal py-3">
          <Link to={`/${th ? 'th' : 'en'}/security-privacy`}>
            <Shield className="mr-2 h-4 w-4 shrink-0" />
            {th ? 'ความปลอดภัยและความเป็นส่วนตัว' : 'Security and privacy'}
          </Link>
        </Button>

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
                  {section.links && (
                    <ul className="mt-3 space-y-2 text-sm">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                            {th ? link.th : link.en}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
