import React, { useState, useMemo, useEffect, useRef } from "react";
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
  PenLine,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  MapPin,
  Navigation,
  Camera,
  X as XIcon,
  Zap,
  FileDown,
  Loader2,
} from "lucide-react";

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
function SlotPicker({
  technicianId: initialTechnicianId,
  jobCardId,
  currentSlotId,
  onBooked,
  departmentId,
  departmentName,
}: {
  technicianId: number;
  jobCardId: number;
  currentSlotId?: number | null;
  onBooked: () => void;
  departmentId?: number;
  departmentName?: string;
}) {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  // Allow browsing slots for any dept technician; default to the assigned one
  const [selectedTechId, setSelectedTechId] = useState<number>(initialTechnicianId);
  const utils = trpc.useUtils();

  // Fetch technicians in this department for the selector
  const { data: deptTechnicians = [] } = trpc.users.technicians.useQuery(
    departmentId ? { departmentId } : undefined,
    { enabled: !!departmentId }
  );

  const technicianId = selectedTechId || initialTechnicianId;

  const { data: slots = [], isLoading } = trpc.scheduling.getAvailableSlots.useQuery(
    { technicianId, date }, { enabled: !!technicianId }
  );

  // Conflict detection: fetch already-booked slots for this technician on the selected date
  const { data: bookedSlots = [] } = trpc.scheduling.getBookingsForDate.useQuery(
    { technicianId, date },
    { enabled: !!technicianId && !!date }
  );
  // Exclude the current job's own slot from conflicts
  const conflicts = (bookedSlots as any[]).filter(
    (s: any) => s.jobCardId !== jobCardId
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
      {/* Technician selector — filtered by department */}
      {departmentId && (deptTechnicians as any[]).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">
            {departmentName ? `Technicians — ${departmentName}` : "Technician"}
          </p>
          <Select
            value={String(selectedTechId)}
            onValueChange={(v) => setSelectedTechId(Number(v))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select technician" />
            </SelectTrigger>
            <SelectContent>
              {(deptTechnicians as any[]).map((t: any) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name ?? t.email}
                  {t.id === initialTechnicianId ? " (assigned)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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

      {/* Conflict warning banner */}
      {conflicts.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">
              {conflicts.length === 1
                ? "1 existing booking on this date"
                : `${conflicts.length} existing bookings on this date`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Booked slots:{" "}
              {conflicts.map((c: any, i: number) => (
                <span key={c.id}>
                  {c.startTime}–{c.endTime}
                  {c.jobCardId ? (
                    <span className="font-medium"> (JC #{c.jobCardId})</span>
                  ) : null}
                  {i < conflicts.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

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

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name,
      type: item.type,
      description: item.description ?? "",
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      discountPct: String(item.discountPct ?? 0),
    });
    setAddOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      jobCardId,
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      quantity: parseFloat(form.quantity) || 1,
      unitPrice: parseFloat(form.unitPrice) || 0,
      discountPct: parseFloat(form.discountPct) || 0,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Quick-add catalogue — live from database
  const { data: catalogueItems = [] } = trpc.catalogue.list.useQuery({ activeOnly: true });
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [cataloguePrices, setCataloguePrices] = useState<Record<number, string>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  // Per-item quantity (keyed by catalogue item id)
  const [catalogueQtys, setCatalogueQtys] = useState<Record<number, number>>({});

  const getQty = (item: any): number => catalogueQtys[item.id] ?? 1;
  const setQty = (id: number, val: number, isLabour: boolean) => {
    const step = isLabour ? 0.5 : 1;
    const min  = isLabour ? 0.5 : 1;
    const clamped = Math.max(min, Math.round(val / step) * step);
    setCatalogueQtys((q) => ({ ...q, [id]: clamped }));
  };

  // Group items by type, preserving sort order within each group
  const catalogueByType = useMemo(() => {
    const order = ["service", "labour", "part", "other"] as const;
    const groups: Record<string, any[]> = { service: [], labour: [], part: [], other: [] };
    (catalogueItems as any[]).forEach((item: any) => {
      const key = item.type in groups ? item.type : "other";
      groups[key].push(item);
    });
    return order.filter((t) => groups[t].length > 0).map((t) => ({ type: t, items: groups[t] }));
  }, [catalogueItems]);

  const TYPE_GROUP_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    service: { label: "Services", icon: Wrench,   color: "text-green-600" },
    labour:  { label: "Labour",   icon: Timer,    color: "text-orange-600" },
    part:    { label: "Parts",    icon: Package,  color: "text-blue-600" },
    other:   { label: "Other",    icon: FileText, color: "text-gray-500" },
  };

  // Initialise editable prices when catalogue loads
  const cataloguePricesRef = useMemo(() => {
    const map: Record<number, string> = {};
    (catalogueItems as any[]).forEach((c: any) => {
      if (!(c.id in cataloguePrices)) map[c.id] = parseFloat(c.defaultPrice).toFixed(2);
    });
    return map;
  }, [catalogueItems]);

  const getCataloguePrice = (item: any): number =>
    parseFloat(cataloguePrices[item.id] ?? cataloguePricesRef[item.id] ?? item.defaultPrice) || 0;

  const handleQuickAdd = (item: any) => {
    const price = getCataloguePrice(item);
    const qty   = getQty(item);
    createMutation.mutate(
      {
        jobCardId,
        name: item.name,
        type: item.type,
        description: item.description ?? undefined,
        quantity: qty,
        unitPrice: price,
        discountPct: 0,
      },
      {
        onSuccess: () => {
          // Reset quantity back to 1 after adding
          setCatalogueQtys((q) => ({ ...q, [item.id]: 1 }));
        },
      }
    );
  };

  const TYPE_ICONS: Record<string, React.ElementType> = {
    part: Package,
    service: Wrench,
    labour: Timer,
    other: FileText,
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Package className="w-4 h-4" /> Job Items
        </h3>
        {canEdit && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => setCatalogueOpen(!catalogueOpen)}>
              <Zap className="w-3 h-3" /> Quick-add
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => { resetForm(); setEditItem(null); setAddOpen(true); }}>
              <Plus className="w-3 h-3" /> Custom
            </Button>
          </div>
        )}
      </div>
      {/* Quick-add catalogue */}
      {canEdit && catalogueOpen && (
        <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Quick-add Pricing Catalogue
          </p>
          {catalogueByType.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No active catalogue items. Ask an admin to add items in Settings → Pricing Catalogue.
            </p>
          ) : (
            <div className="space-y-3">
              {catalogueByType.map(({ type, items: groupItems }) => {
                const meta = TYPE_GROUP_META[type] ?? TYPE_GROUP_META.other;
                const GroupIcon = meta.icon;
                const isCollapsed = collapsedGroups[type] ?? false;
                return (
                  <div key={type}>
                    {/* Group header */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-1.5 mb-1.5 group"
                      onClick={() => setCollapsedGroups((s) => ({ ...s, [type]: !isCollapsed }))}
                    >
                      <GroupIcon className={`w-3 h-3 ${meta.color}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({groupItems.length})</span>
                      <span className="ml-auto text-muted-foreground text-[10px]">
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                    </button>
                    {/* Group items */}
                    {!isCollapsed && (
                      <div className="space-y-1.5 pl-1">
                        {groupItems.map((item: any) => {
                          const isLabour = item.type === "labour";
                          const qty = getQty(item);
                          const step = isLabour ? 0.5 : 1;
                          return (
                            <div key={item.id} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{item.name}</p>
                                {item.description && (
                                  <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Quantity spinner */}
                                <div className="flex items-center border rounded-md overflow-hidden h-7">
                                  <button
                                    type="button"
                                    className="px-1.5 text-muted-foreground hover:bg-muted transition-colors text-xs h-full"
                                    onClick={() => setQty(item.id, qty - step, isLabour)}
                                    disabled={qty <= (isLabour ? 0.5 : 1)}
                                  >−</button>
                                  <span className="px-1.5 text-xs font-medium min-w-[2rem] text-center tabular-nums">
                                    {qty % 1 === 0 ? qty : qty.toFixed(1)}
                                  </span>
                                  <button
                                    type="button"
                                    className="px-1.5 text-muted-foreground hover:bg-muted transition-colors text-xs h-full"
                                    onClick={() => setQty(item.id, qty + step, isLabour)}
                                  >+</button>
                                </div>
                                {/* Price input */}
                                <span className="text-xs text-muted-foreground">R</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={cataloguePrices[item.id] ?? cataloguePricesRef[item.id] ?? parseFloat(item.defaultPrice).toFixed(2)}
                                  onChange={(e) => setCataloguePrices((p) => ({ ...p, [item.id]: e.target.value }))}
                                  className="h-7 w-20 text-xs"
                                />
                                {/* Live line total */}
                                <span className="text-xs font-semibold text-foreground tabular-nums min-w-[4rem] text-right">
                                  R {(qty * getCataloguePrice(item)).toFixed(2)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  disabled={createMutation.isPending}
                                  onClick={() => handleQuickAdd(item)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (items as any[]).length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No items added yet.</p>
      ) : (
        <div className="space-y-2">
          {(items as any[]).map((item: any) => {
            const Icon = TYPE_ICONS[item.type] ?? FileText;
            return (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">
                        R {(item.lineTotal ?? 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × R {parseFloat(item.unitPrice).toFixed(2)}
                        {item.discountPct > 0 && ` (${item.discountPct}% off)`}
                      </p>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(item)}
                      className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(item.id)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
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
      {(summary as any)?.itemCount > 0 && (
        <div className="flex justify-between items-center pt-2 border-t text-sm">
          <span className="text-muted-foreground">{(summary as any).itemCount} item(s)</span>
          <span className="font-semibold">Subtotal: R {parseFloat((summary as any).subtotal ?? "0").toFixed(2)}</span>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setEditItem(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
            <DialogDescription>Fill in the details for this job item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Deadbolt lock" />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part">Part</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="labour">Labour</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" min="0.01" step="0.01" value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Unit Price (R)</Label>
                <Input type="number" min="0" step="0.01" value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Discount %</Label>
                <Input type="number" min="0" max="100" step="0.1" value={form.discountPct}
                  onChange={(e) => setForm({ ...form, discountPct: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional details" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t text-sm">
              <span className="text-muted-foreground">Line total</span>
              <span className="font-semibold">R {lineTotal.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}>
              {editItem ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this item from the job card.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────
function NoteThread({ notes, isClosed, onAdd, isPending }: {
  notes: NoteEntry[];
  isClosed: boolean;
  onAdd: (text: string) => void;
  isPending: boolean;
}) {
  const [newNote, setNewNote] = useState("");
  const handleSend = () => {
    if (!newNote.trim()) return;
    onAdd(newNote.trim());
    setNewNote("");
  };
  return (
    <div className="space-y-3">
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
        <>
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
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              className="self-end h-9 w-9 shrink-0"
              disabled={!newNote.trim() || isPending}
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Press Ctrl+Enter to send</p>
        </>
      )}
    </div>
  );
}

function NotesPanel({ jobCardId, rawTechNotes, rawManagerNotes, currentUser, jobStatus, isManager }: {
  jobCardId: number;
  rawTechNotes: string | null | undefined;
  rawManagerNotes: string | null | undefined;
  currentUser: any;
  jobStatus: JobStatus;
  isManager: boolean;
}) {
  const utils = trpc.useUtils();
  const isClosed = ["priced", "cancelled"].includes(jobStatus);
  const techNotes = useMemo(() => parseNotes(rawTechNotes), [rawTechNotes]);
  const managerNotes = useMemo(() => parseNotes(rawManagerNotes), [rawManagerNotes]);

  const notesMutation = trpc.jobCards.updateNotes.useMutation({
    onSuccess: () => {
      utils.jobCards.get.invalidate({ id: jobCardId });
      toast.success("Note saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const makeEntry = (text: string): NoteEntry => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    authorName: currentUser?.name ?? currentUser?.email ?? "Unknown",
    authorId: currentUser?.id ?? 0,
    timestamp: new Date().toISOString(),
  });

  const handleAddTechNote = (text: string) => {
    const updated = [...techNotes, makeEntry(text)];
    notesMutation.mutate({ id: jobCardId, technicianNotes: serializeNotes(updated) });
  };

  const handleAddManagerNote = (text: string) => {
    const updated = [...managerNotes, makeEntry(text)];
    notesMutation.mutate({ id: jobCardId, managerNotes: serializeNotes(updated) });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> Notes
      </h3>
      {isManager ? (
        <Tabs defaultValue="tech">
          <TabsList className="h-8">
            <TabsTrigger value="tech" className="text-xs h-7">
              Technician {techNotes.length > 0 && <span className="ml-1 opacity-60">({techNotes.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="manager" className="text-xs h-7">
              Manager {managerNotes.length > 0 && <span className="ml-1 opacity-60">({managerNotes.length})</span>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tech" className="mt-3">
            <NoteThread notes={techNotes} isClosed={isClosed} onAdd={handleAddTechNote} isPending={notesMutation.isPending} />
          </TabsContent>
          <TabsContent value="manager" className="mt-3">
            <NoteThread notes={managerNotes} isClosed={isClosed} onAdd={handleAddManagerNote} isPending={notesMutation.isPending} />
          </TabsContent>
        </Tabs>
      ) : (
        <NoteThread notes={techNotes} isClosed={isClosed} onAdd={handleAddTechNote} isPending={notesMutation.isPending} />
      )}
    </div>
  );
}
// ─── Photos Panel ─────────────────────────────────────────────────────────────
const PHOTO_CATEGORIES = [
  { value: "photo", label: "Photo" },
  { value: "before_image", label: "Before" },
  { value: "after_image", label: "After" },
  { value: "document", label: "Document" },
] as const;

function PhotosPanel({ jobCardId, jobStatus }: { jobCardId: number; jobStatus: JobStatus }) {
  const utils = trpc.useUtils();
  const isClosed = ["priced", "cancelled"].includes(jobStatus);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [category, setCategory] = useState<"photo" | "before_image" | "after_image" | "document">("photo");

  const { data: photos = [] } = trpc.documents.list.useQuery(
    { jobCardId },
    { refetchOnWindowFocus: false }
  );

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate({ jobCardId });
      toast.success("Photo uploaded");
      setUploading(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setUploading(false);
    },
  });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate({ jobCardId });
      toast.success("Photo removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploading(true);
      uploadMutation.mutate({
        jobCardId,
        category,
        fileName: file.name,
        fileDataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const imagePhotos = (photos as any[]).filter((p: any) =>
    ["photo", "before_image", "after_image"].includes(p.category) &&
    (p.mimeType?.startsWith("image/") ?? true)
  );
  const docPhotos = (photos as any[]).filter((p: any) =>
    p.category === "document" || !p.mimeType?.startsWith("image/")
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Camera className="w-4 h-4" /> Photos &amp; Documents
        </h3>
        {!isClosed && (
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-3 h-3" />
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {imagePhotos.length === 0 && docPhotos.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No photos or documents uploaded yet.</p>
      ) : (
        <>
          {imagePhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imagePhotos.map((photo: any) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
                  <img
                    src={photo.fileUrl}
                    alt={photo.fileName}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightbox(photo.fileUrl)}
                  />
                  <div className="absolute top-1 left-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-white capitalize">
                      {photo.category.replace("_", " ")}
                    </span>
                  </div>
                  {!isClosed && (
                    <button
                      onClick={() => deleteMutation.mutate({ id: photo.id })}
                      className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {docPhotos.length > 0 && (
            <div className="space-y-1.5">
              {docPhotos.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 truncate text-primary hover:underline">
                    {doc.fileName}
                  </a>
                  {!isClosed && (
                    <button onClick={() => deleteMutation.mutate({ id: doc.id })}
                      className="text-muted-foreground hover:text-red-600 transition-colors">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-8 right-0 text-white/80 hover:text-white"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <img src={lightbox} alt="Full size" className="w-full rounded-lg max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Signature Section ─────────────────────────────────────────────────────────────
function SignatureSection({ jobCardId, jobStatus, requiresSignature, isSigned }: {
  jobCardId: number;
  jobStatus: JobStatus;
  requiresSignature: boolean;
  isSigned: boolean;
}) {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const sigPadRef = useRef<SignaturePadHandle>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [padEmpty, setPadEmpty] = useState(true);
  // Preview confirmation state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  // Re-sign mode: uses signatures.replace instead of signatures.capture
  const [isResigning, setIsResigning] = useState(false);

  const { data: existingSig } = trpc.signatures.getByJobCard.useQuery(
    { jobCardId },
    { enabled: isSigned }
  );

  const captureMutation = trpc.signatures.capture.useMutation({
    onSuccess: () => {
      toast.success("Signature captured successfully");
      utils.jobCards.get.invalidate({ id: jobCardId });
      utils.signatures.getByJobCard.invalidate({ jobCardId });
      setPreviewOpen(false);
      setCaptureOpen(false);
      setPreviewDataUrl(null);
      setIsResigning(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const replaceMutation = trpc.signatures.replace.useMutation({
    onSuccess: () => {
      toast.success("Signature replaced successfully");
      utils.jobCards.get.invalidate({ id: jobCardId });
      utils.signatures.getByJobCard.invalidate({ jobCardId });
      setPreviewOpen(false);
      setCaptureOpen(false);
      setPreviewDataUrl(null);
      setIsResigning(false);
    },
    onError: (err) => toast.error(err.message),
  });

  /** Step 1 — called when the user clicks "Submit Signature" in the draw dialog.
   *  Captures the canvas data URL and opens the preview confirmation dialog. */
  const handlePreview = () => {
    const dataUrl = sigPadRef.current?.getDataUrl();
    if (!dataUrl) {
      toast.error("Please draw a signature first");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Please enter the signer's name");
      return;
    }
    setPreviewDataUrl(dataUrl);
    setPreviewOpen(true);
  };

  /** Step 2 — called when the user confirms the preview and triggers the upload. */
  const handleConfirmUpload = () => {
    if (!previewDataUrl || !signerName.trim()) return;
    const payload = {
      jobCardId,
      signatureDataUrl: previewDataUrl,
      signerName: signerName.trim(),
      signerRole: signerRole.trim() || undefined,
      ipAddress: undefined,
    };
    if (isResigning) {
      replaceMutation.mutate(payload);
    } else {
      captureMutation.mutate(payload);
    }
  };

  /** Re-draw — close the preview and return to the canvas. */
  const handleRedraw = () => {
    setPreviewOpen(false);
    setPreviewDataUrl(null);
    // Re-open the draw dialog (it stays mounted)
  };

  const handleOpenCapture = () => {
    setSignerName("");
    setSignerRole("");
    setPadEmpty(true);
    setPreviewDataUrl(null);
    setPreviewOpen(false);
    setCaptureOpen(true);
  };

  const isClosed = ["priced", "cancelled"].includes(jobStatus);

  // Show the section if:
  // 1. Signature is required (always show status)
  // 2. Job is signed (show existing signature)
  // 3. Job is in a signable state (in_progress, completed, awaiting_pricing)
  const signableStatuses: JobStatus[] = ["in_progress", "on_hold", "completed", "awaiting_pricing"];
  const canCapture = !isSigned && signableStatuses.includes(jobStatus);

  if (!requiresSignature && !isSigned) return null;

  return (
    <>
      <Card className={isSigned
        ? "border-green-200 bg-green-50"
        : "border-amber-200 bg-amber-50"
      }>
        <CardContent className="pt-4 pb-4">
          {isSigned ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-sm font-semibold text-green-800">Signature Captured</p>
              </div>
              {existingSig && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-green-200 bg-white overflow-hidden">
                    <img
                      src={(existingSig as any).signatureUrl}
                      alt="Client signature"
                      className="w-full h-28 object-contain p-2"
                    />
                  </div>
                  <div className="text-xs text-green-700 space-y-0.5">
                    <p><span className="font-medium">Signed by:</span> {(existingSig as any).signerName}</p>
                    {(existingSig as any).signerRole && (
                      <p><span className="font-medium">Role:</span> {(existingSig as any).signerRole}</p>
                    )}
                    {(existingSig as any).signedAt && (
                      <p><span className="font-medium">Date:</span> {format(new Date((existingSig as any).signedAt), "dd MMM yyyy, HH:mm")}</p>
                    )}
                  </div>
                  {isManager && !isClosed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-green-300 text-green-800 hover:bg-green-100 gap-2 mt-1"
                      onClick={() => {
                        setIsResigning(true);
                        handleOpenCapture();
                      }}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      Re-sign (Replace Signature)
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Signature Required</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    A client signature must be captured before this job can be marked as completed.
                  </p>
                </div>
              </div>
              {canCapture && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 gap-2 mt-1"
                  onClick={handleOpenCapture}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Capture Signature
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capture dialog */}
      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-4 h-4" /> Capture Client Signature
            </DialogTitle>
            <DialogDescription>
              Have the client sign below to confirm the work has been completed to their satisfaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Signer Name *</Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Full name of the person signing"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Signer Role / Title</Label>
                <Input
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="e.g. Property Owner, Manager (optional)"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Signature *</Label>
              <SignaturePad
                ref={sigPadRef}
                onChange={(isEmpty) => setPadEmpty(isEmpty)}
                disabled={captureMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCaptureOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={padEmpty || !signerName.trim()}
              onClick={handlePreview}
              className="gap-2"
            >
              <PenLine className="w-4 h-4" />
              Review Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview / confirmation dialog */}
      <Dialog open={previewOpen} onOpenChange={(o) => { if (!o && !captureMutation.isPending) handleRedraw(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" /> Confirm Signature
            </DialogTitle>
            <DialogDescription>
              Please review the signature below. If it looks correct, click <strong>Confirm &amp; Upload</strong> to save it. Otherwise click <strong>Re-draw</strong> to try again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Signature preview */}
            <div className="rounded-xl border-2 border-dashed border-muted bg-white overflow-hidden">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt="Signature preview"
                  className="w-full h-40 object-contain p-3"
                />
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  No signature captured
                </div>
              )}
            </div>

            {/* Signer details recap */}
            <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signed by</span>
                <span className="font-medium text-foreground">{signerName}</span>
              </div>
              {signerRole && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium text-foreground">{signerRole}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date &amp; time</span>
                <span className="font-medium text-foreground">{format(new Date(), "dd MMM yyyy, HH:mm")}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleRedraw}
              disabled={captureMutation.isPending}
              className="gap-2"
            >
              <PenLine className="w-4 h-4" />
              Re-draw
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={captureMutation.isPending || !previewDataUrl}
              className="gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {captureMutation.isPending ? "Uploading…" : "Confirm & Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

  // Filter technicians by the job card's department once the job is loaded
  const deptId = (job as any)?.departmentId as number | undefined;
  const { data: technicians = [] } = trpc.users.technicians.useQuery(
    deptId ? { departmentId: deptId } : undefined,
    { enabled: isManager && !!deptId }
  );

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

  // ── Client portal link ──────────────────────────────────────────────────────
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);
  const portalLinkQuery = trpc.clientPortal.getLink.useQuery(
    { jobCardId: jobId },
    { enabled: isManager }
  );
  const generatePortalLink = trpc.clientPortal.generateLink.useMutation({
    onSuccess: ({ url }) => {
      navigator.clipboard.writeText(url).then(() => {
        setPortalLinkCopied(true);
        setTimeout(() => setPortalLinkCopied(false), 2500);
      });
      toast.success("Client portal link copied to clipboard");
      utils.clientPortal.getLink.invalidate({ jobCardId: jobId });
    },
    onError: (err) => toast.error(`Failed to generate link: ${err.message}`),
  });

  const pdfMutation = trpc.jobCards.generatePdf.useMutation({
    onSuccess: ({ url, jobNumber }) => {
      // Open the PDF in a new tab for download
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(`PDF generated for ${jobNumber}`);
    },
    onError: (err) => toast.error(`PDF generation failed: ${err.message}`),
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
  const requiresSignature = !!j.requiresSignature;
  const isSigned = !!j.isSigned;

  // Compute allowed transitions — filtered by role
  const serverAllowed: JobStatus[] = STATUS_TRANSITIONS[status] ?? [];

  // Block "completed" if signature is required but not yet captured
  const signatureBlocked = requiresSignature && !isSigned && status === "in_progress";

  const allowedTransitions: JobStatus[] = (isManager
    ? serverAllowed
    : serverAllowed.filter((s) => (TECH_ALLOWED[status] ?? []).includes(s))
  ).filter((s) => {
    // Block moving to "completed" if signature is required and not captured
    if (s === "completed" && signatureBlocked) return false;
    return true;
  });

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
              {isSigned && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-200">
                  <ShieldCheck className="w-3 h-3" /> Signed
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{j.jobNumber}</p>
          </div>
        </div>
        {/* Status action buttons */}
        <div className="flex gap-2 flex-wrap justify-end">
          {/* Share client portal link (managers only) */}
          {isManager && (
            <Button
              size="sm"
              variant="outline"
              disabled={generatePortalLink.isPending}
              onClick={() =>
                generatePortalLink.mutate({
                  jobCardId: jobId,
                  origin: window.location.origin,
                })
              }
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              {generatePortalLink.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : portalLinkCopied ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {portalLinkCopied
                ? "Link Copied!"
                : portalLinkQuery.data
                ? "Refresh & Copy Link"
                : "Share Client Link"}
            </Button>
          )}
          {/* Download PDF */}
          <Button
            size="sm"
            variant="outline"
            disabled={pdfMutation.isPending}
            onClick={() => pdfMutation.mutate({ id: jobId })}
            className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {pdfMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            {pdfMutation.isPending ? "Generating…" : "Download PDF"}
          </Button>
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
          {/* Show blocked completion notice */}
          {signatureBlocked && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Capture signature to mark completed
            </div>
          )}
          {allowedTransitions.length === 0 && !["priced", "cancelled"].includes(status) && !signatureBlocked && (
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
                    {scheduleOpen ? "Hide" : (j.scheduledTimeSlotId ? "Change slot" : "Pick slot")}
                  </Button>
                </div>
              </CardHeader>
              {/* Always show the currently booked slot summary */}
              {j.scheduledDate && !scheduleOpen && (
                <CardContent className="pt-0 pb-4">
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-green-800">Slot booked</p>
                      <p className="text-sm font-semibold text-green-900">
                        {format(new Date(j.scheduledDate), "EEE dd MMM yyyy, HH:mm")}
                      </p>
                      {j.technicianName && (
                        <p className="text-xs text-green-700 mt-0.5">Technician: {j.technicianName}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
              {scheduleOpen && j.assignedTechnicianId && (
                <CardContent>
                  <SlotPicker
                    technicianId={j.assignedTechnicianId}
                    jobCardId={jobId}
                    currentSlotId={j.scheduledTimeSlotId}
                    onBooked={() => setScheduleOpen(false)}
                    departmentId={(j as any).departmentId ?? undefined}
                    departmentName={(j as any).departmentName ?? undefined}
                  />
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
                rawTechNotes={j.technicianNotes}
                rawManagerNotes={j.managerNotes}
                currentUser={user}
                jobStatus={status}
                isManager={isManager}
              />
            </CardContent>
          </Card>

          {/* Photos & Documents */}
          <Card>
            <CardContent className="pt-5">
              <PhotosPanel jobCardId={jobId} jobStatus={status} />
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Client info card */}
          {j.clientId && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <User className="w-4 h-4" /> Client
                  </CardTitle>
                  <Link href={`/clients/${j.clientId}`} className="text-xs text-primary hover:underline">
                    View profile →
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-semibold text-base">{j.clientName}</p>
                {j.clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${j.clientPhone}`} className="text-primary hover:underline">{j.clientPhone}</a>
                  </div>
                )}
                {j.clientAlternatePhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${j.clientAlternatePhone}`} className="text-muted-foreground hover:text-primary hover:underline">
                      {j.clientAlternatePhone} <span className="text-xs">(alt)</span>
                    </a>
                  </div>
                )}
                {j.clientEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={`mailto:${j.clientEmail}`} className="text-primary hover:underline truncate">{j.clientEmail}</a>
                  </div>
                )}
                {(j.clientAddress || j.clientCity) && (
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm text-foreground">
                        {j.clientAddress && <p>{j.clientAddress}</p>}
                        {(j.clientCity || j.clientPostalCode) && (
                          <p className="text-muted-foreground">
                            {[j.clientCity, j.clientPostalCode].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {(j.clientAddress || j.clientCity) && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          [j.clientAddress, j.clientCity, j.clientPostalCode].filter(Boolean).join(", ")
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md px-3 py-1.5 transition-colors"
                      >
                        <Navigation className="w-3 h-3" /> Get Directions
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* Client (compact link when info card is shown) */}
              {!j.clientId && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">—</p>
                </div>
              </div>
              )}
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

          {/* Signature section */}
          <SignatureSection
            jobCardId={jobId}
            jobStatus={status}
            requiresSignature={requiresSignature}
            isSigned={isSigned}
          />

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
            <DialogDescription>
              Showing technicians in the <span className="font-semibold">{(job as any)?.departmentName ?? "selected"}</span> department.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedTechId} onValueChange={setSelectedTechId}>
            <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
            <SelectContent>
              {(technicians as any[]).length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No technicians in this department</div>
              ) : (
                (technicians as any[]).map((t: any) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name ?? t.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button disabled={!selectedTechId || assignMutation.isPending}
              onClick={() => assignMutation.mutate({ id: jobId, technicianId: Number(selectedTechId) })}>
              {assignMutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
