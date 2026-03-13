# Backend Consolidation Map — testD

> Generated: 2026-03-13 | Status: Phase 1 — Audit Complete

---

## 1. Domain → Source of Truth Map

| Domain | Canonical Source | Purpose | Overlapping Tables | Migration Status |
|--------|-----------------|---------|-------------------|-----------------|
| **Service Catalog** | `booking_services` | What services users can receive | — | ✅ Canonical |
| **Service Journey** | `service_pathways` | How users move through care | `clinic_walkins.pathway_id` | ✅ Canonical |
| **Service Events (Ledger)** | `service_events` | Master ledger of all service actions | `clinic_encounters` (visit details) | ✅ Canonical — distinct roles |
| **Clinic Encounters** | `clinic_encounters` | Per-visit clinical detail | Links to `service_events` | ✅ Canonical |
| **Counseling Sessions** | `counseling_sessions` | Counseling-specific records | — | ✅ Canonical |
| **Follow-ups** | `followup_events` | Scheduled follow-up timeline items | — | ✅ Canonical |
| **Referrals** | `service_events` (type=referral) | Operational referral records | MEL may duplicate via manual entry | ⚠️ Use service_events for new referrals |
| **Clinic Settings** | `clinic_settings` | Clinic config (name, phone, hours) | — | ✅ Canonical |
| **User Identity** | `profiles` | Core account identity | — | ✅ Canonical |
| **HR Context Profile** | `hr_user_profile` | Harm reduction / service personalization | `clinic_walkins` snapshots intake fields | ✅ Canonical — walkins snapshot OK |
| **Appointments** | `appointments` | Booking records | `appointment_services`, `appointment_logs` | ✅ Canonical |
| **References / Citations** | `references` + `page_reference_links` | Citation registry + page attachment | `hr_knowledge_sources` (content-oriented) | ⚠️ Keep separate — different purpose |
| **Indicator Definitions** | `indicator_definitions` | MEL indicator config | — | ✅ Canonical |
| **Indicator Results** | `indicator_results` | MEL indicator data points | — | ✅ Canonical |
| **Reporting Periods** | `reporting_periods` | MEL reporting windows | — | ✅ Canonical |
| **Outreach Events** | `outreach_events` | MEL outreach tracking | — | ✅ Canonical |
| **Training Sessions** | `training_sessions` | MEL training records | `training_curricula` (config) | ✅ Canonical |
| **Safe Spaces** | `support_sessions` + `support_groups` | MEL safe space records | — | ✅ Canonical |
| **Partner Organizations** | `partner_organizations` | MEL partner registry | — | ✅ Canonical |
| **Policy Evidence** | `policy_evidence_logs` | MEL policy engagement | — | ✅ Canonical |
| **Evaluation** | `evaluation_questions` + `evaluation_risks` | MEL evaluation framework | — | ✅ Canonical |
| **Partner Invites (Testing)** | `partner_invites` | Invite-a-partner flow | `partner_invite_relays`, `partner_test_sessions` | ✅ Canonical |
| **SMS Credits** | `sms_credit_balances` | Credit tracking | `sms_credit_transactions`, `sms_credit_purchases` | ✅ Canonical |
| **Analytics** | `analytics_events` | Page/session analytics | `analytics_daily_summary` (rollup) | ✅ Canonical |
| **Blog / Content** | `blog_articles` + `blog_categories` | CMS content | — | ✅ Canonical |
| **Surveys** | `surveys` + `survey_responses` | Survey system | — | ✅ Canonical |
| **Queue Management** | `client_visit_flows` + `client_visit_flow_steps` | In-clinic queue | — | ✅ Canonical |

---

## 2. Key Architecture Rules

### Service Catalog vs Service Journey

- `booking_services` = **what** users can receive (catalog/menu)
- `service_pathways` = **how** they move through care (journey state machine)
- These are intentionally separate. Do NOT merge.

### Event Hierarchy

```
service_events (master ledger)
  └── clinic_encounters (visit-level detail)
  └── counseling_sessions (counseling-specific)
  └── followup_events (scheduled follow-ups)
```

All link to: participant (user_id/anonymous_token), service_pathway, service_category.

### Profile Hierarchy

```
profiles (core identity, auth-linked)
  └── hr_user_profile (harm reduction context)
  └── clinic_walkins (intake snapshot — operational, not canonical)
```

### Reference System

```
references (canonical citation registry)
  └── page_reference_links (which page uses which reference)
hr_knowledge_sources (content-oriented knowledge entries — separate purpose)
```

---

## 3. Frontend Dependency Map

| Frontend Route / Component | Reads From | Writes To |
|---------------------------|-----------|----------|
| `/clinic` (Swing.tsx) | `booking_services`, `clinic_settings` | `service_events` (analytics) |
| `/booking` (Booking.tsx) | `booking_services`, `booking_branches`, `appointments` | `appointments`, `appointment_services` |
| `/harm-reduction` | `hr_user_profile`, `service_pathways` | `service_events`, `hr_user_profile` |
| `/booking?service=X` | `booking_services` (slug match) | `appointments` |
| Admin → Front Desk | `client_visit_flows`, `appointments` | `client_visit_flow_steps` |
| Admin → Clinic Settings | `clinic_settings`, `booking_services` | `clinic_settings`, `booking_services` |
| Admin → Service Pathways | `service_pathways`, `service_events` | — (read-only dashboard) |
| Admin → MEL Services | `service_events`, `clinic_encounters` | `service_events` |
| Admin → Diagnostics | Multiple tables (health checks) | — |

---

## 4. Identified Overlaps & Actions

| Overlap | Current State | Action | Priority |
|---------|--------------|--------|----------|
| Outreach in HR group AND MEL group | Both exist in sidebar; HR outreach = backlinks/SEO, MEL outreach = field events | ✅ Keep separate — different domains | — |
| Demographics in HR group | Only in HR | ✅ Correct placement, also useful for MEL | — |
| `clinic_settings` + `booking_services` | Both config tables for clinic | ✅ Already unified — clinic_settings = org config, booking_services = service catalog | — |
| Front Desk in HR group | Operational tool placed in HR category | ⚠️ Move to Services & Care | Medium |
| Clinic Settings in HR group | Config tool placed in HR category | ⚠️ Move to Services & Care | Medium |
| Service Pathways in HR group | Journey dashboard in HR | ⚠️ Move to Services & Care | Medium |

---

## 5. Migration Phases

### Phase 1 — Audit ✅ (This document)
- All tables mapped
- Sources of truth defined
- No critical duplicates found — architecture is sound

### Phase 2 — Admin Restructure ✅
- Sidebar reorganized into 6 clear groups
- Related items grouped logically
- No functional changes to components

### Phase 3 — Diagnostics Enhancement ✅
- Data health checks added
- Orphan/duplicate detection
- Migration status visible in admin

### Phase 4 — Future (Not started)
- Shared repository modules (clinicServiceRepository, etc.)
- Deprecation of any truly redundant patterns
- Only after frontend stability confirmed

---

## 6. Safe-to-Deprecate Assessment

| Item | Safe to Deprecate? | Reason |
|------|-------------------|--------|
| Hardcoded service arrays in frontend | ⚠️ Partially | Some category mappings still hardcoded in Swing.tsx — acceptable for UI styling |
| `clinic_walkins` table | ❌ No | Active operational table for walk-in intake |
| `hr_knowledge_sources` | ❌ No | Different purpose from `references` |
| Duplicate outreach tabs | ❌ No | Different domains (SEO vs MEL field events) |

---

## 7. Conclusion

The backend architecture is **fundamentally sound**. The main improvement needed is **admin navigation grouping**, not table restructuring. The sidebar has been reorganized to reflect clearer categories. No tables need merging at this time.
