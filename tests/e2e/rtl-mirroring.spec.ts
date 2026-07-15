/**
 * E2E: RTL layout mirroring
 *
 * Verifies that selecting an RTL language (ar / he / ur / fa) flips
 * <html dir="rtl"> across the site and that the RTL CSS overrides in
 * src/index.css actually mirror common Tailwind directional utilities.
 *
 * Uses zustand-persist storage key 'testd-language' to preselect the
 * language before the app boots — avoiding the translator network burst
 * a real click would trigger.
 *
 * Run with: bunx playwright test tests/e2e/rtl-mirroring.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

// Routes that should exercise a variety of layout primitives (header,
// bottom nav, cards, buttons, forms).
const ROUTES = ['/', '/auth', '/settings', '/harm-reduction', '/info'];

const RTL_LANGS = ['ar', 'he', 'ur', 'fa'] as const;
type RtlLang = (typeof RTL_LANGS)[number];

async function preselectLanguage(page: Page, lang: string) {
  // Set zustand-persist entry before any app JS runs.
  await page.addInitScript((l) => {
    try {
      localStorage.setItem(
        'testd-language',
        JSON.stringify({ state: { language: l }, version: 0 }),
      );
    } catch {
      /* ignore */
    }
  }, lang);
}

async function waitForDir(page: Page, dir: 'rtl' | 'ltr') {
  await expect
    .poll(async () => page.locator('html').getAttribute('dir'), { timeout: 10_000 })
    .toBe(dir);
}

test.describe('RTL mirroring — <html dir> and lang', () => {
  for (const lang of RTL_LANGS) {
    test(`sets dir="rtl" and lang="${lang}" on <html> for every key route`, async ({ page }) => {
      await preselectLanguage(page, lang);
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
        await waitForDir(page, 'rtl');
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
      }
    });
  }

  test('stays dir="ltr" for English on every key route', async ({ page }) => {
    await preselectLanguage(page, 'en');
    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await waitForDir(page, 'ltr');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    }
  });
});

test.describe('RTL mirroring — computed styles reflect direction', () => {
  test('body inherits rtl direction and text-align flips on .text-left', async ({ page }) => {
    await preselectLanguage(page, 'ar');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitForDir(page, 'rtl');

    // Body direction must be rtl (inherited from <html dir="rtl">).
    const bodyDir = await page.evaluate(() =>
      getComputedStyle(document.body).direction,
    );
    expect(bodyDir).toBe('rtl');

    // Inject a probe with .text-left — RTL rules should flip it to right.
    const alignment = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'text-left';
      probe.textContent = 'probe';
      document.body.appendChild(probe);
      const v = getComputedStyle(probe).textAlign;
      probe.remove();
      return v;
    });
    expect(alignment).toBe('right');
  });

  test('.flex-row reverses under RTL and margin utilities mirror', async ({ page }) => {
    await preselectLanguage(page, 'he');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitForDir(page, 'rtl');

    const result = await page.evaluate(() => {
      const row = document.createElement('div');
      row.className = 'flex flex-row';
      const child = document.createElement('span');
      child.className = 'ml-4';
      child.textContent = 'x';
      row.appendChild(child);
      document.body.appendChild(row);
      const rowStyle = getComputedStyle(row);
      const childStyle = getComputedStyle(child);
      const out = {
        flexDirection: rowStyle.flexDirection,
        marginLeft: childStyle.marginLeft,
        marginRight: childStyle.marginRight,
      };
      row.remove();
      return out;
    });

    expect(result.flexDirection).toBe('row-reverse');
    // ml-4 (1rem = 16px) should become inline-end → margin-right in RTL.
    expect(result.marginLeft).toBe('0px');
    expect(result.marginRight).toBe('16px');
  });

  test('LTR baseline is unchanged (no accidental mirroring for English)', async ({ page }) => {
    await preselectLanguage(page, 'en');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitForDir(page, 'ltr');

    const result = await page.evaluate(() => {
      const row = document.createElement('div');
      row.className = 'flex flex-row';
      const child = document.createElement('span');
      child.className = 'ml-4 text-left';
      child.textContent = 'x';
      row.appendChild(child);
      document.body.appendChild(row);
      const rowStyle = getComputedStyle(row);
      const childStyle = getComputedStyle(child);
      const out = {
        flexDirection: rowStyle.flexDirection,
        marginLeft: childStyle.marginLeft,
        marginRight: childStyle.marginRight,
        textAlign: childStyle.textAlign,
      };
      row.remove();
      return out;
    });

    expect(result.flexDirection).toBe('row');
    expect(result.marginLeft).toBe('16px');
    expect(result.marginRight).toBe('0px');
    expect(result.textAlign).toBe('left');
  });
});

test.describe('RTL mirroring — switching languages at runtime', () => {
  test('toggling from Arabic back to English restores dir="ltr"', async ({ page }) => {
    await preselectLanguage(page, 'ar');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await waitForDir(page, 'rtl');

    // Flip the persisted language and reload — mirrors what LanguageToggle does.
    await page.evaluate(() => {
      localStorage.setItem(
        'testd-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 }),
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForDir(page, 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
