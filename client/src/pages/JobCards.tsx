import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Plus,
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  Clock,
  User,
  Building2,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Timer,
  PauseCircle,
  DollarSign,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; colour: string; icon: React.ElementType; kanbanBg: string }
> = {
  pending: {
    label: "Pending",
    colour: "bg-slate-100 text-slate-700 border-slate-200",
    icon: CircleDot,
    kanbanBg: "bg-slate-50 border-slate-200",
  },
  assigned: {
    label: "Assigned",
    colour: "bg-blue-100 text-blue-700 border-blue-200",
    icon: User,
    kanbanBg: "bg-blue-50 border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    colour: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Timer,
    kanbanBg: "bg-amber-50 border-amber-200",
  },
  on_hold: {
    label: "On Hold",
    colour: "bg-orange-100 text-orange-700 border-orange-200",
    icon: PauseCircle,
    kanbanBg: "bg-orange-50 border-orange-200",
  },
  completed: {
    label: "Completed",
    colour: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
    kanbanBg: "bg-green-50 border-green-200",
  },
  awaiting_pricing: {
    label: "Awaiting Pricing",
    colour: "bg-purple-100 text-purple-700 border-purple-200",
    icon: DollarSign,
    kanbanBg: "bg-purple-50 border-purple-200",
  },
  priced: {
    label: "Priced",
    colour: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    kanbanBg: "bg-emerald-50 border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    colour: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    kanbanBg: "bg-red-50 border-red-200",
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; colour: string }> = {
  low: { label: "Low", colour: "bg-slate-100 text-slate-600 border-slate-200" },
  normal: { label: "Normal", colour: "bg-blue-100 text-blue-600 border-blue-200" },
  high: { label: "High", colour: "bg-orange-100 text-orange-700 border-orange-200" },
  urgent: { label: "Urgent", colour: "bg-red-100 text-red-700 border-red-200" },
};

// Kanban columns (excluding cancelled from main board)
const KANBAN_COLUMNS: JobStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "on_hold",
  "awaiting_pricing",
  "priced",
];

function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.colour}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.colour}`}
    >
      {priority === "urgent" && <AlertTriangle className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({ job }: { job: any }) {
  const [, navigate] = useLocation();
  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="bg-white border border-border rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-muted-foreground">{job.jobNumber}</span>
        <PriorityBadge priority={job.priority as Priority} />
      </div>
      <p className="text-sm font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
        {job.title}
      </p>
      <div className="flex flex-col gap-1">
        {job.clientName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{job.clientName}</span>
          </div>
        )}
        {job.departmentName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{job.departmentName}</span>
          </div>
        )}
        {job.scheduledDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{format(new Date(job.scheduledDate), "dd MMM, HH:mm")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
function KanbanBoard({ jobs }: { jobs: any[] }) {
  const columns = KANBAN_COLUMNS.map((status) => ({
    status,
    cfg: STATUS_CONFIG[status],
    jobs: jobs.filter((j) => j.status === status),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
      {columns.map(({ status, cfg, jobs: colJobs }) => {
        const Icon = cfg.icon;
        return (
          <div
            key={status}
            className={`flex-shrink-0 w-64 rounded-2xl border ${cfg.kanbanBg} flex flex-col`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-inherit">
              <div className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-white/70 rounded-full px-2 py-0.5 border">
                {colJobs.length}
              </span>
            </div>
            {/* Cards */}
            <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[70vh]">
              {colJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 opacity-60">
                  No jobs
                </p>
              ) : (
                colJobs.map((job) => <KanbanCard key={job.id} job={job} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JobCards() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [view, setView] = useState<"table" | "kanban">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;

  const { data: jobs = [], isLoading } = trpc.jobCards.list.useQuery(
    statusFilter !== "all"
      ? { status: statusFilter as JobStatus }
      : undefined,
    { refetchInterval: 30_000 }
  );

  const { data: departments = [] } = trpc.departments.list.useQuery();

  // Client-side filter for search, priority, dept
  const filtered = useMemo(() => {
    return (jobs as any[]).filter((j) => {
      const matchSearch =
        !search ||
        j.jobNumber?.toLowerCase().includes(search.toLowerCase()) ||
        j.title?.toLowerCase().includes(search.toLowerCase()) ||
        j.clientName?.toLowerCase().includes(search.toLowerCase());
      const matchPriority = priorityFilter === "all" || j.priority === priorityFilter;
      const matchDept =
        deptFilter === "all" || String(j.departmentId) === deptFilter;
      return matchSearch && matchPriority && matchDept;
    });
  }, [jobs, search, priorityFilter, deptFilter]);

  const stats = useMemo(() => {
    const all = jobs as any[];
    return {
      total: all.length,
      pending: all.filter((j) => j.status === "pending").length,
      inProgress: all.filter((j) => j.status === "in_progress").length,
      urgent: all.filter((j) => j.priority === "urgent").length,
      awaitingPricing: all.filter((j) => j.status === "awaiting_pricing").length,
    };
  }, [jobs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Job Cards
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isManager ? "Manage and track all jobs across departments" : "Your assigned jobs"}
          </p>
        </div>
        {isManager && (
          <Button onClick={() => navigate("/jobs/new")} className="gap-2">
            <Plus className="w-4 h-4" />
            New Job Card
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, colour: "text-foreground" },
          { label: "Pending", value: stats.pending, colour: "text-slate-600" },
          { label: "In Progress", value: stats.inProgress, colour: "text-amber-600" },
          { label: "Urgent", value: stats.urgent, colour: "text-red-600" },
          { label: "Awaiting Pricing", value: stats.awaitingPricing, colour: "text-purple-600" },
        ].map((s) => (
          <Card key={s.label} className="py-3">
            <CardContent className="px-4 py-0">
              <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search job number, title, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_CONFIG) as JobStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {(departments as any[]).map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* View toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
              view === "kanban"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
              view === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading job cards…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">No job cards found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isManager ? "Create your first job card to get started." : "No jobs assigned to you yet."}
              </p>
            </div>
            {isManager && (
              <Button onClick={() => navigate("/jobs/new")} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Job Card
              </Button>
            )}
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <KanbanBoard jobs={filtered} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Job #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job: any) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {job.jobNumber}
                    </TableCell>
                    <TableCell className="font-medium max-w-48 truncate">{job.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.clientName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.departmentName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status as JobStatus} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={job.priority as Priority} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.scheduledDate
                        ? format(new Date(job.scheduledDate), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
