import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppShell from "./components/AppShell";
import { useAuth } from "./_core/hooks/useAuth";

// Auth pages (no shell)
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

// Public pages (no auth required)
const Landing = lazy(() => import("./pages/Landing"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const PublicQuoteView = lazy(() => import("./pages/PublicQuoteView"));
const ServiceLocksmithing = lazy(() => import("./pages/ServiceLocksmithing"));
const ServiceSecurity = lazy(() => import("./pages/ServiceSecurity"));
const ServiceDiagnostics = lazy(() => import("./pages/ServiceDiagnostics"));

// Dashboard pages (role-specific)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const TechnicianDashboard = lazy(() => import("./pages/TechnicianDashboard"));
const TechnicianMobileApp = lazy(() => import("./pages/TechnicianMobileApp"));
import { useIsMobile } from "./hooks/useMobile";

// Auth / settings pages
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

// CRM pages
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Enquiries = lazy(() => import("./pages/Enquiries"));
const EnquiryDetail = lazy(() => import("./pages/EnquiryDetail"));
const EnquiryForm = lazy(() => import("./pages/EnquiryForm"));

// Admin pages
const Departments = lazy(() => import("./pages/Departments"));

// Job Cards pages
const JobCards = lazy(() => import("./pages/JobCards"));
const JobCardDetail = lazy(() => import("./pages/JobCardDetail"));
const TechnicianJobDetail = lazy(() => import("./pages/TechnicianJobDetail"));
const JobCardForm = lazy(() => import("./pages/JobCardForm"));
const JobCardEditForm = lazy(() => import("./pages/JobCardEditForm"));
const Jobs = lazy(() => import("./pages/Jobs"));


// Pricing page
const Pricing = lazy(() => import("./pages/Pricing"));
const PricingCatalogue = lazy(() => import("./pages/PricingCatalogue"));

// Quotes page
const QuoteBuilder = lazy(() => import("./pages/QuoteBuilder"));
const Quotes = lazy(() => import("./pages/Quotes"));
const QuoteDetails = lazy(() => import("./pages/QuoteDetails"));

// Settings pages
const DepartmentServiceSettings = lazy(() => import("./pages/DepartmentServiceSettings"));
const Settings = lazy(() => import("./pages/Settings"));

// Schedule page
const SchedulePage = lazy(() => import("./pages/Schedule"));

// ─────────────────────────────────────────────
// ROUTE GUARDS
// ─────────────────────────────────────────────

/** Redirect unauthenticated users to /login */
function ProtectedRoute({ component: Component, roles }: {
  component: React.ComponentType;
  roles?: Array<"admin" | "manager" | "technician">;
}) {
  // IMPORTANT: All hooks must be called unconditionally before any conditional logic
  const { user, loading } = useAuth();

  // Now handle conditional logic WITHOUT early returns
  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (roles && !roles.includes(user.role as any)) {
    if (user.role === "admin") return <Redirect to="/admin" />;
    if (user.role === "manager") return <Redirect to="/manager" />;
    return <Redirect to="/technician" />;
  }

  // Mount each page as a React component. Calling a function component directly
  // attaches its hooks to ProtectedRoute and can corrupt the hook chain on navigation.
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

/**
 * JobDetailRoute — renders the mobile-optimised job detail for technicians on
 * small screens, and the full JobCardDetail inside AppShell otherwise.
 */
function JobDetailRoute() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) return null;
  if (!user) return <Redirect to="/login" />;

  if (user.role === "technician" && isMobile) {
    return <TechnicianJobDetail />;
  }

  return (
    <AppShell>
      <ProtectedRoute component={JobCardDetail} />
    </AppShell>
  );
}

/**
 * TechnicianRoute — renders the full-screen mobile app for technicians on
 * small screens, and the standard AppShell + TechnicianDashboard on desktop.
 * Admin/manager users who visit /technician still get the desktop view.
 */
function TechnicianRoute() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) return null;
  if (!user) return <Redirect to="/login" />;

  // Technicians on mobile → dedicated mobile shell (no sidebar)
  if (user.role === "technician" && isMobile) {
    return <TechnicianMobileApp />;
  }

  // Desktop or admin/manager previewing the technician view
  return (
    <AppShell>
      <ProtectedRoute component={TechnicianDashboard} roles={["technician", "admin", "manager"]} />
    </AppShell>
  );
}

/** Redirect authenticated users away from auth pages */
function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <DashboardRedirect />;
  return <Component />;
}

/** Root route that keeps authentication hooks inside a dedicated React component. */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
  return <DashboardRedirect />;
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

      {/* Root → show landing for unauthenticated, redirect for authenticated */}
      <Route path="/">
        <RootRoute />
      </Route>
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
        <TechnicianRoute />
      </Route>

      {/* ── CRM: Clients ── */}
      <Route path="/clients">
        <AppShell>
          <ProtectedRoute component={Clients} />
        </AppShell>
      </Route>
      <Route path="/clients/:id">
        <AppShell>
          <ProtectedRoute component={ClientDetail} />
        </AppShell>
      </Route>

      {/* ── CRM: Enquiries ── */}
      <Route path="/enquiries">
        <AppShell>
          <ProtectedRoute component={Enquiries} />
        </AppShell>
      </Route>
      <Route path="/enquiries/new">
        <AppShell>
          <ProtectedRoute component={EnquiryForm} />
        </AppShell>
      </Route>
      <Route path="/enquiries/:id/edit">
        <AppShell>
          <ProtectedRoute component={EnquiryForm} />
        </AppShell>
      </Route>
      <Route path="/enquiries/:id">
        <AppShell>
          <ProtectedRoute component={EnquiryDetail} />
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

      {/* Departments (admin only) */}
      <Route path="/departments">
        <AppShell>
          <ProtectedRoute component={Departments} roles={["admin"]} />
        </AppShell>
      </Route>

      {/* ── Job Management ── */}
      <Route path="/jobs">
        <AppShell>
          <ProtectedRoute component={Jobs} roles={["admin", "manager"]} />
        </AppShell>
      </Route>
      <Route path="/jobs/new">
        <AppShell>
          <ProtectedRoute component={JobCardForm} roles={["admin", "manager"]} />
        </AppShell>
      </Route>
      <Route path="/jobs/:id/edit">
        <AppShell>
          <ProtectedRoute component={JobCardEditForm} roles={["admin", "manager"]} />
        </AppShell>
      </Route>
      <Route path="/jobs/:id">
        <AppShell>
          <ErrorBoundary>
            <ProtectedRoute component={JobCardDetail} />
          </ErrorBoundary>
        </AppShell>
      </Route>

      {/* ── Pricing ── */}
      <Route path="/pricing">
        <AppShell>
          <ProtectedRoute component={Pricing} />
        </AppShell>
      </Route>

      {/* ── Pricing Catalogue (admin only) ── */}
      <Route path="/settings/catalogue">
        <AppShell>
          <ProtectedRoute component={PricingCatalogue} roles={["admin"]} />
        </AppShell>
      </Route>

      {/* Schedule page */}
      <Route path="/schedule">
        <AppShell>
          <ProtectedRoute component={SchedulePage} />
        </AppShell>
      </Route>

      {/* ── Quotes (admin/manager only) ── */}
      <Route path="/admin/quotes">
        <AppShell>
          <ProtectedRoute component={Quotes} roles={["admin", "manager"]} />
        </AppShell>
      </Route>
      <Route path="/admin/quotes/new">
        <AppShell>
          <ProtectedRoute component={QuoteBuilder} roles={["admin", "manager"]} />
        </AppShell>
      </Route>
      <Route path="/admin/quotes/:id">
        <AppShell>
          <ProtectedRoute component={QuoteDetails} roles={["admin", "manager"]} />
        </AppShell>
      </Route>

      {/* Department Service Settings (admin only) */}
      <Route path="/admin/settings/departments">
        <AppShell>
          <ProtectedRoute component={DepartmentServiceSettings} roles={["admin"]} />
        </AppShell>
      </Route>

      {/* Settings page */}
      <Route path="/settings">
        <AppShell>
          <ProtectedRoute component={Settings} />
        </AppShell>
      </Route>

      {/* Placeholder routes — show "coming soon" */}
      {["/reports", "/notifications"].map((path) => (
        <Route key={path} path={path}>
          <AppShell>
            <ProtectedRoute component={PlaceholderPage} />
          </AppShell>
        </Route>
      ))}

      {/* ── Service Pages (no auth required) ── */}
      <Route path="/services/locksmithing" component={ServiceLocksmithing} />
      <Route path="/services/security" component={ServiceSecurity} />
      <Route path="/services/diagnostics" component={ServiceDiagnostics} />

      {/* ── Public client portal (no auth required) ── */}
      <Route path="/client-portal/:token" component={ClientPortal} />
      {/* Legacy links copied before canonical URL alignment */}
      <Route path="/portal/:token" component={ClientPortal} />

      {/* ── Admin quote creation (must come before /quotes/:token) ── */}
      <Route path="/quotes/create">
        <AppShell>
          <ProtectedRoute component={QuoteBuilder} roles={["admin", "manager"]} />
        </AppShell>
      </Route>

      {/* ── Public quote view (no auth required) ── */}
      <Route path="/quotes/:token" component={PublicQuoteView} />

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
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading Houdini…</div>}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
