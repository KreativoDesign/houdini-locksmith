/**
 * AdminDashboard — Full system overview for Admin role.
 * Shows: system stats, recent job cards, team overview, quick actions.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  PlusCircle,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:    { label: "Pending",     className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  assigned:   { label: "Assigned",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress:{ label: "In Progress", className: "bg-purple-100 text-purple-700 border-purple-200" },
  completed:  { label: "Completed",   className: "bg-green-100 text-green-700 border-green-200" },
  priced:     { label: "Priced",      className: "bg-teal-100 text-teal-700 border-teal-200" },
  invoiced:   { label: "Invoiced",    className: "bg-gray-100 text-gray-700 border-gray-200" },
  cancelled:  { label: "Cancelled",   className: "bg-red-100 text-red-700 border-red-200" },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const jobsQuery = trpc.jobCards.list.useQuery({});
  const enquiriesQuery = trpc.enquiries.list.useQuery({});
  const usersQuery = trpc.users.list.useQuery({});
  const deptsQuery = trpc.departments.list.useQuery();
  const notifsQuery = trpc.notifications.list.useQuery({});

  const jobs = jobsQuery.data ?? [];
  const enquiries = enquiriesQuery.data ?? [];
  const allUsers = usersQuery.data ?? [];
  const depts = deptsQuery.data ?? [];
  const notifs = notifsQuery.data ?? [];

  const unreadCount = notifs.filter((n: any) => !n.isRead).length;

  const stats = [
    {
      label: "Total Jobs",
      value: jobs.length,
      icon: Briefcase,
      color: "text-primary",
      bg: "bg-primary/10",
      path: "/jobs",
    },
    {
      label: "Open Enquiries",
      value: (enquiries as any)?.rows ? (enquiries as any).rows.filter((e: any) => e.status === "new" || e.status === "in_review").length : Array.isArray(enquiries) ? (enquiries as any[]).filter((e: any) => e.status === "new" || e.status === "in_review").length : 0,
      icon: ClipboardList,
      color: "text-primary",
      bg: "bg-primary/10",
      path: "/enquiries",
    },
    {
      label: "Active Technicians",
      value: allUsers.filter((u: any) => u.role === "technician" && u.isActive).length,
      icon: Wrench,
      color: "text-primary",
      bg: "bg-primary/10",
      path: "/team",
    },
    {
      label: "Departments",
      value: depts.filter((d: any) => d.isActive).length,
      icon: Building2,
      color: "text-primary",
      bg: "bg-primary/10",
      path: "/departments",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {getGreeting()}, {user?.name?.split(" ")[0] ?? "Admin"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s what&apos;s happening across Houdini today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-100 text-red-700 border-red-200 border font-medium">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Administrator
          </Badge>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => setLocation(stat.path)}
            className="text-left"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-[3px] border-l-primary overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {jobsQuery.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent job cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent Job Cards</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/jobs")} className="text-xs">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {jobsQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Briefcase className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No job cards yet</p>
                <Button size="sm" className="mt-3" onClick={() => setLocation("/jobs/new")}>
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Create first job
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {jobs.map((job: any) => {
                  const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.pending;
                  return (
                    <button
                      key={job.id}
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.jobNumber ?? `JC-${job.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {job.description ?? "No description"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.isUrgent && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "New Enquiry", icon: PlusCircle, path: "/enquiries/new", color: "text-blue-600" },
                { label: "New Job Card", icon: Briefcase, path: "/jobs/new", color: "text-primary" },
                { label: "New Quote", icon: ClipboardList, path: "/admin/quotes/new", color: "text-amber-600" },
                { label: "Invite Team Member", icon: Users, path: "/team/invite", color: "text-green-600" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => setLocation(action.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                >
                  <action.icon className={`w-4 h-4 ${action.color} shrink-0`} />
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {notifs.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-center">
                  <CheckCircle2 className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">All caught up</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="divide-y divide-border">
                  {notifs.slice(0, 4).map((n: any) => (
                    <div key={n.id} className={`px-4 py-3 ${!n.isRead ? "bg-primary/5" : ""}`}>
                      <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Team overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Team Overview</h2>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/team")} className="text-xs">
            Manage team <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allUsers.slice(0, 8).map((u: any) => {
              const roleInfo = {
                admin: { label: "Admin", className: "bg-red-100 text-red-700" },
                manager: { label: "Manager", className: "bg-blue-100 text-blue-700" },
                technician: { label: "Technician", className: "bg-green-100 text-green-700" },
              }[u.role as string] ?? { label: u.role, className: "bg-gray-100 text-gray-700" };
              const initials = u.name
                ? u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                : "?";
              return (
                <Card key={u.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name ?? "—"}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleInfo.className}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
