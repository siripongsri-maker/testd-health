

# Booking System Fix + Enhancements Plan

## ✅ COMPLETED

### Phase 1: Core Issues + Backend
- [x] RLS policies verified as PERMISSIVE (no fix needed)
- [x] Added `referral_code` column with auto-generation trigger (SWG-XXXXXX)
- [x] Made `user_id` nullable for anonymous bookings
- [x] Made `service_id` nullable (join table is source of truth)
- [x] Added unique constraint to prevent duplicate bookings
- [x] Anonymous booking INSERT policy for `anon` role
- [x] Lookup RPC `lookup_appointment_by_code()`
- [x] Fixed service selection double-toggle (replaced Checkbox with custom check indicator)
- [x] Merged date + time into single `datetime` step with horizontal date pills + time slot grid
- [x] Applied softer UI: `rounded-3xl` cards, `rounded-full` pills
- [x] Referral code displayed on success page with copy + screenshot guidance
- [x] Referral code shown in MyAppointments expanded view
- [x] Referral code search in AdminBookingContent
- [x] Edge function updated: supports all 4 branches + `staff_profile_id` linking

### Phase 2: Anonymous Booking
- [x] Anonymous users can book with `contact_email`
- [x] Success page shows referral code + CTA to register

### Phase 3: Referral Code
- [x] Auto-generated via Postgres trigger
- [x] Backfilled existing appointments
- [x] Staff can search by code in admin view

### Phase 4: Staff Accounts
- [x] Edge function supports saphankwai + petchakasem
- [x] `staff_profile_id` links auth user to staff profile

## TODO (future)
- [ ] Link anonymous bookings after user registers (match contact_email)
- [ ] Email notification delivery (currently logging only)
- [ ] Staff account provisioning UI in admin panel
