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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────
interface FieldNoteData {
  visit_date: string;
  start_time: string;
  end_time: string;
  observer_name: string;
  city: string;
  area_name: string;
  venue_alias: string;
  estimated_msw_seen: number | "";
  estimated_offsite_clients: string;
  visible_nationality_ratio: string;
  info_sources: string[];
  estimated_msw_per_night_range: string;
  foreign_msw_ratio: string;
  main_nationality_groups: string;
  common_languages: string;
  communication_barrier_level: string;
  barrier_observation_note: string;
  project_implications: string[];
  internal_note: string;
}

const INITIAL: FieldNoteData = {
  visit_date: new Date().toISOString().slice(0, 10),
  start_time: "21:00",
  end_time: "23:00",
  observer_name: "",
  city: "",
  area_name: "",
  venue_alias: "",
  estimated_msw_seen: "",
  estimated_offsite_clients: "",
  visible_nationality_ratio: "",
  info_sources: [],
  estimated_msw_per_night_range: "",
  foreign_msw_ratio: "",
  main_nationality_groups: "",
  common_languages: "",
  communication_barrier_level: "",
  barrier_observation_note: "",
  project_implications: [],
  internal_note: "",
};

const DRAFT_KEY = "field-note-draft";

const CITIES = ["กรุงเทพมหานคร", "พัทยา ชลบุรี"];
const INFO_SOURCE_OPTIONS = [
  "ผู้จัดการบาร์",
  "พนักงานบาร์ / บาร์เทนเดอร์",
  "MSW",
  "Peer outreach worker",
];
const FOREIGN_RATIO_OPTIONS = ["ไม่มี", "น้อยกว่า 25%", "ประมาณ 50%", "มากกว่า 75%"];
const BARRIER_OPTIONS = ["ไม่มี", "มีบ้าง", "มีมาก"];
const IMPLICATION_OPTIONS = [
  "ควรใช้สื่อภาพหรือสื่ออ่านง่าย",
  "ควรพัฒนาสื่อหลายภาษา",
  "ควรมี peer แรงงานข้ามชาติร่วมทำงาน",
  "ควรเพิ่มการเข้าถึงผ่านช่องทางออนไลน์",
  "ควรมีการติดตามเพิ่มเติม",
  "ควรมีการเพิ่มสื่อคลิปวิดีโอ",
];

// ── Sections ────────────────────────────────────────────────────────
interface SectionDef {
  key: string;
  title: string;
  titleEn: string;
  fields: string[];
}

const SECTIONS: SectionDef[] = [
  { key: "basic_info", title: "ข้อมูลพื้นฐานการลงพื้นที่", titleEn: "Basic Visit Info", fields: ["visit_date", "start_time", "end_time", "observer_name"] },
  { key: "location", title: "รายละเอียดพื้นที่", titleEn: "Location Details", fields: ["city", "area_name", "venue_alias"] },
  { key: "observation", title: "บันทึกการสังเกต", titleEn: "Observation Notes", fields: ["estimated_msw_seen", "estimated_offsite_clients", "visible_nationality_ratio"] },
  { key: "informant", title: "ข้อมูลจากผู้ให้บริการ", titleEn: "Informant Sources", fields: ["info_sources", "estimated_msw_per_night_range", "foreign_msw_ratio", "main_nationality_groups"] },
  { key: "language", title: "ภาษาและการสื่อสาร", titleEn: "Language & Communication", fields: ["common_languages", "communication_barrier_level", "barrier_observation_note"] },
  { key: "implications", title: "ผลกระทบต่อการออกแบบโครงการ", titleEn: "Project Implications", fields: ["project_implications", "internal_note"] },
];

// ── Component ───────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
}

export default function FieldNoteForm({ onClose }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const [data, setData] = useState<FieldNoteData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...INITIAL, ...JSON.parse(saved) };
    } catch {}
    return { ...INITIAL };
  });
  const [sectionIdx, setSectionIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  // Auto-save draft
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const currentSection = SECTIONS[sectionIdx];
  const isLast = sectionIdx === SECTIONS.length - 1;
  const progressPct = Math.round(((sectionIdx + 1) / SECTIONS.length) * 100);

  const setField = (key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: false }));
  };

  const toggleArray = (key: string, value: string) => {
    setData((prev) => {
      const arr = (prev as any)[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
    setErrors((prev) => ({ ...prev, [key]: false }));
  };

  // Validation
  const validateSection = (): boolean => {
    const errs: Record<string, boolean> = {};
    let valid = true;
    for (const f of currentSection.fields) {
      // Skip conditional field
      if (f === "barrier_observation_note") continue;
      if (f === "internal_note") continue;
      const val = (data as any)[f];
      if (f === "info_sources" || f === "project_implications") {
        if (!Array.isArray(val) || val.length === 0) { errs[f] = true; valid = false; }
      } else if (f === "estimated_msw_seen") {
        if (val === "" || val === null || val === undefined) { errs[f] = true; valid = false; }
      } else {
        if (!val || (typeof val === "string" && val.trim() === "")) { errs[f] = true; valid = false; }
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
  };
  const goBack = () => {
    if (sectionIdx > 0) setSectionIdx((i) => i - 1);
    else onClose();
  };

  // Submit
  const submitMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const payload: any = {
        visit_date: data.visit_date,
        start_time: data.start_time,
        end_time: data.end_time,
        observer_name: data.observer_name.trim(),
        city: data.city,
        area_name: data.area_name.trim(),
        venue_alias: data.venue_alias.trim(),
        estimated_msw_seen: typeof data.estimated_msw_seen === "number" ? data.estimated_msw_seen : parseInt(String(data.estimated_msw_seen)) || 0,
        estimated_offsite_clients: data.estimated_offsite_clients.trim(),
        visible_nationality_ratio: data.visible_nationality_ratio.trim(),
        info_sources: data.info_sources,
        estimated_msw_per_night_range: data.estimated_msw_per_night_range.trim(),
        foreign_msw_ratio: data.foreign_msw_ratio,
        main_nationality_groups: data.main_nationality_groups.trim(),
        common_languages: data.common_languages.trim(),
        communication_barrier_level: data.communication_barrier_level,
        barrier_observation_note: data.communication_barrier_level === "มีมาก" ? data.barrier_observation_note.trim() || null : null,
        project_implications: data.project_implications,
        internal_note: data.internal_note.trim() || null,
        is_draft: isDraft,
        submitted_by: user?.id || null,
      };
      const { error } = await supabase.from("field_notes" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: (_, isDraft) => {
      clearDraft();
      qc.invalidateQueries({ queryKey: ["field-notes"] });
      if (isDraft) {
        toast.success(isTh ? "บันทึกฉบับร่างแล้ว" : "Draft saved");
        onClose();
      } else {
        setSubmitted(true);
      }
    },
    onError: () => {
      toast.error(isTh ? "เกิดข้อผิดพลาด" : "Failed to save");
    },
  });

  const handleSubmit = () => {
    if (!validateSection()) {
      toast.error(isTh ? "กรุณากรอกข้อมูลที่จำเป็น" : "Please fill required fields");
      return;
    }
    submitMutation.mutate(false);
  };

  // ── Success ──
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "บันทึกสำเร็จ!" : "Field Note Submitted!"}</h2>
        <p className="text-muted-foreground max-w-md">
          {isTh ? "ข้อมูลถูกบันทึกเรียบร้อยแล้ว" : "Your field note has been recorded."}
        </p>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>{isTh ? "กลับรายการ" : "Back to List"}</Button>
          <Button onClick={() => {
            setData({ ...INITIAL, visit_date: new Date().toISOString().slice(0, 10) });
            setSectionIdx(0);
            setSubmitted(false);
          }}>
            {isTh ? "บันทึกอีกครั้ง" : "New Note"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Field Renderer ──
  const renderField = (key: string) => {
    const hasError = errors[key];
    const errClass = hasError ? "border-destructive" : "";

    switch (key) {
      case "visit_date":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>วันที่ลงพื้นที่จริง <span className="text-destructive">*</span></Label>
            <Input type="date" value={data.visit_date} onChange={(e) => setField("visit_date", e.target.value)} className={errClass} />
          </div>
        );
      case "start_time":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>ช่วงเวลา (เริ่ม) <span className="text-destructive">*</span></Label>
            <Input type="time" value={data.start_time} onChange={(e) => setField("start_time", e.target.value)} className={errClass} />
          </div>
        );
      case "end_time":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>ช่วงเวลา (สิ้นสุด) <span className="text-destructive">*</span></Label>
            <Input type="time" value={data.end_time} onChange={(e) => setField("end_time", e.target.value)} className={errClass} />
          </div>
        );
      case "observer_name":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>เจ้าหน้าที่ / Peer ผู้สังเกต <span className="text-destructive">*</span></Label>
            <Input placeholder="เช่น นพสร" value={data.observer_name} onChange={(e) => setField("observer_name", e.target.value)} className={errClass} />
          </div>
        );
      case "city":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>เมือง <span className="text-destructive">*</span></Label>
            <Select value={data.city} onValueChange={(v) => setField("city", v)}>
              <SelectTrigger className={errClass}><SelectValue placeholder="เลือกเมือง" /></SelectTrigger>
              <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      case "area_name":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>พื้นที่ / ถนน <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">ระบุชื่อพื้นที่กว้างๆ เช่น สีลม พัฒน์พงศ์ Walking Street</p>
            <Input placeholder="เช่น พัฒน์พงศ์" value={data.area_name} onChange={(e) => setField("area_name", e.target.value)} className={errClass} />
          </div>
        );
      case "venue_alias":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>ชื่อสถานประกอบการ (รหัส/ชื่อเรียกแทน) <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">ใช้รหัสหรือชื่อเรียกแทน ไม่ระบุชื่อจริง</p>
            <Input placeholder="เช่น Venue A / Bar 01" value={data.venue_alias} onChange={(e) => setField("venue_alias", e.target.value)} className={errClass} />
          </div>
        );
      case "estimated_msw_seen":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>จำนวนพนักงานชายที่พบเห็นโดยประมาณ <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">นับคร่าวๆ ในช่วงเวลานั้น</p>
            <Input type="number" min={0} placeholder="เช่น 25" value={data.estimated_msw_seen} onChange={(e) => setField("estimated_msw_seen", e.target.value === "" ? "" : parseInt(e.target.value))} className={cn("text-lg", errClass)} />
          </div>
        );
      case "estimated_offsite_clients":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>จำนวนที่ดูเหมือนรับลูกค้าออกนอกสถานที่โดยประมาณ <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">หากไม่แน่ใจให้ระบุว่า ไม่แน่ใจ</p>
            <Input placeholder="เช่น 10 / ไม่แน่ใจ" value={data.estimated_offsite_clients} onChange={(e) => setField("estimated_offsite_clients", e.target.value)} className={errClass} />
          </div>
        );
      case "visible_nationality_ratio":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>สัดส่วนสัญชาติที่เห็นได้ชัดเจน <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">พิจารณาจากภาษา ลักษณะการสื่อสาร หรือสำเนียง</p>
            <Input placeholder="เช่น พม่า / ไทยปนลาว" value={data.visible_nationality_ratio} onChange={(e) => setField("visible_nationality_ratio", e.target.value)} className={errClass} />
          </div>
        );
      case "info_sources":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>แหล่งที่มาของข้อมูล <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">อาจมาจากมากกว่า 1 คน</p>
            <div className="space-y-2">
              {INFO_SOURCE_OPTIONS.map((opt) => (
                <label key={opt} className={cn(
                  "flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors min-h-[48px]",
                  data.info_sources.includes(opt) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  hasError && "border-destructive/50"
                )}>
                  <Checkbox checked={data.info_sources.includes(opt)} onCheckedChange={() => toggleArray("info_sources", opt)} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case "estimated_msw_per_night_range":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>การประมาณจำนวน MSW ที่ทำงานต่อคืน (ช่วง) <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">ระบุเป็นช่วงต่ำสุด–สูงสุด</p>
            <Input placeholder="เช่น 15-20" value={data.estimated_msw_per_night_range} onChange={(e) => setField("estimated_msw_per_night_range", e.target.value)} className={errClass} />
          </div>
        );
      case "foreign_msw_ratio":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>สัดส่วน MSW ต่างชาติ (ภาพรวมโดยประมาณ) <span className="text-destructive">*</span></Label>
            <Select value={data.foreign_msw_ratio} onValueChange={(v) => setField("foreign_msw_ratio", v)}>
              <SelectTrigger className={errClass}><SelectValue placeholder="เลือก..." /></SelectTrigger>
              <SelectContent>{FOREIGN_RATIO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      case "main_nationality_groups":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>กลุ่มสัญชาติหลักที่ถูกกล่าวถึง <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">ระบุเฉพาะกลุ่มหลัก 1–3 กลุ่ม</p>
            <Input placeholder="เช่น พม่า ลาว กัมพูชา" value={data.main_nationality_groups} onChange={(e) => setField("main_nationality_groups", e.target.value)} className={errClass} />
          </div>
        );
      case "common_languages":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>ภาษาที่ MSW ใช้สื่อสารกันโดยทั่วไป <span className="text-destructive">*</span></Label>
            <Input placeholder="เช่น ไทย / พม่า / อังกฤษง่ายๆ" value={data.common_languages} onChange={(e) => setField("common_languages", e.target.value)} className={errClass} />
          </div>
        );
      case "communication_barrier_level":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>พบอุปสรรคด้านการสื่อสารหรือไม่ <span className="text-destructive">*</span></Label>
            <Select value={data.communication_barrier_level} onValueChange={(v) => setField("communication_barrier_level", v)}>
              <SelectTrigger className={errClass}><SelectValue placeholder="เลือก..." /></SelectTrigger>
              <SelectContent>{BARRIER_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        );
      case "barrier_observation_note":
        // Conditional: only show when barrier = มีมาก
        if (data.communication_barrier_level !== "มีมาก") return null;
        return (
          <div className="space-y-2" key={key}>
            <Label>ข้อสังเกตเพิ่มเติม (อุปสรรคด้านการสื่อสาร)</Label>
            <p className="text-xs text-muted-foreground">เช่น เหตุผลที่เห็นจำนวน MSW น้อย ระดับความไว้วางใจ ข้อเสนอแนะ</p>
            <Textarea placeholder="เขียนข้อสังเกตเพิ่มเติม..." value={data.barrier_observation_note} onChange={(e) => setField("barrier_observation_note", e.target.value)} className="min-h-[100px]" />
          </div>
        );
      case "project_implications":
        return (
          <div className="space-y-2" key={key}>
            <Label className={cn(hasError && "text-destructive")}>ผลกระทบต่อการออกแบบโครงการ (เลือกหากเกี่ยวข้อง) <span className="text-destructive">*</span></Label>
            <div className="space-y-2">
              {IMPLICATION_OPTIONS.map((opt) => (
                <label key={opt} className={cn(
                  "flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors min-h-[48px]",
                  data.project_implications.includes(opt) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                  hasError && "border-destructive/50"
                )}>
                  <Checkbox checked={data.project_implications.includes(opt)} onCheckedChange={() => toggleArray("project_implications", opt)} />
                  <span className="text-sm leading-tight">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case "internal_note":
        return (
          <div className="space-y-2" key={key}>
            <Label>บันทึกภายใน (สำหรับทีมเท่านั้น)</Label>
            <Textarea placeholder="หมายเหตุเพิ่มเติมสำหรับทีม..." value={data.internal_note} onChange={(e) => setField("internal_note", e.target.value)} className="min-h-[80px]" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0 min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">{isTh ? "บันทึกภาคสนาม" : "Field Note"}</h2>
          <p className="text-xs text-muted-foreground">{isTh ? "บันทึก 1 รายการต่อ 1 ช่วงเวลาลงพื้นที่" : "One note per outreach period"}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px]" onClick={() => submitMutation.mutate(true)} disabled={submitMutation.isPending}>
          <Save className="h-4 w-4" />
          {isTh ? "ร่าง" : "Draft"}
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{isTh ? currentSection.title : currentSection.titleEn}</span>
          <span>{sectionIdx + 1}/{SECTIONS.length}</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">{isTh ? currentSection.title : currentSection.titleEn}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {currentSection.fields.map(renderField)}
        </CardContent>
      </Card>

      {/* Nav */}
      <div className="flex justify-between pb-8">
        <Button variant="outline" onClick={goBack} className="min-h-[44px]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {sectionIdx > 0 ? (isTh ? "ย้อนกลับ" : "Back") : (isTh ? "ยกเลิก" : "Cancel")}
        </Button>
        {isLast ? (
          <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="min-h-[44px]">
            {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isTh ? "ส่งบันทึก" : "Submit"}
          </Button>
        ) : (
          <Button onClick={goNext} className="min-h-[44px]">
            {isTh ? "ถัดไป" : "Next"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
