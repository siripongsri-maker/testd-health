import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MelPartnersContent() {
  const { language } = useLanguage();
  const isTh = language === "th";

  const { data: partners, isLoading } = useQuery({
    queryKey: ["mel-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_organizations")
        .select("*")
        .order("name_en");
      if (error) throw error;
      return data;
    },
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
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />{isTh ? "เพิ่มองค์กร" : "Add Partner"}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ทั้งหมด" : "Total"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{partners?.length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "ใช้งาน" : "Active"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{partners?.filter((p: any) => p.partnership_status === "active").length || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{isTh ? "MOU ลงนาม" : "MOU Signed"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{partners?.filter((p: any) => p.mou_signed).length || 0}</p></CardContent></Card>
      </div>

      {(!partners || partners.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีองค์กรพันธมิตร" : "No partner organizations yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {partners.map((p: any) => (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{isTh ? p.name_th : p.name_en}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{p.org_type?.replace(/_/g, " ")} · {p.partnership_status}</p>
                  </div>
                  {p.mou_signed && <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">MOU</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
