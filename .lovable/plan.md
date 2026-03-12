

# Plan: Extend Harm Reduction Module with 5 Prevention Features

## Overview

Add five new features to the existing Harm Reduction module: AI Companion, Dose Timer, Behavioral Nudges, Mental Health Early Warning, and Anonymous Peer Support. All integrate with the existing section-based architecture in `HarmReduction.tsx`.

## Architecture

The current module uses a `Section` type to switch between views. We extend this with new sections and add a floating AI companion accessible from all sections.

```text
HarmReduction.tsx (router)
├── landing (existing) — add 2 new cards: "Peers" + "AI Chat"
├── learn (existing HarmReductionHub)
├── check (existing RiskScreening) — add DistressDetection post-result
├── plan (existing SaferUsePlanner) — embed DoseTimer
├── support (existing CounselingReferral)
├── peers (NEW — PeerSupport)
└── AICompanion (floating drawer, available everywhere)
```

## Database Changes (Migration)

New tables:

- **`hr_ai_conversations`** — logs anonymized AI companion usage (user_id nullable, message_count, created_at)
- **`hr_dose_logs`** — local-first but optionally synced (user_id, substance, dose_time, created_at)
- **`hr_nudge_events`** — tracks nudge impressions/dismissals (user_id nullable, nudge_type, action, created_at)
- **`hr_distress_alerts`** — mental health escalation events (user_id nullable, trigger_type, action_taken, created_at)
- **`hr_peer_posts`** — anonymous peer support posts (id, anonymous_token, content, is_approved, is_flagged, created_at)
- **`hr_peer_replies`** — replies to peer posts (id, post_id FK, anonymous_token, content, is_approved, is_flagged, created_at)

RLS: All tables allow anonymous inserts. Select on peer posts limited to `is_approved = true`. Admin full access via `has_role`.

## New Edge Function

**`supabase/functions/hr-ai-companion/index.ts`**
- Uses Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Thai-first system prompt with harm reduction guardrails
- Explicitly blocks drug preparation instructions, sourcing, illegal content
- Accepts `messages[]` array, returns AI response
- No JWT required (anonymous access allowed for harm reduction)
- Logs usage to `hr_ai_conversations`
- Add to `config.toml`: `[functions.hr-ai-companion] verify_jwt = false`

## New Components

### 1. AICompanion.tsx (`src/components/harm-reduction/AICompanion.tsx`)
- Floating chat button (bottom-right, above bottom nav)
- Opens as a drawer/sheet
- Streaming chat interface using Lovable AI via the edge function
- Pre-filled quick questions: "Is this drug combination risky?", "I feel anxious after using", etc.
- Bilingual TH/EN
- Anonymous — no login required
- Tracks `hr_ai_usage` analytics event

### 2. DoseTimer.tsx (`src/components/harm-reduction/DoseTimer.tsx`)
- Embedded inside SaferUsePlanner as a new card section
- Log substance type from predefined list + last dose time
- Shows countdown to next safe interval (configurable per substance)
- Warning if logging dose too soon: "กรุณารอก่อนใช้โดสถัดไป"
- Data stored in localStorage, optionally synced if logged in
- Tracks `hr_dose_logged` event

### 3. SafetyNudges.ts (`src/lib/SafetyNudges.ts`) + NudgeCard component
- Time-based nudge engine (checks day of week, hour)
- Post-screening nudges based on risk level
- Nudge types: hydration, condom, HIV test reminder
- Renders as dismissible cards on the HR landing page
- Respects user preference stored in localStorage (`hr_nudges_disabled`)
- Tracks `hr_nudge_shown` / `hr_nudge_dismissed` events

### 4. DistressDetection logic (inside RiskScreening.tsx)
- After screening results, if mental health scores are high (anxiety + depression >= 8), show distress intervention card
- Supportive message: "คุณไม่จำเป็นต้องเผชิญสิ่งนี้คนเดียว"
- Action buttons: Talk to counselor, Request callback, Breathing exercise
- Animated 4-7-8 breathing widget (reuse pattern from YouthSafePage)
- Logs `hr_distress_detected` event

### 5. PeerSupport.tsx (`src/components/harm-reduction/PeerSupport.tsx`)
- New section accessible from HR landing page
- Anonymous post submission (no login required, uses anonymous_token)
- View approved posts only
- Reply to posts
- Content filter: client-side keyword blocking for drug selling/sourcing terms
- Admin moderation: add tab in `AdminHarmReductionContent.tsx` for post approval/flagging

## Modified Files

| File | Changes |
|------|---------|
| `src/pages/HarmReduction.tsx` | Add `peers` section, import PeerSupport + AICompanion, add landing card for Peers, render floating AI button |
| `src/components/harm-reduction/SaferUsePlanner.tsx` | Import and embed DoseTimer component |
| `src/components/harm-reduction/RiskScreening.tsx` | Add distress detection card after results |
| `src/components/admin/AdminHarmReductionContent.tsx` | Add tabs for Peer moderation + AI/nudge/distress analytics |
| `supabase/config.toml` | Add `hr-ai-companion` function config |

## Safety Guardrails

- AI companion system prompt explicitly refuses drug preparation, sourcing, illegal activity
- Peer support has client-side keyword filter + admin approval gate
- Dose timer warns against too-frequent dosing without enabling it
- All features work without login (harm reduction accessibility priority)
- No PII collected in peer support (anonymous tokens only)

## Admin Dashboard Additions

Add to existing `AdminHarmReductionContent.tsx`:
- AI companion usage count
- Dose timer usage count
- Nudge engagement rate
- Distress alert count
- Peer posts pending moderation count + approval interface

