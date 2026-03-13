import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PERIOD_TYPES = ["monthly", "quarterly", "semi_annual", "annual"];
const STATUSES = ["draft", "open", "submitted", "closed"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editItem?: any; }

export default function ReportingPeriodDrawer({ open, onOpenChange, editItem }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      period_label: editItem?.period_label || "",
      period_type: editItem?.period_type || "quarterly",
      start_date: editItem?.start_date || "",
      end_date: editItem?.end_date || "",
      status: editItem?.status || "draft",
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: any) => {
      const payload = { period_label: v.period_label, period_type: v.period_type, start_date: v.start_date, end_date: v.end_date, status: v.status };
      if (editItem?.id) { const { error } = await supabase.from("reporting_periods").update(payload).eq("id", editItem.id); if (error) throw error; }
      else { const { error } = await supabase.from("reporting_periods").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-reporting-periods"] }); toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved" }); reset(); onOpenChange(false); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  const required = !watch("period_label") || !watch("start_date") || !watch("end_date");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>{editItem ? (isTh ? "แก้ไขรอบ" : "Edit Period") : (isTh ? "เพิ่มรอบรายงาน" : "Add Reporting Period")}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2"><Label>{isTh ? "ชื่อรอบ" : "Period Label"} *</Label><Input placeholder="e.g. Q1 2026" {...register("period_label")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "ประเภท" : "Type"}</Label>
              <Select value={watch("period_type")} onValueChange={(v) => setValue("period_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PERIOD_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>{isTh ? "สถานะ" : "Status"}</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "เริ่ม" : "Start"} *</Label><Input type="date" {...register("start_date")} /></div>
            <div className="space-y-2"><Label>{isTh ? "สิ้นสุด" : "End"} *</Label><Input type="date" {...register("end_date")} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || required}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
