import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import AdminSetup from "@/pages/admin-setup";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import CreateCampaign from "@/pages/create-campaign";
import Recipients from "@/pages/recipients";
import EmailIntegrations from "@/pages/email-integrations";
import WarmUp from "@/pages/warm-up";
import Deliverability from "@/pages/deliverability";
import Personalization from "@/pages/personalization";
import Settings from "@/pages/settings";
import Upgrade from "@/pages/upgrade";
import Profile from "@/pages/profile";
import About from "@/pages/about";
import Careers from "@/pages/careers";
import Contact from "@/pages/contact";
import EmailVerification from "@/pages/email-verification";
import VerifyEmail from "@/pages/verify-email";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/about" component={About} />
        <Route path="/careers" component={Careers} />
        <Route path="/contact" component={Contact} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/email-verification" component={EmailVerification} />
        <Route path="/admin-setup" component={AdminSetup} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/campaigns" component={Campaigns} />
            <Route path="/campaigns/create" component={CreateCampaign} />
            <Route path="/recipients" component={Recipients} />
            <Route path="/email-integrations" component={EmailIntegrations} />
            <Route path="/warm-up" component={WarmUp} />
            <Route path="/deliverability" component={Deliverability} />
            <Route path="/personalization" component={Personalization} />
            <Route path="/settings" component={Settings} />
            <Route path="/upgrade" component={Upgrade} />
            <Route path="/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
