/**
 * MobilePhotoSection
 *
 * Self-contained photo upload + gallery for the mobile technician job detail page.
 *
 * Features:
 *   - Two one-tap buttons: "Camera" (opens device camera directly) and "Gallery" (file picker)
 *   - Category selector: Before / After / Photo
 *   - Per-upload progress row while uploading (spinner + filename)
 *   - Thumbnail grid of uploaded images with lightbox preview on tap
 *   - 10 MB file size guard (matches backend limit)
 */

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  X,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type PhotoCategory = "before_image" | "after_image" | "photo";

const CATEGORIES: { value: PhotoCategory; label: string }[] = [
  { value: "before_image", label: "Before" },
  { value: "after_image",  label: "After"  },
  { value: "photo",        label: "Photo"  },
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Pending upload row ───────────────────────────────────────────────────────

interface PendingUpload {
  id: string;
  fileName: string;
  status: "uploading" | "done" | "error";
  errorMsg?: string;
}

function UploadRow({ item }: { item: PendingUpload }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {item.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {item.status === "done"      && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {item.status === "error"     && <X className="w-4 h-4 text-destructive" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{item.fileName}</p>
        {item.status === "uploading" && <p className="text-xs text-muted-foreground">Uploading…</p>}
        {item.status === "error"     && <p className="text-xs text-destructive">{item.errorMsg ?? "Upload failed"}</p>}
        {item.status === "done"      && <p className="text-xs text-green-600">Uploaded</p>}
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={url}
        alt="Photo preview"
        className="max-w-full max-h-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MobilePhotoSectionProps {
  jobCardId: number;
  /** Whether the job is closed (completed/cancelled/etc.) — disables upload */
  readOnly?: boolean;
}

export default function MobilePhotoSection({ jobCardId, readOnly = false }: MobilePhotoSectionProps) {
  const utils = trpc.useUtils();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<PhotoCategory>("photo");
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Fetch all image documents for this job
  const { data: docs = [] } = trpc.documents.list.useQuery(
    { jobCardId },
    { refetchInterval: 0 }
  );

  const photos = (docs as any[]).filter(
    (d) =>
      ["photo", "before_image", "after_image"].includes(d.category) &&
      (d.mimeType?.startsWith("image/") ?? true)
  );

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: (_data, variables) => {
      utils.documents.list.invalidate({ jobCardId });
      setPending((prev) =>
        prev.map((p) =>
          p.fileName === variables.fileName && p.status === "uploading"
            ? { ...p, status: "done" }
            : p
        )
      );
      // Remove "done" rows after 2 s
      setTimeout(() => {
        setPending((prev) => prev.filter((p) => p.status !== "done"));
      }, 2000);
    },
    onError: (err, variables) => {
      setPending((prev) =>
        prev.map((p) =>
          p.fileName === variables.fileName && p.status === "uploading"
            ? { ...p, status: "error", errorMsg: err.message }
            : p
        )
      );
    },
  });

  const processFile = (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error(`${file.name}: exceeds 10 MB limit`);
      return;
    }
    const id = `${Date.now()}-${Math.random()}`;
    setPending((prev) => [...prev, { id, fileName: file.name, status: "uploading" }]);

    const reader = new FileReader();
    reader.onload = () => {
      uploadMutation.mutate({
        jobCardId,
        category,
        fileName: file.name,
        fileDataUrl: reader.result as string,
      });
    };
    reader.onerror = () => {
      setPending((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "error", errorMsg: "Could not read file" } : p))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(processFile);
    e.target.value = "";
  };

  // Group photos by category for display
  const beforePhotos = photos.filter((p: any) => p.category === "before_image");
  const afterPhotos  = photos.filter((p: any) => p.category === "after_image");
  const otherPhotos  = photos.filter((p: any) => p.category === "photo");

  const hasPhotos = photos.length > 0;

  return (
    <>
      {/* Category selector */}
      {!readOnly && (
        <div className="flex gap-2 mb-3">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                category === c.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      {!readOnly && (
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {/* Camera button — opens device camera directly */}
          <Button
            variant="outline"
            className="h-14 flex-col gap-1 text-xs font-medium"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-5 h-5 text-primary" />
            Camera
          </Button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFiles}
          />

          {/* Gallery button — opens file picker */}
          <Button
            variant="outline"
            className="h-14 flex-col gap-1 text-xs font-medium"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImagePlus className="w-5 h-5 text-primary" />
            Gallery
          </Button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
        </div>
      )}

      {/* Pending uploads */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden px-4 mb-3">
          {pending.map((item) => (
            <UploadRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Photo grid */}
      {hasPhotos ? (
        <div className="space-y-3">
          {[
            { label: "Before", items: beforePhotos },
            { label: "After",  items: afterPhotos  },
            { label: "Photos", items: otherPhotos  },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {group.label}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {group.items.map((photo: any) => (
                    <button
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group"
                      onClick={() => setLightboxUrl(photo.fileUrl)}
                    >
                      <img
                        src={photo.fileUrl}
                        alt={photo.fileName ?? "Photo"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-active:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        !readOnly && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No photos yet — tap Camera or Gallery to add one.
          </p>
        )
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
}
