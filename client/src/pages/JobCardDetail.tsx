import { useState, useMemo, useEffect } from "react";
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
  MessageSquare,
  Send,
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

// ─── Note entry type (stored in technicianNotes as JSON array) ────────────────
type NoteEntry = {
  id: string;
  text: string;
  authorName: string;
  authorId: number;
  timestamp: string; // ISO string
};

function parseNotes(raw: string | null | undefined): NoteEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as NoteEntry[];
    // Legacy plain text — wrap it
    return [{ id: "legacy", text: raw, authorName: "System", authorId: 0, timestamp: new Date(0).toISOString() }];
  } catch {
    // Plain text fallback
    return raw.trim() ? [{ id: "legacy", text: raw, authorName: "System", authorId: 0, timestamp: new Date(0).toISOString() }] : [];
  }
}

function serializeNotes(notes: NoteEntry[]): string {
  return JSON.stringify(notes);
}

// ─── Status config ────────────────────────────────────────────────────────────
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

// Server-side allowed transitions (mirrors jobCards router)
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

// Technician-visible subset
const TECH_ALLOWED: Partial<Record<JobStatus, JobStatus[]>> = {
  assigned: ["in_progress"],
  in_progress: ["on_hold", "completed"],
  on_hold: ["in_progress"],
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
function SlotPicker({ technicianId, jobCardId, currentSlotId, onBooked }: {
  technicianId: number; jobCardId: number; currentSlotId?: number | null; onBooked: () => void;
}) {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const utils = trpc.useUtils();

  const { data: slots = [], isLoading } = trpc.scheduling.getAvailableSlots.useQuery(
    { technicianId, date }, { enabled: !!technicianId }
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
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="h-9 w-44" min={format(new Date(), "yyyy-MM-dd")} />
        {currentSlotId && (
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => releaseMutation.mutate({ slotId: currentSlotId })}
            disabled={releaseMutation.isPending}>
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
            <button key={slot.id} disabled={bookMutation.isPending}
              onClick={() => bookMutation.mutate({ slotId: slot.id, jobCardId })}
              className={`text-xs font-medium py-2 px-3 rounded-lg border transition-all hover:border-primary hover:bg-primary/5 ${
                slot.id === currentSlotId ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground"
              }`}>
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
      setAddOpen(false);
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
    quantity: "1",
    unitPrice: "0.00",
    discountPct: "0",
  });

  const resetForm = () =>
    setForm({ name: "", type: "part", description: "", quantity: "1", unitPrice: "0.00", discountPct: "0" });

  const lineTotal = useMemo(() => {
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.unitPrice) || 0;
    const disc = parseFloat(form.discountPct) || 0;
    const base = qty * price;
    return base - (base * disc) / 100;
  }, [form.quantity, form.unitPrice, form.discountPct]);

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.unitPrice);
    const disc = parseFloat(form.discountPct);
    if (isNaN(qty) || qty <= 0) return toast.error("Quantity must be a positive number");
    if (isNaN(price) || price < 0) return toast.error("Unit price must be a non-negative number");
    if (isNaN(disc) || disc < 0 || disc > 100) return toast.error("Discount must be between 0 and 100");

    const payload = { name: form.name.trim(), type: form.type, description: form.description || undefined, quantity: qty, unitPrice: price, discountPct: disc };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...payload });
    } else {
      createMutation.mutate({ jobCardId, ...payload });
    }
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name,
      type: item.type,
      description: item.description ?? "",
      quantity: String(Number(item.quantity)),
      unitPrice: Number(item.unitPrice).toFixed(2),
      discountPct: String(Number(item.discountPct ?? 0)),
    });
    setEditItem(item);
    setAddOpen(true);
  };

  const TYPE_ICONS: Record<string, React.ElementType> = {
    part: Package, service: Wrench, labour: User, other: FileText,
  };

  const s = summary as any;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Package className="w-4 h-4" /> Job Items
        </h3>
        {canEdit && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => { resetForm(); setEditItem(null); setAddOpen(true); }}>
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (items as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No items added yet.</p>
      ) : (
        <div className="space-y-2">
          {(items as any[]).map((item: any) => {
            const Icon = TYPE_ICONS[item.type] ?? FileText;
            const total = Number(item.quantity) * Number(item.unitPrice) * (1 - Number(item.discountPct ?? 0) / 100);
            return (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(item.quantity)} × R{Number(item.unitPrice).toFixed(2)}
                    {Number(item.discountPct) > 0 && ` (${item.discountPct}% off)`}
                  </p>
                </div>
                <p className="text-sm font-semibold shrink-0">R{total.toFixed(2)}</p>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(item)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600"
                      onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {s && (
        <div className="border-t pt-3 space-y-1 text-sm">
          {s.partsTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Parts</span><span>R{Number(s.partsTotal).toFixed(2)}</span></div>}
          {s.labourTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Labour</span><span>R{Number(s.labourTotal).toFixed(2)}</span></div>}
          {s.servicesTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Services</span><span>R{Number(s.servicesTotal).toFixed(2)}</span></div>}
          <div className="flex justify-between font-semibold pt-1 border-t">
            <span>Subtotal</span>
            <span>R{Number(s.grandTotal ?? s.total ?? 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Job Item"}</DialogTitle>
            <DialogDescription>Add a part, service, or labour charge to this job card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Deadbolt lock" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Price (R)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm(p => ({ ...p, unitPrice: e.target.value }))}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setForm(p => ({ ...p, unitPrice: v.toFixed(2) }));
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.discountPct}
                  onChange={(e) => setForm(p => ({ ...p, discountPct: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional detail" />
            </div>
            <div className="flex justify-between items-center pt-1 text-sm font-semibold border-t">
              <span>Line Total</span>
              <span>R{lineTotal.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
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
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Notes Panel ──────────────────────────────────────────────────────────────
function NotesPanel({ jobCardId, rawNotes, currentUser, jobStatus }: {
  jobCardId: number; rawNotes: string | null | undefined;
  currentUser: any; jobStatus: JobStatus;
}) {
  const utils = trpc.useUtils();
  const [newNote, setNewNote] = useState("");
  const isClosed = ["priced", "cancelled"].includes(jobStatus);

  const notes = useMemo(() => parseNotes(rawNotes), [rawNotes]);

  const notesMutation = trpc.jobCards.updateStatus.useMutation({
    onSuccess: () => {
      utils.jobCards.get.invalidate({ id: jobCardId });
      setNewNote("");
      toast.success("Note added");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const entry: NoteEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: newNote.trim(),
      authorName: currentUser?.name ?? currentUser?.email ?? "Unknown",
      authorId: currentUser?.id ?? 0,
      timestamp: new Date().toISOString(),
    };
    const updated = [...notes, entry];
    notesMutation.mutate({
      id: jobCardId,
      status: jobStatus,
      notes: serializeNotes(updated),
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> Technician Notes
      </h3>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {note.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{note.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {note.timestamp === new Date(0).toISOString()
                      ? "Legacy note"
                      : format(new Date(note.timestamp), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{note.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isClosed && (
        <div className="flex gap-2 pt-1">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleAddNote();
              }
            }}
          />
          <Button
            size="icon"
            className="self-end h-9 w-9 shrink-0"
            disabled={!newNote.trim() || notesMutation.isPending}
            onClick={handleAddNote}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
      {!isClosed && (
        <p className="text-xs text-muted-foreground">Press Ctrl+Enter to send</p>
      )}
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading job card…</div>;
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Job card not found.</p>
        <Button variant="outline" onClick={() => navigate("/jobs")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
        </Button>
      </div>
    );
  }

  const j = job as any;
  const status = j.status as JobStatus;
  const priority = j.priority as Priority;

  // Compute allowed transitions — filtered by role
  const serverAllowed: JobStatus[] = STATUS_TRANSITIONS[status] ?? [];
  const allowedTransitions: JobStatus[] = isManager
    ? serverAllowed
    : serverAllowed.filter((s) => (TECH_ALLOWED[status] ?? []).includes(s));

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
              onClick={() => statusMutation.mutate({ id: jobId, status: next })}
              className={next === "cancelled" ? "border-red-200 text-red-600 hover:bg-red-50" : ""}
            >
              {TRANSITION_LABELS[next] ?? next}
            </Button>
          ))}
          {allowedTransitions.length === 0 && !["priced", "cancelled"].includes(status) && (
            <span className="text-xs text-muted-foreground self-center">No transitions available</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {j.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</CardTitle>
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
                    <Calendar className="w-4 h-4" /> Schedule (45-min slots)
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                    onClick={() => setScheduleOpen(!scheduleOpen)}>
                    {scheduleOpen ? "Hide" : "Pick slot"}
                  </Button>
                </div>
              </CardHeader>
              {scheduleOpen && j.assignedTechnicianId && (
                <CardContent>
                  <SlotPicker technicianId={j.assignedTechnicianId} jobCardId={jobId}
                    currentSlotId={j.scheduledTimeSlotId} onBooked={() => setScheduleOpen(false)} />
                </CardContent>
              )}
              {scheduleOpen && !j.assignedTechnicianId && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">Assign a technician first to pick a time slot.</p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardContent className="pt-5">
              <NotesPanel
                jobCardId={jobId}
                rawNotes={j.technicianNotes}
                currentUser={user}
                jobStatus={status}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Details card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details</CardTitle>
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
                  ) : <p className="font-medium">—</p>}
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
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Technician</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{j.technicianName ?? "Unassigned"}</p>
                    {isManager && !["priced", "cancelled"].includes(status) && (
                      <button onClick={() => { setSelectedTechId(j.assignedTechnicianId ? String(j.assignedTechnicianId) : ""); setAssignOpen(true); }}
                        className="text-xs text-primary hover:underline">
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
                    {j.scheduledDate ? format(new Date(j.scheduledDate), "dd MMM yyyy, HH:mm") : "Not scheduled"}
                  </p>
                </div>
              </div>
              {/* Enquiry link */}
              {j.enquiryId && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">From Enquiry</p>
                    <Link href={`/enquiries/${j.enquiryId}`} className="font-medium text-primary hover:underline text-xs">
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
                  <Link href={`/pricing?jobCardId=${jobId}`}
                    className="text-xs text-purple-700 hover:underline font-medium flex items-center gap-1">
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
            <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
            <SelectContent>
              {(technicians as any[]).map((t: any) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name ?? t.email}{t.departmentName ? ` — ${t.departmentName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button disabled={!selectedTechId || assignMutation.isPending}
              onClick={() => assignMutation.mutate({ id: jobId, technicianId: Number(selectedTechId) })}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
