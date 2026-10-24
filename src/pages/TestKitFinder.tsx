/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Gift } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { BottomNav } from '@/components/BottomNav';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { usePageLocale } from '@/components/seo/LocaleRouter';
import { SELF_CARE_PRODUCTS } from '@/data/selfCareProducts';

type Test = 'hiv' | 'syphilis' | 'gc-ct';
type Sample = 'blood' | 'oral' | 'urine-swab';
type Price = 'free' | 'paid';
type Kit = { id: string; tests: Test[]; sample: Sample; price: Price; th: string; en: string; noteTh: string; noteEn: string; image?: string; link: string; internal?: boolean };

const img = (id: string) => SELF_CARE_PRODUCTS.find((p) => p.id === id);
const shop = (id: string) => ({ image: img(id)?.image, link: img(id)?.link ?? '' });

export const TEST_KITS: Kit[] = [
  { id: 'swing-free', tests: ['hiv'], sample: 'oral', price: 'free', th: 'ชุดตรวจ HIV ฟรีจาก SWING', en: 'Free HIV self-test from SWING', noteTh: 'ขอรับฟรี ส่งทั่วไทย', noteEn: 'Request free, delivered in Thailand', link: '/hiv-selftest', internal: true },
  { id: 'hiv-finger', tests: ['hiv'], sample: 'blood', price: 'paid', th: 'ชุดตรวจ HIV แบบเจาะปลายนิ้ว', en: 'Finger-prick HIV test', noteTh: 'ใช้เลือดจากปลายนิ้ว ตรวจพบได้เร็วกว่าแบบน้ำลาย', noteEn: 'Blood drop; detects earlier than oral', ...shop('hiv-finger') },
  { id: 'hiv-oral', tests: ['hiv'], sample: 'oral', price: 'paid', th: 'ชุดตรวจ HIV แบบน้ำลายในช่องปาก', en: 'Oral fluid HIV test', noteTh: 'ป้ายเหงือก ไม่ต้องเจาะเลือด', noteEn: 'Gum swab, no needle', ...shop('hiv-oral') },
  { id: 'syphilis', tests: ['syphilis'], sample: 'blood', price: 'paid', th: 'ชุดตรวจซิฟิลิส', en: 'Syphilis test', noteTh: 'ผู้ที่เคยเป็นซิฟิลิสควรตรวจที่คลินิก', noteEn: 'If you had syphilis before, test at a clinic', ...shop('syphilis') },
  { id: 'hiv-syphilis', tests: ['hiv', 'syphilis'], sample: 'blood', price: 'paid', th: 'ชุดตรวจ HIV และซิฟิลิสแบบคู่', en: 'Dual HIV & syphilis test', noteTh: 'เจาะครั้งเดียว ได้ 2 ผล', noteEn: 'One prick, two results', ...shop('hiv-syphilis') },
  { id: 'gonorrhea-chlamydia', tests: ['gc-ct'], sample: 'urine-swab', price: 'paid', th: 'ชุดตรวจหนองในและหนองในเทียม', en: 'Gonorrhea & chlamydia test', noteTh: 'ตรวจวิธีเก็บตัวอย่างในคู่มือ อาจไม่ครอบคลุมคอ/ทวารหนัก', noteEn: 'Check sample type in the manual; may miss throat/rectal sites', ...shop('gonorrhea-chlamydia') },
];

export function filterKits(kits: Kit[], test: Test | 'all', sample: Sample | 'all', price: Price | 'all') {
  return kits.filter((k) => (test === 'all' || k.tests.includes(test)) && (sample === 'all' || k.sample === sample) && (price === 'all' || k.price === price));
}

function Chips<T extends string>({ label, value, set, opts }: { label: string; value: T; set: (v: T) => void; opts: [T, string][] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opts.map(([v, l]) => (
          <Button key={v} size="sm" variant={value === v ? 'default' : 'outline'} aria-pressed={value === v} onClick={() => set(v)}>{l}</Button>
        ))}
      </div>
    </fieldset>
  );
}

export default function TestKitFinder() {
  const locale = usePageLocale();
  const th = locale !== 'en';
  const [test, setTest] = useState<Test | 'all'>('all');
  const [sample, setSample] = useState<Sample | 'all'>('all');
  const [price, setPrice] = useState<Price | 'all'>('all');
  const list = useMemo(() => filterKits(TEST_KITS, test, sample, price), [test, sample, price]);
  const all = th ? 'ทั้งหมด' : 'All';

  return (
    <>
      <SEOHead
        title={th ? 'ค้นหาชุดตรวจ HIV และ STI ด้วยตนเอง | testD' : 'Find an HIV & STI Self-Test Kit | testD'}
        description={th ? 'เลือกชุดตรวจ HIV ซิฟิลิส หนองใน ตามแบบตรวจ วิธีเก็บตัวอย่าง และราคา พร้อมชุดตรวจ HIV ฟรีจาก SWING' : 'Filter HIV, syphilis and gonorrhea/chlamydia self-test kits by test, sample type and price, including free HIV kits from SWING.'}
        canonicalPath="/test-kits"
        lang={locale}
      />
      <PageContainer>
        <PageHeader title={th ? 'ค้นหาชุดตรวจ HIV และ STI' : 'Find an HIV & STI test kit'} subtitle={th ? 'เลือกแบบตรวจ วิธีเก็บตัวอย่าง และราคา' : 'Choose test, sample type and price'} />
        <nav aria-label="Language" className="mb-4 flex justify-end gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/th/test-kits" hrefLang="th" lang="th">ไทย</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/en/test-kits" hrefLang="en" lang="en">English</Link></Button>
        </nav>
        <div className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-4">
          <Chips label={th ? 'แบบตรวจ' : 'Test'} value={test} set={setTest} opts={[['all', all], ['hiv', 'HIV'], ['syphilis', th ? 'ซิฟิลิส' : 'Syphilis'], ['gc-ct', th ? 'หนองใน/หนองในเทียม' : 'Gonorrhea/chlamydia']]} />
          <Chips label={th ? 'วิธีเก็บตัวอย่าง' : 'Sample'} value={sample} set={setSample} opts={[['all', all], ['blood', th ? 'เลือดปลายนิ้ว' : 'Finger-prick blood'], ['oral', th ? 'น้ำลาย/ป้ายเหงือก' : 'Oral fluid'], ['urine-swab', th ? 'ปัสสาวะ/สวอบ' : 'Urine/swab']]} />
          <Chips label={th ? 'ราคา' : 'Price'} value={price} set={setPrice} opts={[['all', all], ['free', th ? 'ฟรี' : 'Free'], ['paid', th ? 'ซื้อใน Shopee' : 'Buy on Shopee']]} />
        </div>
        <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">{th ? `พบ ${list.length} รายการ` : `${list.length} kits found`}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((k) => (
            <li key={k.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
              {k.image ? <img src={k.image} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Gift className="h-8 w-8 text-primary" aria-hidden="true" /></div>}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="font-semibold text-foreground">{th ? k.th : k.en}</h2>
                <p className="text-xs text-muted-foreground">{th ? k.noteTh : k.noteEn}</p>
                <p className="text-sm font-medium text-foreground">{k.price === 'free' ? (th ? 'ฟรี' : 'Free') : (th ? 'ดูราคาล่าสุดใน Shopee' : 'See current price on Shopee')}</p>
                {k.internal ? (
                  <Button asChild size="sm" className="mt-auto self-start"><Link to={`/${locale}${k.link}`}>{th ? 'ขอรับฟรี' : 'Request free'}</Link></Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="mt-auto self-start">
                    <a href={k.link} target="_blank" rel="sponsored noopener noreferrer">{th ? 'ดูใน Shopee' : 'View on Shopee'} <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" /></a>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {list.length === 0 && <p className="text-sm text-muted-foreground">{th ? 'ไม่พบชุดตรวจที่ตรงเงื่อนไข ลองเปลี่ยนตัวเลือก' : 'No kit matches. Try other options.'}</p>}
        <p className="mt-6 text-xs text-muted-foreground">
          {th ? 'ลิงก์ Shopee เป็นลิงก์โฆษณา ภาพเป็นภาพประกอบ ตรวจเลขทะเบียน อย. ก่อนซื้อ ชุดตรวจใช้คัดกรอง หากผลมีปฏิกิริยาให้ตรวจยืนยันที่คลินิก เสี่ยงไม่เกิน 72 ชม. ให้ไปรับ PEP ทันที' : 'Shopee links are sponsored; images are illustrations. Check the Thai FDA number before buying. Kits are screening only — confirm reactive results at a clinic. Exposure within 72 hours: get PEP now.'}
        </p>
      </PageContainer>
      <BottomNav />
    </>
  );
}
