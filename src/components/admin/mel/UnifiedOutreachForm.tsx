import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Save, ClipboardCheck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Form data ───────────────────────────────────────────────────────
interface FormData {
  // Section 1: Informant
  informant_type: string[];
  informant_type_other: string;
  // Section 2: Location
  survey_date: string;
  start_time: string;
  end_time: string;
  observer_name: string;
  observer_role: string;
  peer_code: string;
  city: string;
  area_name: string;
  area_notes: string;
  venue_alias: string;
  venue_type: string;
  venue_name: string;
  map_lat: number | null;
  map_lng: number | null;
  outreach_type: string;
  record_type: string;
  environment_notes: string;
  activity_intensity: string;
  visible_changes: string;
  is_known_hotspot: boolean;
  is_emerging_hotspot: boolean;
  // Section 3: Population & Work Pattern
  msw_estimated_range: string;
  estimated_msw_count: string;
  estimated_msm_count: string;
  population_pattern: string;
  nationality_pattern: string;
  nationality_groups: string[];
  nationality_other: string;
  age_pattern: string;
  online_offline_linkage: string;
  work_pattern: string;
  mobility_pattern: string;
  offsite_proportion: string;
  offsite_nationalities: string[];
  offsite_nationalities_other: string;
  offsite_ratio: string;
  // Section 4: Language
  thai_proficiency: string;
  primary_languages: string[];
  primary_languages_other: string;
  health_languages: string[];
  health_languages_other: string;
  communication_barrier_level: string;
  barrier_observation_note: string;
  interpreter_needed: boolean;
  // Section 5: Channels
  comm_channels: string[];
  comm_channels_other: string;
  // Section 6: MEL
  project_implications: string[];
  // Backward compat defaults (not shown in form)
  population_groups: string[];
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
  digital_content_language: string;
  key_finding_summary: string;
  recommended_action: string;
  immediate_followup_needed: boolean;
  policy_issue: string;
  internal_note: string;
  confidence_level: string;
}

const INITIAL: FormData = {
  informant_type: [],
  informant_type_other: "",
  survey_date: new Date().toISOString().slice(0, 10),
  start_time: "21:00",
  end_time: "23:00",
  observer_name: "",
  observer_role: "",
  peer_code: "",
  city: "",
  area_name: "",
  area_notes: "",
  venue_alias: "",
  venue_type: "",
  venue_name: "",
  map_lat: null,
  map_lng: null,
  outreach_type: "venue",
  record_type: "single_session",
  environment_notes: "",
  activity_intensity: "",
  visible_changes: "",
  is_known_hotspot: false,
  is_emerging_hotspot: false,
  msw_estimated_range: "",
  estimated_msw_count: "",
  estimated_msm_count: "",
  population_pattern: "",
  nationality_pattern: "",
  nationality_groups: [],
  nationality_other: "",
  age_pattern: "",
  online_offline_linkage: "",
  work_pattern: "",
  mobility_pattern: "",
  offsite_proportion: "",
  offsite_nationalities: [],
  offsite_nationalities_other: "",
  offsite_ratio: "",
  thai_proficiency: "",
  primary_languages: [],
  primary_languages_other: "",
  health_languages: [],
  health_languages_other: "",
  communication_barrier_level: "",
  barrier_observation_note: "",
  interpreter_needed: false,
  comm_channels: [],
  comm_channels_other: "",
  project_implications: [],
  // Backward compat defaults
  population_groups: [],
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
  digital_content_language: "",
  key_finding_summary: "",
  recommended_action: "",
  immediate_followup_needed: false,
  policy_issue: "",
  internal_note: "",
  confidence_level: "medium",
};

const DRAFT_KEY = "unified-outreach-draft";
const DRAFT_VERSION = 3; // Increment to force reset stale drafts

// ── Option lists (ALL Thai) ─────────────────────────────────────────
const CITIES = ["กรุงเทพมหานคร", "พัทยา ชลบุรี"];
const BKK_AREAS = ["สีลม", "สวนพลู", "บ่อนไก่", "อินทามระ", "สะพานควาย", "พัฒน์พงษ์", "อารีย์", "บางเขน"];
const PTY_AREAS = ["จอมเทียนคอมเพล็กซ์", "บอยทาวน์", "พัทยาเหนือ", "ซอยก่อไผ่", "Walking Street", "ชัยพูน พัทยาใต้", "ถนนเรียบหาดพัทยาใต้"];
const VENUE_TYPES = ["บาร์", "คลับ", "โกโก้บาร์", "นวด", "ซาวน่า", "ถนน/พื้นที่เปิด", "ออนไลน์"];
const OUTREACH_TYPES = [
  { value: "venue", label: "สถานบริการ" },
  { value: "street", label: "ถนน / พื้นที่เปิด" },
  { value: "online", label: "ออนไลน์" },
  { value: "mixed", label: "ผสมผสาน" },
];
const RECORD_TYPES = [
  { value: "single_session", label: "ครั้งเดียว" },
  { value: "repeated_visit", label: "เยี่ยมซ้ำ" },
  { value: "follow_up", label: "ติดตาม" },
];
const OBSERVER_ROLES = [
  "Peer outreach worker", "เจ้าหน้าที่ภาคสนาม", "ผู้จัดการ", "อาสาสมัคร", "อื่นๆ",
];

const INFORMANT_OPTIONS = ["พนักงานบาร์ / บาร์เทนเดอร์", "MSW", "Peer Outreach Worker", "มาม่าซัง", "เจ้าของสถานที่ / ผู้จัดการ", "อื่นๆ"];

const MSW_RANGES = ["<10", "10–30", "31–50", "51–100", "100+"];

const NATIONALITY_OPTIONS = ["ไทย", "เมียนมา", "กัมพูชา", "จีน", "สปป. ลาว", "เวียดนาม", "ไทใหญ่", "อื่นๆ"];

const HEALTH_LANGUAGE_OPTIONS = ["อังกฤษ", "เมียนมา", "กัมพูชา", "จีน", "ลาว", "เวียดนาม", "ไทใหญ่", "อื่นๆ"];

const COMM_CHANNEL_OPTIONS = [
  "Peer outreach / องค์กร",
  "สื่อออนไลน์",
  "โซเชียลมีเดีย",
  "แอปหาคู่ (Hornet, Grindr, Jack'd)",
  "คลินิก / ชุมชน",
  "อื่นๆ",
];

const OFFSITE_PROPORTION_OPTIONS = [
  { value: "unknown", label: "ไม่รู้" },
  { value: "none", label: "ไม่มี" },
  { value: "low", label: "ต่ำ (<25%)" },
  { value: "medium", label: "ปานกลาง (25–50%)" },
  { value: "medium_high", label: "ค่อนข้างสูง (50–75%)" },
  { value: "high", label: "สูง (>75%)" },
];

const IMPLICATION_OPTIONS = [
  "ควรใช้สื่อภาพหรือสื่ออ่านง่าย", "ควรพัฒนาสื่อหลายภาษา",
  "ควรมี peer แรงงานข้ามชาติร่วมทำงาน", "ควรเพิ่มการเข้าถึงผ่านช่องทางออนไลน์",
  "ควรมีการติดตามเพิ่มเติม", "ควรมีการเพิ่มสื่อคลิปวิดีโอ",
  "ควรจัดบริการเคลื่อนที่", "ควรพัฒนาชุดความรู้ safer chemsex",
];
const POPULATION_PATTERNS = ["คนไทย", "คนไทยเป็นหลัก", "ไทยและต่างชาติผสม", "ต่างชาติเป็นส่วนใหญ่"];
const MOBILITY_PATTERNS = ["ประจำ", "หมุนเวียน", "ตามฤดูกาล", "ไม่ชัดเจน"];
const BARRIER_LEVELS = ["ไม่มี", "มีบ้าง", "มีมาก"];
const THAI_PROFICIENCY_OPTIONS = [
  { value: "fluent", label: "สื่อสารภาษาไทยได้ดี" },
  { value: "basic", label: "ภาษาไทยพื้นฐาน" },
  { value: "other_primary", label: "ใช้ภาษาอื่นเป็นหลัก" },
];

// ── Sections (5 sections — population group removed from MEL) ───
interface SectionDef { key: string; title: string; icon: string; }

const SECTIONS: SectionDef[] = [
  { key: "informant", title: "ประเภทผู้ให้ข้อมูล", icon: "🗣️" },
  { key: "location", title: "พื้นที่และบริบท", icon: "📍" },
  { key: "population", title: "ประชากรและรูปแบบงาน", icon: "👥" },
  { key: "language", title: "ภาษาสำหรับสื่อสุขภาพ", icon: "💬" },
  { key: "channels_mel", title: "ช่องทางรับข้อมูลและข้อเสนอ MEL", icon: "📱" },
];

interface Props { onClose: () => void; }

export default function UnifiedOutreachForm({ onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Force-clear stale drafts on mount
  const [data, setData] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed._v === DRAFT_VERSION) {
          return { ...INITIAL, ...parsed };
        }
      }
    } catch {}
    // Clear any old draft
    localStorage.removeItem(DRAFT_KEY);
    return { ...INITIAL };
  });
  const [sectionIdx, setSectionIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, _v: DRAFT_VERSION })); } catch {}
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
    informant: [],
    location: ["survey_date", "start_time", "end_time", "observer_name", "city", "area_name"],
    population: ["msw_estimated_range"],
    language: [],
    channels_mel: [],
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
      toast.error("กรุณากรอกข้อมูลที่จำเป็น");
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

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setField("map_lat", pos.coords.latitude);
        setField("map_lng", pos.coords.longitude);
        toast.success("จับพิกัดแล้ว");
      },
      () => toast.error("ไม่สามารถจับพิกัดได้"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const payload: any = { ...data, is_draft: isDraft, submitted_by: user?.id || null, record_source: "unified_form" };
      delete payload._v;
      if (payload.msw_estimated_range) payload.estimated_msw_count = payload.msw_estimated_range;
      if (payload.thai_proficiency !== "other_primary") {
        payload.primary_languages = [];
        payload.primary_languages_other = null;
      }
      if (!payload.nationality_groups?.includes("อื่นๆ")) payload.nationality_other = null;
      if (!payload.informant_type?.includes("อื่นๆ")) payload.informant_type_other = null;
      if (!payload.comm_channels?.includes("อื่นๆ")) payload.comm_channels_other = null;
      if (!payload.offsite_nationalities?.includes("อื่นๆ")) payload.offsite_nationalities_other = null;
      if (!payload.health_languages?.includes("อื่นๆ")) payload.health_languages_other = null;
      if (payload.communication_barrier_level !== "มีมาก") payload.barrier_observation_note = null;
      // population_groups not shown but still submitted as empty for backward compat
      payload.population_groups = [];
      const { error } = await supabase.from("outreach_situational_forms" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: (_, isDraft) => {
      clearDraft();
      qc.invalidateQueries({ queryKey: ["outreach-situational"] });
      qc.invalidateQueries({ queryKey: ["mel-combined-dashboard"] });
      if (isDraft) {
        toast.success("บันทึกฉบับร่างแล้ว");
        onClose();
      } else {
        setSubmitted(true);
      }
    },
    onError: () => { toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่"); },
  });

  const handleSubmit = () => {
    if (!validateSection()) {
      toast.error("กรุณากรอกข้อมูลที่จำเป็น");
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
        <h2 className="text-2xl font-bold text-foreground">บันทึกสำเร็จ!</h2>
        <p className="text-muted-foreground max-w-md">ข้อมูลถูกบันทึกเรียบร้อยแล้ว สามารถดูผลได้ที่แท็บวิเคราะห์</p>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>กลับรายการ</Button>
          <Button onClick={() => { setData({ ...INITIAL }); setSectionIdx(0); setSubmitted(false); }}>
            บันทึกอีกครั้ง
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
      // ─── SECTION 1: INFORMANT (TOP) ───
      case "informant":
        return (
          <div className="space-y-5">
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  🗣️ ระบุประเภทของผู้ให้ข้อมูลที่พูดคุยด้วยในครั้งนี้ — สามารถเลือกได้มากกว่า 1
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label="ประเภทผู้ให้ข้อมูล" />
              <HelperText text="เลือกผู้ที่ให้ข้อมูลหลักในระหว่างลงพื้นที่" />
              <MultiCheckboxField field="informant_type" options={INFORMANT_OPTIONS} />
              {data.informant_type.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label="ระบุประเภทอื่น" />
                  <Input placeholder="เช่น เจ้าของร้าน ลูกค้าประจำ" value={data.informant_type_other} onChange={(e) => setField("informant_type_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
          </div>
        );

      // ─── SECTION 2: LOCATION & AREA CONTEXT ───
      case "location":
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="วันที่ลงพื้นที่จริง" required error={errors.survey_date} />
                <HelperText text="วันที่ออกเยี่ยมภาคสนาม" />
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
              <FieldLabel label="ชื่อผู้สังเกต / Peer" required error={errors.observer_name} />
              <HelperText text="ชื่อหรือรหัสของผู้ลงพื้นที่" />
              <Input placeholder="เช่น นพสร" value={data.observer_name} onChange={(e) => setField("observer_name", e.target.value)} className={cn("min-h-[48px]", errors.observer_name && "border-destructive")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="บทบาทผู้สังเกต" />
                <HelperText text="เลือกบทบาทของผู้ลงพื้นที่" />
                <SelectField field="observer_role" options={OBSERVER_ROLES} placeholder="เลือกบทบาท" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="รหัส Peer" />
                <HelperText text="รหัสสำหรับอ้างอิง" />
                <Input placeholder="เช่น BKK01" value={data.peer_code} onChange={(e) => setField("peer_code", e.target.value)} className="min-h-[48px]" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="เมือง / จังหวัด" required error={errors.city} />
                <SelectField field="city" options={CITIES} placeholder="เลือกเมือง" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="ย่าน / พื้นที่" required error={errors.area_name} />
                <HelperText text="เลือกหรือพิมพ์ชื่อย่านที่ลงพื้นที่" />
                {areas.length > 0 ? (
                  <SelectField field="area_name" options={areas} placeholder="เลือกพื้นที่" />
                ) : (
                  <Input placeholder="เช่น สีลม" value={data.area_name} onChange={(e) => setField("area_name", e.target.value)} className={cn("min-h-[48px]", errors.area_name && "border-destructive")} />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="รายละเอียดพื้นที่เพิ่มเติม" />
              <HelperText text="ข้อมูลเสริมเกี่ยวกับย่านหรือพื้นที่เฉพาะ เช่น ซอย จุดรวมตัว" />
              <Textarea placeholder="เช่น ซอยที่เฉพาะ จุดรวมตัว" value={data.area_notes} onChange={(e) => setField("area_notes", e.target.value)} className="min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="สถานที่ (รหัส/ชื่อเล่น)" />
              <HelperText text="ไม่ระบุชื่อจริง — ใช้รหัสแทนเพื่อความปลอดภัย" />
              <Input placeholder="เช่น Venue A / Bar 01" value={data.venue_alias} onChange={(e) => setField("venue_alias", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="ประเภทสถานที่" />
                <SelectField field="venue_type" options={VENUE_TYPES} placeholder="เลือกประเภท" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="ประเภทการลงพื้นที่" />
                <SelectField field="outreach_type" options={OUTREACH_TYPES} />
              </div>
            </div>
            {/* Map Pin */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">📍 ปักหมุดตำแหน่ง</p>
                    <p className="text-xs text-muted-foreground">จับพิกัด GPS เพื่อลดความซ้ำซ้อนของข้อมูลพื้นที่</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={captureLocation} className="min-h-[40px] gap-1">
                    <MapPin className="h-4 w-4" />จับพิกัด
                  </Button>
                </div>
                {data.map_lat && data.map_lng && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    📌 {data.map_lat.toFixed(5)}, {data.map_lng.toFixed(5)}
                  </div>
                )}
                <div className="space-y-1.5">
                  <FieldLabel label="ชื่อสถานที่ (จาก GPS)" />
                  <HelperText text="ชื่อที่เห็นบนแผนที่ — ช่วยลดการตั้งชื่อซ้ำ" />
                  <Input placeholder="เช่น DJ Station" value={data.venue_name} onChange={(e) => setField("venue_name", e.target.value)} className="min-h-[48px]" />
                </div>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label="ลักษณะการบันทึก" />
              <HelperText text="เป็นการลงพื้นที่ครั้งแรก หรือเยี่ยมซ้ำ/ติดตาม" />
              <SelectField field="record_type" options={RECORD_TYPES} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับความเข้มข้นของกิจกรรม" />
              <HelperText text="ประเมินจากบรรยากาศและจำนวนคนที่พบเห็น" />
              <SelectField field="activity_intensity" options={[
                { value: "low", label: "ต่ำ" },
                { value: "medium", label: "ปานกลาง" },
                { value: "high", label: "สูง" },
              ]} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={data.is_known_hotspot} onCheckedChange={(v) => setField("is_known_hotspot", v)} />
                <span className="text-sm">Hotspot ที่รู้จัก</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={data.is_emerging_hotspot} onCheckedChange={(v) => setField("is_emerging_hotspot", v)} />
                <span className="text-sm">Hotspot ใหม่</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="การเปลี่ยนแปลงจากครั้งก่อน" />
              <HelperText text="สิ่งที่แตกต่างจากการลงพื้นที่ครั้งก่อน" />
              <Textarea placeholder="เช่น พบกลุ่มเป้าหมายน้อยลง / ย้ายพื้นที่" value={data.visible_changes} onChange={(e) => setField("visible_changes", e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="บันทึกเพิ่มเติมเกี่ยวกับสภาพแวดล้อม" />
              <HelperText text="สิ่งที่สังเกตเห็นในพื้นที่ เช่น ช่วงเวลา ลักษณะพิเศษ" />
              <Textarea placeholder="เช่น ช่วง crowd flow / active hours" value={data.environment_notes} onChange={(e) => setField("environment_notes", e.target.value)} className="min-h-[80px]" />
            </div>
          </div>
        );

      // ─── SECTION 3: POPULATION & WORK PATTERN ───
      case "population":
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel label="จำนวน MSW ที่พบเห็นต่อคืนโดยประมาณ" required error={errors.msw_estimated_range} />
              <HelperText text="ประมาณจากการสังเกตหรือข้อมูลจากผู้ให้ข้อมูลในช่วงเวลาที่ลง" />
              <SelectField field="msw_estimated_range" options={MSW_RANGES} placeholder="เลือกช่วง" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="จำนวน MSM อื่นๆ ที่พบ (ถ้ามี)" />
              <HelperText text="จำนวน MSM ที่ไม่ใช่ MSW ที่สังเกตเห็นในพื้นที่" />
              <SelectField field="estimated_msm_count" options={MSW_RANGES} placeholder="เลือกช่วง" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="รูปแบบประชากร (ไทย/ต่างชาติ)" />
              <HelperText text="สัดส่วนคนไทยกับต่างชาติที่พบเห็นโดยรวม" />
              <SelectField field="population_pattern" options={POPULATION_PATTERNS} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="กลุ่มสัญชาติที่พบ" />
              <HelperText text="เลือกกลุ่มสัญชาติที่สังเกตเห็น — เลือก 'อื่นๆ' เพื่อระบุเพิ่มเติม" />
              <MultiCheckboxField field="nationality_groups" options={NATIONALITY_OPTIONS} />
              {data.nationality_groups.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label="ระบุสัญชาติอื่น" />
                  <Input placeholder="เช่น อินเดีย ฟิลิปปินส์" value={data.nationality_other} onChange={(e) => setField("nationality_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ช่วงอายุโดยประมาณ" />
              <HelperText text="ช่วงอายุของ MSW ที่พบเห็นมากที่สุด" />
              <Input placeholder="เช่น 18-30 เป็นส่วนใหญ่" value={data.age_pattern} onChange={(e) => setField("age_pattern", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="สัดส่วนรับงานนอกสถานที่" />
              <HelperText text="ประมาณสัดส่วน MSW ที่รับงานนอกสถานบริการ" />
              <SelectField field="offsite_proportion" options={OFFSITE_PROPORTION_OPTIONS} placeholder="เลือก" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="สัญชาติที่ทำงานนอกสถานที่บ่อย" />
              <HelperText text="สัญชาติใดที่พบว่ารับงานนอกสถานที่มากที่สุด" />
              <MultiCheckboxField field="offsite_nationalities" options={NATIONALITY_OPTIONS} />
              {data.offsite_nationalities.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label="ระบุสัญชาติอื่น" />
                  <Input placeholder="เช่น อินเดีย" value={data.offsite_nationalities_other} onChange={(e) => setField("offsite_nationalities_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label="รูปแบบการเคลื่อนย้าย" />
                <HelperText text="MSW อยู่ประจำหรือหมุนเวียนย้ายที่" />
                <SelectField field="mobility_pattern" options={MOBILITY_PATTERNS} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label="การเชื่อมโยง Online ↔ Offline" />
                <HelperText text="MSW ใช้ช่องทางออนไลน์หาลูกค้าอย่างไร" />
                <Input placeholder="เช่น ใช้แอปหาลูกค้าแล้วนัดพบที่บาร์" value={data.online_offline_linkage} onChange={(e) => setField("online_offline_linkage", e.target.value)} className="min-h-[48px]" />
              </div>
            </div>
          </div>
        );

      // ─── SECTION 4: LANGUAGE FOR HEALTH COMMUNICATION ───
      case "language":
        return (
          <div className="space-y-5">
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  💬 ส่วนนี้ประเมินระดับภาษาไทยของ MSW และภาษาที่ต้องการสำหรับสื่อสุขภาพ
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับภาษาไทยของ MSW ในพื้นที่" />
              <HelperText text="ประเมินจากการพูดคุยจริง — MSW สื่อสารภาษาไทยได้แค่ไหน" />
              <SelectField field="thai_proficiency" options={THAI_PROFICIENCY_OPTIONS} placeholder="เลือกระดับ" />
            </div>
            {data.thai_proficiency === "other_primary" && (
              <div className="space-y-3 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
                <div className="space-y-1.5">
                  <FieldLabel label="ภาษาหลักที่ MSW ใช้สื่อสาร" />
                  <HelperText text="เลือกภาษาที่ MSW ใช้จริง — เลือกได้มากกว่า 1" />
                  <MultiCheckboxField field="primary_languages" options={["เมียนมา", "กัมพูชา", "ลาว", "เวียดนาม", "จีน", "อังกฤษ", "รัสเซีย", "อื่นๆ"]} />
                  {data.primary_languages.includes("อื่นๆ") && (
                    <div className="mt-2 pl-3 border-l-2 border-primary/30">
                      <FieldLabel label="ระบุภาษาอื่น" />
                      <Input placeholder="เช่น ฮินดี ญี่ปุ่น" value={data.primary_languages_other} onChange={(e) => setField("primary_languages_other", e.target.value)} className="min-h-[48px] mt-1" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <FieldLabel label="ภาษาที่ควรมีสำหรับสื่อสุขภาพ / ลดอันตราย" />
              <HelperText text="ภาษาที่จำเป็นในการสื่อสารข้อมูลสุขภาพอย่างมีประสิทธิภาพ" />
              <MultiCheckboxField field="health_languages" options={HEALTH_LANGUAGE_OPTIONS} />
              {data.health_languages.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label="ระบุภาษาอื่น" />
                  <Input placeholder="เช่น ฮินดี ญี่ปุ่น" value={data.health_languages_other} onChange={(e) => setField("health_languages_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="ระดับอุปสรรคด้านการสื่อสาร" />
              <HelperText text="โดยรวม — MSW เข้าใจข้อมูลสุขภาพที่สื่อสารได้มากน้อยแค่ไหน" />
              <SelectField field="communication_barrier_level" options={BARRIER_LEVELS} />
            </div>
            {data.communication_barrier_level === "มีมาก" && (
              <div className="space-y-1.5 pl-3 border-l-2 border-destructive/30">
                <FieldLabel label="อุปสรรคด้านภาษาที่พบ" />
                <HelperText text="เช่น MSW ไม่เข้าใจคำแนะนำ / ต้องใช้ล่าม / ไม่สามารถอ่านสื่อที่มี" />
                <Textarea placeholder="เขียนข้อสังเกตเกี่ยวกับอุปสรรค" value={data.barrier_observation_note} onChange={(e) => setField("barrier_observation_note", e.target.value)} className="min-h-[100px]" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={data.interpreter_needed} onCheckedChange={(v) => setField("interpreter_needed", v)} />
              <span className="text-sm">ต้องการล่ามหรือ Peer ที่พูดภาษาเดียวกับ MSW</span>
            </div>
          </div>
        );

      // ─── SECTION 5: CHANNELS + MEL (merged) ───
      case "channels_mel":
        return (
          <div className="space-y-5">
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  📱 ช่องทางที่ MSW ใช้รับข้อมูลสุขภาพ และข้อเสนอแนะเชิงโครงการ
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label="ช่องทางที่ MSW นิยมใช้ในการรับข้อมูล" />
              <HelperText text="ช่องทางที่ MSW ได้รับข้อมูลสุขภาพหรือบริการบ่อยที่สุด" />
              <MultiCheckboxField field="comm_channels" options={COMM_CHANNEL_OPTIONS} />
              {data.comm_channels.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label="ระบุช่องทางอื่น" />
                  <Input placeholder="เช่น TikTok Twitter/X" value={data.comm_channels_other} onChange={(e) => setField("comm_channels_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>

            <div className="border-t border-border pt-5 mt-5">
              <Card className="border-primary/20 bg-primary/5 mb-4">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">
                    📊 ข้อเสนอแนะเชิงโครงการ — เลือกหากเกี่ยวข้องกับสิ่งที่สังเกตเห็นในครั้งนี้
                  </p>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                <FieldLabel label="ผลกระทบต่อการออกแบบโครงการ" />
                <HelperText text="เลือกข้อเสนอแนะที่เกี่ยวข้องกับสิ่งที่พบในครั้งนี้" />
                <MultiCheckboxField field="project_implications" options={IMPLICATION_OPTIONS} />
              </div>
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
          <h2 className="text-lg font-bold text-foreground truncate">แบบฟอร์มรวม Outreach</h2>
          <p className="text-xs text-muted-foreground">
            {currentSection.icon} {currentSection.title}
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
        </CardHeader>
        <CardContent>{renderSection()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm py-3 border-t border-border -mx-4 px-4">
        <Button variant="outline" onClick={goBack} className="min-h-[48px] flex-1">
          <ArrowLeft className="h-4 w-4 mr-1" />{sectionIdx === 0 ? "ยกเลิก" : "ย้อนกลับ"}
        </Button>
        <Button variant="outline" onClick={() => submitMutation.mutate(true)} disabled={submitMutation.isPending} className="min-h-[48px]">
          <Save className="h-4 w-4 mr-1" />ร่าง
        </Button>
        {isLast ? (
          <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="min-h-[48px] flex-1">
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ClipboardCheck className="h-4 w-4 mr-1" />}
            ส่งบันทึก
          </Button>
        ) : (
          <Button onClick={goNext} className="min-h-[48px] flex-1">
            ถัดไป<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
