/**
 * TechnicianDashboard — Focused view for Technician role.
 * Shows only jobs assigned to the current technician.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Wrench,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending",     className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  assigned:    { label: "Assigned",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-700 border-purple-200" },
  completed:   { label: "Completed",   className: "bg-green-100 text-green-700 border-green-200" },
  priced:      { label: "Priced",      className: "bg-teal-100 text-teal-700 border-teal-200" },
  invoiced:    { label: "Invoiced",    className: "bg-gray-100 text-gray-700 border-gray-200" },
  cancelled:   { label: "Cancelled",   className: "bg-red-100 text-red-700 border-red-200" },
};

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch jobs assigned to this technician
  const jobsQuery = trpc.jobCards.list.useQuery(
    { assignedTechnicianId: user?.id },
    { enabled: !!user?.id, refetchInterval: 5_000, refetchOnWindowFocus: true }
  );

  const notifsQuery = trpc.notifications.list.useQuery({});

  const jobs = jobsQuery.data ?? [];
  const notifs = notifsQuery.data ?? [];

  const activeJobs = jobs.filter((j: any) => j.status === "assigned" || j.status === "in_progress");
  const completedToday = jobs.filter((j: any) => {
    if (j.status !== "completed") return false;
    const today = new Date().toDateString();
    return new Date(j.updatedAt).toDateString() === today;
  });
  const urgentJobs = jobs.filter((j: any) => j.isUrgent && j.status !== "completed" && j.status !== "cancelled");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            My Jobs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Welcome back."}{" "}
            You have {activeJobs.length} active job{activeJobs.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <Badge className="bg-green-100 text-green-700 border-green-200 border font-medium">
          <Wrench className="w-3 h-3 mr-1" />
          Technician
        </Badge>
      </div>

      {/* Urgent jobs alert */}
      {urgentJobs.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {urgentJobs.length} urgent job{urgentJobs.length !== 1 ? "s" : ""} require attention
            </p>
            <p className="text-xs text-destructive/70 mt-0.5">
              {urgentJobs.map((j: any) => j.jobNumber ?? `JC-${j.id}`).join(", ")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => setLocation("/jobs")}
          >
            View
          </Button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Jobs", value: activeJobs.length, icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
          { label: "Completed Today", value: completedToday.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Urgent", value: urgentJobs.length, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My assigned jobs */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">My Assigned Jobs</h2>
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
              <CardContent className="p-10 text-center">
                <Briefcase className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No jobs assigned yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Jobs assigned to you will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {jobs.slice(0, 8).map((job: any) => {
                  const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.pending;
                  return (
                    <button
                      key={job.id}
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        job.isUrgent ? "bg-destructive/10" : "bg-primary/10"
                      }`}>
                        {job.isUrgent
                          ? <AlertCircle className="w-4 h-4 text-destructive" />
                          : <Briefcase className="w-4 h-4 text-primary" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {job.jobNumber ?? `JC-${job.id}`}
                          </p>
                          {job.isUrgent && (
                            <span className="text-xs text-destructive font-medium shrink-0">URGENT</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {job.description ?? "No description"}
                        </p>
                        {job.scheduledDate && (
                          <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(job.scheduledDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
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
                { label: "View Schedule", icon: CalendarClock, path: "/schedule", color: "text-blue-600" },
                { label: "My Jobs", icon: Briefcase, path: "/jobs", color: "text-primary" },
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

          {/* Recent notifications */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Notifications</h2>
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
                  {notifs.slice(0, 5).map((n: any) => (
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
    </div>
  );
}
