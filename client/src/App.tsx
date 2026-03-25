import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppShell from "./components/AppShell";
import { useAuth } from "./_core/hooks/useAuth";

// Auth pages (no shell)
import Login from "./pages/Login";
import Register from "./pages/Register";

// Dashboard pages (role-specific)
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";

// Feature pages
import TeamManagement from "./pages/TeamManagement";
import AuditLog from "./pages/AuditLog";
import ChangePassword from "./pages/ChangePassword";

// ─────────────────────────────────────────────
// ROUTE GUARDS
// ─────────────────────────────────────────────

/** Redirect unauthenticated users to /login */
function ProtectedRoute({ component: Component, roles }: {
  component: React.ComponentType;
  roles?: Array<"admin" | "manager" | "technician">;
}) {
  const { user, loading } = useAuth();

  if (loading) return null; // DashboardLayoutSkeleton handles this in AppShell

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (roles && !roles.includes(user.role as any)) {
    // Redirect to their appropriate dashboard
    if (user.role === "admin") return <Redirect to="/admin" />;
    if (user.role === "manager") return <Redirect to="/manager" />;
    return <Redirect to="/technician" />;
  }

  return <Component />;
}

/** Role-aware dashboard redirect from /dashboard */
function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "admin") return <Redirect to="/admin" />;
  if (user.role === "manager") return <Redirect to="/manager" />;
  return <Redirect to="/technician" />;
}

/** Redirect authenticated users away from auth pages */
function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <DashboardRedirect />;
  return <Component />;
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      {/* Public auth routes — no shell */}
      <Route path="/login">
        <AuthRoute component={Login} />
      </Route>
      <Route path="/register">
        <AuthRoute component={Register} />
      </Route>

      {/* Root → smart redirect */}
      <Route path="/">
        <DashboardRedirect />
      </Route>

      {/* Dashboard redirect */}
      <Route path="/dashboard">
        <DashboardRedirect />
      </Route>

      {/* Role-specific dashboards */}
      <Route path="/admin">
        <AppShell>
          <ProtectedRoute component={AdminDashboard} roles={["admin"]} />
        </AppShell>
      </Route>
      <Route path="/manager">
        <AppShell>
          <ProtectedRoute component={ManagerDashboard} roles={["manager", "admin"]} />
        </AppShell>
      </Route>
      <Route path="/technician">
        <AppShell>
          <ProtectedRoute component={TechnicianDashboard} roles={["technician", "admin", "manager"]} />
        </AppShell>
      </Route>

      {/* Team management (admin only) */}
      <Route path="/team">
        <AppShell>
          <ProtectedRoute component={TeamManagement} roles={["admin"]} />
        </AppShell>
      </Route>
      <Route path="/team/invite">
        <AppShell>
          <ProtectedRoute component={TeamManagement} roles={["admin"]} />
        </AppShell>
      </Route>

      {/* Audit log (admin only) */}
      <Route path="/audit">
        <AppShell>
          <ProtectedRoute component={AuditLog} roles={["admin"]} />
        </AppShell>
      </Route>

      {/* Password change (all authenticated users) */}
      <Route path="/settings/password">
        <AppShell>
          <ProtectedRoute component={ChangePassword} />
        </AppShell>
      </Route>

      {/* Placeholder routes — show "coming soon" toast */}
      {["/jobs", "/jobs/new", "/enquiries", "/enquiries/new", "/clients", "/schedule", "/pricing", "/reports", "/departments", "/settings", "/notifications"].map((path) => (
        <Route key={path} path={path}>
          <AppShell>
            <ProtectedRoute component={PlaceholderPage} />
          </AppShell>
        </Route>
      ))}

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Placeholder for routes not yet implemented */
function PlaceholderPage() {
  const [location] = useLocation();
  const pageName = location.split("/").filter(Boolean).pop() ?? "page";
  const label = pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, " ");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <span className="text-2xl">🔧</span>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground">{label}</h2>
        <p className="text-muted-foreground text-sm mt-1 max-w-sm">
          This module is coming soon. The backend API for this feature is fully implemented and ready.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
