import { useState, useMemo, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; colour: string; icon: React.ElementType; kanbanBg: string; headerBg: string }
> = {
  pending: {
    label: "Pending",
    colour: "bg-slate-100 text-slate-700 border-slate-200",
    icon: CircleDot,
    kanbanBg: "bg-slate-50/80 border-slate-200",
    headerBg: "bg-slate-100 border-slate-200",
  },
  assigned: {
    label: "Assigned",
    colour: "bg-blue-100 text-blue-700 border-blue-200",
    icon: User,
    kanbanBg: "bg-blue-50/80 border-blue-200",
    headerBg: "bg-blue-100 border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    colour: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Timer,
    kanbanBg: "bg-amber-50/80 border-amber-200",
    headerBg: "bg-amber-100 border-amber-200",
  },
  on_hold: {
    label: "On Hold",
    colour: "bg-orange-100 text-orange-700 border-orange-200",
    icon: PauseCircle,
    kanbanBg: "bg-orange-50/80 border-orange-200",
    headerBg: "bg-orange-100 border-orange-200",
  },
  completed: {
    label: "Completed",
    colour: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
    kanbanBg: "bg-green-50/80 border-green-200",
    headerBg: "bg-green-100 border-green-200",
  },
  awaiting_pricing: {
    label: "Awaiting Pricing",
    colour: "bg-purple-100 text-purple-700 border-purple-200",
    icon: DollarSign,
    kanbanBg: "bg-purple-50/80 border-purple-200",
    headerBg: "bg-purple-100 border-purple-200",
  },
  priced: {
    label: "Priced",
    colour: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    kanbanBg: "bg-emerald-50/80 border-emerald-200",
    headerBg: "bg-emerald-100 border-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    colour: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    kanbanBg: "bg-red-50/80 border-red-200",
    headerBg: "bg-red-100 border-red-200",
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; colour: string }> = {
  low: { label: "Low", colour: "bg-slate-100 text-slate-600 border-slate-200" },
  normal: { label: "Normal", colour: "bg-blue-100 text-blue-600 border-blue-200" },
  high: { label: "High", colour: "bg-orange-100 text-orange-700 border-orange-200" },
  urgent: { label: "Urgent", colour: "bg-red-100 text-red-700 border-red-200" },
};

// Valid transitions (mirrors server)
const STATUS_TRANSITIONS: Record<string, JobStatus[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: ["awaiting_pricing"],
  awaiting_pricing: ["priced"],
  priced: [],
  cancelled: [],
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.colour}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.colour}`}>
      {priority === "urgent" && <AlertTriangle className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function KanbanCard({
  job,
  onStatusChange,
  isManager,
  isPending,
}: {
  job: any;
  onStatusChange: (id: number, status: JobStatus) => void;
  isManager: boolean;
  isPending: boolean;
}) {
  const [, navigate] = useLocation();
  const dragRef = useRef<HTMLDivElement>(null);

  const allowedTransitions: JobStatus[] = STATUS_TRANSITIONS[job.status] ?? [];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("jobId", String(job.id));
    e.dataTransfer.setData("jobStatus", job.status);
    e.dataTransfer.effectAllowed = "move";
    if (dragRef.current) {
      dragRef.current.style.opacity = "0.5";
    }
  };

  const handleDragEnd = () => {
    if (dragRef.current) {
      dragRef.current.style.opacity = "1";
    }
  };

  return (
    <div
      ref={dragRef}
      draggable={isManager && allowedTransitions.length > 0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`bg-white border border-border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group ${
        isManager && allowedTransitions.length > 0 ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      }`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <span className="text-xs font-mono text-muted-foreground truncate">{job.jobNumber}</span>
        <div className="flex items-center gap-1 shrink-0">
          <PriorityBadge priority={job.priority as Priority} />
          {isManager && allowedTransitions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="text-xs font-medium text-muted-foreground cursor-default"
                  disabled
                >
                  Move to…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {allowedTransitions.map((next) => {
                  const cfg = STATUS_CONFIG[next];
                  const Icon = cfg.icon;
                  return (
                    <DropdownMenuItem
                      key={next}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(job.id, next);
                      }}
                      disabled={isPending}
                      className="gap-2 text-sm"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {cfg.label}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobs/${job.id}`);
                  }}
                  className="gap-2 text-sm"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  Open details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <p
        className="text-sm font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors cursor-pointer"
        onClick={() => navigate(`/jobs/${job.id}`)}
      >
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
        {job.technicianName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3 shrink-0 text-primary/60" />
            <span className="truncate text-primary/70">{job.technicianName}</span>
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

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  status,
  jobs,
  onDrop,
  onStatusChange,
  isManager,
  isPending,
}: {
  status: JobStatus;
  jobs: any[];
  onDrop: (jobId: number, fromStatus: JobStatus, toStatus: JobStatus) => void;
  onStatusChange: (id: number, status: JobStatus) => void;
  isManager: boolean;
  isPending: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const jobId = Number(e.dataTransfer.getData("jobId"));
    const fromStatus = e.dataTransfer.getData("jobStatus") as JobStatus;
    if (!jobId || fromStatus === status) return;
    // Check if this is a valid transition
    const allowed = STATUS_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(status)) {
      toast.error(`Cannot move from "${STATUS_CONFIG[fromStatus]?.label}" to "${cfg.label}"`);
      return;
    }
    onDrop(jobId, fromStatus, status);
  };

  return (
    <div
      className={`flex-shrink-0 w-64 rounded-2xl border flex flex-col transition-all ${
        isDragOver
          ? "border-primary/60 bg-primary/5 shadow-lg scale-[1.01]"
          : cfg.kanbanBg
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-2xl border-b ${cfg.headerBg}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground bg-white/70 rounded-full px-2 py-0.5 border">
          {jobs.length}
        </span>
      </div>

      {/* Drop hint when dragging over */}
      {isDragOver && (
        <div className="mx-2 mt-2 border-2 border-dashed border-primary/40 rounded-xl h-16 flex items-center justify-center">
          <p className="text-xs text-primary/60 font-medium">Drop here</p>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 overflow-y-auto max-h-[70vh]">
        {jobs.length === 0 && !isDragOver ? (
          <p className="text-xs text-muted-foreground text-center py-6 opacity-60">No jobs</p>
        ) : (
          jobs.map((job) => (
            <KanbanCard
              key={job.id}
              job={job}
              onStatusChange={onStatusChange}
              isManager={isManager}
              isPending={isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
function KanbanBoard({
  jobs,
  onStatusChange,
  isManager,
  isPending,
}: {
  jobs: any[];
  onStatusChange: (id: number, status: JobStatus) => void;
  isManager: boolean;
  isPending: boolean;
}) {
  const handleDrop = useCallback(
    (jobId: number, _fromStatus: JobStatus, toStatus: JobStatus) => {
      onStatusChange(jobId, toStatus);
    },
    [onStatusChange]
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
      {KANBAN_COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          jobs={jobs.filter((j) => j.status === status)}
          onDrop={handleDrop}
          onStatusChange={onStatusChange}
          isManager={isManager}
          isPending={isPending}
        />
      ))}
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

  const utils = trpc.useUtils();

  const { data: jobs = [], isLoading } = trpc.jobCards.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter as JobStatus } : undefined,
    { refetchInterval: 30_000 }
  );

  const { data: departments = [] } = trpc.departments.list.useQuery();

  const statusMutation = trpc.jobCards.updateStatus.useMutation({
    onSuccess: (_, vars) => {
      const cfg = STATUS_CONFIG[vars.status as JobStatus];
      toast.success(`Moved to ${cfg?.label ?? vars.status}`);
      utils.jobCards.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleStatusChange = useCallback(
    (id: number, status: JobStatus) => {
      statusMutation.mutate({ id, status });
    },
    [statusMutation]
  );

  // Client-side filter
  const filtered = useMemo(() => {
    return (jobs as any[]).filter((j) => {
      const matchSearch =
        !search ||
        j.jobNumber?.toLowerCase().includes(search.toLowerCase()) ||
        j.title?.toLowerCase().includes(search.toLowerCase()) ||
        j.clientName?.toLowerCase().includes(search.toLowerCase());
      const matchPriority = priorityFilter === "all" || j.priority === priorityFilter;
      const matchDept = deptFilter === "all" || String(j.departmentId) === deptFilter;
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
            {isManager
              ? "Manage and track all jobs — drag cards between columns to update status"
              : "Your assigned jobs"}
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
              view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
          <button
            onClick={() => setView("table")}
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
              view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>
      </div>

      {/* Drag hint for managers on Kanban */}
      {view === "kanban" && isManager && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 border border-dashed border-muted-foreground/40 rounded" />
          Drag cards between columns to update status, or use the <MoreVertical className="w-3 h-3 inline" /> menu on each card.
        </p>
      )}

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
        <KanbanBoard
          jobs={filtered}
          onStatusChange={handleStatusChange}
          isManager={isManager}
          isPending={statusMutation.isPending}
        />
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
                  <TableHead>Technician</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Scheduled</TableHead>
                  {isManager && <TableHead className="w-32">Move to</TableHead>}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job: any) => {
                  const allowed: JobStatus[] = STATUS_TRANSITIONS[job.status] ?? [];
                  return (
                    <TableRow key={job.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {job.jobNumber}
                      </TableCell>
                      <TableCell
                        className="font-medium max-w-48 truncate cursor-pointer hover:text-primary"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        {job.title}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{job.clientName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{job.departmentName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{job.technicianName ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={job.status as JobStatus} /></TableCell>
                      <TableCell><PriorityBadge priority={job.priority as Priority} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.scheduledDate ? format(new Date(job.scheduledDate), "dd MMM yyyy") : "—"}
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          {allowed.length > 0 ? (
                            <Select
                              onValueChange={(v) => handleStatusChange(job.id, v as JobStatus)}
                              disabled={statusMutation.isPending}
                            >
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue placeholder="Move to…" />
                              </SelectTrigger>
                              <SelectContent>
                                {allowed.map((next) => (
                                  <SelectItem key={next} value={next} className="text-xs">
                                    {STATUS_CONFIG[next].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
