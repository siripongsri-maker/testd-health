

# Exit-Intent Nudge Modal

## Summary
Create a modal that appears after 20–30 seconds of inactivity (no clicks/scrolls/mouse moves) or on mouse-leave (desktop). Shows once per session only. Mobile-friendly.

## Files

| Action | File |
|--------|------|
| Create | `src/components/ExitIntentNudge.tsx` |
| Modify | `src/pages/Home.tsx` — render `<ExitIntentNudge />` |

## Implementation

### `ExitIntentNudge.tsx`
- Uses `sessionStorage` flag (`testd_exit_nudge_shown`) to show only once per session
- Listens for:
  - **Desktop**: `mouseleave` on `document.documentElement` (cursor exits viewport top)
  - **All devices**: Idle timer — no `click`, `scroll`, `touchstart`, `mousemove` for 25 seconds
- On trigger: show a Dialog with:
  - Headline: "ยังไม่แน่ใจใช่ไหม?"
  - Subtext: "คุยกับเจ้าหน้าที่ได้ฟรี ไม่ต้องระบุตัวตน"
  - Two buttons:
    - "คุยตอนนี้" → `navigate('/support-chat')` (primary)
    - "ตรวจเลย" → `navigate('/booking')` (outline)
  - Close X to dismiss
- Tracks `exit_intent_nudge_shown` and `exit_intent_nudge_click` events via `trackEvent`
- Uses existing `Dialog` component, styled mobile-friendly

### `Home.tsx`
- Add `<ExitIntentNudge />` at the bottom of the page, alongside existing popups

## What won't change
- No layout changes, no new routes, no backend changes
- Only fires on homepage

