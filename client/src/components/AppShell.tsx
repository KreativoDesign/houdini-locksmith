/**
 * AppShell — Role-aware navigation wrapper for all authenticated pages.
 *
 * Renders a sidebar whose menu items adapt based on the current user's role:
 *   Admin      → full menu (all modules)
 *   Manager    → clients, enquiries, job cards, pricing, reports
 *   Technician → only assigned jobs and scheduling
 *
 * Wraps the shadcn Sidebar primitives directly (same pattern as DashboardLayout)
 * so we can customise the menu without forking the component.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useViewContext } from "@/contexts/ViewContext";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { NotificationsBell } from "./NotificationsDrawer";
import { ViewSwitcher, type ViewType } from "./ViewSwitcher";
import { TechnicianDashboard } from "./dashboards/TechnicianDashboard";
import { ClientDashboard } from "./dashboards/ClientDashboard";
import { FrontendPreview } from "./dashboards/FrontendPreview";

// ─────────────────────────────────────────────
// MENU DEFINITIONS
// ─────────────────────────────────────────────

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  roles: Array<"admin" | "manager" | "technician">;
  badge?: string;
  submenu?: Array<{ label: string; path: string }>;
}

const ALL_MENU_ITEMS: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/dashboard",
    roles: ["admin", "manager", "technician"],
  },
  {
    icon: ReceiptText,
    label: "Quotes",
    roles: ["admin", "manager"],
    submenu: [
      { label: "New Quote", path: "/quotes/create" },
      { label: "View All Quotes", path: "/admin/quotes" },
    ],
  },
  {
    icon: ClipboardList,
    label: "Enquiries",
    path: "/enquiries",
    roles: ["admin", "manager"],
  },
  {
    icon: Briefcase,
    label: "Job Cards",
    path: "/jobs",
    roles: ["admin", "manager", "technician"],
  },
  {
    icon: CalendarClock,
    label: "Schedule",
    path: "/schedule",
    roles: ["admin", "manager", "technician"],
  },
  {
    icon: Users,
    label: "Clients",
    path: "/clients",
    roles: ["admin", "manager"],
  },
  {
    icon: FileText,
    label: "Pricing",
    path: "/pricing",
    roles: ["admin", "manager"],
  },
  {
    icon: BarChart3,
    label: "Reports",
    path: "/reports",
    roles: ["admin", "manager"],
  },
  {
    icon: Building2,
    label: "Departments",
    path: "/departments",
    roles: ["admin"],
  },
  {
    icon: Users,
    label: "Team",
    path: "/team",
    roles: ["admin"],
  },
  {
    icon: Settings,
    label: "Settings",
    path: "/settings",
    roles: ["admin"],
  },
];

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-red-100 text-red-700 border-red-200" },
  manager: { label: "Manager", className: "bg-blue-100 text-blue-700 border-blue-200" },
  technician: { label: "Technician", className: "bg-green-100 text-green-700 border-green-200" },
};

// ─────────────────────────────────────────────
// SIDEBAR WIDTH PERSISTENCE
// ─────────────────────────────────────────────

const SIDEBAR_WIDTH_KEY = "hl-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

// ─────────────────────────────────────────────
// INNER SIDEBAR (needs useSidebar hook)
// ─────────────────────────────────────────────

function InnerSidebar({
  sidebarWidth,
  setSidebarWidth,
}: {
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
}) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Fetch pending quote count
  const pendingQuotesQuery = trpc.quotes.countPending.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const role = (user?.role ?? "technician") as "admin" | "manager" | "technician";
  const visibleItems = ALL_MENU_ITEMS.map((item) => {
    // Add badge to Quotes item if user is admin or manager and there are pending quotes
    if (item.label === "Quotes" && (role === "admin" || role === "manager") && pendingQuotesQuery.data?.count) {
      return { ...item, badge: `${pendingQuotesQuery.data.count}` };
    }
    return item;
  }).filter((item) => item.roles.includes(role));
  const roleBadge = ROLE_BADGE[role];

  // Resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - rect.left));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <div
        className="relative"
        ref={sidebarRef}
        style={!isCollapsed ? ({ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties) : undefined}
      >
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-3">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-logo_e1c5aaa1.jpeg"
                alt="Houdini"
                className="w-9 h-9 rounded-lg object-cover shrink-0"
              />
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="font-bold text-sidebar-foreground text-sm leading-none truncate">
                    Houdini
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 mt-0.5 truncate">
                    Locksmith & Security
                  </p>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 py-3">
            {/* Role badge (expanded only) */}
            {!isCollapsed && (
              <div className="px-4 pb-3">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${roleBadge.className}`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {roleBadge.label}
                </span>
              </div>
            )}

            <SidebarMenu className="px-2 space-y-0.5">
              {visibleItems.map((item) => {
                const isActive =
                  item.path
                    ? location === item.path ||
                      (item.path !== "/dashboard" && location.startsWith(item.path))
                    : false;

                if (item.submenu) {
                  return (
                    <div key={item.label}>
                      <SidebarMenuItem>
                        <div className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      </SidebarMenuItem>
                      {item.submenu.map((subitem) => {
                        const isSubActive = location === subitem.path;
                        return (
                          <SidebarMenuItem key={subitem.path} className="ml-4">
                            <SidebarMenuButton
                              isActive={isSubActive}
                              onClick={() => setLocation(subitem.path)}
                              className="h-8 font-normal transition-all text-sm"
                            >
                              <span className={isSubActive ? "font-medium" : ""}>{subitem.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive || false}
                      onClick={() => item.path && setLocation(item.path)}
                      tooltip={item.label}
                      className="h-9 font-normal transition-all"
                    >
                      <item.icon
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground/60"}`}
                      />
                      <span className={isActive ? "font-medium" : ""}>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent/80 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                  <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                        {user?.name ?? "—"}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                        {user?.email ?? "—"}
                      </p>
                    </div>
                  )}
                  {!isCollapsed && (
                    <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/settings/password")}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// EXPORTED SHELL
// ─────────────────────────────────────────────

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const isMobile = useIsMobile();
  const [location] = useLocation();

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { currentView, setCurrentView } = useViewContext();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl overflow-hidden">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-logo_e1c5aaa1.jpeg"
              alt="Houdini"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Authentication required</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to access the Houdini management system.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/login"; }}
            size="lg"
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  // Derive the active page title from the current path
  const activeItem = ALL_MENU_ITEMS.find(
    (item) =>
      item.path &&
      (location === item.path ||
        (item.path !== "/dashboard" && location.startsWith(item.path)))
  );

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <InnerSidebar sidebarWidth={sidebarWidth} setSidebarWidth={setSidebarWidth} />
      <SidebarInset>
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-logo_e1c5aaa1.jpeg"
                  alt="Houdini"
                  className="w-6 h-6 rounded-md object-cover"
                />
                <span className="font-semibold text-sm text-foreground">
                  {activeItem?.label ?? "Houdini"}
                </span>
              </div>
            </div>
            <NotificationsBell />
          </div>
        )}

        {/* Desktop top bar */}
        {!isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" />
              {activeItem && (
                <>
                  <span className="text-border">|</span>
                  <div className="flex items-center gap-2">
                    <activeItem.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{activeItem.label}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
              <NotificationsBell />
            </div>
          </div>
        )}

        <main className="flex-1 p-5 md:p-6">
          {currentView === "admin" && children}
          {currentView === "technician" && <TechnicianDashboard />}
          {currentView === "client" && <ClientDashboard />}
          {currentView === "user" && <FrontendPreview />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
