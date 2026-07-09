import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import SignaturePad, { SignaturePadHandle } from "./SignaturePad";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/use-toast";

interface SignatureCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  signedBy: "technician" | "client";
  onSuccess?: () => void;
}

export function SignatureCaptureModal({
  open,
  onOpenChange,
  jobId,
  signedBy,
  onSuccess,
}: SignatureCaptureModalProps) {
  const { toast } = useToast();
  const signaturePadRef = useRef<SignaturePadHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const captureSignatureMutation = trpc.jobCards.captureSignature.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Signature Captured",
        description: `${signedBy === "technician" ? "Technician" : "Client"} signature has been saved successfully.`,
      });
      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
        onSuccess?.();
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to capture signature",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    if (!signaturePadRef.current) return;

    const dataUrl = signaturePadRef.current.getDataUrl?.();
    if (!dataUrl) {
      toast({
        title: "Error",
        description: "Please sign before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    await captureSignatureMutation.mutateAsync({
      jobId,
      signatureData: dataUrl,
      signedBy,
    });
  };

  const handleClear = () => {
    signaturePadRef.current?.clear();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {signedBy === "technician" ? "Technician" : "Client"} Signature
          </DialogTitle>
          <DialogDescription>
            Please sign below to confirm completion of this job card.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-lg font-medium">Signature Captured Successfully</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <SignaturePad
              ref={signaturePadRef}
              disabled={isSubmitting}
              className="w-full"
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                Clear
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Saving..." : "Submit Signature"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
