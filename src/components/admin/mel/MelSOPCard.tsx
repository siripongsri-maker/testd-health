import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface SOPStep {
  en: string;
  th: string;
}

interface MelSOPCardProps {
  title_en: string;
  title_th: string;
  steps: SOPStep[];
}

export default function MelSOPCard({ title_en, title_th, steps }: MelSOPCardProps) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-dashed border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <button
          className="flex items-center justify-between w-full text-left gap-2"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">{isTh ? title_th : title_en}</span>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {expanded && (
          <ol className="mt-3 ml-6 space-y-1.5 list-decimal text-xs text-muted-foreground">
            {steps.map((step, i) => (
              <li key={i}>{isTh ? step.th : step.en}</li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// Pre-built SOP configs for each MEL module
export const MEL_SOPS = {
  serviceLedger: {
    title_en: "SOP: Logging a Service Event",
    title_th: "SOP: บันทึกเหตุการณ์การให้บริการ",
    steps: [
      { en: "Click 'Add Event' and select the branch, date, and service type", th: "คลิก 'เพิ่มรายการ' เลือกสาขา วันที่ และประเภทบริการ" },
      { en: "Select the population group and mark if it's a first visit", th: "เลือกกลุ่มประชากรและทำเครื่องหมายหากเป็นการเยี่ยมครั้งแรก" },
      { en: "Set the outcome (completed, referred, follow-up needed)", th: "ตั้งค่าผลลัพธ์ (สำเร็จ, ส่งต่อ, ต้องติดตาม)" },
      { en: "Save — the event links to MEL indicators automatically", th: "บันทึก — เหตุการณ์จะเชื่อมโยงกับตัวชี้วัด MEL โดยอัตโนมัติ" },
    ],
  },
  indicators: {
    title_en: "SOP: Recording Indicator Results",
    title_th: "SOP: บันทึกผลตัวชี้วัด",
    steps: [
      { en: "Click the chart icon (📊) next to any indicator to record a result", th: "คลิกไอคอนกราฟ (📊) ข้างตัวชี้วัดเพื่อบันทึกผล" },
      { en: "Enter the value, period label (e.g. 'Q1 2026'), and optional disaggregation", th: "ใส่ค่า ช่วงเวลา (เช่น 'Q1 2026') และการจำแนกย่อย (ถ้ามี)" },
      { en: "Add notes for context — these appear in exported reports", th: "เพิ่มหมายเหตุเพื่อบริบท — จะปรากฏในรายงานที่ส่งออก" },
      { en: "Review progress in the Reporting tab → Progress view", th: "ตรวจสอบความคืบหน้าในแท็บรายงาน → มุมมองความคืบหน้า" },
    ],
  },
  outreach: {
    title_en: "SOP: Logging Outreach Activity",
    title_th: "SOP: บันทึกกิจกรรมเชิงรุก",
    steps: [
      { en: "Click 'Add Event' — choose field, digital, or partner outreach", th: "คลิก 'เพิ่มกิจกรรม' — เลือกภาคสนาม ดิจิทัล หรือกิจกรรมร่วมกับพันธมิตร" },
      { en: "Log people reached, condoms/lube distributed, and HIV tests done", th: "บันทึกจำนวนคนเข้าถึง ถุงยาง/เจลแจก และการตรวจ HIV" },
      { en: "Use campaign codes to link outreach to specific initiatives", th: "ใช้รหัสแคมเปญเพื่อเชื่อมโยงกิจกรรมกับโครงการเฉพาะ" },
    ],
  },
  training: {
    title_en: "SOP: Recording Training Sessions",
    title_th: "SOP: บันทึกการฝึกอบรม",
    steps: [
      { en: "Link the session to a curriculum (or create a new one)", th: "เชื่อมโยงเซสชันกับหลักสูตร (หรือสร้างใหม่)" },
      { en: "Enter participant count, location, and trainer names", th: "ใส่จำนวนผู้เข้าร่วม สถานที่ และชื่อผู้ฝึก" },
      { en: "Update status to 'completed' when done — this feeds indicator calculations", th: "อัปเดตสถานะเป็น 'เสร็จสิ้น' — จะเข้าสู่การคำนวณตัวชี้วัด" },
    ],
  },
  safeSpaces: {
    title_en: "SOP: Safe Space Sessions",
    title_th: "SOP: เซสชันพื้นที่ปลอดภัย",
    steps: [
      { en: "Record each group meeting with date, participant count, and group association", th: "บันทึกการประชุมกลุ่มพร้อมวันที่ จำนวนผู้เข้าร่วม และกลุ่ม" },
      { en: "Add community dialogue notes to capture key discussions", th: "เพิ่มบันทึกการเสวนาชุมชนเพื่อบันทึกการสนทนาสำคัญ" },
      { en: "Mark completed sessions to track against targets", th: "ทำเครื่องหมายเซสชันที่เสร็จสิ้นเพื่อติดตามเทียบกับเป้าหมาย" },
    ],
  },
  reporting: {
    title_en: "SOP: Quarterly Reporting",
    title_th: "SOP: รายงานรายไตรมาส",
    steps: [
      { en: "Create a reporting period (e.g. 'Q1 2026') with start/end dates", th: "สร้างรอบรายงาน (เช่น 'Q1 2026') พร้อมวันที่เริ่ม/สิ้นสุด" },
      { en: "Review the Progress tab to check all indicators against targets", th: "ตรวจสอบแท็บความคืบหน้าเพื่อเปรียบเทียบตัวชี้วัดกับเป้าหมาย" },
      { en: "Export CSV files for donor reports (supports Thai characters)", th: "ส่งออก CSV สำหรับรายงานผู้บริจาค (รองรับภาษาไทย)" },
      { en: "Resolve any Data Quality flags before submitting", th: "แก้ไขปัญหาคุณภาพข้อมูลก่อนส่ง" },
      { en: "Update period status to 'submitted' after donor review", th: "อัปเดตสถานะรอบเป็น 'ส่งแล้ว' หลังผู้บริจาคตรวจ" },
    ],
  },
  evaluation: {
    title_en: "SOP: Evaluation Management",
    title_th: "SOP: การจัดการประเมินผล",
    steps: [
      { en: "Define Key Evaluation Questions (KEQs) aligned to the project logic model", th: "กำหนดคำถามหลักในการประเมิน (KEQs) ให้สอดคล้องกับตรรกะโครงการ" },
      { en: "Log risks with likelihood/impact ratings and mitigation plans", th: "บันทึกความเสี่ยงพร้อมระดับโอกาส/ผลกระทบและแผนบรรเทา" },
      { en: "Maintain the timeline to track deliverables and milestones", th: "ดูแลไทม์ไลน์เพื่อติดตามผลงานและเป้าหมาย" },
    ],
  },
  policy: {
    title_en: "SOP: Policy & Engagement",
    title_th: "SOP: นโยบายและความร่วมมือ",
    steps: [
      { en: "Log all stakeholder meetings with attendees and outcomes", th: "บันทึกการประชุมผู้มีส่วนได้ส่วนเสียพร้อมผู้เข้าร่วมและผลลัพธ์" },
      { en: "Record policy evidence with source URLs for verification", th: "บันทึกหลักฐานนโยบายพร้อม URL แหล่งที่มาเพื่อการยืนยัน" },
      { en: "Mark evidence as 'verified' after supervisor review", th: "ทำเครื่องหมายหลักฐานว่า 'ยืนยันแล้ว' หลังหัวหน้าตรวจสอบ" },
    ],
  },
  partners: {
    title_en: "SOP: Partner Management",
    title_th: "SOP: การจัดการพันธมิตร",
    steps: [
      { en: "Add partner organizations with type, contact info, and MOU status", th: "เพิ่มองค์กรพันธมิตรพร้อมประเภท ข้อมูลติดต่อ และสถานะ MOU" },
      { en: "Update partnership status as relationships evolve", th: "อัปเดตสถานะพันธมิตรเมื่อความสัมพันธ์เปลี่ยนแปลง" },
      { en: "Review active partnerships quarterly for reporting", th: "ทบทวนพันธมิตรที่ใช้งานอยู่ทุกไตรมาสเพื่อรายงาน" },
    ],
  },
};
