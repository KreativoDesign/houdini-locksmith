import { useState } from "react";
import { useLocation, useSearch } from "wouter";
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
import { ArrowLeft, Briefcase, AlertTriangle, Loader2 } from "lucide-react";

export default function JobCardForm() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefillClientId = params.get("clientId");
  const prefillEnquiryId = params.get("enquiryId");
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    title: "",
    description: "",
    clientId: prefillClientId ?? "",
    departmentId: "",
    technicianId: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    requiresSignature: true,
    scheduledDate: "",
  });
  const [isNavigating, setIsNavigating] = useState(false);

  const { data: clients = [] } = trpc.clients.list.useQuery({ limit: 200 });
  const { data: departments = [] } = trpc.departments.list.useQuery();
  const { data: technicians = [] } = trpc.users.technicians.useQuery();

  const createMutation = trpc.jobCards.create.useMutation({
    onSuccess: (job: any) => {
      // Show success toast
      toast.success(`Job card ${job.jobNumber} created successfully!`, {
        description: "Redirecting to job details...",
      });
      // Invalidate cache to ensure the detail page can fetch the newly created job
      utils.jobCards.get.invalidate({ id: job.id });
      utils.jobCards.list.invalidate();
      // Set loading state and add a small delay to ensure the job is persisted before navigating
      setIsNavigating(true);
      setTimeout(() => {
        navigate(`/jobs/${job.id}`);
      }, 300);
    },
    onError: (err) => toast.error(`Failed to create job card: ${err.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.departmentId) return toast.error("Department is required");

    if (!form.clientId) return toast.error("Client is required");
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      clientId: Number(form.clientId),
      departmentId: Number(form.departmentId),
      assignedTechnicianId: form.technicianId ? Number(form.technicianId) : undefined,
      priority: form.priority,
      requiresSignature: form.requiresSignature,
      scheduledDate: form.scheduledDate || undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            New Job Card
          </h1>
          <p className="text-sm text-muted-foreground">Create a new job card for a client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Emergency lockout – 14 Oak Street"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detailed description of the job..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority *</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Scheduled Date</Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <Switch
                  checked={form.requiresSignature}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, requiresSignature: v }))}
                />
                <span className="text-sm text-blue-700">Requires signature on completion</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Client & Department */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {(clients as any[]).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department..." />
                </SelectTrigger>
                <SelectContent>
                  {(departments as any[]).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assign Technician (optional)</Label>
              <Select value={form.technicianId} onValueChange={(v) => setForm((f) => ({ ...f, technicianId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a technician..." />
                </SelectTrigger>
                <SelectContent>
                  {(technicians as any[]).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate("/jobs")} disabled={createMutation.isPending || isNavigating}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || isNavigating}>
            {isNavigating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting...
              </>
            ) : createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Job Card"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
