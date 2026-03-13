import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EVIDENCE_TYPES = ["policy_mention", "media_coverage", "official_document", "meeting_outcome", "invitation", "citation", "endorsement", "other"];
const IMPACT_LEVELS = ["awareness", "consideration", "adoption", "implementation"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editItem?: any; }

export default function EvidenceDrawer({ open, onOpenChange, editItem }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      title_en: editItem?.title_en || "",
      title_th: editItem?.title_th || "",
      evidence_date: editItem?.evidence_date || new Date().toISOString().split("T")[0],
      evidence_type: editItem?.evidence_type || "",
      impact_level: editItem?.impact_level || "",
      description: editItem?.description || "",
      source_url: editItem?.source_url || "",
      verified: editItem?.verified || false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: any) => {
      const payload = { title_en: v.title_en || null, title_th: v.title_th || null, evidence_date: v.evidence_date, evidence_type: v.evidence_type, impact_level: v.impact_level || null, description: v.description || null, source_url: v.source_url || null, verified: v.verified };
      if (editItem?.id) { const { error } = await supabase.from("policy_evidence_logs").update(payload).eq("id", editItem.id); if (error) throw error; }
      else { const { error } = await supabase.from("policy_evidence_logs").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-evidence"] }); toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved" }); reset(); onOpenChange(false); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{editItem ? (isTh ? "แก้ไขหลักฐาน" : "Edit Evidence") : (isTh ? "เพิ่มหลักฐาน" : "Add Evidence")}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2"><Label>{isTh ? "ชื่อ (EN)" : "Title (EN)"}</Label><Input {...register("title_en")} /></div>
          <div className="space-y-2"><Label>{isTh ? "ชื่อ (TH)" : "Title (TH)"}</Label><Input {...register("title_th")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "วันที่" : "Date"} *</Label><Input type="date" {...register("evidence_date")} /></div>
            <div className="space-y-2"><Label>{isTh ? "ประเภท" : "Type"} *</Label>
              <Select value={watch("evidence_type")} onValueChange={(v) => setValue("evidence_type", v)}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{EVIDENCE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{isTh ? "ระดับผลกระทบ" : "Impact Level"}</Label>
            <Select value={watch("impact_level")} onValueChange={(v) => setValue("impact_level", v)}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{IMPACT_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-2"><Label>{isTh ? "รายละเอียด" : "Description"}</Label><Textarea rows={3} {...register("description")} /></div>
          <div className="space-y-2"><Label>{isTh ? "URL แหล่งข้อมูล" : "Source URL"}</Label><Input type="url" {...register("source_url")} /></div>
          <div className="flex items-center gap-3">
            <Switch checked={watch("verified")} onCheckedChange={(v) => setValue("verified", v)} />
            <Label>{isTh ? "ยืนยันแล้ว" : "Verified"}</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || !watch("evidence_type")}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
