# อนุญาตให้ Guest ส่งผลตรวจ HIV ได้ทันที

## เป้าหมาย
ลบกำแพง login ที่หน้า `/submit-result` เพื่อให้ทุกคนส่งผลตรวจจากชุดที่มีอยู่ได้ทันที โดยไม่ต้องสมัครสมาชิก

## สิ่งที่จะเปลี่ยน

### 1. ฐานข้อมูล (Migration)
- ทำให้คอลัมน์ `user_id` ใน `hiv_selftest_requests` รับค่า NULL ได้ (สำหรับ guest)
- สร้าง SECURITY DEFINER RPC: `submit_guest_selftest_result(p_full_name, p_phone, p_line_id, p_self_result, p_photo_path, p_wants_callback)` คืน request id
  - ใส่ rate-limit ผ่าน `selftest_abuse_logs` (จำกัด 3 รายการ/ชั่วโมง/ip) เพื่อกัน abuse
  - บันทึก `submission_path = 'guest_existing_kit'`
- เพิ่ม Storage Policy: anon role สามารถ INSERT ใน `selftest-results/guest/...` ได้
- เพิ่ม RLS: admin ดู guest submissions ทั้งหมดได้ (มีอยู่แล้วเพราะ admin policy ครอบทุก row)

### 2. UI (HIVSelfTest.tsx)
ใน `renderExistingKitUploadStep`:
- ลบ banner "⚠️ กรุณาเข้าสู่ระบบก่อน" ออก
- ปล่อยให้ guest กดดูวิดีโอ → ถ่ายรูป → ส่งผล ได้เหมือน user ที่ login แล้ว
- เพิ่มขั้นตอนเก็บข้อมูลขั้นต่ำสำหรับ guest ก่อนกด "ยืนยันส่งผล":
  - ชื่อ-นามสกุล (หรือชื่อเล่น)
  - เบอร์โทร (เพื่อให้เจ้าหน้าที่ติดต่อกลับได้ — ใช้กรณีผล reactive)
  - LINE ID (ไม่บังคับ)
  - Checkbox "ต้องการให้เจ้าหน้าที่โทรกลับ"
- ข้อความ disclaimer: "🔒 ข้อมูลของคุณจะถูกเก็บเป็นความลับ ใช้เพื่อติดต่อกลับและส่งต่อการดูแลเท่านั้น"

### 3. handleSubmitResult
- ถ้า user logged in → ใช้ flow เดิม
- ถ้า guest → อัปโหลดรูปไป `selftest-results/guest/<uuid>-<timestamp>.<ext>` แล้วเรียก RPC `submit_guest_selftest_result`
- หลังส่งสำเร็จ: ถ้าผล reactive → แสดงตัวเลือกเชื่อมต่อทีม (callback / จองคลินิก / LINE) เหมือนเดิม; ถ้า negative → ขอบคุณและเสนอ "สมัครสมาชิกเพื่อเก็บประวัติ" (optional)

## เทคนิค
- RPC ใช้ `SECURITY DEFINER`, `SET search_path = public`, ตรวจ rate-limit ด้วย `request.headers->>'x-forwarded-for'` ที่ส่งจาก client ผ่าน parameter
- Photo path สำหรับ guest ใช้ prefix `guest/` ทำให้ policy แยกจาก path ของ user (`<uuid>/...`)
- ไม่แตะ flow การขอชุดตรวจ (request kit) — เปลี่ยนเฉพาะ flow ส่งผลจากชุดที่มีอยู่
- คงการกรองผล (negative/reactive/invalid) และ trigger reactive alert เดิม

## ไฟล์ที่แตะ
- Migration ใหม่ 1 ไฟล์: ALTER TABLE, RPC, storage policy
- `src/pages/HIVSelfTest.tsx`: ลบ login wall, เพิ่ม guest form, ปรับ `handleSubmitResult`

## ความเสี่ยง
- การเปิด anonymous insert เพิ่ม attack surface — กันด้วย rate-limit ระดับ RPC + abuse score เดิม
- Photo upload จาก anon อาจถูก spam — กันด้วย rate-limit ก่อนออก signed upload path
