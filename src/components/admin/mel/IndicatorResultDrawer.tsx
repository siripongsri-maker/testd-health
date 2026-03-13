import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface IndicatorResultDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicator: { id: string; indicator_name_en: string; indicator_name_th: string; unit: string | null };
}

export default function IndicatorResultDrawer({ open, onOpenChange, indicator }: IndicatorResultDrawerProps) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      value: "",
      period_label: "",
      notes: "",
      disaggregation_key: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase.from("indicator_results").insert({
        indicator_id: indicator.id,
        value: Number(values.value),
        period_label: values.period_label || null,
        notes: values.notes || null,
        disaggregation_key: values.disaggregation_key || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-indicators"] });
      qc.invalidateQueries({ queryKey: ["mel-indicator-results", indicator.id] });
      toast({ title: isTh ? "บันทึกผลสำเร็จ" : "Result saved" });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: isTh ? "เกิดข้อผิดพลาด" : "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isTh ? "บันทึกผลตัวชี้วัด" : "Record Result"}</SheetTitle>
          <p className="text-sm text-muted-foreground">{isTh ? indicator.indicator_name_th : indicator.indicator_name_en}</p>
        </SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{isTh ? "ค่า" : "Value"} ({indicator.unit || "number"}) *</Label>
            <Input type="number" step="any" {...register("value", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "ช่วงเวลา" : "Period Label"}</Label>
            <Input placeholder="e.g. Q1 2026, Jan 2026" {...register("period_label")} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "กลุ่มย่อย" : "Disaggregation Key"}</Label>
            <Input placeholder="e.g. msm, msw, age_18_24" {...register("disaggregation_key")} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "หมายเหตุ" : "Notes"}</Label>
            <Textarea rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {isTh ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || !watch("value")}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
