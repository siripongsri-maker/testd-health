

# Booking System Enhancement Plan

This is a large-scale enhancement covering 10 areas. Due to the ~5 credit constraint, the plan prioritizes deterministic logic, database-driven rules, and avoids AI features entirely.

---

## Phase 1: Database Schema Changes (Single Migration)

### 1.1 Multi-service booking
- Create `appointment_services` join table: `(id, appointment_id, service_id)`
- Keep `appointments.service_id` as the "primary" service for backward compatibility, but the join table is the source of truth
- RLS: users see their own; staff see branch-scoped; admins see all

### 1.2 Staff profiles table
- Create `staff_profiles` table: `(id uuid PK, user_id uuid, branch_id uuid, name_th text, name_en text, role text CHECK IN ('counselor','medical_registration','admin'), is_active boolean, created_at timestamptz)`
- Seed 13 counselors across 4 branches
- RLS: staff can view own profile; admins can manage all; branch staff can view same-branch colleagues

### 1.3 Service pricing rules
- Add columns to `booking_services`: `is_free_pep_thai boolean DEFAULT false`, `is_free_clvm boolean DEFAULT true`
- Update PEP service: `is_free_thai = true`, `is_free_pep_thai = true`, `is_free_clvm = false` (PEP is NOT free for non-Thai, even CLVM)
- Other services keep `is_free_thai = true`, `is_free_global_fund = true` (which covers CLVM)

### 1.4 Notification logs
- Create `notification_logs` table: `(id, appointment_id, email, notification_type, status, created_at)`
- RLS: users see own logs; admins see all

### 1.5 Risk assessment questions
- Create `risk_assessment_questions` table: `(id, question_th, question_en, options jsonb, recommended_services text[], display_order int, is_active boolean)`
- Seed ~5 deterministic risk questions
- Public SELECT on active questions

### 1.6 Anonymous booking support
- Add `contact_email text` column to `appointments` for anonymous email collection
- Make `appointments.user_id` nullable (for future anonymous flow -- but initially keep requiring auth for simplicity and security)

---

## Phase 2: Staff Account Provisioning

### 2.1 Create staff auth accounts
- Use the existing `create-branch-staff` edge function pattern
- Create accounts for all 13 counselors with secure temporary passwords
- Passwords will be set via the admin password reset flow (already exists)
- Link each auth account to `staff_profiles` and `staff_branch_assignments`

### 2.2 Staff permissions
- Counselors: can view/update appointments for their branch only (already enforced by existing RLS on `appointments` via `staff_branch_assignments`)
- Medical registration: same as counselor + can access ID card uploads (branch-scoped)
- Admins: full access (already working)

---

## Phase 3: UI Changes

### 3.1 Multi-service booking flow (Booking.tsx)
- Change Step 2 from single-select to multi-select checklist with checkboxes
- Add "Next" button to proceed (instead of auto-advancing on click)
- Update state from `selectedService: Service | null` to `selectedServices: Service[]`
- On confirm, insert 1 appointment row + N rows in `appointment_services`
- Capacity: 1 appointment = 1 slot regardless of service count
- Duplicate check: same user + branch + date + time

### 3.2 Free service display rules
- Show per-service pricing badges based on `is_free_thai`, `is_free_global_fund`, and new PEP-specific flag
- Add clear PEP warning: "PEP is free ONLY for Thai nationals" in both TH/EN
- Link to swingsilompolyclinic.com for pricing info

### 3.3 Risk assessment step (optional, before booking)
- Add optional "Not sure what you need?" button on service selection step
- Shows 4-5 deterministic yes/no questions (loaded from DB)
- Rule-based mapping: e.g., "recent unprotected exposure < 72hrs" -> recommend PEP + HIV test
- Pre-selects recommended services, user can modify
- Disclaimer: "This is not a diagnosis" in TH/EN

### 3.4 Translation button on every page
- The `LanguageToggle` component already exists
- Add it to `PageContainer` as a fixed-position button (top-right corner)
- This ensures it appears on every page without modifying each page individually
- No AI translation -- this is purely the i18n toggle (TH/EN)

### 3.5 My Appointments updates
- Show multiple services per appointment (from join table)
- Show staff notes and service details in expanded view

### 3.6 Admin booking view
- Show multi-service appointments
- Filter by branch (already partially working via `userBranch` prop)

### 3.7 Safe data prefill
- On booking confirm step, offer to prefill from `selftest_pii` if user is authenticated
- Fetch via authenticated `user_id` only (never localStorage)
- Show "Clear prefilled data" button
- Clear all form state on component unmount

---

## Phase 4: Email Notifications

### 4.1 Edge function: `booking-notification`
- Triggered after successful booking insert (called from client)
- Sends confirmation email with appointment details
- Uses Supabase built-in email or a simple SMTP integration
- Masks email in `notification_logs` (store only first 3 chars + domain)
- Handles both authenticated (user email from auth) and contact_email

### 4.2 Cancellation notification
- When user cancels, call the same edge function with type = 'cancelled'

---

## Phase 5: Security Hardening

### 5.1 RLS audit
- `appointment_services`: users can SELECT/INSERT for own appointments; staff branch-scoped; admin full
- `staff_profiles`: public SELECT for name/branch (needed for display); admin manages
- `notification_logs`: user sees own; admin sees all
- `risk_assessment_questions`: public SELECT on active

### 5.2 Data isolation
- All form states reset on mount (already enforced via React state, no localStorage)
- Booking page uses only `useState` -- no persistence
- Auth cleanup on logout already removes stale keys

### 5.3 No AI usage
- Risk assessment: deterministic question-answer mapping
- Translation: client-side i18n toggle only
- No AI calls in booking flow

---

## Phase 6: Production Deploy Checklist

After implementation, verify:
- [ ] `/booking` route loads and shows 4 branches
- [ ] Multi-service selection works (checkboxes)
- [ ] Time slots show correct capacity per branch
- [ ] Duplicate booking prevention works
- [ ] Cancellation works from `/my-appointments`
- [ ] RLS: user A cannot see user B's appointments
- [ ] Staff can only see their branch's appointments
- [ ] Language toggle appears on all pages
- [ ] PEP shows "Free for Thai only" warning
- [ ] Risk assessment pre-selects services correctly
- [ ] Email notification fires on booking
- [ ] No localStorage-based data leakage

---

## Technical Details

### Files to create:
1. `supabase/migrations/XXXX_booking_enhancements.sql` -- all schema changes
2. `supabase/functions/booking-notification/index.ts` -- email notification edge function
3. `src/components/booking/RiskAssessment.tsx` -- risk questionnaire component
4. `src/components/booking/ServiceMultiSelect.tsx` -- multi-select service step

### Files to modify:
1. `src/pages/Booking.tsx` -- multi-service flow, risk assessment, pricing badges, prefill
2. `src/pages/MyAppointments.tsx` -- show multiple services per appointment
3. `src/components/admin/AdminBookingContent.tsx` -- multi-service display
4. `src/components/PageContainer.tsx` -- add LanguageToggle to all pages
5. `src/components/BottomNav.tsx` -- no changes needed (already has logout cleanup)

### Migration SQL summary:
```text
-- appointment_services join table
-- staff_profiles table + seed data
-- notification_logs table
-- risk_assessment_questions table + seed data
-- Add is_free_clvm column to booking_services
-- Update PEP service pricing flags
-- RLS policies for all new tables
```

### Staff seeding (13 counselors):
Accounts created via edge function with role='moderator', linked to branch assignments. Passwords managed via existing admin reset flow -- never exposed in code or logs.

