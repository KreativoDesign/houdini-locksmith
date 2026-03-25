import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  FileText,
  ChevronLeft,
  Wrench,
  Package,
  PlusCircle,
  AlertCircle,
  Loader2,
  Receipt,
  ThumbsUp,
  Send,
  Ban,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type PricingStatus = "draft" | "pending_approval" | "approved" | "invoiced";

const STATUS_CONFIG: Record<PricingStatus, { label: string; colour: string; icon: React.ElementType }> = {
  draft: { label: "Draft", colour: "bg-slate-100 text-slate-700 border-slate-200", icon: FileText },
  pending_approval: { label: "Pending Approval", colour: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  approved: { label: "Approved", colour: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  invoiced: { label: "Invoiced", colour: "bg-blue-100 text-blue-700 border-blue-200", icon: Receipt },
};

// ─── Live Calculation Helper ──────────────────────────────────────────────────
function computeLive(labour: number, parts: number, fees: number, discount: number, vat: number) {
  const subtotal = Math.max(0, labour + parts + fees - discount);
  const vatAmount = subtotal * (vat / 100);
  const total = subtotal + vatAmount;
  return { subtotal, vatAmount, total };
}

// ─── Currency Formatter ───────────────────────────────────────────────────────
function fmt(value: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Pricing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Read jobCardId from query string: /pricing?jobCardId=123
  const params = new URLSearchParams(window.location.search);
  const jobCardId = Number(params.get("jobCardId") ?? "0");

  const isManager = user?.role === "manager" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  // ── Server data ──
  const { data: job, isLoading: jobLoading } = trpc.jobCards.get.useQuery(
    { id: jobCardId },
    { enabled: jobCardId > 0 }
  );
  const { data: pricing, isLoading: pricingLoading, refetch: refetchPricing } = trpc.pricing.getByJobCard.useQuery(
    { jobCardId },
    { enabled: jobCardId > 0 }
  );
  const { data: itemsSummary } = trpc.jobItems.summary.useQuery(
    { jobCardId },
    { enabled: jobCardId > 0 }
  );

  // ── Form state ──
  const [labour, setLabour] = useState("0");
  const [parts, setParts] = useState("0");
  const [fees, setFees] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [vat, setVat] = useState("15");
  const [currency, setCurrency] = useState("ZAR");
  const [notes, setNotes] = useState("");
  const [useItemsParts, setUseItemsParts] = useState(true);

  // Populate form from existing pricing record
  useEffect(() => {
    if (pricing) {
      setLabour(String(Number(pricing.labourCost)));
      setParts(String(Number(pricing.partsCost)));
      setFees(String(Number(pricing.additionalFees ?? 0)));
      setDiscount(String(Number(pricing.discountAmount ?? 0)));
      setVat(String(Number(pricing.vatPct ?? 15)));
      setCurrency(pricing.currency ?? "ZAR");
      setNotes(pricing.notes ?? "");
    } else if (itemsSummary && useItemsParts) {
      // Auto-populate parts from job items
      setParts(String(Number(itemsSummary.partsCost) + Number(itemsSummary.servicesCost)));
      setLabour(String(Number(itemsSummary.labourCost)));
    }
  }, [pricing, itemsSummary, useItemsParts]);

  // Live totals
  const live = computeLive(
    Number(labour) || 0,
    Number(parts) || 0,
    Number(fees) || 0,
    Number(discount) || 0,
    Number(vat) || 0
  );

  // ── Mutations ──
  const utils = trpc.useUtils();

  const createMutation = trpc.pricing.create.useMutation({
    onSuccess: () => {
      toast.success("Pricing saved as draft");
      refetchPricing();
      utils.jobCards.get.invalidate({ id: jobCardId });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.pricing.update.useMutation({
    onSuccess: () => {
      toast.success("Pricing updated");
      refetchPricing();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.pricing.submitForApproval.useMutation({
    onSuccess: () => {
      toast.success("Pricing submitted for approval");
      refetchPricing();
      utils.jobCards.get.invalidate({ id: jobCardId });
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.pricing.approve.useMutation({
    onSuccess: () => {
      toast.success("Pricing approved — job marked as Priced");
      refetchPricing();
      utils.jobCards.get.invalidate({ id: jobCardId });
    },
    onError: (e) => toast.error(e.message),
  });

  const invoiceMutation = trpc.pricing.markInvoiced.useMutation({
    onSuccess: () => {
      toast.success("Job marked as Invoiced");
      refetchPricing();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Handlers ──
  function handleSave() {
    if (pricing) {
      updateMutation.mutate({
        jobCardId,
        labourCost: Number(labour) || 0,
        partsCost: Number(parts) || 0,
        additionalFees: Number(fees) || 0,
        discountAmount: Number(discount) || 0,
        vatPct: Number(vat) || 15,
        notes,
      });
    } else {
      createMutation.mutate({
        jobCardId,
        labourCost: Number(labour) || 0,
        partsCost: useItemsParts ? undefined : Number(parts) || 0,
        additionalFees: Number(fees) || 0,
        discountAmount: Number(discount) || 0,
        vatPct: Number(vat) || 15,
        currency,
        notes,
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const pricingStatus = (pricing?.status ?? null) as PricingStatus | null;
  const isLocked = pricingStatus === "approved" || pricingStatus === "invoiced";
  const canEdit = isManager && (pricingStatus === null || pricingStatus === "draft");
  const canSubmit = isManager && pricingStatus === "draft";
  const canApprove = isManager && pricingStatus === "pending_approval";
  const canInvoice = isAdmin && pricingStatus === "approved";

  if (!jobCardId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <AlertCircle className="w-12 h-12" />
        <p className="text-lg font-medium">No job card specified</p>
        <Button variant="outline" onClick={() => navigate("/jobs")}>Back to Job Cards</Button>
      </div>
    );
  }

  if (jobLoading || pricingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <AlertCircle className="w-12 h-12" />
        <p className="text-lg font-medium">Job card not found</p>
        <Button variant="outline" onClick={() => navigate("/jobs")}>Back to Job Cards</Button>
      </div>
    );
  }

  const StatusIcon = pricingStatus ? STATUS_CONFIG[pricingStatus].icon : DollarSign;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/jobs/${jobCardId}`)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">Job Pricing</h1>
            <span className="text-muted-foreground font-mono text-sm">{job.jobNumber}</span>
            {pricingStatus && (
              <Badge className={`${STATUS_CONFIG[pricingStatus].colour} border text-xs font-medium`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {STATUS_CONFIG[pricingStatus].label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Form ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Job Items Auto-populate Banner */}
          {!pricing && itemsSummary && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <Package className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Job items detected</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {itemsSummary.itemCount} item(s)  totalling {fmt(Number(itemsSummary.subtotal), currency)} have been auto-populated below.                </p>
              </div>
              <button
                onClick={() => setUseItemsParts((v) => !v)}
                className="text-xs text-amber-700 underline shrink-0"
              >
                {useItemsParts ? "Enter manually" : "Use job items"}
              </button>
            </div>
          )}

          {/* Locked notice */}
          {isLocked && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">
                This pricing record is {pricingStatus} and cannot be edited.
              </p>
            </div>
          )}

          {/* Pending approval notice */}
          {pricingStatus === "pending_approval" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Pricing is awaiting approval. {canApprove ? "You can approve it below." : "An admin or manager will review it."}
              </p>
            </div>
          )}

          {/* ── Cost Inputs ── */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Cost Breakdown
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Labour */}
              <div className="space-y-1.5">
                <Label htmlFor="labour" className="text-sm font-medium">Labour Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                  <Input
                    id="labour"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    value={labour}
                    onChange={(e) => setLabour(e.target.value)}
                    disabled={isLocked || !isManager}
                  />
                </div>
              </div>

              {/* Parts */}
              <div className="space-y-1.5">
                <Label htmlFor="parts" className="text-sm font-medium">
                  Parts / Materials
                  {useItemsParts && !pricing && (
                    <span className="ml-1 text-xs text-amber-600">(from job items)</span>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                  <Input
                    id="parts"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    value={parts}
                    onChange={(e) => setParts(e.target.value)}
                    disabled={isLocked || !isManager}
                  />
                </div>
              </div>

              {/* Additional Fees */}
              <div className="space-y-1.5">
                <Label htmlFor="fees" className="text-sm font-medium">Additional Fees</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                  <Input
                    id="fees"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    disabled={isLocked || !isManager}
                  />
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <Label htmlFor="discount" className="text-sm font-medium">Discount Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    disabled={isLocked || !isManager}
                  />
                </div>
              </div>

              {/* VAT */}
              <div className="space-y-1.5">
                <Label htmlFor="vat" className="text-sm font-medium">VAT %</Label>
                <div className="relative">
                  <Input
                    id="vat"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="pr-7"
                    value={vat}
                    onChange={(e) => setVat(e.target.value)}
                    disabled={isLocked || !isManager}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                <select
                  id="currency"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={isLocked || !isManager || !!pricing}
                >
                  <option value="ZAR">ZAR — South African Rand</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm font-medium">Pricing Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Add any notes about this pricing (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLocked || !isManager}
                className="resize-none"
              />
            </div>
          </div>

          {/* ── Action Buttons ── */}
          {isManager && (
            <div className="flex flex-wrap gap-3">
              {canEdit && (
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  {pricing ? "Update Draft" : "Save as Draft"}
                </Button>
              )}
              {canSubmit && (
                <Button
                  variant="outline"
                  onClick={() => submitMutation.mutate({ jobCardId })}
                  disabled={submitMutation.isPending}
                  className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for Approval
                </Button>
              )}
              {canApprove && (
                <Button
                  onClick={() => approveMutation.mutate({ jobCardId })}
                  disabled={approveMutation.isPending}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  Approve Pricing
                </Button>
              )}
              {canInvoice && (
                <Button
                  variant="outline"
                  onClick={() => invoiceMutation.mutate({ jobCardId })}
                  disabled={invoiceMutation.isPending}
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {invoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                  Mark as Invoiced
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary Sidebar ── */}
        <div className="space-y-4">

          {/* Live Totals Card */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Invoice Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Labour</span>
                <span>{fmt(Number(labour) || 0, currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Parts / Materials</span>
                <span>{fmt(Number(parts) || 0, currency)}</span>
              </div>
              {Number(fees) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Additional Fees</span>
                  <span>{fmt(Number(fees) || 0, currency)}</span>
                </div>
              )}
              {Number(discount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>− {fmt(Number(discount) || 0, currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{fmt(live.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({vat}%)</span>
                <span>{fmt(live.vatAmount, currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>Total</span>
                <span className="text-primary">{fmt(live.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Job Items Breakdown */}
          {itemsSummary && Number(itemsSummary.itemCount) > 0 && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Job Items ({itemsSummary.itemCount})
              </h2>
              <div className="space-y-2 text-sm">
                {Number(itemsSummary.labourCost) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Labour items</span>
                    <span>{fmt(Number(itemsSummary.labourCost), currency)}</span>
                  </div>
                )}
                {Number(itemsSummary.partsCost) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Parts</span>
                    <span>{fmt(Number(itemsSummary.partsCost), currency)}</span>
                  </div>
                )}
                {Number(itemsSummary.servicesCost) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Services</span>
                    <span>{fmt(Number(itemsSummary.servicesCost), currency)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Items Total</span>
                  <span>{fmt(Number(itemsSummary.subtotal), currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Job Info Card */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Job Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Number</span>
                <span className="font-mono font-medium">{job.jobNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize">{job.status?.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <span className="capitalize">{job.priority}</span>
              </div>
              {job.departmentId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span>Dept #{job.departmentId}</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => navigate(`/jobs/${jobCardId}`)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Job Card
            </Button>
          </div>

          {/* Approval Timeline */}
          {pricing && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Approval Timeline
              </h2>
              <ol className="relative border-l border-border ml-2 space-y-4">
                <li className="pl-4">
                  <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 ${pricing.status !== "draft" ? "bg-emerald-500 border-emerald-500" : "bg-primary border-primary"}`} />
                  <p className="text-xs font-medium">Draft Created</p>
                  <p className="text-xs text-muted-foreground">
                    {pricing.createdAt ? new Date(pricing.createdAt).toLocaleString() : "—"}
                  </p>
                </li>
                <li className="pl-4">
                  <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 ${["approved", "invoiced"].includes(pricing.status) ? "bg-emerald-500 border-emerald-500" : pricing.status === "pending_approval" ? "bg-amber-500 border-amber-500" : "bg-muted border-muted-foreground"}`} />
                  <p className={`text-xs font-medium ${pricing.status === "pending_approval" ? "text-amber-700" : ""}`}>
                    Submitted for Approval
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pricing.status === "draft" ? "Not yet submitted" : "Submitted"}
                  </p>
                </li>
                <li className="pl-4">
                  <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 ${pricing.status === "invoiced" ? "bg-emerald-500 border-emerald-500" : pricing.status === "approved" ? "bg-emerald-500 border-emerald-500" : "bg-muted border-muted-foreground"}`} />
                  <p className="text-xs font-medium">Approved</p>
                  <p className="text-xs text-muted-foreground">
                    {pricing.approvedAt ? new Date(pricing.approvedAt).toLocaleString() : "Pending"}
                  </p>
                </li>
                <li className="pl-4">
                  <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 ${pricing.status === "invoiced" ? "bg-blue-500 border-blue-500" : "bg-muted border-muted-foreground"}`} />
                  <p className="text-xs font-medium">Invoiced</p>
                  <p className="text-xs text-muted-foreground">
                    {pricing.status === "invoiced" ? "Completed" : "Pending"}
                  </p>
                </li>
              </ol>
            </div>
          )}

          {/* Access restriction notice for non-managers */}
          {!isManager && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <Ban className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">View only</p>
                <p className="text-xs text-amber-700 mt-0.5">Only Managers and Admins can create or edit pricing.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
