

# Link Attribution + User Journey Analytics System

## Summary

Add a full-funnel tracked link generation, visitor attribution, and journey analytics system. This builds on the existing `analytics_events` table and `trackEvent` helper, adding campaign link management, persistent anonymous visitor IDs, UTM/attribution capture on landing, and a new admin dashboard tab.

---

## New Database Tables

### 1. `tracked_links`
Stores generated campaign/share links with metadata.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| slug | text UNIQUE | Short code for clean URLs, e.g. `/go/abc123` |
| destination_path | text | Internal route, e.g. `/booking` |
| campaign | text | Campaign name |
| channel | text | facebook, instagram, line, qr, etc. |
| source | text | |
| medium | text | |
| content | text | |
| term | text | |
| partner_name | text | KOL / outreach worker name |
| service_focus | text | e.g. "hiv-testing" |
| branch_focus | text | e.g. "silom" |
| label | text | Custom note |
| expires_at | timestamptz | Optional expiration |
| click_count | integer DEFAULT 0 | Incremented on redirect |
| created_by | uuid FK profiles | |
| created_at | timestamptz | |

RLS: Admin-only read/write.

### 2. `visitor_attribution`
Stores first-touch and last-touch attribution per anonymous visitor, linked to user_id when identified.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| anonymous_id | text | Persistent localStorage ID |
| user_id | uuid | Linked on signup/login |
| first_touch_* | (campaign, channel, source, medium, content, term, partner, link_id, landing_page, referrer, landed_at) | Set once |
| last_touch_* | Same set | Updated on each new tracked entry |
| device_type | text | |
| user_agent | text | |
| first_seen_at | timestamptz | |
| last_seen_at | timestamptz | |
| total_sessions | integer | |

RLS: Insert by anon/authenticated; select by admin only.

### 3. Extend `analytics_events`
Add columns to existing table:

- `anonymous_id` (text) — persistent visitor ID
- `event_category` (text) — acquisition, engagement, booking, etc.
- `campaign` (text)
- `channel` (text)
- `source` (text)
- `medium` (text)
- `link_id` (uuid) — FK to tracked_links
- `service_id` (text)
- `branch_id` (text)
- `booking_id` (uuid)

---

## Frontend Implementation

### A. Anonymous Visitor ID (`src/lib/visitorId.ts`)
- Generate a persistent ID in `localStorage` (survives sessions)
- Separate from `sessionStorage` session ID

### B. Attribution Capture (`src/lib/attribution.ts`)
- On app load, parse URL for UTM params (`utm_campaign`, `utm_source`, etc.) and custom params (`channel`, `partner`, `link_id`)
- Store in `sessionStorage` for current session
- Upsert into `visitor_attribution` table (first-touch on first visit, last-touch always)
- On auth state change (signup/login), update `visitor_attribution.user_id`

### C. Enhanced `trackEvent` 
- Automatically attach `anonymous_id`, attribution context (campaign/channel/source/medium), and `event_category` to every event
- Add typed helper: `trackJourneyEvent(category, eventType, meta)`

### D. Tracked Link Redirect Route (`/go/:slug`)
- New page that:
  1. Looks up `tracked_links` by slug
  2. Increments `click_count` via RPC
  3. Sets attribution in session
  4. Redirects to `destination_path` with tracking params

### E. Add Journey Event Calls
Sprinkle `trackJourneyEvent` calls in key places:
- **Booking flow**: `booking_page_view`, `branch_selected`, `service_selected`, `booking_created`, etc. (in `src/pages/Booking.tsx`)
- **Auth**: `signup_started`, `signup_completed`, `login` (in auth page)
- **Virtual/Story**: already has some; add `story_started`, `story_completed`
- **Harm Reduction**: `factsheet_view`, `safer_use_content_view`
- **Service cards**: `service_card_view`, `service_detail_view`

### F. Link Generator Admin UI (`AdminAttributionContent.tsx`)
New admin tab "attribution" with three sub-sections:

#### F1. Link Generator
- Form to create tracked links with all fields (campaign, channel, source, partner, destination, etc.)
- Auto-generate slug or allow custom
- Show generated URL + QR code
- List of existing links with click counts
- Clone/edit/expire actions

#### F2. Attribution Dashboard
- **Acquisition cards**: Total visits, unique visitors, attributed visitors, top channels, top campaigns, top partners
- **Channel performance chart**: Bar chart by channel showing visits → signups → bookings → completed
- **Campaign table**: Each campaign with funnel metrics
- **First-touch vs last-touch toggle**

#### F3. Journey Analytics
- **Conversion funnel**: visit → signup → booking → completed (with drop-off %)
- **Top paths**: Most common page sequences
- **Service performance**: Which services get viewed vs booked vs completed
- **Branch comparison**: Attribution by branch
- **Date range filter + CSV export**

### G. Admin Navigation
Add "Attribution" tab to admin sidebar under Reports group, accessible by admin and me_analyst roles.

---

## Edge Function: `track-link-click`
Simple function to increment click count and return destination (avoids needing anon write access to `tracked_links`).

---

## Privacy Considerations
- Anonymous ID is a random string, not fingerprinting
- No health-specific data in attribution tables
- Event metadata keeps only structural info (service_id, not health details)
- Attribution dashboard shows aggregates only
- Follows existing PDPA retention rules (analytics_events = 1 year)

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/visitorId.ts` |
| Create | `src/lib/attribution.ts` |
| Create | `src/lib/journeyTracker.ts` |
| Create | `src/components/admin/AdminAttributionContent.tsx` |
| Create | `src/components/admin/attribution/LinkGenerator.tsx` |
| Create | `src/components/admin/attribution/AttributionDashboard.tsx` |
| Create | `src/components/admin/attribution/JourneyFunnel.tsx` |
| Create | `src/pages/LinkRedirect.tsx` |
| Create | `supabase/functions/track-link-click/index.ts` |
| Create | DB migration for tables + columns |
| Modify | `src/hooks/useAnalytics.ts` — attach anonymous_id + attribution |
| Modify | `src/components/AnalyticsProvider.tsx` — init attribution capture |
| Modify | `src/App.tsx` — add `/go/:slug` route + admin tab |
| Modify | `src/pages/Admin.tsx` — register new tab |
| Modify | `src/pages/Booking.tsx` — add journey events |
| Modify | `src/components/AdminLayout.tsx` — add sidebar item |

---

## Estimated Scope
- 1 migration (3 table operations)
- 1 edge function
- ~8 new files
- ~6 modified files
- No breaking changes to existing features

