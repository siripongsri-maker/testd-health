/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { describe, expect, it } from 'vitest';
import { SELF_CARE_PRODUCTS } from '../../data/selfCareProducts';

describe('user-supplied Shopee destinations', () => {
  it.each([
    ['condoms', 'https://s.shopee.co.th/3B8RRXBGJI'],
    ['lubricant', 'https://s.shopee.co.th/80DhCS0iSH'],
    ['hiv-finger', 'https://s.shopee.co.th/6q1joOXJiR'],
    ['hiv-oral', 'https://s.shopee.co.th/20wU3b6G7z'],
    ['syphilis', 'https://s.shopee.co.th/8pmoC7Bm0r'],
    ['hiv-syphilis', 'https://s.shopee.co.th/9zylaRQGJ9'],
    ['gonorrhea-chlamydia', 'https://s.shopee.co.th/8AX7P2AoU5'],
  ])('%s retains its exact referral link', (id, link) => {
    expect(SELF_CARE_PRODUCTS.find((product) => product.id === id)?.link).toBe(link);
  });
});