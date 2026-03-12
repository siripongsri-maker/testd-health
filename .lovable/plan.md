

# Plan: Drug Combination Risk Map (Interaction Matrix)

## Summary

Build a visual interaction checker and matrix that lets users explore substance combination risks. The feature integrates into the existing Learn section as a new tab and uses the existing `hr_substance_interactions` table (extended with new columns).

## Database Changes

**Alter `hr_substance_interactions`** — add columns for richer detail:

| Column | Type | Purpose |
|--------|------|---------|
| `interaction_type` | `text` | e.g. "stimulant_depressant", "respiratory_depression" |
| `summary_th` | `text` | Short TH explanation |
| `summary_en` | `text` | Short EN explanation |
| `why_risky_th` | `text` | Why this combo is dangerous (TH) |
| `why_risky_en` | `text` | Why this combo is dangerous (EN) |
| `possible_effects_th` | `text[]` | Effect list TH |
| `possible_effects_en` | `text[]` | Effect list EN |
| `warning_signs_th` | `text[]` | Warning signs TH |
| `warning_signs_en` | `text[]` | Warning signs EN |
| `harm_reduction_tips_th` | `text[]` | HR tips TH |
| `harm_reduction_tips_en` | `text[]` | HR tips EN |
| `emergency_signs_th` | `text[]` | Emergency signs TH |
| `emergency_signs_en` | `text[]` | Emergency signs EN |
| `is_priority` | `boolean default false` | Highlight critical combos |
| `updated_at` | `timestamptz default now()` | Track updates |

Then **UPDATE all 23 existing rows** with the new field data, and **INSERT ~15 additional combinations** to reach ~38 total pairs covering the priority list.

## New Components

### 1. `InteractionMatrix.tsx`
Main component with two modes:

**Mobile-first Checker (default on mobile):**
- Two dropdown selectors: "Select substance 1" + "Select substance 2"
- Instant result card below showing risk level, details
- "View full matrix" toggle

**Matrix Grid (default on desktop, optional on mobile):**
- Scrollable grid with substance names on axes
- Color-coded cells (green → yellow → orange → red → dark red → gray)
- Tap cell → opens detail drawer

### 2. `InteractionDetailDrawer.tsx`
Sheet/drawer that opens when tapping a combination:
- Combination name with substance icons
- Risk level badge (color-coded)
- Interaction type tag
- "Why is this risky?" section
- Possible effects list
- Warning signs list
- Harm reduction tips
- Emergency signs
- CTA buttons: Talk to counselor, Mental health support, Emergency help, Learn about each substance

### Integration Points

**HarmReductionHub.tsx** — Add 4th tab "Interactions" (ปฏิกิริยาสาร) to the existing 3-tab layout (Substances | Safety Tips | Myth vs Fact → becomes 4 tabs).

**SubstanceProfile.tsx** — Add a "View full Interaction Matrix" link button below the existing interaction warnings section.

**HarmReduction.tsx landing page** — No changes needed (matrix lives inside Learn section).

**AdminHarmReductionContent.tsx** — Add "Matrix Views" stat card by querying `hr_nudge_events` where `nudge_type = 'matrix_view'`. Track top combos viewed.

## Data Seeding

Update existing 23 interactions with full bilingual content (summary, why_risky, effects, warning signs, HR tips, emergency signs, interaction_type, is_priority).

Insert ~15 new combinations to cover the full priority list:
- Cannabis + Alcohol (moderate)
- Cannabis + Ketamine (moderate)
- Psilocybin + Cannabis (moderate)
- MDMA + Alcohol (high)
- Amphetamine + Sildenafil (high)
- Meth + Cocaine (critical)
- Ketamine + Benzodiazepines (critical)
- GBL + Ketamine (high)
- GHB + Ketamine (already exists)
- Synthetic Cathinones + Meth (high)
- And others from the priority list not yet covered

## Analytics Tracking

Use existing `trackEvent` to log:
- `hr_matrix_view` — when matrix/checker is opened
- `hr_combo_view` — when a specific combination detail is opened (with combo data)
- `hr_combo_support_click` — when CTA is clicked from a combo detail

## UI Design

- Calm medical palette matching existing HR module
- Risk level colors: `emerald` (lower) → `amber` (caution) → `orange` (high caution) → `destructive` (high) → `destructive dark` (critical) → `muted` (unknown)
- Mobile-first substance picker with instant results
- Disclaimer banner at top: bilingual "Lower relative risk does not mean no risk"
- Bento card layout for detail sections

## Files

| Action | File |
|--------|------|
| Create | `src/components/harm-reduction/InteractionMatrix.tsx` |
| Create | `src/components/harm-reduction/InteractionDetailDrawer.tsx` |
| Modify | `src/components/harm-reduction/HarmReductionHub.tsx` — add 4th tab |
| Modify | `src/components/harm-reduction/SubstanceProfile.tsx` — add matrix link |
| Modify | `src/components/harm-reduction/SubstanceLibrary.tsx` — export interactions for matrix |
| Modify | `src/components/admin/AdminHarmReductionContent.tsx` — add matrix analytics |
| Migration | Alter `hr_substance_interactions` with new columns |
| Data | Update 23 existing + insert ~15 new interaction rows |

