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
import { Plus } from "lucide-react";

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
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });

  const createJobMutation = trpc.jobCards.create.useMutation();
  const createClientMutation = trpc.clients.create.useMutation();
  const { data: departments } = trpc.departments.list.useQuery();
  const { data: clients, refetch: refetchClients } = trpc.clients.list.useQuery();
  const { data: technicians } = trpc.users.technicians.useQuery();

  // Validate new client form
  const isNewClientFormValid = () => {
    return (
      newClientData.firstName.trim() &&
      newClientData.lastName.trim() &&
      newClientData.email.trim() &&
      newClientData.phone.trim() &&
      newClientData.address.trim()
    );
  };

  const handleCreateClient = async () => {
    if (!newClientData.firstName?.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!newClientData.lastName?.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!newClientData.email?.trim()) {
      toast.error("Email address is required");
      return;
    }
    if (!newClientData.phone?.trim()) {
      toast.error("Cellphone number is required");
      return;
    }
    if (!newClientData.address?.trim()) {
      toast.error("Physical address is required");
      return;
    }

    try {
      const client = await createClientMutation.mutateAsync({
        firstName: newClientData.firstName.trim(),
        lastName: newClientData.lastName.trim(),
        email: newClientData.email.trim(),
        phone: newClientData.phone.trim(),
        address: newClientData.address.trim(),
      });

      toast.success("Customer created successfully");
      setFormData({ ...formData, clientId: client.id.toString() });
      setNewClientData({ firstName: "", lastName: "", email: "", phone: "", address: "" });
      setShowCreateClient(false);
      refetchClients();
    } catch (error) {
      toast.error("Failed to create customer");
      console.error(error);
    }
  };

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
    <>
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
              <div className="space-y-3">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateClient(true)}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Customer
                </Button>
              </div>
            </div>

            {/* Job Details */}
            <div>
              <h3 className="font-semibold mb-3">Job Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Job Title *</label>
                  <Input
                    placeholder="e.g., Emergency Lock Repair"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe the job details, what the customer needs, and any special instructions..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={5}
                  />
                </div>
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

            {/* Action Buttons */}
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

      {/* Create New Customer Dialog */}
      <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to the system. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <Input
                placeholder="John"
                value={newClientData.firstName}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <Input
                placeholder="Doe"
                value={newClientData.lastName}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, lastName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email Address *</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newClientData.email}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cellphone Number *</label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={newClientData.phone}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Physical Address *</label>
              <Input
                placeholder="123 Main Street, City, Country"
                value={newClientData.address}
                onChange={(e) =>
                  setNewClientData({ ...newClientData, address: e.target.value })
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateClient(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateClient}
                disabled={createClientMutation.isPending || !isNewClientFormValid()}
                className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold"
              >
                {createClientMutation.isPending ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
