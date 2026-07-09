import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, ClipboardCheck, ArrowLeftRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import AdminPreServiceSurveysContent from "./AdminPreServiceSurveysContent";
import { PostCounselingCasesTab } from "./AdminPostCounselingContent";

/**
 * Unified hub for the "แบบสำรวจก่อนรับบริการ" (Pre-Service Survey) admin route.
 * Three tabs so counselors don't have to hunt for the post-counseling flow:
 *   1. Pre-Counseling Survey (existing dashboard)
 *   2. Post-Counseling Evaluation (cases + QR management)
 *   3. Pre/Post Comparison
 */
export default function AdminPreServiceHubContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const [tab, setTab] = useState<"pre" | "post" | "compare">("pre");

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
      <TabsList className="grid grid-cols-3 w-full max-w-2xl">
        <TabsTrigger value="pre" className="gap-1.5">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">{tx("แบบสำรวจก่อนรับบริการ", "Pre-Counseling")}</span>
          <span className="sm:hidden">{tx("ก่อน", "Pre")}</span>
        </TabsTrigger>
        <TabsTrigger value="post" className="gap-1.5">
          <ClipboardCheck className="h-4 w-4" />
          <span className="hidden sm:inline">{tx("ประเมินหลังคำปรึกษา", "Post-Counseling")}</span>
          <span className="sm:hidden">{tx("หลัง", "Post")}</span>
        </TabsTrigger>
        <TabsTrigger value="compare" className="gap-1.5">
          <ArrowLeftRight className="h-4 w-4" />
          <span className="hidden sm:inline">{tx("เปรียบเทียบก่อน–หลัง", "Pre / Post")}</span>
          <span className="sm:hidden">Δ</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pre" className="mt-0">
        <AdminPreServiceSurveysContent />
      </TabsContent>
      <TabsContent value="post" className="mt-0">
        <PostCounselingCasesTab variant="cases" />
      </TabsContent>
      <TabsContent value="compare" className="mt-0">
        <PostCounselingCasesTab variant="compare" />
      </TabsContent>
    </Tabs>
  );
}
