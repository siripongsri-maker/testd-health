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
  population_groups: string[];
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
  population_groups: [],
  thai_proficiency: "",
  primary_languages: [],
  primary_languages_other: "",
  health_languages: [],
  health_languages_other: "",
  communication_barrier_level: "ไม่มี",
  barrier_observation_note: "",
  interpreter_needed: false,
  comm_channels: [],
  comm_channels_other: "",
  project_implications: [],
  // Backward compat defaults
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

// Updated informant options per spec
const INFORMANT_OPTIONS = ["Bar staff / Bartender", "MSW", "Peer Outreach Worker", "Mamasan", "Venue owner / Manager", "อื่นๆ"];

// Standardized MSW ranges per spec
const MSW_RANGES = ["<10", "10–30", "31–50", "51–100", "100+"];

const NATIONALITY_OPTIONS = ["ไทย", "เมียนมา", "กัมพูชา", "จีน", "สปป. ลาว", "เวียดนาม", "ไทใหญ่", "อื่นๆ"];
const OFFSITE_NATIONALITY_OPTIONS = ["ไทย", "เมียนมา", "กัมพูชา", "จีน", "สปป. ลาว", "เวียดนาม", "ไทใหญ่", "อื่นๆ"];

const HEALTH_LANGUAGE_OPTIONS = ["English", "Myanmar", "Cambodian", "Chinese", "Lao", "Vietnamese", "Tai Yai", "อื่นๆ"];

const COMM_CHANNEL_OPTIONS = [
  "Peer outreach / organization",
  "Online media",
  "Social media",
  "Dating apps (Hornet, Grindr, Jack'd)",
  "Clinics / community",
  "อื่นๆ",
];

const POPULATION_GROUP_OPTIONS = ["MSM", "MSW (Thai)", "MSW (Migrant / Non-Thai)"];

const IMPLICATION_OPTIONS = [
  "ควรใช้สื่อภาพหรือสื่ออ่านง่าย", "ควรพัฒนาสื่อหลายภาษา",
  "ควรมี peer แรงงานข้ามชาติร่วมทำงาน", "ควรเพิ่มการเข้าถึงผ่านช่องทางออนไลน์",
  "ควรมีการติดตามเพิ่มเติม", "ควรมีการเพิ่มสื่อคลิปวิดีโอ",
  "ควรจัดบริการเคลื่อนที่", "ควรพัฒนาชุดความรู้ safer chemsex",
];
const POPULATION_PATTERNS = ["คนไทย", "คนไทยเป็นหลัก", "ไทยและต่างชาติผสม", "ต่างชาติเป็นส่วนใหญ่"];
const MOBILITY_PATTERNS = ["ประจำ (Stable)", "หมุนเวียน (Rotating)", "ตามฤดูกาล (Seasonal)", "ไม่ชัดเจน (Unclear)"];
const BARRIER_LEVELS = ["ไม่มี", "มีบ้าง", "มีมาก"];
const THAI_PROFICIENCY_OPTIONS = [
  { value: "fluent", label: "สื่อสารภาษาไทยได้ดี (Communicates well)" },
  { value: "basic", label: "ภาษาไทยพื้นฐาน (Basic Thai)" },
  { value: "other_primary", label: "ใช้ภาษาอื่นเป็นหลัก (Other language)" },
];

// ── Sections (6 sections — new order) ───────────────────────────
interface SectionDef { key: string; title: string; titleEn: string; icon: string; }

const SECTIONS: SectionDef[] = [
  { key: "informant", title: "ประเภทผู้ให้ข้อมูล", titleEn: "Informant", icon: "🗣️" },
  { key: "location", title: "พื้นที่และบริบท", titleEn: "Location & Context", icon: "📍" },
  { key: "population", title: "ประชากรและรูปแบบงาน", titleEn: "Population & Work Pattern", icon: "👥" },
  { key: "language", title: "ภาษาสำหรับสื่อสุขภาพ", titleEn: "Health Communication Language", icon: "💬" },
  { key: "channels", title: "ช่องทางรับข้อมูล MSW", titleEn: "MSW Communication Channels", icon: "📱" },
  { key: "mel", title: "Population Identity & MEL", titleEn: "Population Identity & Programme Implications", icon: "📊" },
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
    informant: [],
    location: ["survey_date", "start_time", "end_time", "observer_name", "city", "area_name"],
    population: ["msw_estimated_range"],
    language: [],
    channels: [],
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

  // Map pin: use browser geolocation
  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error(isTh ? "เบราว์เซอร์ไม่รองรับ GPS" : "GPS not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setField("map_lat", pos.coords.latitude);
        setField("map_lng", pos.coords.longitude);
        toast.success(isTh ? "จับพิกัดแล้ว" : "Location captured");
      },
      () => toast.error(isTh ? "ไม่สามารถจับพิกัดได้" : "Could not get location"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const payload: any = { ...data, is_draft: isDraft, submitted_by: user?.id || null, record_source: "unified_form" };
      // Sync msw_estimated_range → estimated_msw_count for backward compat
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
      // ─── SECTION 1: INFORMANT (TOP) ───
      case "informant":
        return (
          <div className="space-y-5">
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  🗣️ {isTh ? "ระบุประเภทของผู้ให้ข้อมูลที่พูดคุยด้วยในครั้งนี้ — สามารถเลือกได้มากกว่า 1" : "Select the main person(s) providing this information"}
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ประเภทผู้ให้ข้อมูล" : "Type of Informant"} />
              <HelperText text={isTh ? "เลือกผู้ที่ให้ข้อมูลในระหว่างลงพื้นที่" : "Select the main person providing this information"} />
              <MultiCheckboxField field="informant_type" options={INFORMANT_OPTIONS} />
              {data.informant_type.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label={isTh ? "ระบุประเภทอื่น" : "Specify other"} />
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
                <FieldLabel label={isTh ? "วันที่ลงพื้นที่จริง" : "Survey date"} required error={errors.survey_date} />
                <Input type="date" value={data.survey_date} onChange={(e) => setField("survey_date", e.target.value)} className="min-h-[48px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel label={isTh ? "เริ่ม" : "Start"} required error={errors.start_time} />
                  <Input type="time" value={data.start_time} onChange={(e) => setField("start_time", e.target.value)} className="min-h-[48px]" />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel label={isTh ? "สิ้นสุด" : "End"} required error={errors.end_time} />
                  <Input type="time" value={data.end_time} onChange={(e) => setField("end_time", e.target.value)} className="min-h-[48px]" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ผู้สังเกต / Peer" : "Observer / Peer"} required error={errors.observer_name} />
              <Input placeholder="เช่น นพสร" value={data.observer_name} onChange={(e) => setField("observer_name", e.target.value)} className={cn("min-h-[48px]", errors.observer_name && "border-destructive")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "บทบาทผู้สังเกต" : "Observer role"} />
                <SelectField field="observer_role" options={OBSERVER_ROLES} placeholder="เลือกบทบาท" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "รหัส Peer" : "Peer code"} />
                <Input placeholder="เช่น BKK01" value={data.peer_code} onChange={(e) => setField("peer_code", e.target.value)} className="min-h-[48px]" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "เมือง / จังหวัด" : "City"} required error={errors.city} />
                <SelectField field="city" options={CITIES} placeholder="เลือกเมือง" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "ย่าน (Area / Zone)" : "Area / Zone"} required error={errors.area_name} />
                {areas.length > 0 ? (
                  <SelectField field="area_name" options={areas} placeholder="เลือกพื้นที่" />
                ) : (
                  <Input placeholder="เช่น สีลม" value={data.area_name} onChange={(e) => setField("area_name", e.target.value)} className={cn("min-h-[48px]", errors.area_name && "border-destructive")} />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "รายละเอียดพื้นที่เพิ่มเติม" : "Additional area details"} />
              <HelperText text={isTh ? "ข้อมูลเสริมเกี่ยวกับย่านหรือพื้นที่เฉพาะ" : "Extra context about this area"} />
              <Textarea placeholder="เช่น ซอยที่เฉพาะ จุดรวมตัว" value={data.area_notes} onChange={(e) => setField("area_notes", e.target.value)} className="min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "สถานที่ (รหัส/ชื่อ)" : "Venue alias"} />
              <HelperText text={isTh ? "ไม่ระบุชื่อจริง — ใช้รหัสแทน" : "Use code name, not real venue name"} />
              <Input placeholder="เช่น Venue A / Bar 01" value={data.venue_alias} onChange={(e) => setField("venue_alias", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "ประเภทสถานที่" : "Venue type"} />
                <SelectField field="venue_type" options={VENUE_TYPES} placeholder="เลือกประเภท" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "ประเภท Outreach" : "Outreach type"} />
                <SelectField field="outreach_type" options={OUTREACH_TYPES} />
              </div>
            </div>
            {/* Map Pin */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{isTh ? "📍 ปักหมุดตำแหน่ง" : "📍 Drop Pin"}</p>
                    <p className="text-xs text-muted-foreground">{isTh ? "จับพิกัด GPS เพื่อลดความซ้ำซ้อนของข้อมูลพื้นที่" : "Capture GPS to reduce location duplication"}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={captureLocation} className="min-h-[40px] gap-1">
                    <MapPin className="h-4 w-4" />{isTh ? "จับพิกัด" : "Pin"}
                  </Button>
                </div>
                {data.map_lat && data.map_lng && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    📌 {data.map_lat.toFixed(5)}, {data.map_lng.toFixed(5)}
                  </div>
                )}
                <div className="space-y-1.5">
                  <FieldLabel label={isTh ? "ชื่อสถานที่ (จาก GPS)" : "Venue name (from pin)"} />
                  <HelperText text={isTh ? "ชื่อที่เห็นบน Google Maps — ช่วยลดการตั้งชื่อซ้ำ" : "As shown on map to reduce naming duplication"} />
                  <Input placeholder="เช่น DJ Station" value={data.venue_name} onChange={(e) => setField("venue_name", e.target.value)} className="min-h-[48px]" />
                </div>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ลักษณะการบันทึก" : "Record type"} />
              <SelectField field="record_type" options={RECORD_TYPES} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ระดับความเข้มข้นของกิจกรรม" : "Activity intensity"} />
              <SelectField field="activity_intensity" options={[
                { value: "low", label: "ต่ำ (Low)" },
                { value: "medium", label: "ปานกลาง (Medium)" },
                { value: "high", label: "สูง (High)" },
              ]} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={data.is_known_hotspot} onCheckedChange={(v) => setField("is_known_hotspot", v)} />
                <span className="text-sm">{isTh ? "Hotspot ที่รู้จัก" : "Known hotspot"}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch checked={data.is_emerging_hotspot} onCheckedChange={(v) => setField("is_emerging_hotspot", v)} />
                <span className="text-sm">{isTh ? "Hotspot ใหม่" : "Emerging hotspot"}</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "การเปลี่ยนแปลงจากครั้งก่อน" : "Changes from previous visit"} />
              <Textarea placeholder="เช่น พบกลุ่มเป้าหมายน้อยลง / ย้ายพื้นที่" value={data.visible_changes} onChange={(e) => setField("visible_changes", e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "บันทึกเพิ่มเติมเกี่ยวกับสภาพแวดล้อม" : "Environment notes"} />
              <Textarea placeholder="เช่น ช่วง crowd flow / active hours" value={data.environment_notes} onChange={(e) => setField("environment_notes", e.target.value)} className="min-h-[80px]" />
            </div>
          </div>
        );

      // ─── SECTION 3: POPULATION & WORK PATTERN ───
      case "population":
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "จำนวน MSW ที่พบเห็นต่อคืนโดยประมาณ" : "Estimated MSW per night"} required error={errors.msw_estimated_range} />
              <HelperText text={isTh ? "ประมาณจากการสังเกตหรือข้อมูลจากผู้ให้ข้อมูลในช่วงเวลาที่ลง" : "Estimate based on observation or informant input during this time period"} />
              <SelectField field="msw_estimated_range" options={MSW_RANGES} placeholder="เลือกช่วง" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "จำนวน MSM อื่นๆ ที่พบ (ถ้ามี)" : "Other MSM observed (if any)"} />
              <SelectField field="estimated_msm_count" options={MSW_RANGES} placeholder="เลือกช่วง" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "รูปแบบประชากร (ไทย/ต่างชาติ)" : "Population pattern"} />
              <SelectField field="population_pattern" options={POPULATION_PATTERNS} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "กลุ่มสัญชาติที่พบ" : "Nationality groups observed"} />
              <HelperText text={isTh ? "เลือกกลุ่มสัญชาติที่สังเกตเห็น — เลือก 'อื่นๆ' เพื่อระบุเพิ่มเติม" : "Select all observed — choose 'Other' for unlisted"} />
              <MultiCheckboxField field="nationality_groups" options={NATIONALITY_OPTIONS} />
              {data.nationality_groups.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label={isTh ? "ระบุสัญชาติอื่น" : "Specify other nationality"} />
                  <Input placeholder="เช่น อินเดีย ฟิลิปปินส์" value={data.nationality_other} onChange={(e) => setField("nationality_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "รูปแบบอายุโดยประมาณ" : "Age pattern"} />
              <Input placeholder="เช่น 18-30 เป็นส่วนใหญ่" value={data.age_pattern} onChange={(e) => setField("age_pattern", e.target.value)} className="min-h-[48px]" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "สัดส่วนรับงานนอกสถานที่" : "Offsite work proportion"} />
              <HelperText text={isTh ? "ประมาณสัดส่วน MSW ที่ทำงานนอกสถานที่" : "Approximate offsite work ratio"} />
              <SelectField field="offsite_proportion" options={[
                { value: "low", label: "ต่ำ (Low — <25%)" },
                { value: "medium", label: "ปานกลาง (Medium — 25–50%)" },
                { value: "high", label: "สูง (High — >50%)" },
              ]} placeholder="เลือก" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "สัญชาติที่ทำงานนอกสถานที่บ่อย" : "Nationalities commonly working offsite"} />
              <HelperText text={isTh ? "สัญชาติใดที่พบว่ารับงานนอกสถานที่มากที่สุด" : "Which nationalities are most commonly working offsite?"} />
              <MultiCheckboxField field="offsite_nationalities" options={OFFSITE_NATIONALITY_OPTIONS} />
              {data.offsite_nationalities.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label={isTh ? "ระบุสัญชาติอื่น" : "Specify other"} />
                  <Input placeholder="เช่น อินเดีย" value={data.offsite_nationalities_other} onChange={(e) => setField("offsite_nationalities_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "รูปแบบการเคลื่อนย้าย" : "Mobility pattern"} />
                <SelectField field="mobility_pattern" options={MOBILITY_PATTERNS} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel label={isTh ? "การเชื่อมโยง Online ↔ Offline" : "Online-offline linkage"} />
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
                  💬 {isTh ? "ส่วนนี้โฟกัสการสื่อสารกับ MSW — ประเมินระดับภาษาไทยและภาษาที่ต้องการสำหรับสื่อสุขภาพ" : "MSW-focused: assess Thai proficiency and languages needed for health materials"}
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ระดับภาษาไทยของ MSW ในพื้นที่" : "Thai proficiency of MSW in this area"} />
              <HelperText text={isTh ? "ประเมินจากการพูดคุยจริง — MSW สื่อสารภาษาไทยได้แค่ไหน" : "Assess from actual conversation — how well MSW communicate in Thai"} />
              <SelectField field="thai_proficiency" options={THAI_PROFICIENCY_OPTIONS} placeholder="เลือกระดับ" />
            </div>
            {data.thai_proficiency === "other_primary" && (
              <div className="space-y-3 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
                <div className="space-y-1.5">
                  <FieldLabel label={isTh ? "ภาษาหลักที่ MSW ใช้สื่อสาร" : "Main language used by MSW"} />
                  <HelperText text={isTh ? "เลือกภาษาที่ MSW ใช้จริง — เลือกได้มากกว่า 1" : "Select languages MSW actually use — multi-select"} />
                  <MultiCheckboxField field="primary_languages" options={["เมียนมา", "กัมพูชา", "ลาว", "เวียดนาม", "จีน", "อังกฤษ", "รัสเซีย", "อื่นๆ"]} />
                  {data.primary_languages.includes("อื่นๆ") && (
                    <div className="mt-2 pl-3 border-l-2 border-primary/30">
                      <FieldLabel label={isTh ? "ระบุภาษาอื่น" : "Specify other"} />
                      <Input placeholder="เช่น ฮินดี ญี่ปุ่น" value={data.primary_languages_other} onChange={(e) => setField("primary_languages_other", e.target.value)} className="min-h-[48px] mt-1" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ภาษาที่ควรมีสำหรับสื่อสุขภาพ / ลดอันตราย" : "Languages needed for health / harm reduction materials"} />
              <HelperText text={isTh ? "ภาษาที่จำเป็นในการสื่อสารข้อมูลสุขภาพอย่างมีประสิทธิภาพ" : "Languages needed to effectively deliver health and harm reduction information"} />
              <MultiCheckboxField field="health_languages" options={HEALTH_LANGUAGE_OPTIONS} />
              {data.health_languages.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label={isTh ? "ระบุภาษาอื่น" : "Specify other"} />
                  <Input placeholder="เช่น Hindi Japanese" value={data.health_languages_other} onChange={(e) => setField("health_languages_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ระดับอุปสรรคด้านการสื่อสาร" : "Communication barrier level"} />
              <HelperText text={isTh ? "โดยรวม — MSW เข้าใจข้อมูลสุขภาพที่สื่อสารได้มากน้อยแค่ไหน" : "Overall — how well MSW understand health info communicated"} />
              <SelectField field="communication_barrier_level" options={BARRIER_LEVELS} />
            </div>
            {data.communication_barrier_level === "มีมาก" && (
              <div className="space-y-1.5 pl-3 border-l-2 border-destructive/30">
                <FieldLabel label={isTh ? "อุปสรรคด้านภาษาที่พบ" : "Language barriers observed"} />
                <HelperText text={isTh ? "เช่น MSW ไม่เข้าใจคำแนะนำ / ต้องใช้ล่าม / ไม่สามารถอ่านสื่อที่มี" : "e.g. MSW can't understand advice / need interpreter / can't read materials"} />
                <Textarea placeholder={isTh ? "เขียนข้อสังเกตเกี่ยวกับอุปสรรค" : "Describe barriers"} value={data.barrier_observation_note} onChange={(e) => setField("barrier_observation_note", e.target.value)} className="min-h-[100px]" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={data.interpreter_needed} onCheckedChange={(v) => setField("interpreter_needed", v)} />
              <span className="text-sm">{isTh ? "ต้องการล่ามหรือ Peer ที่พูดภาษาเดียวกับ MSW" : "Interpreter / same-language peer needed"}</span>
            </div>
          </div>
        );

      // ─── SECTION 5: MSW COMMUNICATION CHANNELS ───
      case "channels":
        return (
          <div className="space-y-5">
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  📱 {isTh ? "ช่องทางที่ MSW ใช้รับข้อมูลสุขภาพหรือข้อมูลอื่นๆ" : "Preferred channels MSW use to receive health or other information"}
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ช่องทางที่ MSW นิยมใช้ในการรับข้อมูล" : "MSW preferred information channels"} />
              <HelperText text={isTh ? "ช่องทางที่ MSW ได้รับข้อมูลสุขภาพหรือบริการบ่อยที่สุด" : "Where MSW most often receive health or service information"} />
              <MultiCheckboxField field="comm_channels" options={COMM_CHANNEL_OPTIONS} />
              {data.comm_channels.includes("อื่นๆ") && (
                <div className="mt-2 pl-3 border-l-2 border-primary/30">
                  <FieldLabel label={isTh ? "ระบุช่องทางอื่น" : "Specify other"} />
                  <Input placeholder="เช่น TikTok Twitter/X" value={data.comm_channels_other} onChange={(e) => setField("comm_channels_other", e.target.value)} className="min-h-[48px] mt-1" />
                </div>
              )}
            </div>
          </div>
        );

      // ─── SECTION 6: POPULATION IDENTITY + MEL ───
      case "mel":
        return (
          <div className="space-y-5">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">
                  📊 {isTh ? "เลือกกลุ่มประชากรที่สังเกตเห็น และผลกระทบต่อโครงการ — ข้อเสนอแนะเชิงลึกจะถูกสร้างอัตโนมัติใน Dashboard" : "Select observed population groups and programme implications — detailed insights auto-generated in Dashboard"}
                </p>
              </CardContent>
            </Card>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "กลุ่มประชากรที่พบ" : "Population group observed"} />
              <HelperText text={isTh ? "เลือกทุกกลุ่มที่สังเกตเห็นในการลงพื้นที่ครั้งนี้" : "Select all groups observed in this outreach period"} />
              <MultiCheckboxField field="population_groups" options={POPULATION_GROUP_OPTIONS} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label={isTh ? "ผลกระทบต่อการออกแบบโครงการ" : "Programme implications"} />
              <HelperText text={isTh ? "เลือกหากเกี่ยวข้องกับสิ่งที่สังเกตเห็นในครั้งนี้" : "Select if relevant to what was observed"} />
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
