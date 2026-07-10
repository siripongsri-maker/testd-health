/**
 * E2E: /th/hiv-selftest?action=submit
 *
 * Verifies the result-submission flow entered via the "Submit result"
 * deep link:
 *   1. Landing directly on the URL renders the result-picker form
 *      (badge "ขั้นตอน 2/2") without the readiness screen.
 *   2. All required fields are visible: 3 result options, Thai ID input,
 *      province select, PDPA consent, submit button.
 *   3. Guest visitors additionally see the contact-phone field.
 *   4. Filling every required field enables the submit button, and
 *      clicking it fires a request to the backend (guest RPC or
 *      hiv_selftest_requests update). We intercept the network call so
 *      the test never writes real data.
 *
 * Run: bunx playwright test tests/e2e/hiv-selftest-submit.spec.ts
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

// Thai national ID with a valid checksum (see src/lib/thaiId.ts).
// sum(d_i*(13-i)) for i=1..12 == 352, (11-352%11)%10 == 1 == d13.
const VALID_THAI_ID = '1234567890121';

test.describe('HIV self-test submit-result deep link', () => {
  test('/th/hiv-selftest?action=submit renders the full form and submits', async ({ page }) => {
    // Intercept every backend call the submit path might make so the test
    // never mutates real data. We answer with a minimal success payload.
    await page.route(/\/rest\/v1\/hiv_selftest_requests.*/i, async (route) => {
      const method = route.request().method();
      if (method === 'PATCH' || method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: JSON.stringify([
            {
              id: 'e2e-mock-id',
              status: 'result_submitted',
              result_submitted_at: new Date().toISOString(),
              result_photo_url: null,
              test_result: 'negative',
              self_reported_result: 'negative',
            },
          ]),
        });
        return;
      }
      // GET / OPTIONS fall through so the page can bootstrap normally.
      await route.continue();
    });
    await page.route(/\/rest\/v1\/rpc\/submit_guest_selftest_result.*/i, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ request_id: 'e2e-mock-guest-id' }),
      });
    });
    await page.route(/\/functions\/v1\/notify-reactive-case.*/i, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    );

    const submitCall = page.waitForRequest(
      (req) => {
        const url = req.url();
        return (
          req.method() !== 'OPTIONS' &&
          (/\/rest\/v1\/rpc\/submit_guest_selftest_result/.test(url) ||
            (/\/rest\/v1\/hiv_selftest_requests/.test(url) &&
              (req.method() === 'PATCH' || req.method() === 'POST')))
        );
      },
      { timeout: 15_000 },
    );

    await page.goto(`${BASE}/th/hiv-selftest?action=submit`, { waitUntil: 'domcontentloaded' });

    // 1. The result-picker card is rendered (skips the "ready?" screen).
    await expect(page.getByText('ขั้นตอน 2/2')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'ผลขึ้นกี่ขีด?' })).toBeVisible();

    // 2. All three result options are present.
    await expect(page.getByRole('button', { name: /1 ขีด/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /2 ขีด/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ไม่มีขีด/ })).toBeVisible();

    // 3. Required inputs: Thai ID, province, PDPA consent, submit CTA.
    const thaiIdInput = page.locator('#lean-thai-id');
    const provinceTrigger = page.locator('#lean-province');
    const pdpaCheckbox = page.locator('#lean-pdpa-consent');
    const submitBtn = page.getByRole('button', { name: 'ยืนยันส่งผล' });

    await expect(thaiIdInput).toBeVisible();
    await expect(provinceTrigger).toBeVisible();
    await expect(pdpaCheckbox).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // Guest visitors (no active session) also get the contact-phone field.
    const guestPhone = page.locator('#lean-guest-phone');
    const isGuest = (await guestPhone.count()) > 0;
    if (isGuest) {
      await expect(guestPhone).toBeVisible();
      await guestPhone.fill('0891234567');
    }

    // 4. Fill the form and submit.
    await page.getByRole('button', { name: /1 ขีด/ }).click();
    await thaiIdInput.fill(VALID_THAI_ID);

    await provinceTrigger.click();
    // Pick the first province from the dropdown.
    await page.getByRole('option').first().click();

    await pdpaCheckbox.click();

    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    const req = await submitCall;
    expect(req.url()).toMatch(/hiv_selftest_requests|submit_guest_selftest_result/);
  });
});
