import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function MelOutreachEventsContent() {
  const { language } = useLanguage();
  const isTh = language === "th";

  const { data: events, isLoading } = useQuery({
    queryKey: ["mel-outreach-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_events")
        .select("*")
        .order("event_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const totalReached = events?.reduce((sum: number, e: any) => sum + (e.people_reached || 0), 0) || 0;
  const totalCondoms = events?.reduce((sum: number, e: any) => sum + (e.condoms_distributed || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "กิจกรรมเชิงรุก" : "Outreach Events"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "กิจกรรมภาคสนามและดิจิทัล" : "Field & digital outreach activities"}</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มกิจกรรม" : "Add Event"}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "กิจกรรมทั้งหมด" : "Total Events"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{events?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "เข้าถึงทั้งหมด" : "People Reached"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{totalReached}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ถุงยางที่แจก" : "Condoms Distributed"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{totalCondoms}</p></CardContent></Card>
      </div>

      {(!events || events.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีกิจกรรมเชิงรุก" : "No outreach events yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "วันที่" : "Date"}</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ประเภท" : "Type"}</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "สถานที่" : "Location"}</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">{isTh ? "เข้าถึง" : "Reached"}</th>
                </tr></thead>
                <tbody>
                  {events.map((e: any) => (
                    <tr key={e.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{format(new Date(e.event_date), "dd MMM yyyy")}</td>
                      <td className="p-3 capitalize">{e.event_type?.replace(/_/g, " ")}</td>
                      <td className="p-3">{e.location_name || "—"}</td>
                      <td className="p-3 text-right font-medium">{e.people_reached}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
