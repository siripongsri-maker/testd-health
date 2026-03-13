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

const Q_TYPES = ["keq", "sub_question", "process", "impact"];
const RESULT_AREAS = ["impact", "outcome_1", "intermediate_1.1", "output_1.1.1", "output_1.1.2", "output_1.1.3", "output_1.1.4", "output_1.1.5", "output_1.1.6"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editItem?: any; }

export default function KEQDrawer({ open, onOpenChange, editItem }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      question_text: editItem?.question_text || "",
      question_type: editItem?.question_type || "keq",
      result_area: editItem?.result_area || "",
      methodology: editItem?.methodology || "",
      data_sources: editItem?.data_sources || "",
      responsible: editItem?.responsible || "",
      display_order: editItem?.display_order ?? 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: any) => {
      const payload = {
        question_text: v.question_text,
        question_type: v.question_type || null,
        result_area: v.result_area || null,
        methodology: v.methodology || null,
        data_sources: v.data_sources || null,
        responsible: v.responsible || null,
        display_order: Number(v.display_order) || 0,
      };
      if (editItem?.id) {
        const { error } = await supabase.from("evaluation_questions").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("evaluation_questions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-keqs"] }); toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved" }); reset(); onOpenChange(false); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{editItem ? (isTh ? "แก้ไข KEQ" : "Edit KEQ") : (isTh ? "เพิ่ม KEQ" : "Add KEQ")}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{isTh ? "คำถาม" : "Question"} *</Label>
            <Textarea rows={3} {...register("question_text")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ประเภท" : "Type"}</Label>
              <Select value={watch("question_type")} onValueChange={(v) => setValue("question_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Q_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "พื้นที่ผลลัพธ์" : "Result Area"}</Label>
              <Select value={watch("result_area")} onValueChange={(v) => setValue("result_area", v)}>
                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>{RESULT_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{isTh ? "วิธีการ" : "Methodology"}</Label><Input {...register("methodology")} /></div>
          <div className="space-y-2"><Label>{isTh ? "แหล่งข้อมูล" : "Data Sources"}</Label><Input {...register("data_sources")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "ผู้รับผิดชอบ" : "Responsible"}</Label><Input {...register("responsible")} /></div>
            <div className="space-y-2"><Label>{isTh ? "ลำดับ" : "Order"}</Label><Input type="number" {...register("display_order")} /></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || !watch("question_text")}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
