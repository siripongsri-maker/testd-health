
# Episode 2: PrEP Story — Virtual Mode Integration

## สรุป
เพิ่ม Episode 2 (มาร์คกับเข็มที่เขายังไม่รู้ว่ามีอยู่) เข้าสู่ /virtual เป็น story hub ที่เลือกตอนหรือเลือกตามหัวข้อได้ พร้อม analytics ครบวงจรและ admin dashboard

---

## 1. Database Migration

สร้าง 2 ตารางใหม่:

**`virtual_story_sessions`**
- `story_id`, `episode_number`, `user_id` (nullable), `anonymous_id`
- `started_at`, `completed_at`, `exited_at`, `current_scene`
- `completed` (boolean), `result_type`, `path_selected`
- `knowledge_score`, `readiness_score`, `community_score`
- `language`, `source_page`, `device_type`

**`virtual_story_events`**
- `session_id` (FK), `story_id`, `event_name`
- `scene_id`, `scene_label`, `choice_key`, `choice_text`
- `topic`, `cta_target`, `payload` (jsonb)

**RLS:**
- Anyone can INSERT (anonymous story play)
- Only admins can SELECT (analytics)

---

## 2. Frontend — Episode 2 Player

**สร้างไฟล์ใหม่:**
- `src/config/ep2StoryData.ts` — ข้อมูล scenes, choices, knowledge overlays จาก HTML
- `src/components/virtual/Episode2Player.tsx` — React player component ที่แปลงจาก vanilla JS เป็น React state machine พร้อม canvas pixel art scenes
- `src/components/virtual/VirtualStoryHub.tsx` — หน้า episode selector + topic selector

**แก้ไข:**
- `src/pages/VirtualMode.tsx` — เพิ่ม story hub เป็น default view, เพิ่ม episode routing
- `src/App.tsx` — เพิ่ม route `/virtual/ep2`

---

## 3. Episode Selector / Topic Selector

หน้า /virtual จะแสดง:
- **Episode Cards**: EP1 (Date Night) + EP2 (PrEP & Lenacapavir) พร้อม badge NEW
- **Topic Chips**: PrEP basics, Lenacapavir, Friendly clinic, Choosing prevention
- เลือก topic จะนำไป episode ที่เกี่ยวข้อง

---

## 4. CTA เชื่อมบริการจริง

แทน alert() ด้วย real navigation:
- เริ่ม PrEP → `/booking` หรือ `/setup/prep-daily`
- PrEP Tracker → `/medication-tracker`
- Lena Updates → สร้าง interest capture (insert เข้า `virtual_story_events` with cta_target)
- บทความ → `/info`
- ปรึกษา → `/support-chat`

---

## 5. Analytics Tracking

Track events ผ่าน `trackJourneyEvent`:
- `virtual_story_started`, `virtual_story_completed`, `virtual_story_exited`
- `virtual_story_scene_viewed`, `virtual_story_choice_selected`
- `virtual_story_knowledge_opened`, `virtual_story_cta_clicked`

พร้อม metadata: story_id, episode, scene, choice, path, scores

---

## 6. Admin Dashboard

**สร้าง:** `src/components/admin/AdminVirtualStoriesContent.tsx`

แสดง:
- KPI: Total starts, completions, completion rate, replay count
- Path distribution (Oral vs Inject)
- Result type distribution
- Drop-off by scene
- CTA click distribution
- Monthly trend chart
- CSV export

**แก้ไข:**
- `AdminSidebar.tsx` — เพิ่มแท็บ Virtual Stories
- `Admin.tsx` — register tab content

---

## ไฟล์ที่สร้าง/แก้ไข

| Action | File |
|--------|------|
| Create | DB migration (2 tables + RLS) |
| Create | `src/config/ep2StoryData.ts` |
| Create | `src/components/virtual/Episode2Player.tsx` |
| Create | `src/components/virtual/VirtualStoryHub.tsx` |
| Create | `src/components/admin/AdminVirtualStoriesContent.tsx` |
| Modify | `src/pages/VirtualMode.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/components/AdminSidebar.tsx` |
| Modify | `src/pages/Admin.tsx` |

---

## สิ่งที่จะไม่แตะ
- Episode 1 (DateStoryExperience) คงเดิม
- Auth, booking, notifications, existing analytics
- Database schema เดิมทั้งหมด

## Scope
- 1 migration
- ~5 new files
- ~4 modified files
- ไม่มี breaking changes
