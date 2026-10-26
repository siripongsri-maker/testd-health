/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { describe, expect, it } from 'vitest';
import { staffTravelClaimSchema } from '../staffTravelClaim';
const base = { evaluation_id: '00000000-0000-4000-8000-000000000001', account_holder_name: 'Test holder', reason: 'Staff-assisted request' };
describe('staff travel claim validation', () => {
  it('preserves account leading zeros', () => {
    const result = staffTravelClaimSchema.parse({ ...base, payout_method: 'bank', bank_name: 'Test bank', bank_account_no: '0012345678' });
    expect(result.payout_method === 'bank' && result.bank_account_no).toBe('0012345678');
  });
  it('rejects non-numeric bank input rather than silently removing characters', () => {
    expect(staffTravelClaimSchema.safeParse({ ...base, payout_method: 'bank', bank_name: 'Test', bank_account_no: '00123abc678' }).success).toBe(false);
  });
  it('accepts only 10 or 13 digit PromptPay identifiers', () => {
    for (const number of ['0000000000', '0000000000000']) expect(staffTravelClaimSchema.safeParse({ ...base, payout_method: 'promptpay', promptpay_no: number }).success).toBe(true);
    expect(staffTravelClaimSchema.safeParse({ ...base, payout_method: 'promptpay', promptpay_no: '00000000000' }).success).toBe(false);
  });
  it('requires an audited staff reason', () => {
    expect(staffTravelClaimSchema.safeParse({ ...base, reason: '', payout_method: 'bank', bank_name: 'Test', bank_account_no: '0012345678' }).success).toBe(false);
  });
});