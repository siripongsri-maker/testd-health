import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { HarmReductionHub } from "@/components/harm-reduction/HarmReductionHub";
import { RiskScreening } from "@/components/harm-reduction/RiskScreening";
import { SaferUsePlanner } from "@/components/harm-reduction/SaferUsePlanner";
import { CounselingReferral } from "@/components/harm-reduction/CounselingReferral";
import { AgeGate } from "@/components/harm-reduction/AgeGate";
import { YouthSafePage } from "@/components/harm-reduction/YouthSafePage";
import { PeerSupport } from "@/components/harm-reduction/PeerSupport";
import { AICompanion } from "@/components/harm-reduction/AICompanion";
import { NudgeCard } from "@/components/harm-reduction/NudgeCard";
import { DailyCheckin } from "@/components/harm-reduction/DailyCheckin";
import { SwingClinicCard } from "@/components/harm-reduction/SwingClinicCard";
import { useHrProfile } from "@/hooks/useHrProfile";
import { getActiveNudges, type Nudge } from "@/lib/SafetyNudges";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { trackEvent } from "@/hooks/useAnalytics";
import { SEOHead, buildMedicalPageJsonLd } from "@/components/seo";

// New zone components
import HrZoneHero from "@/components/harm-reduction/HrZoneHero";
import HrZonePathways from "@/components/harm-reduction/HrZonePathways";
import HrZonePersonalize from "@/components/harm-reduction/HrZonePersonalize";
import HrZoneRecommendations from "@/components/harm-reduction/HrZoneRecommendations";
import HrZoneTrust from "@/components/harm-reduction/HrZoneTrust";

const AGE_STORAGE_KEY = "hr_age_confirmed";
const DEMO_DISMISSED_KEY = "hr_demo_dismissed";

type AgeState = "pending" | "adult" | "minor";
type Section = "landing" | "learn" | "check" | "plan" | "support" | "peers" | "clinic";

export default function HarmReduction() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEn = language === "en";
  const { profile, hasProfile, saveProfile, isMSM, isMSW, isYouth, ageRange } = useHrProfile(user?.id);

  const [ageState, setAgeState] = useState<AgeState>(() => {
    const stored = localStorage.getItem(AGE_STORAGE_KEY);
    if (stored === "adult") return "adult";
    if (stored === "minor") return "minor";
    return "pending";
  });

  const [section, setSection] = useState<Section>("landing");
  const [nudges, setNudges] = useState<Nudge[]>(() => getActiveNudges());
  const [demoDismissed, setDemoDismissed] = useState(() => localStorage.getItem(DEMO_DISMISSED_KEY) === "true");

  const handleDemoDismiss = () => {
    setDemoDismissed(true);
    localStorage.setItem(DEMO_DISMISSED_KEY, "true");
  };

  const handleAgeConfirm = (isAdult: boolean) => {
    const state = isAdult ? "adult" : "minor";
    localStorage.setItem(AGE_STORAGE_KEY, state);
    setAgeState(state);
    trackEvent("hr_age_gate", { result: state });
  };

  const resetAge = () => {
    localStorage.removeItem(AGE_STORAGE_KEY);
    setAgeState("pending");
  };

  const dismissNudge = (id: string) => {
    setNudges((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNavigate = (target: string) => {
    if (target === "clinic") {
      // Show clinic in support view or navigate to booking
      trackEvent("hr_section_enter", { section: "clinic" });
      navigate("/booking");
      return;
    }
    setSection(target as Section);
    trackEvent("hr_section_enter", { section: target });
  };

  // Age gate
  if (ageState === "pending") {
    return (
      <PageContainer className="pb-24">
        <AgeGate onConfirm={handleAgeConfirm} />
      </PageContainer>
    );
  }

  // Youth safe page
  if (ageState === "minor") {
    return (
      <PageContainer className="pb-24">
        <YouthSafePage onReset={resetAge} />
      </PageContainer>
    );
  }

  // Section views
  if (section !== "landing") {
    return (
      <PageContainer className="pb-24">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground"
          onClick={() => setSection("landing")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {isEn ? "Back" : "กลับ"}
        </Button>

        {section === "learn" && <HarmReductionHub onNavigate={(tab) => setSection(tab as Section)} />}
        {section === "check" && <RiskScreening userId={user?.id} onNavigateSupport={() => setSection("support")} />}
        {section === "plan" && <SaferUsePlanner userId={user?.id} onNavigateSupport={() => setSection("support")} />}
        {section === "support" && <CounselingReferral userId={user?.id} />}
        {section === "peers" && <PeerSupport />}

        <AICompanion />
      </PageContainer>
    );
  }

  // ─── Landing: 5 clear zones ───
  return (
    <PageContainer className="pb-24">
      <SEOHead
        title={isEn ? "Harm Reduction — Chemsex Safety & Drug Interaction Guide" : "Harm Reduction — คู่มือลดอันตรายและความปลอดภัย Chemsex"}
        description={isEn
          ? "Harm reduction tools for chemsex safety. Drug interaction checker, substance knowledge library, risk screening, and counseling support."
          : "เครื่องมือลดอันตรายจาก chemsex ตรวจสอบปฏิกิริยาระหว่างสาร คลังความรู้ ประเมินความเสี่ยง และปรึกษาผู้เชี่ยวชาญ"}
        canonicalPath="/harm-reduction"
        lang={language}
        alternateLanguages={[
          { lang: "th", path: "/harm-reduction" },
          { lang: "en", path: "/harm-reduction" },
        ]}
        jsonLd={buildMedicalPageJsonLd({
          name: "Harm Reduction — Chemsex Safety & Drug Interaction Guide",
          description: "Comprehensive harm reduction tools for chemsex safety including drug interaction checker, substance knowledge library, and counseling support.",
          url: "https://testd-health.lovable.app/harm-reduction",
          about: "Harm reduction, chemsex safety, drug interactions, substance education",
        })}
      />

      <div className="space-y-8">
        {/* Safety Nudges — subtle, above hero */}
        {nudges.length > 0 && (
          <div className="space-y-2">
            {nudges.map((nudge) => (
              <NudgeCard key={nudge.id} nudge={nudge} onDismiss={() => dismissNudge(nudge.id)} />
            ))}
          </div>
        )}

        {/* Zone 1 — Hero + quick entry */}
        <HrZoneHero onNavigate={handleNavigate} />

        {/* Zone 2 — Choose what you need (5 pathway cards) */}
        <HrZonePathways onNavigate={handleNavigate} />

        {/* Zone 3 — Personalize gently (collapsible) */}
        {!hasProfile && !demoDismissed && (
          <HrZonePersonalize onSave={saveProfile} onDismiss={handleDemoDismiss} />
        )}

        {/* Daily Check-in (compact) */}
        <DailyCheckin />

        {/* Zone 4 — Recommended for you */}
        {hasProfile && (
          <HrZoneRecommendations
            isMSM={!!isMSM}
            isMSW={!!isMSW}
            isYouth={!!isYouth}
            ageRange={ageRange}
            onNavigate={handleNavigate}
          />
        )}

        {/* Zone 5 — Support and trust layer */}
        <HrZoneTrust userId={user?.id} onResetAge={resetAge} />
      </div>

      {/* Floating AI Companion */}
      <AICompanion />
    </PageContainer>
  );
}
