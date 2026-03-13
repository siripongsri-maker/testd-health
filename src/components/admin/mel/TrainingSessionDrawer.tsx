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

const STATUSES = ["planned", "in_progress", "completed", "cancelled"];

interface TrainingSessionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSession?: any;
}

export default function TrainingSessionDrawer({ open, onOpenChange, editSession }: TrainingSessionDrawerProps) {
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

  const { data: curricula } = useQuery({
    queryKey: ["training-curricula"],
    queryFn: async () => {
      const { data } = await supabase.from("training_curricula").select("id, title_en, title_th").order("title_en");
      return data || [];
    },
  });

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      session_title_en: editSession?.session_title_en || "",
      session_title_th: editSession?.session_title_th || "",
      session_date: editSession?.session_date || new Date().toISOString().split("T")[0],
      curriculum_id: editSession?.curriculum_id || "",
      branch_id: editSession?.branch_id || "",
      location: editSession?.location || "",
      total_participants: editSession?.total_participants ?? "",
      status: editSession?.status || "planned",
      notes: editSession?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        session_title_en: values.session_title_en || null,
        session_title_th: values.session_title_th || null,
        session_date: values.session_date,
        curriculum_id: values.curriculum_id || null,
        branch_id: values.branch_id || null,
        location: values.location || null,
        total_participants: values.total_participants ? Number(values.total_participants) : null,
        status: values.status || "planned",
        notes: values.notes || null,
      };
      if (editSession?.id) {
        const { error } = await supabase.from("training_sessions").update(payload).eq("id", editSession.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("training_sessions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-training-sessions"] });
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
          <SheetTitle>{editSession ? (isTh ? "แก้ไขการอบรม" : "Edit Session") : (isTh ? "เพิ่มการอบรม" : "Add Training Session")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{isTh ? "ชื่อ (EN)" : "Title (EN)"}</Label>
            <Input {...register("session_title_en")} />
          </div>
          <div className="space-y-2">
            <Label>{isTh ? "ชื่อ (TH)" : "Title (TH)"}</Label>
            <Input {...register("session_title_th")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "วันที่" : "Date"} *</Label>
              <Input type="date" {...register("session_date", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "สถานะ" : "Status"}</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "หลักสูตร" : "Curriculum"}</Label>
            <Select value={watch("curriculum_id")} onValueChange={(v) => setValue("curriculum_id", v)}>
              <SelectTrigger><SelectValue placeholder={isTh ? "เลือก..." : "Select..."} /></SelectTrigger>
              <SelectContent>
                {curricula?.map((c: any) => <SelectItem key={c.id} value={c.id}>{isTh ? c.title_th : c.title_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "สาขา" : "Branch"}</Label>
              <Select value={watch("branch_id")} onValueChange={(v) => setValue("branch_id", v)}>
                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  {branches?.map((b: any) => <SelectItem key={b.id} value={b.id}>{isTh ? b.name_th : b.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "ผู้เข้าร่วม" : "Participants"}</Label>
              <Input type="number" {...register("total_participants")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "สถานที่" : "Location"}</Label>
            <Input {...register("location")} />
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "หมายเหตุ" : "Notes"}</Label>
            <Textarea rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isTh ? "บันทึก" : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
