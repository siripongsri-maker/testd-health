

# Virtual Mode — Lightweight 2D Service Hub

## Summary

Add a "Virtual Mode" toggle to the app that opens a new `/virtual` route — a friendly, mobile-first 2D service hub where users tap illustrated service zones to navigate to existing testD features. No backend changes. No existing page modifications beyond adding one route and one nav toggle.

## What Already Exists

- **TownHub page** (`src/pages/TownHub.tsx`) + `TownBuilding` / `IsometricBuilding` components — heavy pixel-art style, not currently routed. Too game-like for this use case but confirms the pattern works.
- **HomeActionGrid** — maps services to routes (`/hiv-selftest`, `/booking`, `/invite`, `/surveys`, `/info`, `/self-care`, `/prevention-match`, `/harm-reduction`, `/community`, `/support-chat`).
- **AppLayout** — sticky top bar + bottom nav. Virtual Mode page will use AppLayout normally.
- **BottomNav** — 5 tabs (Home, Test, Bookings, Learn, Care).

## Architecture

### New Files

1. **`src/config/virtualZones.ts`** — Zone configuration mapping
2. **`src/pages/VirtualMode.tsx`** — The virtual hub page
3. **`src/components/virtual/VirtualZoneCard.tsx`** — Individual zone/booth component
4. **`src/components/virtual/VirtualIntroOverlay.tsx`** — First-visit intro overlay

### Modified Files

5. **`src/App.tsx`** — Add `/virtual` route (lazy loaded)
6. **`src/components/AppLayout.tsx`** — Add "Virtual Mode" toggle button in top bar (small sparkle icon)
7. **`src/components/BottomNav.tsx`** — Add subtle indicator when on `/virtual` route

## Zone Configuration (`virtualZones.ts`)

```typescript
interface VirtualZone {
  id: string;
  labelTh: string;
  labelEn: string;
  descriptionTh: string;
  descriptionEn: string;
  icon: string; // lucide icon name
  targetRoute: string;
  color: string; // tailwind gradient
  position: { row: number; col: number };
}
```

Zone mapping to existing routes:

| Zone | Route | Icon |
|------|-------|------|
| Welcome Hub | `/` | Home |
| Testing Station | `/hiv-selftest` | TestTube |
| Booking Desk | `/booking` | Calendar |
| My Appointments | `/my-appointments` | ClipboardList |
| Learning Corner | `/info` | BookOpen |
| Self-Care Corner | `/self-care` | Heart |
| Community Lounge | `/community` | MessageCircle |
| Prevention Match | `/prevention-match` | Sparkles |
| Harm Reduction Zone | `/harm-reduction` | ShieldHalf |
| Support Desk | `/support-chat` | Headphones |

## Visual Design

- **Layout**: CSS Grid with a pseudo-isometric perspective tilt (`perspective: 800px; rotateX(10deg)`) — subtle, not heavy
- **Background**: Soft gradient with a subtle city/community illustration using CSS shapes (no images needed)
- **Zone cards**: Rounded glass-morphism cards with colored top borders, icons, and labels
- **Animations**: CSS `hover:scale-[1.05]`, `active:scale-[0.97]`, staggered `animate-fade-in` on mount using existing keyframes
- **Mobile-first**: 2-column grid on mobile, 3-column on tablet+
- **Color palette**: Each zone gets a distinct soft gradient (teal for health, purple for community, orange for learning, etc.)

## Navigation Integration

- **Top bar**: Add a small toggle button (Sparkles/Map icon) next to the language toggle in `AppLayout.tsx` header — navigates to `/virtual`
- **Virtual Mode page**: Has a prominent "Back to Normal Mode" button at top that navigates to `/`
- **No changes to BottomNav** — it continues to work normally on the virtual page

## Intro Overlay

- Shown once per session (sessionStorage flag)
- Simple glass card: "Welcome to Virtual Mode / ยินดีต้อนรับสู่โหมดเสมือนจริง" with a brief description and "Start Exploring" button
- Bilingual (th/en) using existing `useLanguage` hook

## What Will NOT Change

- No changes to Home page, Dashboard, or any existing pages
- No changes to existing routes or business logic
- No backend/database changes
- No changes to auth flows
- No changes to admin panel
- BottomNav stays identical
- All existing navigation preserved

## Performance

- Virtual page is lazy-loaded
- No external libraries needed — pure CSS animations + existing Tailwind utilities
- Zone config is a static file, no API calls
- Lightweight enough for mobile preview

