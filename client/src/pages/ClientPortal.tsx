import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  Wrench,
  Camera,
  PenLine,
  AlertCircle,
  Loader2,
  Lock,
  FileDown,
  CreditCard,
} from "lucide-react";

// ─── Status colour map ────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800 border-yellow-200",
  assigned:    "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-purple-100 text-purple-800 border-purple-200",
  completed:   "bg-green-100 text-green-800 border-green-200",
  awaiting_pricing: "bg-amber-100 text-amber-800 border-amber-200",
  pricing_approved: "bg-cyan-100 text-cyan-800 border-cyan-200",
  invoice_published: "bg-primary/15 text-primary border-primary/30",
  invoiced:    "bg-orange-100 text-orange-800 border-orange-200",
  closed:      "bg-gray-100 text-gray-700 border-gray-200",
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(t: string | null | undefined) {
  if (!t) return null;
  // t is "HH:MM:SS"
  const [h, m] = t.split(":");
  const hour = parseInt(h ?? "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatMoney(amount: string | number | null | undefined, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency || "ZAR",
    maximumFractionDigits: 2,
  }).format(Number(amount ?? 0));
}

export default function ClientPortal() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const { data, isLoading, error } = trpc.clientPortal.getJobStatus.useQuery(
    { token },
    { enabled: token.length === 64, retry: false }
  );

  const pdfMutation = trpc.jobCards.generatePdf.useMutation({
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.14),transparent_38%),hsl(var(--background))] px-6">
        <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/25 blur-xl animate-pulse" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-background/80 shadow-lg">
              <Lock className="w-7 h-7 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-foreground">Preparing your secure portal</p>
            <p className="text-sm text-muted-foreground">Loading your job and invoice updates…</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-3" aria-hidden="true">
            <div className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
            <div className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/40 [animation-delay:150ms]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / invalid token ────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Link Not Found</h1>
          <p className="text-muted-foreground text-sm">
            This link is invalid or has expired. Please contact Houdini Locksmith & Security for
            an updated link.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Reference: <span className="font-mono">{token.slice(0, 8)}…</span>
          </p>
        </div>
      </div>
    );
  }

  const statusBadgeClass = STATUS_BADGE[data.workflowStage] ?? STATUS_BADGE[data.status] ?? STATUS_BADGE.pending;
  const clientName = data.client?.firstName || "there";
  const recentJobs = data.dashboardSummary?.recentJobs ?? [];
  const pendingInvoices = data.dashboardSummary?.pendingInvoices ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 border-b border-border/60"
        style={{ background: "linear-gradient(135deg, #0a0f0a 0%, #0d1a0d 100%)" }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663346956907/FvsJQLgDSLrAGayZ.png"
              alt="Houdini Locksmith"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <div>
              <p className="text-white font-semibold text-sm leading-none">Houdini Locksmith</p>
              <p className="text-white/50 text-xs mt-0.5">Job Status Portal</p>
            </div>
          </div>
          <Badge className={`${statusBadgeClass} border text-xs font-medium`}>
            {data.workflowStage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ── Personalized portal overview ───────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.13),transparent_60%),hsl(var(--card))] p-5 shadow-sm">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Your Houdini Portal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Welcome back, {clientName}.</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Review your latest service activity, invoice status, and the current job details below.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/70 bg-background/65 p-3">
                <p className="text-2xl font-bold text-foreground">{recentJobs.length}</p>
                <p className="text-xs text-muted-foreground">Recent job cards</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/[0.07] p-3">
                <p className="text-2xl font-bold text-primary">{pendingInvoices.length}</p>
                <p className="text-xs text-muted-foreground">Outstanding invoices</p>
              </div>
            </div>
          </div>
        </section>

        {(recentJobs.length > 0 || pendingInvoices.length > 0) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {recentJobs.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Recent Job Cards</h2>
                  </div>
                  <div className="space-y-2.5">
                    {recentJobs.map((job) => (
                      <div key={job.jobNumber} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-xs font-semibold text-foreground">{job.jobNumber}</p>
                          <Badge className={`${STATUS_BADGE[job.status] ?? STATUS_BADGE.pending} border text-[10px]`}>{job.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{job.title || "Houdini service job"}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {pendingInvoices.length > 0 && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileDown className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Outstanding Invoices</h2>
                  </div>
                  <div className="space-y-2.5">
                    {pendingInvoices.map((invoice) => (
                      <div key={invoice.jobNumber} className="rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2">
                        <p className="font-mono text-xs font-semibold text-foreground">{invoice.jobNumber}</p>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                          <p className="truncate text-muted-foreground">{invoice.title || "Invoice ready"}</p>
                          <p className="shrink-0 font-semibold text-primary">{formatMoney(invoice.total, invoice.currency ?? "ZAR")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* ── Job summary ──────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Job Reference
                </p>
                <h1 className="text-2xl font-bold text-foreground font-mono">{data.jobNumber}</h1>
              </div>
              {data.priority && data.priority !== "normal" && (
                <Badge
                  className={
                    data.priority === "urgent"
                      ? "bg-red-100 text-red-700 border-red-200 border"
                      : "bg-orange-100 text-orange-700 border-orange-200 border"
                  }
                >
                  {data.priority.charAt(0).toUpperCase() + data.priority.slice(1)}
                </Badge>
              )}
            </div>

            {data.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              {data.client && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium text-foreground">
                      {data.client.firstName} {data.client.lastName}
                    </p>
                  </div>
                </div>
              )}
              {data.technician && (
                <div className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Technician</p>
                    <p className="font-medium text-foreground">{data.technician.name}</p>
                  </div>
                </div>
              )}
              {(data.scheduledSlot || data.scheduledDate) && (
                <div className="flex items-start gap-2 col-span-2">
                  <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                    <p className="font-medium text-foreground">
                      {data.scheduledSlot
                        ? `${formatDate(data.scheduledSlot.slotDate)} · ${formatTime(data.scheduledSlot.startTime)} – ${formatTime(data.scheduledSlot.endTime)}`
                        : formatDate(data.scheduledDate)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Status timeline ───────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Progress</h2>
            <ol className="relative space-y-0">
              {data.statusTimeline.map((step, idx) => (
                <li key={step.status} className="flex items-start gap-3 pb-4 last:pb-0">
                  {/* Connector line */}
                  <div className="flex flex-col items-center">
                    {step.completed ? (
                      <CheckCircle2
                        className="w-5 h-5 shrink-0"
                        style={{ color: step.current ? "oklch(0.73 0.22 130)" : "oklch(0.55 0.18 130)" }}
                      />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0 text-muted-foreground/30" />
                    )}
                    {idx < data.statusTimeline.length - 1 && (
                      <div
                        className="w-0.5 flex-1 mt-1 mb-0 min-h-[1.25rem]"
                        style={{
                          background: step.completed
                            ? "oklch(0.73 0.22 130 / 0.4)"
                            : "oklch(0.5 0 0 / 0.15)",
                        }}
                      />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p
                      className={`text-sm font-medium ${
                        step.current
                          ? "text-foreground"
                          : step.completed
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                      {step.current && (
                        <span
                          className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: "oklch(0.73 0.22 130 / 0.15)", color: "oklch(0.55 0.18 130)" }}
                        >
                          Current
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* ── Signature ────────────────────────────────────────────────────── */}
        {data.requiresSignature && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <PenLine className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Signature</h2>
              </div>
              {data.signature ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden bg-white p-2">
                    <img
                      src={data.signature.signatureUrl}
                      alt="Client signature"
                      className="w-full max-h-40 object-contain"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      Signed by <span className="font-medium text-foreground">{data.signature.signerName}</span>
                    </p>
                    <p>
                      {new Date(data.signature.capturedAt).toLocaleString("en-ZA")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Signature not yet captured</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Photos ───────────────────────────────────────────────────────── */}
        {data.photos.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Photos ({data.photos.length})
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {data.photos.map((photo, idx) => (
                  <a
                    key={idx}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={photo.url}
                      alt={photo.fileName}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Pricing summary ──────────────────────────────────────────────── */}
        {data.pricingSummary && data.pricingSummary.status !== "draft" && (
          <Card className={data.workflowStage === "awaiting_pricing" ? "border-amber-300 bg-amber-50/50" : undefined}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Invoice Summary</h2>
                  {data.workflowStage === "awaiting_pricing" && (
                    <p className="mt-1 text-xs text-amber-800">Your technician’s work is complete. We are waiting for pricing approval before issuing your invoice.</p>
                  )}
                  {data.workflowStage === "pricing_approved" && (
                    <p className="mt-1 text-xs text-cyan-800">Pricing has been approved. Your invoice is being prepared for this portal.</p>
                  )}
                </div>
                <Badge className={`${STATUS_BADGE[data.workflowStage] ?? STATUS_BADGE.pending} border text-[10px]`}>
                  {data.workflowStage.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>
                    {data.pricingSummary.currency}{" "}
                    {Number(data.pricingSummary.subtotal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT (15%)</span>
                  <span>
                    {data.pricingSummary.currency}{" "}
                    {Number(data.pricingSummary.vatAmount).toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Total</span>
                  <span>
                    {data.pricingSummary.currency}{" "}
                    {Number(data.pricingSummary.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Published invoice ───────────────────────────────────────────── */}
        {data.invoicePdf && (
          <Card className="border-primary/25 bg-primary/[0.04]">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <FileDown className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Your Invoice Is Ready</h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your invoice is securely available in this portal. Download a copy for your records or contact Houdini for payment assistance.
              </p>
              <Button asChild className="w-full gap-2">
                <a href={data.invoicePdf.url} target="_blank" rel="noopener noreferrer">
                  <FileDown className="w-4 h-4" /> Download Invoice PDF
                </a>
              </Button>
              {data.payment && (
                <div className="rounded-xl border border-primary/20 bg-background/70 p-3">
                  <div className="flex items-start gap-2">
                    <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">Ready to pay {formatMoney(data.payment.amount, data.payment.currency)}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {data.payment.providerConfigured
                          ? "Secure online payment is available for this invoice."
                          : "Online payment is being enabled. Please contact Houdini for payment assistance in the meantime."}
                      </p>
                    </div>
                  </div>
                  <Button className="mt-3 w-full gap-2" disabled={!data.payment.providerConfigured}>
                    <CreditCard className="h-4 w-4" />
                    Pay Invoice Online
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

           {/* ── PDF Download ─────────────────────────────────────────────── */}
        {data.jobCardId && (
          <div className="flex justify-center pb-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pdfMutation.isPending}
              onClick={() => pdfMutation.mutate({ id: data.jobCardId! })}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            >
              {pdfMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {pdfMutation.isPending ? "Generating PDF…" : "Download Job Card PDF"}
            </Button>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="text-center text-xs text-muted-foreground/50 pb-6 space-y-1">
          <p>This is a read-only status page provided by Houdini Locksmith & Security.</p>
          <p>Last updated: {new Date(data.updatedAt).toLocaleString("en-ZA")}</p>
          {data.expiresAt && (
            <p>
              This link expires on{" "}
              <span className="font-medium">
                {new Date(data.expiresAt).toLocaleDateString("en-ZA", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
