import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  "hiv_testing", "sti_screening", "prep_consultation", "pep_consultation",
  "counseling", "harm_reduction", "harm_reduction_counseling", "mental_health_support",
  "hr_screening_completed", "hr_counseling_requested", "mental_health_screen_completed",
  "callback_requested", "recovery_mode_activated", "referral", "outreach_contact", "follow_up", "other",
];

const SERVICE_CATEGORIES = [
  "harm_reduction_counseling", "sexual_health", "hiv_test", "sti_test",
  "prep", "pep", "self_test_support", "mental_health_support", "followup_consultation",
];

const POPULATION_GROUPS = ["msm", "msw", "transgender", "pwid", "general", "other"];
const OUTCOMES = ["completed", "referred", "follow_up_needed", "declined", "no_show"];

interface ServiceEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: any;
}

export default function ServiceEventDrawer({ open, onOpenChange, editEvent }: ServiceEventDrawerProps) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { data: branches } = useQuery({
    queryKey: ["booking-branches"],
    queryFn: async () => {
      const { data } = await supabase.from("booking_branches").select("id, name_en, name_th").eq("is_active", true);
      return data || [];
    },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      event_type: editEvent?.event_type || "",
      service_date: editEvent?.service_date || new Date().toISOString().split("T")[0],
      population_group: editEvent?.population_group || "",
      outcome: editEvent?.outcome || "",
      branch_id: editEvent?.branch_id || "",
      is_first_visit: editEvent?.is_first_visit || false,
      description_en: editEvent?.description_en || "",
      description_th: editEvent?.description_th || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        event_type: values.event_type,
        service_date: values.service_date,
        population_group: values.population_group || null,
        outcome: values.outcome || null,
        branch_id: values.branch_id || null,
        is_first_visit: values.is_first_visit,
        description_en: values.description_en || null,
        description_th: values.description_th || null,
      };
      if (editEvent?.id) {
        const { error } = await supabase.from("service_events").update(payload).eq("id", editEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-service-events"] });
      toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved successfully" });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: isTh ? "เกิดข้อผิดพลาด" : "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editEvent ? (isTh ? "แก้ไขรายการ" : "Edit Event") : (isTh ? "เพิ่มรายการบริการ" : "Add Service Event")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{isTh ? "ประเภทบริการ" : "Event Type"} *</Label>
            <Select value={watch("event_type")} onValueChange={(v) => setValue("event_type", v)}>
              <SelectTrigger><SelectValue placeholder={isTh ? "เลือก..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "วันที่ให้บริการ" : "Service Date"} *</Label>
            <Input type="date" {...register("service_date", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "สาขา" : "Branch"}</Label>
            <Select value={watch("branch_id")} onValueChange={(v) => setValue("branch_id", v)}>
              <SelectTrigger><SelectValue placeholder={isTh ? "เลือกสาขา..." : "Select branch..."} /></SelectTrigger>
              <SelectContent>
                {branches?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{isTh ? b.name_th : b.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "กลุ่มประชากร" : "Population Group"}</Label>
            <Select value={watch("population_group")} onValueChange={(v) => setValue("population_group", v)}>
              <SelectTrigger><SelectValue placeholder={isTh ? "เลือก..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {POPULATION_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "ผลลัพธ์" : "Outcome"}</Label>
            <Select value={watch("outcome")} onValueChange={(v) => setValue("outcome", v)}>
              <SelectTrigger><SelectValue placeholder={isTh ? "เลือก..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={watch("is_first_visit")} onCheckedChange={(v) => setValue("is_first_visit", v)} />
            <Label>{isTh ? "ผู้ใช้บริการครั้งแรก" : "First Visit"}</Label>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "รายละเอียด (อังกฤษ)" : "Description (EN)"}</Label>
            <Textarea rows={2} {...register("description_en")} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "รายละเอียด (ไทย)" : "Description (TH)"}</Label>
            <Textarea rows={2} {...register("description_th")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {isTh ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || !watch("event_type")}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
