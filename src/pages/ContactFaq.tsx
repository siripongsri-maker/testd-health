/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, MessageCircle, PhoneCall, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SEOHead, buildFaqJsonLd } from '@/components/seo/SEOHead';
import { openSupportChat } from '@/lib/openSupportChat';
import { usePageLocale } from '@/components/seo/LocaleRouter';
import { ContactAssistant } from '@/components/ContactAssistant';

interface FaqEntry {
  question: { th: string; en: string };
  answer: { th: string; en: string };
  article?: { slug: string; label: { th: string; en: string } };
}

const FAQS: FaqEntry[] = [
  {
    question: { th: 'ตรวจ HIV กี่วันจึงจะชัด?', en: 'How many days after exposure does an HIV test become accurate?' },
    answer: {
      th: 'แต่ละชนิดการตรวจมี "ระยะเว้นพบเชื้อ" ต่างกัน ชุดตรวจแบบแอนติบอดี้ที่ใช้ที่บ้านมักชัดขึ้นหลังผ่านไปราว 3 เดือนหลังมีเพศสัมพันธ์ที่เสี่ยง ถ้าอยากตรวจเร็วกว่านั้น คลินิกมีวิธีตรวจที่ไวกว่า อ่านรายละเอียดได้จากบทความที่ลิงก์ด้านล่าง',
      en: 'Each test type has its own "window period". At-home antibody kits usually become clearer around 3 months after a possible exposure. If you want an earlier answer, clinics offer faster tests. See the linked article for details.',
    },
    article: { slug: 'hiv-test-window-period-how-many-days', label: { th: 'ตรวจ HIV กี่วันจึงชัวร์', en: 'HIV test window period' } },
  },
  {
    question: { th: 'ขีดจาง ๆ บนชุดตรวจ HIV คืออะไร ต้องทำอย่างไร?', en: 'What does a faint line on an HIV self-test mean?' },
    answer: {
      th: 'ขีดจาง ๆ ใด ๆ ที่ปรากฏในช่วงเวลาที่คำแนะนำกำหนด ให้ถือว่าเป็นผล "มีปฏิกิริยา" และควรตรวจยืนยันที่คลินิก ไม่ใช่ตัดสินจากความจางหนาของขีด อ่านขั้นตอนที่ควรทำต่อได้ในบทความ',
      en: 'Any line that appears within the instructed reading window counts as "reactive" and should be confirmed at a clinic, regardless of how faint it looks. The linked article walks through what to do next.',
    },
    article: { slug: 'hiv-self-test-faint-line-what-to-do', label: { th: 'ขึ้นขีดจาง ๆ แล้วทำอย่างไร', en: 'Faint line — what to do' } },
  },
  {
    question: { th: 'ผลตรวจขึ้นสองขีด ต้องทำอย่างไรต่อ?', en: 'My result shows two lines — what next?' },
    answer: {
      th: 'ผลที่มีปฏิกิริยาจากชุดตรวจที่บ้านยังไม่ใช่การวินิจฉัย ให้นัดตรวจยืนยันที่คลินิกโดยเร็ว และในระหว่างนี้หากมีความเสี่ยงใหม่เกิดขึ้นภายใน 72 ชั่วโมง สามารถพิจารณา PEP ได้',
      en: 'A reactive home-test result is not a diagnosis. Book a confirmatory clinic test soon. If a new risk occurred within the last 72 hours, PEP may still be an option.',
    },
    article: { slug: 'reactive-hiv-self-test-next-steps', label: { th: 'ผลมีปฏิกิริยา แล้วทำอย่างไร', en: 'Reactive result next steps' } },
  },
  {
    question: { th: 'ชุดตรวจ HIV แม่นยำแค่ไหน?', en: 'How accurate are HIV self-test kits?' },
    answer: {
      th: 'ชุดตรวจที่ใช้ถูกวิธีและตรวจหลังผ่านระยะเว้นพบเชื้อมีความแม่นยำสูง แต่ผลใด ๆ ที่มีปฏิกิริยาต้องยืนยันที่คลินิกเสมอ และการใช้ชุดตรวจผิดวิธีหรือตรวจเร็วเกินไปอาจให้ผลไม่ตรง',
      en: 'When used correctly and after the window period, self-tests are highly accurate. Still, any reactive result must be confirmed at a clinic, and wrong use or testing too early can give a misleading result.',
    },
    article: { slug: 'hiv-self-test-accuracy', label: { th: 'ความแม่นยำของชุดตรวจ', en: 'Self-test accuracy' } },
  },
  {
    question: { th: 'ควรเลือกชุดตรวจแบบน้ำลายหรือแบบเจาะปลายนิ้ว?', en: 'Should I choose an oral-fluid or finger-prick kit?' },
    answer: {
      th: 'ทั้งสองแบบมีจุดต่างกันเรื่องความสะดวกและช่วงเวลาที่ชัด อ่านเปรียบเทียบก่อนเลือกซื้อได้ในบทความ',
      en: 'Both have trade-offs in convenience and how early they turn clear. Compare them before buying in the linked guide.',
    },
    article: { slug: 'oral-fluid-vs-finger-prick-buying-guide', label: { th: 'เปรียบเทียบน้ำลาย vs ปลายนิ้ว', en: 'Oral fluid vs finger prick guide' } },
  },
  {
    question: { th: 'ชุดตรวจเก็บอย่างไร หมดอายุแล้วใช้ได้ไหม?', en: 'How should test kits be stored, and can expired kits be used?' },
    answer: {
      th: 'เก็บตามที่กล่องกำหนด หลีกเลี่ยงความร้อนจัดและแสงแดด ชุดที่หมดอายุหรือซองบุบไม่ควรใช้เพราะผลอาจไม่เชื่อถือได้',
      en: 'Store kits as the box instructs, away from heat and direct sunlight. Do not use expired kits or kits with damaged pouches, because results may not be trustworthy.',
    },
    article: { slug: 'kit-expiry-and-storage-buying', label: { th: 'วันหมดอายุและการเก็บรักษา', en: 'Expiry and storage' } },
  },
  {
    question: { th: 'ผลขึ้นว่าไม่สามารถตรวจสอบได้ (invalid) ต้องทำอย่างไร?', en: 'My result is invalid — what now?' },
    answer: {
      th: 'ผลไม่สมบูรณ์มักเกิดจากการใช้ตัวอย่างน้อยไปหรืออ่านผลนอกช่วงเวลา ให้ใช้ชุดใหม่ตรวจซ้ำ ไม่ใช่ตีความจากแถบที่เห็น',
      en: 'Invalid results usually mean too little sample or reading outside the time window. Retest with a new kit instead of interpreting the strips you see.',
    },
    article: { slug: 'invalid-result-replacement-kit', label: { th: 'ผล invalid และชุดทดแทน', en: 'Invalid results and replacement kits' } },
  },
  {
    question: { th: 'ชุดตรวจ HIV รวมซิฟิลิส กับแยกตรวจ ควรเลือกแบบไหน?', en: 'Dual HIV + syphilis kit or separate kits — which one?' },
    answer: {
      th: 'ขึ้นกับความเสี่ยงและงบของคุณ ชุดคู่ช่วยให้ตรวจซิฟิลิสพร้อมกันได้ อ่านข้อดีข้อเสียก่อนตัดสินใจได้ในบทความ',
      en: 'It depends on your risks and budget. Dual kits cover syphilis at the same time. Read the pros and cons before deciding.',
    },
    article: { slug: 'dual-hiv-syphilis-vs-separate-kits', label: { th: 'ชุดคู่ vs แยกตรวจ', en: 'Dual vs separate kits' } },
  },
  {
    question: { th: 'ตรวจหนองใน/หนองในเทียม ต้องเก็บตัวอย่างจากตรงไหน?', en: 'Where do I collect samples for gonorrhea/chlamydia testing?' },
    answer: {
      th: 'ตำแหน่งที่เก็บตัวอย่างสำคัญมาก ถ้าเก็บผิดตำแหน่งผลอาจเป็นลบทั้งที่มีเชื้อ อ่านคำแนะนำตามพฤติกรรมของคุณในบทความ',
      en: 'Sample site matters a lot — the wrong site can miss an infection. Read the guidance matched to your practices in the article.',
    },
    article: { slug: 'gonorrhea-chlamydia-kit-sample-site', label: { th: 'ตำแหน่งเก็บตัวอย่าง', en: 'Sample sites' } },
  },
  {
    question: { th: 'ชุดตรวจ HIV และซิฟิลิส ครอบคลุมโรคอื่นไหม?', en: 'Do HIV and syphilis kits cover other STIs?' },
    answer: {
      th: 'ไม่ครอบคลุม ชุดตรวจไม่ตรวจหนองใน หนองในเทียม เริม หูด หรือเอชพีวี ถ้ามีอาการหรือเสี่ยง ควรตรวจแบบเต็มที่คลินิก',
      en: 'No. These kits do not detect gonorrhea, chlamydia, herpes, warts or HPV. If you have symptoms or risks, get a full panel at a clinic.',
    },
    article: { slug: 'hiv-syphilis-do-not-cover-all-stis', label: { th: 'ข้อจำกัดของชุดตรวจ', en: 'What kits do not cover' } },
  },
  {
    question: { th: 'ทำไมต้องตรวจซ้ำทุก 3 เดือน?', en: 'Why test again every 3 months?' },
    answer: {
      th: 'การตรวจครั้งเดียวไม่ปิดความเสี่ยงที่เกิดขึ้นหลังจากนั้น คนที่มีเพศสัมพันธ์เป็นระยะแนะนำให้ตรวจตามรอบ รวมถึงตรวจโรคอื่นด้วย',
      en: 'One test only covers risks up to that day. If you are sexually active, repeat testing on a schedule is recommended, including other STIs.',
    },
    article: { slug: 'hiv-retest-every-3-months-who', label: { th: 'ตรวจซ้ำทุก 3 เดือน', en: 'Retesting every 3 months' } },
  },
  {
    question: { th: 'ขอชุดตรวจฟรีได้ที่ไหน?', en: 'Where can I get a free HIV test kit?' },
    answer: {
      th: 'SWING Clinic มีบริการชุดตรวจ HIV ฟรีตามเงื่อนไข และมีหน้าขอชุดตรวจในเว็บไซต์นี้ เปรียบเทียบการขอฟรีกับการซื้อเองได้ในบทความ',
      en: 'SWING Clinic offers free HIV test kits under eligibility criteria, and you can request one on this site. Compare free kits with buying your own in the article.',
    },
    article: { slug: 'free-hiv-kit-vs-online-purchase', label: { th: 'ขอฟรี vs ซื้อเอง', en: 'Free kit vs buying online' } },
  },
  {
    question: { th: 'PrEP ฟรีได้จริงไหม? คุณสมบัติอย่างไร?', en: 'Is PrEP really free? Who qualifies?' },
    answer: {
      th: 'ในระบบสิทธิการรักษาของไทยและโครงการของ SWING มีช่องทางรับ PrEP โดยไม่ต้องจ่ายหรือจ่ายน้อย อ่านเงื่อนไขและวิธีเริ่มได้ในบทความ',
      en: 'Thai health coverage and SWING programmes offer PrEP at no or low cost. Read the eligibility and how to start in the article.',
    },
    article: { slug: 'free-prep-thailand-swing-eligibility', label: { th: 'PrEP ฟรีในไทย', en: 'Free PrEP in Thailand' } },
  },
  {
    question: { th: 'ใช้ชุดตรวจเสร็จแล้วทิ้งอย่างไรให้ปลอดภัย?', en: 'How do I dispose of a used kit safely?' },
    answer: {
      th: 'ห่อซับน้ำและเชื้อโรคอยู่ในของเสียจากร่างกาย ควรใส่ถุงทึบแสงก่อนทิ้งในถังขยะทั่วไปตามที่คำแนะนำของชุดตรวจ อ่านรายละเอียดในบทความ',
      en: 'Used lancets and materials carry body fluids. Seal them in an opaque bag before discarding, as the kit instructs. Details are in the article.',
    },
    article: { slug: 'safe-disposal-before-buying-kit', label: { th: 'การทิ้งชุดตรวจอย่างปลอดภัย', en: 'Safe kit disposal' } },
  },
];

const CONTACT_LINE_LABEL = { th: 'แชท LINE กับทีมงาน', en: 'Chat with the team on LINE' };

export default function ContactFaq() {
  const locale = usePageLocale();
  const th = locale !== 'en';
  const title = th ? 'ติดต่อและคำถามทั่วไป' : 'Contact & general questions';
  const description = th
    ? 'คำตอบเรื่องการตรวจ HIV และ STI การใช้ชุดตรวจที่บ้าน พร้อมช่องทางติดต่อทีมงาน SWING'
    : 'Answers about HIV and STI testing and using home test kits, plus how to reach the SWING team.';

  const faqJsonLd = buildFaqJsonLd(
    FAQS.map((f) => ({ question: f.question[locale], answer: f.answer[locale] }))
  );

  return (
    <PageContainer>
      <SEOHead
        title={`${title} | testD`}
        description={description}
        canonicalPath="/contact"
        lang={locale}
        jsonLd={faqJsonLd}
        robots="index, follow"
      />
      <PageHeader
        title={title}
        subtitle={th ? 'ตอบคำถามเรื่องการตรวจและชุดตรวจ พร้อมช่องทางติดต่อทีมงาน' : 'Answers about testing and test kits, plus ways to reach the team'}
        backTo={th ? '/th/info' : '/en/info'}
      />

      <main className="space-y-7 pb-24">
        {/* Contact channels */}
        <section className="space-y-3 border-b border-border pb-6" aria-label={th ? 'ช่องทางติดต่อ' : 'Contact channels'}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {th
              ? 'คำตอบด้านล่างเป็นข้อมูลทั่วไปเพื่อการรู้เท่าทัน ไม่ใช่คำแนะนำเฉพาะบุคคล ถ้าต้องการคำปรึกษาหรือพูดคุยกับเจ้าหน้าที่ ติดต่อได้ทางช่องทางข้างล่าง ทุกช่องทางใช้ได้โดยไม่ต้องใช้ชื่อจริง'
              : 'The answers below are general information, not personal advice. To talk with a counselor or staff member, use any channel below — none of them require your real name.'}
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => openSupportChat()}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {CONTACT_LINE_LABEL[th ? 'th' : 'en']}
            </Button>
            <Button asChild variant="outline">
              <a href="tel:+6626329501">
                <PhoneCall className="mr-2 h-4 w-4" />
                {th ? 'โทร SWING Clinic ' : 'Call SWING Clinic '}+66 2 632 9501
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to={th ? '/th/clinic/book' : '/en/clinic/book'}>
                <BookOpen className="mr-2 h-4 w-4" />
                {th ? 'นัดเวลาที่คลินิก' : 'Book a clinic visit'}
              </Link>
            </Button>
          </div>
        </section>

        <ContactAssistant th={th} />

        {/* FAQ */}
        <section className="space-y-3" aria-label={th ? 'คำถามทั่วไปเรื่องการตรวจและชุดตรวจ' : 'General questions about testing and kits'}>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            {th ? 'คำถามทั่วไปเรื่องการตรวจและชุดตรวจ' : 'General questions about testing and kits'}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {f.question[locale]}
                </AccordionTrigger>
                <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="leading-relaxed">{f.answer[locale]}</p>
                  {f.article && (
                    <Link
                      to={`/${locale}/info/article/${f.article.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      {th ? 'อ่านบทความ: ' : 'Read the article: '}
                      {f.article.label[locale]}
                    </Link>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* More resources + safety note */}
        <section className="space-y-2 border-t border-border pt-5">
          <h2 className="font-semibold text-foreground">{th ? 'หัวข้ออื่นที่อาจช่วยได้' : 'Other topics that may help'}</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              <Link to={th ? '/th/info/faq' : '/en/info/faq'} className="text-primary hover:underline">
                {th ? 'คำถามที่พบบ่อยจากบทความทั้งหมด' : 'FAQ from all articles'}
              </Link>
            </li>
            <li>
              <Link to={th ? '/th/hiv-selftest' : '/en/hiv-selftest'} className="text-primary hover:underline">
                {th ? 'ขอชุดตรวจ HIV ฟรี' : 'Request a free HIV test kit'}
              </Link>
            </li>
            <li>
              <Link to={th ? '/th/support-faq' : '/en/support-faq'} className="text-primary hover:underline">
                {th ? 'ช่วยเหลือเรื่องการใช้เว็บไซต์' : 'Help with using this website'}
              </Link>
            </li>
          </ul>
        </section>

        <section className="space-y-2 border-t border-border pt-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
            {th ? 'กรณีฉุกเฉิน' : 'In an emergency'}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {th
              ? 'หน้านี้ไม่ใช่ช่องทางฉุกเฉิน หากคุณหรือคนใกล้ตัวมีอาการฉุกเฉิน หรือมีโอกาสเสี่ยงติดเชื้อ HIV ภายใน 72 ชั่วโมงที่ผ่านมา ให้รีบไปพบแพทย์ทันที หรือโทรสายด่วน 1669'
              : 'This page is not an emergency channel. If you or someone near you has an emergency, or there may have been an HIV exposure within the last 72 hours, seek medical care right away, or call the Thai emergency hotline 1669.'}
          </p>
        </section>
      </main>
    </PageContainer>
  );
}
