import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/PageContainer";
import { HarmReductionHub } from "@/components/harm-reduction/HarmReductionHub";
import { RiskScreening } from "@/components/harm-reduction/RiskScreening";
import { SaferUsePlanner } from "@/components/harm-reduction/SaferUsePlanner";
import { CounselingReferral } from "@/components/harm-reduction/CounselingReferral";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ClipboardCheck, Shield, HeartHandshake } from "lucide-react";

export default function HarmReduction() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("hub");

  return (
    <PageContainer className="pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t("hr.title") || "Harm Reduction & Chemsex Care"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("hr.subtitle") || "Supportive resources for safer choices — private, non-judgmental"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto gap-1 bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="hub" className="flex flex-col items-center gap-1 py-2 px-1 text-[10px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BookOpen className="h-4 w-4" />
            <span>{t("hr.hub") || "Hub"}</span>
          </TabsTrigger>
          <TabsTrigger value="screening" className="flex flex-col items-center gap-1 py-2 px-1 text-[10px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ClipboardCheck className="h-4 w-4" />
            <span>{t("hr.screening") || "Screen"}</span>
          </TabsTrigger>
          <TabsTrigger value="planner" className="flex flex-col items-center gap-1 py-2 px-1 text-[10px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Shield className="h-4 w-4" />
            <span>{t("hr.planner") || "Plan"}</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex flex-col items-center gap-1 py-2 px-1 text-[10px] sm:text-xs rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <HeartHandshake className="h-4 w-4" />
            <span>{t("hr.support") || "Support"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hub" className="mt-4">
          <HarmReductionHub onNavigate={setActiveTab} />
        </TabsContent>
        <TabsContent value="screening" className="mt-4">
          <RiskScreening userId={user?.id} />
        </TabsContent>
        <TabsContent value="planner" className="mt-4">
          <SaferUsePlanner userId={user?.id} />
        </TabsContent>
        <TabsContent value="support" className="mt-4">
          <CounselingReferral userId={user?.id} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
