import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  User,
  Building2,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Package,
  Wrench,
  DollarSign,
  FileText,
  Timer,
  PauseCircle,
  CircleDot,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

// ─── Shared types / helpers ───────────────────────────────────────────────────
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

const STATUS_CONFIG: Record<JobStatus, { label: string; colour: string; icon: React.ElementType }> = {
  pending: { label: "Pending", colour: "bg-slate-100 text-slate-700 border-slate-200", icon: CircleDot },
  assigned: { label: "Assigned", colour: "bg-blue-100 text-blue-700 border-blue-200", icon: User },
  in_progress: { label: "In Progress", colour: "bg-amber-100 text-amber-700 border-amber-200", icon: Timer },
  on_hold: { label: "On Hold", colour: "bg-orange-100 text-orange-700 border-orange-200", icon: PauseCircle },
  completed: { label: "Completed", colour: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  awaiting_pricing: { label: "Awaiting Pricing", colour: "bg-purple-100 text-purple-700 border-purple-200", icon: DollarSign },
  priced: { label: "Priced", colour: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", colour: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; colour: string }> = {
  low: { label: "Low", colour: "bg-slate-100 text-slate-600 border-slate-200" },
  normal: { label: "Normal", colour: "bg-blue-100 text-blue-600 border-blue-200" },
  high: { label: "High", colour: "bg-orange-100 text-orange-700 border-orange-200" },
  urgent: { label: "Urgent", colour: "bg-red-100 text-red-700 border-red-200" },
};

// Status transitions allowed per role
const TECH_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
  assigned: ["in_progress"],
  in_progress: ["on_hold", "completed"],
  on_hold: ["in_progress"],
};
const MANAGER_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: ["awaiting_pricing"],
  awaiting_pricing: ["priced"],
};

function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border ${cfg.colour}`}>
      <Icon className="w-4 h-4" />
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

// ─── Slot Picker ──────────────────────────────────────────────────────────────
function SlotPicker({
  technicianId,
  jobCardId,
  currentSlotId,
  onBooked,
}: {
  technicianId: number;
  jobCardId: number;
  currentSlotId?: number | null;
  onBooked: () => void;
}) {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const utils = trpc.useUtils();

  const { data: slots = [], isLoading } = trpc.scheduling.getAvailableSlots.useQuery(
    { technicianId, date },
    { enabled: !!technicianId }
  );

  const bookMutation = trpc.scheduling.bookSlot.useMutation({
    onSuccess: () => {
      toast.success("Time slot booked");
      utils.jobCards.get.invalidate({ id: jobCardId });
      utils.scheduling.getAvailableSlots.invalidate();
      onBooked();
    },
    onError: (err) => toast.error(err.message),
  });

  const releaseMutation = trpc.scheduling.releaseSlot.useMutation({
    onSuccess: () => {
      toast.success("Slot released");
      utils.jobCards.get.invalidate({ id: jobCardId });
      utils.scheduling.getAvailableSlots.invalidate();
      onBooked();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-44"
          min={format(new Date(), "yyyy-MM-dd")}
        />
        {currentSlotId && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => releaseMutation.mutate({ slotId: currentSlotId })}
            disabled={releaseMutation.isPending}
          >
            Release slot
          </Button>
        )}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading slots…</p>
      ) : (slots as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground">No available slots for this date.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {(slots as any[]).map((slot: any) => (
            <button
              key={slot.id}
              disabled={bookMutation.isPending}
              onClick={() => bookMutation.mutate({ slotId: slot.id, jobCardId })}
              className={`text-xs font-medium py-2 px-3 rounded-lg border transition-all hover:border-primary hover:bg-primary/5 ${
                slot.id === currentSlotId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-foreground"
              }`}
            >
              {slot.startTime} – {slot.endTime}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Job Items Panel ──────────────────────────────────────────────────────────
function JobItemsPanel({ jobCardId, jobStatus }: { jobCardId: number; jobStatus: JobStatus }) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isClosed = ["priced", "cancelled"].includes(jobStatus);
  const canEdit = !isClosed;

  const { data: items = [], isLoading } = trpc.jobItems.list.useQuery({ jobCardId });
  const { data: summary } = trpc.jobItems.summary.useQuery({ jobCardId });

  const createMutation = trpc.jobItems.create.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      utils.jobItems.list.invalidate({ jobCardId });
      utils.jobItems.summary.invalidate({ jobCardId });
      setAddOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.jobItems.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      utils.jobItems.list.invalidate({ jobCardId });
      utils.jobItems.summary.invalidate({ jobCardId });
      setEditItem(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.jobItems.delete.useMutation({
    onSuccess: () => {
      toast.success("Item removed");
      utils.jobItems.list.invalidate({ jobCardId });
      utils.jobItems.summary.invalidate({ jobCardId });
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "",
    type: "part" as "part" | "service" | "labour" | "other",
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountPct: 0,
  });

  const resetForm = () =>
    setForm({ name: "", type: "part", description: "", quantity: 1, unitPrice: 0, discountPct: 0 });

  const lineTotal = useMemo(() => {
    const base = form.quantity * form.unitPrice;
    return base - (base * form.discountPct) / 100;
  }, [form.quantity, form.unitPrice, form.discountPct]);

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...form });
    } else {
      createMutation.mutate({ jobCardId, ...form });
    }
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name,
      type: item.type,
      description: item.description ?? "",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPct: Number(item.discountPct ?? 0),
    });
    setEditItem(item);
    setAddOpen(true);
  };

  const TYPE_ICONS: Record<string, React.ElementType> = {
    part: Package,
    service: Wrench,
    labour: User,
    other: FileText,
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Job Items
        </h3>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-8 text-xs"
            onClick={() => { resetForm(); setEditItem(null); setAddOpen(true); }}
          >
            <Plus className="w-3 h-3" />
            Add Item
          </Button>
        )}
      </div>

      {/* Items list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (items as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No items added yet.</p>
      ) : (
        <div className="space-y-2">
          {(items as any[]).map((item: any) => {
            const Icon = TYPE_ICONS[item.type] ?? FileText;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × R{Number(item.unitPrice).toFixed(2)}
                    {Number(item.discountPct) > 0 && ` (${item.discountPct}% off)`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">R{Number(item.lineTotal).toFixed(2)}</p>
                  <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                </div>
                {canEdit && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {summary && Number(summary.subtotal) > 0 && (
        <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
          {Number(summary.partsCost) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Parts</span>
              <span>R{Number(summary.partsCost).toFixed(2)}</span>
            </div>
          )}
          {Number(summary.labourCost) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Labour</span>
              <span>R{Number(summary.labourCost).toFixed(2)}</span>
            </div>
          )}
          {Number(summary.servicesCost) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Services</span>
              <span>R{Number(summary.servicesCost).toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Subtotal</span>
            <span>R{Number(summary.subtotal).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Job Item"}</DialogTitle>
            <DialogDescription>
              {editItem ? "Update the part or service details." : "Add a part, service, or labour charge to this job."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Deadbolt lock, Call-out fee"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as typeof f.type }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part">Part</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="labour">Labour</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (R)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPct}
                  onChange={(e) => setForm((f) => ({ ...f, discountPct: Number(e.target.value) }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description (optional)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Line total</span>
              <span className="text-lg font-bold text-primary">R{lineTotal.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditItem(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editItem ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the item from the job card.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────
export default function JobCardDetail() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [techNotes, setTechNotes] = useState("");
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  const { data: job, isLoading } = trpc.jobCards.get.useQuery(
    { id: jobId },
    { enabled: !!jobId, refetchInterval: 15_000 }
  );

  const { data: technicians = [] } = trpc.users.technicians.useQuery(undefined, {
    enabled: isManager,
  });

  const statusMutation = trpc.jobCards.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.jobCards.get.invalidate({ id: jobId });
      utils.jobCards.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const assignMutation = trpc.jobCards.assign.useMutation({
    onSuccess: () => {
      toast.success("Technician assigned");
      utils.jobCards.get.invalidate({ id: jobId });
      setAssignOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const notesMutation = trpc.jobCards.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Notes saved");
      utils.jobCards.get.invalidate({ id: jobId });
      setNotesOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading job card…
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Job card not found.</p>
        <Button variant="outline" onClick={() => navigate("/jobs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>
      </div>
    );
  }

  const j = job as any;
  const status = j.status as JobStatus;
  const priority = j.priority as Priority;

  // Determine allowed next transitions for current user
  const allowedTransitions: JobStatus[] = isManager
    ? (MANAGER_TRANSITIONS[status] ?? [])
    : (TECH_TRANSITIONS[status] ?? []);

  const TRANSITION_LABELS: Partial<Record<JobStatus, string>> = {
    assigned: "Mark Assigned",
    in_progress: "Start Job",
    on_hold: "Put On Hold",
    completed: "Mark Completed",
    awaiting_pricing: "Send for Pricing",
    priced: "Mark Priced",
    cancelled: "Cancel Job",
  };

  const TRANSITION_VARIANTS: Partial<Record<JobStatus, string>> = {
    in_progress: "default",
    completed: "default",
    cancelled: "destructive",
    on_hold: "outline",
    assigned: "outline",
    awaiting_pricing: "outline",
    priced: "default",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{j.title}</h1>
              <StatusBadge status={status} />
              <PriorityBadge priority={priority} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{j.jobNumber}</p>
          </div>
        </div>
        {/* Status action buttons */}
        <div className="flex gap-2 flex-wrap justify-end">
          {allowedTransitions.map((next) => (
            <Button
              key={next}
              size="sm"
              variant={(TRANSITION_VARIANTS[next] ?? "outline") as any}
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  id: jobId,
                  status: next,
                  notes: next === "completed" ? techNotes : undefined,
                })
              }
              className={next === "cancelled" ? "border-red-200 text-red-600 hover:bg-red-50" : ""}
            >
              {TRANSITION_LABELS[next] ?? next}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {j.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{j.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Job Items */}
          <Card>
            <CardContent className="pt-5">
              <JobItemsPanel jobCardId={jobId} jobStatus={status} />
            </CardContent>
          </Card>

          {/* Scheduling */}
          {isManager && !["priced", "cancelled"].includes(status) && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule (45-min slots)
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => setScheduleOpen(!scheduleOpen)}
                  >
                    {scheduleOpen ? "Hide" : "Pick slot"}
                  </Button>
                </div>
              </CardHeader>
              {scheduleOpen && j.assignedTechnicianId && (
                <CardContent>
                  <SlotPicker
                    technicianId={j.assignedTechnicianId}
                    jobCardId={jobId}
                    currentSlotId={j.scheduledTimeSlotId}
                    onBooked={() => setScheduleOpen(false)}
                  />
                </CardContent>
              )}
              {scheduleOpen && !j.assignedTechnicianId && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Assign a technician first to pick a time slot.
                  </p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Technician notes */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Technician Notes
                </CardTitle>
                {(isManager || user?.id === j.assignedTechnicianId) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setTechNotes(j.technicianNotes ?? "");
                      setNotesOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {j.technicianNotes ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{j.technicianNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Details card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* Client */}
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  {j.clientId ? (
                    <Link href={`/clients/${j.clientId}`} className="font-medium hover:text-primary transition-colors">
                      {j.clientName ?? `Client #${j.clientId}`}
                    </Link>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
              </div>
              {/* Department */}
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-medium">{j.departmentName ?? "—"}</p>
                </div>
              </div>
              {/* Technician */}
              <div className="flex items-start gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Technician</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {j.technicianName ?? <span className="text-muted-foreground italic">Unassigned</span>}
                    </p>
                    {isManager && !["priced", "cancelled"].includes(status) && (
                      <button
                        onClick={() => {
                          setSelectedTechId(j.assignedTechnicianId ? String(j.assignedTechnicianId) : "");
                          setAssignOpen(true);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {j.assignedTechnicianId ? "Change" : "Assign"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Scheduled */}
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {j.scheduledDate
                      ? format(new Date(j.scheduledDate), "dd MMM yyyy, HH:mm")
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
              {/* Enquiry link */}
              {j.enquiryId && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">From Enquiry</p>
                    <Link
                      href={`/enquiries/${j.enquiryId}`}
                      className="font-medium text-primary hover:underline text-xs"
                    >
                      View enquiry →
                    </Link>
                  </div>
                </div>
              )}
              <Separator />
              {/* Timestamps */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{j.createdAt ? format(new Date(j.createdAt), "dd MMM yyyy") : "—"}</span>
                </div>
                {j.startedAt && (
                  <div className="flex justify-between">
                    <span>Started</span>
                    <span>{format(new Date(j.startedAt), "dd MMM yyyy, HH:mm")}</span>
                  </div>
                )}
                {j.completedAt && (
                  <div className="flex justify-between">
                    <span>Completed</span>
                    <span>{format(new Date(j.completedAt), "dd MMM yyyy, HH:mm")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Signature required notice */}
          {j.requiresSignature && !["priced", "cancelled"].includes(status) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Signature Required</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      A client signature must be captured before this job can be marked as completed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing link */}
          {["awaiting_pricing", "priced"].includes(status) && isManager && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <p className="text-sm font-semibold text-purple-800">
                      {status === "priced" ? "Job Priced" : "Awaiting Pricing"}
                    </p>
                  </div>
                  <Link
                    href={`/pricing?jobCardId=${jobId}`}
                    className="text-xs text-purple-700 hover:underline font-medium flex items-center gap-1"
                  >
                    Pricing <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Assign technician dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
            <DialogDescription>Select a technician to assign to this job card.</DialogDescription>
          </DialogHeader>
          <Select value={selectedTechId} onValueChange={setSelectedTechId}>
            <SelectTrigger>
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              {(technicians as any[]).map((t: any) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name ?? t.email}
                  {t.departmentName ? ` — ${t.departmentName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedTechId || assignMutation.isPending}
              onClick={() =>
                assignMutation.mutate({
                  id: jobId,
                  technicianId: Number(selectedTechId),
                })
              }
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Technician Notes</DialogTitle>
            <DialogDescription>Add or update notes for this job card.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={techNotes}
            onChange={(e) => setTechNotes(e.target.value)}
            placeholder="Enter notes about the job…"
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={notesMutation.isPending}
              onClick={() =>
                notesMutation.mutate({
                  id: jobId,
                  status: status,
                  notes: techNotes,
                })
              }
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
