import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function CreateJobModal({
  open,
  onOpenChange,
  onJobCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    departmentId: "",
    priority: "normal",
    assignedTechnicianId: "",
  });

  const createJobMutation = trpc.jobCards.create.useMutation();
  const { data: departments } = trpc.departments.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: technicians } = trpc.users.technicians.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.title || !formData.departmentId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createJobMutation.mutateAsync({
        clientId: parseInt(formData.clientId),
        title: formData.title,
        description: formData.description,
        departmentId: parseInt(formData.departmentId),
        priority: formData.priority as any,
        assignedTechnicianId: formData.assignedTechnicianId
          ? parseInt(formData.assignedTechnicianId)
          : undefined,
      });

      toast.success("Job created successfully");
      onOpenChange(false);
      onJobCreated();
      setFormData({
        clientId: "",
        title: "",
        description: "",
        departmentId: "",
        priority: "normal",
        assignedTechnicianId: "",
      });
    } catch (error) {
      toast.error("Failed to create job");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>
            Fill in the job details and customer information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div>
            <h3 className="font-semibold mb-3">Customer Information</h3>
            <div>
              <label className="text-sm font-medium">Select Customer *</label>
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.rows?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.firstName} {client.lastName} - {client.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Details */}
          <div>
            <h3 className="font-semibold mb-3">Job Details</h3>
            <div className="space-y-4">
              <Input
                placeholder="Job Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <Textarea
                placeholder="Job Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Department *</label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, departmentId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
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
                <div>
                  <label className="text-sm font-medium">Assign Technician</label>
                  <Select
                    value={formData.assignedTechnicianId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, assignedTechnicianId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians?.map((tech: any) => (
                        <SelectItem key={tech.id} value={tech.id.toString()}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold"
              disabled={createJobMutation.isPending}
            >
              {createJobMutation.isPending ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
