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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (clientId: number) => void;
}

export function CreateClientDialog({
  open,
  onOpenChange,
  onClientCreated,
}: CreateClientDialogProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });

  const createClientMutation = trpc.clients.create.useMutation();
  const utils = trpc.useUtils();

  const isFormValid = () => {
    return (
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.email.trim() &&
      formData.phone.trim() &&
      formData.address.trim()
    );
  };

  const handleCreateClient = async () => {
    if (!formData.firstName?.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!formData.lastName?.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!formData.email?.trim()) {
      toast.error("Email address is required");
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error("Cellphone number is required");
      return;
    }
    if (!formData.address?.trim()) {
      toast.error("Physical address is required");
      return;
    }

    try {
      const client = await createClientMutation.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      });

      toast.success("Customer created successfully");
      setFormData({ firstName: "", lastName: "", email: "", phone: "", address: "" });
      onOpenChange(false);
      
      // Invalidate clients list to refresh it
      utils.clients.list.invalidate();
      
      // Notify parent component with the new client ID
      onClientCreated(client.id);
    } catch (error) {
      toast.error("Failed to create customer");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Customer</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add a new customer to the system. All fields are required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium">First Name *</label>
            <Input
              placeholder="John"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium">Last Name *</label>
            <Input
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium">Email Address *</label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium">Cellphone Number *</label>
            <Input
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium">Physical Address *</label>
            <Input
              placeholder="123 Main Street, City, Country"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="h-9 sm:h-10 text-sm"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 sm:h-10 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateClient}
              disabled={createClientMutation.isPending || !isFormValid()}
              className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold h-9 sm:h-10 text-sm"
            >
              {createClientMutation.isPending ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
