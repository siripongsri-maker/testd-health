import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import PartnerDrawer from "./PartnerDrawer";
import MelDeleteDialog from "./MelDeleteDialog";
import MelSOPCard, { MEL_SOPS } from "./MelSOPCard";

export default function MelPartnersContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: partners, isLoading } = useQuery({
    queryKey: ["mel-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_organizations").select("*").order("name_en");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("partner_organizations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-partners"] }); toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" }); },
    onError: () => { toast({ title: isTh ? "ลบไม่สำเร็จ" : "Delete failed", variant: "destructive" }); },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "องค์กรพันธมิตร" : "Partner Organizations"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "เครือข่ายส่งต่อและความร่วมมือ" : "Referral network & partnerships"}</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditPartner(null); setDrawerOpen(true); }}><Plus className="h-4 w-4" />{isTh ? "เพิ่มองค์กร" : "Add Partner"}</Button>
      </div>

      <MelSOPCard {...MEL_SOPS.partners} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ทั้งหมด" : "Total"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{partners?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ใช้งาน" : "Active"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{partners?.filter((p: any) => p.partnership_status === "active").length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "MOU ลงนาม" : "MOU Signed"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{partners?.filter((p: any) => p.mou_signed).length || 0}</p></CardContent></Card>
      </div>

      {(!partners || partners.length === 0) ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 text-center"><Building className="h-12 w-12 text-muted-foreground/40 mb-4" /><p className="text-muted-foreground">{isTh ? "ยังไม่มีองค์กรพันธมิตร" : "No partner organizations yet"}</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {partners.map((p: any) => (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors"><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{isTh ? p.name_th : p.name_en}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{p.org_type?.replace(/_/g, " ")} · {p.partnership_status}{p.contact_name && ` · ${p.contact_name}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.mou_signed && <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">MOU</span>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditPartner(p); setDrawerOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <PartnerDrawer key={editPartner?.id || "new"} open={drawerOpen} onOpenChange={setDrawerOpen} editPartner={editPartner} />
      <MelDeleteDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }} itemLabel={isTh ? deleteTarget?.name_th : deleteTarget?.name_en} />
    </div>
  );
}
