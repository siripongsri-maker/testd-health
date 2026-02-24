

# Branch Photos + Google Maps Integration

## Overview
Add hero images, Google ratings/reviews, and Google Maps links to branch cards -- both on the client booking page and admin panel. The Google sync edge function will be built now but only work once a Google API key is provided later.

## A) Database Migration

Add 6 new columns to `booking_branches`:

| Column | Type | Notes |
|--------|------|-------|
| `hero_image_url` | text, nullable | Branch hero photo URL (uploaded or external) |
| `google_place_id` | text, nullable | Google Place ID for API lookups |
| `google_maps_url` | text, nullable | Direct link to open in Google Maps |
| `google_rating` | numeric(2,1), nullable | e.g. 4.5 |
| `google_review_count` | integer, nullable | Total review count |
| `google_photo_url` | text, nullable | Cached photo URL from Google Places |

## B) Edge Function: `sync-branch-google-data`

- Input: `{ branch_id }` (POST, admin-only with JWT check)
- Reads `google_place_id` from the branch row
- Calls Google Places API (New) `places/{place_id}` for rating, review count, and first photo reference
- Fetches place photo media URL
- Updates `booking_branches` with results
- Requires a `GOOGLE_MAPS_API_KEY` secret (to be added later)
- Returns success/error JSON

## C) Admin UI: Branch Editor

Add a new section in the admin booking dashboard (or a drawer) for each branch:

- **Hero Image**: Upload button (using existing `blog-images` storage bucket or a new one) + image preview
- **Google Place ID**: Text input field
- **Google Maps URL**: Text input field
- **"Sync Google Info" button**: Calls the edge function, shows loading state, refreshes data on success
- Display current `google_rating` and `google_review_count` as read-only after sync

This will be implemented as a `BranchSettingsDrawer` component opened from branch cards in the admin Bento dashboard.

## D) Client Booking UI Updates

Update the branch selection step in `/booking`:

- Show `hero_image_url` as a card header image (with fallback to current MapPin icon if missing)
- Display star rating: ★ 4.5 (320 reviews) -- only when `google_rating` exists
- Show small Google photo thumbnail if `google_photo_url` exists
- "Open in Google Maps" button linking to `google_maps_url`
- All Google fields gracefully hidden when null (no broken UI)

Update the `Branch` interface in `Booking.tsx` to include the new fields, and update the Supabase select query.

## Technical Details

### Files to Create
- `supabase/functions/sync-branch-google-data/index.ts` -- Edge function
- `src/components/admin/booking/BranchSettingsDrawer.tsx` -- Admin branch editor

### Files to Modify
- `supabase/migrations/..._add_branch_google_fields.sql` -- New columns
- `src/pages/Booking.tsx` -- Branch card UI with photos/ratings
- `src/components/admin/booking/BentoDashboard.tsx` -- Add settings gear icon to branch cards
- `src/components/admin/booking/types.ts` -- Update `BranchOption` interface

### Fallback Behavior
All Google-related fields are nullable. The UI renders branch cards identically to today when these fields are empty -- just the name, hours, and counselor count.

