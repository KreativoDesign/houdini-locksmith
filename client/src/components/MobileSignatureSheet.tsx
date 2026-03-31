/**
 * MobileSignatureSheet
 *
 * A bottom-sheet that lets a technician capture a client signature on a phone
 * before marking a job as completed.
 *
 * Flow:
 *   1. Sheet opens → technician hands phone to client
 *   2. Client draws signature on the full-width canvas
 *   3. Client enters their name
 *   4. Technician taps "Confirm & Submit" → calls signatures.capture
 *   5. On success, parent receives onSigned() callback and can call updateStatus
 */

import { useRef, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Pen,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import { useEffect } from "react";

// ─── Canvas hook ──────────────────────────────────────────────────────────────

function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCtx = () => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return ctx;
  };

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      if (!t) return null;
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy };
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const start = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const pos = getPos(e, c);
    if (!pos) return;
    isDrawing.current = true;
    lastPos.current = pos;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
  }, []);

  const move = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    if (!c) return;
    const pos = getPos(e, c);
    if (!pos || !lastPos.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, []);

  const stop = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    setIsEmpty(false);
  }, []);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    setIsEmpty(true);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    resize();
    c.addEventListener("mousedown", start);
    c.addEventListener("mousemove", move);
    c.addEventListener("mouseup", stop);
    c.addEventListener("mouseleave", stop);
    c.addEventListener("touchstart", start, { passive: false });
    c.addEventListener("touchmove", move, { passive: false });
    c.addEventListener("touchend", stop);
    window.addEventListener("resize", resize);
    return () => {
      c.removeEventListener("mousedown", start);
      c.removeEventListener("mousemove", move);
      c.removeEventListener("mouseup", stop);
      c.removeEventListener("mouseleave", stop);
      c.removeEventListener("touchstart", start);
      c.removeEventListener("touchmove", move);
      c.removeEventListener("touchend", stop);
      window.removeEventListener("resize", resize);
    };
  }, [start, move, stop, resize]);

  const clear = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setIsEmpty(true);
  }, []);

  const getDataUrl = useCallback((): string | null => {
    const c = canvasRef.current;
    if (!c || isEmpty) return null;
    return c.toDataURL("image/png");
  }, [isEmpty]);

  return { canvasRef, isEmpty, clear, getDataUrl };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MobileSignatureSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called after signature is successfully captured — parent should then call updateStatus */
  onSigned: () => void;
  jobCardId: number;
  jobNumber?: string;
}

export default function MobileSignatureSheet({
  open,
  onClose,
  onSigned,
  jobCardId,
  jobNumber,
}: MobileSignatureSheetProps) {
  const { canvasRef, isEmpty, clear, getDataUrl } = useSignatureCanvas();
  const [signerName, setSignerName] = useState("");
  const utils = trpc.useUtils();

  const captureMutation = trpc.signatures.capture.useMutation({
    onSuccess: () => {
      toast.success("Signature captured");
      utils.signatures.getByJobCard.invalidate({ jobCardId });
      utils.jobCards.get.invalidate({ id: jobCardId });
      setSignerName("");
      clear();
      onSigned();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (isEmpty) {
      toast.error("Please draw a signature first");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Please enter the client's name");
      return;
    }
    const dataUrl = getDataUrl();
    if (!dataUrl) {
      toast.error("Could not read signature — please try again");
      return;
    }
    captureMutation.mutate({
      jobCardId,
      signatureDataUrl: dataUrl,
      signerName: signerName.trim(),
      signerRole: "Client",
    });
  };

  const handleClose = () => {
    if (captureMutation.isPending) return;
    setSignerName("");
    clear();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl p-0 max-h-[92dvh] flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <SheetTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Client Signature Required
          </SheetTitle>
          <SheetDescription className="text-sm">
            {jobNumber ? (
              <>
                <strong>{jobNumber}</strong> requires a client signature before it can be marked as completed.
              </>
            ) : (
              "A client signature is required before marking this job as completed."
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Canvas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Client Signature
              </Label>
              <button
                type="button"
                onClick={clear}
                disabled={isEmpty || captureMutation.isPending}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>

            <div
              className={`relative rounded-xl border-2 bg-white overflow-hidden transition-colors ${
                isEmpty
                  ? "border-dashed border-amber-300"
                  : "border-solid border-green-400"
              }`}
              style={{ height: 180 }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
                style={{ touchAction: "none" }}
              />
              {isEmpty && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <Pen className="w-7 h-7 text-amber-300 mb-1" />
                  <p className="text-sm text-amber-400 font-medium">Sign here</p>
                  <p className="text-xs text-amber-300 mt-0.5">Hand phone to client</p>
                </div>
              )}
              {!isEmpty && (
                <div className="absolute top-2 right-2 pointer-events-none">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              )}
            </div>
          </div>

          {/* Signer name */}
          <div>
            <Label htmlFor="signerName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Client Name
            </Label>
            <Input
              id="signerName"
              placeholder="Full name of client"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              disabled={captureMutation.isPending}
              className="h-11 text-base"
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <Button
              className="w-full h-12 text-base font-medium gap-2"
              disabled={isEmpty || !signerName.trim() || captureMutation.isPending}
              onClick={handleSubmit}
            >
              {captureMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {captureMutation.isPending ? "Saving…" : "Confirm & Submit"}
            </Button>
            <Button
              variant="ghost"
              className="w-full h-11 text-muted-foreground"
              onClick={handleClose}
              disabled={captureMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
