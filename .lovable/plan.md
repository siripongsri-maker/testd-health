

# Self Check-in / Check-out Flow for My Appointments

## Overview
Add client-driven check-in and check-out buttons directly on each appointment card in `/my-appointments`. Staff verifies the referral code visually -- the client taps the buttons themselves. No new pages needed.

## Database Changes (1 migration)

### New columns on `appointments`
- `checked_out_at` (timestamptz, nullable)
- `duration_minutes` (integer, nullable)
- `rating` (integer 1-5, nullable)
- `feedback` (text, nullable)

Note: `arrived_at` already exists.

### Update `update_appointment_status` RPC
Currently users can only set status to `cancelled`. Expand to allow:
- `arrived` -- only if owner, status is `booked` or `confirmed`, and within time window (2 hours before to 6 hours after `appointment_date + start_time`)
- `checked_out` -- only if owner, status is `arrived`, and `arrived_at` is set

When transitioning to `arrived`: set `arrived_at = now()`.
When transitioning to `checked_out`: set `checked_out_at = now()`, compute `duration_minutes`.

### New RPC: `self_checkout_appointment`
Separate function for check-out that also accepts `p_rating` (int, nullable) and `p_feedback` (text, nullable), and validates referral code confirmation (`p_confirm_code`). This keeps checkout logic clean and secure.

- Validates `p_confirm_code` matches the appointment's `referral_code`
- Sets status to `checked_out`, `checked_out_at = now()`
- Computes `duration_minutes = EXTRACT(EPOCH FROM (now() - arrived_at)) / 60`
- Saves rating/feedback if provided
- Logs `self_checkout` to `appointment_logs`

### New RPC: `self_checkin_appointment`
- Validates ownership (`user_id = auth.uid()`)
- Validates status is `booked` or `confirmed`
- Validates time window: appointment datetime is within -2h to +6h of now
- Sets `status = 'arrived'`, `arrived_at = now()`
- Logs `self_checkin` to `appointment_logs`

## Frontend Changes

### 1. Update `FullAppointment` type (`src/lib/appointments.ts`)
Add fields: `arrived_at`, `checked_out_at`, `duration_minutes`, `rating`, `feedback`.

### 2. Update `STATUS_CONFIG` in `MyAppointments.tsx`
Add new statuses:
- `arrived` -- "เช็คอินแล้ว" / "Checked In" (amber badge)
- `checked_out` -- "เสร็จสิ้น" / "Completed" (green badge)

### 3. Update appointment grouping
- "Upcoming" includes: `booked`, `confirmed`, `arrived`
- "History" includes: everything else

### 4. Rework `renderAppointment` in `MyAppointments.tsx`
Based on status, show different action sections:

**Status = `booked` or `confirmed`:**
- Always-visible referral code block (large, prominent)
- Helper text: "เมื่อมาถึงคลินิก ให้กดเช็คอิน และแสดงรหัสนี้ให้เจ้าหน้าที่"
- Big green "เช็คอิน (Check-in)" button
- Cancel button (existing)

**Status = `arrived`:**
- Badge: "เช็คอินแล้ว - กำลังรอ (Checked in - Waiting)"
- Small note: "หากมีปัญหา กรุณาติดต่อจุดลงทะเบียน"
- "เช็คเอาท์ (Check-out)" button that opens a confirmation dialog

**Status = `checked_out`:**
- Badge: "เสร็จสิ้น (Completed)"
- Duration display if available
- Rating stars if submitted
- No action buttons

### 5. Check-out Confirmation Dialog
When the user taps "เช็คเอาท์":
1. Show a dialog/drawer with appointment summary (branch, date/time, services, referral code)
2. Input field: "กรุณากรอกรหัสนัดหมายเพื่อยืนยัน" -- user types their referral code
3. Optional: 1-5 star rating with emoji faces
4. Optional: anonymous feedback textarea
5. "ยืนยันเช็คเอาท์" button (disabled until code matches)
6. On success: toast "ขอบคุณที่ใช้บริการ" with purple heart emoji

### 6. Check-in handler
Call `self_checkin_appointment` RPC, optimistic UI update, toast: "เช็คอินเรียบร้อยแล้ว กรุณารอเจ้าหน้าที่เรียก"

## Technical Details

### Migration SQL (summary)

```text
-- Add columns
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS feedback text;

-- Create self_checkin_appointment RPC
-- Validates: auth, ownership, status in (booked/confirmed), time window
-- Sets: status='arrived', arrived_at=now()
-- Logs: self_checkin

-- Create self_checkout_appointment RPC
-- Params: p_appointment_id, p_confirm_code, p_rating, p_feedback
-- Validates: auth, ownership, status='arrived', code match
-- Sets: status='checked_out', checked_out_at=now(), duration, rating, feedback
-- Logs: self_checkout
```

### Files to create/modify
1. **New migration SQL** -- columns + 2 RPC functions
2. **`src/lib/appointments.ts`** -- update `FullAppointment` interface, add `selfCheckinRPC()` and `selfCheckoutRPC()` helper functions
3. **`src/pages/MyAppointments.tsx`** -- main UI changes: new status badges, check-in button, check-out dialog with code confirmation + optional rating

### Security
- Both RPCs use `SECURITY DEFINER` with `auth.uid()` ownership check
- Check-in is time-windowed to prevent abuse
- Check-out requires referral code re-entry as a simple verification step
- RLS on `appointments` already allows users to update their own rows
- Rating is constrained 1-5 in the RPC

