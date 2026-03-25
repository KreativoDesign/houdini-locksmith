/**
 * ManagerDashboard — Review, pricing, and reporting view for Manager role.
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Loader2,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:         { label: "Pending",          className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  assigned:        { label: "Assigned",         className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress:     { label: "In Progress",      className: "bg-purple-100 text-purple-700 border-purple-200" },
  completed:       { label: "Completed",        className: "bg-green-100 text-green-700 border-green-200" },
  awaiting_pricing:{ label: "Awaiting Pricing", className: "bg-orange-100 text-orange-700 border-orange-200" },
  priced:          { label: "Priced",           className: "bg-teal-100 text-teal-700 border-teal-200" },
  invoiced:        { label: "Invoiced",         className: "bg-gray-100 text-gray-700 border-gray-200" },
  cancelled:       { label: "Cancelled",        className: "bg-red-100 text-red-700 border-red-200" },
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const jobsQuery = trpc.jobCards.list.useQuery({});
  const enquiriesQuery = trpc.enquiries.list.useQuery({});
  const notifsQuery = trpc.notifications.list.useQuery({});

  const jobs = jobsQuery.data ?? [];
  const enquiries = enquiriesQuery.data ?? [];
  const notifs = notifsQuery.data ?? [];

  const awaitingPricing = jobs.filter((j: any) => j.status === "awaiting_pricing" || j.status === "completed");
  const openEnquiries = enquiries.filter((e: any) => e.status === "new" || e.status === "in_review");
  const unread = notifs.filter((n: any) => !n.isRead).length;

  const stats = [
    {
      label: "Awaiting Pricing",
      value: awaitingPricing.length,
      icon: DollarSign,
      color: "text-orange-600",
      bg: "bg-orange-50",
      path: "/pricing",
    },
    {
      label: "Open Enquiries",
      value: openEnquiries.length,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
      path: "/enquiries",
    },
    {
      label: "Active Jobs",
      value: jobs.filter((j: any) => j.status === "in_progress" || j.status === "assigned").length,
      icon: Briefcase,
      color: "text-primary",
      bg: "bg-primary/10",
      path: "/jobs",
    },
    {
      label: "Unread Alerts",
      value: unread,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      path: "/notifications",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review jobs, approve pricing, and monitor enquiries.
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 border font-medium">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Manager
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button key={stat.label} onClick={() => setLocation(stat.path)} className="text-left">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Jobs awaiting pricing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Jobs Awaiting Pricing</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/pricing")} className="text-xs">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {jobsQuery.isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : awaitingPricing.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No jobs awaiting pricing</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {awaitingPricing.slice(0, 6).map((job: any) => {
                  const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.pending;
                  return (
                    <button
                      key={job.id}
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.jobNumber ?? `JC-${job.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {job.description ?? "No description"}
                        </p>
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

        {/* Open enquiries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Open Enquiries</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/enquiries")} className="text-xs">
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {enquiriesQuery.isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : openEnquiries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No open enquiries</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {openEnquiries.slice(0, 6).map((enq: any) => (
                  <button
                    key={enq.id}
                    onClick={() => setLocation(`/enquiries/${enq.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {enq.subject ?? "Enquiry #" + enq.id}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {enq.description ?? "No description"}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                      enq.status === "new"
                        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                        : "bg-blue-100 text-blue-700 border-blue-200"
                    }`}>
                      {enq.status === "new" ? "New" : "In Review"}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Enquiry", icon: PlusCircle, path: "/enquiries/new", color: "text-blue-600", bg: "bg-blue-50" },
            { label: "New Job Card", icon: Briefcase, path: "/jobs/new", color: "text-primary", bg: "bg-primary/10" },
            { label: "Review Pricing", icon: DollarSign, path: "/pricing", color: "text-orange-600", bg: "bg-orange-50" },
            { label: "View Reports", icon: TrendingUp, path: "/reports", color: "text-purple-600", bg: "bg-purple-50" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => setLocation(action.path)}
              className="flex flex-col items-center gap-2.5 p-5 rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-foreground text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
