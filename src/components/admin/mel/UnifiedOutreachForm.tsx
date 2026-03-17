import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Save, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Form data ───────────────────────────────────────────────────────
interface FormData {
  survey_date: string;
  start_time: string;
  end_time: string;
  observer_name: string;
  observer_role: string;
  peer_code: string;
  city: string;
  area_name: string;
  venue_alias: string;
  venue_type: string;
  outreach_type: string;
  record_type: string;
  environment_notes: string;
  activity_intensity: string;
  visible_changes: string;
  is_known_hotspot: boolean;
  is_emerging_hotspot: boolean;
  estimated_msw_count: string;
  estimated_msm_count: string;
  population_pattern: string;
  nationality_pattern: string;
  nationality_groups: string[];
  age_pattern: string;
  online_offline_linkage: string;
  work_pattern: string;
  mobility_pattern: string;
  offsite_ratio: string;
  chemsex_signal: string;
  common_substances: string;
  injection_signal: string;
  mental_health_signal: string;
  violence_safety_signal: string;
  police_pressure_signal: string;
  housing_vulnerability_signal: string;
  access_barrier_signal: string;
  digital_platform_pattern: string;
  urgency_level: string;
  service_interests: string[];
  service_barriers: string[];
  preferred_contact_channel: string;
  preferred_service_model: string;
  main_language: string;
  other_languages: string;
  communication_barrier_level: string;
  barrier_observation_note: string;
  interpreter_needed: boolean;
  digital_content_language: string;
  key_finding_summary: string;
  recommended_action: string;
  immediate_followup_needed: boolean;
  project_implications: string[];
  policy_issue: string;
  internal_note: string;
  confidence_level: string;
}

const INITIAL: FormData = {
  survey_date: new Date().toISOString().slice(0, 10),
  start_time: "21:00",
  end_time: "23:00",
  observer_name: "",
  observer_role: "",
  peer_code: "",
  city: "",
  area_name: "",
  venue_alias: "",
  venue_type: "",
  outreach_type: "venue",
  record_type: "single_session",
  environment_notes: "",
  activity_intensity: "",
  visible_changes: "",
  is_known_hotspot: false,
  is_emerging_hotspot: false,
  estimated_msw_count: "",
  estimated_msm_count: "",
  population_pattern: "",
  nationality_pattern: "",
  nationality_groups: [],
  age_pattern: "",
  online_offline_linkage: "",
  work_pattern: "",
  mobility_pattern: "",
  offsite_ratio: "",
  chemsex_signal: "ไม่พบ",
  common_substances: "",
  injection_signal: "ไม่พบ",
  mental_health_signal: "ไม่พบ",
  violence_safety_signal: "ไม่พบ",
  police_pressure_signal: "ไม่พบ",
  housing_vulnerability_signal: "ไม่พบ",
  access_barrier_signal: "ไม่พบ",
  digital_platform_pattern: "",
  urgency_level: "normal",
  service_interests: [],
  service_barriers: [],
  preferred_contact_channel: "",
  preferred_service_model: "",
  main_language: "",
  other_languages: "",
  communication_barrier_level: "ไม่มี",
  barrier_observation_note: "",
  interpreter_needed: false,
  digital_content_language: "",
  key_finding_summary: "",
  recommended_action: "",
  immediate_followup_needed: false,
  project_implications: [],
  policy_issue: "",
  internal_note: "",
  confidence_level: "medium",
};

const DRAFT_KEY = "unified-outreach-draft";

// ── Option lists ────────────────────────────────────────────────────
const CITIES = ["กรุงเทพมหานคร", "พัทยา ชลบุรี"];
const BKK_AREAS = ["สีลม", "สวนพลู", "บ่อนไก่", "อินทามระ", "สะพานควาย", "พัฒน์พงษ์", "อารีย์", "บางเขน"];
const PTY_AREAS = ["จอมเทียนคอมเพล็กซ์", "บอยทาวน์", "พัทยาเหนือ", "ซอยก่อไผ่", "Walking Street", "ชัยพูน พัทยาใต้", "ถนนเรียบหาดพัทยาใต้"];
const VENUE_TYPES = ["บาร์", "คลับ", "โกโก้บาร์", "นวด", "ซาวน่า", "ถนน/พื้นที่เปิด", "ออนไลน์"];
const OUTREACH_TYPES = [
  { value: "venue", label: "สถานบริการ (Venue)" },
  { value: "street", label: "ถนน / พื้นที่เปิด (Street)" },
  { value: "online", label: "ออนไลน์ (Online)" },
  { value: "mixed", label: "ผสมผสาน (Mixed)" },
];
const RECORD_TYPES = [
  { value: "single_session", label: "ครั้งเดียว (Single)" },
  { value: "repeated_visit", label: "เยี่ยมซ้ำ (Repeated)" },
  { value: "follow_up", label: "ติดตาม (Follow-up)" },
];
const OBSERVER_ROLES = [
  "Peer outreach worker", "เจ้าหน้าที่ภาคสนาม", "ผู้จัดการ", "อาสาสมัคร", "อื่นๆ",
];
const MSW_RANGES = ["0", "1–5", "6–10", "11–20", "21–50", "50+"];
const SIGNAL_OPTIONS = ["ไม่พบ", "พบสัญญาณเล็กน้อย", "พบสัญญาณชัดเจน", "ได้รับรายงาน"];
const URGENCY_OPTIONS = [
  { value: "normal", label: "ปกติ (Normal)" },
  { value: "watch", label: "เฝ้าระวัง (Watch)" },
  { value: "high_concern", label: "น่ากังวลสูง (High Concern)" },
];
const NATIONALITY_OPTIONS = ["เมียนมา", "กัมพูชา", "สปป. ลาว", "เวียดนาม", "จีน", "ยุโรป/รัสเซีย", "ไทใหญ่"];
const SERVICE_INTERESTS = [
  "ตรวจ HIV/STI", "ชุดตรวจ HIV ด้วยตนเอง", "PrEP/PEP", "ให้คำปรึกษา / สุขภาพจิต",
  "Overdose / ช่วยเหลือเร่งด่วน", "ความรุนแรง / ความปลอดภัย", "ส่งต่อบริการ",
  "Peer support", "ติดตามต่อเนื่อง",
];
const SERVICE_BARRIERS = [
  "อุปสรรคด้านภาษา", "การตีตรา / เลือกปฏิบัติ", "เอกสาร / กฎหมาย",
  "เวลา / การเดินทาง", "ไม่ไว้วางใจบริการ", "ไม่รู้ว่ามีบริการ", "ค่าใช้จ่าย",
];
const IMPLICATION_OPTIONS = [
  "ควรใช้สื่อภาพหรือสื่ออ่านง่าย", "ควรพัฒนาสื่อหลายภาษา",
  "ควรมี peer แรงงานข้ามชาติร่วมทำงาน", "ควรเพิ่มการเข้าถึงผ่านช่องทางออนไลน์",
  "ควรมีการติดตามเพิ่มเติม", "ควรมีการเพิ่มสื่อคลิปวิดีโอ",
  "ควรจัดบริการเคลื่อนที่", "ควรพัฒนาชุดความรู้ safer chemsex",
];
const CONFIDENCE_OPTIONS = [
  { value: "low", label: "ต่ำ (Low)" },
  { value: "medium", label: "ปานกลาง (Medium)" },
  { value: "high", label: "สูง (High)" },
];
const POPULATION_PATTERNS = ["คนไทย", "คนไทยเป็นหลัก", "ไทยและต่างชาติผสม", "ต่างชาติเป็นส่วนใหญ่"];
const MOBILITY_PATTERNS = ["ประจำ (Stable)", "หมุนเวียน (Rotating)", "ตามฤดูกาล (Seasonal)", "ไม่ชัดเจน (Unclear)"];
const BARRIER_LEVELS = ["ไม่มี", "มีบ้าง", "มีมาก"];
const CONTACT_CHANNELS = ["LINE", "Facebook", "Instagram", "TikTok", "แอปหาคู่", "โทรศัพท์", "Peer / เพื่อน"];
const SERVICE_MODELS = ["คลินิก (Clinic)", "เคลื่อนที่ (Mobile)", "Outreach", "ออนไลน์ (Online)"];

// ── Sections ────────────────────────────────────────────────────────
interface SectionDef {
  key: string;
  title: string;
  titleEn: string;
  icon: string;
}

const SECTIONS: SectionDef[] = [
  { key: "basic", title: "ข้อมูลพื้นฐาน", titleEn: "Basic Session Info", icon: "📋" },
  { key: "location", title: "พื้นที่และบริบท", titleEn: "Location & Context", icon: "📍" },
  { key: "population", title: "การสังเกตประชากร", titleEn: "Population Observation", icon: "👥" },
  { key: "risk", title: "สัญญาณเชิงพื้นที่", titleEn: "Situational Signals", icon: "⚡" },
  { key: "service", title: "การเข้าถึงบริการ", titleEn: "Service Access & Barriers", icon: "🏥" },
  { key: "language", title: "ภาษาและการสื่อสาร", titleEn: "Language & Communication", icon: "💬" },
  { key: "mel", title: "บันทึก MEL / ข้อเสนอ", titleEn: "Programme Implications", icon: "📊" },
];

interface Props { onClose: () => void; }

export default function UnifiedOutreachForm({ onClose }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const [data, setData] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...INITIAL, ...JSON.parse(saved) };
    } catch {}
    return { ...INITIAL };
  });
  const [sectionIdx, setSectionIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  const clearDraft = useCallback(() => { localStorage.removeItem(DRAFT_KEY); }, []);

  const currentSection = SECTIONS[sectionIdx];
  const isLast = sectionIdx === SECTIONS.length - 1;
  const progressPct = Math.round(((sectionIdx + 1) / SECTIONS.length) * 100);

  const setField = (key: keyof FormData, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  };

  const toggleArray = (key: keyof FormData, value: string) => {
    setData((prev) => {
      const arr = prev[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const areas = data.city === "กรุงเทพมหานคร" ? BKK_AREAS : data.city === "พัทยา ชลบุรี" ? PTY_AREAS : [];

  // Validate current section required fields
  const requiredBySection: Record<string, (keyof FormData)[]> = {
    basic: ["survey_date", "start_time", "end_time", "observer_name", "city", "area_name"],
    location: [],
    population: ["estimated_msw_count"],
    risk: [],
    service: [],
    language: [],
    mel: [],
  };

  const validateSection = (): boolean => {
    const required = requiredBySection[currentSection.key] || [];
    const errs: Record<string, boolean> = {};
    let valid = true;
    for (const f of required) {
      const val = data[f];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        errs[f] = true;
        valid = false;
      }
    }
    setErrors(errs);
    return valid;
  };

  const goNext = () => {
    if (!validateSection()) {
      toast.error(isTh ? "กรุณากรอกข้อมูลที่จำเป็น" : "Please fill required fields");
      return;
    }
    setSectionIdx((i) => Math.min(i + 1, SECTIONS.length - 1));
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (sectionIdx > 0) setSectionIdx((i) => i - 1);
    else onClose();
    window.scrollTo(0, 0);
  };

  const submitMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const payload: any = { ...data, is_draft: isDraft, submitted_by: user?.id || null, record_source: "unified_form" };
      // Clean up
      if (payload.estimated_msw_count === "") payload.estimated_msw_count = null;
      if (payload.communication_barrier_level !== "มีมาก") payload.barrier_observation_note = null;
      const { error } = await supabase.from("outreach_situational_forms" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: (_, isDraft) => {
      clearDraft();
      qc.invalidateQueries({ queryKey: ["outreach-situational"] });
      qc.invalidateQueries({ queryKey: ["mel-combined-dashboard"] });
      if (isDraft) {
        toast.success(isTh ? "บันทึกฉบับร่างแล้ว" : "Draft saved");
        onClose();
      } else {
        setSubmitted(true);
      }
    },
    onError: () => { toast.error(isTh ? "เกิดข้อผิดพลาด" : "Failed to save"); },
  });

  const handleSubmit = () => {
    if (!validateSection()) {
      toast.error(isTh ? "กรุณากรอกข้อมูลที่จำเป็น" : "Please fill required fields");
      return;
    }
    submitMutation.mutate(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "บันทึกสำเร็จ!" : "Submission Recorded!"}</h2>
        <p className="text-muted-foreground max-w-md">{isTh ? "ข้อมูลถูกบันทึกเรียบร้อยแล้ว" : "Your observation has been recorded."}</p>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>{isTh ? "กลับรายการ" : "Back"}</Button>
          <Button onClick={() => { setData({ ...INITIAL }); setSectionIdx(0); setSubmitted(false); }}>
            {isTh ? "บันทึกอีกครั้ง" : "New Entry"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Helpers ──
  const FieldLabel = ({ label, required = false, error = false }: { label: string; required?: boolean; error?: boolean }) => (
    <Label className={cn("text-sm font-medium", error && "text-destructive")}>{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
  );

  const HelperText = ({ text }: { text: string }) => (
    <p className="text-xs text-muted-foreground mt-0.5">{text}</p>
  );

  const SelectField = ({ field, options, placeholder }: { field: keyof FormData; options: string[] | { value: string; label: string }[]; placeholder?: string }) => (
    <Select value={data[field] as string} onValueChange={(v) => setField(field, v)}>
      <SelectTrigger className={cn("min-h-[48px]", errors[field] && "border-destructive")}>
        <SelectValue placeholder={placeholder || "เลือก..."} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const label = typeof o === "string" ? o : o.label;
          return <SelectItem key={val} value={val}>{label}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );

  const MultiCheckboxField = ({ field, options }: { field: keyof FormData; options: string[] }) => (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => (
        <label key={opt} className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px]",
          (data[field] as string[]).includes(opt) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
        )}>
          <Checkbox checked={(data[field] as string[]).includes(opt)} onCheckedChange={() => toggleArray(field, opt)} />
          <span className="text-sm">{opt}</span>
        </label>
      ))}
    </div>
  );

  const SignalField = ({ field, label, helper }: { field: keyof FormData; label: string; helper?: string }) => (
    <div className="space-y-1.5">
      <FieldLabel label={label} />
      {helper && <HelperText text={helper} />}
      <SelectField field={field} options={SIGNAL_OPTIONS} />
    </div>
  );

  // ── Section renderers ──
  const renderSection = () => {
    switch (currentSection.key) {
      case "basic":
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="วันที่ลงพื้นที่จริง" required error={errors.survey_date} />
                <Input type="date" value={data.survey_date} onChange={(e) => setField("survey_date", e.target.value)} className="min-h-[48px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel label="เริ่ม" required error={errors.start_time} />
                  <Input type="time" value={data.start_time} onChange={(e) => setField("start_time", e.target.value)} className="min-h-[48px]" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label="สิ้นสุด" required error={errors.end_time} />
                  <Input type="time" value={data.end_time} onChange={(e) => setField("end_time", e.target.value)} className="min-h-[48px]" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ผู้สังเกต / Peer" required error={errors.observer_name} />
              <Input placeholder="เช่น นพสร" value={data.observer_name} onChange={(e) => setField("observer_name", e.target.value)} className={cn("min-h-[48px]", errors.observer_name && "border-destructive")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="บทบาทผู้สังเกต" />
                <SelectField field="observer_role" options={OBSERVER_ROLES} placeholder="เลือกบทบาท" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="รหัส Peer" />
                <Input placeholder="เช่น BKK01" value={data.peer_code} onChange={(e) => setField("peer_code", e.target.value)} className="min-h-[48px]" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="เมือง / จังหวัด" required error={errors.city} />
                <SelectField field="city" options={CITIES} placeholder="เลือกเมือง" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="พื้นที่ / ย่าน" required error={errors.area_name} />
                {areas.length > 0 ? (
                  <SelectField field="area_name" options={areas} placeholder="เลือกพื้นที่" />
                ) : (
                  <Input placeholder="เช่น สีลม" value={data.area_name} onChange={(e) => setField("area_name", e.target.value)} className={cn("min-h-[48px]", errors.area_name && "border-destructive")} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="ประเภท Outreach" />
                <SelectField field="outreach_type" options={OUTREACH_TYPES} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="ลักษณะการบันทึก" />
                <SelectField field="record_type" options={RECORD_TYPES} />
              </div>
            </div>
          </div>
        );

      case "location":
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel label="สถานที่ (รหัส/ชื่อเรียกแทน)" />
              <HelperText text="ไม่ระบุชื่อจริงของสถานที่ — ใช้รหัสแทน" />
              <Input placeholder="เช่น Venue A / Bar 01" value={data.venue_alias} onChange={(e) => setField("venue_alias", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ประเภทสถานที่" />
              <SelectField field="venue_type" options={VENUE_TYPES} placeholder="เลือกประเภท" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับความเข้มข้นของกิจกรรม" />
              <SelectField field="activity_intensity" options={[
                { value: "low", label: "ต่ำ (Low)" },
                { value: "medium", label: "ปานกลาง (Medium)" },
                { value: "high", label: "สูง (High)" },
              ]} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={data.is_known_hotspot} onCheckedChange={(v) => setField("is_known_hotspot", v)} />
                <span className="text-sm">Hotspot ที่รู้จัก</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={data.is_emerging_hotspot} onCheckedChange={(v) => setField("is_emerging_hotspot", v)} />
                <span className="text-sm">Hotspot ใหม่ที่กำลังเกิดขึ้น</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="การเปลี่ยนแปลงที่สังเกตเห็นจากการเยี่ยมครั้งก่อน" />
              <Textarea placeholder="เช่น พบกลุ่มเป้าหมายน้อยลง / มีการย้ายพื้นที่" value={data.visible_changes} onChange={(e) => setField("visible_changes", e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="บันทึกเพิ่มเติมเกี่ยวกับสภาพแวดล้อม" />
              <Textarea placeholder="เช่น ช่วง crowd flow / active hours" value={data.environment_notes} onChange={(e) => setField("environment_notes", e.target.value)} className="min-h-[80px]" />
            </div>
          </div>
        );

      case "population":
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel label="จำนวน MSW ที่พบเห็นโดยประมาณ" required error={errors.estimated_msw_count} />
              <HelperText text="นับคร่าวๆ ในช่วงเวลาที่ลงพื้นที่" />
              <SelectField field="estimated_msw_count" options={MSW_RANGES} placeholder="เลือกช่วง" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="จำนวน MSM อื่นๆ ที่พบ (ถ้ามี)" />
              <SelectField field="estimated_msm_count" options={MSW_RANGES} placeholder="เลือกช่วง" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="รูปแบบประชากร (ไทย/ต่างชาติ)" />
              <SelectField field="population_pattern" options={POPULATION_PATTERNS} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="กลุ่มสัญชาติที่พบ" />
              <MultiCheckboxField field="nationality_groups" options={NATIONALITY_OPTIONS} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="รูปแบบอายุโดยประมาณ" />
              <Input placeholder="เช่น 18-30 เป็นส่วนใหญ่" value={data.age_pattern} onChange={(e) => setField("age_pattern", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="สัดส่วนรับงานนอกสถานที่" />
                <SelectField field="offsite_ratio" options={["ไม่รู้", "ไม่มี", "น้อยกว่า 25%", "ประมาณ 50%", "มากกว่า 75%"]} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="รูปแบบการเคลื่อนย้าย" />
                <SelectField field="mobility_pattern" options={MOBILITY_PATTERNS} />
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="การเชื่อมโยง Online ↔ Offline" />
              <Input placeholder="เช่น ใช้แอปหาลูกค้าแล้วนัดพบที่บาร์" value={data.online_offline_linkage} onChange={(e) => setField("online_offline_linkage", e.target.value)} className="min-h-[48px]" />
            </div>
          </div>
        );

      case "risk":
        return (
          <div className="space-y-5">
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  💡 ข้อมูลในส่วนนี้ใช้ถ้อยคำเชิงสังเกต เช่น "พบสัญญาณ" หรือ "ได้รับรายงาน" เพื่อไม่ตีตราหรือระบุตัวบุคคล
                </p>
              </CardContent>
            </Card>
            <SignalField field="chemsex_signal" label="สัญญาณกิจกรรม Chemsex ในพื้นที่" helper="ข้อมูลที่ได้รับจากการพูดคุยหรือข้อสังเกตเชิงพื้นที่" />
            {(data.chemsex_signal !== "ไม่พบ") && (
              <div className="space-y-1.5 pl-3 border-l-2 border-primary/30">
                <FieldLabel label="สารที่ถูกกล่าวถึง / สังเกตเห็น" />
                <Input placeholder="เช่น crystal meth, GHB" value={data.common_substances} onChange={(e) => setField("common_substances", e.target.value)} className="min-h-[48px]" />
              </div>
            )}
            <SignalField field="injection_signal" label="สัญญาณการฉีด / Slamming" />
            <SignalField field="mental_health_signal" label="สัญญาณปัญหาสุขภาพจิต" helper="ความเครียด ซึมเศร้า หรือวิตกกังวลที่สังเกตเห็น" />
            <SignalField field="violence_safety_signal" label="สัญญาณความรุนแรง / ความปลอดภัย" />
            <SignalField field="police_pressure_signal" label="แรงกดดันจากเจ้าหน้าที่ / ตำรวจ" />
            <SignalField field="housing_vulnerability_signal" label="ปัญหาที่อยู่อาศัย / เศรษฐกิจ" />
            <SignalField field="access_barrier_signal" label="อุปสรรคในการเข้าถึงบริการสุขภาพ" />
            <div className="space-y-1.5">
              <FieldLabel label="รูปแบบการใช้แพลตฟอร์มดิจิทัล" />
              <Input placeholder="เช่น ใช้ Grindr / Line group" value={data.digital_platform_pattern} onChange={(e) => setField("digital_platform_pattern", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับความเร่งด่วน" />
              <SelectField field="urgency_level" options={URGENCY_OPTIONS} />
            </div>
          </div>
        );

      case "service":
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel label="ความสนใจ/ต้องการบริการ" />
              <HelperText text="เลือกบริการที่มีความต้องการหรือความสนใจจากกลุ่มเป้าหมาย" />
              <MultiCheckboxField field="service_interests" options={SERVICE_INTERESTS} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="อุปสรรค/สิ่งกีดขวางในการเข้าถึงบริการ" />
              <MultiCheckboxField field="service_barriers" options={SERVICE_BARRIERS} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="ช่องทางติดต่อที่นิยม" />
                <SelectField field="preferred_contact_channel" options={CONTACT_CHANNELS} placeholder="เลือกช่องทาง" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="รูปแบบบริการที่เหมาะสม" />
                <SelectField field="preferred_service_model" options={SERVICE_MODELS} placeholder="เลือกรูปแบบ" />
              </div>
            </div>
          </div>
        );

      case "language":
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel label="ภาษาหลักที่ใช้สื่อสาร" />
              <Input placeholder="เช่น ไทย / พม่า / อังกฤษง่ายๆ" value={data.main_language} onChange={(e) => setField("main_language", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ภาษาอื่นที่พบ" />
              <Input placeholder="เช่น กัมพูชา ลาว" value={data.other_languages} onChange={(e) => setField("other_languages", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับอุปสรรคด้านการสื่อสาร" />
              <SelectField field="communication_barrier_level" options={BARRIER_LEVELS} />
            </div>
            {data.communication_barrier_level === "มีมาก" && (
              <div className="space-y-1.5 pl-3 border-l-2 border-destructive/30">
                <FieldLabel label="ข้อสังเกตเพิ่มเติม" />
                <Textarea placeholder="เขียนข้อสังเกตเกี่ยวกับอุปสรรคด้านการสื่อสาร" value={data.barrier_observation_note} onChange={(e) => setField("barrier_observation_note", e.target.value)} className="min-h-[100px]" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={data.interpreter_needed} onCheckedChange={(v) => setField("interpreter_needed", v)} />
              <span className="text-sm">ต้องการล่าม / Peer ที่พูดภาษาเดียวกัน</span>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ภาษาที่ต้องการสำหรับสื่อดิจิทัล" />
              <Input placeholder="เช่น ภาษาพม่า ภาษาอังกฤษ" value={data.digital_content_language} onChange={(e) => setField("digital_content_language", e.target.value)} className="min-h-[48px]" />
            </div>
          </div>
        );

      case "mel":
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel label="สรุปข้อค้นพบสำคัญ" />
              <Textarea placeholder="สรุปสิ่งที่ค้นพบจากการลงพื้นที่ครั้งนี้" value={data.key_finding_summary} onChange={(e) => setField("key_finding_summary", e.target.value)} className="min-h-[100px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ข้อเสนอแนะ / สิ่งที่ควรดำเนินการ" />
              <Textarea placeholder="เช่น ควรจัดทีม outreach ภาษาพม่า / ควรเพิ่ม mobile clinic" value={data.recommended_action} onChange={(e) => setField("recommended_action", e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={data.immediate_followup_needed} onCheckedChange={(v) => setField("immediate_followup_needed", v)} />
              <span className="text-sm font-medium">ต้องติดตามเร่งด่วน</span>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ผลกระทบต่อการออกแบบโครงการ" />
              <MultiCheckboxField field="project_implications" options={IMPLICATION_OPTIONS} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ประเด็นเชิงนโยบาย / ระบบ" />
              <Textarea placeholder="เช่น ปัญหาเอกสาร / ข้อจำกัดทางกฎหมาย" value={data.policy_issue} onChange={(e) => setField("policy_issue", e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="บันทึกภายใน (สำหรับทีมงานเท่านั้น)" />
              <Textarea placeholder="บันทึกที่ไม่เผยแพร่ภายนอก" value={data.internal_note} onChange={(e) => setField("internal_note", e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับความมั่นใจในข้อมูล" />
              <SelectField field="confidence_level" options={CONFIDENCE_OPTIONS} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0 h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{isTh ? "แบบฟอร์มรวม Outreach" : "Unified Outreach Form"}</h2>
          <p className="text-xs text-muted-foreground">
            {currentSection.icon} {currentSection.title} <span className="text-muted-foreground/60">/ {currentSection.titleEn}</span>
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{sectionIdx + 1}/{SECTIONS.length}</span>
      </div>

      {/* Progress */}
      <Progress value={progressPct} className="h-2" />

      {/* Section pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SECTIONS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { if (i < sectionIdx) setSectionIdx(i); }}
            className={cn(
              "shrink-0 px-2.5 py-1 text-xs rounded-full transition-colors border",
              i === sectionIdx ? "bg-primary text-primary-foreground border-primary" :
              i < sectionIdx ? "bg-primary/10 text-primary border-primary/20 cursor-pointer" :
              "bg-muted text-muted-foreground border-border"
            )}
          >
            {s.icon}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{currentSection.title}</CardTitle>
          <CardDescription className="text-xs">{currentSection.titleEn}</CardDescription>
        </CardHeader>
        <CardContent>{renderSection()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 border-t border-border -mx-4 px-4">
        <Button variant="outline" onClick={goBack} className="min-h-[48px] flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" />{sectionIdx === 0 ? (isTh ? "ยกเลิก" : "Cancel") : (isTh ? "ย้อนกลับ" : "Back")}
        </Button>
        <Button variant="outline" onClick={() => submitMutation.mutate(true)} disabled={submitMutation.isPending} className="min-h-[48px]">
          <Save className="h-4 w-4 mr-1" />{isTh ? "ร่าง" : "Draft"}
        </Button>
        {isLast ? (
          <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="min-h-[48px] flex-1">
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ClipboardCheck className="h-4 w-4 mr-1" />}
            {isTh ? "ส่งบันทึก" : "Submit"}
          </Button>
        ) : (
          <Button onClick={goNext} className="min-h-[48px] flex-1">
            {isTh ? "ถัดไป" : "Next"}<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
