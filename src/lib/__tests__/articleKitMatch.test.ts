/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { describe, it, expect } from 'vitest';
import { kitProductsForArticle } from '../articleKitMatch';

describe('article kit products', () => {
  it('HIV article shows only the 5 test kits', () => {
    const items = kitProductsForArticle('ตรวจเอชไอวีด้วยตัวเอง', 'เนื้อหา');
    expect(items.map((i) => i.id)).toEqual(['hiv-finger', 'hiv-oral', 'syphilis', 'hiv-syphilis', 'gonorrhea-chlamydia']);
  });
  it('drug-use article shows nothing', () => {
    expect(kitProductsForArticle('Chemsex and HIV', '')).toEqual([]);
  });
  it('article already containing Shopee links is not duplicated', () => {
    expect(kitProductsForArticle('syphilis kit', 'see https://s.shopee.co.th/8pmoC7Bm0r')).toEqual([]);
  });
});
