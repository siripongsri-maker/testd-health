/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { SELF_CARE_PRODUCTS } from '@/data/selfCareProducts';

const HIV_STI = /hiv|เอชไอวี|เอดส์|aids|sti\b|std\b|syphilis|ซิฟิลิส|gonorr|หนองใน|chlamydia|โรคติดต่อทางเพศ|sexually transmitted|prep|pep|เพร็พ|เป๊ป|self[- ]?test|ชุดตรวจ/i;
const BLOCKED = /chemsex|ghb|meth|ยาไอซ์|harm[- ]?reduction|substance|drug/i;

/** Test-kit products to show after an HIV/STI article; empty when off-topic or already linked in content. */
export function kitProductsForArticle(text: string, content: string | null | undefined) {
  if (!HIV_STI.test(text) || BLOCKED.test(text)) return [];
  if (content && /s\.shopee\.co\.th/.test(content)) return [];
  return SELF_CARE_PRODUCTS.filter((p) => p.category === 'tests');
}
