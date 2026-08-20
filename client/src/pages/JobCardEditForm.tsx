import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ChevronRight, Upload, X } from "lucide-react";

export default function JobCardEditForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const jobId = parseInt(id || "0");

  const [form, setForm] = useState({
    title: "",
    description: "",
    technicianId: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    requiresSignature: true,
    scheduledDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<
    Array<{ id: number; fileUrl: string; fileName: string }>
  >([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { data: job, isLoading: jobLoading } = trpc.jobCards.get.useQuery({ id: jobId });
  const { data: technicians = [] } = trpc.users.technicians.useQuery();
  const { data: existingDocuments } = trpc.documents.list.useQuery({ jobCardId: jobId });
  const updateMutation = trpc.jobCards.update.useMutation();
  const assignMutation = trpc.jobCards.assign.useMutation();
  const uploadDocumentMutation = trpc.documents.upload.useMutation();

  // Populate form when job data loads
  useEffect(() => {
    if (job) {
      setForm({
        title: (job as any).title || "",
        description: (job as any).description || "",
        technicianId: String((job as any).assignedTechnicianId || ""),
        priority: (job as any).priority || "normal",
        requiresSignature: (job as any).requiresSignature ?? true,
        scheduledDate: (job as any).scheduledDate
          ? new Date((job as any).scheduledDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [job]);

  // Load existing photos
  useEffect(() => {
    if (existingDocuments && Array.isArray(existingDocuments)) {
      const photos = (existingDocuments as any[]).filter((doc) =>
        ["photo", "before_image", "after_image"].includes(doc.category)
      );
      setUploadedPhotos(photos);
    }
  }, [existingDocuments]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          try {
            const result = await uploadDocumentMutation.mutateAsync({
              jobCardId: jobId,
              category: "photo",
              fileName: file.name,
              fileDataUrl: dataUrl,
              description: `Site photo - ${new Date().toLocaleDateString()}`,
            });
            setUploadedPhotos((prev) => [
              ...prev,
              { id: result.id, fileUrl: result.fileUrl, fileName: file.name },
            ]);
            toast.success(`Photo "${file.name}" uploaded successfully`);
          } catch (error: any) {
            toast.error(`Failed to upload ${file.name}: ${error.message}`);
          }
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setIsUploadingPhoto(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const scheduledDate = form.scheduledDate ? new Date(form.scheduledDate) : null;

      await updateMutation.mutateAsync({
        id: jobId,
        title: form.title,
        description: form.description,
        priority: form.priority,
        requiresSignature: form.requiresSignature,
        scheduledDate: (scheduledDate as any) || undefined,
      } as any);

      if (form.technicianId) {
        await assignMutation.mutateAsync({ id: jobId, technicianId: parseInt(form.technicianId) });
      }

      toast.success("Job card updated successfully");
      navigate(`/jobs/${jobId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update job card");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Job not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() => navigate("/jobs")}
          className="hover:text-foreground transition-colors"
        >
          Jobs
        </button>
        <ChevronRight className="w-4 h-4" />
        <button
          onClick={() => navigate(`/jobs/${jobId}`)}
          className="hover:text-foreground transition-colors"
        >
          {(job as any).jobNumber}
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">Edit</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/jobs/${jobId}`)}
          className="hidden sm:flex"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Job
        </Button>
        <h1 className="text-3xl font-bold">Edit Job Card</h1>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Enter job title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Enter job description"
                rows={4}
              />
            </div>

            {/* Technician */}
            <div className="space-y-2">
              <Label htmlFor="technician">Assigned Technician</Label>
              <Select
                value={form.technicianId}
                onValueChange={(value) => setForm({ ...form, technicianId: value })}
              >
                <SelectTrigger id="technician">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Unassigned</SelectItem>
                  {(technicians as any[]).map((tech) => (
                    <SelectItem key={tech.id} value={String(tech.id)}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm({ ...form, priority: value as any })
                }
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              />
            </div>

            {/* Requires Signature */}
            <div className="flex items-center gap-3">
              <Switch
                id="requiresSignature"
                checked={form.requiresSignature}
                onCheckedChange={(checked) =>
                  setForm({ ...form, requiresSignature: checked })
                }
              />
              <Label htmlFor="requiresSignature" className="cursor-pointer">
                Requires Signature
              </Label>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photos">Site Photos</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <Label htmlFor="photo-input" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                </Label>
                <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                <Input
                  id="photo-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </div>

              {/* Uploaded Photos */}
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {uploadedPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.fileUrl}
                        alt={photo.fileName}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {photo.fileName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/jobs/${jobId}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
