import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import OutreachEventDrawer from "./OutreachEventDrawer";
import MelDeleteDialog from "./MelDeleteDialog";
import MelSOPCard, { MEL_SOPS } from "./MelSOPCard";
import MswRapidAssessmentList from "./MswRapidAssessmentList";
import FieldNotesDashboard from "./FieldNotesDashboard";
import UnifiedOutreachForm from "./UnifiedOutreachForm";
import MelCombinedDashboard from "./MelCombinedDashboard";

export default function MelOutreachEventsContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("unified-form");
  const [showUnifiedForm, setShowUnifiedForm] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["mel-outreach-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("outreach_events").select("*, booking_branches(name_en, name_th)").order("event_date", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("outreach_events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mel-outreach-events"] }); toast({ title: isTh ? "ลบสำเร็จ" : "Deleted" }); },
    onError: () => { toast({ title: isTh ? "ลบไม่สำเร็จ" : "Delete failed", variant: "destructive" }); },
  });

  const totalReached = events?.reduce((sum: number, e: any) => sum + (e.people_reached || 0), 0) || 0;
  const totalCondoms = events?.reduce((sum: number, e: any) => sum + (e.condoms_distributed || 0), 0) || 0;
  const totalTests = events?.reduce((sum: number, e: any) => sum + (e.hiv_tests_done || 0), 0) || 0;

  // If unified form is open, show it full screen
  if (showUnifiedForm) {
    return <UnifiedOutreachForm onClose={() => setShowUnifiedForm(false)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "กิจกรรมเชิงรุก" : "Outreach Events"}</h2>
        <p className="text-muted-foreground text-sm">{isTh ? "กิจกรรมภาคสนามและดิจิทัล" : "Field & digital outreach activities"}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unified-form" className="text-xs sm:text-sm">
            {isTh ? "📋 แบบฟอร์ม" : "📋 Form"}
          </TabsTrigger>
          <TabsTrigger value="field-notes" className="text-xs sm:text-sm">
            {isTh ? "📝 ภาคสนาม" : "📝 Field Notes"}
          </TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs sm:text-sm">
            {isTh ? "📊 Rapid MSW" : "📊 Rapid MSW"}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            {isTh ? "📈 วิเคราะห์" : "📈 Analysis"}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Unified Form Entry */}
        <TabsContent value="unified-form" className="mt-6">
          <Card className="border-primary/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{isTh ? "แบบฟอร์มรวม Outreach" : "Unified Outreach Form"}</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1">
                  {isTh 
                    ? "แบบฟอร์มรวมสำหรับบันทึกข้อมูลภาคสนาม ครอบคลุมการสังเกต สัญญาณเชิงพื้นที่ บริการ ภาษา และข้อเสนอเชิง MEL ในแบบเดียว" 
                    : "Consolidated form for field observations, situational signals, services, language, and MEL insights"}
                </p>
              </div>
              <Button size="lg" className="min-h-[52px] gap-2 text-base" onClick={() => setShowUnifiedForm(true)}>
                <Plus className="h-5 w-5" />{isTh ? "เริ่มบันทึก" : "Start Entry"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Field Notes (existing) */}
        <TabsContent value="field-notes" className="mt-6">
          <FieldNotesDashboard />
        </TabsContent>

        {/* Tab 3: Rapid MSW (existing) */}
        <TabsContent value="assessments" className="mt-6">
          <MswRapidAssessmentList />
        </TabsContent>

        {/* Tab 4: Combined MEL Dashboard */}
        <TabsContent value="dashboard" className="mt-6">
          <MelCombinedDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
