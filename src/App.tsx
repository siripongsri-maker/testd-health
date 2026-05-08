import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LocaleRedirector, useStrippedLocation } from "@/components/seo/LocaleRouter";
import { RainbowSwingBackground, ThemedBackground } from "@/components/ThemedBackground";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PageLoader } from "@/components/PageLoader";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AutoSEO } from "@/components/seo/AutoSEO";
import { FloatingMedClock } from "@/components/FloatingMedClock";
import { AppLayout } from "@/components/AppLayout";
import { ForceUpdateGuard } from "@/components/ForceUpdateGuard";
import { VersionAnnouncementBanner } from "@/components/VersionAnnouncementBanner";
import { useMedicationReminder } from "@/hooks/useMedicationReminder";

// Lazy load all pages for code-splitting
const Home = lazy(() => import("./pages/Home"));
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Consent = lazy(() => import("./pages/Consent"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SetupPrepDaily = lazy(() => import("./pages/SetupPrepDaily"));
const SetupPrepOnDemand = lazy(() => import("./pages/SetupPrepOnDemand"));
const PEPEmergency = lazy(() => import("./pages/PEPEmergency"));

const Progress = lazy(() => import("./pages/Progress"));
const Info = lazy(() => import("./pages/Info"));
const InfoArticle = lazy(() => import("./pages/InfoArticle"));

const Settings = lazy(() => import("./pages/Settings"));
const Community = lazy(() => import("./pages/Community"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const Interests = lazy(() => import("./pages/Interests"));
const SelfCare = lazy(() => import("./pages/SelfCare"));
const HIVSelfTest = lazy(() => import("./pages/HIVSelfTest"));

const ShareAchievements = lazy(() => import("./pages/ShareAchievements"));
const Surveys = lazy(() => import("./pages/Surveys"));
const SurveyTake = lazy(() => import("./pages/SurveyTake"));
const SurveyBuilder = lazy(() => import("./pages/SurveyBuilder"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const HealthProfile = lazy(() => import("./pages/HealthProfile"));
const ConsultationForm = lazy(() => import("./pages/ConsultationForm"));
const Admin = lazy(() => import("./pages/Admin"));

const WriteArticle = lazy(() => import("./pages/WriteArticle"));
const PersonalInfo = lazy(() => import("./pages/PersonalInfo"));
const AvatarCustomization = lazy(() => import("./pages/AvatarCustomization"));
const MedicationTracker = lazy(() => import("./pages/MedicationTracker"));
const Install = lazy(() => import("./pages/Install"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Booking = lazy(() => import("./pages/Booking"));
const MyAppointments = lazy(() => import("./pages/MyAppointments"));
const GuestAppointments = lazy(() => import("./pages/GuestAppointments"));
const InviteCreate = lazy(() => import("./pages/InviteCreate"));
const Credits = lazy(() => import("./pages/Credits"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));
const InviteSession = lazy(() => import("./pages/InviteSession"));
const DocsViewer = lazy(() => import("./pages/DocsViewer"));
const DocsIndex = lazy(() => import("./pages/DocsViewer").then(m => ({ default: m.DocsIndex })));
const SupportChat = lazy(() => import("./pages/SupportChat"));
const SupportFAQPage = lazy(() => import("./pages/SupportFAQ"));
const PreventionMatch = lazy(() => import("./pages/PreventionMatch"));
const QueueTV = lazy(() => import("./pages/QueueTV"));
const LinkRedirect = lazy(() => import("./pages/LinkRedirect"));
const HarmReduction = lazy(() => import("./pages/HarmReduction"));
const SEOLanding = lazy(() => import("./pages/SEOLanding"));
const InteractionPage = lazy(() => import("./pages/InteractionPage"));
const Partners = lazy(() => import("./pages/Partners"));

const ClientFeedbackForm = lazy(() => import("./pages/ClientFeedbackForm"));
const HarmReductionGuide = lazy(() => import("./pages/HarmReductionGuide"));
const VirtualMode = lazy(() => import("./pages/VirtualMode"));
const OutreachForm = lazy(() => import("./pages/OutreachForm"));
const PrivacyCenter = lazy(() => import("./pages/PrivacyCenter"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const YouthHivSurvey = lazy(() => import("./pages/YouthHivSurvey"));
const MyRewards = lazy(() => import("./pages/MyRewards"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** Inner shell — lives inside BrowserRouter so children can useNavigate */
function AppShell() {
  useMedicationReminder();
  const strippedLocation = useStrippedLocation();
  return (
    <>
      <VersionAnnouncementBanner />
      <AnalyticsProvider>
        <Suspense fallback={<PageLoader />}>
          <AppLayout>
            <Routes location={strippedLocation}>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/consent" element={<Consent />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/setup/prep-daily" element={<SetupPrepDaily />} />
              <Route path="/setup/prep-ondemand" element={<SetupPrepOnDemand />} />
              <Route path="/pep" element={<PEPEmergency />} />
              
              <Route path="/progress" element={<Progress />} />
              <Route path="/info" element={<Info />} />
              <Route path="/info/:id" element={<InfoArticle />} />
              <Route path="/info/article/:slug" element={<InfoArticle />} />
              <Route path="/info/write" element={<WriteArticle />} />
              
              <Route path="/settings" element={<Settings />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/chat/:slug" element={<ChatRoom />} />
              <Route path="/community/interests" element={<Interests />} />
              <Route path="/self-care" element={<SelfCare />} />
              <Route path="/hiv-selftest" element={<HIVSelfTest />} />
              
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/share-achievements" element={<ShareAchievements />} />
              <Route path="/surveys" element={<Surveys />} />
              <Route path="/surveys/:id" element={<SurveyTake />} />
              <Route path="/surveys/:id/builder" element={<SurveyBuilder />} />
              <Route path="/surveys/youth-hiv" element={<YouthHivSurvey />} />
              <Route path="/health-profile" element={<HealthProfile />} />
              <Route path="/consultation" element={<ConsultationForm />} />
              <Route path="/admin" element={<Admin />} />
              
              <Route path="/personal-info" element={<PersonalInfo />} />
              <Route path="/avatar" element={<AvatarCustomization />} />
              <Route path="/medication-tracker" element={<MedicationTracker />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/my-appointments" element={<MyAppointments />} />
              <Route path="/guest-appointments" element={<GuestAppointments />} />
              <Route path="/invite" element={<InviteCreate />} />
              <Route path="/credits" element={<Credits />} />
              <Route path="/invite/:code" element={<InviteLanding />} />
              <Route path="/invite/session/:sessionCode" element={<InviteSession />} />
              <Route path="/install" element={<Install />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/docs" element={<DocsIndex />} />
              <Route path="/docs/:docName" element={<DocsViewer />} />
              <Route path="/support-chat" element={<SupportChat />} />
              <Route path="/support-faq" element={<SupportFAQPage />} />
              <Route path="/prevention-match" element={<PreventionMatch />} />
              <Route path="/queue-tv/:branchSlug" element={<QueueTV />} />
              <Route path="/go/:slug" element={<LinkRedirect />} />
              <Route path="/harm-reduction" element={<HarmReduction />} />
              <Route path="/chemsex-safety" element={<SEOLanding />} />
              <Route path="/drug-combination-risk" element={<SEOLanding />} />
              <Route path="/ghb-overdose" element={<SEOLanding />} />
              <Route path="/meth-harm-reduction" element={<SEOLanding />} />
              <Route path="/hiv-self-test-guide" element={<SEOLanding />} />
              <Route path="/interaction/:slug" element={<InteractionPage />} />
              <Route path="/partners" element={<Partners />} />
              
              <Route path="/admin/docs/harm-reduction-guide" element={<HarmReductionGuide />} />
              <Route path="/privacy-center" element={<PrivacyCenter />} />
              <Route path="/outreach-form" element={<OutreachForm />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/my-rewards" element={<MyRewards />} />
              <Route path="/feedback" element={<ClientFeedbackForm />} />
              <Route path="/virtual" element={<VirtualMode />} />
              <Route path="/virtual/clinic" element={<VirtualMode forceClinic />} />
              <Route path="/virtual/:slug" element={<VirtualMode />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </Suspense>
        <FloatingMedClock />
      </AnalyticsProvider>
    </>
  );
}

const App = () => {
  return (
    <ForceUpdateGuard>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemedBackground />
          <RainbowSwingBackground />
          <OfflineBanner />
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <ScrollToTop />
            <LocaleRedirector>
              <AutoSEO />
              <AppShell />
            </LocaleRedirector>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ForceUpdateGuard>
  );
};

export default App;
