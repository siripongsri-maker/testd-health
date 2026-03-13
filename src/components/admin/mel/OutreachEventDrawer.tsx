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
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const EVENT_TYPES = ["venue_based", "non_venue", "digital", "mobile_team", "community_event", "other"];
const LOCATION_TYPES = ["bar_club", "sauna", "park", "online", "community_center", "street", "other"];

interface OutreachEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: any;
}

export default function OutreachEventDrawer({ open, onOpenChange, editEvent }: OutreachEventDrawerProps) {
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

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      event_type: editEvent?.event_type || "",
      event_date: editEvent?.event_date || new Date().toISOString().split("T")[0],
      location_name: editEvent?.location_name || "",
      location_type: editEvent?.location_type || "",
      branch_id: editEvent?.branch_id || "",
      people_reached: editEvent?.people_reached ?? "",
      condoms_distributed: editEvent?.condoms_distributed ?? "",
      lube_distributed: editEvent?.lube_distributed ?? "",
      hiv_tests_done: editEvent?.hiv_tests_done ?? "",
      referrals_made: editEvent?.referrals_made ?? "",
      materials_distributed: editEvent?.materials_distributed ?? "",
      campaign_code: editEvent?.campaign_code || "",
      notes: editEvent?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        event_type: values.event_type,
        event_date: values.event_date,
        location_name: values.location_name || null,
        location_type: values.location_type || null,
        branch_id: values.branch_id || null,
        people_reached: values.people_reached ? Number(values.people_reached) : null,
        condoms_distributed: values.condoms_distributed ? Number(values.condoms_distributed) : null,
        lube_distributed: values.lube_distributed ? Number(values.lube_distributed) : null,
        hiv_tests_done: values.hiv_tests_done ? Number(values.hiv_tests_done) : null,
        referrals_made: values.referrals_made ? Number(values.referrals_made) : null,
        materials_distributed: values.materials_distributed ? Number(values.materials_distributed) : null,
        campaign_code: values.campaign_code || null,
        notes: values.notes || null,
      };
      if (editEvent?.id) {
        const { error } = await supabase.from("outreach_events").update(payload).eq("id", editEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("outreach_events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-outreach-events"] });
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
          <SheetTitle>{editEvent ? (isTh ? "แก้ไขกิจกรรม" : "Edit Event") : (isTh ? "เพิ่มกิจกรรมเชิงรุก" : "Add Outreach Event")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ประเภท" : "Type"} *</Label>
              <Select value={watch("event_type")} onValueChange={(v) => setValue("event_type", v)}>
                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "วันที่" : "Date"} *</Label>
              <Input type="date" {...register("event_date", { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "สถานที่" : "Location"}</Label>
              <Input {...register("location_name")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "ประเภทสถานที่" : "Location Type"}</Label>
              <Select value={watch("location_type")} onValueChange={(v) => setValue("location_type", v)}>
                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "สาขา" : "Branch"}</Label>
            <Select value={watch("branch_id")} onValueChange={(v) => setValue("branch_id", v)}>
              <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
              <SelectContent>
                {branches?.map((b: any) => <SelectItem key={b.id} value={b.id}>{isTh ? b.name_th : b.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "เข้าถึง" : "Reached"}</Label>
              <Input type="number" {...register("people_reached")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "ถุงยาง" : "Condoms"}</Label>
              <Input type="number" {...register("condoms_distributed")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "เจลหล่อลื่น" : "Lube"}</Label>
              <Input type="number" {...register("lube_distributed")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ตรวจ HIV" : "HIV Tests"}</Label>
              <Input type="number" {...register("hiv_tests_done")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "ส่งต่อ" : "Referrals"}</Label>
              <Input type="number" {...register("referrals_made")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "สื่อแจก" : "Materials"}</Label>
              <Input type="number" {...register("materials_distributed")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "รหัสแคมเปญ" : "Campaign Code"}</Label>
            <Input {...register("campaign_code")} placeholder="e.g. QR-2026-03" />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "หมายเหตุ" : "Notes"}</Label>
            <Textarea rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
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
