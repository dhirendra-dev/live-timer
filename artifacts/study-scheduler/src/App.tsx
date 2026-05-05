import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import AddLecture from "@/pages/lecture/new";
import LectureDetail from "@/pages/lecture/[id]";
import ScheduleSessions from "@/pages/lecture/[id]/schedule";
import LiveSessionPlayer from "@/pages/session/[id]/player";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/lecture/new" component={AddLecture} />
        <Route path="/lecture/:id" component={LectureDetail} />
        <Route path="/lecture/:id/schedule" component={ScheduleSessions} />
        <Route path="/session/:id/player" component={LiveSessionPlayer} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
