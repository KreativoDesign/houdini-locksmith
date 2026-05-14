import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Clock, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function JobDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const jobId = parseInt(id);
  const { data: job, isLoading, refetch } = trpc.jobCards.get.useQuery({
    id: jobId,
  });

  const { data: jobItems } = trpc.jobItems.list.useQuery({ jobCardId: jobId });
  const updateStatusMutation = trpc.jobCards.updateStatus.useMutation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-cyan-100 text-cyan-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "on_hold":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "normal":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: jobId,
        status: newStatus as any,
      });
      toast.success("Job status updated");
      setNewStatus("");
      refetch();
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }
    toast.info("Note feature coming soon");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading job details...</div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/jobs")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="text-gray-500 mt-1">Job #{job.jobNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Priority</label>
                  <Badge className={getPriorityColor(job.priority)}>
                    {job.priority}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1">{job.description || "No description provided"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="mt-1">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Scheduled</label>
                  <p className="mt-1">
                    {job.scheduledDate
                      ? new Date(job.scheduledDate).toLocaleDateString()
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Items/Services */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Services & Items</CardTitle>
              <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-slate-950">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {jobItems && jobItems.length > 0 ? (
                <div className="space-y-3">
                  {jobItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${((Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${(Number(item.unitPrice) || 0).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>
                        $
                        {jobItems
                          .reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No items added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a note or update..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddNote}
                  className="bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold"
                >
                  Add Note
                </Button>
              </div>

              {/* Timeline */}
              <div className="space-y-3 mt-6">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </h3>
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-lime-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Job Created</p>
                      <p className="text-sm text-gray-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Current Status</p>
                      <p className="text-sm text-gray-500">
                        {job.status.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                className="w-full bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold"
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </CardContent>
          </Card>

          {/* Assigned Technician */}
          {job.assignedTechnicianId && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Technician</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Technician</p>
                    <p className="text-sm text-gray-500">
                      {job.technicianName || "Loading..."}
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{job.clientName || "Unknown"}</p>
                <p className="text-sm text-gray-500">Customer</p>
              </div>
              {job.clientEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a
                    href={`mailto:${job.clientEmail}`}
                    className="text-lime-600 hover:underline text-sm"
                  >
                    {job.clientEmail}
                  </a>
                </div>
              )}
              {job.clientPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a
                    href={`tel:${job.clientPhone}`}
                    className="text-lime-600 hover:underline text-sm"
                  >
                    {job.clientPhone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
