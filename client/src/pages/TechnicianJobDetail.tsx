/**
 * TechnicianJobDetail — Mobile-optimised job detail page for technicians.
 *
 * Shown when a technician taps a job card from TechnicianMobileApp.
 * Provides:
 *   - Back button → /technician
 *   - Job header (number, title, priority badge, status chip)
 *   - Scheduled slot + client info cards
 *   - Inline status transition buttons (role-aware)
 *   - Signature capture gate for "Mark Completed" when requiresSignature is true
 *   - Technician notes (read + append)
 *   - Photo upload (camera + gallery) with thumbnail grid
 *   - Job items list (read-only for technician)
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MobileSignatureSheet from "@/components/MobileSignatureSheet";
import MobilePhotoSection from "@/components/MobilePhotoSection";
import { trpc } from "@/lib/trpc";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquare,
  PauseCircle,
  PenLine,
  Phone,
  PlayCircle,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
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

const PRIORITY_BADGE: Record<Priority, { label: string; className: string }> = {
  low:    { label: "Low",    className: "bg-gray-100 text-gray-600 border-gray-200" },
  normal: { label: "Normal", className: "bg-blue-50 text-blue-600 border-blue-200" },
  high:   { label: "High",   className: "bg-orange-100 text-orange-700 border-orange-200" },
  urgent: { label: "URGENT", className: "bg-red-100 text-red-700 border-red-200" },
};

const TECH_TRANSITIONS: Partial<Record<JobStatus, { to: JobStatus; label: string; icon: React.ElementType; variant: "default" | "destructive" | "outline" }[]>> = {
  assigned:    [{ to: "in_progress", label: "Start Job",       icon: PlayCircle,   variant: "default" }],
  in_progress: [
    { to: "on_hold",   label: "Put On Hold",        icon: PauseCircle,  variant: "outline" },
    { to: "completed", label: "Mark Completed",     icon: CheckCircle2, variant: "default" },
  ],
  on_hold:     [{ to: "in_progress", label: "Resume Job",      icon: PlayCircle,   variant: "default" }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-4 mb-2 mt-5">
      {children}
    </h3>
  );
}

// ─── Job Items sub-component (avoids hook-in-callback lint error) ─────────────

function JobItemsList({ jobCardId }: { jobCardId: number }) {
  const { data: items = [] } = trpc.jobItems.list.useQuery({ jobCardId });
  if (items.length === 0) return null;
  return (
    <>
      <SectionTitle>Job Items</SectionTitle>
      <div className="mx-4 rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.type} · qty {item.quantity}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground shrink-0">
              R {(item.unitPrice * item.quantity * (1 - (item.discountPercent ?? 0) / 100)).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TechnicianJobDetail() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [sigSheetOpen, setSigSheetOpen] = useState(false);
  // Pending completion status — set when user taps "Mark Completed" and sig is needed
  const [pendingComplete, setPendingComplete] = useState(false);

  const { data: job, isLoading } = trpc.jobCards.get.useQuery(
    { id: jobId },
    { enabled: !!jobId, refetchInterval: 30_000 }
  );

  const statusMutation = trpc.jobCards.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.jobCards.get.invalidate({ id: jobId });
      utils.jobCards.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const notesMutation = trpc.jobCards.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("Note saved");
      utils.jobCards.get.invalidate({ id: jobId });
      setNoteText("");
      setAddingNote(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveNote = () => {
    if (!noteText.trim() || !job) return;
    const j = job as any;
    const existing = j.technicianNotes ?? "";
    const timestamp = format(new Date(), "dd MMM yyyy HH:mm");
    const appended = existing
      ? `${existing}\n\n[${timestamp}]\n${noteText.trim()}`
      : `[${timestamp}]\n${noteText.trim()}`;
    notesMutation.mutate({ id: jobId, technicianNotes: appended });
  };

  /**
   * Called when the user taps a status action button.
   * For "Mark Completed" when requiresSignature is true and job is not yet signed,
   * we open the signature sheet first. Otherwise we call updateStatus directly.
   */
  const handleStatusAction = (toStatus: JobStatus) => {
    const j = job as any;
    if (
      toStatus === "completed" &&
      j.requiresSignature &&
      !j.isSigned
    ) {
      setPendingComplete(true);
      setSigSheetOpen(true);
      return;
    }
    statusMutation.mutate({ id: jobId, status: toStatus });
  };

  /**
   * Called by MobileSignatureSheet after a successful signature capture.
   * At this point the backend has already set isSigned=true, so we can safely
   * call updateStatus → completed.
   */
  const handleSigned = () => {
    if (pendingComplete) {
      statusMutation.mutate({ id: jobId, status: "completed" });
      setPendingComplete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-background gap-4 px-6 text-center">
        <Briefcase className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm font-medium text-foreground">Job not found</p>
        <Button variant="outline" onClick={() => setLocation("/technician")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const j = job as any;
  const status = j.status as JobStatus;
  const priority = j.priority as Priority;
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE.assigned;
  const priorityBadge = PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.normal;
  const actions = TECH_TRANSITIONS[status] ?? [];
  const isClosed = ["completed", "awaiting_pricing", "priced", "cancelled"].includes(status);

  const scheduledStr = j.scheduledDate
    ? format(typeof j.scheduledDate === "string" ? parseISO(j.scheduledDate) : j.scheduledDate, "EEE dd MMM yyyy, HH:mm")
    : null;

  const clientAddress = [j.clientAddress, j.clientCity, j.clientPostalCode].filter(Boolean).join(", ");
  const techNoteLines = (j.technicianNotes as string | null | undefined)?.trim() ?? "";

  // Show a "Signature required" notice when the job is in_progress and sig not yet captured
  const showSigNotice = status === "in_progress" && j.requiresSignature && !j.isSigned;
  // Show a "Signed" badge when signature is already captured
  const showSigDone = j.isSigned && j.signerName;

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Sticky header */}
      <header className="flex items-center gap-3 px-3 h-14 border-b border-border bg-background/95 backdrop-blur shrink-0 sticky top-0 z-30">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setLocation("/technician")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate leading-none">
            {j.jobNumber ?? `JC-${j.id}`}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {j.title ?? j.description ?? "No description"}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero card */}
        <div className="mx-4 mt-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground leading-snug">
                {j.title ?? j.description ?? "No description"}
              </p>
              {j.departmentName && (
                <p className="text-xs text-muted-foreground mt-1">{j.departmentName}</p>
              )}
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${priorityBadge.className}`}>
              {priorityBadge.label}
            </span>
          </div>

          {j.description && j.title && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{j.description}</p>
          )}

          {scheduledStr && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{scheduledStr}</span>
            </div>
          )}
        </div>

        {/* Signature notice / badge */}
        {showSigNotice && (
          <>
            <SectionTitle>Signature</SectionTitle>
            <div className="mx-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <PenLine className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Signature required</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    A client signature must be captured before this job can be marked as completed.
                  </p>
                </div>
              </div>
              <Button
                className="w-full mt-3 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => { setPendingComplete(false); setSigSheetOpen(true); }}
              >
                <PenLine className="w-4 h-4" />
                Capture Signature Now
              </Button>
            </div>
          </>
        )}

        {showSigDone && (
          <>
            <SectionTitle>Signature</SectionTitle>
            <div className="mx-4 rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Signature captured</p>
                <p className="text-xs text-green-700 mt-0.5">Signed by {j.signerName}</p>
              </div>
            </div>
          </>
        )}

        {/* Status actions */}
        {actions.length > 0 && (
          <>
            <SectionTitle>Update Status</SectionTitle>
            <div className="px-4 space-y-2.5">
              {actions.map((action) => {
                const needsSig =
                  action.to === "completed" &&
                  j.requiresSignature &&
                  !j.isSigned;
                return (
                  <Button
                    key={action.to}
                    variant={action.variant}
                    className="w-full h-12 text-base font-medium gap-2"
                    disabled={statusMutation.isPending}
                    onClick={() => handleStatusAction(action.to)}
                  >
                    {statusMutation.isPending && pendingComplete === false ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <action.icon className="w-4 h-4" />
                    )}
                    {needsSig ? "Capture Signature & Complete" : action.label}
                  </Button>
                );
              })}
            </div>
          </>
        )}

        {/* Client info */}
        {j.clientName && (
          <>
            <SectionTitle>Client</SectionTitle>
            <div className="mx-4 rounded-xl border border-border bg-card overflow-hidden px-4">
              <InfoRow icon={User}    label="Name"    value={j.clientName} />
              <InfoRow icon={Phone}   label="Phone"   value={j.clientPhone} />
              <InfoRow icon={Phone}   label="Alt. Phone" value={j.clientAlternatePhone} />
              <InfoRow icon={MapPin}  label="Address" value={clientAddress || null} />
            </div>
          </>
        )}

        {/* Job items */}
        <JobItemsList jobCardId={jobId} />

        {/* Photos */}
        <SectionTitle>Photos</SectionTitle>
        <div className="mx-4">
          <MobilePhotoSection jobCardId={jobId} readOnly={isClosed} />
        </div>

        {/* Notes */}
        <SectionTitle>My Notes</SectionTitle>
        <div className="mx-4">
          {techNoteLines ? (
            <div className="rounded-xl border border-border bg-card p-4 mb-3">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {techNoteLines}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-3 px-1">No notes yet.</p>
          )}

          {!isClosed && (
            <>
              {addingNote ? (
                <div className="space-y-2.5">
                  <Textarea
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="min-h-[100px] text-sm resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2"
                      disabled={!noteText.trim() || notesMutation.isPending}
                      onClick={handleSaveNote}
                    >
                      {notesMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Save Note
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setAddingNote(false); setNoteText(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setAddingNote(true)}
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Note
                </Button>
              )}
            </>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Mobile signature sheet */}
      <MobileSignatureSheet
        open={sigSheetOpen}
        onClose={() => { setSigSheetOpen(false); setPendingComplete(false); }}
        onSigned={handleSigned}
        jobCardId={jobId}
        jobNumber={j.jobNumber ?? undefined}
      />
    </div>
  );
}
