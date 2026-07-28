import { Switch, Route, Router, useLocation, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LangProvider } from "@/lib/lang";
import { Shell } from "@/components/shell";
import "./i18n";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import DelayLog from "@/pages/delay-log";
import Weekly from "@/pages/weekly";
import ByReason from "@/pages/by-reason";
import Status from "@/pages/status";
import Admin from "@/pages/admin";
import Tv from "@/pages/tv";
import Safety from "@/pages/safety";
import NotFound from "@/pages/not-found";
import { isManager } from "@/lib/auth";
import { DistressBroadcaster } from "@/components/distress-broadcaster";

function Protected({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!role) return <Redirect to="/login" />;
  return <Shell>{children}</Shell>;
}

function AdminGate() {
  const { role } = useAuth();
  if (!isManager(role)) return <Redirect to="/" />;
  return <Admin />;
}

function AppRouter() {
  return (
    <Switch>
      {/* Public kiosk & safety form — bypass auth */}
      <Route path="/tv" component={Tv} />
      <Route path="/safety" component={Safety} />
      <Route path="/login" component={Login} />
      <Route path="/"><Protected><Dashboard /></Protected></Route>
      <Route path="/log"><Protected><DelayLog /></Protected></Route>
      <Route path="/weekly"><Protected><Weekly /></Protected></Route>
      <Route path="/reason"><Protected><ByReason /></Protected></Route>
      <Route path="/status"><Protected><Status /></Protected></Route>
      <Route path="/admin"><Protected><AdminGate /></Protected></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <LangProvider>
            <TooltipProvider>
              <Toaster />
              <Router hook={useHashLocation}>
                <AppRouter />
                <DistressBroadcaster />
              </Router>
            </TooltipProvider>
          </LangProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
