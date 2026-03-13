import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MEETING_TYPES = ["stakeholder", "policy", "partner", "coordination", "advocacy", "internal", "other"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editItem?: any; }

export default function MeetingDrawer({ open, onOpenChange, editItem }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      title_en: editItem?.title_en || "",
      title_th: editItem?.title_th || "",
      meeting_date: editItem?.meeting_date || new Date().toISOString().split("T")[0],
      meeting_type: editItem?.meeting_type || "",
      location: editItem?.location || "",
      agenda: editItem?.agenda || "",
      minutes: editItem?.minutes || "",
      outcomes: editItem?.outcomes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: any) => {
      const payload = { title_en: v.title_en || null, title_th: v.title_th || null, meeting_date: v.meeting_date, meeting_type: v.meeting_type || null, location: v.location || null, agenda: v.agenda || null, minutes: v.minutes || null, outcomes: v.outcomes || null };
      if (editItem?.id) { const { error } = await supabase.from("engagement_meetings").update(payload).eq("id", editItem.id); if (error) throw error; }
      else { const { error } = await supabase.from("engagement_meetings").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-meetings"] }); toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved" }); reset(); onOpenChange(false); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{editItem ? (isTh ? "แก้ไขการประชุม" : "Edit Meeting") : (isTh ? "เพิ่มการประชุม" : "Add Meeting")}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2"><Label>{isTh ? "ชื่อ (EN)" : "Title (EN)"}</Label><Input {...register("title_en")} /></div>
          <div className="space-y-2"><Label>{isTh ? "ชื่อ (TH)" : "Title (TH)"}</Label><Input {...register("title_th")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "วันที่" : "Date"} *</Label><Input type="date" {...register("meeting_date")} /></div>
            <div className="space-y-2"><Label>{isTh ? "ประเภท" : "Type"}</Label>
              <Select value={watch("meeting_type")} onValueChange={(v) => setValue("meeting_type", v)}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{MEETING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{isTh ? "สถานที่" : "Location"}</Label><Input {...register("location")} /></div>
          <div className="space-y-2"><Label>{isTh ? "วาระ" : "Agenda"}</Label><Textarea rows={2} {...register("agenda")} /></div>
          <div className="space-y-2"><Label>{isTh ? "บันทึกการประชุม" : "Minutes"}</Label><Textarea rows={3} {...register("minutes")} /></div>
          <div className="space-y-2"><Label>{isTh ? "ผลลัพธ์" : "Outcomes"}</Label><Textarea rows={2} {...register("outcomes")} /></div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
