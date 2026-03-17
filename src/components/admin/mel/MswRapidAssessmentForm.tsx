import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, CheckCircle, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Section / question definitions ──────────────────────────────────
interface Option {
  label: string;
  value: string;
  allowTextInput?: boolean;
  goToSection?: string;
}

interface Question {
  id: string;
  type: "email" | "date" | "time" | "single_select" | "multi_select";
  label: string;
  description?: string;
  required: boolean;
  options?: Option[];
}

interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  nextSection?: string; // default next
}

const SECTIONS: Section[] = [
  {
    id: "section_1_basic_info",
    title: "ข้อมูลพื้นฐาน",
    questions: [
      { id: "email", type: "email", label: "Email", required: true },
      { id: "survey_date", type: "date", label: "วันที่ทำแบบสอบถาม", required: true },
      { id: "survey_time", type: "time", label: "เวลาที่ทำแบบสอบถาม", required: true },
      {
        id: "venue_code", type: "single_select", label: "รหัสสถานที่ (Venue Code)", required: true,
        options: [
          { label: "กรุงเทพมหานคร", value: "bangkok", goToSection: "section_2_bangkok_area" },
          { label: "พัทยา ชลบุรี", value: "pattaya_chonburi", goToSection: "section_4_pattaya_area" },
        ],
      },
    ],
  },
  {
    id: "section_2_bangkok_area",
    title: "พื้นที่ กรุงเทพมหานคร",
    description: "ระบุ พื้นที่ / ทำเลที่ตั้ง",
    nextSection: "section_3_bangkok_peer",
    questions: [
      {
        id: "bangkok_area", type: "single_select", label: "พื้นที่ / ทำเลที่ตั้ง", required: true,
        options: [
          { label: "สีลม", value: "สีลม" }, { label: "สวนพลู", value: "สวนพลู" },
          { label: "บ่อนไก่", value: "บ่อนไก่" }, { label: "อินทามระ", value: "อินทามระ" },
          { label: "สะพานควาย", value: "สะพานควาย" }, { label: "พัฒน์พงษ์", value: "พัฒน์พงษ์" },
          { label: "อารีย์", value: "อารีย์" }, { label: "บางเขน", value: "บางเขน" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_3_bangkok_peer",
    title: "รหัส Peer พื้นที่กรุงเทพมหานคร",
    description: "ระบุรหัสอาสาสมัคร",
    nextSection: "section_6_main",
    questions: [
      {
        id: "bangkok_peer_code", type: "single_select", label: "รหัส Peer", required: true,
        options: [
          { label: "BKK01", value: "BKK01" }, { label: "BKK02", value: "BKK02" },
          { label: "BKK03", value: "BKK03" }, { label: "BKK04", value: "BKK04" },
          { label: "BKK05", value: "BKK05" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_4_pattaya_area",
    title: "พื้นที่ พัทยา ชลบุรี",
    description: "ระบุ พื้นที่ / ทำเลที่ตั้ง",
    nextSection: "section_5_pattaya_peer",
    questions: [
      {
        id: "pattaya_area", type: "single_select", label: "พื้นที่ / ทำเลที่ตั้ง", required: true,
        options: [
          { label: "จอมเทียนคอมเพล็กซ์", value: "จอมเทียนคอมเพล็กซ์" },
          { label: "บอยทาวน์", value: "บอยทาวน์" },
          { label: "พัทยาเหนือ", value: "พัทยาเหนือ" },
          { label: "ซอยก่อไผ่", value: "ซอยก่อไผ่" },
          { label: "Walking Street", value: "Walking Street" },
          { label: "ชัยพูน พัทยาใต้", value: "ชัยพูน พัทยาใต้" },
          { label: "ถนนเรียบหาดพัทยาใต้", value: "ถนนเรียบหาดพัทยาใต้" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_5_pattaya_peer",
    title: "รหัส Peer พื้นที่พัทยา ชลบุรี",
    description: "ระบุรหัสอาสาสมัคร",
    nextSection: "section_6_main",
    questions: [
      {
        id: "pattaya_peer_code", type: "single_select", label: "รหัส Peer", required: true,
        options: [
          { label: "PTY01", value: "PTY01" }, { label: "PTY02", value: "PTY02" },
          { label: "PTY03", value: "PTY03" }, { label: "PTY04", value: "PTY04" },
          { label: "PTY05", value: "PTY05" }, { label: "PTY06", value: "PTY06" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_6_main",
    title: "ประเภทผู้ให้ข้อมูล / ข้อมูลสถานที่ / การประมาณจำนวน MSW",
    nextSection: "section_7_nationality",
    questions: [
      {
        id: "respondent_type", type: "single_select", label: "ประเภทผู้ให้ข้อมูล", required: true,
        options: [
          { label: "เจ้าของสถานบริการ / ผู้จัดการ", value: "เจ้าของสถานบริการ / ผู้จัดการ" },
          { label: "พนักงานบาร์ / บาร์เทนเดอร์", value: "พนักงานบาร์ / บาร์เทนเดอร์" },
          { label: "MSW", value: "MSW" },
          { label: "Peer outreach worker", value: "Peer outreach worker" },
          { label: "มาม่าซัง", value: "มาม่าซัง" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
      {
        id: "venue_type", type: "single_select", label: "ก. ข้อมูลสถานที่ — ประเภทสถานที่", required: true,
        options: [
          { label: "บาร์", value: "บาร์" }, { label: "คลับ", value: "คลับ" },
          { label: "โกโก้บาร์", value: "โกโก้บาร์" }, { label: "นวด", value: "นวด" },
          { label: "ซาวน่า", value: "ซาวน่า" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
      {
        id: "msw_count_estimate", type: "single_select",
        label: "ข. การประมาณจำนวน MSW — โดยปกติในหนึ่งคืน มีพนักงานชายทำงานที่นี่ประมาณกี่คน",
        required: true,
        options: [
          { label: "น้อยกว่า 5 คน", value: "lt_5" }, { label: "5 – 10 คน", value: "5_10" },
          { label: "11 – 20 คน", value: "11_20" }, { label: "มากกว่า 20 คน", value: "gt_20" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
      {
        id: "offsite_work_ratio", type: "single_select",
        label: "ในจำนวนนี้ ประมาณกี่คนที่รับงานกับลูกค้านอกสถานที่",
        description: "จากจำนวนพนักงานทั้งหมดที่มีในคืนหนึ่ง มีสัดส่วนเท่าใดที่ไปรับงานนอกสถานที่",
        required: true,
        options: [
          { label: "ไม่รู้", value: "unknown" }, { label: "ไม่มี", value: "none" },
          { label: "น้อยกว่า 25%", value: "lt_25" }, { label: "ประมาณ 50%", value: "about_50" },
          { label: "มากกว่า 75%", value: "gt_75" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_7_nationality",
    title: "สัญชาติ (สัดส่วนโดยประมาณ)",
    nextSection: "section_8_foreign_groups_language",
    questions: [
      {
        id: "nationality_mix", type: "single_select",
        label: "ค. สัญชาติ — ในกลุ่ม MSW ที่รับงานนอกสถานที่ ส่วนใหญ่เป็น",
        required: true,
        options: [
          { label: "คนไทย", value: "thai" },
          { label: "คนไทยเป็นหลัก และมีแรงงานต่างชาติบางส่วน", value: "mostly_thai_some_foreign" },
          { label: "ไทยและต่างชาติใกล้เคียงกัน", value: "mixed_similar" },
          { label: "แรงงานต่างชาติเป็นส่วนใหญ่", value: "mostly_foreign" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_8_foreign_groups_language",
    title: "แรงงานต่างชาติ / ภาษาและการสื่อสาร",
    questions: [
      {
        id: "foreign_groups", type: "multi_select",
        label: "หากมีแรงงานต่างชาติ กลุ่มที่พบมาก ได้แก่ (เลือกได้มากกว่า 1 ข้อ)",
        required: true,
        options: [
          { label: "เมียนมา", value: "เมียนมา" }, { label: "กัมพูชา", value: "กัมพูชา" },
          { label: "สปป. ลาว", value: "สปป. ลาว" }, { label: "เวียดนาม", value: "เวียดนาม" },
          { label: "จีน", value: "จีน" }, { label: "ยุโรป/รัสเซีย", value: "ยุโรป/รัสเซีย" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
      {
        id: "language_skill", type: "single_select",
        label: "ง. ภาษาและการสื่อสาร — MSW ต่างชาติส่วนใหญ่สามารถ",
        description: "หากตอบว่า ใช้ภาษาอื่นเป็นหลัก ตอบคำถามในข้อที่ 7.1",
        required: true,
        options: [
          { label: "สื่อสารภาษาไทยได้ดี", value: "thai_good", goToSection: "section_10_health_info" },
          { label: "ใช้ภาษาไทยในระดับพื้นฐาน", value: "thai_basic", goToSection: "section_10_health_info" },
          { label: "ใช้ภาษาอื่นเป็นหลัก", value: "other_language_primary", goToSection: "section_9_other_language" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_9_other_language",
    title: "ใช้ภาษาอื่นเป็นหลัก",
    nextSection: "section_10_health_info",
    questions: [
      {
        id: "other_primary_language", type: "single_select", label: "7.1 ภาษาอื่นคือ", required: true,
        options: [
          { label: "ภาษาอังกฤษ", value: "ภาษาอังกฤษ" },
          { label: "ภาษาเมียนมา", value: "ภาษาเมียนมา" },
          { label: "ภาษากัมพูชา", value: "ภาษากัมพูชา" },
          { label: "ภาษาจีน", value: "ภาษาจีน" },
          { label: "ภาษาเวียดนาม", value: "ภาษาเวียดนาม" },
          { label: "ภาษาไทใหญ่", value: "ภาษาไทใหญ่" },
          { label: "ภาษาลาว", value: "ภาษาลาว" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
  {
    id: "section_10_health_info",
    title: "ข้อมูลด้านสุขภาพ",
    questions: [
      {
        id: "health_info_language_priority", type: "single_select",
        label: "สำหรับข้อมูลด้านสุขภาพหรือการลดอันตราย นอกจากภาษาไทย ควรมีข้อมูลภาษาใดมากที่สุด",
        required: true,
        options: [
          { label: "ภาษาอังกฤษ", value: "ภาษาอังกฤษ" },
          { label: "ภาษาเมียนมา", value: "ภาษาเมียนมา" },
          { label: "ภาษากัมพูชา", value: "ภาษากัมพูชา" },
          { label: "ภาษาจีน", value: "ภาษาจีน" },
          { label: "ภาษาลาว", value: "ภาษาลาว" },
          { label: "ภาษาเวียดนาม", value: "ภาษาเวียดนาม" },
          { label: "ภาษาไทใหญ่", value: "ภาษาไทใหญ่" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
      {
        id: "health_info_channel", type: "single_select",
        label: "ช่องทางที่ MSW นิยมใช้ในการรับข้อมูลด้านสุขภาพหรือข้อมูลอื่น ๆ มากที่สุด",
        required: true,
        options: [
          { label: "เพื่อน / เครือข่ายเพื่อน", value: "เพื่อน / เครือข่ายเพื่อน" },
          { label: "Peer outreach / องค์กร", value: "Peer outreach / องค์กร" },
          { label: "สื่อออนไลน์ / โซเชียลมีเดีย", value: "สื่อออนไลน์ / โซเชียลมีเดีย" },
          { label: "แอปพลิเคชัน (เช่น แอปหาคู่)", value: "แอปพลิเคชัน (เช่น แอปหาคู่)" },
          { label: "คลินิก / ชุมชน", value: "คลินิก / ชุมชน" },
          { label: "Other", value: "other", allowTextInput: true },
        ],
      },
    ],
  },
];

const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

// ── Component ───────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

export default function MswRapidAssessmentForm({ onClose }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  // answers: { questionId: value | string[] }
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const now = new Date();
    return {
      survey_date: now.toISOString().slice(0, 10),
      survey_time: now.toTimeString().slice(0, 5),
    };
  });
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [sectionHistory, setSectionHistory] = useState<string[]>(["section_1_basic_info"]);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  const currentSectionId = sectionHistory[sectionHistory.length - 1];
  const currentSection = SECTION_MAP[currentSectionId];
  const isLastSection = currentSectionId === "section_10_health_info";

  // Compute visible section path for progress
  const totalSectionsEstimate = useMemo(() => {
    // Approximate total sections user will see (basic + branch path + main sections)
    const venueCode = answers.venue_code;
    if (venueCode === "bangkok") return 8; // 1,2,3,6,7,8,9or10,10
    if (venueCode === "pattaya_chonburi") return 8;
    return 10; // max
  }, [answers.venue_code]);

  const progressPercent = Math.round((sectionHistory.length / totalSectionsEstimate) * 100);

  const setAnswer = (qId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    setValidationErrors((prev) => ({ ...prev, [qId]: false }));
  };

  const setOtherText = (qId: string, text: string) => {
    setOtherTexts((prev) => ({ ...prev, [qId]: text }));
  };

  // Determine next section based on branching
  const getNextSection = (): string | null => {
    // Check if any question in current section has goToSection on selected option
    for (const q of currentSection.questions) {
      if (q.options) {
        const val = answers[q.id];
        if (typeof val === "string") {
          const selectedOpt = q.options.find((o) => o.value === val);
          if (selectedOpt?.goToSection) return selectedOpt.goToSection;
        }
      }
    }
    // Fall back to section-level nextSection
    if (currentSection.nextSection) return currentSection.nextSection;
    // Find next sequential section
    const idx = SECTIONS.findIndex((s) => s.id === currentSectionId);
    if (idx < SECTIONS.length - 1) return SECTIONS[idx + 1].id;
    return null;
  };

  // Validate current section
  const validateSection = (): boolean => {
    const errors: Record<string, boolean> = {};
    let valid = true;
    for (const q of currentSection.questions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (q.type === "multi_select") {
        if (!val || !Array.isArray(val) || val.length === 0) { errors[q.id] = true; valid = false; }
      } else if (q.type === "email") {
        if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { errors[q.id] = true; valid = false; }
      } else {
        if (!val || (typeof val === "string" && val.trim() === "")) { errors[q.id] = true; valid = false; }
      }
    }
    setValidationErrors(errors);
    return valid;
  };

  const goNext = () => {
    if (!validateSection()) {
      toast.error(isTh ? "กรุณาตอบคำถามที่จำเป็นทั้งหมด" : "Please answer all required questions");
      return;
    }
    const next = getNextSection();
    if (next) setSectionHistory((prev) => [...prev, next]);
  };

  const goBack = () => {
    if (sectionHistory.length > 1) {
      setSectionHistory((prev) => prev.slice(0, -1));
    } else {
      onClose();
    }
  };

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        email: answers.email,
        survey_date: answers.survey_date,
        survey_time: answers.survey_time,
        venue_code: answers.venue_code,
        respondent_type: answers.respondent_type === "other" ? (otherTexts.respondent_type || "other") : answers.respondent_type,
        respondent_type_other: answers.respondent_type === "other" ? otherTexts.respondent_type || null : null,
        venue_type: answers.venue_type === "other" ? (otherTexts.venue_type || "other") : answers.venue_type,
        venue_type_other: answers.venue_type === "other" ? otherTexts.venue_type || null : null,
        msw_count_estimate: answers.msw_count_estimate === "other" ? (otherTexts.msw_count_estimate || "other") : answers.msw_count_estimate,
        msw_count_estimate_other: answers.msw_count_estimate === "other" ? otherTexts.msw_count_estimate || null : null,
        offsite_work_ratio: answers.offsite_work_ratio === "other" ? (otherTexts.offsite_work_ratio || "other") : answers.offsite_work_ratio,
        offsite_work_ratio_other: answers.offsite_work_ratio === "other" ? otherTexts.offsite_work_ratio || null : null,
        nationality_mix: answers.nationality_mix === "other" ? (otherTexts.nationality_mix || "other") : answers.nationality_mix,
        nationality_mix_other: answers.nationality_mix === "other" ? otherTexts.nationality_mix || null : null,
        language_skill: answers.language_skill === "other" ? (otherTexts.language_skill || "other") : answers.language_skill,
        language_skill_other: answers.language_skill === "other" ? otherTexts.language_skill || null : null,
        health_info_language_priority: answers.health_info_language_priority === "other" ? (otherTexts.health_info_language_priority || "other") : answers.health_info_language_priority,
        health_info_language_priority_other: answers.health_info_language_priority === "other" ? otherTexts.health_info_language_priority || null : null,
        health_info_channel: answers.health_info_channel === "other" ? (otherTexts.health_info_channel || "other") : answers.health_info_channel,
        health_info_channel_other: answers.health_info_channel === "other" ? otherTexts.health_info_channel || null : null,
        submitted_by: user?.id || null,
      };

      // Conditional fields
      if (answers.venue_code === "bangkok") {
        payload.bangkok_area = answers.bangkok_area === "other" ? (otherTexts.bangkok_area || "other") : answers.bangkok_area;
        payload.bangkok_area_other = answers.bangkok_area === "other" ? otherTexts.bangkok_area || null : null;
        payload.bangkok_peer_code = answers.bangkok_peer_code === "other" ? (otherTexts.bangkok_peer_code || "other") : answers.bangkok_peer_code;
        payload.bangkok_peer_code_other = answers.bangkok_peer_code === "other" ? otherTexts.bangkok_peer_code || null : null;
      }
      if (answers.venue_code === "pattaya_chonburi") {
        payload.pattaya_area = answers.pattaya_area === "other" ? (otherTexts.pattaya_area || "other") : answers.pattaya_area;
        payload.pattaya_area_other = answers.pattaya_area === "other" ? otherTexts.pattaya_area || null : null;
        payload.pattaya_peer_code = answers.pattaya_peer_code === "other" ? (otherTexts.pattaya_peer_code || "other") : answers.pattaya_peer_code;
        payload.pattaya_peer_code_other = answers.pattaya_peer_code === "other" ? otherTexts.pattaya_peer_code || null : null;
      }

      // Foreign groups (array)
      const fg = (answers.foreign_groups as string[]) || [];
      payload.foreign_groups = fg.filter((v: string) => v !== "other");
      payload.foreign_groups_other = fg.includes("other") ? otherTexts.foreign_groups || null : null;

      // Other language
      if (answers.language_skill === "other_language_primary") {
        payload.other_primary_language = answers.other_primary_language === "other" ? (otherTexts.other_primary_language || "other") : answers.other_primary_language;
        payload.other_primary_language_other = answers.other_primary_language === "other" ? otherTexts.other_primary_language || null : null;
      }

      const { error } = await supabase.from("msw_rapid_assessments" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msw-rapid-assessments"] });
      setSubmitted(true);
    },
    onError: (err: any) => {
      console.error("Submit error:", err);
      toast.error(isTh ? "ส่งข้อมูลไม่สำเร็จ" : "Failed to submit");
    },
  });

  const handleSubmit = () => {
    if (!validateSection()) {
      toast.error(isTh ? "กรุณาตอบคำถามที่จำเป็นทั้งหมด" : "Please answer all required questions");
      return;
    }
    submitMutation.mutate();
  };

  // ── Success state ──
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "ส่งแบบสอบถามสำเร็จ!" : "Assessment Submitted!"}</h2>
        <p className="text-muted-foreground max-w-md">
          {isTh ? "ขอบคุณที่ส่งข้อมูล ข้อมูลของคุณจะถูกนำไปใช้ในการวางแผนงานเท่านั้น" : "Thank you. Your data will be used for planning purposes only."}
        </p>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>{isTh ? "กลับหน้ารายการ" : "Back to List"}</Button>
          <Button onClick={() => {
            setAnswers({ survey_date: new Date().toISOString().slice(0, 10), survey_time: new Date().toTimeString().slice(0, 5) });
            setOtherTexts({});
            setSectionHistory(["section_1_basic_info"]);
            setSubmitted(false);
          }}>
            {isTh ? "ทำแบบสอบถามอีกครั้ง" : "Submit Another"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Question renderers ──
  const renderQuestion = (q: Question) => {
    const hasError = validationErrors[q.id];

    return (
      <div key={q.id} className="space-y-3">
        <Label className={cn("text-sm font-semibold", hasError && "text-destructive")}>
          {q.label}
          {q.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {q.description && <p className="text-xs text-muted-foreground -mt-1">{q.description}</p>}

        {q.type === "email" && (
          <Input
            type="email"
            placeholder="name@example.com"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            className={cn(hasError && "border-destructive")}
          />
        )}

        {q.type === "date" && (
          <Input
            type="date"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            className={cn(hasError && "border-destructive")}
          />
        )}

        {q.type === "time" && (
          <Input
            type="time"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            className={cn(hasError && "border-destructive")}
          />
        )}

        {q.type === "single_select" && q.options && (
          <RadioGroup
            value={answers[q.id] || ""}
            onValueChange={(val) => setAnswer(q.id, val)}
            className="space-y-2"
          >
            {q.options.map((opt) => (
              <div key={opt.value}>
                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    answers[q.id] === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                    hasError && "border-destructive/50"
                  )}
                >
                  <RadioGroupItem value={opt.value} />
                  <span className="text-sm">{opt.label}</span>
                </label>
                {opt.allowTextInput && answers[q.id] === "other" && (
                  <Input
                    className="mt-2 ml-8"
                    placeholder={isTh ? "ระบุ..." : "Specify..."}
                    value={otherTexts[q.id] || ""}
                    onChange={(e) => setOtherText(q.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </RadioGroup>
        )}

        {q.type === "multi_select" && q.options && (
          <div className="space-y-2">
            {q.options.map((opt) => {
              const selected = (answers[q.id] as string[]) || [];
              const isChecked = selected.includes(opt.value);
              return (
                <div key={opt.value}>
                  <label
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isChecked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                      hasError && "border-destructive/50"
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...selected, opt.value]
                          : selected.filter((v) => v !== opt.value);
                        setAnswer(q.id, next);
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                  {opt.allowTextInput && isChecked && (
                    <Input
                      className="mt-2 ml-8"
                      placeholder={isTh ? "ระบุ..." : "Specify..."}
                      value={otherTexts[q.id] || ""}
                      onChange={(e) => setOtherText(q.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasError && (
          <p className="text-xs text-destructive">{isTh ? "กรุณาตอบคำถามนี้" : "This question is required"}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">
            {isTh ? "แบบสอบถาม Peer Rapid MSW" : "Peer Rapid MSW Assessment"}
          </h2>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {isTh
              ? "ประเมินจำนวนโดยประมาณและลักษณะภาพรวมของ MSW ในพื้นที่กรุงเทพฯ และพัทยา"
              : "Estimate MSW count and characteristics in Bangkok & Pattaya"}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentSection.title}</span>
          <span>{Math.min(progressPercent, 100)}%</span>
        </div>
        <Progress value={Math.min(progressPercent, 100)} className="h-2" />
      </div>

      {/* Section card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{currentSection.title}</CardTitle>
              {currentSection.description && (
                <CardDescription className="text-xs">{currentSection.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection.questions.map(renderQuestion)}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pb-8">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {sectionHistory.length > 1 ? (isTh ? "ย้อนกลับ" : "Back") : (isTh ? "ยกเลิก" : "Cancel")}
        </Button>
        {isLastSection ? (
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isTh ? "ส่งแบบสอบถาม" : "Submit"}
          </Button>
        ) : (
          <Button onClick={goNext}>
            {isTh ? "ถัดไป" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
