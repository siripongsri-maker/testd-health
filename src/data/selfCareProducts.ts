/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import condoms from '@/assets/self-care-shop/condoms.jpg';
import lubricant from '@/assets/self-care-shop/lubricant.jpg';
import hivFinger from '@/assets/self-care-shop/hiv-finger.jpg';
import hivOral from '@/assets/self-care-shop/hiv-oral.jpg';
import syphilis from '@/assets/self-care-shop/syphilis.jpg';
import hivSyphilis from '@/assets/self-care-shop/hiv-syphilis.jpg';
import gonorrheaChlamydia from '@/assets/self-care-shop/gonorrhea-chlamydia.jpg';

export const SELF_CARE_PRODUCTS = [
  { id: 'condoms', image: condoms, titleTh: 'ถุงยางอนามัย', titleEn: 'Condoms', category: 'protection', link: 'https://s.shopee.co.th/3B8RRXBGJI' },
  { id: 'lubricant', image: lubricant, titleTh: 'เจลหล่อลื่น', titleEn: 'Personal lubricant', category: 'protection', link: 'https://s.shopee.co.th/80DhCS0iSH' },
  { id: 'hiv-finger', image: hivFinger, titleTh: 'ชุดตรวจ HIV แบบเจาะปลายนิ้ว', titleEn: 'Finger-prick HIV test', category: 'tests', link: 'https://s.shopee.co.th/6q1joOXJiR' },
  { id: 'hiv-oral', image: hivOral, titleTh: 'ชุดตรวจ HIV แบบใช้สารคัดน้ำในช่องปาก', titleEn: 'Oral fluid HIV test', category: 'tests', link: 'https://s.shopee.co.th/20wU3b6G7z' },
  { id: 'syphilis', image: syphilis, titleTh: 'ชุดตรวจซิฟิลิส', titleEn: 'Syphilis test', category: 'tests', link: 'https://s.shopee.co.th/8pmoC7Bm0r' },
  { id: 'hiv-syphilis', image: hivSyphilis, titleTh: 'ชุดตรวจ HIV และซิฟิลิสแบบคู่', titleEn: 'Dual HIV & syphilis test', category: 'tests', link: 'https://s.shopee.co.th/9zylaRQGJ9' },
  { id: 'gonorrhea-chlamydia', image: gonorrheaChlamydia, titleTh: 'ชุดตรวจหนองในและหนองในเทียม', titleEn: 'Gonorrhea & chlamydia test', category: 'tests', link: 'https://s.shopee.co.th/8AX7P2AoU5' },
] as const;