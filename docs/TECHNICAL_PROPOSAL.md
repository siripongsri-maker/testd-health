# SWING Thailand Digital Health Platform
## Technical Proposal & System Documentation

**Version:** 1.0  
**Date:** February 2026  
**Platform:** https://testd-health.lovable.app

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Features](#platform-features)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Security Architecture](#security-architecture)
7. [User Journey: HIV Self-Test](#user-journey-hiv-self-test)
8. [API Documentation](#api-documentation)
9. [Technology Stack](#technology-stack)

---

## Executive Summary

The SWING Thailand Digital Health Platform is a Progressive Web Application (PWA) designed to support HIV prevention, testing, and care services. Built with modern web technologies and a security-first approach, the platform serves multiple user segments including community members, healthcare staff, and administrators.

### Key Capabilities

- **HIV Self-Test Kit Ordering** - Complete flow from request to AI-powered result analysis
- **Medication Tracking** - PrEP and PEP adherence monitoring with reminders
- **Gamification System** - XP, levels, badges, and quests to encourage engagement
- **Community Features** - Anonymous chat rooms and interest-based connections
- **Admin Suite** - Branch-specific management for Silom and Pattaya locations
- **Multi-language Support** - Thai and English with AI-powered translation

---

## Platform Features

### 1. HIV Self-Test Kit Service

| Feature | Description |
|---------|-------------|
| Branch Routing | Automatic assignment to Silom or Pattaya based on geography |
| NHSO Verification | Thai National ID validation with checksum algorithm |
| Guest-First Registration | Deferred account creation at NHSO verification point |
| AI Result Analysis | Computer vision detection of test line results |
| Callback Consent | Privacy-first reactive result follow-up system |

### 2. Medication Tracking

| Feature | Description |
|---------|-------------|
| PrEP Daily | Daily reminder system with streak tracking |
| PrEP On-Demand | Event-driven dosing schedule (2-1-1 protocol) |
| PEP Emergency | 28-day countdown with adherence monitoring |
| Check-in Rewards | XP and badge rewards for consistent adherence |

### 3. Gamification Engine

| Component | Details |
|-----------|---------|
| XP System | Points earned through check-ins, surveys, articles |
| Levels | Progressive unlocking based on total XP |
| Badges | Achievement-based rewards (streaks, milestones) |
| Quests | Daily, weekly, and special challenge objectives |
| Leaderboard | Community rankings with seasonal snapshots |
| Hall of Fame | Permanent recognition for top performers |

### 4. Community Hub

| Feature | Description |
|---------|-------------|
| Chat Rooms | Topic-based anonymous discussions |
| Interest Tags | User-selected topics for personalized content |
| Blog Articles | Community-written content with admin review |
| Surveys | XP-rewarded research participation |

### 5. Admin Management Suite

| Module | Capabilities |
|--------|--------------|
| Dashboard | Key metrics, recent activity, alerts |
| Kit Orders | Order lifecycle management with tracking |
| Branch Staff | Provision location-specific moderator accounts |
| User Management | Role assignment, password resets |
| Analytics | Page views, sessions, device breakdown |
| Blog Management | Article review and publication workflow |
| Notifications | System-wide and targeted announcements |

### 6. Progressive Web App Features

| Feature | Implementation |
|---------|----------------|
| Offline Support | Service Worker with Workbox |
| Install Prompt | Native app-like installation |
| Push Notifications | Medication reminders (planned) |
| Responsive Design | Mobile-first with tablet/desktop adaptation |

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  React 18 PWA   │  │  Service Worker │  │  Local Storage  │  │
│  │  TypeScript     │  │  Workbox        │  │  Zustand        │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STATE MANAGEMENT                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  React Query    │  │  Zustand Store  │  │  React Context  │  │
│  │  Server Cache   │  │  Client State   │  │  Theme/i18n     │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND GATEWAY                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Supabase Client │  │  Auth Module    │  │  RLS Engine     │  │
│  │ @supabase/js    │  │  JWT Sessions   │  │  Policy Filter  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EDGE FUNCTIONS                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │analyze-hiv-  │ │translate-    │ │create-branch-│             │
│  │test          │ │article       │ │staff         │             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
│         │                │                │                      │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────┴───────┐             │
│  │admin-reset-  │ │kit-orders   │ │scrape-shopee-│             │
│  │password      │ │             │ │images        │             │
│  └──────────────┘ └─────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL 15  │  │  Database Views │  │  DB Functions   │  │
│  │  Primary Store  │  │  Aggregations   │  │  Business Logic │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │avatars       │ │blog-images   │ │selftest-     │             │
│  │(public)      │ │(public)      │ │results       │             │
│  │              │ │              │ │(private)     │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── admin/                 # Admin panel components
│   ├── hiv-selftest/          # Self-test flow components
│   └── [shared components]    # Reusable UI elements
├── pages/
│   ├── Admin.tsx              # Admin dashboard
│   ├── HIVSelfTest.tsx        # Self-test wizard
│   ├── Dashboard.tsx          # User home
│   └── [other pages]
├── hooks/
│   ├── useAuth.tsx            # Authentication state
│   ├── useAnalytics.ts        # Event tracking
│   └── [custom hooks]
├── lib/
│   ├── i18n.ts                # Internationalization
│   ├── badges.ts              # Badge definitions
│   └── [utilities]
└── integrations/
    └── supabase/
        ├── client.ts          # Supabase client
        └── types.ts           # Generated types
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   auth.users    │────▶│    profiles     │────▶│  user_roles     │
│   (Supabase)    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ user_interests  │     │  user_quests    │     │staff_branch_    │
│                 │     │                 │     │assignments      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │                      ▼
         │              ┌─────────────────┐
         │              │     quests      │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│hiv_selftest_    │────▶│  selftest_pii   │     │   kit_orders    │
│requests         │     │  (sensitive)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │kit_order_events │
                                                └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ blog_articles   │────▶│blog_categories  │     │ article_likes   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│article_comments │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   chat_rooms    │────▶│ chat_messages   │     │    surveys      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │survey_completions│
                                                └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  notifications  │────▶│notification_    │     │analytics_events │
│                 │     │reads            │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Core Tables

#### User Management

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profile data | display_name, xp, level, streak, badges, mode |
| `user_roles` | RBAC assignments | user_id, role (admin/moderator/user) |
| `user_interests` | Topic preferences | user_id, tag |
| `user_personal_info` | Health profile | gender, dob, hiv_status, prep_status |
| `staff_branch_assignments` | Branch access | user_id, branch (silom/pattaya) |

#### HIV Self-Test System

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `hiv_selftest_requests` | Order tracking | status, assigned_branch, test_result |
| `selftest_pii` | Sensitive data | thai_id, full_name, address, phone |
| `kit_orders` | Generic orders | order_code, status, tracking_number |
| `kit_order_events` | Audit trail | event_type, created_by |

#### Gamification

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `quests` | Quest definitions | title, target_count, reward_xp, badge_id |
| `user_quests` | User progress | progress, completed, claimed_at |
| `leaderboard_snapshots` | Historical rankings | season_key, rank, xp |
| `hall_of_fame` | Permanent records | season_key, category, score |

#### Content & Community

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `blog_articles` | Articles | title_th/en, content_th/en, status |
| `blog_categories` | Categories | name_th/en, icon, slug |
| `article_likes` | Engagement | article_id, user_id |
| `article_comments` | Discussions | article_id, content, author_name |
| `chat_rooms` | Chat channels | name_th/en, slug, is_active |
| `chat_messages` | Messages | room_id, content, nickname |
| `surveys` | Research surveys | title, url, xp_reward |
| `survey_completions` | Completions | survey_id, user_id, xp_awarded |

#### System

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `notifications` | Announcements | title, message, recipient_user_id |
| `notification_reads` | Read status | notification_id, user_id, dismissed |
| `analytics_events` | Page tracking | event_type, page_path, session_id |
| `analytics_daily_summary` | Aggregated stats | date, total_pageviews, unique_sessions |

### Database Views

| View | Purpose |
|------|---------|
| `leaderboard_profiles` | Public leaderboard data (no sensitive info) |
| `kit_order_tracking` | Order status for users (no internal notes) |
| `public_site_stats` | Aggregate site statistics |
| `selftest_statistics` | Anonymized demographic data |

### Database Functions

| Function | Purpose |
|----------|---------|
| `has_role(user_id, role)` | Check user role membership |
| `is_branch_staff(user_id, branch)` | Verify branch assignment |
| `validate_thai_id(id)` | Checksum validation for Thai National ID |
| `complete_survey(survey_id)` | Award XP and record completion |
| `generate_order_code()` | Create unique 8-character order codes |
| `get_selftest_statistics()` | Anonymized age/gender breakdown |

---

## Data Flow Architecture

### User Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│  Supabase   │────▶│    RLS      │────▶│ PostgreSQL  │
│   Frontend  │     │   Client    │     │   Engine    │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Zustand   │     │    JWT      │     │   Policy    │     │   Rows      │
│   Store     │     │   Token     │     │   Check     │     │   Filtered  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### HIV Self-Test Data Flow

```
Step 1: Request Submission
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  NHSO    │────▶│  Create  │────▶│  Branch  │
│  Entry   │     │  Verify  │     │  Account │     │  Assign  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │
                      ▼
              ┌──────────────┐
              │ selftest_pii │
              │   (PII)      │
              └──────────────┘

Step 2: Order Fulfillment
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Staff   │────▶│  Pack    │────▶│  Ship    │────▶│ Deliver  │
│  Review  │     │  Kit     │     │  Track   │     │ Confirm  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘

Step 3: Result Analysis
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Photo   │────▶│  Upload  │────▶│   AI     │────▶│  Result  │
│  Capture │     │  Storage │     │ Analysis │     │  Display │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │ Gemini 2.5   │
                               │ Vision API   │
                               └──────────────┘
```

### Gamification Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Action │────▶│ Quest Check  │────▶│ Update       │
│  (check-in)  │     │ (triggers)   │     │ user_quests  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                           ┌─────────────────────┤
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Award XP    │     │ Grant Badge  │
                    │  to profile  │     │  if earned   │
                    └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Recalculate │
                    │  Level       │
                    └──────────────┘
```

---

## Security Architecture

### Security Layers

```
Layer 1: Network Security
┌─────────────────────────────────────────────────────────────────┐
│  HTTPS/TLS 1.3 │ CORS Policy │ Rate Limiting │ DDoS Protection │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 2: Authentication
┌─────────────────────────────────────────────────────────────────┐
│  JWT Tokens │ Session Management │ Secure Password Storage      │
│  30-day expiry │ localStorage │ bcrypt hashing                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 3: Authorization (RBAC)
┌─────────────────────────────────────────────────────────────────┐
│  user_roles table │ has_role() function │ is_branch_staff()    │
│  admin │ moderator │ user                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 4: Row Level Security (RLS)
┌─────────────────────────────────────────────────────────────────┐
│  25+ policies │ auth.uid() checks │ Role-based visibility      │
│  USING clauses │ WITH CHECK │ Branch filtering                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 5: Data Protection
┌─────────────────────────────────────────────────────────────────┐
│  PII isolation │ Encrypted storage │ Audit logging             │
│  selftest_pii table │ Private buckets │ kit_order_events       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 6: Edge Function Security
┌─────────────────────────────────────────────────────────────────┐
│  JWT validation │ Admin role checks │ Input sanitization       │
│  Character limits │ Rate throttling │ Error handling           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
Layer 7: Storage Security
┌─────────────────────────────────────────────────────────────────┐
│  Bucket policies │ User folder isolation │ Signed URLs         │
│  selftest-results (private) │ avatars (public)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Role-Based Access Control

| Role | Capabilities |
|------|--------------|
| **admin** | Full system access, user management, all branches |
| **moderator** | Branch-specific access, kit order management |
| **user** | Own data access, community participation |

### RLS Policy Examples

```sql
-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Branch staff can only see assigned branch requests
CREATE POLICY "Branch staff view assigned requests"
ON hiv_selftest_requests FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  is_branch_staff(auth.uid(), assigned_branch)
);

-- PII access restricted to branch staff for their requests
CREATE POLICY "Branch staff access PII"
ON selftest_pii FOR SELECT
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin') OR
  is_branch_staff_for_request(auth.uid(), id)
);
```

### Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| SQL Injection | Parameterized queries via Supabase client |
| XSS | React automatic escaping, CSP headers |
| CSRF | SameSite cookies, CORS policy |
| Data Exposure | RLS policies, view-based access |
| Brute Force | Rate limiting, account lockout |
| Session Hijacking | Secure cookies, JWT rotation |

---

## User Journey: HIV Self-Test

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    HIV SELF-TEST USER JOURNEY                    │
└─────────────────────────────────────────────────────────────────┘

Step 1: Entry
┌──────────────────────────────────────────────────────────────┐
│  User visits /hiv-selftest                                    │
│  ├─ New user? → Start wizard                                  │
│  └─ Returning user? → Check existing request status           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 2: Branch Selection
┌──────────────────────────────────────────────────────────────┐
│  Select service branch:                                       │
│  ├─ สวิงซิลม (Silom) - Bangkok metropolitan area             │
│  └─ สวิงพัทยา (Pattaya) - Eastern seaboard region            │
│                                                               │
│  → Saves: assigned_branch                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 3: NHSO Verification (Account Creation)
┌──────────────────────────────────────────────────────────────┐
│  Collect required information:                                │
│  ├─ Thai National ID (13 digits, checksum validated)         │
│  ├─ Full Name (Thai)                                          │
│  ├─ Date of Birth                                             │
│  └─ Gender (inclusive options)                                │
│                                                               │
│  System actions:                                              │
│  ├─ Validate Thai ID checksum                                 │
│  ├─ Create auth account ({id}@swingth.local)                 │
│  ├─ Generate secure 16-char random password                  │
│  ├─ Save PII to selftest_pii table                           │
│  └─ Create hiv_selftest_request record                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 4: Shipping Information
┌──────────────────────────────────────────────────────────────┐
│  Collect delivery address:                                    │
│  ├─ Province (dropdown from Thailand geography)              │
│  ├─ District                                                  │
│  ├─ Subdistrict                                               │
│  ├─ Postal Code (auto-populated)                             │
│  ├─ Full Address                                              │
│  └─ Phone Number                                              │
│                                                               │
│  → Updates: selftest_pii with address                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 5: Account Success
┌──────────────────────────────────────────────────────────────┐
│  Display generated credentials:                               │
│  ├─ Username (Thai ID-based email)                           │
│  ├─ Password (with copy button)                              │
│  └─ Option to change password                                │
│                                                               │
│  Request status: "pending" → awaiting staff review           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 6: Staff Processing (Admin Side)
┌──────────────────────────────────────────────────────────────┐
│  Branch staff actions:                                        │
│  ├─ Review request details                                    │
│  ├─ Approve/reject request                                    │
│  ├─ Pack kit for shipping                                     │
│  ├─ Add tracking number                                       │
│  └─ Update status through lifecycle                          │
│                                                               │
│  Status flow: pending → approved → shipped → delivered       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 7: Kit Delivery & Testing
┌──────────────────────────────────────────────────────────────┐
│  User receives kit:                                           │
│  ├─ Track order via /track-order                             │
│  ├─ Perform self-test following instructions                 │
│  └─ Wait for result window                                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 8: Result Submission
┌──────────────────────────────────────────────────────────────┐
│  Photo capture and upload:                                    │
│  ├─ Camera access for result photo                           │
│  ├─ Upload to selftest-results bucket                        │
│  └─ Trigger AI analysis                                       │
│                                                               │
│  AI Analysis (analyze-hiv-test edge function):               │
│  ├─ Send image to Gemini 2.5 Flash Vision                    │
│  ├─ Detect C line (Control) and T line (Test)               │
│  └─ Return: negative | positive | invalid                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 9: Result Display & Follow-up
┌──────────────────────────────────────────────────────────────┐
│  Based on result:                                             │
│                                                               │
│  NEGATIVE:                                                    │
│  ├─ Display reassuring message                               │
│  ├─ Recommend regular testing schedule                       │
│  └─ Offer PrEP information                                    │
│                                                               │
│  POSITIVE/REACTIVE:                                           │
│  ├─ Display supportive message                               │
│  ├─ Explain confirmatory testing need                        │
│  ├─ Offer callback consent                                    │
│  │   ├─ Privacy disclaimer                                    │
│  │   ├─ Phone number collection (optional)                   │
│  │   └─ Staff follow-up scheduling                           │
│  └─ Provide resource links                                    │
│                                                               │
│  INVALID:                                                     │
│  ├─ Explain possible causes                                   │
│  └─ Option to request replacement kit                        │
└──────────────────────────────────────────────────────────────┘
```

### Gender Options (Thai)

| Thai | English | Code |
|------|---------|------|
| ชาย | Male | male |
| หญิง | Female | female |
| ชายข้ามเพศ | Transgender Male | transgender_male |
| หญิงข้ามเพศ | Transgender Female | transgender_female |
| ไม่ระบุเพศ | Non-binary | non_binary |
| ไม่ต้องการระบุ | Prefer not to say | prefer_not_to_say |

---

## API Documentation

### Edge Functions

#### 1. analyze-hiv-test

Analyzes HIV self-test result photos using AI vision.

**Endpoint:** `POST /functions/v1/analyze-hiv-test`

**Authentication:** Required (JWT)

**Request:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response:**
```json
{
  "result": "negative",
  "rawResponse": "negative"
}
```

**Result Values:**
- `negative` - Only C line visible
- `positive` - Both C and T lines visible
- `invalid` - C line not visible

---

#### 2. translate-article

Translates article content between Thai and English.

**Endpoint:** `POST /functions/v1/translate-article`

**Authentication:** Required (Admin only)

**Request:**
```json
{
  "articleId": "uuid",
  "sourceLanguage": "th",
  "targetLanguage": "en"
}
```

---

#### 3. create-branch-staff

Creates a new branch staff account.

**Endpoint:** `POST /functions/v1/create-branch-staff`

**Authentication:** Required (Admin only)

**Request:**
```json
{
  "username": "staff_silom_01",
  "password": "secure_password",
  "branch": "silom",
  "displayName": "Silom Staff 1"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "staff_silom_01",
    "email": "staff_silom_01@swingth.local",
    "branch": "silom"
  }
}
```

---

#### 4. admin-reset-password

Resets a user's password (admin function).

**Endpoint:** `POST /functions/v1/admin-reset-password`

**Authentication:** Required (Admin only)

---

#### 5. kit-orders

Manages kit order operations.

**Endpoint:** `POST /functions/v1/kit-orders`

**Authentication:** Public (webhook compatible)

---

### Database Functions (RPC)

#### complete_survey

Records survey completion and awards XP.

```typescript
const { data } = await supabase.rpc('complete_survey', {
  p_survey_id: 'uuid',
  p_session_id: 'optional_session_id'
});
```

#### get_selftest_statistics

Returns anonymized demographic statistics.

```typescript
const { data } = await supabase.rpc('get_selftest_statistics');
// Returns: { total_count, gender_stats, age_stats }
```

#### validate_thai_id

Validates Thai National ID checksum.

```typescript
const { data } = await supabase.rpc('validate_thai_id', {
  thai_id: '1234567890123'
});
// Returns: boolean
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | Component Library |
| React Router | 6.30.1 | Routing |
| React Query | 5.83.0 | Server State |
| Zustand | 5.0.9 | Client State |
| React Hook Form | 7.61.1 | Form Handling |
| Zod | 3.25.76 | Validation |

### Backend (Supabase)

| Component | Purpose |
|-----------|---------|
| PostgreSQL 15 | Primary Database |
| PostgREST | REST API |
| GoTrue | Authentication |
| Realtime | WebSocket subscriptions |
| Storage | File management |
| Edge Functions | Serverless compute (Deno) |

### AI Services

| Service | Model | Purpose |
|---------|-------|---------|
| Lovable AI Gateway | Gemini 2.5 Flash | HIV test image analysis |
| Lovable AI Gateway | Gemini 2.5 Flash | Article translation |

### Infrastructure

| Component | Provider |
|-----------|----------|
| Hosting | Lovable Cloud |
| CDN | Global edge network |
| Database | Managed PostgreSQL |
| Storage | S3-compatible object storage |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| PWA Plugin | Offline support |
| Workbox | Service worker |

---

## Appendix

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `LOVABLE_API_KEY` | AI gateway access |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations |

### Deployment

The platform is deployed on Lovable Cloud with:
- Automatic HTTPS
- Global CDN distribution
- Zero-downtime deployments
- Automatic database backups

### Support

For technical inquiries:
- Platform: SWING Thailand
- URL: https://testd-health.lovable.app

---

*Document generated: February 2026*
*Platform Version: 1.0*
