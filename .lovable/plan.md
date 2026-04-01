

# อัพเดทหน้าข้อมูลประชากร HR — ดึงข้อมูลจากทุกแหล่งหลัก

## สรุป

หน้า "ข้อมูลประชากร HR" ปัจจุบันดึงข้อมูลจาก `hr_user_profile` เพียงตารางเดียว จะอัพเดทให้รวมสถิติจากทุก HR table หลักๆ ได้แก่ check-ins, screenings, AI conversations, self-test requests และ peer posts เพื่อให้เห็นภาพรวมการใช้ HR ทั้งระบบ

---

## สิ่งที่จะเปลี่ยน

### 1. อัพเดท Database Function `get_hr_demographic_stats`

เพิ่มข้อมูลใหม่จากตาราง:
- `hr_checkins` — จำนวน check-ins ทั้งหมด
- `hr_screenings` — จำนวน screenings ทั้งหมด
- `hr_ai_conversations` — จำนวนการใช้ AI companion
- `hiv_selftest_requests` — จำนวนคำขอชุดตรวจ
- `hr_peer_posts` — จำนวนโพสต์ peer support
- `hr_distress_alerts` — จำนวน distress alerts
- `hr_safer_plans` — จำนวน safer use plans
- `hr_referrals` — จำนวน referrals

Function จะ return ข้อมูลเดิม (profiles, MSM/MSW, age/gender/behavior) **บวก** KPI ใหม่ทั้งหมด + สถิติรายเดือน (trend)

### 2. อัพเดท `AdminDemographicsContent.tsx`

เพิ่ม sections ใหม่:

**A. Summary KPI cards (แถวบน)**
- Total Profiles | MSM | MSW (เดิม)
- Total Check-ins | Total Screenings | Self-test Requests (ใหม่)

**B. HR Usage Overview (แถวกลาง)**
- AI Conversations count
- Peer Posts count  
- Distress Alerts count
- Safer Plans count
- Referrals count

**C. Demographic Breakdowns (เดิม — คงไว้)**
- Age / Gender / Sexual Behavior charts

**D. Monthly Trend (ใหม่)**
- แสดงจำนวน check-ins และ screenings ย้อนหลัง 6 เดือน (bar/simple chart)

---

## ไฟล์ที่เปลี่ยน

| Action | File |
|--------|------|
| Migration | อัพเดท function `get_hr_demographic_stats` เพิ่ม return columns |
| Modify | `src/components/admin/AdminDemographicsContent.tsx` — เพิ่ม KPI cards + usage section + trend |

---

## สิ่งที่จะไม่แตะ
- ไม่แก้ routes, auth, booking, notifications, อะไรทั้งนั้น
- ไม่สร้างตารางใหม่ — อ่านจากที่มีอยู่แล้วทั้งหมด
- RLS เดิมทำงานอยู่แล้ว (admin read all)

## Scope
- 1 migration (replace function)
- 1 file modified
- ไม่มี breaking changes

