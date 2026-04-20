---
name: AI Forecast & Insight Engine
description: Daily/Weekly/Monthly demand forecast in admin booking dashboard — heuristic engine + Lovable AI narrative + Thai holidays
type: feature
---
The "AI Forecast" view in the admin booking dashboard (`/admin?tab=bookings`, view mode "Forecast") provides Daily/Weekly/Monthly demand forecasts to the operations team.

## Architecture
- **RPC `get_forecast_signals(p_branch_id, p_history_days, p_source_filter)`** returns 120-day daily history, weekday baselines, hourly heatmap baseline (60d), rolling MAs (7/30/90), completion + no-show rate (30d), walk-in share (14d), and pre-booked future backlog (14d ahead). SECURITY DEFINER, restricted to admin/moderator/outreach_staff.
- **`src/lib/forecast/forecastEngine.ts`** — pure heuristic engine. Combines weekday baseline with MA7/MA30 momentum, multipliers for holidays (×0.15), post-holiday rebound (×1.18), Monday effect, Sunday/Saturday tags, backlog above baseline. Confidence (low/medium/high) scored from sample size + coefficient of variation + history depth. Returns drivers as `{key, label_th, label_en, effect, weight}` chips.
- **`src/lib/forecast/holidays.ts`** — hardcoded TH 2026 public holidays + helpers `isHoliday`, `isPostHoliday` (last 3 days), `isNearLongWeekend` (±2 days).
- **Edge function `forecast-narrative`** — uses Lovable AI (`google/gemini-2.5-flash-lite`) to generate 2-4 sentence TH/EN narrative + 1 capacity recommendation from the heuristic context. Handles 429/402 gracefully with `narrative: null`.

## UI components
- `ForecastPanel.tsx` — main container with scope tabs (daily/weekly/monthly) + source filter (all/appointment/walkin) + 7/14/30 day horizon.
- `forecast/DailyForecastList.tsx` — per-day cards: arrivals, completed, peak band, confidence pill, top 2 drivers. Bar shows confidence band low–high.
- `forecast/PeakHeatmap.tsx` — DOW (Mon-Sun) × hour (8-18) HSL primary intensity grid.
- `forecast/ForecastDriversPanel.tsx` — driver chips colored by effect (up=emerald, down=rose, neutral=muted).
- `forecast/NarrativeCard.tsx` — calls `supabase.functions.invoke('forecast-narrative')` with `triggerKey` to refetch on context change.

## How to apply
- New forecast features should extend `forecastEngine.ts` with additional drivers/multipliers, NOT bypass it. Keep narrative purely descriptive — never invent numbers.
- External signals (news/trends) intentionally omitted in v1 — fallback message in transparency footer makes this explicit.
- Confidence MUST drop to "low" when `history_days_count < 21` or weekday sample_size < 3.
