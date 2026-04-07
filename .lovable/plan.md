

# Smart CTA Prioritization

## Summary

Create a lightweight helper (`src/lib/ctaPriority.ts`) that reads signals from `sessionStorage`/`localStorage` to determine which CTA should be first, then use it in both `HeroSection` and `PrimaryActionCards` to reorder buttons dynamically.

## Signal Logic

| Signal | Detection | Priority |
|--------|-----------|----------|
| Came from `/virtual` | Check `document.referrer` or store a flag in `sessionStorage` when navigating from virtual story pages | **booking** first |
| Viewed info pages (`/learn`, `/harm-reduction`, `/prevention-match`, etc.) | Count info page views in `sessionStorage` | **selftest** first |
| Multiple visits, no action taken | Check `localStorage` visit counter + no `booking_started`/`selftest_started` events in `sessionStorage` | **support-chat** first |
| Default (new user) | No signals | Keep current order (selftest → booking → support) |

## Files

| Action | File | What |
|--------|------|------|
| Create | `src/lib/ctaPriority.ts` | Pure function: reads signals, returns ordered priority `['booking', 'selftest', 'support']` + a `recordPageSignal(path)` helper to stamp sessionStorage on navigation |
| Modify | `src/components/home/PrimaryActionCards.tsx` | Import priority, reorder `actions` array at render time based on returned priority |
| Modify | `src/components/home/HeroSection.tsx` | Swap primary/secondary button order based on priority (if booking is top → booking gets `variant="hero"`, selftest gets `variant="hero-outline"`, and vice versa) |
| Modify | `src/hooks/useAnalytics.ts` | In `useAnalytics` hook's `useEffect`, call `recordPageSignal(location.pathname)` to stamp info-page visits and increment visit counter |

## Implementation Details

**`ctaPriority.ts`**:
- `recordPageSignal(path)`: increments `localStorage` visit count; if path matches info pages, stamps `sessionStorage` flag; if path starts with `/virtual`, stamps virtual flag
- `getCtaPriority()`: returns `'booking' | 'selftest' | 'support'` based on: virtual flag → booking; info flag → selftest; visits ≥ 3 with no action flag → support; else default
- `markActionTaken()`: called when user starts booking/selftest, clears "no action" signal

**HeroSection**: call `getCtaPriority()`, if result is `'booking'` keep current layout, if `'selftest'` swap button variants/order, if `'support'` elevate support button to primary row.

**PrimaryActionCards**: sort the 3 action objects so the priority target is index 0.

## What won't change
- No layout/structure changes — same components, same grid, same styling
- No backend changes
- No new routes or tables
- Existing analytics tracking untouched

