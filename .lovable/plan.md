

## Summary

The user wants:
1. **Email to be optional** (not required) during booking — even for anonymous users
2. **Add a LINE ID field** alongside phone in the booking contact section
3. **Show contact info (phone/LINE/email) after the referral code** in the admin Today Board and Booking overview (AppointmentPill)
4. Keep data minimal and useful for staff to quickly contact clients

## Changes

### 1. Database: Add `contact_line` column to `appointments`
- Migration: `ALTER TABLE appointments ADD COLUMN contact_line text;`
- Update `create_anonymous_appointment` and `create_appointment_atomic` RPCs to accept `p_contact_line`
- Update `guest_universal_lookup` to also search by LINE ID

### 2. Booking page (`src/pages/Booking.tsx`)
- **Make email optional** for anonymous users: remove the requirement check for `contactEmail`, remove `disabled` condition tied to email, remove `required` attribute
- **Add LINE ID input** field in the contact card (optional, with placeholder like `@lineid`)
- Pass `contact_line` to both RPC calls
- Keep phone as mandatory (already implemented)

### 3. Admin AppointmentPill (`src/components/admin/booking/AppointmentPill.tsx`)
- Show contact info (phone > LINE > email) after the referral code — already partially done, add LINE ID support

### 4. Admin Today Board (`src/components/admin/AdminTodayBoard.tsx`)
- Fetch `contact_phone, contact_email, contact_line` in the appointment queries
- Display contact info after the referral code in each appointment row (`renderRow`)

### 5. Admin Detail Drawer (`src/components/admin/booking/AppointmentDetailDrawer.tsx`)
- Show LINE ID with 💬 icon alongside phone and email

### 6. Shared types (`src/lib/appointments.ts`)
- Add `contact_line: string | null` to `FullAppointment` interface

## Technical Detail

- The `contact_line` column is nullable text, no constraints
- Anonymous booking will now work without email — the RPC `create_anonymous_appointment` INSERT policy requires `contact_email IS NOT NULL`, so the RPC (being SECURITY DEFINER) bypasses this, but we should still pass empty string or null gracefully
- The `guest_universal_lookup` already handles referral code + phone; LINE ID lookup will follow the same pattern

