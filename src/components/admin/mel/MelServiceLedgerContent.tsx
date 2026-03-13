import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ClipboardList, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import ServiceEventDrawer from "./ServiceEventDrawer";

export default function MelServiceLedgerContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["mel-service-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_events")
        .select("*, booking_branches(name_en, name_th)")
        .order("service_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mel-service-events"] });
      toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" });
    },
  });

  const handleEdit = (event: any) => {
    setEditEvent(event);
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditEvent(null);
    setDrawerOpen(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "บันทึกการให้บริการ" : "Service Ledger"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "บันทึกเหตุการณ์การให้บริการทั้งหมด" : "Unified record of all service events"}</p>
        </div>
        <Button size="sm" className="gap-2" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {isTh ? "เพิ่มรายการ" : "Add Event"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "เหตุการณ์ทั้งหมด" : "Total Events"}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{events?.length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ผู้ใช้บริการครั้งแรก" : "First Visits"}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{events?.filter((e: any) => e.is_first_visit).length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "สำเร็จ" : "Completed"}</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{events?.filter((e: any) => e.outcome === "completed").length || 0}</p></CardContent>
        </Card>
      </div>

      {(!events || events.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีรายการบันทึกบริการ" : "No service events recorded yet"}</p>
            <p className="text-muted-foreground/60 text-sm mt-1">{isTh ? "เริ่มบันทึกเมื่อให้บริการลูกค้า" : "Start logging when serving clients"}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "วันที่" : "Date"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ประเภท" : "Type"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "สาขา" : "Branch"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "กลุ่มประชากร" : "Population"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ผลลัพธ์" : "Outcome"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ครั้งแรก" : "1st"}</th>
                    <th className="p-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {events.map((event: any) => (
                    <tr key={event.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{format(new Date(event.service_date), "dd MMM yyyy")}</td>
                      <td className="p-3 capitalize">{event.event_type?.replace(/_/g, " ")}</td>
                      <td className="p-3 text-xs">{isTh ? event.booking_branches?.name_th : event.booking_branches?.name_en || "—"}</td>
                      <td className="p-3 uppercase text-xs">{event.population_group || "—"}</td>
                      <td className="p-3 capitalize">{event.outcome || "—"}</td>
                      <td className="p-3">{event.is_first_visit ? "✓" : ""}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(event)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                            if (confirm(isTh ? "ลบรายการนี้?" : "Delete this event?")) deleteMutation.mutate(event.id);
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ServiceEventDrawer
        key={editEvent?.id || "new"}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editEvent={editEvent}
      />
    </div>
  );
}
