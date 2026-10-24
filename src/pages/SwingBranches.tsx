/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, PhoneCall, Star, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEOHead } from '@/components/seo/SEOHead';
import { usePageLocale } from '@/components/seo/LocaleRouter';
import { supabase } from '@/integrations/supabase/client';

interface Branch {
  slug: string;
  name_th: string;
  name_en: string;
  address_th: string | null;
  address_en: string | null;
  phone: string | null;
  open_days: number[] | null;
  open_time: string | null;
  close_time: string | null;
  google_maps_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  status: string | null;
  coming_soon_message_th: string | null;
  coming_soon_message_en: string | null;
}

const CLINIC_PHONE = '+66 2 632 9501';
const CLINIC_PHONE_TEL = '+6626329501';

const DAY_LABELS = {
  th: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

function formatDays(days: number[] | null, th: boolean): string {
  if (!days || days.length === 0) return th ? 'ติดต่อสอบถามวันเปิด' : 'Contact us for open days';
  const labels = th ? DAY_LABELS.th : DAY_LABELS.en;
  const sorted = [...days].sort((a, b) => a - b);
  // Consecutive run (e.g. Mon–Fri) renders as a range
  const isRun = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isRun && sorted.length > 2) {
    return `${labels[sorted[0]]}–${labels[sorted[sorted.length - 1]]}`;
  }
  return sorted.map((d) => labels[d]).join(', ');
}

function formatTime(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export default function SwingBranches() {
  const locale = usePageLocale();
  const th = locale !== 'en';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('booking_branches')
      .select(
        'slug, name_th, name_en, address_th, address_en, phone, open_days, open_time, close_time, google_maps_url, google_rating, google_review_count, status, coming_soon_message_th, coming_soon_message_en',
      )
      .eq('is_active', true)
      .then(({ data }) => {
        if (cancelled) return;
        setBranches((data as Branch[]) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const title = th ? 'สาขา SWING Clinic' : 'SWING Clinic branches';
  const description = th
    ? 'ที่อยู่ เวลาเปิด เบอร์โทร และช่องทางจองคิวของ SWING Clinic ทุกสาขา — สีลม สะพานควาย เพชรเกษม พัทยา และอุดมสุข'
    : 'Addresses, opening hours, phone numbers and booking links for every SWING Clinic branch — Silom, Saphankwai, Petchakasem, Pattaya and Udomsuk.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalClinic',
    name: 'SWING Clinic',
    telephone: CLINIC_PHONE,
    url: 'https://testd.website/th/clinics',
    department: branches.map((b) => ({
      '@type': 'MedicalClinic',
      name: `SWING Clinic ${b.name_en}`,
      address: b.address_en || b.address_th || undefined,
      telephone: b.phone || CLINIC_PHONE,
      openingHours:
        b.open_time && b.close_time
          ? `${formatTime(b.open_time)}-${formatTime(b.close_time)}`
          : undefined,
    })),
  };

  return (
    <PageContainer>
      <SEOHead
        title={`${title} | testD`}
        description={description}
        canonicalPath="/clinics"
        lang={locale}
        jsonLd={jsonLd}
        robots="index, follow"
      />
      <PageHeader
        title={title}
        subtitle={
          th
            ? 'เลือกสาขาที่สะดวก แล้วจองคิวตรวจหรือปรึกษาได้เลย'
            : 'Pick a convenient branch and book a test or consultation.'
        }
        backTo={th ? '/th' : '/en'}
      />

      <main className="space-y-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          branches.map((b) => {
            const name = th ? b.name_th : b.name_en;
            const address = th ? b.address_th || b.address_en : b.address_en || b.address_th;
            const comingMsg = th ? b.coming_soon_message_th : b.coming_soon_message_en;
            return (
              <Card key={b.slug} className="border-border/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground">
                      SWING Clinic {name}
                    </h2>
                    {b.google_rating != null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {b.google_rating}
                        {b.google_review_count != null && ` (${b.google_review_count})`}
                      </span>
                    )}
                  </div>

                  {comingMsg && (
                    <p className="text-xs rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2">
                      {comingMsg}
                    </p>
                  )}

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{address}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {formatDays(b.open_days, th)}
                        {b.open_time && b.close_time
                          ? ` · ${formatTime(b.open_time)}–${formatTime(b.close_time)}`
                          : ''}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 flex-shrink-0" />
                      <a href={`tel:${CLINIC_PHONE_TEL}`} className="underline underline-offset-2">
                        {b.phone || CLINIC_PHONE}
                      </a>
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button asChild className="flex-1">
                      <Link to={`/clinic/book?branch=${b.slug}`}>
                        <CalendarDays className="h-4 w-4 mr-1.5" />
                        {th ? 'จองคิวสาขานี้' : 'Book this branch'}
                      </Link>
                    </Button>
                    {b.google_maps_url && (
                      <Button asChild variant="outline">
                        <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer">
                          <MapPin className="h-4 w-4 mr-1.5" />
                          {th ? 'แผนที่' : 'Map'}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          {th
            ? 'เวลาเปิดอาจเปลี่ยนในวันหยุดนักขัตฤกษ์ โทรเช็กก่อนเดินทางได้ที่ ' + CLINIC_PHONE
            : 'Hours may change on public holidays — call ' + CLINIC_PHONE + ' before visiting.'}
        </p>
      </main>
    </PageContainer>
  );
}
