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
} from "lucide-react";

// ─── Status colour map ────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-800 border-yellow-200",
  assigned:    "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-purple-100 text-purple-800 border-purple-200",
  completed:   "bg-green-100 text-green-800 border-green-200",
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading your job status…</p>
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

  const statusBadgeClass = STATUS_BADGE[data.status] ?? STATUS_BADGE.pending;

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
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-logo-neon_8a8a6775.png"
              alt="Houdini Locksmith"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <div>
              <p className="text-white font-semibold text-sm leading-none">Houdini Locksmith</p>
              <p className="text-white/50 text-xs mt-0.5">Job Status Portal</p>
            </div>
          </div>
          <Badge className={`${statusBadgeClass} border text-xs font-medium`}>
            {data.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Invoice Summary</h2>
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
