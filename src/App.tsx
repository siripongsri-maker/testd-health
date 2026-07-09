import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LocaleRedirector, useStrippedLocation } from "@/components/seo/LocaleRouter";
import { RainbowSwingBackground, ThemedBackground } from "@/components/ThemedBackground";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PageLoader } from "@/components/PageLoader";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AutoSEO } from "@/components/seo/AutoSEO";
const FloatingMedClock = lazy(() => import("@/components/FloatingMedClock").then(m => ({ default: m.FloatingMedClock })));
import { AppLayout } from "@/components/AppLayout";
import { ForceUpdateGuard } from "@/components/ForceUpdateGuard";
import { DeploymentVersionCheck } from "@/components/DeploymentVersionCheck";
import { consumePendingReload } from "@/lib/cacheResetLog";
import { APP_VERSION } from "@/config/appVersion";

// Log whether the previous forced reload landed on the expected version.
consumePendingReload();
import { VersionAnnouncementBanner } from "@/components/VersionAnnouncementBanner";
import { useMedicationReminder } from "@/hooks/useMedicationReminder";

// Lazy load all pages for code-splitting
const Home = lazy(() => import("./pages/Home"));
const SmsRedirect = lazy(() => import("./pages/SmsRedirect"));
const KitTrackPublic = lazy(() => import("./pages/KitTrackPublic"));
const SelftestFollowup = lazy(() => import("./pages/SelftestFollowup"));
const SelftestUpdateId = lazy(() => import("./pages/SelftestUpdateId"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Consent = lazy(() => import("./pages/Consent"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
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
const PrePostResults = lazy(() => import("./pages/PrePostResults"));
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
const PostCounselingForm = lazy(() => import("./pages/PostCounselingForm"));
const PostCounselingQR = lazy(() => import("./pages/PostCounselingQR"));
const HarmReductionGuide = lazy(() => import("./pages/HarmReductionGuide"));
const VirtualMode = lazy(() => import("./pages/VirtualMode"));
const OutreachForm = lazy(() => import("./pages/OutreachForm"));
const PrivacyCenter = lazy(() => import("./pages/PrivacyCenter"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const YouthHivSurvey = lazy(() => import("./pages/YouthHivSurvey"));
const MyRewards = lazy(() => import("./pages/MyRewards"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — avoid refetch storms
      gcTime: 30 * 60 * 1000,        // keep cached 30 min
      refetchOnWindowFocus: false,   // stop refetching on tab focus
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

/** Inner shell — lives inside BrowserRouter so children can useNavigate */
function AppShell() {
  useMedicationReminder();
  const strippedLocation = useStrippedLocation();

  if (import.meta.env.DEV && strippedLocation.pathname === "/") {
    console.info("[testD-route] /th resolves to <Home />", {
      component: "src/pages/Home.tsx",
      matchedPathname: strippedLocation.pathname,
      appVersion: APP_VERSION,
    });
  }

  return (
    <>
      <VersionAnnouncementBanner />
      <AnalyticsProvider>
        <Suspense fallback={<PageLoader />}>
          <AppLayout>
            <Routes location={strippedLocation}>
              <Route path="/" element={<Home />} />
              <Route path="/r/:token" element={<SmsRedirect />} />
              <Route path="/track-kit" element={<KitTrackPublic />} />
              <Route path="/track-kit/:code" element={<KitTrackPublic />} />
              <Route path="/selftest/followup/:token" element={<SelftestFollowup />} />
              <Route path="/followup/:token" element={<SelftestFollowup />} />
              <Route path="/selftest/update-id/:token" element={<SelftestUpdateId />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/consent" element={<Consent />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
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
              {/* Direct submission channel: share-friendly short links that drop clients into the submit-result flow.
                  All aliases below MUST resolve to the same destination — /hiv-selftest?action=submit. */}
              <Route path="/submit-result" element={<Navigate to="/hiv-selftest?action=submit" replace />} />
              <Route path="/selftest" element={<Navigate to="/hiv-selftest?action=submit" replace />} />
              {/* Public, SMS-friendly short link. Renders Booking directly so the URL the recipient taps
                  stays clean (no redirect bounce, no 404 race during SPA hydration). */}
              <Route path="/clinic/book" element={<Booking />} />
              <Route path="/clinic" element={<Navigate to="/clinic/book" replace />} />
              <Route path="/submit-hiv-result" element={<Navigate to="/hiv-selftest?action=submit" replace />} />
              <Route path="/submit" element={<Navigate to="/hiv-selftest?action=submit" replace />} />
              <Route path="/th/submit-result" element={<Navigate to="/th/hiv-selftest?action=submit" replace />} />
              <Route path="/th/submit-hiv-result" element={<Navigate to="/th/hiv-selftest?action=submit" replace />} />
              <Route path="/th/submit" element={<Navigate to="/th/hiv-selftest?action=submit" replace />} />
              <Route path="/en/submit-result" element={<Navigate to="/en/hiv-selftest?action=submit" replace />} />
              <Route path="/en/submit-hiv-result" element={<Navigate to="/en/hiv-selftest?action=submit" replace />} />
              <Route path="/en/submit" element={<Navigate to="/en/hiv-selftest?action=submit" replace />} />
              
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/share-achievements" element={<ShareAchievements />} />
              <Route path="/surveys" element={<Surveys />} />
              <Route path="/surveys/pre-post-results" element={<PrePostResults />} />
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
              <Route path="/post-counseling/:token" element={<PostCounselingForm />} />
              <Route path="/post-counseling-qr/:token" element={<PostCounselingQR />} />
              <Route path="/virtual" element={<VirtualMode />} />
              <Route path="/virtual/clinic" element={<VirtualMode forceClinic />} />
              <Route path="/virtual/:slug" element={<VirtualMode />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </Suspense>
        <Suspense fallback={null}><FloatingMedClock /></Suspense>
      </AnalyticsProvider>
    </>
  );
}

const App = () => {
  return (
    <ForceUpdateGuard>
      <DeploymentVersionCheck />
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
