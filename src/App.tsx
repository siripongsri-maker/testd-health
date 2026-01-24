import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RainbowSwingBackground } from "@/components/ThemedBackground";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Consent from "./pages/Consent";
import Dashboard from "./pages/Dashboard";
import SetupPrepDaily from "./pages/SetupPrepDaily";
import SetupPrepOnDemand from "./pages/SetupPrepOnDemand";
import PEPEmergency from "./pages/PEPEmergency";
import PEPTracker from "./pages/PEPTracker";
import Progress from "./pages/Progress";
import Info from "./pages/Info";
import InfoArticle from "./pages/InfoArticle";
import Swing from "./pages/Swing";
import Settings from "./pages/Settings";
import Community from "./pages/Community";
import ChatRoom from "./pages/ChatRoom";
import Interests from "./pages/Interests";
import SelfCare from "./pages/SelfCare";
import HIVSelfTest from "./pages/HIVSelfTest";
import Quests from "./pages/Quests";
import ShareAchievements from "./pages/ShareAchievements";
import Surveys from "./pages/Surveys";
import Leaderboard from "./pages/Leaderboard";
import HealthProfile from "./pages/HealthProfile";
import ConsultationForm from "./pages/ConsultationForm";
import Admin from "./pages/Admin";
import TrackOrder from "./pages/TrackOrder";
import WriteArticle from "./pages/WriteArticle";
import PersonalInfo from "./pages/PersonalInfo";
import AvatarCustomization from "./pages/AvatarCustomization";
import MedicationTracker from "./pages/MedicationTracker";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RainbowSwingBackground />
      <Toaster />
      <Sonner position="top-center" />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AnalyticsProvider>
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
            <Route path="/self-care" element={<ShareAchievements />} />
            <Route path="/surveys" element={<Surveys />} />
            <Route path="/health-profile" element={<HealthProfile />} />
            <Route path="/consultation" element={<ConsultationForm />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/personal-info" element={<PersonalInfo />} />
            <Route path="/avatar" element={<AvatarCustomization />} />
            <Route path="/medication-tracker" element={<MedicationTracker />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
