

# Client CRM / Case Management System

## Summary

Build an internal staff-facing CRM that aggregates each client's full journey — appointments, service events, counseling, follow-ups, feedback, and self-test requests — into a single timeline view per client. Staff can add case notes, set follow-up reminders, and track outcomes across visits.

This system does NOT duplicate data. It reads from existing canonical tables and adds only a lightweight `case_notes` table for staff observations.

---

## What Already Exists (No Duplication)

The platform already has the building blocks:

| Data | Source Table | Status |
|------|-------------|--------|
| Identity | `profiles` + `hr_user_profile` | Canonical |
| Appointments | `appointments` | Canonical |
| Service journey | `service_pathways` → `service_events` | Canonical |
| Clinical visits | `clinic_encounters` | Canonical |
| Counseling | `counseling_sessions` | Canonical |
| Follow-ups | `followup_events` | Canonical |
| Feedback | `client_feedback` | Canonical |
| Self-test kits | `selftest_requests` | Canonical |
| Queue visits | `client_visit_flows` | Canonical |

The CRM is a **read layer** on top of these, plus one new table for case notes.

---

## New Database Table

### `case_notes`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| client_id | uuid | References `profiles.id` |
| anonymous_token | text | For non-authenticated clients |
| staff_id | uuid | Who wrote the note |
| branch_id | uuid | Context branch |
| note_type | text | `observation`, `follow_up`, `risk_flag`, `referral`, `general` |
| content | text | The note itself |
| is_sensitive | boolean | Extra access control |
| linked_appointment_id | uuid | Optional link |
| linked_service_event_id | uuid | Optional link |
| created_at | timestamptz | |

**RLS**: Staff can insert/select notes for their branch. Admins see all. No client access.

---

## Frontend Components

### A. Client List View (`AdminCRMContent.tsx`)

New admin tab "client-crm" under **Services & Care** group.

- Searchable table of clients (from `profiles` + recent `appointments`)
- Columns: Name, Last Visit, Branch, Services Used, Follow-up Status
- Filters: branch, date range, has-pending-followup
- Click row → opens Client Detail view
- Branch-scoped for moderators, global for admins

### B. Client Detail / Timeline (`ClientTimeline.tsx`)

Single-client view aggregating data from all canonical tables into a chronological timeline:

- **Header**: Client name, anonymous ID, branch, first/last visit dates
- **Timeline entries** (newest first):
  - Appointments (status, service, branch)
  - Service events (type, outcome, referrals)
  - Counseling sessions (summary, action plan)
  - Follow-up events (status, due date)
  - Feedback submissions (scores)
  - Case notes (staff-written)
  - Self-test requests (if any)
- Each entry shows icon, date, type badge, and summary
- PII masking follows existing reveal-with-reason pattern

### C. Case Note Form (`CaseNoteForm.tsx`)

- Inline form within timeline to add notes
- Fields: note type (dropdown), content (textarea), link to appointment (optional), sensitive flag
- Validates staff auth before insert

### D. Follow-up Tracker (`FollowUpTracker.tsx`)

- Panel within client detail showing pending `followup_events`
- Quick actions: mark complete, reschedule, add note
- Overdue items highlighted in red

---

## Admin Navigation

Add to **Services & Care** group in sidebar:
```
{ tab: "client-crm", icon: Users, labelKey: "admin.clientCRM", adminOnly: true }
```

---

## Privacy & Security

- All queries are branch-scoped via RLS for moderator role
- PII (name, phone, Thai ID) uses existing masking/reveal pattern
- `case_notes.is_sensitive` adds extra gate for flagged content
- No health details stored in case_notes — only operational observations
- Audit trail via existing `pii_access_log` for reveals
- PDPA-compliant: notes are operational records, not medical records

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/components/admin/crm/AdminCRMContent.tsx` |
| Create | `src/components/admin/crm/ClientTimeline.tsx` |
| Create | `src/components/admin/crm/CaseNoteForm.tsx` |
| Create | `src/components/admin/crm/FollowUpTracker.tsx` |
| Create | `src/components/admin/crm/ClientListTable.tsx` |
| Create | DB migration: `case_notes` table + RLS |
| Modify | `src/components/AdminSidebar.tsx` — add CRM tab |
| Modify | `src/pages/Admin.tsx` — register CRM content |
| Modify | `src/lib/i18n.ts` — add translation keys |

---

## Estimated Scope
- 1 migration (1 new table + RLS policies)
- ~5 new files
- ~3 modified files
- No changes to existing tables or logic
- No breaking changes

