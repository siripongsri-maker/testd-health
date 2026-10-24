/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { ExternalLink, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SELF_CARE_PRODUCTS } from '@/data/selfCareProducts';

export function SelfCareShop({ language }: { language: string }) {
  const isThai = language === 'th';
  return (
    <section aria-labelledby="self-care-shop-title" className="mb-8">
      <div className="mb-4">
        <h2 id="self-care-shop-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ShoppingBag className="h-5 w-5 text-primary" />
          {isThai ? 'เลือกซื้อเพื่อดูแลตัวเอง' : 'Shop for self-care'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isThai ? 'ลิงก์แนะนำสินค้า: เราอาจได้รับค่าคอมมิชชันจากการซื้อผ่านลิงก์เหล่านี้ ตามเงื่อนไขของ Shopee' : 'Affiliate links: we may earn a commission on purchases through these links, subject to Shopee’s terms.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SELF_CARE_PRODUCTS.map((item) => (
          <Card key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl glass">
            <img src={item.image} alt={isThai ? `ภาพประกอบ ${item.titleTh}` : `Illustration: ${item.titleEn}`} width={816} height={816} loading="lazy" className="aspect-square w-full object-contain" />
            <div className="flex flex-1 flex-col p-3 sm:p-4">
              <p className="mb-1 text-xs text-muted-foreground">{item.category === 'protection' ? (isThai ? 'อุปกรณ์ดูแลตัวเอง' : 'Personal care') : (isThai ? 'ชุดตรวจคัดกรอง' : 'Screening tests')}</p>
              <h3 className="mb-4 break-words text-sm font-semibold leading-relaxed text-foreground">{isThai ? item.titleTh : item.titleEn}</h3>
              <Button asChild variant="outline" size="sm" className="mt-auto w-full gap-1 px-2 text-xs">
                <a href={item.link} target="_blank" rel="sponsored noopener noreferrer" aria-label={`${isThai ? 'ดูสินค้าใน Shopee:' : 'View on Shopee:'} ${isThai ? item.titleTh : item.titleEn}`}>
                  {isThai ? 'ดูใน Shopee' : 'View on Shopee'}<ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {isThai ? 'ภาพประกอบสร้างขึ้น ไม่ใช่ภาพสินค้าจริง โปรดตรวจรุ่น ราคา ผู้ขาย สถานะการอนุญาต และคำแนะนำของผลิตภัณฑ์ใน Shopee ก่อนซื้อ ชุดตรวจใช้เพื่อคัดกรอง ไม่ใช่การวินิจฉัย หากผลมีปฏิกิริยา มีอาการ หรือยังสงสัย ควรปรึกษาคลินิกเพื่อตรวจยืนยัน' : 'These are generated illustrations, not actual product photos. Check the model, price, seller, regulatory status and product instructions on Shopee before buying. Screening tests are not a diagnosis. If a result is reactive, you have symptoms or remain concerned, contact a clinic for confirmatory testing.'}
      </p>
    </section>
  );
}