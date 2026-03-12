

# Plan: Expand Substance Knowledge Library to 18 Profiles

## Current State
- Database tables `hr_substances` and `hr_substance_interactions` already exist with correct schema
- UI components (`SubstanceLibrary`, `SubstanceProfile`, `HarmReductionHub`) are fully built and functional
- 6 substances currently seeded: Methamphetamine, GHB, Ketamine, MDMA, Poppers, Alcohol
- 7 interaction warnings exist

## What Needs to Be Done

**This is purely a data expansion task.** No UI or schema changes are needed — the existing components will automatically display new substances once inserted.

### 12 New Substances to Add

| # | Substance | Category | Slug |
|---|-----------|----------|------|
| 1 | GBL | Depressants | `gbl` |
| 2 | Cocaine | Stimulants | `cocaine` |
| 3 | Crack Cocaine | Stimulants | `crack-cocaine` |
| 4 | Mephedrone (4-MMC) | Stimulants | `mephedrone` |
| 5 | Amphetamine / Speed | Stimulants | `amphetamine` |
| 6 | Cannabis | Cannabinoids | `cannabis` |
| 7 | LSD | Psychedelics | `lsd` |
| 8 | Psilocybin Mushrooms | Psychedelics | `psilocybin` |
| 9 | Benzodiazepines | Depressants | `benzodiazepines` |
| 10 | Sildenafil / Viagra | Sexual Enhancement | `sildenafil` |
| 11 | Tadalafil / Cialis | Sexual Enhancement | `tadalafil` |
| 12 | Synthetic Cathinones | Stimulants | `synthetic-cathinones` |

Each substance will include complete bilingual (TH/EN) data for all profile fields: overview, routes of use, duration timeline, short/mid/long-term effects, withdrawal symptoms, harm reduction tips, and emergency signs, plus risk scores (addiction, heart, mental health on 1-5 scale).

### New Interaction Warnings (~15-20 additional)

Key combinations to document:
- GHB + Alcohol → critical (respiratory depression)
- GHB + Benzodiazepines → critical
- Cocaine + Alcohol → high (cocaethylene formation)
- Cocaine + Sildenafil/Viagra → high (cardiovascular strain)
- MDMA + Amphetamine → high (serotonin syndrome risk)
- Meth + Sildenafil → high (cardiac stress)
- LSD + Cannabis → moderate (amplified anxiety)
- Benzodiazepines + Alcohol → critical
- GBL + Alcohol → critical
- Poppers + Sildenafil/Tadalafil → critical (severe hypotension)
- And more relevant chemsex combinations

### Implementation

Single database migration containing INSERT statements for all 12 substances and ~18 new interactions. No code changes required — the existing `SubstanceLibrary` component fetches all active substances dynamically.

### No UI Changes Needed

The existing components handle everything:
- `SubstanceLibrary.tsx` — grid with search, category grouping, risk badges
- `SubstanceProfile.tsx` — collapsible sections, risk bars, interaction warnings, CTA cards
- `HarmReductionHub.tsx` — tab navigation with substance library tab

