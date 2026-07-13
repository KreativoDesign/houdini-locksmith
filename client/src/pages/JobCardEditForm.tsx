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
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";

export default function JobCardEditForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const jobId = parseInt(id || "0");

  const [form, setForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    technicianId: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    requiresSignature: true,
    scheduledDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: job, isLoading: jobLoading } = trpc.jobCards.get.useQuery({ id: jobId });
  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: technicians = [] } = trpc.users.technicians.useQuery();
  const updateMutation = trpc.jobCards.update.useMutation();

  // Populate form when job data loads
  useEffect(() => {
    if (job) {
      setForm({
        title: (job as any).title || "",
        description: (job as any).description || "",
        departmentId: String((job as any).departmentId || ""),
        technicianId: String((job as any).assignedTechnicianId || ""),
        priority: (job as any).priority || "normal",
        requiresSignature: (job as any).requiresSignature ?? true,
        scheduledDate: (job as any).scheduledDate
          ? new Date((job as any).scheduledDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [job]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const scheduledDate = form.scheduledDate ? new Date(form.scheduledDate) : null;

      await updateMutation.mutateAsync({
        id: jobId,
        title: form.title,
        description: form.description,
        departmentId: parseInt(form.departmentId),
        technicianId: form.technicianId ? parseInt(form.technicianId) : undefined,
        priority: form.priority,
        requiresSignature: form.requiresSignature,
        scheduledDate: (scheduledDate as any) || undefined,
      } as any);

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

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={form.departmentId}
                onValueChange={(value) => setForm({ ...form, departmentId: value })}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(departments as any[]).map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="">Unassigned</SelectItem>
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
