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
  // Risk signals removed from form — kept in DB for backward compat
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
  // Service section removed from form — kept in DB for backward compat
  service_interests: string[];
  service_barriers: string[];
  preferred_contact_channel: string;
  preferred_service_model: string;
  // Language — MSW focused
  main_language: string;
  other_languages: string;
  communication_barrier_level: string;
  barrier_observation_note: string;
  interpreter_needed: boolean;
  digital_content_language: string;
  // MEL — minimal
  project_implications: string[];
  // Removed fields kept as defaults for DB compat
  key_finding_summary: string;
  recommended_action: string;
  immediate_followup_needed: boolean;
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
  project_implications: [],
  key_finding_summary: "",
  recommended_action: "",
  immediate_followup_needed: false,
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
const NATIONALITY_OPTIONS = ["เมียนมา", "กัมพูชา", "สปป. ลาว", "เวียดนาม", "จีน", "ยุโรป/รัสเซีย", "ไทใหญ่"];
const IMPLICATION_OPTIONS = [
  "ควรใช้สื่อภาพหรือสื่ออ่านง่าย", "ควรพัฒนาสื่อหลายภาษา",
  "ควรมี peer แรงงานข้ามชาติร่วมทำงาน", "ควรเพิ่มการเข้าถึงผ่านช่องทางออนไลน์",
  "ควรมีการติดตามเพิ่มเติม", "ควรมีการเพิ่มสื่อคลิปวิดีโอ",
  "ควรจัดบริการเคลื่อนที่", "ควรพัฒนาชุดความรู้ safer chemsex",
];
const POPULATION_PATTERNS = ["คนไทย", "คนไทยเป็นหลัก", "ไทยและต่างชาติผสม", "ต่างชาติเป็นส่วนใหญ่"];
const MOBILITY_PATTERNS = ["ประจำ (Stable)", "หมุนเวียน (Rotating)", "ตามฤดูกาล (Seasonal)", "ไม่ชัดเจน (Unclear)"];
const BARRIER_LEVELS = ["ไม่มี", "มีบ้าง", "มีมาก"];

// ── Sections (5 sections: removed Risk + Service) ───────────────────
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
  { key: "language", title: "ภาษาและการสื่อสารกับ MSW", titleEn: "Language & MSW Communication", icon: "💬" },
  { key: "mel", title: "ผลกระทบต่อโครงการ", titleEn: "Programme Implications", icon: "📊" },
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

  const requiredBySection: Record<string, (keyof FormData)[]> = {
    basic: ["survey_date", "start_time", "end_time", "observer_name", "city", "area_name"],
    location: [],
    population: ["estimated_msw_count"],
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

      case "language":
        return (
          <div className="space-y-5">
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  💬 ส่วนนี้โฟกัสการสื่อสารกับ MSW — เก็บข้อมูลภาษาที่ใช้จริงในพื้นที่ เพื่อวางแผนสื่อและ peer ที่เหมาะสม
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label="ภาษาที่ใช้สื่อสารกับ MSW" />
              <HelperText text="ภาษาหลักที่ MSW ในพื้นที่นี้ใช้พูดคุยกัน" />
              <Input placeholder="เช่น ไทย / พม่า / อังกฤษง่ายๆ" value={data.main_language} onChange={(e) => setField("main_language", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ภาษาอื่นที่พบในพื้นที่" />
              <HelperText text="ภาษาอื่นที่ได้ยินหรือสังเกตเห็นจาก MSW" />
              <Input placeholder="เช่น กัมพูชา ลาว เมียนมา" value={data.other_languages} onChange={(e) => setField("other_languages", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับความเข้าใจในการสื่อสารกับ MSW" />
              <HelperText text="ประเมินจากการพูดคุยจริง — MSW เข้าใจข้อมูลด้านสุขภาพที่สื่อสารมากน้อยแค่ไหน" />
              <SelectField field="communication_barrier_level" options={BARRIER_LEVELS} />
            </div>
            {data.communication_barrier_level === "มีมาก" && (
              <div className="space-y-1.5 pl-3 border-l-2 border-destructive/30">
                <FieldLabel label="อุปสรรคด้านภาษาที่พบ" />
                <HelperText text="อธิบายสถานการณ์ เช่น MSW ไม่เข้าใจคำแนะนำ / ต้องใช้ล่าม / ไม่สามารถอ่านสื่อที่มีอยู่ได้" />
                <Textarea placeholder="เขียนข้อสังเกตเกี่ยวกับอุปสรรคด้านการสื่อสาร" value={data.barrier_observation_note} onChange={(e) => setField("barrier_observation_note", e.target.value)} className="min-h-[100px]" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={data.interpreter_needed} onCheckedChange={(v) => setField("interpreter_needed", v)} />
              <span className="text-sm">ต้องการล่ามหรือ Peer ที่พูดภาษาเดียวกับ MSW</span>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ภาษาที่ควรมีสำหรับสื่อสุขภาพ / ลดอันตราย" />
              <HelperText text="นอกจากภาษาไทย ควรเพิ่มภาษาใดสำหรับ MSW ในพื้นที่นี้" />
              <Input placeholder="เช่น ภาษาพม่า ภาษาอังกฤษ" value={data.digital_content_language} onChange={(e) => setField("digital_content_language", e.target.value)} className="min-h-[48px]" />
            </div>
          </div>
        );

      case "mel":
        return (
          <div className="space-y-5">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  📊 เลือกผลกระทบต่อการออกแบบโครงการที่เกี่ยวข้อง — ข้อเสนอแนะเชิงลึกจะถูกสร้างอัตโนมัติใน Dashboard วิเคราะห์สถานการณ์
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label="ผลกระทบต่อการออกแบบโครงการ" />
              <HelperText text="เลือกหากเกี่ยวข้องกับสิ่งที่สังเกตเห็นในครั้งนี้" />
              <MultiCheckboxField field="project_implications" options={IMPLICATION_OPTIONS} />
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
