/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { ExternalLink } from 'lucide-react';
import { kitProductsForArticle } from '@/lib/articleKitMatch';

export function ArticleKitShop({ text, content, isThai }: { text: string; content: string | null | undefined; isThai: boolean }) {
  const items = kitProductsForArticle(text, content);
  if (!items.length) return null;
  return (
    <section aria-label={isThai ? 'ชุดตรวจแนะนำ' : 'Recommended test kits'} className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{isThai ? 'โฆษณา · ลิงก์แนะนำสินค้า' : 'Sponsored · Affiliate links'}</p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">{isThai ? 'ชุดตรวจ HIV และโรคติดต่อทางเพศสัมพันธ์' : 'HIV & STI test kits'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {isThai
          ? 'เราอาจได้รับค่าคอมมิชชันจาก Shopee ภาพเป็นภาพประกอบ ตรวจเลขทะเบียน อย. ก่อนซื้อ ผลบวกต้องตรวจยืนยันที่คลินิก หรือขอชุดตรวจ HIV ฟรีจาก SWING ได้'
          : 'We may earn a Shopee commission. Images are illustrations. Check Thai FDA registration before buying; reactive results need clinic confirmation. Free HIV kits are also available from SWING.'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((p) => (
          <a key={p.id} href={p.link} target="_blank" rel="sponsored noopener noreferrer" className="group flex min-h-11 flex-col overflow-hidden rounded-xl border border-border bg-background/40 transition-colors hover:border-primary">
            <img src={p.image} alt={isThai ? `ภาพประกอบ ${p.titleTh}` : `Illustration: ${p.titleEn}`} width={816} height={816} loading="lazy" className="aspect-square w-full object-contain" />
            <span className="flex flex-1 items-start justify-between gap-1 p-2 text-xs font-medium text-foreground">
              {isThai ? p.titleTh : p.titleEn}<ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
