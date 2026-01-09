import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Leaderboard from "./pages/Leaderboard";
import HealthProfile from "./pages/HealthProfile";
import ConsultationForm from "./pages/ConsultationForm";
import AdminDashboard from "./pages/AdminDashboard";
import AdminKitOrders from "./pages/AdminKitOrders";
import AdminBlog from "./pages/AdminBlog";
import TrackOrder from "./pages/TrackOrder";
import PersonalInfo from "./pages/PersonalInfo";
import AvatarCustomization from "./pages/AvatarCustomization";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
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
          <Route path="/swing" element={<Swing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/chat/:slug" element={<ChatRoom />} />
          <Route path="/community/interests" element={<Interests />} />
          <Route path="/self-care" element={<SelfCare />} />
          <Route path="/hiv-selftest" element={<HIVSelfTest />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/share" element={<ShareAchievements />} />
          <Route path="/health-profile" element={<HealthProfile />} />
          <Route path="/consultation" element={<ConsultationForm />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/kit-orders" element={<AdminKitOrders />} />
          <Route path="/admin/blog" element={<AdminBlog />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/personal-info" element={<PersonalInfo />} />
          <Route path="/avatar" element={<AvatarCustomization />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
