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

const CATEGORIES = ["data_quality", "ethical", "methodological", "operational", "political", "other"];
const LEVELS = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "mitigated", "accepted", "closed"];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; editItem?: any; }

export default function RiskDrawer({ open, onOpenChange, editItem }: Props) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      risk_description: editItem?.risk_description || "",
      risk_category: editItem?.risk_category || "",
      likelihood: editItem?.likelihood || "medium",
      impact: editItem?.impact || "medium",
      mitigation: editItem?.mitigation || "",
      status: editItem?.status || "open",
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: any) => {
      const payload = { risk_description: v.risk_description, risk_category: v.risk_category || null, likelihood: v.likelihood, impact: v.impact, mitigation: v.mitigation || null, status: v.status };
      if (editItem?.id) { const { error } = await supabase.from("evaluation_risks").update(payload).eq("id", editItem.id); if (error) throw error; }
      else { const { error } = await supabase.from("evaluation_risks").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-eval-risks"] }); toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved" }); reset(); onOpenChange(false); },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{editItem ? (isTh ? "แก้ไขความเสี่ยง" : "Edit Risk") : (isTh ? "เพิ่มความเสี่ยง" : "Add Risk")}</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2"><Label>{isTh ? "รายละเอียด" : "Description"} *</Label><Textarea rows={3} {...register("risk_description")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "หมวดหมู่" : "Category"}</Label>
              <Select value={watch("risk_category")} onValueChange={(v) => setValue("risk_category", v)}><SelectTrigger><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>{isTh ? "สถานะ" : "Status"}</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>{isTh ? "โอกาสเกิด" : "Likelihood"}</Label>
              <Select value={watch("likelihood")} onValueChange={(v) => setValue("likelihood", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>{isTh ? "ผลกระทบ" : "Impact"}</Label>
              <Select value={watch("impact")} onValueChange={(v) => setValue("impact", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{isTh ? "มาตรการลดเสี่ยง" : "Mitigation"}</Label><Textarea rows={2} {...register("mitigation")} /></div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || !watch("risk_description")}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
