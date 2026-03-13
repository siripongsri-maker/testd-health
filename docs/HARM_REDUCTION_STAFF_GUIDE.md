# testD Harm Reduction — Staff Guide

> **Version 3.0 — March 2026**
> For SWING Foundation outreach workers, counselors, clinic staff, MEL officers, and program managers.

---

## Table of Contents

1. [Overview of Harm Reduction System](#1-overview)
2. [Harm Reduction Tools](#2-tools)
3. [Personalized Harm Reduction Experience](#3-personalization)
4. [Mental Health Check-in (PHQ-4)](#4-mental-health)
5. [Service Pathway System](#5-service-pathway)
6. [Connection to SWING Clinic](#6-clinic-connection)
7. [MEL Data & Monitoring](#7-mel)
8. [Staff Use Scenarios](#8-scenarios)
9. [Safety and Communication Guidelines](#9-guidelines)

---

## 1. Overview of Harm Reduction System {#1-overview}

### What is the Harm Reduction Hub?

The Harm Reduction Hub is the central page on testD (`/harm-reduction`) where community members can access tools to reduce risks related to substance use, chemsex, and sexual health — without judgment.

### How it supports community safety

- Provides **accurate, bilingual (Thai/English) information** about substances and their interactions
- Offers **validated screening tools** so users can self-assess risk
- Connects users to **real SWING Clinic services** — booking, counseling, testing
- Supports users **before, during, and after** substance use with scenario-based planning and recovery tools

### How it connects to SWING Clinic services

Every tool in the Harm Reduction system can lead a user to SWING Clinic services. The pathway is always internal — users are never sent to external websites. All clinic links go to `/booking` or `/clinic` within testD.

### How it links to MEL tracking

Every significant action a user takes — completing a screening, creating a safety plan, requesting counseling — is recorded as a **service event**. These events feed directly into the MEL dashboard for reporting and program evaluation.

### System Flow

```
User arrives at /harm-reduction
        ↓
Age Gate (confirms 18+)
        ↓
Landing page with 5 zones:
  Hero → Pathways → Personalization → Recommendations → Trust
        ↓
User selects a pathway:
  Learn | Check | Plan | Support | Clinic
        ↓
Completes tool (screening, plan, check-in, etc.)
        ↓
Receives recommendations
        ↓
Connects to services:
  Booking → Clinic Intake → Counseling → Follow-up
        ↓
All events recorded for MEL reporting
```

---

## 2. Harm Reduction Tools {#2-tools}

### 2.1 Harm Reduction Hub

**Purpose:** Central knowledge center for substance information and harm reduction strategies.

**When to recommend:** When a community member wants to learn about substances, risks, or safer practices.

**User experience:** Browse substance profiles, read harm reduction tips, access the interaction checker and knowledge library from a single hub.

**Data captured:** Page views, substance topics accessed, navigation patterns.

**Connection to services:** Links to screening, safety planning, and counseling from within the hub.

---

### 2.2 Substance Knowledge Library

**Purpose:** Provide accurate, non-judgmental information about commonly used substances.

**When to recommend:** When a user asks "What is this substance?" or wants to understand effects, risks, and safer use tips.

**User experience:**
1. Browse or search substance profiles
2. View effects, risks, overdose signs, and harm reduction advice
3. Each profile includes bilingual content (Thai/English)

**Data captured:** Substances viewed, time spent on profiles.

**Connection to services:** Links to interaction checker, screening tools, and SWING Clinic booking.

---

### 2.3 Drug Interaction Checker (Mix Risk)

**Purpose:** Help users understand risks when combining two or more substances.

**When to recommend:** When a user says they plan to use multiple substances together, or when a peer educator is discussing mix risks during outreach.

**User experience:**
1. Select two substances from a list of 18+ options
2. View a color-coded risk level (5-point scale from "Lower relative risk" to "Critical risk")
3. Read detailed guidance: why it's risky, warning signs, harm reduction tips, emergency signs
4. Access "Common Checks" shortcuts for frequently asked combinations
5. "Recently Checked" history saved locally

**Data captured:** Substance pairs checked, risk levels viewed.

**Connection to services:** High-risk combinations link to support triage and SWING Clinic. Interaction data feeds into MEL substance-use indicators.

---

### 2.4 Scenario-Based Safety Planner

**Purpose:** Help users create a personalized safety plan based on their real-life situation.

**When to recommend:** Before a user goes out, uses substances alone, or wants recovery support after use.

**User experience:**
1. Select a scenario: "Going out tonight," "Using alone," "Recovery support," etc.
2. Answer guided adaptive questions about the situation
3. Receive a personalized plan with practical steps
4. Opt into real-time reminders: hydration, dose spacing, check-ins
5. Access "Recovery Mode" for next-day support

**Data captured:** Scenario selected, plan created (recorded as `safer_plan_created` service event), reminder opt-ins.

**Connection to services:** Plans link to support triage if risk is detected. Recovery Mode connects to follow-up and counseling.

---

### 2.5 Risk Screening Flow

**Purpose:** A validated screening tool for users to self-assess their risk level related to substance use and sexual health.

**When to recommend:** During outreach, first-time clinic visitors, or when a user expresses concern about their health.

**User experience:**
1. Answer a series of validated screening questions
2. View risk assessment results with clear explanations
3. Receive tailored recommendations based on results

**Data captured:** Screening started/completed events, risk level results, recommendations shown. All recorded as service events (`hr_screening_started`, `hr_screening_completed`).

**Connection to services:** Moderate/high risk → directed to counseling or SWING Clinic booking. Results feed into service pathway and MEL indicators.

---

### 2.6 Support Triage Hub

**Purpose:** Route users to the right support based on their immediate needs.

**When to recommend:** When a user says "I need help," is in distress, or needs to talk to someone.

**User experience:**
Five pathways are presented:
1. **Need Help Now** — urgent safety (emergency hotlines 1669/1323)
2. **Talk to Someone** — emotional support
3. **SWING Clinic** — testing, PrEP/PEP, sexual health
4. **Recovery Support** — post-use care
5. **Callback/Message Request** — staff follow-up

**Safety escalation:** If high-risk symptoms are detected (breathing issues, chest pain, loss of consciousness), the system immediately prioritizes emergency information.

**Data captured:** Pathway selected, counseling requests (`hr_counseling_requested`), callback requests. Stored in `hr_referrals` and `hr_callback_requests` tables.

**Connection to services:** Direct connection to SWING Clinic booking, counseling workflow, and staff follow-up queue.

---

### 2.7 AI Companion

**Purpose:** Provide on-demand, bilingual harm reduction information through an AI chat interface.

**When to recommend:** When a user has quick questions, wants to explore topics conversationally, or needs support outside clinic hours.

**User experience:**
- Floating chat button available on all Harm Reduction pages
- Ask questions in Thai or English
- Receive harm reduction-focused responses
- Directed to human support for complex or urgent needs

**Data captured:** Interaction sessions, topics discussed (anonymized).

**Connection to services:** AI directs users to screening, safety planning, or human counseling when appropriate.

---

### 2.8 Daily Check-in

**Purpose:** Encourage daily engagement and track wellness over time.

**When to recommend:** For users who want to monitor their wellbeing, build healthy habits, or are in a support program.

**User experience:**
1. Quick daily check-in tracking mood, stress, and sleep quality
2. View streak counter (days of consecutive check-ins)
3. Contribute to a personal Wellness Score (0–100)

**Wellness Score calculation:** Based on completed screenings, safety plans, counseling sessions, and followed health nudges.

**Data captured:** Daily entries (mood, stress, sleep), streak count, wellness score. Linked to `user_id` or `anonymous_token`.

**Connection to services:** Declining trends may trigger nudge cards or support recommendations.

---

### 2.9 Nudge Cards

**Purpose:** Gentle, timely reminders that encourage safer behavior without being intrusive.

**When to recommend:** These appear automatically based on context and user behavior.

**User experience:**
- Small notification-style cards appear on the Harm Reduction landing page
- Examples: "Stay hydrated tonight," "Have you checked in today?," "Testing reminder"
- Users can dismiss each nudge

**Data captured:** Nudges shown, nudges dismissed.

**Connection to services:** Nudges link to relevant tools — testing, check-in, clinic booking, screening.

---

## 3. Personalized Harm Reduction Experience {#3-personalization}

### Profile Personalization

Users can optionally share basic identity information through simple "identity chips" — no forms, no registration required.

**How it works:**
1. A collapsible card appears on the landing page for users without a profile
2. Users tap chips to indicate their identity/context (e.g., MSM, sex worker, youth, non-binary)
3. Profile is saved and used to tailor recommendations

### Recommendation Engine

Based on the user's profile, the system shows relevant suggestions:

| Profile | Recommendations |
|---------|----------------|
| **MSM** | HIV/STI testing, PrEP information, chemsex safety tools, SWING Clinic booking |
| **Sex workers** | Outreach support, clinic services, STI screening, legal/safety resources |
| **Youth (under 25)** | Safe information, mental health support, peer connection, age-appropriate content |

### How staff can guide personalization

- **During outreach:** "This app can show you info that's more relevant to you. You can tap a few options to personalize it — no name or account needed."
- **At the clinic:** "If you set up your preferences in the app, it will remind you about things like testing schedules and follow-ups."
- **Key point:** Personalization is always optional. The tools work without it.

---

## 4. Mental Health Check-in (PHQ-4) {#4-mental-health}

### Purpose

A brief, validated screening tool for anxiety and depression symptoms using the PHQ-4 (Patient Health Questionnaire-4).

### How scoring works

- **4 questions** covering anxiety (2) and depression (2) over the past 2 weeks
- Each scored 0–3 (Not at all → Nearly every day)
- **Total score range:** 0–12

### Distress levels

| Score | Level | System response |
|-------|-------|----------------|
| 0–2 | **Minimal** | Positive reinforcement, general wellness tips |
| 3–5 | **Mild** | Self-care suggestions, daily check-in recommendation |
| 6–8 | **Moderate** | Recommend counseling, show SWING Clinic support options |
| 9–12 | **Severe** | Urgent support pathways, safety escalation, immediate counseling referral |

### What happens when high distress is detected

1. User sees a clear, calm message acknowledging their feelings
2. Immediate support options are shown (hotlines, SWING Clinic, callback request)
3. System records `mental_health_screen_completed` service event
4. If linked to a service pathway, distress level is attached to the pathway record
5. Staff are notified through the counseling workflow queue

### Referral flow

High distress → Support Triage → Counseling request or SWING Clinic booking → Staff follow-up within 24 hours

---

## 5. Service Pathway System {#5-service-pathway}

### What is a Service Pathway?

A service pathway tracks a user's complete journey from first contact with HR tools through to clinical services and follow-up. It connects digital interactions to real-world care.

### Service Entry Cards

**What they are:** Cards presented to users asking "What brings you here today?"

**Options include:**
- Mental health support
- Clinic/testing/PrEP/PEP
- Health check
- After-use support
- Safer use information
- General support

**What happens:** Selecting a reason creates a pathway record and routes the user to the appropriate tool or service.

### Service Recommendations

After a user completes an entry selection or screening, the system shows personalized service recommendations based on:
- Reason for visit
- Distress level (if screened)
- Profile information (if personalized)

### Clinic Service Door

**Purpose:** A clear "front door" to SWING Clinic services within the app.

**User experience:**
- View available clinic services
- See opening hours and contact information
- Book an appointment directly through `/booking`
- Request a callback

**All links stay internal** — users are never redirected to external booking sites.

### Service Timeline

**Purpose:** Show logged-in users their service history.

**What it displays:**
- Past service events (screenings, bookings, counseling sessions)
- Pending follow-ups with due dates
- Status indicators (pending, completed, overdue)

**Where it appears:** On the Harm Reduction landing page for logged-in users with history.

### How service events are recorded

Every significant interaction creates a service event record:

| Event | When recorded |
|-------|--------------|
| `hr_screening_started` | User begins a screening |
| `hr_screening_completed` | User finishes a screening |
| `hr_counseling_requested` | User requests counseling |
| `swing_clinic_booking_started` | User begins a booking |
| `swing_clinic_booking_completed` | Booking confirmed |
| `mental_health_screen_completed` | PHQ-4 completed |
| `callback_requested` | User requests a callback |
| `recovery_mode_activated` | User enters recovery mode |
| `safer_plan_created` | Safety plan completed |
| `referral_accepted` / `referral_declined` | User responds to referral |

---

## 6. Connection to SWING Clinic {#6-clinic-connection}

### From digital tools to real services

The platform is designed so that every digital tool can lead to a real clinic visit. The flow is seamless and internal.

### Example user journey

```
1. User opens /harm-reduction
2. Completes risk screening → moderate risk detected
3. System recommends HIV testing + counseling
4. User taps "Book at SWING Clinic"
5. Redirected to /booking → selects branch, date, time
6. Appointment confirmed
7. On visit day:
   a. Front Desk checks user in
   b. Clinic Intake: structured health assessment
   c. Counseling session: harm reduction focus areas documented
   d. Follow-up scheduled (24h / 7d)
8. All events recorded in MEL system
```

### Key pages

| Page | Purpose |
|------|---------|
| `/harm-reduction` | Harm Reduction Hub — all tools |
| `/clinic` | SWING Clinic front door — services, hours, contact |
| `/booking` | Appointment booking — branch selection, date/time |

### SWING Clinic contact

- **Phone:** 02 632 9501
- **Hours and address:** Managed through admin dashboard (Clinic Settings)

### Front Desk workflow connection

When a user books through testD:
1. Appointment appears in the admin Front Desk queue
2. Staff can manage check-in, routing, and status updates
3. Clinic Intake captures structured assessment
4. Counseling Workflow documents session focus and action plan
5. Follow-up events are auto-scheduled

---

## 7. MEL Data & Monitoring {#7-mel}

### What the system captures

The Harm Reduction system automatically records data that feeds into MEL reporting:

| Data type | Examples |
|-----------|---------|
| **Service events** | Screenings completed, plans created, bookings made, counseling requested |
| **Screening results** | Risk levels, PHQ-4 scores, distress categories |
| **Pathway outcomes** | Entry reason, services accessed, referral status, completion |
| **Referrals** | Type, acceptance/decline, destination |
| **Follow-ups** | Scheduled date, completion status, type |
| **Engagement** | Daily check-ins, wellness scores, substance topics accessed |

### Identity model

- **Logged-in users:** Events linked to `user_id`
- **Anonymous users:** Events linked to `anonymous_token`
- This allows tracking service delivery without requiring user accounts

### How MEL teams use this data

1. **Service Ledger tab:** View all recorded service events with filters by date, type, and branch
2. **Indicators tab:** Track progress against program indicators (e.g., "number of screenings completed this quarter")
3. **Reporting tab:** Generate period-based reports for donors and stakeholders
4. **Export:** CSV export with UTF-8/BOM support for external analysis

### Key MEL indicators supported

- Number of harm reduction screenings completed
- Number of safety plans created
- Number of mental health screenings (PHQ-4)
- Number of counseling referrals made and accepted
- Number of clinic bookings originating from HR tools
- Follow-up completion rates
- Substance interaction checks performed

---

## 8. Staff Use Scenarios {#8-scenarios}

### Scenario 1: Peer educator helping with drug interaction risks

> **Setting:** Community outreach event
>
> **Situation:** A community member asks about mixing crystal meth with alcohol.
>
> **Steps:**
> 1. Open testD → Harm Reduction → "Learn" pathway
> 2. Open the Drug Interaction Checker
> 3. Select "Crystal Meth" and "Alcohol"
> 4. Review the risk level and harm reduction tips together
> 5. Share the practical advice shown on screen
> 6. If the person wants more help, guide them to the Support section or suggest booking at SWING Clinic
>
> **Data recorded:** Interaction check event

---

### Scenario 2: Counselor using mental health check-in

> **Setting:** SWING Clinic counseling room
>
> **Situation:** A client mentions feeling anxious and low energy. The counselor wants to do a brief assessment.
>
> **Steps:**
> 1. Open testD → Harm Reduction → select "Mental health support" from Service Entry
> 2. Guide the client through the PHQ-4 questions
> 3. Review the score together
> 4. If moderate/severe: discuss support options, schedule follow-up
> 5. Document in Counseling Workflow
>
> **Data recorded:** `mental_health_screen_completed`, distress level, counseling session notes, follow-up scheduled

---

### Scenario 3: User planning safer substance use

> **Setting:** User at home, planning for a party
>
> **Situation:** User wants to prepare a safety plan before going out.
>
> **Steps:**
> 1. User opens testD → Harm Reduction → "Plan" pathway
> 2. Selects scenario: "Going out tonight"
> 3. Answers guided questions about plans, substances, location
> 4. Receives personalized safety plan with reminders
> 5. Opts into hydration and dose-spacing notifications
> 6. Next day: accesses Recovery Mode for after-care tips
>
> **Data recorded:** `safer_plan_created`, scenario type, reminder opt-ins, recovery mode activation

---

### Scenario 4: User referred to SWING Clinic

> **Setting:** User completes risk screening on testD
>
> **Situation:** Screening shows elevated risk for STI. System recommends clinic visit.
>
> **Steps:**
> 1. User completes screening → results show moderate risk
> 2. System displays recommendation: "Visit SWING Clinic for testing"
> 3. User taps "Book appointment"
> 4. Selects branch, date, time on `/booking`
> 5. Receives confirmation
> 6. On visit day: Front Desk checks in → Intake → Testing → Follow-up
>
> **Data recorded:** Screening results, recommendation shown, booking created, clinic visit completed, follow-up scheduled

---

### Scenario 5: Outreach worker using HR tools during community engagement

> **Setting:** Drop-in center or outreach booth
>
> **Situation:** An outreach worker is engaging with community members who want to learn about harm reduction.
>
> **Steps:**
> 1. Open testD → Harm Reduction landing page
> 2. Show the Substance Knowledge Library for education
> 3. Use the Interaction Checker for specific questions
> 4. Help interested individuals personalize their profile (optional, no account needed)
> 5. For anyone wanting clinic services, guide them through the Service Entry cards
> 6. For anyone in distress, use the Support Triage Hub
>
> **Data recorded:** Page views, interaction checks, service entries, support requests

---

## 9. Safety and Communication Guidelines {#9-guidelines}

### Non-stigmatizing language

| ❌ Avoid | ✅ Use instead |
|----------|---------------|
| Drug abuser / addict | Person who uses substances |
| Clean / dirty (for test results) | Negative / positive / reactive |
| Substance abuse | Substance use |
| Getting clean | Recovery / reducing use |
| Junkie | Community member / participant |
| Risky behavior | Risk factors / situations with higher risk |

### Privacy protection

- **Never share a user's screening results** with others without consent
- **Anonymous access is always available** — users don't need accounts
- **Don't look at someone's phone screen** without permission
- **If helping someone use the tools in person**, let them hold the device
- **All data is stored securely** and linked by anonymous tokens when no account exists

### How to introduce the tools

**Good approaches:**
- "We have a free app with info about substances and how to stay safer — want to take a look?"
- "This tool can check if mixing certain substances is risky — it's private and you don't need to sign up."
- "If you ever want to check in on how you're feeling, there's a quick daily check-in here."

**Avoid:**
- Pressuring anyone to use the tools
- Making assumptions about someone's substance use
- Using the tools to judge or diagnose

### When to recommend clinic support

Recommend SWING Clinic when:
- Screening results show moderate or high risk
- PHQ-4 score is 6 or above
- User expresses distress or mentions self-harm
- User asks about PrEP, PEP, HIV testing, or STI testing
- User requests a callback or wants to talk to someone
- Drug interaction checker shows "Critical risk" or "Dangerous" combinations

**Always frame clinic visits positively:**
- "SWING Clinic is here for you whenever you're ready"
- "You can book a time that works for you — it's free and confidential"
- "The team at the clinic understands and won't judge"

### Emergency situations

If someone is in immediate danger:
1. **Call 1669** (Thai emergency services) or **1323** (mental health crisis line)
2. Stay with the person if safe to do so
3. Use the Support Triage Hub → "Need Help Now" for on-screen emergency guidance
4. Document the incident through appropriate channels after the situation is resolved

---

## Quick Reference

| Tool | Path | Purpose |
|------|------|---------|
| Harm Reduction Hub | `/harm-reduction` → Learn | Knowledge & education |
| Interaction Checker | `/harm-reduction` → Learn → Interactions | Mix risk assessment |
| Risk Screening | `/harm-reduction` → Check | Validated self-assessment |
| Safety Planner | `/harm-reduction` → Plan | Scenario-based planning |
| Support Triage | `/harm-reduction` → Support | Get help / connect to care |
| Mental Health Check-in | Service Entry → Mental Health | PHQ-4 screening |
| Daily Check-in | `/harm-reduction` landing | Mood/stress/sleep tracking |
| SWING Clinic | `/clinic` | Service front door |
| Booking | `/booking` | Appointment scheduling |

---

*This guide is maintained by the testD platform team. For questions or updates, contact the program coordinator.*

*Last updated: March 2026 — Version 3.0*
