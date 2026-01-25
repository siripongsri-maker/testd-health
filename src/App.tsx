import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RainbowSwingBackground } from "@/components/ThemedBackground";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PageLoader } from "@/components/PageLoader";

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
const PEPTracker = lazy(() => import("./pages/PEPTracker"));
const Progress = lazy(() => import("./pages/Progress"));
const Info = lazy(() => import("./pages/Info"));
const InfoArticle = lazy(() => import("./pages/InfoArticle"));
const Swing = lazy(() => import("./pages/Swing"));
const Settings = lazy(() => import("./pages/Settings"));
const Community = lazy(() => import("./pages/Community"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const Interests = lazy(() => import("./pages/Interests"));
const SelfCare = lazy(() => import("./pages/SelfCare"));
const HIVSelfTest = lazy(() => import("./pages/HIVSelfTest"));
const Quests = lazy(() => import("./pages/Quests"));
const ShareAchievements = lazy(() => import("./pages/ShareAchievements"));
const Surveys = lazy(() => import("./pages/Surveys"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const HealthProfile = lazy(() => import("./pages/HealthProfile"));
const ConsultationForm = lazy(() => import("./pages/ConsultationForm"));
const Admin = lazy(() => import("./pages/Admin"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const WriteArticle = lazy(() => import("./pages/WriteArticle"));
const PersonalInfo = lazy(() => import("./pages/PersonalInfo"));
const AvatarCustomization = lazy(() => import("./pages/AvatarCustomization"));
const MedicationTracker = lazy(() => import("./pages/MedicationTracker"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RainbowSwingBackground />
      <OfflineBanner />
      <Toaster />
      <Sonner position="top-center" />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AnalyticsProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/consent" element={<Consent />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/setup/prep-daily" element={<SetupPrepDaily />} />
              <Route path="/setup/prep-ondemand" element={<SetupPrepOnDemand />} />
              <Route path="/pep" element={<PEPEmergency />} />
              <Route path="/pep-tracker" element={<PEPTracker />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/info" element={<Info />} />
              <Route path="/info/:id" element={<InfoArticle />} />
              <Route path="/info/article/:slug" element={<InfoArticle />} />
              <Route path="/info/write" element={<WriteArticle />} />
              <Route path="/swing" element={<Swing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/community" element={<Community />} />
              <Route path="/community/chat/:slug" element={<ChatRoom />} />
              <Route path="/community/interests" element={<Interests />} />
              <Route path="/self-care" element={<SelfCare />} />
              <Route path="/hiv-selftest" element={<HIVSelfTest />} />
              <Route path="/quests" element={<Quests />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/share-achievements" element={<ShareAchievements />} />
              <Route path="/surveys" element={<Surveys />} />
              <Route path="/health-profile" element={<HealthProfile />} />
              <Route path="/consultation" element={<ConsultationForm />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/track-order" element={<TrackOrder />} />
              <Route path="/personal-info" element={<PersonalInfo />} />
              <Route path="/avatar" element={<AvatarCustomization />} />
              <Route path="/medication-tracker" element={<MedicationTracker />} />
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
