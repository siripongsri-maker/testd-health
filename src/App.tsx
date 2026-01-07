import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
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
          <Route path="/swing" element={<Swing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
