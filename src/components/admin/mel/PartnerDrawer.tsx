import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ORG_TYPES = ["ngo", "government", "academic", "healthcare", "community", "international", "private", "other"];
const STATUSES = ["prospect", "active", "inactive", "former"];

interface PartnerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPartner?: any;
}

export default function PartnerDrawer({ open, onOpenChange, editPartner }: PartnerDrawerProps) {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      name_en: editPartner?.name_en || "",
      name_th: editPartner?.name_th || "",
      org_type: editPartner?.org_type || "",
      partnership_status: editPartner?.partnership_status || "prospect",
      contact_name: editPartner?.contact_name || "",
      contact_email: editPartner?.contact_email || "",
      contact_phone: editPartner?.contact_phone || "",
      country: editPartner?.country || "Thailand",
      mou_signed: editPartner?.mou_signed || false,
      mou_date: editPartner?.mou_date || "",
      notes: editPartner?.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        name_en: values.name_en,
        name_th: values.name_th,
        org_type: values.org_type || null,
        partnership_status: values.partnership_status || "prospect",
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        country: values.country || null,
        mou_signed: values.mou_signed,
        mou_date: values.mou_date || null,
        notes: values.notes || null,
      };
      if (editPartner?.id) {
        const { error } = await supabase.from("partner_organizations").update(payload).eq("id", editPartner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_organizations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-partners"] });
      toast({ title: isTh ? "บันทึกสำเร็จ" : "Saved successfully" });
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: isTh ? "เกิดข้อผิดพลาด" : "Error", description: e.message, variant: "destructive" });
    },
  });

  const required = !watch("name_en") || !watch("name_th");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editPartner ? (isTh ? "แก้ไของค์กร" : "Edit Partner") : (isTh ? "เพิ่มองค์กรพันธมิตร" : "Add Partner Organization")}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{isTh ? "ชื่อ (EN)" : "Name (EN)"} *</Label>
            <Input {...register("name_en")} />
          </div>
          <div className="space-y-2">
            <Label>{isTh ? "ชื่อ (TH)" : "Name (TH)"} *</Label>
            <Input {...register("name_th")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "ประเภท" : "Org Type"}</Label>
              <Select value={watch("org_type")} onValueChange={(v) => setValue("org_type", v)}>
                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "สถานะ" : "Status"}</Label>
              <Select value={watch("partnership_status")} onValueChange={(v) => setValue("partnership_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "ผู้ติดต่อ" : "Contact Name"}</Label>
            <Input {...register("contact_name")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isTh ? "อีเมล" : "Email"}</Label>
              <Input type="email" {...register("contact_email")} />
            </div>
            <div className="space-y-2">
              <Label>{isTh ? "โทรศัพท์" : "Phone"}</Label>
              <Input {...register("contact_phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{isTh ? "ประเทศ" : "Country"}</Label>
            <Input {...register("country")} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={watch("mou_signed")} onCheckedChange={(v) => setValue("mou_signed", v)} />
            <Label>{isTh ? "ลงนาม MOU แล้ว" : "MOU Signed"}</Label>
          </div>

          {watch("mou_signed") && (
            <div className="space-y-2">
              <Label>{isTh ? "วันที่ลงนาม" : "MOU Date"}</Label>
              <Input type="date" {...register("mou_date")} />
            </div>
          )}

          <div className="space-y-2">
            <Label>{isTh ? "หมายเหตุ" : "Notes"}</Label>
            <Textarea rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{isTh ? "ยกเลิก" : "Cancel"}</Button>
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
