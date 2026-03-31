/**
 * TechnicianMobileApp — Full-screen mobile-first shell for technicians.
 *
 * Rendered instead of AppShell when:
 *   - user.role === "technician"  AND  isMobile === true
 *
 * Tabs (bottom nav):
 *   Today    — jobs scheduled for today + urgent alerts
 *   Jobs     — full assigned-job list with status filter
 *   Profile  — name, role, change password, sign out
 *
 * Each job card has a "⋯" action button that opens a bottom-sheet with
 * allowed status transitions so technicians can update status without
 * navigating away.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { format, isToday, parseISO } from "date-fns";
import {
  AlertCircle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  KeyRound,
  Loader2,
  LogOut,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  User,
  Wrench,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import NotificationsBell from "@/components/NotificationsDrawer";

// ─── Constants ────────────────────────────────────────────────────────────────

type JobStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "awaiting_pricing"
  | "priced"
  | "cancelled";

type Priority = "low" | "normal" | "high" | "urgent";

const STATUS_BADGE: Record<JobStatus, { label: string; className: string }> = {
  pending:          { label: "Pending",          className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  assigned:         { label: "Assigned",          className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress:      { label: "In Progress",       className: "bg-purple-100 text-purple-700 border-purple-200" },
  on_hold:          { label: "On Hold",           className: "bg-orange-100 text-orange-700 border-orange-200" },
  completed:        { label: "Completed",         className: "bg-green-100 text-green-700 border-green-200" },
  awaiting_pricing: { label: "Awaiting Pricing",  className: "bg-teal-100 text-teal-700 border-teal-200" },
  priced:           { label: "Priced",            className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled:        { label: "Cancelled",         className: "bg-red-100 text-red-700 border-red-200" },
};

const PRIORITY_DOT: Record<Priority, string> = {
  low:    "bg-gray-300",
  normal: "bg-blue-400",
  high:   "bg-orange-400",
  urgent: "bg-red-500",
};

/** Allowed status transitions a technician can trigger */
const TECH_TRANSITIONS: Partial<Record<JobStatus, { to: JobStatus; label: string; icon: React.ElementType; variant: "default" | "destructive" | "outline" }[]>> = {
  assigned:    [{ to: "in_progress", label: "Start Job",     icon: PlayCircle,   variant: "default" }],
  in_progress: [
    { to: "on_hold",   label: "Put On Hold",      icon: PauseCircle,  variant: "outline" },
    { to: "completed", label: "Mark Completed",   icon: CheckCircle2, variant: "default" },
  ],
  on_hold:     [{ to: "in_progress", label: "Resume Job",    icon: PlayCircle,   variant: "default" }],
};

type Tab = "today" | "jobs" | "profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScheduled(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "EEE dd MMM, HH:mm");
  } catch {
    return null;
  }
}

function isScheduledToday(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return isToday(d);
  } catch {
    return false;
  }
}

// ─── Job Card Row ─────────────────────────────────────────────────────────────

function JobRow({
  job,
  onAction,
  onNavigate,
}: {
  job: any;
  onAction: (job: any) => void;
  onNavigate: (id: number) => void;
}) {
  const status = job.status as JobStatus;
  const priority = job.priority as Priority;
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.assigned;
  const hasActions = !!TECH_TRANSITIONS[status];
  const scheduled = formatScheduled(job.scheduledDate);

  return (
    <div className="flex items-stretch border-b border-border last:border-0">
      {/* Priority stripe */}
      <div className={`w-1 shrink-0 rounded-l-none ${PRIORITY_DOT[priority] ?? "bg-gray-300"}`} />

      {/* Main content — tappable */}
      <button
        className="flex-1 flex items-start gap-3 px-4 py-3.5 text-left active:bg-muted/50 transition-colors min-w-0"
        onClick={() => onNavigate(job.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {job.jobNumber ?? `JC-${job.id}`}
            </span>
            {job.priority === "urgent" && (
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">URGENT</span>
            )}
          </div>
          <p className="text-sm text-foreground/80 truncate mt-0.5 leading-snug">
            {job.title ?? job.description ?? "No description"}
          </p>
          {job.clientName && (
            <p className="text-xs text-muted-foreground truncate mt-1">{job.clientName}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
              {badge.label}
            </span>
            {scheduled && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {scheduled}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
      </button>

      {/* Action button */}
      {hasActions && (
        <button
          className="px-3 flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-muted/50 transition-colors shrink-0 border-l border-border"
          onClick={(e) => { e.stopPropagation(); onAction(job); }}
          aria-label="Update status"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ─── Status Action Sheet ───────────────────────────────────────────────────────

function StatusActionSheet({
  job,
  open,
  onClose,
  onUpdated,
}: {
  job: any | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const utils = trpc.useUtils();
  const statusMutation = trpc.jobCards.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.jobCards.list.invalidate();
      onUpdated();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!job) return null;

  const status = job.status as JobStatus;
  const actions = TECH_TRANSITIONS[status] ?? [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe-or-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">
            {job.jobNumber ?? `JC-${job.id}`} — Update Status
          </SheetTitle>
          <p className="text-sm text-muted-foreground truncate">
            {job.title ?? job.description ?? ""}
          </p>
        </SheetHeader>

        <div className="space-y-2.5">
          {actions.map((action) => (
            <Button
              key={action.to}
              variant={action.variant}
              className="w-full h-12 text-base font-medium gap-2"
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({ id: job.id, status: action.to })
              }
            >
              {statusMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <action.icon className="w-4 h-4" />
              )}
              {action.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full h-11 text-muted-foreground"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab({
  jobs,
  loading,
  onAction,
  onNavigate,
}: {
  jobs: any[];
  loading: boolean;
  onAction: (job: any) => void;
  onNavigate: (id: number) => void;
}) {
  const { user } = useAuth();
  const todayJobs = useMemo(
    () => jobs.filter((j) => isScheduledToday(j.scheduledDate) || j.status === "in_progress"),
    [jobs]
  );
  const urgentJobs = useMemo(
    () => jobs.filter((j) => j.priority === "urgent" && !["completed", "cancelled", "priced"].includes(j.status)),
    [jobs]
  );

  const todayStr = format(new Date(), "EEEE, dd MMMM yyyy");

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Date header */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{todayStr}</p>
        <h2 className="text-xl font-bold text-foreground mt-0.5">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          {user?.name?.split(" ")[0] ?? "there"}
        </h2>
      </div>

      {/* Urgent alert */}
      {urgentJobs.length > 0 && (
        <div className="mx-4 mb-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {urgentJobs.length} urgent job{urgentJobs.length !== 1 ? "s" : ""} need attention
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {urgentJobs.map((j: any) => j.jobNumber ?? `JC-${j.id}`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5 px-4 mb-4">
        {[
          {
            label: "Today",
            value: todayJobs.length,
            icon: CalendarClock,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Active",
            value: jobs.filter((j) => j.status === "in_progress").length,
            icon: Wrench,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Done",
            value: jobs.filter((j) => j.status === "completed").length,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1.5`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-foreground leading-none">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today's jobs */}
      <div className="px-4 mb-2">
        <h3 className="text-sm font-semibold text-foreground">Today's Jobs</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : todayJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <CalendarClock className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No jobs scheduled for today</p>
          <p className="text-xs text-muted-foreground mt-1">
            Check the Jobs tab for all assigned work.
          </p>
        </div>
      ) : (
        <div className="mx-4 rounded-xl border border-border bg-card overflow-hidden">
          {todayJobs.map((job) => (
            <JobRow key={job.id} job={job} onAction={onAction} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {/* In-progress jobs not already shown */}
      {(() => {
        const inProgressNotToday = jobs.filter(
          (j) => j.status === "in_progress" && !isScheduledToday(j.scheduledDate)
        );
        if (inProgressNotToday.length === 0) return null;
        return (
          <>
            <div className="px-4 mt-5 mb-2">
              <h3 className="text-sm font-semibold text-foreground">In Progress</h3>
            </div>
            <div className="mx-4 rounded-xl border border-border bg-card overflow-hidden mb-4">
              {inProgressNotToday.map((job) => (
                <JobRow key={job.id} job={job} onAction={onAction} onNavigate={onNavigate} />
              ))}
            </div>
          </>
        );
      })()}

      <div className="h-6" />
    </div>
  );
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

type JobFilter = "all" | "active" | "completed";

function JobsTab({
  jobs,
  loading,
  onAction,
  onNavigate,
}: {
  jobs: any[];
  loading: boolean;
  onAction: (job: any) => void;
  onNavigate: (id: number) => void;
}) {
  const [filter, setFilter] = useState<JobFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "active")
      return jobs.filter((j) => ["assigned", "in_progress", "on_hold"].includes(j.status));
    if (filter === "completed")
      return jobs.filter((j) => ["completed", "awaiting_pricing", "priced"].includes(j.status));
    return jobs;
  }, [jobs, filter]);

  const FILTERS: { key: JobFilter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "active",    label: "Active" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Filter pills */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">No jobs here</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "active" ? "No active jobs at the moment." : "Nothing to show for this filter."}
          </p>
        </div>
      ) : (
        <div className="mx-4 mt-3 rounded-xl border border-border bg-card overflow-hidden">
          {filtered.map((job) => (
            <JobRow key={job.id} job={job} onAction={onAction} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Avatar + name */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-4 border-2 border-primary/20">
          <span className="text-2xl font-bold text-primary">{initials}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">{user?.name ?? "—"}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{user?.email ?? "—"}</p>
        <Badge className="mt-2 bg-green-100 text-green-700 border-green-200 border font-medium gap-1">
          <Wrench className="w-3 h-3" />
          Technician
        </Badge>
      </div>

      {/* Actions */}
      <div className="mx-4 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        <button
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors"
          onClick={() => setLocation("/settings/password")}
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Change Password</p>
            <p className="text-xs text-muted-foreground">Update your account password</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
        </button>

        <button
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/40 active:bg-muted/60 transition-colors"
          onClick={logout}
        >
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Sign Out</p>
            <p className="text-xs text-muted-foreground">Sign out of your account</p>
          </div>
        </button>
      </div>

      <div className="h-8" />
    </div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

function BottomNav({
  active,
  onChange,
  unreadCount,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  unreadCount: number;
}) {
  const items: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "today",   label: "Today",   icon: CalendarClock },
    { key: "jobs",    label: "Jobs",    icon: Briefcase },
    { key: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="flex border-t border-border bg-background/95 backdrop-blur pb-safe-or-0">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function TechnicianMobileApp() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [actionJob, setActionJob] = useState<any | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);


  const jobsQuery = trpc.jobCards.list.useQuery(
    { assignedTechnicianId: user?.id },
    { enabled: !!user?.id, refetchInterval: 30_000 }
  );

  const notifsQuery = trpc.notifications.list.useQuery({ unreadOnly: true });
  const unreadCount = (notifsQuery.data ?? []).length;

  const jobs = (jobsQuery.data ?? []) as any[];

  const handleAction = (job: any) => {
    setActionJob(job);
    setActionSheetOpen(true);
  };

  const handleNavigate = (id: number) => {
    setLocation(`/jobs/${id}`);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Sticky header */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-background/95 backdrop-blur shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground">Houdini</span>
        </div>
        <NotificationsBell />
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "today" && (
          <TodayTab
            jobs={jobs}
            loading={jobsQuery.isLoading}
            onAction={handleAction}
            onNavigate={handleNavigate}
          />
        )}
        {activeTab === "jobs" && (
          <JobsTab
            jobs={jobs}
            loading={jobsQuery.isLoading}
            onAction={handleAction}
            onNavigate={handleNavigate}
          />
        )}
        {activeTab === "profile" && <ProfileTab />}
      </div>

      {/* Bottom nav */}
      <BottomNav active={activeTab} onChange={setActiveTab} unreadCount={unreadCount} />

      {/* Status action sheet */}
      <StatusActionSheet
        job={actionJob}
        open={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onUpdated={() => jobsQuery.refetch()}
      />


    </div>
  );
}
