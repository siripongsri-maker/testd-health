

# Booking System Fix + Enhancements Plan

## Critical Bug: RLS Policy Type

All existing RLS policies on `appointments`, `appointment_services`, and related tables are **RESTRICTIVE** (not PERMISSIVE). In PostgreSQL, RESTRICTIVE policies require ALL of them to pass simultaneously, meaning a regular user who matches "Users can view own" would also need to pass "Admins can manage all" and "Branch staff can view" -- which they can't. This likely causes silent data access failures. The migration must **drop and recreate these as PERMISSIVE** policies.

---

## Phase 1: Fix Core Issues + Backend

### 1A. Database Migration (single SQL file)

**Fix RLS policies** (convert RESTRICTIVE to PERMISSIVE):
- `appointments`: Drop all 6 policies, recreate as PERMISSIVE
- `appointment_services`: Drop all 4 policies, recreate as PERMISSIVE
- `appointment_logs`: Same treatment

**Schema additions:**
- `appointments.referral_code` (text, unique) -- human-friendly booking code
- `appointments.user_id` changed to NULLABLE (for anonymous bookings)
- Remove NOT NULL on `appointments.service_id` (join table is source of truth)
- Add unique constraint on `(user_id, branch_id, appointment_date, start_time)` WHERE status != 'cancelled' to prevent duplicates at DB level

**Referral code generation:**
- Create a Postgres function `generate_referral_code()` that produces `SWG-XXXXXX` (6 uppercase alphanumeric chars)
- Add a trigger on appointments INSERT to auto-set `referral_code`

**Anonymous booking INSERT policy:**
- Allow INSERT when `user_id IS NULL AND contact_email IS NOT NULL` (for anonymous)
- Allow SELECT on own anonymous bookings via a new RPC (lookup by referral_code + contact_email)

### 1B. Fix Service Selection UI (Booking.tsx)

**Root cause:** The `Checkbox` component's `onCheckedChange` and the parent `Card`'s `onClick` both call `toggleService`, causing a double-toggle (select then immediately deselect). 

**Fix:**
- Remove `onCheckedChange` from Checkbox (let Card onClick handle it)
- OR use `e.stopPropagation()` on Checkbox click
- Add clear visual feedback: green border + checkmark icon when selected

### 1C. Combine Date + Time into One Step

Merge the `date` and `time` steps into a single `datetime` step:
- Left/top section: scrollable date pills (horizontal)
- Below: time slot grid for selected date
- When date changes, time slots reload automatically
- Softer UI: `rounded-3xl` cards, `rounded-full` time slot pills

**Updated step flow:** `branch` -> `service` -> `datetime` -> `confirm`

### 1D. Capacity & Duplicate Prevention

- Already implemented in code (checks `bookedSlots` against `counselor_count`)
- Add DB-level unique constraint as safety net (migration handles this)

---

## Phase 2: Anonymous Booking + Post-Registration

### 2A. Allow Booking Without Login

In `Booking.tsx` confirm step:
- If not logged in, show `contact_email` input field (required)
- On submit: insert with `user_id = NULL`, `contact_email = <input>`
- After success: show confirmation page with referral code + screenshot guidance

### 2B. Post-Booking Registration CTA

After anonymous booking confirmation:
- Show referral code prominently (large, copyable)
- TH: "กรุณาแคปหน้าจอนี้และแสดงให้เจ้าหน้าที่ลงทะเบียน"
- EN: "Please take a screenshot and show this to Medical Registration"
- CTA button: "Create account to manage appointments" (navigates to /auth with return URL)

### 2C. Link Anonymous Bookings After Registration

- After user registers and logs in, check if any appointments match their email
- If found, offer to link them (update `user_id` on matching appointments)
- This is a client-side check on first login (not automatic -- requires consent)

---

## Phase 3: Referral / Booking Code

### 3A. Auto-Generate Code

- Postgres trigger generates `SWG-XXXXXX` on every INSERT
- Stored in `appointments.referral_code`
- Displayed on confirmation page and in `/my-appointments` detail view

### 3B. Staff Lookup

- Add search input to `AdminBookingContent.tsx`
- Staff can search by referral code (queries `appointments WHERE referral_code ILIKE`)
- This bypasses date filter when searching by code

---

## Phase 4: Staff Accounts + Access Control

### 4A. Staff Account Provisioning

The 13 counselors already exist in `staff_profiles` but have `user_id = NULL`. The existing `create-branch-staff` edge function can create auth accounts.

**Update the edge function** to also:
- Accept a `staff_profile_id` parameter
- After creating the auth user, update `staff_profiles.user_id` with the new user ID
- Expand allowed branches to include `saphankwai` and `petchakasem`

Admin can then provision accounts from the admin panel.

### 4B. Staff Login & Branch-Scoped Views

Already working via existing RLS policies (once fixed to PERMISSIVE). Staff with `staff_branch_assignments` can only see their branch appointments.

---

## UI Style Direction

Apply across all booking screens:
- Cards: `rounded-3xl`, soft shadow, generous padding
- Time slots: `rounded-full` pill buttons
- Step header with progress indicator (already exists, keep)
- Bilingual labels consistent throughout

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration SQL | Fix RLS, add referral_code, nullable user_id, unique constraint, trigger |
| `src/pages/Booking.tsx` | Fix checkbox double-toggle, merge date+time step, anonymous booking flow, referral code display, softer UI |
| `src/pages/MyAppointments.tsx` | Show referral code in detail view, link anonymous bookings |
| `src/components/admin/AdminBookingContent.tsx` | Add referral code search, display codes |
| `src/lib/appointments.ts` | Update FullAppointment type to include referral_code |
| `supabase/functions/create-branch-staff/index.ts` | Accept staff_profile_id, support all 4 branches |

---

## Implementation Order

1. **Migration first** -- fix RLS (critical), add columns, add trigger
2. **Booking.tsx** -- fix click bug, merge date/time, anonymous flow, referral code
3. **MyAppointments.tsx** -- show referral code, anonymous linking
4. **AdminBookingContent.tsx** -- referral code search
5. **Edge function update** -- support all branches + staff_profile linking
6. **Test end-to-end**

