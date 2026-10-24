/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import condoms from '@/assets/self-care-shop/condoms.jpg';
import lubricant from '@/assets/self-care-shop/lubricant.jpg';
import hivFinger from '@/assets/self-care-shop/hiv-finger.jpg';
import hivOral from '@/assets/self-care-shop/hiv-oral.jpg';
import syphilis from '@/assets/self-care-shop/syphilis.jpg';
import hivSyphilis from '@/assets/self-care-shop/hiv-syphilis.jpg';
import gonorrheaChlamydia from '@/assets/self-care-shop/gonorrhea-chlamydia.jpg';
import syringe29 from '@/assets/self-care-shop/syringe-29g.jpg';
import syringe27 from '@/assets/self-care-shop/syringe-27g.jpg';
import alcoholPads from '@/assets/self-care-shop/alcohol-pads.jpg';
import tourniquet from '@/assets/self-care-shop/tourniquet.jpg';
import zincArginine from '@/assets/self-care-shop/zinc-arginine.jpg';
import intimateWash from '@/assets/self-care-shop/intimate-wash.jpg';
import trimmer from '@/assets/self-care-shop/trimmer.jpg';

export const SELF_CARE_PRODUCTS = [
  { id: 'condoms', image: condoms, titleTh: 'ถุงยางอนามัย', titleEn: 'Condoms', category: 'protection', link: 'https://s.shopee.co.th/3B8RRXBGJI' },
  { id: 'lubricant', image: lubricant, titleTh: 'เจลหล่อลื่น', titleEn: 'Personal lubricant', category: 'protection', link: 'https://s.shopee.co.th/80DhCS0iSH' },
  { id: 'hiv-finger', image: hivFinger, titleTh: 'ชุดตรวจ HIV แบบเจาะปลายนิ้ว', titleEn: 'Finger-prick HIV test', category: 'tests', link: 'https://s.shopee.co.th/6q1joOXJiR' },
  { id: 'hiv-oral', image: hivOral, titleTh: 'ชุดตรวจ HIV แบบใช้สารคัดน้ำในช่องปาก', titleEn: 'Oral fluid HIV test', category: 'tests', link: 'https://s.shopee.co.th/20wU3b6G7z' },
  { id: 'syphilis', image: syphilis, titleTh: 'ชุดตรวจซิฟิลิส', titleEn: 'Syphilis test', category: 'tests', link: 'https://s.shopee.co.th/8pmoC7Bm0r' },
  { id: 'hiv-syphilis', image: hivSyphilis, titleTh: 'ชุดตรวจ HIV และซิฟิลิสแบบคู่', titleEn: 'Dual HIV & syphilis test', category: 'tests', link: 'https://s.shopee.co.th/9zylaRQGJ9' },
  { id: 'gonorrhea-chlamydia', image: gonorrheaChlamydia, titleTh: 'ชุดตรวจหนองในและหนองในเทียม', titleEn: 'Gonorrhea & chlamydia test', category: 'tests', link: 'https://s.shopee.co.th/8AX7P2AoU5' },
  { id: 'syringe-29g', image: syringe29, titleTh: 'เข็มฉีดยา เบอร์ 29', titleEn: 'Syringe 29G', category: 'supplies', link: 'https://s.shopee.co.th/60ScpfMGz8' },
  { id: 'syringe-27g', image: syringe27, titleTh: 'เข็มฉีดยา เบอร์ 27', titleEn: 'Syringe 27G', category: 'supplies', link: 'https://s.shopee.co.th/60Scpq3OR0' },
  { id: 'alcohol-pads', image: alcoholPads, titleTh: 'แผ่นแอลกอฮอล์', titleEn: 'Alcohol prep pads', category: 'supplies', link: 'https://s.shopee.co.th/3B8RSaszMg' },
  { id: 'tourniquet', image: tourniquet, titleTh: 'สายรัดห้ามเลือด', titleEn: 'Tourniquet', category: 'supplies', link: 'https://s.shopee.co.th/3qO8GMhb6e' },
  { id: 'zinc-arginine', image: zincArginine, titleTh: 'Zinc + L-Arginine', titleEn: 'Zinc + L-Arginine', category: 'wellness', link: 'https://s.shopee.co.th/8KqXcNsrLf' },
  { id: 'intimate-wash', image: intimateWash, titleTh: 'Bond Intimate Wash', titleEn: 'Bond Intimate Wash', category: 'wellness', link: 'https://s.shopee.co.th/5LCw2xSNq3' },
  { id: 'trimmer', image: trimmer, titleTh: 'Kai ที่ตัดขน', titleEn: 'Kai trimmer', category: 'wellness', link: 'https://s.shopee.co.th/BUptY1q11' },
] as const;