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

const RESULT_LEVELS = ["impact", "outcome", "intermediate_outcome", "output"];
const FREQUENCIES = ["monthly", "quarterly", "semi_annual", "annual", "one_time"];
const DIRECTIONS = ["increase", "decrease", "maintain"];
const UNITS = ["number", "percentage", "score", "ratio", "yes_no"];

interface IndicatorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editIndicator?: any;
}

export default function IndicatorDrawer({ open, onOpenChange, editIndicator }: IndicatorDrawerProps) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      indicator_code: editIndicator?.indicator_code || "",
      indicator_name_en: editIndicator?.indicator_name_en || "",
      indicator_name_th: editIndicator?.indicator_name_th || "",
      result_level: editIndicator?.result_level || "",
      result_area: editIndicator?.result_area || "",
      unit: editIndicator?.unit || "number",
      direction: editIndicator?.direction || "increase",
      collection_frequency: editIndicator?.collection_frequency || "quarterly",
      target_value: editIndicator?.target_value ?? "",
      target_date: editIndicator?.target_date || "",
      baseline_value: editIndicator?.baseline_value ?? "",
      baseline_date: editIndicator?.baseline_date || "",
      data_source: editIndicator?.data_source || "",
      calculation_method: editIndicator?.calculation_method || "",
      display_order: editIndicator?.display_order ?? 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        indicator_code: values.indicator_code,
        indicator_name_en: values.indicator_name_en,
        indicator_name_th: values.indicator_name_th,
        result_level: values.result_level,
        result_area: values.result_area || null,
        unit: values.unit || null,
        direction: values.direction || null,
        collection_frequency: values.collection_frequency || null,
        target_value: values.target_value ? Number(values.target_value) : null,
        target_date: values.target_date || null,
        baseline_value: values.baseline_value ? Number(values.baseline_value) : null,
        baseline_date: values.baseline_date || null,
        data_source: values.data_source || null,
        calculation_method: values.calculation_method || null,
        display_order: Number(values.display_order) || 0,
      };
      if (editIndicator?.id) {
        const { error } = await supabase.from("indicator_definitions").update(payload).eq("id", editIndicator.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("indicator_definitions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-indicators"] });
      toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved successfully" });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: isTh ? "เกิดข้อผิดพลาด" : "Error", description: e.message, variant: "destructive" });
    },
  });

  const required = !watch("indicator_code") || !watch("indicator_name_en") || !watch("indicator_name_th") || !watch("result_level");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editIndicator ? (isTh ? "แก้ไขตัวชี้วัด" : "Edit Indicator") : (isTh ? "เพิ่มตัวชี้วัด" : "Add Indicator")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "รหัส" : "Code"} *</Label>
              <Input placeholder="e.g. OC1.1" {...register("indicator_code")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "ลำดับ" : "Order"}</Label>
              <Input type="number" {...register("display_order")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "ชื่อตัวชี้วัด (EN)" : "Indicator Name (EN)"} *</Label>
            <Input {...register("indicator_name_en")} />
          </div>
          <div className="space-y-2">
            <Label>{isTh ? "ชื่อตัวชี้วัด (TH)" : "Indicator Name (TH)"} *</Label>
            <Input {...register("indicator_name_th")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ระดับผลลัพธ์" : "Result Level"} *</Label>
              <Select value={watch("result_level")} onValueChange={(v) => setValue("result_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESULT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "หน่วย" : "Unit"}</Label>
              <Select value={watch("unit")} onValueChange={(v) => setValue("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ทิศทาง" : "Direction"}</Label>
              <Select value={watch("direction")} onValueChange={(v) => setValue("direction", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "ความถี่" : "Frequency"}</Label>
              <Select value={watch("collection_frequency")} onValueChange={(v) => setValue("collection_frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ค่าเป้าหมาย" : "Target Value"}</Label>
              <Input type="number" step="any" {...register("target_value")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "วันที่เป้าหมาย" : "Target Date"}</Label>
              <Input type="date" {...register("target_date")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ค่าเริ่มต้น" : "Baseline"}</Label>
              <Input type="number" step="any" {...register("baseline_value")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "วันที่เริ่มต้น" : "Baseline Date"}</Label>
              <Input type="date" {...register("baseline_date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "พื้นที่ผลลัพธ์" : "Result Area"}</Label>
            <Input placeholder="e.g. Outcome 1" {...register("result_area")} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "แหล่งข้อมูล" : "Data Source"}</Label>
            <Input {...register("data_source")} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "วิธีการคำนวณ" : "Calculation Method"}</Label>
            <Input {...register("calculation_method")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {isTh ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || required}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
