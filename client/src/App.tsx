import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Control from "@/pages/control";
import Games from "@/pages/games";
import Stats from "@/pages/stats";
import Standings from "@/pages/standings";
import PublicLeague from "@/pages/public";
import GonzoCup from "@/pages/gonzo-cup";
import GonzoCupPublic from "@/pages/gonzo-cup-public";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Control} />
      <Route path="/games" component={Games} />
      <Route path="/stats" component={Stats} />
      <Route path="/standings" component={Standings} />
      <Route path="/public" component={PublicLeague} />
      <Route path="/GonzoCup" component={GonzoCupPublic} />
      <Route path="/GonzoCupControl" component={GonzoCup} />
      <Route component={NotFound} />
    </Switch>
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
