## Root cause

The `/th/hiv-selftest` page shows "พร้อมส่งผลแล้วใช่ไหม?" again after a successful submission because the code has **two entry points that set `activeRequest` without checking result evidence**:

1. **Magic link resolver** (`src/pages/HIVSelfTest.tsx` lines 205–243)
   - Calls `selftest-magic-resolve`, then unconditionally does `setActiveRequest({... result_photo_url: null, test_result: null ...})` and `setCurrentStep('photo-result')`. It ignores `result_submitted_at`, `result_photo_url`, `test_result`, and post-submit statuses. Even a fully submitted request re-enters the Lean flow.
   - The edge function returns whatever row it finds, so the client must guard.

2. **`fetchRequests` / step-from-status effect** (lines 322–344, 402–429)
   - `fetchRequests` filters correctly by evidence, but `SelfTestRequest` type is missing `result_submitted_at`, and the effect at line 322 falls back to `activeRequest.status` for other paths. Combined with the magic-link path stuffing a non-fetched row, the "hard guard" doesn't fire.

3. **Post-submit local state** — `onDone` clears `activeRequest`, but the `?token=...` still sits in the URL, and any remount (React StrictMode, focus, HMR, PWA reload) re-runs the magic-link effect and re-enters the flow. There is no "already submitted" branch in the resolver.

4. **`hasSubmittedResult` logic is duplicated** in three places with slightly different sets of statuses, making it easy to miss a case.

## Fix scope

Frontend-only, HIV self-test flow. No schema changes. No unrelated UI.

## Plan

### 1. Single source-of-truth helper — `src/lib/selftestStatus.ts` (new)

```ts
export const SUBMITTED_STATUSES = new Set([
  'result_submitted','submitted','reviewed','result_reviewed',
  'followed_up','completed','closed','cancelled',
  'positive','negative','reactive','non_reactive','invalid',
]);

export const ACTIVE_PRE_RESULT_STATUSES = new Set([
  'pending','requested','approved','confirmed','shipped','delivered','received',
]);

export function hasSubmittedSelfTestResult(r: any): boolean {
  if (!r) return false;
  return (
    SUBMITTED_STATUSES.has(String(r.status ?? '').toLowerCase()) ||
    !!r.result_submitted_at ||
    !!r.result_photo_url ||
    !!r.result_image_url ||
    !!r.test_result ||
    !!r.self_reported_result
  );
}

export function isActiveUnsubmittedSelfTestRequest(r: any): boolean {
  if (!r) return false;
  if (hasSubmittedSelfTestResult(r)) return false;
  return ACTIVE_PRE_RESULT_STATUSES.has(String(r.status ?? '').toLowerCase());
}
```

Dev-only `console.debug('[selftest]', reqId, {status, has_result_ts, has_photo, has_test_result, decided})` inside the helper when `import.meta.env.DEV`.

### 2. Fix magic-link resolver (`HIVSelfTest.tsx` ~205–243)

- Request more fields from `selftest-magic-resolve` (best-effort — if the edge function doesn't return them, immediately re-fetch the row from `hiv_selftest_requests` by id via the anon/authenticated client using the id returned).
- After resolving, run `hasSubmittedSelfTestResult(row)`:
  - If **true**: do NOT set `activeRequest`; set `currentStep = 'intro'`; clear `hiv-selftest-timer`; dispatch `selftest:pending-refresh`; toast "ผลตรวจนี้ถูกส่งแล้ว"; strip `?token=` from the URL via `navigate('/th/hiv-selftest', { replace: true })` so a refresh cannot re-trigger.
  - If **false**: proceed as today.

Also patch the edge function `supabase/functions/selftest-magic-resolve/index.ts` to include `result_submitted_at, result_photo_url, test_result, self_reported_result` in its response payload so the guard has authoritative data. No schema change.

### 3. Fix `fetchRequests` (`HIVSelfTest.tsx` ~402–430)

- Select `self_reported_result` in addition to existing fields.
- Replace inline logic with `isActiveUnsubmittedSelfTestRequest`.
- On every fetch: if the currently-held `activeRequest` no longer satisfies `isActiveUnsubmittedSelfTestRequest` (or is missing from `data`), `setActiveRequest(null)` and, if `currentStep` is one of `confirm-receipt | video | testing | timer | photo-result`, force `setCurrentStep('intro')` and clear the timer key.

### 4. Fix step-from-status effect (`HIVSelfTest.tsx` ~322–344)

- Replace the inline `hasSubmittedResult` calculation with the shared helper.
- If submitted: `setActiveRequest(null)` (not just early-return) + `setCurrentStep('intro')` + clear timer + dispatch `selftest:pending-refresh`.

### 5. Render-time hard guard (`HIVSelfTest.tsx` ~2012)

Before the `LeanResultSubmissionFlow` block, add:

```tsx
{(currentStep === 'confirm-receipt' || ... || currentStep === 'photo-result') &&
 activeRequest &&
 !hasSubmittedSelfTestResult(activeRequest) && ( ... )}
```

If the guard blocks render, run a one-shot cleanup effect: `setActiveRequest(null); setCurrentStep('intro')`.

### 6. Post-submit cleanup — `onDone` handler (~2025–2040)

Currently: `setActiveRequest(null)` → `setCurrentStep('intro')` → clear timer → `fetchRequests()`.

Add:
- Strip `?token=` and `?action=submit` from URL: `navigate(location.pathname, { replace: true })`.
- Clear extra keys: `localStorage.removeItem('hiv-selftest-timer')`; also clear any `sessionStorage` entries starting with `selftest:`.
- Set a local ref `justSubmittedRef.current = true` so the magic-link `useEffect` guard exits early on this same mount if it re-fires.

### 7. Defensive fetch filter in `usePendingSelftestResult`

Update the query to also `.is('result_photo_url', null).is('test_result', null)`, and post-filter with `isActiveUnsubmittedSelfTestRequest`. Prevents stale rows where `status='delivered'` but a result was already submitted from ever surfacing the banner.

### 8. Stale-state audit — no other restore points found

- `localStorage`: only `hiv-selftest-timer` (cleared).
- `sessionStorage`: none used for self-test step.
- No React Query / SWR cache for self-test requests.
- No URL-param step restoration other than `?token` and `?action=submit` (both handled above).
- Home banner uses `usePendingSelftestResult` (fixed in step 7).
- `IntroStep`/`TownHub` don't restore step state.

### 9. Verification

- `bun run build` must pass.
- Manual repro via Playwright: seed a row with `status='delivered'` + `result_submitted_at=now()` + `result_photo_url='x'`, navigate to `/th/hiv-selftest?token=<magic>`, confirm the Lean "พร้อมส่งผลแล้ว" card does NOT render and user lands on intro.
- Refresh the page → still intro (no loop).
- A user with a truly-pending row still sees the submit flow.
- Requesting a new kit after a submitted result works.

## Files touched

- `src/lib/selftestStatus.ts` (new)
- `src/pages/HIVSelfTest.tsx` (magic-link resolver, fetchRequests, step effect, render guard, onDone)
- `src/hooks/usePendingSelftestResult.ts` (defensive filter)
- `supabase/functions/selftest-magic-resolve/index.ts` (return result evidence fields; no schema change)

No changes to database schema, unrelated UI, or other features.