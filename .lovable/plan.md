

# Conversion Insights Panel — Admin Dashboard

## Summary

Add a new "Conversion Insights" tab to the Admin dashboard that queries `analytics_events` for funnel events (CTA clicks → page views → started → submitted), computes conversion rates, and auto-generates rule-based insights with warnings and recommendations. No new tables needed.

## What gets built

### 1. Insight Logic Helper
**Create**: `src/lib/conversionInsights.ts`

A pure function that takes funnel counts and returns:
- **Conversion rates** (booking funnel, selftest funnel, CTA→page view)
- **Flags**: high drop-off (>50%), zero conversions, strong interest signals
- **Recommended actions**: 1–2 line suggestions in Thai

Thresholds:
- Started→Submitted < 50% = high drop-off warning
- CTA clicks > 0 but started = 0 = "interest but no follow-through"
- Submitted/Started > 70% = strong completion signal

### 2. Dashboard Component
**Create**: `src/components/admin/AdminConversionInsightsContent.tsx`

Queries `analytics_events` for these event types:
- `homepage_cta_booking_click`, `homepage_cta_selftest_click`, `homepage_cta_support_click`, `sticky_cta_click`
- `page_view_booking`, `page_view_selftest`
- `booking_started`, `booking_submitted`
- `selftest_started`, `selftest_submitted`

UI sections:
- **KPI cards** (4-col grid): Total CTA clicks, Booking conversion %, Selftest conversion %, Support clicks
- **Funnel visualization**: Simple horizontal bars showing drop-off at each stage
- **Auto-generated insights panel**: 3–5 insight cards with finding + recommendation
- **Empty state**: Friendly message when no events exist yet ("ยังไม่มีข้อมูล funnel — ข้อมูลจะเริ่มปรากฏเมื่อมีผู้ใช้คลิก CTA บนหน้าแรก")

Date range filter using existing `AdminDateRangeFilter` component.

### 3. Register in Admin
**Modify**: `src/pages/Admin.tsx` — add lazy import + renderTab for `"conversion-insights"`
**Modify**: `src/components/AdminSidebar.tsx` — add sidebar item under MEL & Reporting group
**Modify**: `src/lib/i18n.ts` — add translation key

## Files

| Action | File |
|--------|------|
| Create | `src/lib/conversionInsights.ts` |
| Create | `src/components/admin/AdminConversionInsightsContent.tsx` |
| Modify | `src/pages/Admin.tsx` |
| Modify | `src/components/AdminSidebar.tsx` |
| Modify | `src/lib/i18n.ts` |

## What won't change
- No new DB tables or migrations
- No changes to existing tracking, auth, routes, or UI components
- Uses only existing `analytics_events` table with simple SELECT queries

