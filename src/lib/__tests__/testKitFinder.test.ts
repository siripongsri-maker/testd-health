/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { describe, it, expect } from 'vitest';
import { TEST_KITS, filterKits } from '@/pages/TestKitFinder';

describe('test kit finder', () => {
  it('has the 5 Shopee kits with links', () => {
    const paid = TEST_KITS.filter((k) => k.price === 'paid');
    expect(paid).toHaveLength(5);
    paid.forEach((k) => expect(k.link).toMatch(/^https:\/\/s\.shopee\.co\.th\//));
  });
  it('filters syphilis to syphilis and dual kits', () => {
    expect(filterKits(TEST_KITS, 'syphilis', 'all', 'all').map((k) => k.id).sort()).toEqual(['hiv-syphilis', 'syphilis']);
  });
  it('free filter shows only the SWING kit', () => {
    expect(filterKits(TEST_KITS, 'all', 'all', 'free').map((k) => k.id)).toEqual(['swing-free']);
  });
});
