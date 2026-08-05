# แผนงาน 4 ส่วน: วิเคราะห์แบบสำรวจ → สรุปรายวัน → SMS ประเมินหลังบริการ → ค่าตอบแทน

## สิ่งที่ตรวจสอบจากฐานข้อมูลจริงแล้ว (ไม่ใช่การเดา)

- `appointment_pre_service_surveys` มี 2,983 แถว ข้อมูลเริ่ม **พ.ค. 2026** (พ.ค. 186 / มิ.ย. 1,179 / ก.ค. 1,191 / ส.ค. 427) ไม่มีข้อมูลเก่ากว่านั้นในตารางนี้
- โครงสร้างคำตอบเป็น jsonb 2 ก้อน + สเกล:
  - `knowledge`: k_condom, k_test, k_clean_inject, k_water, k_dose (yes/no/unsure)
  - `behavior`: b_condom, b_test, b_clean_inject, b_water, b_dose, b_help (yes/no/unsure)
  - `confidence` (1-5), `safety` (1-5), `recommend`, `mental_health_interest`, `suggestions` (ปลายเปิด), `channel`, `language`, `uic_hash`, `uic_display`, `visit_sequence`, `linked_previous_count`
- `pre_service_counseling_notes` = ชั้นงานของผู้ให้คำปรึกษา (status 7 ค่า, assigned_counselor_id, counseling_completed_at, post_eval_token) — ใช้เป็นแกนของหน้าสรุปรายวันได้เลย
- `post_counseling_evaluations` มีอยู่แล้ว **1 แถว** (ระบบเพิ่งเริ่ม) เก็บคะแนน 6 ด้าน 1-5
- `hr_referrals` มี 3 แถว, `hr_screenings` 51 แถว (เริ่ม มี.ค. 2026)
- `sms_send_log` มีระบบส่ง SMS + tracking_token + click ครบแล้ว (ใช้ Twilio + ระบบเครดิต)
- Storage buckets ปัจจุบัน: selftest-results, product-images, avatars, blog-images, branch-images, email-assets → **ยังไม่มี bucket สำหรับสำเนาบัตรประชาชน**

## ข้อมูลที่ "ไม่มีจริง" ในฐานข้อมูล — ต้องบอกตรง ๆ

1. **PHQ-4 / AUDIT-C / ASSIST ไม่ได้อยู่ในแบบสำรวจก่อนรับบริการ** เลย อยู่คนละระบบคือ `hr_screenings` / `surveys` (Survey Builder) ที่ไม่ผูก booking_id ดังนั้น "คะแนนรายข้อ + band ความรุนแรง" ทำได้เฉพาะจาก hr_screenings และเชื่อมได้เฉพาะเคสที่มี user_id/UIC ตรงกันเท่านั้น จะไม่ครอบคลุมทุกเคส
2. **ไม่มี `risk_level` ในแบบสำรวจก่อนรับบริการ** — ต้องคำนวณเป็น derived score จาก knowledge/behavior/confidence/safety (จะนิยามเกณฑ์ให้ยืนยัน) หรือดึงจาก `hr_referrals.risk_level` เฉพาะเคสที่มี referral
3. **ไม่มีข้อมูลประชากร (เพศ อายุ กลุ่มประชากร) ในแบบสำรวจ** — ต้อง join `appointments`/`profiles`/`hr_user_profile` ซึ่งครอบคลุมไม่ครบทุกแถว จะติดป้าย “ไม่ทราบ” ไม่นับเป็น 0
4. **ไม่มีแบบสำรวจเวอร์ชันเก่าที่คำถามต่างกันในฐานข้อมูล** — ทุกแถว 2,983 แถวมี `knowledge` ครบ โครงสร้างเดียวกันทั้งหมด ดังนั้น "การกู้ข้อมูลเก่าที่ field ไม่ตรงกัน" ตอนนี้ไม่มีของให้กู้ ยกเว้นถ้าคุณมีไฟล์/ระบบเก่าอยู่นอกระบบนี้ (Google Form / Excel) ให้ส่งมา ผมจะทำ importer ให้
5. **ไม่มี role การเงินใน enum `app_role`** (มีแค่ admin, moderator, user, me_analyst, outreach_staff, counselor) → ต้องเพิ่ม `finance`
6. **ยังไม่มีอัตราค่าตอบแทน / ช่องทางจ่ายเงิน / นโยบาย retention** ในระบบ ต้องให้คุณกำหนด

---

## เฟส 1 — วิเคราะห์รายคำถาม + รองรับเวอร์ชันคำถาม

**DB**
- ตาราง `survey_question_registry`: `question_key` (เช่น `k_condom`), `version`, `label_th/en`, `answer_type` (yes_no_unsure / scale_1_5 / text / choice), `collected_from`, `collected_to`, `scale_min/max`, `display_order` — เป็นแหล่งความจริงของ “คำถามนี้เริ่มเก็บเมื่อไหร่ / ช่วงไหนไม่ได้เก็บ”
- View `pre_service_survey_answers_long` (unnest jsonb เป็น long format: survey_id, question_key, answer_value, created_at, branch_id, channel, uic_hash, visit_sequence, is_anonymous) + materialized view รายวันสำหรับ aggregate เร็ว
- RPC security definer: `get_pre_service_question_stats(filters)` คืน n, skip_rate, distribution, mean/median; `get_pre_service_crosstab(question_key, dimension, filters)`; `get_pre_service_rowlevel_export(filters)` (de-identified ใช้ uic_hash) — คำนวณฝั่ง DB ทั้งหมด ไม่ดึงแถวดิบมาที่เบราว์เซอร์
- Backfill: เขียน registry ให้ตรงกับข้อมูลจริงที่มี (เริ่ม 2026-05) และ mark ช่วงก่อนหน้าเป็น "ไม่ได้เก็บ" (แยกจาก 0 ชัดเจน)

**UI** (แท็บใหม่ "ผลรายคำถาม" ในหน้าแบบสำรวจก่อนรับบริการ)
- Filter bar: ช่วงวันที่, สาขา, ช่องทาง, ระดับความเสี่ยง (derived), ระบุตัวตน/ไม่ระบุ — ทุกกราฟผูกกับ filter เดียวกัน
- การ์ดต่อคำถาม: ข้อความคำถาม, ชนิด, n, % ข้ามข้อ, กราฟการกระจาย, mean/median สำหรับสเกล, ป้าย “เริ่มเก็บ …” 
- ปลายเปิด (`suggestions`): จัดกลุ่มด้วย keyword ฝั่ง DB (คำไทยตัดด้วย keyword list ที่กำหนดเอง ไม่ใช่ AI) แสดง top คำ + ตัวอย่างคำตอบ
- Cross-tab: คำถาม × (สาขา / ครั้งแรก-กลับซ้ำ จาก visit_sequence / ระดับความเสี่ยง / ประชากรเท่าที่มี / ช่วงเวลา)
- Export 2 แบบ (สรุปรายคำถาม, row-level de-identified) ผ่าน `exportToCsv` เดิม คง watermark PDPA

*หมายเหตุ helper:* จะส่ง logic เฉพาะหน้าเข้าไปเป็น parameter ใน `adminCsvExport` / hook ที่ใช้ร่วม ไม่แก้พฤติกรรมของหน้าอื่น

## เฟส 2 — หน้าใหม่ "สรุปรายวันรายสาขา"

- เมนู sidebar ใหม่ + tab id `daily-branch-brief` (ไม่ยัดในหน้าแบบสำรวจ)
- แหล่งข้อมูล: `pre_service_counseling_notes` + `appointment_pre_service_surveys` + `hr_referrals` (ไม่สร้างตารางคิวใหม่)
- RPC `get_daily_branch_brief(p_date)` : group by สาขา → นับเคสตามระดับความเสี่ยง (critical/high/medium) และตามประเด็น (สุขภาพจิต / ความรุนแรง / การใช้สาร / สิทธิการรักษา / กฎหมาย / การเงิน)
  - **ต้องยืนยัน:** ประเด็น "ความรุนแรง / สิทธิ / กฎหมาย / การเงิน" ยังไม่มี field เก็บในแบบสำรวจปัจจุบัน มีแค่สุขภาพจิต (`mental_health_interest`) และการใช้สาร (b_dose/b_clean_inject) → ต้องเพิ่มช่อง “ประเด็นที่ต้องการความช่วยเหลือ” (multi-select) ในแบบสำรวจ เคสเก่าจะแสดงเป็น “ไม่ได้เก็บ”
- รายเคส: เวลาส่ง, สาขา, uic_display/รหัสเคส, ครั้งแรก/เคยรับบริการ, สรุปประเด็นจากคำตอบจริง (rule-based ไม่ใช่ AI), สิ่งที่ควรเตรียม, สถานะ (map จาก status เดิม), ผู้รับผิดชอบ
- อัปเดตสถานะที่หน้านี้ = update `pre_service_counseling_notes` / `hr_referrals` เดิม, realtime สองทางกับ Counselor Support
- Header สรุป: จำนวนเคสวันนี้, สาขาสูงสุด, จำนวนเกิน SLA (**ต้องยืนยันเกณฑ์ SLA** เช่น critical 2 ชม. / high 24 ชม.)
- Print-friendly (window.print CSS) + Export CSV

## เฟส 3 — SMS ตามหลัง + แบบประเมินย้อนหลัง

- ตาราง `post_eval_invites`: note_id, token (hash เท่านั้น), expires_at, used_at, attempt_no, status, opted_out — magic link **ไม่มีชื่อ/เบอร์/เลขบัตรใน URL**
- Edge function `post-eval-sms-dispatch` (cron): ส่งครั้งแรกหลังปิดเคส + เตือนได้สูงสุด 2 ครั้ง หยุดทันทีเมื่อทำเสร็จ/opt-out; log ลง `sms_send_log` เดิม (สำเร็จ/ล้มเหลว/คลิก/ทำเสร็จ)
- หน้าตั้งค่า admin: ข้อความ, ช่วงเวลาส่ง, ระยะเตือน, สถานะการส่ง
- แบบประเมิน (มือถือ): แสดง **วันที่รับบริการจริง** จาก `counseling_completed_at` รองรับทำย้อนหลัง; เก็บคำตอบรายคำถามในโครง long เดียวกับเฟส 1 เพื่อเทียบก่อน–หลัง
- ส่วนค่าตอบแทนท้ายฟอร์ม: ชื่อ-นามสกุล, เบอร์, ช่องทางรับเงิน, ถ่าย/แนบสำเนาบัตร (preview + ถ่ายใหม่, บีบอัด client-side, จำกัดขนาด)
- Checkbox ยินยอม (ไม่ติ๊กมาก่อน) ติดกับช่องอัพโหลด ข้อความตามที่กำหนดเป๊ะ:
  “คาดว่าใช้เพื่อการรับเงินในการทำแบบสอบถามหลังการรับบริการให้คำปรึกษาของมูลนิธิเพื่อนพนักงานบริการเท่านั้น โดยจะโอนเงินภายใน 7-14 วัน”

## เฟส 4 — ค่าตอบแทน + ส่งฝ่ายบัญชี

- เพิ่ม role `finance` ใน `app_role`
- ตาราง `incentive_claims` (evaluation_id, uic_hash, ชื่อ, phone_hash + phone เข้ารหัส/masked, national_id_hash เท่านั้น **ไม่เก็บ plaintext**, ช่องทางจ่าย, จำนวนเงิน, doc_status, payment_status, due_at = +7..14 วัน, id_image_path) และ `payout_batches` (batch_no, ยอดรวม, จำนวนรายการ, ผู้อนุมัติ, ส่งเมื่อ)
- กันจ่ายซ้ำ: unique (evaluation_id) + unique partial บน national_id_hash/phone_hash → ขึ้นธงเตือนเมื่อซ้ำ
- หน้าใหม่ (admin + finance เท่านั้น): ตารางรอจ่าย, เลือกหลายรายการ → อนุมัติเป็นชุด → สร้างงวด → export CSV/XLSX, หน้าประวัติงวด, ไม่มีปุ่มลบถาวร

## เฟส 5 — PDPA (ทำคู่ไปกับเฟส 3-4)

- Bucket ใหม่ `identity-docs` **private** เท่านั้น เปิดดูผ่าน signed URL อายุสั้น (เช่น 60 วินาที)
- RLS: เจ้าของเห็นของตัวเอง; ฝั่งเจ้าหน้าที่เฉพาะ admin + finance; **counselor เห็นไม่ได้ทั้งรูปบัตรและข้อมูลการเงิน**
- ทุกการเปิด/ดาวน์โหลดรูปบัตรผ่าน RPC security definer ที่ลง `pdpa_audit_logs` (ใคร/เมื่อไหร่/เหตุผล) แบบเดียวกับ `get_client_hr_context`
- Retention job: ลบไฟล์อัตโนมัติหลังจ่ายเงินสำเร็จ ตามจำนวนวันที่ตั้งค่าได้ เหลือ metadata สำหรับตรวจสอบ
- Mask เลขบัตรเป็น `x-xxxx-xxxxx-xx-1234` เป็นค่าเริ่มต้นทุกหน้า; ห้ามชื่อ/เบอร์/เลขบัตรใน URL, query string, magic link, log

---

## สิ่งที่ต้องให้คุณยืนยันก่อนเริ่ม

1. **เกณฑ์ระดับความเสี่ยง** จาก knowledge/behavior/confidence/safety (ผมเสนอเกณฑ์ให้ได้ แต่ต้องคุณอนุมัติ)
2. **เพิ่มช่อง “ประเด็นที่ต้องการความช่วยเหลือ”** ในแบบสำรวจก่อนรับบริการหรือไม่ (จำเป็นสำหรับเฟส 2)
3. **เกณฑ์ SLA** ต่อระดับความเสี่ยง
4. **ผู้ให้บริการ SMS**: ใช้ Twilio เดิม + ระบบเครดิตที่มีอยู่ ใช่ไหม
5. **อัตราค่าตอบแทนต่อราย** (บาท) และ **ช่องทางรับเงิน** ที่อนุญาต (พร้อมเพย์ / โอนบัญชี / เงินสด?)
6. **นโยบาย retention** ของมูลนิธิ: ลบรูปบัตรหลังจ่ายเงินกี่วัน
7. **ข้อมูลเก่านอกระบบ** (Google Form / Excel) ถ้ามี ส่งไฟล์มาเพื่อทำ importer — ในฐานข้อมูลตอนนี้มีเฉพาะตั้งแต่ พ.ค. 2026
8. **ใครได้ role `finance`** (รายชื่อ/อีเมล)
