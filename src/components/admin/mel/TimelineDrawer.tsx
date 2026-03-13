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

const TYPES = ["data_collection", "analysis", "reporting", "evaluation", "dissemination", "review", "other"];
const STATUSES = ["planned", "in_progress", "completed", "delayed"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editItem?: any; }

export default function TimelineDrawer({ open, onOpenChange, editItem }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      activity_name: editItem?.activity_name || "",
      activity_type: editItem?.activity_type || "",
      start_date: editItem?.start_date || "",
      end_date: editItem?.end_date || "",
      responsible: editItem?.responsible || "",
      status: editItem?.status || "planned",
      notes: editItem?.notes || "",
      display_order: editItem?.display_order ?? 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: any) => {
      const payload = { activity_name: v.activity_name, activity_type: v.activity_type || null, start_date: v.start_date || null, end_date: v.end_date || null, responsible: v.responsible || null, status: v.status, notes: v.notes || null, display_order: Number(v.display_order) || 0 };
      if (editItem?.id) { const { error } = await supabase.from("mel_timeline_items").update(payload).eq("id", editItem.id); if (error) throw error; }
      else { const { error } = await supabase.from("mel_timeline_items").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-timeline"] }); toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved" }); reset(); onOpenChange(false); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{editItem ? (isTh ? "แก้ไขกิจกรรม" : "Edit Activity") : (isTh ? "เพิ่มกิจกรรม" : "Add Activity")}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2"><Label>{isTh ? "ชื่อกิจกรรม" : "Activity Name"} *</Label><Input {...register("activity_name")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "ประเภท" : "Type"}</Label>
              <Select value={watch("activity_type")} onValueChange={(v) => setValue("activity_type", v)}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>{isTh ? "สถานะ" : "Status"}</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "เริ่ม" : "Start"}</Label><Input type="date" {...register("start_date")} /></div>
            <div className="space-y-2"><Label>{isTh ? "สิ้นสุด" : "End"}</Label><Input type="date" {...register("end_date")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "ผู้รับผิดชอบ" : "Responsible"}</Label><Input {...register("responsible")} /></div>
            <div className="space-y-2"><Label>{isTh ? "ลำดับ" : "Order"}</Label><Input type="number" {...register("display_order")} /></div>
          </div>
          <div className="space-y-2"><Label>{isTh ? "หมายเหตุ" : "Notes"}</Label><Textarea rows={2} {...register("notes")} /></div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || !watch("activity_name")}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
