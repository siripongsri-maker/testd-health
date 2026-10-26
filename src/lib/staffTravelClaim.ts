/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { z } from 'zod';

const common = {
  evaluation_id: z.string().uuid('กรุณาเลือกแบบประเมิน'),
  account_holder_name: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ถือบัญชี').max(120, 'ชื่อยาวเกิน 120 ตัวอักษร'),
  reason: z.string().trim().min(5, 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร').max(500, 'เหตุผลยาวเกิน 500 ตัวอักษร'),
};
export const staffTravelClaimSchema = z.discriminatedUnion('payout_method', [
  z.object({ ...common, payout_method: z.literal('bank'), bank_name: z.string().trim().min(1, 'กรุณากรอกธนาคาร').max(80), bank_account_no: z.string().regex(/^\d{8,20}$/, 'เลขบัญชีต้องเป็นตัวเลข 8–20 หลัก') }),
  z.object({ ...common, payout_method: z.literal('promptpay'), promptpay_no: z.string().regex(/^(\d{10}|\d{13})$/, 'พร้อมเพย์ต้องเป็นตัวเลข 10 หรือ 13 หลัก') }),
]);

export interface TravelClaimCandidate {
  evaluation_id: string;
  submitted_at: string | null;
  counseling_completed_at: string | null;
  branch_name: string | null;
  referral_code: string | null;
  appointment_date: string | null;
  arrived_at: string | null;
  checked_out_at: string | null;
  phone_last4: string;
  eligibility: string;
}
export const travelClaimEligibility: Record<string, string> = {
  ready: 'พร้อมกรอกคำขอ', already_claimed: 'มีคำขอแล้ว', evaluation_incomplete: 'ยังส่งแบบประเมินไม่ครบ',
  visit_unverified: 'ยังไม่ยืนยันรับบริการ', phone_missing: 'ไม่มีเบอร์จองที่ใช้ได้', phone_claimed: 'เบอร์นี้ขอรับเงินแล้ว',
};
export function travelClaimError(code: string | undefined) {
  const messages: Record<string, string> = {
    '42501': 'คุณไม่มีสิทธิ์กรอกคำขอของสาขานี้', P0002: 'แบบประเมินนี้มีคำขอแล้ว กรุณารีเฟรช',
    P0003: 'ต้องส่งแบบประเมินหลังคำปรึกษาก่อน', P0004: 'กรุณาตรวจข้อมูลบัญชีและเหตุผล',
    P0005: 'จำนวนคำขอครบโควตาแล้ว', P0006: 'ยังไม่ยืนยันรับบริการ หรือไม่มีเบอร์จองที่ใช้ได้',
    P0007: 'เบอร์จองนี้มีคำขอรับเงินแล้ว', '23505': 'มีคำขอซ้ำ กรุณารีเฟรช',
  };
  return messages[code ?? ''] ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
}