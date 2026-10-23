/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { Link } from 'react-router-dom';
import { EyeOff, FileText, Globe, LockKeyhole, MessageCircle, Shield, UserRound } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { useLanguage } from '@/lib/i18n';

export default function SecurityPrivacy() {
  const { language } = useLanguage();
  const th = language !== 'en';
  const locale = th ? 'th' : 'en';
  const title = th ? 'ความปลอดภัยและความเป็นส่วนตัว' : 'Security and privacy';
  const description = th
    ? 'การดูแลข้อมูลของคุณบน testD สิทธิ์ความเป็นส่วนตัว และช่องทางติดต่อ SWING Foundation'
    : 'How testD handles your information, your privacy rights, and how to contact SWING Foundation.';
  const safeguards = [
    {
      icon: Globe,
      title: th ? 'เชื่อมต่อผ่าน HTTPS' : 'HTTPS connections',
      body: th
        ? 'เว็บไซต์ testd.website ใช้ HTTPS เพื่อเข้ารหัสข้อมูลระหว่างเบราว์เซอร์กับเว็บไซต์ ช่วยลดความเสี่ยงจากการดักอ่านระหว่างส่ง แต่ไม่ได้รับประกันความปลอดภัยของอุปกรณ์ที่คุณใช้'
        : 'testd.website uses HTTPS to encrypt information between your browser and the website. This reduces interception risks in transit, but does not guarantee the security of your device.',
    },
    {
      icon: UserRound,
      title: th ? 'ข้อมูลเท่าที่บริการต้องใช้' : 'Information needed for each service',
      body: th
        ? 'คุณอ่านบทความได้โดยไม่ต้องสมัครบัญชี และบางบริการรองรับผู้ใช้ที่ยังไม่เข้าสู่ระบบ การนัดหมายหรือจัดส่งชุดตรวจอาจต้องใช้ข้อมูลติดต่อ ที่อยู่ หรือข้อมูลยืนยันสิทธิ์ตามบริการนั้น การไม่เข้าสู่ระบบไม่ได้หมายความว่าไม่มีการเก็บข้อมูล'
        : 'You can read articles without an account, and some services support guests. Appointments or kit delivery may require contact details, an address, or eligibility information. Using a service without signing in does not mean no information is collected.',
    },
    {
      icon: EyeOff,
      title: th ? 'จำกัดการเห็นข้อมูลส่วนบุคคล' : 'Restricted visibility of personal information',
      body: th
        ? 'หน้าจอสำหรับเจ้าหน้าที่มีการปิดบังข้อมูลส่วนบุคคลในช่องที่รองรับ และใช้สิทธิ์การเข้าถึงตามหน้าที่ เพื่อลดการเห็นข้อมูลที่ไม่จำเป็น รายละเอียดขึ้นอยู่กับประเภทข้อมูลและบริการ'
        : 'Staff screens mask personal information in supported fields and use role-based access to reduce unnecessary exposure. Details depend on the information and service involved.',
    },
    {
      icon: LockKeyhole,
      title: th ? 'ความยินยอมและสิทธิ์ของคุณ' : 'Consent and your rights',
      body: th
        ? 'บางบริการขอความยินยอมก่อนใช้ข้อมูลที่เกี่ยวข้อง คุณดูประวัติความยินยอมได้ในศูนย์ความเป็นส่วนตัว และติดต่อทีมงานเพื่อขอเข้าถึง แก้ไข ลบข้อมูล หรือถอนความยินยอม การดำเนินการเป็นไปตามเงื่อนไขและฐานกฎหมายที่เกี่ยวข้อง'
        : 'Some services request consent before using relevant information. You can view consent history in the Privacy Center and contact the team to request access, correction, deletion, or withdrawal of consent, subject to applicable conditions and legal grounds.',
    },
  ];

  return (
    <PageContainer>
      <SEOHead title={`${title} | testD`} description={description} canonicalPath="/security-privacy" lang={locale} robots="index, follow" />
      <PageHeader title={title} backTo={`/${locale}/privacy-policy`} />
      <main className="space-y-7 pb-24">
        <section className="space-y-3 border-b border-border pb-6">
          <Shield className="h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-foreground">{th ? 'testD ดูแลข้อมูลของคุณอย่างไร' : 'How testD handles your information'}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </section>

        <section className="divide-y divide-border" aria-label={th ? 'การคุ้มครองข้อมูล' : 'Data safeguards'}>
          {safeguards.map(({ icon: Icon, title: heading, body }) => (
            <div key={heading} className="flex items-start gap-3 py-5 first:pt-0">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 space-y-2">
                <h2 className="font-semibold text-foreground">{heading}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-2 border-t border-border pt-5">
          <h2 className="font-semibold text-foreground">{th ? 'คุกกี้และบริการภายนอก' : 'Cookies and third-party services'}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{th
            ? 'เว็บไซต์ใช้ข้อมูลการใช้งานเพื่อปรับปรุงบริการ บางหน้าความรู้อาจโหลด Google AdSense ซึ่งอาจใช้คุกกี้และตัวระบุทางเทคนิค อ่านรายละเอียดและตัวเลือกการตั้งค่าได้ในนโยบายความเป็นส่วนตัว'
            : 'The website uses usage information to improve services. Some educational pages may load Google AdSense, which may use cookies and technical identifiers. See the Privacy Policy for details and settings.'}</p>
        </section>

        <section className="space-y-2 border-t border-border pt-5">
          <h2 className="font-semibold text-foreground">{th ? 'ข้อจำกัดที่ควรทราบ' : 'Important limitations'}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{th
            ? 'ไม่มีระบบออนไลน์ใดรับประกันความปลอดภัยได้ทั้งหมด หน้านี้เป็นคำอธิบายมาตรการ ไม่ใช่ใบรับรองความปลอดภัย ผลตรวจสอบเปลี่ยนแปลงได้ตามเวลา และไม่ได้ยืนยันว่าไม่มีช่องโหว่ หากใช้อุปกรณ์ร่วมกับผู้อื่น ควรออกจากระบบหลังใช้งานและไม่เปิดเผยรหัสผ่านหรือลิงก์ส่วนตัว'
            : 'No online system can guarantee complete security. This page explains safeguards; it is not a security certification. Findings can change over time and do not establish the absence of vulnerabilities. On shared devices, sign out after use and do not share passwords or private links.'}</p>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="font-semibold text-foreground">{th ? 'สอบถามเรื่องข้อมูลหรือแจ้งข้อกังวล' : 'Privacy questions or security concerns'}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{th
            ? 'ติดต่อ SWING Foundation ผ่านช่องทางช่วยเหลือในแอป หากพบสิ่งผิดปกติ แจ้งหน้าที่เกิดปัญหาและสิ่งที่พบ โดยไม่ส่งรหัสผ่าน รหัสยืนยัน หรือข้อมูลสุขภาพของผู้อื่น'
            : 'Contact SWING Foundation through in-app support. If something seems wrong, share the affected page and what you observed, without sending passwords, verification codes, or another person’s health information.'}</p>
          <div className="flex flex-col gap-2">
            <Button asChild><Link to="/support-chat"><MessageCircle className="mr-2 h-4 w-4" />{th ? 'ติดต่อทีมงาน' : 'Contact the team'}</Link></Button>
            <Button asChild variant="outline"><Link to={`/${locale}/privacy-policy`}><FileText className="mr-2 h-4 w-4" />{th ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}</Link></Button>
            <Button asChild variant="outline"><Link to="/privacy-center"><Shield className="mr-2 h-4 w-4" />{th ? 'ศูนย์ความเป็นส่วนตัว' : 'Privacy Center'}</Link></Button>
          </div>
        </section>
      </main>
    </PageContainer>
  );
}